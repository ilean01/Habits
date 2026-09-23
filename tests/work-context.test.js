import test from 'node:test';
import assert from 'node:assert/strict';
import {activeWorkBlock,prioritizeForWork,shouldSilencePersonal} from '../src/work-context.js';

const events=[{id:'w',name:'Trabajo',area:'trabajo',date:'2026-09-21',repeat:'weekly',time:'08:00',end:'16:00'}];

test('detecta el bloque laboral activo',()=>{assert.equal(activeWorkBlock(events,'2026-09-28','10:30')?.id,'w');assert.equal(activeWorkBlock(events,'2026-09-28','18:00'),null);});
test('prioriza hábitos laborales sin borrar los personales',()=>{const items=[{id:'p',area:'personal',order:0},{id:'w',area:'trabajo',order:5}];assert.deepEqual(prioritizeForWork(items,true).map(x=>x.id),['w','p']);assert.equal(prioritizeForWork(items,true).length,2);});
test('silencia avisos personales solo si la opción está activa y se está trabajando',()=>{assert.equal(shouldSilencePersonal({quietWork:true},events,'2026-09-28','10:00'),true);assert.equal(shouldSilencePersonal({quietWork:false},events,'2026-09-28','10:00'),false);});
