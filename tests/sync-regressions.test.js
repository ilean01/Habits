import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import 'fake-indexeddb/auto';

const pause=()=>new Promise(r=>setTimeout(r,10));
async function until(check){for(let n=0;n<150;n++){if(check())return;await pause();}assert.ok(check(),'El estado no se estabilizó');}

test('la cola offline conserva cambios, rebasa ediciones durante un envío y mantiene conflictos reales',async()=>{
 let online=false,release,started=false,hold=false;const remote=new Map();
 Object.defineProperty(globalThis.navigator,'onLine',{configurable:true,get:()=>online});
 globalThis.__syncTestClient={
  channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  from(){return {select(){return this;},eq(){return this;},order(){return this;},range(){return this;},gte(){return this;},then(resolve){return Promise.resolve({data:[...remote.values()],error:null}).then(resolve);}};},
  async rpc(name,p){
   if(hold){hold=false;started=true;await new Promise(r=>release=r);}
   const prev=remote.get(p.p_id);
   if((prev?.rev||0)!==p.p_expected)return {data:{ok:false,entry:prev},error:null};
   const entry={id:p.p_id,kind:p.p_kind,data:p.p_data,deleted:p.p_deleted,rev:(prev?.rev||0)+1,updated_at:new Date().toISOString()};remote.set(entry.id,entry);return {data:{ok:true,entry},error:null};
  }
 };
 const result=await build({entryPoints:['src/store.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env':'{}'},plugins:[{name:'test-client',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'mock',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const createClient=()=>globalThis.__syncTestClient;',loader:'js'}));}}]});
 const db=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 try{
  await db.openStore('sync-regression-user',()=>{});
  db.put('task',{name:'Sin internet'},'task-1');
  assert.equal(db.info().pending,1);assert.equal(remote.size,0);
  await pause();await pause();db.closeStore();await db.openStore('sync-regression-user',()=>{});
  assert.equal(db.records('task')[0].name,'Sin internet');assert.equal(db.info().pending,1);
  online=true;hold=true;const sync=db.sync();await until(()=>started);
  db.put('task',{name:'Editado mientras se enviaba'},'task-1');release();await sync;
  await until(()=>db.info().status==='synced');
  assert.equal(db.info().conflicts.length,0);assert.equal(remote.get('task-1').data.name,'Editado mientras se enviaba');assert.equal(remote.get('task-1').rev,2);
  online=false;db.put('task',{name:'Mi versión offline'},'task-1');
  remote.set('task-1',{...remote.get('task-1'),rev:3,data:{name:'Otro dispositivo'}});
  online=true;await db.sync();assert.equal(db.info().conflicts.length,1);assert.equal(remote.get('task-1').data.name,'Otro dispositivo');
  db.resolveConflict('task-1',true);await until(()=>db.info().status==='synced');
  assert.equal(remote.get('task-1').data.name,'Mi versión offline');assert.equal(remote.get('task-1').rev,4);
 }finally{db.closeStore();delete globalThis.__syncTestClient;delete globalThis.navigator.onLine;}
});
