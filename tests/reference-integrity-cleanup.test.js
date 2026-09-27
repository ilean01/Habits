import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {areaDependents,detachReferences,restoreReferences} from '../src/reference-integrity.js';
import {staleOrphanCoverPaths} from '../src/biblioteca/cover-maintenance.js';

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

test('store aplica la política central al borrar y restaurar',async()=>{
 const source=await readFile(new URL('../src/store.js',import.meta.url),'utf8');
 assert.match(source,/areaDependents/);
 assert.match(source,/detachReferences/);
 assert.match(source,/restoreReferences/);
 assert.match(source,/applyReferenceChanges\(detachReferences\(r,all\)\)/);
 assert.match(source,/applyReferenceChanges\(restoreReferences\(r,Object\.values\(cache\.records\)\)\)/);
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

test('Biblioteca programa barrido seguro de portadas y la auditoría controla Storage',async()=>{
 const [data,audit]=await Promise.all([
  readFile(new URL('../src/biblioteca/data.js',import.meta.url),'utf8'),
  readFile(new URL('../supabase/library_integrity_audit.sql',import.meta.url),'utf8')
 ]);
 assert.match(data,/cleanupOrphanCovers/);
 assert.match(data,/24\*60\*60\*1000/);
 assert.match(data,/cleanupCover\(path,owner\)/);
 assert.match(audit,/portadas_huerfanas/);
 assert.match(audit,/portadas_faltantes/);
});
