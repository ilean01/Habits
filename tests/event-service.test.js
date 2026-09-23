import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {authorizeEventSave,assessEventConflicts,validateEventTiming} from '../src/event-service.js';

test('una sola política valida horarios inválidos en cualquier pantalla',()=>{
 assert.throws(()=>validateEventTiming({date:'2026-09-24',time:'19:00',end:'18:00'}),/hora final/);
 assert.throws(()=>validateEventTiming({date:'2026-09-24',time:'19:00',until:'2026-09-23'}),/fecha final/);
});

test('un conflicto bloquea por defecto y puede confirmarse explícitamente',()=>{
 const events=[{id:'a',name:'Facultad',date:'2026-09-24',repeat:'none',time:'18:00',end:'20:00'}];
 const candidate={name:'Inglés',date:'2026-09-24',repeat:'none',time:'19:00',end:'20:30'};
 assert.equal(authorizeEventSave(candidate,events).allowed,false);
 let asked='';
 const allowed=authorizeEventSave(candidate,events,{confirmConflict:message=>{asked=message;return true;}});
 assert.equal(allowed.allowed,true);
 assert.match(asked,/Facultad/);
});

test('horarios semanales detectan choques futuros con la misma política',()=>{
 const events=[{id:'a',name:'Trabajo',date:'2026-09-24',repeat:'weekly',time:'18:00',end:'20:00',until:'2026-12-20'}];
 const candidate={name:'Inglés',date:'2026-09-17',repeat:'weekly',time:'19:00',end:'20:30',until:'2026-12-20'};
 const result=assessEventConflicts(candidate,events,{days:120});
 assert.ok(result.conflicts.some(c=>c.date==='2026-09-24'));
});

test('editar una sola ocurrencia no proyecta ese cambio al resto de la serie',()=>{
 const events=[
  {id:'serie',name:'Clase',date:'2026-09-24',repeat:'weekly',time:'18:00',end:'19:00'},
  {id:'otro',name:'Reunión',date:'2026-10-01',repeat:'none',time:'20:00',end:'21:00'}
 ];
 const edited={id:'serie',name:'Clase',date:'2026-09-24',repeat:'weekly',time:'20:00',end:'21:00'};
 const result=assessEventConflicts(edited,events,{ignoreId:'serie',occurrenceDate:'2026-09-24'});
 assert.equal(result.conflicts.length,0);
});

test('Calendario y horario semanal usan el mismo guard central',()=>{
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const planning=fs.readFileSync(new URL('../src/planning.js',import.meta.url),'utf8');
 assert.match(main,/authorizeEventSave\(data,rec\('event'\)/);
 assert.match(planning,/authorizeEventSave\(event,db\.records\('event'\)/);
 assert.doesNotMatch(planning,/if\(v\.end<=v\.time\)/);
});
