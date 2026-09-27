import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import 'fake-indexeddb/auto';

const pause=(ms=10)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,message){
 for(let n=0;n<200;n++){
  if(check())return;
  await pause();
 }
 assert.ok(check(),message||'El estado no se estabilizó');
}

test('dos dispositivos con la misma cuenta sincronizan en ambos sentidos, recuperan offline y detectan conflicto',async()=>{
 let online=true;
 let revision=1;
 const remote=new Map([['shared-task',{
  id:'shared-task',kind:'task',data:{name:'Inicial'},deleted:false,rev:1,updated_at:'2026-09-27T20:00:00.001Z'
 }]]);
 const channels=new Set();
 const originalBroadcastChannel=globalThis.BroadcastChannel;
 Object.defineProperty(globalThis,'BroadcastChannel',{configurable:true,writable:true,value:undefined});
 Object.defineProperty(globalThis.navigator,'onLine',{configurable:true,get:()=>online});

 const emitRealtime=()=>queueMicrotask(()=>{
  for(const channel of [...channels])channel.handler?.({eventType:'UPDATE'});
 });
 globalThis.__crossDeviceClient={
  channel(){
   return {
    handler:null,
    on(_type,_filter,handler){this.handler=handler;return this;},
    subscribe(){channels.add(this);return this;}
   };
  },
  removeChannel(channel){channels.delete(channel);},
  from(){
   return {
    select(){return this;},eq(){return this;},order(){return this;},range(){return this;},gte(){return this;},
    then(resolve){return Promise.resolve({data:[...remote.values()],error:null}).then(resolve);}
   };
  },
  async rpc(name,p){
   assert.equal(name,'write_entry');
   const previous=remote.get(p.p_id);
   if((previous?.rev||0)!==p.p_expected)return {data:{ok:false,entry:previous||null},error:null};
   revision=Math.max(revision,previous?.rev||0)+1;
   const entry={id:p.p_id,kind:p.p_kind,data:p.p_data,deleted:p.p_deleted,rev:revision,updated_at:`2026-09-27T20:00:00.${String(revision).padStart(3,'0')}Z`};
   remote.set(entry.id,entry);
   emitRealtime();
   return {data:{ok:true,entry},error:null};
  }
 };

 const result=await build({
  entryPoints:['src/store.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env':'{}'},
  plugins:[{name:'cross-device-client',setup(builder){
   builder.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'mock',namespace:'cross-device'}));
   builder.onLoad({filter:/.*/,namespace:'cross-device'},()=>({contents:'export const createClient=()=>globalThis.__crossDeviceClient;',loader:'js'}));
  }}]
 });
 const encoded=Buffer.from(result.outputFiles[0].text).toString('base64');
 const phone=await import(`data:text/javascript;base64,${encoded}#iphone`);
 const notebook=await import(`data:text/javascript;base64,${encoded}#notebook`);
 try{
  await phone.openStore('same-account',()=>{});
  await notebook.openStore('same-account',()=>{});
  assert.equal(phone.records('task')[0].name,'Inicial');
  assert.equal(notebook.records('task')[0].name,'Inicial');

  phone.put('task',{name:'Creado desde iPhone'},'shared-task');
  await until(()=>remote.get('shared-task')?.data.name==='Creado desde iPhone','iPhone no llegó al servidor');
  await until(()=>notebook.records('task')[0]?.name==='Creado desde iPhone','Notebook no recibió Realtime desde iPhone');
  assert.equal(notebook.info().pending,0);

  notebook.put('task',{name:'Editado desde notebook'},'shared-task');
  await until(()=>remote.get('shared-task')?.data.name==='Editado desde notebook','Notebook no llegó al servidor');
  await until(()=>phone.records('task')[0]?.name==='Editado desde notebook','iPhone no recibió Realtime desde notebook');
  assert.equal(phone.info().pending,0);

  online=false;
  phone.put('task',{name:'Cambio offline en iPhone'},'shared-task');
  await pause(30);
  assert.equal(phone.info().pending,1);
  assert.equal(remote.get('shared-task').data.name,'Editado desde notebook');
  online=true;
  await phone.sync();
  await until(()=>phone.info().pending===0,'La cola offline no se vació al reconectar');
  await until(()=>notebook.records('task')[0]?.name==='Cambio offline en iPhone','Notebook no recibió el cambio tras reconexión');
  await until(()=>phone.info().status==='synced'&&notebook.info().status==='synced','Los dos clientes no terminaron el refresh previo');

  online=false;
  phone.put('task',{name:'Versión iPhone en conflicto'},'shared-task');
  notebook.put('task',{name:'Versión notebook en conflicto'},'shared-task');
  assert.equal(phone.info().pending,1);
  assert.equal(notebook.info().pending,1);
  online=true;
  await phone.sync();
  await until(()=>remote.get('shared-task')?.data.name==='Versión iPhone en conflicto','El primer dispositivo no publicó su versión');
  await until(()=>notebook.info().status!=='syncing','El segundo dispositivo seguía refrescando');
  if(notebook.info().conflicts.length===0&&notebook.info().pending>0)await notebook.sync();
  await until(()=>notebook.info().conflicts.length===1,'No se detectó la edición concurrente del segundo dispositivo');
  assert.equal(remote.get('shared-task').data.name,'Versión iPhone en conflicto');
  assert.equal(notebook.info().conflicts[0].local.data.name,'Versión notebook en conflicto');
  assert.equal(notebook.info().conflicts[0].remote.data.name,'Versión iPhone en conflicto');
  notebook.resolveConflict('shared-task',false);
  assert.equal(notebook.records('task')[0].name,'Versión iPhone en conflicto');
 }finally{
  phone.closeStore();
  notebook.closeStore();
  delete globalThis.__crossDeviceClient;
  delete globalThis.navigator.onLine;
  Object.defineProperty(globalThis,'BroadcastChannel',{configurable:true,writable:true,value:originalBroadcastChannel});
 }
});
