// Puente entre Habits y la Biblioteca privada: lectura actual, avance y libros terminados hoy.
// Si la cuenta no tiene acceso (o las migraciones no están aplicadas), Habits sigue usando sus libros simples.
import {supabase} from './store.js';
import {dayKey} from './domain.js';

const empty = () => ({status:'off', allowed:false, canWrite:false, reading:[], finishedToday:[], day:''});
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
    const write = await supabase.rpc('biblioteca_can_write');
    const today = dayKey();
    const [reading, finished] = await Promise.all([
      supabase.from('biblioteca_libros').select('id,titulo,autor,paginas,pagina_actual,estado_lectura,fecha_inicio')
        .in('estado_lectura', ['leyendo','releyendo']).eq('eliminado', false).order('fecha_inicio', {ascending:false, nullsFirst:false}),
      supabase.from('biblioteca_lecturas_finalizadas').select('libro_id').eq('fecha_fin', today)
    ]);
    if(current !== owner) return;
    if(reading.error) throw reading.error;
    let finishedToday = [];
    const ids = [...new Set((finished.data || []).map(r => r.libro_id))];
    if(ids.length){
      const titles = await supabase.from('biblioteca_libros').select('id,titulo').in('id', ids);
      finishedToday = (titles.data || []).map(b => b.titulo);
    }
    state = {status:'ready', allowed:true, canWrite:write.data === true, reading:reading.data || [], finishedToday, day:today};
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
  if(!state.canWrite) throw new Error('Tu cuenta puede ver la Biblioteca, pero no editarla.');
  const call = (p_action, p_data) => supabase.rpc('biblioteca_transition', {p_action, p_book:book.id, p_data});
  if(page !== null && !finish){ const r = await call('page', {page}); if(r.error) throw r.error; }
  if(finish){ const r = await call('finish', {comment}); if(r.error) throw r.error; }
  await refreshCatalog();
}

// Al volver a la app (por ejemplo, después de concluir un libro en la Biblioteca) se actualiza la lectura actual.
window.addEventListener('focus', () => { void refreshCatalog(); });
window.addEventListener('online', () => { void refreshCatalog(); });
