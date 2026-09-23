import {createClient} from '@supabase/supabase-js';
import {newRecord,starterRecords} from './domain.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
import {loadOwner,migrateLegacyLocalStorage,saveRecord,removeRecord,savePending,saveConflict,removePending,removeConflict,saveMeta} from './local-cache.js';

const url=import.meta.env.VITE_SUPABASE_URL||SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||SUPABASE_PUBLISHABLE_KEY;
export const configured=!!(url&&key);
export const supabase=configured?createClient(url,key):null;
let owner=null,cache={records:{},pending:{},conflicts:{}},meta={lastSync:null},listener=()=>{},syncing=false,channel;
let status='local';
const tabId=crypto.randomUUID();
const bus=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('habits-local-v2'):null;
bus?.unref?.();
let writeQueue=Promise.resolve();
const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;
const enqueue=fn=>{writeQueue=writeQueue.then(fn).catch(e=>console.warn('No se pudo guardar la caché local:',e.message));return writeQueue;};
const notify=()=>listener();

export const info=()=>({status,pending:Object.keys(cache.pending).length,conflicts:Object.values(cache.conflicts),demo:owner==='demo',lastSync:meta.lastSync||null,storage:'indexeddb'});
export function records(kind){return Object.values(cache.records).filter(r=>!r.deleted&&(!kind||r.kind===kind)).map(r=>({...r.data,id:r.id}));}
export function raw(id){return cache.records[id];}
export function exportData(){return {version:1,exportedAt:new Date().toISOString(),records:cache.records,pending:cache.pending,conflicts:cache.conflicts};}

function broadcast(id){if(!bus||!owner)return;bus.postMessage({source:tabId,owner,id,record:cache.records[id]||null,pending:cache.pending[id]||null,conflict:cache.conflicts[id]||null});}
function persistId(id){const currentOwner=owner;if(!currentOwner)return;const record=cache.records[id],pending=cache.pending[id],conflict=cache.conflicts[id];enqueue(async()=>{
 if(record)await saveRecord(currentOwner,id,record);else await removeRecord(currentOwner,id);
 if(pending)await savePending(currentOwner,id,pending);else await removePending(currentOwner,id);
 if(conflict)await saveConflict(currentOwner,id,conflict);else await removeConflict(currentOwner,id);
});}

export async function openStore(user,onChange){
 owner=user;listener=onChange;status=user==='demo'?'demo':online()?'loading':'offline';
 await migrateLegacyLocalStorage(user);
 const local=await loadOwner(user);cache={records:local.records,pending:local.pending,conflicts:local.conflicts};meta=local.meta||{owner:user,lastSync:null};
 if(user==='demo'&&Object.keys(cache.records).length===0){for(const r of starterRecords()){cache.records[r.id]=r;await saveRecord(user,r.id,r);}status='demo';notify();return;}
 notify();
 if(user!=='demo'){
  await sync();
  if(status==='synced'&&Object.keys(cache.records).length===0){for(const r of starterRecords())put(r.kind,r.data,r.id);await sync();}
  channel=supabase.channel(`entries:${user}`).on('postgres_changes',{event:'*',schema:'public',table:'entries',filter:`user_id=eq.${user}`},()=>sync()).subscribe();
 }
}

export function closeStore(){if(channel){supabase.removeChannel(channel);channel=null;}owner=null;cache={records:{},pending:{},conflicts:{}};meta={lastSync:null};listener=()=>{};status='local';}

export function put(kind,data,id=crypto.randomUUID(),deleted=false){
 if(!owner)throw new Error('Iniciá sesión primero.');
 const before=cache.records[id],previous=cache.pending[id];
 const r={...newRecord(kind,data,id),rev:before?.rev||0,deleted};cache.records[id]=r;
 if(owner!=='demo')cache.pending[id]={...r,expected:previous?.expected??r.rev,op:crypto.randomUUID()};
 persistId(id);broadcast(id);notify();if(owner!=='demo')void sync();return id;
}
export function remove(id){const r=cache.records[id];if(r)put(r.kind,r.data,id,true);}
export function restore(id){const r=cache.records[id];if(r)put(r.kind,r.data,id,false);}
export function trash(){return Object.values(cache.records).filter(r=>r.deleted);}

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
 syncing=true;const currentOwner=owner;status='syncing';notify();
 try{
  await writeQueue;
  let newest=meta.lastSync||null;
  for(const [id,p] of Object.entries({...cache.pending})){
   if(cache.conflicts[id]||cache.pending[id]?.op!==p.op)continue;
   const {data,error}=await supabase.rpc('write_entry',{p_id:id,p_kind:p.kind,p_data:p.data,p_deleted:p.deleted,p_expected:p.expected,p_op:p.op});
   if(owner!==currentOwner)return;if(error)throw error;
   if(!data.ok){cache.conflicts[id]={id,local:cache.pending[id]||p,remote:data.entry};delete cache.pending[id];}
   else if(cache.pending[id]?.op===p.op){cache.records[id]=data.entry;delete cache.pending[id];newest=newerSync(newest,data.entry?.updated_at);}
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
   if(!cache.pending[r.id]&&!cache.conflicts[r.id]){cache.records[r.id]=r;persistId(r.id);}
  }
  if(newest&&newest!==meta.lastSync){meta=await saveMeta(currentOwner,{lastSync:newest});}
  status=Object.keys(cache.conflicts).length?'conflict':Object.keys(cache.pending).length?'pending':'synced';notify();
 }catch(e){if(owner===currentOwner){status='error';console.warn('No se pudo sincronizar:',e.message);notify();}}
 finally{syncing=false;}
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
