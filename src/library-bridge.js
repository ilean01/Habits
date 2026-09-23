// Puente entre Habits y la Biblioteca avanzada: lectura actual, avance y libros terminados hoy.
// Cada cuenta tiene su propia Biblioteca y puede cambiar a bibliotecas compartidas autorizadas.
import {supabase} from './store.js';
import {dayKey} from './domain.js';

const empty = () => ({status:'off', allowed:false, canWrite:false, libraryOwner:null, reading:[], finishedToday:[], finishedCount:0, day:''});
let state = empty(), accountId = null, notify = () => {}, loading = false;
const activeKey = () => `habits:catalogo-activo:${accountId}`;
const cacheKey = libraryOwner => `habits:catalogo:${accountId}:${libraryOwner}`;

export const catalog = () => state;
export const isCatalogId = id => typeof id === 'string' && id.startsWith('lib:');
export const catalogBook = id => isCatalogId(id) ? state.reading.find(b => `lib:${b.id}` === id) : null;

function readCache(libraryOwner){
 if(!libraryOwner)return null;
 try{const cached=JSON.parse(localStorage.getItem(cacheKey(libraryOwner)));return cached?.allowed?{...empty(),...cached,status:'cached'}:null;}catch{return null;}
}
function save(){
 try{
  if(state.libraryOwner){localStorage.setItem(cacheKey(state.libraryOwner),JSON.stringify(state));localStorage.setItem(activeKey(),state.libraryOwner);}
 }catch{}
 notify();
}

export function initCatalog(userId, onChange){
 accountId = userId; notify = onChange || (() => {}); state = empty();
 if(!userId || userId === 'demo' || !supabase) return;
 try{const last=localStorage.getItem(activeKey());const cached=readCache(last);if(cached)state=cached;}catch{}
 if(state.day !== dayKey()) state.finishedToday = [];
 void refreshCatalog();
}

export function closeCatalog(){ accountId = null; state = empty(); notify = () => {}; }

export async function refreshCatalog(){
 if(!accountId || accountId === 'demo' || !supabase || loading || !navigator.onLine) return;
 loading = true; const current = accountId;
 try{
  const [access,selected,write] = await Promise.all([
   supabase.rpc('has_biblioteca_access'),
   supabase.rpc('biblioteca_owner'),
   supabase.rpc('biblioteca_can_write')
  ]);
  if(current !== accountId) return;
  if(access.error || !access.data || selected.error || !selected.data){state=empty();notify();return;}
  const libraryOwner=selected.data;
  if(state.libraryOwner!==libraryOwner){const cached=readCache(libraryOwner);state=cached||{...empty(),status:'loading',allowed:true,libraryOwner};notify();}
  const today = dayKey();
  const [reading, finished, totalFinished] = await Promise.all([
   supabase.from('biblioteca_libros').select('id,titulo,autor,paginas,pagina_actual,estado_lectura,fecha_inicio')
    .in('estado_lectura', ['leyendo','releyendo']).eq('eliminado', false).order('fecha_inicio', {ascending:false, nullsFirst:false}),
   supabase.from('biblioteca_lecturas_finalizadas').select('libro_id').eq('fecha_fin', today),
   supabase.from('biblioteca_libros').select('id',{count:'exact',head:true}).eq('estado_lectura','leido').eq('eliminado',false)
  ]);
  if(current !== accountId) return;
  if(reading.error) throw reading.error;if(finished.error)throw finished.error;if(totalFinished.error) throw totalFinished.error;
  let finishedToday = [];
  const ids = [...new Set((finished.data || []).map(r => r.libro_id))];
  if(ids.length){const titles = await supabase.from('biblioteca_libros').select('id,titulo').in('id', ids);if(titles.error)throw titles.error;finishedToday=(titles.data||[]).map(b=>b.titulo);}
  state = {status:'ready', allowed:true, canWrite:write.data === true, libraryOwner, reading:reading.data || [], finishedToday, finishedCount:Number(totalFinished.count||0), day:today};
  save();
 }catch(e){
  console.warn('No se pudo leer la Biblioteca:', e.message);
  if(state.allowed){ state = {...state, status:'cached'}; notify(); }
 }finally{ loading = false; }
}

export async function recordProgress(id, {page = null, finish = false, comment = ''} = {}){
 const book = catalogBook(id);if(!book)return;
 if(!state.canWrite) throw new Error('Tu permiso permite ver esta Biblioteca, pero no editarla.');
 const call = (p_action, p_data) => supabase.rpc('biblioteca_transition', {p_action, p_book:book.id, p_data});
 if(page !== null && !finish){ const r = await call('page', {page}); if(r.error) throw r.error; }
 if(finish){ const r = await call('finish', {comment}); if(r.error) throw r.error; }
 await refreshCatalog();
}

window.addEventListener('focus', () => { void refreshCatalog(); });
window.addEventListener('online', () => { void refreshCatalog(); });
