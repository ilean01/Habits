import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingTasks,laterTasks,completedTasks} from '../src/selectors.js';

const rows=[
  {id:'dated',name:'Con fecha',due:'2026-09-30',done:false},
  {id:'later',name:'Sin fecha',due:'',done:false},
  {id:'done-dated',name:'Terminada con fecha',due:'2026-09-20',done:true},
  {id:'done-later',name:'Terminada sin fecha',done:true}
];
test('Pendientes contiene solo activas con fecha',()=>assert.deepEqual(pendingTasks(rows).map(x=>x.id),['dated']));
test('Para después contiene solo activas sin fecha',()=>assert.deepEqual(laterTasks(rows).map(x=>x.id),['later']));
test('Completadas contiene todas las terminadas',()=>assert.deepEqual(completedTasks(rows).map(x=>x.id),['done-dated','done-later']));
test('los tres estados son mutuamente excluyentes',()=>{
  const ids=[...pendingTasks(rows),...laterTasks(rows),...completedTasks(rows)].map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.equal(ids.length,rows.length);
});
