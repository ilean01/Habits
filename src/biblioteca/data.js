import { supabase, currentUser, libraryOwner, canWrite } from "./client.js";
import { staleOrphanCoverPaths } from "./cover-maintenance.js";

const T = {
  books: "biblioteca_libros",
  readings: "biblioteca_lecturas",
  finished: "biblioteca_lecturas_finalizadas",
  people: "biblioteca_personas",
  loans: "biblioteca_prestamos",
  config: "biblioteca_config",
};

const tableCache=new Map(), signedCache=new Map();
let orphanSweepOwner='';
export function invalidateLibraryData(){tableCache.clear();}
export function clearLibraryCache(){tableCache.clear();signedCache.clear();orphanSweepOwner='';}
function invalidate(table){for(const key of tableCache.keys())if(key.endsWith(':'+table))tableCache.delete(key);}
async function fetchAll(table, select = "*", order = "id", ascending = true) {
  const owner=libraryOwner,key=(currentUser?.id||'')+':'+owner+':'+table,cached=tableCache.get(key);
  if(cached&&Date.now()-cached.at<30000)return cached.rows;
  const all = [];
  let from = 0;
  while (true) {
    let q = supabase
      .from(table)
      .select(select)
      .eq("owner_id", owner)
      .range(from, from + 499);
    if (order) q = q.order(order, { ascending });
    if (order !== "id" && table !== T.config) q = q.order("id");
    const { data, error } = await q;
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 500) break;
    from += 500;
  }
  tableCache.set(key,{at:Date.now(),rows:all});
  return all;
}

export async function loadAll({force=false}={}) {
  if(force)invalidateLibraryData();
  const owner=libraryOwner,user=currentUser?.id;
  const [books, readings, finished, people, loans, config] = await Promise.all([
    fetchAll(T.books, "*", "id"),
    fetchAll(T.readings, "*", "fecha", false),
    fetchAll(T.finished, "*", "fecha_fin", false),
    fetchAll(T.people, "*", "nombre"),
    fetchAll(T.loans, "*", "id", false),
    fetchAll(T.config, "*", "clave"),
  ]);
  if(owner!==libraryOwner||user!==currentUser?.id)throw new Error('La biblioteca cambió durante la carga. Volvé a intentarlo.');
  return { books, readings, finished, people, loans, config };
}

export async function insertBook(data) {
  const { data: row, error } = await supabase
    .from(T.books)
    .insert({ ...data, owner_id: libraryOwner })
    .select()
    .single();
  if (error) throw error;
  invalidate(T.books);
  return row;
}
export async function updateBook(id, data, expected = null) {
  const previous=Object.hasOwn(data,'portada')?await bookCover(id):null;
  let query = supabase.from(T.books).update(data).eq("id", id).eq("owner_id",libraryOwner);
  for(const [key,value] of Object.entries(expected||{}))query=value===null||value===undefined?query.is(key,null):query.eq(key,value);
  const { data: row, error } = await query.select().single();
  if (error) throw error;
  invalidate(T.books);
  if(previous&&previous!==data.portada)await deferCleanup(previous);
  return row;
}
export const deleteBookSoft = (id) =>
  updateBook(id, {
    eliminado: true,
    fecha_eliminado: new Date().toISOString(),
  });
export const restoreBook = (id) =>
  updateBook(id, { eliminado: false, fecha_eliminado: null });
export async function deleteBookForever(id) {
  const previous=await bookCover(id);
  const { error } = await supabase.from(T.books).delete().eq("id", id).eq("owner_id",libraryOwner);
  if (error) throw error;
  invalidate(T.books);
  await deferCleanup(previous);
}

export async function insertReading(data) {
  const { data: row, error } = await supabase
    .from(T.readings)
    .insert({ ...data, owner_id: libraryOwner })
    .select()
    .single();
  if (error) throw error;
  invalidate(T.readings);
  return row;
}
export async function insertFinished(data) {
  const { data: row, error } = await supabase
    .from(T.finished)
    .insert({ ...data, owner_id: libraryOwner })
    .select()
    .single();
  if (error) throw error;
  invalidate(T.finished);
  return row;
}
export async function upsertPerson(name, extra = {}) {
  const n = String(name || "").trim();
  if (!n) return null;
  const { data, error } = await supabase
    .from(T.people)
    .upsert(
      { owner_id: libraryOwner, nombre: n, ...extra },
      { onConflict: "owner_id,nombre" },
    )
    .select()
    .single();
  if (error) throw error;
  invalidate(T.people);
  return data;
}
export async function insertLoan(data) {
  const { data: row, error } = await supabase
    .from(T.loans)
    .insert({ ...data, owner_id: libraryOwner })
    .select()
    .single();
  if (error) throw error;
  invalidate(T.loans);
  return row;
}
export async function updateLoan(id, data) {
  const { data: row, error } = await supabase
    .from(T.loans)
    .update(data)
    .eq("id", id).eq("owner_id",libraryOwner)
    .select()
    .single();
  if (error) throw error;
  invalidate(T.loans);
  return row;
}
export async function deleteLoan(id) {
  const { error } = await supabase.from(T.loans).delete().eq("id", id).eq("owner_id",libraryOwner);
  if (error) throw error;
  invalidate(T.loans);
}

