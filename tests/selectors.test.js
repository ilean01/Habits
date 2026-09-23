import test from 'node:test';
import assert from 'node:assert/strict';
import {diaryEntries,subjects,personalProjects,englishPractice,bodyMeasurements,workoutPhotos,hydrationLogs,undatedTasks} from '../src/selectors.js';

test('el diario no mezcla registros técnicos de gym ni práctica de inglés',()=>{
 const rows=[
  {id:'d',date:'2026-09-23',text:'diario'},
  {id:'a',date:'2026-09-23',achievement:true,text:'logro'},
  {id:'e',englishPractice:true,text:'listening'},
  {id:'b',bodyLog:true,weight:80},
  {id:'p',workoutPhoto:true,path:'x.jpg'}
 ];
 assert.deepEqual(diaryEntries(rows).map(x=>x.id),['d','a']);
 assert.deepEqual(englishPractice(rows).map(x=>x.id),['e']);
 assert.deepEqual(bodyMeasurements(rows).map(x=>x.id),['b']);
 assert.deepEqual(workoutPhotos(rows).map(x=>x.id),['p']);
});

test('materias y proyectos personales nunca se mezclan',()=>{
 const rows=[{id:'m',category:'subject'},{id:'p',category:'personal'},{id:'q'}];
 assert.deepEqual(subjects(rows).map(x=>x.id),['m']);
 assert.deepEqual(personalProjects(rows).map(x=>x.id),['p','q']);
});

test('agua y Para después tienen selectores explícitos',()=>{
 assert.deepEqual(hydrationLogs([{id:'w',hydration:true},{id:'h',habitId:'x'}]).map(x=>x.id),['w']);
 assert.deepEqual(undatedTasks([{id:'a',done:false,due:''},{id:'b',done:false,due:'2026-09-30'},{id:'c',done:true,due:''}]).map(x=>x.id),['a']);
});
