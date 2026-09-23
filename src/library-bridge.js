// Puente entre Habits y la Biblioteca avanzada: lectura actual, avance y libros terminados hoy.
// Todas las cuentas pueden tener Biblioteca; los datos visibles dependen de la biblioteca activa y sus permisos.
import {supabase} from './store.js';
import {dayKey} from './domain.js';

const empty = () => ({status:'off', allowed:false, canWrite:false, reading:[], finishedToday:[], finishedCount:0, day:'',activeOwner:null,libraryName:'Mi biblioteca',isOwn:true});
let state = empty(), owner = null, notify = () => {}, loading = false;
const cacheKey = () => `habits:catalogo:${owner}`;

export const catalog = () => state;
export const isCatalogId = id => typeof id === 'string' && id.startsWith('lib:');
export const catalogBook = id => isCatalogId(id) ? state.reading.find(b => `lib:${b.id}` === id) : null;

function save(){ try{ localStorage.setItem(cacheKey(), JSON.stringify(state)); }catch{} notify(); }

export function initCatalog(userId, onChange){
  owner = userId; notify = onChange || (() => {}); state = empty();
  if(!userId || userId === 'demo' || !supabase) return;
  try{ const cached = JSON.parse(localStorage.getItem(cacheKey())); if(cached?.allowed) state = {...empty(), ...cached, status:'cached'}; }catch{}
  if(state.day !== dayKey()) state.finishedToday = [];
  void refreshCatalog();
}

export function closeCatalog(){ owner = null; state = empty(); notify = () => {}; }

export async function refreshCatalog(){
  if(!owner || owner === 'demo' || !supabase || loading || !navigator.onLine) return;
  loading = true; const current = owner;
  try{
    const access = await supabase.rpc('has_biblioteca_access');
    if(current !== owner) return;
    if(access.error || !access.data){ state = empty(); save(); return; }
    const [write,libraries] = await Promise.all([
      supabase.rpc('biblioteca_can_write'),
      supabase.rpc('biblioteca_disponibles')
    ]);
    const active=(libraries.data||[]).find(x=>x.activa)||null;
    const today = dayKey();
    const [reading, finished, totalFinished] = await Promise.all([
      supabase.from('biblioteca_libros').select('id,titulo,autor,paginas,pagina_actual,estado_lectura,fecha_inicio')
        .in('estado_lectura', ['leyendo','releyendo']).eq('eliminado', false).order('fecha_inicio', {ascending:false, nullsFirst:false}),
      supabase.from('biblioteca_lecturas_finalizadas').select('libro_id').eq('fecha_fin', today),
      supabase.from('biblioteca_libros').select('id',{count:'exact',head:true}).eq('estado_lectura','leido').eq('eliminado',false)
    ]);
    if(current !== owner) return;
    if(reading.error) throw reading.error;
    if(totalFinished.error) throw totalFinished.error;
    let finishedToday = [];
    const ids = [...new Set((finished.data || []).map(r => r.libro_id))];
    if(ids.length){
      const titles = await supabase.from('biblioteca_libros').select('id,titulo').in('id', ids);
      if(titles.error)throw titles.error;
      finishedToday = (titles.data || []).map(b => b.titulo);
    }
    state = {status:'ready',allowed:true,canWrite:write.data === true,reading:reading.data || [],finishedToday,finishedCount:Number(totalFinished.count||0),day:today,activeOwner:active?.owner_id||current,libraryName:active?.nombre||'Mi biblioteca',isOwn:active?.propia!==false};
    save();
  }catch(e){
    console.warn('No se pudo leer la Biblioteca:', e.message);
    if(state.allowed){ state = {...state, status:'cached'}; notify(); }
  }finally{ loading = false; }
}

// Guarda el avance usando la misma transacción SQL que usa la Biblioteca (biblioteca_transition).
export async function recordProgress(id, {page = null, finish = false, comment = ''} = {}){
  const book = catalogBook(id);
  if(!book) return;
  if(!state.canWrite) throw new Error('Tu permiso en esta biblioteca es de lectura.');
  const call = (p_action, p_data) => supabase.rpc('biblioteca_transition', {p_action, p_book:book.id, p_data});
  if(page !== null && !finish){ const r = await call('page', {page}); if(r.error) throw r.error; }
  if(finish){ const r = await call('finish', {comment}); if(r.error) throw r.error; }
  await refreshCatalog();
}

window.addEventListener('focus', () => { void refreshCatalog(); });
window.addEventListener('online', () => { void refreshCatalog(); });
