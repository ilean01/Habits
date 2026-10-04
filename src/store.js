import {createClient} from '@supabase/supabase-js';
import {newRecord,starterRecords} from './domain.js';
import {areaDependents,detachReferences,restoreReferences} from './reference-integrity.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
import {loadOwner,migrateLegacyLocalStorage,saveRecord,removeRecord,savePending,saveConflict,removePending,removeConflict,saveMeta} from './local-cache.js';

const url=import.meta.env.VITE_SUPABASE_URL||SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||SUPABASE_PUBLISHABLE_KEY;
export const configured=!!(url&&key);
export const supabase=configured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
let owner=null,cache={records:{},pending:{},conflicts:{}},meta={lastSync:null},listener=()=>{},syncing=false,channel;
let status='local';
const tabId=crypto.randomUUID();
const bus=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('habits-local-v2'):null;
bus?.unref?.();
let writeQueue=Promise.resolve();
let undoStack=[],redoStack=[],historyPaused=0;
const SYSTEM_KINDS=new Set(['settings','timer','activity','notice','device']);
const TRASHABLE_KINDS=new Set(['area','habit','event','task','project','reading','quote','journal','word','dailyPlan']);
const KIND_LABELS={area:'área',habit:'hábito',log:'registro',event:'evento',eventLog:'evento',task:'tarea',project:'proyecto',reading:'lectura',quote:'cita',journal:'diario',word:'palabra',dailyPlan:'plan del día',photo:'foto',meal:'comida'};
const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;
const enqueue=fn=>{writeQueue=writeQueue.then(fn).catch(e=>console.warn('No se pudo guardar la caché local:',e.message));return writeQueue;};
const notify=()=>{invalidate();listener();};
const cloneData=value=>value==null?value:JSON.parse(JSON.stringify(value));
const snapshot=r=>r?{id:r.id,kind:r.kind,data:cloneData(r.data),deleted:!!r.deleted}:null;
const snapshotEqual=(r,s)=>{
 if(!s)return !r||!!r.deleted;
 return !!r&&r.kind===s.kind&&!!r.deleted===!!s.deleted&&JSON.stringify(r.data||{})===JSON.stringify(s.data||{});
};
const recordLabel=r=>String(r?.data?.name||r?.data?.title||r?.data?.text||r?.data?.bookTitle||KIND_LABELS[r?.kind]||'elemento').trim();
const pushUndo=op=>{if(historyPaused||SYSTEM_KINDS.has(op?.after?.kind||op?.before?.kind||''))return;undoStack.push(op);if(undoStack.length>50)undoStack.shift();redoStack=[];};
const visiblePending=()=>Object.values(cache.pending).filter(p=>!SYSTEM_KINDS.has(p.kind)).length;

export const info=()=>({status,pending:visiblePending(),conflicts:Object.values(cache.conflicts),demo:owner==='demo',lastSync:meta.lastSync||null,storage:'indexeddb',undo:undoStack.length,redo:redoStack.length});
export const currentOwner=()=>owner;
// Cada pantalla llama a records() decenas de veces (el calendario, más de cien). Se calcula una vez por cambio y se reutiliza.
const byKind=new Map();
const invalidate=()=>byKind.clear();
export function records(kind){const k=kind||'*';let list=byKind.get(k);if(!list){list=Object.values(cache.records).filter(r=>!r.deleted&&(!kind||r.kind===kind)).map(r=>({...r.data,id:r.id}));byKind.set(k,list);}return list.slice();}
export function raw(id){return cache.records[id];}
export function exportData(){return {version:1,exportedAt:new Date().toISOString(),records:cache.records,pending:cache.pending,conflicts:cache.conflicts};}
export function activity(){return records('activity').sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));}
export function historyInfo(){return {undo:undoStack.length,redo:redoStack.length,lastUndo:undoStack.at(-1)?.label||'',lastRedo:redoStack.at(-1)?.label||''};}

