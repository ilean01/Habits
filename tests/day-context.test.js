import test from 'node:test';
import assert from 'node:assert/strict';
import {habitsForDayMode,freeTimeSuggestions} from '../src/day-context.js';

const base=[
 {id:'p',name:'Personal',area:'personal',days:[2],order:0},
 {id:'w',name:'Trabajo',area:'trabajo',days:[2],order:3},
 {id:'f',name:'Facultad',area:'facultad',days:[2],order:2},
 {id:'e',name:'Esencial',area:'personal',days:[2],order:4,essential:true},
 {id:'g',name:'Gym',area:'salud',days:[2],frequencyMode:'weekly',weeklyTarget:2,order:5}
];

test('cada tipo de día cambia de forma visible la selección o el orden',()=>{
 assert.deepEqual(habitsForDayMode(base,[],'2026-09-22','trabajo').map(x=>x.id).slice(0,2),['w','p']);
 assert.equal(habitsForDayMode(base,[],'2026-09-22','finDeSemana').some(x=>x.id==='w'),false);
 assert.deepEqual(habitsForDayMode(base,[],'2026-09-22','tranquilo').map(x=>x.id),['e']);
 assert.deepEqual(habitsForDayMode(base,[],'2026-09-22','descanso').map(x=>x.id),['e']);
});

test('Tengo un rato libre no recomienda una meta semanal ya cumplida',()=>{
 const logs=[{habitId:'g',date:'2026-09-21',status:'done'},{habitId:'g',date:'2026-09-22',status:'done'}];
 const out=freeTimeSuggestions(base,logs,'2026-09-22',60,'habitual');
 assert.equal(out.some(x=>x.id==='g'),false);
});
