import {supabase,currentUser,libraryOwner} from './client.js';

const T={books:'biblioteca_libros',readings:'biblioteca_lecturas',finished:'biblioteca_lecturas_finalizadas',people:'biblioteca_personas',loans:'biblioteca_prestamos',config:'biblioteca_config'};

async function fetchAll(table,select='*',order='id',ascending=true){
  const all=[];let from=0;
  while(true){
    let q=supabase.from(table).select(select).range(from,from+499);
    if(order)q=q.order(order,{ascending});
    const {data,error}=await q;if(error)throw error;
    all.push(...(data||[]));if(!data||data.length<500)break;from+=500;
  }
  return all;
}

export async function loadAll(){
  const [books,readings,finished,people,loans,config]=await Promise.all([
    fetchAll(T.books,'*','id'),fetchAll(T.readings,'*','fecha',false),fetchAll(T.finished,'*','fecha_fin',false),fetchAll(T.people,'*','nombre'),fetchAll(T.loans,'*','id',false),fetchAll(T.config,'*','clave')
  ]);
  return {books,readings,finished,people,loans,config};
}

export async function insertBook(data){const {data:row,error}=await supabase.from(T.books).insert({...data,owner_id:libraryOwner}).select().single();if(error)throw error;return row}
export async function updateBook(id,data){const {data:row,error}=await supabase.from(T.books).update(data).eq('id',id).select().single();if(error)throw error;return row}
export const deleteBookSoft=id=>updateBook(id,{eliminado:true,fecha_eliminado:new Date().toISOString()});
export const restoreBook=id=>updateBook(id,{eliminado:false,fecha_eliminado:null});
export async function deleteBookForever(id){const {error}=await supabase.from(T.books).delete().eq('id',id);if(error)throw error}

export async function insertReading(data){const {data:row,error}=await supabase.from(T.readings).insert({...data,owner_id:libraryOwner}).select().single();if(error)throw error;return row}
export async function insertFinished(data){const {data:row,error}=await supabase.from(T.finished).insert({...data,owner_id:libraryOwner}).select().single();if(error)throw error;return row}
export async function upsertPerson(name,extra={}){const n=String(name||'').trim();if(!n)return null;const {data,error}=await supabase.from(T.people).upsert({owner_id:libraryOwner,nombre:n,...extra},{onConflict:'owner_id,nombre'}).select().single();if(error)throw error;return data}
export async function insertLoan(data){const {data:row,error}=await supabase.from(T.loans).insert({...data,owner_id:libraryOwner}).select().single();if(error)throw error;return row}
export async function updateLoan(id,data){const {data:row,error}=await supabase.from(T.loans).update(data).eq('id',id).select().single();if(error)throw error;return row}
export async function deleteLoan(id){const {error}=await supabase.from(T.loans).delete().eq('id',id);if(error)throw error}

export async function saveConfig(values){const rows=Object.entries(values).map(([clave,valor])=>({owner_id:libraryOwner,clave,valor:String(valor??'')}));const {error}=await supabase.from(T.config).upsert(rows,{onConflict:'owner_id,clave'});if(error)throw error}

export async function signedCoverMap(books){
  const map=new Map(),paths=[];
  for(const b of books){const p=String(b.portada||'').trim();if(!p)continue;if(/^https?:\/\//i.test(p))map.set(b.id,p);else paths.push(p)}
  for(let i=0;i<paths.length;i+=100){const chunk=paths.slice(i,i+100);const {data,error}=await supabase.storage.from('biblioteca-portadas').createSignedUrls(chunk,3600);if(error)continue;for(const row of data||[]){if(!row?.path||!row?.signedUrl)continue;for(const b of books)if(b.portada===row.path)map.set(b.id,row.signedUrl)}}
  return map;
}

export async function uploadCover(bookId,file){if(!file)throw new Error('Elegí una imagen.');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=`${libraryOwner}/books/${bookId}-${Date.now()}.${ext}`;const {error}=await supabase.storage.from('biblioteca-portadas').upload(path,file,{upsert:true,contentType:file.type||'image/jpeg'});if(error)throw error;await updateBook(bookId,{portada:path});return path}
export async function removeStoredCover(path){if(!path||/^https?:\/\//i.test(path))return;const {error}=await supabase.storage.from('biblioteca-portadas').remove([path]);if(error)throw error}