function broadcast(id){if(!bus||!owner)return;bus.postMessage({source:tabId,owner,id,record:cache.records[id]||null,pending:cache.pending[id]||null,conflict:cache.conflicts[id]||null});}
function persistId(id){const currentOwner=owner;if(!currentOwner)return;const record=cache.records[id],pending=cache.pending[id],conflict=cache.conflicts[id];enqueue(async()=>{
 if(record)await saveRecord(currentOwner,id,record);else await removeRecord(currentOwner,id);
 if(pending)await savePending(currentOwner,id,pending);else await removePending(currentOwner,id);
 if(conflict)await saveConflict(currentOwner,id,conflict);else await removeConflict(currentOwner,id);
});}

function writeRecord(kind,data,id=crypto.randomUUID(),deleted=false,{track=true,activityAction=true}={}){
 if(!owner)throw new Error('Iniciá sesión primero.');
 const before=cache.records[id],previous=cache.pending[id];
 const r={...newRecord(kind,data,id),rev:before?.rev||0,deleted};cache.records[id]=r;
 if(owner!=='demo')cache.pending[id]={...r,expected:previous?.expected??r.rev,op:crypto.randomUUID()};
 if(track&&!historyPaused&&!SYSTEM_KINDS.has(kind))pushUndo({type:'write',id,before:snapshot(before),after:snapshot(r),label:recordLabel(r)});
 persistId(id);broadcast(id);notify();if(owner!=='demo')void sync();
 if(activityAction&&!historyPaused&&!SYSTEM_KINDS.has(kind))recordActivity(before&&!before.deleted?'updated':'created',r);
 return id;
}
function recordActivity(action,target,extra={}){
 if(!owner||!target||SYSTEM_KINDS.has(target.kind))return;
 const label=recordLabel(target),at=new Date().toISOString(),id=`activity:${at}:${crypto.randomUUID()}`;
 writeRecord('activity',{action,targetKind:target.kind,targetId:target.id,label,at,...extra},id,false,{track:false,activityAction:false});
}

export async function openStore(user,onChange){
 owner=user;listener=onChange;status=user==='demo'?'demo':online()?'loading':'offline';undoStack=[];redoStack=[];
 await migrateLegacyLocalStorage(user);
 const local=await loadOwner(user);cache={records:local.records,pending:local.pending,conflicts:local.conflicts};meta=local.meta||{owner:user,lastSync:null};
 if(user==='demo'&&Object.keys(cache.records).length===0){historyPaused++;try{for(const r of starterRecords()){cache.records[r.id]=r;await saveRecord(user,r.id,r);}}finally{historyPaused--;}status='demo';notify();return;}
 notify();
 if(user!=='demo'){
  await sync();
  if(status==='synced'&&Object.keys(cache.records).length===0){historyPaused++;try{for(const r of starterRecords())writeRecord(r.kind,r.data,r.id,false,{track:false,activityAction:false});await sync();}finally{historyPaused--;}}
  channel=supabase.channel(`entries:${user}`).on('postgres_changes',{event:'*',schema:'public',table:'entries',filter:`user_id=eq.${user}`},()=>sync()).subscribe();
 }
}

export function closeStore(){if(channel){supabase.removeChannel(channel);channel=null;}owner=null;cache={records:{},pending:{},conflicts:{}};invalidate();meta={lastSync:null};listener=()=>{};status='local';undoStack=[];redoStack=[];historyPaused=0;}

