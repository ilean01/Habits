import {createClient} from '@supabase/supabase-js';
import {newRecord,starterRecords} from './domain.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
const url=import.meta.env.VITE_SUPABASE_URL||SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||SUPABASE_PUBLISHABLE_KEY;
export const configured=!!(url&&key);
export const supabase=configured?createClient(url,key):null;
let owner=null,cache={records:{},pending:{},conflicts:{}},listener=()=>{},syncing=false,channel;
let status='local';
const storageKey=()=>`habits:v1:${owner}`;
const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey()))||{records:{},pending:{},conflicts:{}};}catch{return {records:{},pending:{},conflicts:{}};}};
function persist(){localStorage.setItem(storageKey(),JSON.stringify(cache));listener();}
export const info=()=>({status,pending:Object.keys(cache.pending).length,conflicts:Object.values(cache.conflicts),demo:owner==='demo'});
export function records(kind){return Object.values(cache.records).filter(r=>!r.deleted&&(!kind||r.kind===kind)).map(r=>({...r.data,id:r.id}));}
export function raw(id){return cache.records[id];}
export function exportData(){return {version:1,exportedAt:new Date().toISOString(),records:cache.records,pending:cache.pending,conflicts:cache.conflicts};}
export async function openStore(user,onChange){owner=user;listener=onChange;cache=read();status=user==='demo'?'demo':navigator.onLine?'loading':'offline';
 if(user==='demo'&&Object.keys(cache.records).length===0){for(const r of starterRecords())cache.records[r.id]=r;persist();}
 listener(); if(user!=='demo'){await sync();if(status==='synced'&&Object.keys(cache.records).length===0){for(const r of starterRecords())put(r.kind,r.data,r.id);await sync();}
 channel=supabase.channel(`entries:${user}`).on('postgres_changes',{event:'*',schema:'public',table:'entries',filter:`user_id=eq.${user}`},()=>sync()).subscribe();}
}
export function closeStore(){if(channel){supabase.removeChannel(channel);channel=null;}owner=null;cache={records:{},pending:{},conflicts:{}};listener=()=>{};}
export function put(kind,data,id=crypto.randomUUID(),deleted=false){
 if(!owner)throw new Error('Iniciá sesión primero.');cache=read();
 const before=cache.records[id];const previous=cache.pending[id];
 const r={...newRecord(kind,data,id),rev:before?.rev||0,deleted};
 cache.records[id]=r;
 if(owner!=='demo')cache.pending[id]={...r,expected:previous?.expected??r.rev,op:crypto.randomUUID()};
 persist();if(owner!=='demo')void sync();return id;
}
export function remove(id){const r=cache.records[id];if(r)put(r.kind,r.data,id,true);}
export function restore(id){const r=cache.records[id];if(r)put(r.kind,r.data,id,false);}
export function trash(){return Object.values(cache.records).filter(r=>r.deleted);}
export function resolveConflict(id,keepLocal){cache=read();const c=cache.conflicts[id];if(!c)return;delete cache.conflicts[id];delete cache.pending[id];if(c.remote)cache.records[id]=c.remote;else delete cache.records[id];persist();if(keepLocal)put(c.local.kind,c.local.data,id,c.local.deleted);else listener();}
export async function sync(){
 if(!owner||owner==='demo'||syncing)return;if(!navigator.onLine){status='offline';listener();return;}
 syncing=true;const currentOwner=owner;status='syncing';listener();
 try{
  cache=read();
  for(const [id,p] of Object.entries(cache.pending)){
   if(cache.conflicts[id])continue;
   const {data,error}=await supabase.rpc('write_entry',{p_id:id,p_kind:p.kind,p_data:p.data,p_deleted:p.deleted,p_expected:p.expected,p_op:p.op});
   if(owner!==currentOwner)return;
   if(error)throw error;
   cache=read();
   if(!data.ok){cache.conflicts[id]={id,local:cache.pending[id]||p,remote:data.entry};}
   else if(cache.pending[id]?.op===p.op){cache.records[id]=data.entry;delete cache.pending[id];}
   else if(cache.pending[id]){cache.pending[id].expected=data.entry.rev;cache.records[id].rev=data.entry.rev;}
   persist();
  }
  const remote=[];let offset=0;
  while(true){const {data,error}=await supabase.from('entries').select('id,kind,data,rev,deleted').eq('user_id',currentOwner).order('id').range(offset,offset+499);
   if(owner!==currentOwner)return;if(error)throw error;remote.push(...data);if(data.length<500)break;offset+=500;}
  cache=read();
  for(const r of remote){if(!cache.pending[r.id]&&!cache.conflicts[r.id])cache.records[r.id]=r;}
  status=Object.keys(cache.conflicts).length?'conflict':Object.keys(cache.pending).length?'pending':'synced';persist();
 }catch(e){if(owner===currentOwner){status='error';console.warn('No se pudo sincronizar:',e.message);listener();}}
 finally{syncing=false;}
}
window.addEventListener('online',()=>sync());window.addEventListener('offline',()=>{if(owner&&owner!=='demo'){status='offline';listener();}});
window.addEventListener('focus',()=>sync());window.addEventListener('storage',e=>{if(owner&&e.key===storageKey()){cache=read();listener();}});
setInterval(()=>sync(),20000);
