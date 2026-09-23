import test from 'node:test';
import assert from 'node:assert/strict';
import {eventConflictDates,overlaps} from '../src/scheduling.js';

test('detecta eventos exactamente a la misma hora aunque no tengan hora final',()=>{
 assert.equal(overlaps({time:'18:00'},{time:'18:00'}),true);
});

test('detecta choques en una recurrencia futura y no solo en la primera fecha',()=>{
 const candidate={name:'Inglés',date:'2026-09-22',repeat:'weekly',time:'18:00',end:'19:30'};
 const existing=[{id:'r',name:'Reunión',date:'2026-09-29',repeat:'none',time:'19:00',end:'20:00'}];
 const conflicts=eventConflictDates(candidate,existing,{horizonDays:30});
 assert.equal(conflicts.length,1);
 assert.equal(conflicts[0].date,'2026-09-29');
 assert.equal(conflicts[0].event.name,'Reunión');
});

test('no informa choque cuando los horarios se tocan pero no se superponen',()=>{
 assert.equal(overlaps({time:'18:00',end:'19:00'},{time:'19:00',end:'20:00'}),false);
});