export function put(kind,data,id=crypto.randomUUID(),deleted=false){return writeRecord(kind,data,id,deleted);}
function applyReferenceChanges(changes){for(const change of changes)writeRecord(change.kind,change.data,change.id,false,{track:false,activityAction:false});}
export function remove(id,{track=true,activityAction=true}={}){
 const r=cache.records[id];if(!r||r.deleted)return;
 const all=Object.values(cache.records);
 if(r.kind==='area'&&areaDependents(id,all).length)throw new Error('Primero mové a otra área las actividades que la usan.');
 applyReferenceChanges(detachReferences(r,all));
 writeRecord(r.kind,r.data,id,true,{track:false,activityAction:false});
 if(track&&!historyPaused&&!SYSTEM_KINDS.has(r.kind))pushUndo({type:'remove',id,before:snapshot(r),after:snapshot(cache.records[id]),label:recordLabel(r)});
 if(activityAction&&!historyPaused&&!SYSTEM_KINDS.has(r.kind))recordActivity('deleted',r);
}
export function restore(id,{track=true,activityAction=true}={}){
 const r=cache.records[id];if(!r||!r.deleted||r.data?.__purgedAt)return;
 writeRecord(r.kind,r.data,id,false,{track:false,activityAction:false});
 applyReferenceChanges(restoreReferences(r,Object.values(cache.records)));
 if(track&&!historyPaused&&!SYSTEM_KINDS.has(r.kind))pushUndo({type:'restore',id,before:snapshot(r),after:snapshot(cache.records[id]),label:recordLabel(r)});
 if(activityAction&&!historyPaused&&!SYSTEM_KINDS.has(r.kind))recordActivity('restored',r);
}
export function trash(){return Object.values(cache.records).filter(r=>r.deleted&&TRASHABLE_KINDS.has(r.kind)&&!r.data?.__purgedAt).sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));}
export function purge(id){
 const r=cache.records[id];if(!r||!r.deleted||!TRASHABLE_KINDS.has(r.kind)||r.data?.__purgedAt)return false;
 const label=recordLabel(r),at=new Date().toISOString();
 undoStack=undoStack.filter(op=>op.id!==id);redoStack=redoStack.filter(op=>op.id!==id);
 writeRecord(r.kind,{__purgedAt:at,__purgedKind:r.kind},id,true,{track:false,activityAction:false});
 recordActivity('purged',r,{label});return true;
}
export function emptyTrash(){const ids=trash().map(r=>r.id);for(const id of ids)purge(id);return ids.length;}

function applySnapshot(s){
 if(!s)return;
 writeRecord(s.kind,s.data,s.id,s.deleted,{track:false,activityAction:false});
}
function ensureCurrent(op,expected){const current=cache.records[op.id];if(!snapshotEqual(current,expected))throw new Error('Ese elemento cambió en otro dispositivo. Sincronizá antes de deshacer.');}
export function undo(){
 const op=undoStack.at(-1);if(!op)return null;
 ensureCurrent(op,op.after);
 historyPaused++;try{
  if(op.type==='remove')restore(op.id,{track:false,activityAction:false});
  else if(op.type==='restore')remove(op.id,{track:false,activityAction:false});
  else if(op.before)applySnapshot(op.before);
  else remove(op.id,{track:false,activityAction:false});
 }finally{historyPaused--;}
 undoStack.pop();redoStack.push(op);recordActivity('undo',op.before||op.after,{label:op.label});return op;
}
export function redo(){
 const op=redoStack.at(-1);if(!op)return null;
 const current=cache.records[op.id];
 if(op.type==='remove'){if(!snapshotEqual(current,op.before))throw new Error('Ese elemento cambió en otro dispositivo. Sincronizá antes de rehacer.');}
 else if(op.type==='restore'){if(!current?.deleted)throw new Error('Ese elemento cambió en otro dispositivo. Sincronizá antes de rehacer.');}
 else if(op.before){ensureCurrent(op,op.before);}else if(!current?.deleted){throw new Error('Ese elemento cambió en otro dispositivo. Sincronizá antes de rehacer.');}
 historyPaused++;try{
  if(op.type==='remove')remove(op.id,{track:false,activityAction:false});
  else if(op.type==='restore')restore(op.id,{track:false,activityAction:false});
  else applySnapshot(op.after);
 }finally{historyPaused--;}
 redoStack.pop();undoStack.push(op);recordActivity('redo',op.after||op.before,{label:op.label});return op;
}

export function resolveConflict(id,keepLocal){
 const c=cache.conflicts[id];if(!c)return;
 delete cache.conflicts[id];delete cache.pending[id];
 if(c.remote)cache.records[id]=c.remote;else delete cache.records[id];
 persistId(id);
 if(keepLocal)put(c.local.kind,c.local.data,id,c.local.deleted);else{broadcast(id);notify();}
}