export async function saveConfig(values) {
  const rows = Object.entries(values).map(([clave, valor]) => ({
    owner_id: libraryOwner,
    clave,
    valor: String(valor ?? ""),
  }));
  const { error } = await supabase
    .from(T.config)
    .upsert(rows, { onConflict: "owner_id,clave" });
  if (error) throw error;
  invalidate(T.config);
}

export async function signedCoverMap(books) {
  const map = new Map(),
    paths = [];
  const idsByPath=new Map();
  for (const b of books) {
    const p = String(b.portada || "").trim();
    if (!p) continue;
    if (/^https?:\/\//i.test(p)) map.set(b.id, p);
    else {idsByPath.set(p,[...(idsByPath.get(p)||[]),b.id]);const cached=signedCache.get(p);if(cached&&cached.until>Date.now())map.set(b.id,cached.url);else if(!paths.includes(p))paths.push(p);}
  }
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { data, error } = await supabase.storage
      .from("biblioteca-portadas")
      .createSignedUrls(chunk, 3600);
    if (error) continue;
    for (const row of data || []) {
      if (!row?.path || !row?.signedUrl) continue;
      signedCache.set(row.path,{url:row.signedUrl,until:Date.now()+3300000});
      for(const id of idsByPath.get(row.path)||[])map.set(id,row.signedUrl);
    }
  }
  if(typeof window!=='undefined'&&canWrite&&libraryOwner&&orphanSweepOwner!==libraryOwner){
    orphanSweepOwner=libraryOwner;
    queueMicrotask(()=>retryCoverCleanup().catch(()=>{if(orphanSweepOwner===libraryOwner)orphanSweepOwner='';}));
  }
  return map;
}

export async function uploadCover(bookId, file) {
  if (!file) throw new Error("Elegí una imagen.");
  const ext =
    (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${libraryOwner}/books/${bookId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("biblioteca-portadas")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });
  if (error) throw error;
  try{await replaceCover(bookId,path);}catch(error){await deferCleanup(path);throw error;}
  return path;
}
export async function removeStoredCover(path) {
  if (!path || /^https?:\/\//i.test(path)) return;
  const { error } = await supabase.storage
    .from("biblioteca-portadas")
    .remove([path]);
  if (error) throw error;
}

async function bookCover(id){const {data,error}=await supabase.from(T.books).select('portada').eq('id',id).eq('owner_id',libraryOwner).single();if(error)throw error;return data.portada;}
async function cleanupCover(path,owner=libraryOwner){
 if(!path||/^https?:\/\//i.test(path)||!owner||owner!==libraryOwner)return false;
 const {count,error}=await supabase.from(T.books).select('id',{count:'exact',head:true}).eq('owner_id',owner).eq('portada',path);
 if(error)throw error;if(count)return false;
 if(owner!==libraryOwner)return false;
 await removeStoredCover(path);return true;
}
async function referencedCoverPaths(owner){
 const refs=new Set();let from=0;
 while(true){
  const {data,error}=await supabase.from(T.books).select('portada').eq('owner_id',owner).range(from,from+499);
  if(error)throw error;
  for(const row of data||[]){const p=String(row.portada||'').trim();if(p&&!/^https?:\/\//i.test(p))refs.add(p);}
  if(!data||data.length<500)break;from+=500;
 }
 return refs;
}
async function storedCoverObjects(owner){
 const folder=`${owner}/books`,objects=[];let offset=0;
 while(true){
  const {data,error}=await supabase.storage.from('biblioteca-portadas').list(folder,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
  if(error)throw error;
  objects.push(...(data||[]));
  if(!data||data.length<100)break;offset+=100;
 }
 return {folder,objects};
}
export async function cleanupOrphanCovers({minAgeMs=24*60*60*1000}={}){
 const owner=libraryOwner;if(!owner||!canWrite)return 0;
 const [refs,stored]=await Promise.all([referencedCoverPaths(owner),storedCoverObjects(owner)]);
 if(owner!==libraryOwner)return 0;
 const candidates=staleOrphanCoverPaths(stored.objects,refs,{prefix:stored.folder,minAgeMs});
 let cleaned=0;
 for(const path of candidates){if(owner!==libraryOwner)break;try{if(await cleanupCover(path,owner))cleaned++;}catch{} }
 return cleaned;
}
export async function replaceCover(id,path){return updateBook(id,{portada:path});}
const cleanupKey=()=>`habits:cover-cleanup:${libraryOwner}`;
function pendingCleanup(){try{return JSON.parse(localStorage.getItem(cleanupKey())||'[]');}catch{return [];}}
function rememberCleanup(paths){try{localStorage.setItem(cleanupKey(),JSON.stringify(paths));}catch{}}
async function deferCleanup(path){
 if(!path||/^https?:\/\//i.test(path))return;
 try{await cleanupCover(path);}catch{rememberCleanup([...new Set([...pendingCleanup(),path])]);globalThis.dispatchEvent?.(new CustomEvent('library:cleanup-warning'));}
}
export async function retryCoverCleanup(){
 const owner=libraryOwner,left=[];
 for(const path of pendingCleanup()){if(owner!==libraryOwner)return left.length;try{await cleanupCover(path,owner);}catch{left.push(path);}}
 if(owner===libraryOwner){rememberCleanup(left);await cleanupOrphanCovers();}
 return left.length;
}
