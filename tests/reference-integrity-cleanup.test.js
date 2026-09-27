import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {areaDependents,detachReferences,restoreReferences} from '../src/reference-integrity.js';
import {staleOrphanCoverPaths} from '../src/biblioteca/cover-maintenance.js';
import {resetLocalCacheForTests} from '../src/local-cache.js';
import * as db from '../src/store.js';

test('papelera desacopla referencias vivas y restaurar las vuelve a enlazar',()=>{
 const habit={id:'habit-1',kind:'habit',deleted:false,data:{name:'Caminar'}};
 const log={id:'log-1',kind:'log',deleted:false,data:{habitId:'habit-1',date:'2026-09-27',status:'done'}};
 const detached=detachReferences(habit,[habit,log]);
 assert.equal(detached.length,1);
 assert.equal(detached[0].data.habitId,'');
 assert.equal(detached[0].data.archivedHabitId,'habit-1');
 assert.equal(detached[0].data.habitName,'Caminar');
 const archivedLog={...log,data:detached[0].data};
 const restored=restoreReferences(habit,[habit,archivedLog]);
 assert.equal(restored.length,1);
 assert.equal(restored[0].data.habitId,'habit-1');
 assert.equal(restored[0].data.archivedHabitId,null);
});

test('proyectos y eventos usan la misma política de integridad',()=>{
 const project={id:'project-1',kind:'project',deleted:false,data:{name:'Tesis'}};
 const task={id:'task-1',kind:'task',deleted:false,data:{projectId:'project-1',name:'Marco teórico'}};
 const event={id:'event-1',kind:'event',deleted:false,data:{name:'Consulta'}};
 const eventLog={id:'event-log-1',kind:'eventLog',deleted:false,data:{eventId:'event-1',date:'2026-09-27'}};
 assert.equal(detachReferences(project,[project,task])[0].data.archivedProjectId,'project-1');
 assert.equal(detachReferences(event,[event,eventLog])[0].data.archivedEventId,'event-1');
});

test('un área con actividades dependientes queda protegida',()=>{
 const area={id:'salud',kind:'area',deleted:false,data:{name:'Salud'}};
 const habit={id:'h',kind:'habit',deleted:false,data:{area:'salud'}};
 assert.equal(areaDependents('salud',[area,habit]).length,1);
 assert.equal(areaDependents('otra',[area,habit]).length,0);
});

test('store aplica integridad al borrar y restaurar sin depender de la pantalla',async()=>{
 await resetLocalCacheForTests();
 await db.openStore('demo',()=>{});
 try{
  db.put('habit',{name:'Caminar',area:'salud'},'habit-x');
  db.put('log',{habitId:'habit-x',date:'2026-09-27',status:'done'},'log-x');
  db.remove('habit-x');
  assert.equal(db.raw('habit-x').deleted,true);
  assert.equal(db.records('log').find(x=>x.id==='log-x').habitId,'');
  assert.equal(db.records('log').find(x=>x.id==='log-x').archivedHabitId,'habit-x');
  db.restore('habit-x');
  assert.equal(db.raw('habit-x').deleted,false);
  assert.equal(db.records('log').find(x=>x.id==='log-x').habitId,'habit-x');
  assert.equal(db.records('log').find(x=>x.id==='log-x').archivedHabitId,null);
  assert.throws(()=>db.remove('salud'),/Primero mové a otra área/);
 }finally{db.closeStore();await resetLocalCacheForTests();}
});

test('portadas huérfanas solo se limpian si son antiguas y realmente no están referenciadas',()=>{
 const now=Date.parse('2026-09-27T12:00:00Z');
 const objects=[
  {name:'referenciada.jpg',created_at:'2026-09-20T12:00:00Z'},
  {name:'huerfana-vieja.jpg',created_at:'2026-09-20T12:00:00Z'},
  {name:'huerfana-reciente.jpg',created_at:'2026-09-27T11:30:00Z'},
  {name:'sin-fecha.jpg'}
 ];
 const refs=new Set(['owner/books/referenciada.jpg']);
 assert.deepEqual(staleOrphanCoverPaths(objects,refs,{prefix:'owner/books',now,minAgeMs:24*60*60*1000}),['owner/books/huerfana-vieja.jpg']);
});