function newerSync(a,b){if(!a)return b||null;if(!b)return a;return a>b?a:b;}
export async function sync(){
 if(!owner||owner==='demo'||syncing)return;if(!online()){status='offline';notify();return;}
 syncing=true;const currentOwner=owner,before=status;let changed=false;status='syncing';
 try{
  await writeQueue;
  let newest=meta.lastSync||null;
  const pendingBatch=Object.entries({...cache.pending}).sort(([,a],[,b])=>Number(SYSTEM_KINDS.has(a.kind))-Number(SYSTEM_KINDS.has(b.kind)));
  for(const [id,p] of pendingBatch){
   if(cache.conflicts[id]||cache.pending[id]?.op!==p.op)continue;
   const {data,error}=await supabase.rpc('write_entry',{p_id:id,p_kind:p.kind,p_data:p.data,p_deleted:p.deleted,p_expected:p.expected,p_op:p.op});
   if(owner!==currentOwner)return;if(error)throw error;
   changed=true;
   if(!data.ok){cache.conflicts[id]={id,local:cache.pending[id]||p,remote:data.entry};delete cache.pending[id];}
   else if(cache.pending[id]?.op===p.op){cache.records[id]=data.entry;delete cache.pending[id];newest=newerSync(newest,data.entry?.updated_at);}
   else if(cache.pending[id]){
    // A later local edit builds on this acknowledged write, not on its old revision.
    cache.pending[id]={...cache.pending[id],expected:data.entry.rev,rev:data.entry.rev};
    cache.records[id]={...cache.records[id],rev:data.entry.rev};
   }
   persistId(id);broadcast(id);
  }
  const remote=[];let offset=0;
  while(true){
   let query=supabase.from('entries').select('id,kind,data,rev,deleted,updated_at').eq('user_id',currentOwner).order('updated_at',{ascending:true}).order('id',{ascending:true}).range(offset,offset+499);
   // gte evita perder un segundo registro que comparta exactamente el timestamp del cursor. Repetir la última fila es inocuo.
   if(meta.lastSync)query=query.gte('updated_at',meta.lastSync);
   const {data,error}=await query;if(owner!==currentOwner)return;if(error)throw error;
   remote.push(...data);if(data.length<500)break;offset+=500;
  }
  for(const r of remote){
   newest=newerSync(newest,r.updated_at);
   if(!cache.pending[r.id]&&!cache.conflicts[r.id]){const prev=cache.records[r.id];if(!prev||prev.rev!==r.rev||prev.deleted!==r.deleted)changed=true;cache.records[r.id]=r;persistId(r.id);}
  }
  if(newest&&newest!==meta.lastSync){meta=await saveMeta(currentOwner,{lastSync:newest});}
  status=Object.keys(cache.conflicts).length?'conflict':Object.keys(cache.pending).length?'pending':'synced';
  // Solo se vuelve a dibujar la pantalla si llegó algo nuevo o cambió el estado; antes se redibujaba todo dos veces cada 20 segundos.
  if(changed||status!==before)notify();
 }catch(e){if(owner===currentOwner){status='error';console.warn('No se pudo sincronizar:',e.message);notify();}}
 finally{syncing=false;if(owner===currentOwner&&status==='pending')queueMicrotask(()=>void sync());}
}

if(bus)bus.onmessage=e=>{const m=e.data;if(!owner||m?.source===tabId||m?.owner!==owner||!m.id)return;
 const localPending=cache.pending[m.id];
 if(localPending&&m.pending&&localPending.op!==m.pending.op){cache.conflicts[m.id]={id:m.id,local:localPending,remote:m.record};persistId(m.id);status='conflict';notify();return;}
 if(!localPending&&!cache.conflicts[m.id]){
  if(m.record)cache.records[m.id]=m.record;else delete cache.records[m.id];
  if(m.pending)cache.pending[m.id]=m.pending;else delete cache.pending[m.id];
  if(m.conflict)cache.conflicts[m.id]=m.conflict;
  persistId(m.id);notify();
 }
};
if(typeof window!=='undefined'){
 window.addEventListener('online',()=>sync());
 window.addEventListener('offline',()=>{if(owner&&owner!=='demo'){status='offline';notify();}});
 window.addEventListener('focus',()=>sync());
 setInterval(()=>sync(),20000);
}
