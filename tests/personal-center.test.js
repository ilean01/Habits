import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import 'fake-indexeddb/auto';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

async function demoStore(){
 globalThis.__personalCenterClient={channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){}};
 const result=await build({entryPoints:['src/store.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env':'{}'},plugins:[{name:'test-client',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'mock',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const createClient=()=>globalThis.__personalCenterClient;',loader:'js'}));}}]});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}

test('Centro personal reúne avisos, actividad y papelera sin duplicar navegación',async()=>{
 const [center,notifications,css]=await Promise.all([read('src/personal-center.js'),read('src/notifications.js'),read('src/personal-center.css')]);
 assert.match(center,/Centro personal/);assert.match(center,/Avisos/);assert.match(center,/Actividad/);assert.match(center,/Papelera/);
 assert.match(center,/data-personal-center-button/);assert.match(center,/notice-read-all/);assert.match(center,/trash-empty/);
 assert.match(center,/metaKey/);assert.match(center,/data-action=\"trash\"/);
 assert.match(notifications,/import '\.\/personal-center\.js'/);assert.match(notifications,/db\.put\('notice'/);
 assert.match(css,/personal-badge/);assert.match(css,/@media\(max-width:650px\)/);
});

test('recordatorios del servidor se guardan una sola vez en el buzón sincronizado',async()=>{
 const [fn,migration]=await Promise.all([read('supabase/functions/send-reminders/index.ts'),read('supabase/migrations/20260928014539_personal_center_history.sql')]);
 assert.match(fn,/saveNotice/);assert.match(fn,/`notice:\$\{occurrence\}`/);assert.match(fn,/ignoreDuplicates:true/);assert.match(fn,/kind:'notice'/);
 assert.match(migration,/'activity'::text/);assert.match(migration,/'notice'::text/);assert.match(migration,/entries_user_kind_updated_idx/);
});

test('store mantiene historial, deshacer y rehacer, y una papelera restaurable',async()=>{
 const db=await demoStore(),id='task-personal-center-test';
 try{
  await db.openStore('demo',()=>{});
  db.put('task',{name:'Primera versión'},id);
  assert.equal(db.raw(id).data.name,'Primera versión');
  assert.equal(db.historyInfo().undo,1);
  assert.equal(db.activity().at(-1)?.action,'created');

  db.put('task',{name:'Segunda versión'},id);
  assert.equal(db.raw(id).data.name,'Segunda versión');
  db.undo();assert.equal(db.raw(id).data.name,'Primera versión');assert.equal(db.historyInfo().redo,1);
  db.redo();assert.equal(db.raw(id).data.name,'Segunda versión');

  db.remove(id);assert.ok(db.trash().some(r=>r.id===id));
  db.undo();assert.equal(db.raw(id).deleted,false);assert.ok(!db.trash().some(r=>r.id===id));
  db.redo();assert.equal(db.raw(id).deleted,true);assert.ok(db.trash().some(r=>r.id===id));
  db.restore(id);assert.equal(db.raw(id).deleted,false);

  db.remove(id);assert.equal(db.purge(id),true);assert.ok(!db.trash().some(r=>r.id===id));
  assert.equal(db.raw(id).deleted,true);assert.ok(db.raw(id).data.__purgedAt);assert.equal(db.raw(id).data.name,undefined);
  assert.ok(db.activity().some(a=>a.action==='purged'&&a.targetId===id));
 }finally{db.closeStore();delete globalThis.__personalCenterClient;}
});

test('respaldos aceptan los nuevos registros sincronizados',async()=>{
 const extras=await read('src/extras.js');
 assert.match(extras,/'activity','notice'/);
});
