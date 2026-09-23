import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingTasks,laterTasks,completedTasks} from '../src/selectors.js';

test('tareas activas con fecha, para después y completadas son grupos excluyentes',()=>{
 const rows=[
  {id:'dated',due:'2026-09-30',done:false},
  {id:'later',due:'',done:false},
  {id:'done-dated',due:'2026-09-20',done:true},
  {id:'done-undated',done:true}
 ];
 assert.deepEqual(pendingTasks(rows).map(x=>x.id),['dated']);
 assert.deepEqual(laterTasks(rows).map(x=>x.id),['later']);
 assert.deepEqual(completedTasks(rows).map(x=>x.id),['done-dated','done-undated']);
 const ids=[...pendingTasks(rows),...laterTasks(rows),...completedTasks(rows)].map(x=>x.id);
 assert.equal(new Set(ids).size,rows.length);
});

test('poner fecha o completar una tarea la mueve de grupo automáticamente',()=>{
 const task={id:'x',done:false,due:''};
 assert.equal(laterTasks([task]).length,1);
 task.due='2026-10-01';
 assert.equal(laterTasks([task]).length,0);
 assert.equal(pendingTasks([task]).length,1);
 task.done=true;
 assert.equal(pendingTasks([task]).length,0);
 assert.equal(completedTasks([task]).length,1);
});
