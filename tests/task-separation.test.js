import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingTasks,scheduledTasks,laterTasks,completedTasks,taskTemporalStatus} from '../src/selectors.js';

const today='2026-09-27';

test('pendientes, programadas, para después y completadas son grupos excluyentes',()=>{
 const rows=[
  {id:'overdue',due:'2026-09-20',done:false},
  {id:'today',due:'2026-09-27',done:false},
  {id:'future',due:'2026-09-30',done:false},
  {id:'later',due:'',done:false},
  {id:'done-dated',due:'2026-09-20',done:true},
  {id:'done-undated',done:true}
 ];
 assert.deepEqual(pendingTasks(rows,today).map(x=>x.id),['overdue','today']);
 assert.deepEqual(scheduledTasks(rows,today).map(x=>x.id),['future']);
 assert.deepEqual(laterTasks(rows,today).map(x=>x.id),['later']);
 assert.deepEqual(completedTasks(rows,today).map(x=>x.id),['done-dated','done-undated']);
 const ids=[...pendingTasks(rows,today),...scheduledTasks(rows,today),...laterTasks(rows,today),...completedTasks(rows,today)].map(x=>x.id);
 assert.equal(new Set(ids).size,rows.length);
});

test('una tarea de mañana es Programada y pasa a Pendiente cuando llega el día',()=>{
 const task={id:'x',done:false,due:'2026-09-28'};
 assert.equal(taskTemporalStatus(task,'2026-09-27'),'scheduled');
 assert.equal(scheduledTasks([task],'2026-09-27').length,1);
 assert.equal(pendingTasks([task],'2026-09-27').length,0);
 assert.equal(taskTemporalStatus(task,'2026-09-28'),'pending');
 assert.equal(pendingTasks([task],'2026-09-28').length,1);
 task.done=true;
 assert.equal(taskTemporalStatus(task,'2026-09-28'),'completed');
 assert.equal(completedTasks([task],'2026-09-28').length,1);
});

test('una tarea sin fecha sigue viviendo en Para después',()=>{
 const task={id:'later',done:false,due:''};
 assert.equal(taskTemporalStatus(task,today),'later');
 assert.equal(laterTasks([task],today).length,1);
});
