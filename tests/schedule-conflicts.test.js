import test from 'node:test';
import assert from 'node:assert/strict';
import {findEventConflicts,conflictMessage} from '../src/schedule-conflicts.js';

test('detecta eventos superpuestos con hora final',()=>{
 const events=[{id:'a',name:'Inglés',date:'2026-09-24',repeat:'none',time:'18:00',end:'19:30'}];
 const conflicts=findEventConflicts({name:'Reunión',date:'2026-09-24',repeat:'none',time:'19:00',end:'20:00'},events);
 assert.equal(conflicts.length,1);
 assert.match(conflictMessage(conflicts),/Inglés/);
});

test('detecta dos eventos cercanos aunque ninguno tenga hora final',()=>{
 const events=[{id:'a',name:'Llamada',date:'2026-09-24',repeat:'none',time:'18:00',end:''}];
 const conflicts=findEventConflicts({name:'Reunión',date:'2026-09-24',repeat:'none',time:'18:15',end:''},events);
 assert.equal(conflicts.length,1);
});

test('detecta choques de una serie semanal en fechas futuras',()=>{
 const events=[{id:'a',name:'Facultad',date:'2026-09-24',repeat:'weekly',time:'18:00',end:'20:00',until:'2026-12-20'}];
 const conflicts=findEventConflicts({name:'Inglés',date:'2026-09-17',repeat:'weekly',time:'19:00',end:'20:30',until:'2026-12-20'},events,{days:120});
 assert.ok(conflicts.some(c=>c.date==='2026-09-24'));
});

test('ignora el evento que se está editando',()=>{
 const events=[{id:'a',name:'Inglés',date:'2026-09-24',repeat:'none',time:'18:00',end:'19:30'}];
 assert.equal(findEventConflicts({...events[0]},events,{ignoreId:'a'}).length,0);
});
