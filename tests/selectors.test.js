import test from 'node:test';
import assert from 'node:assert/strict';
import {diaryEntries,personalProjects,subjectProjects,taskProjectOptions,isHydrationHabit,hydrationTargetMl,dayModeAllowsHabit,priorityAreaForDayMode} from '../src/selectors.js';

test('el Diario no mezcla peso, fotos, inglés ni logros',()=>{
 const rows=[
  {id:'d',date:'2026-09-23',text:'Mi día'},
  {id:'g',date:'2026-09-23',bodyLog:true,weight:80},
  {id:'p',date:'2026-09-23',workoutPhoto:true},
  {id:'e',date:'2026-09-23',englishPractice:true},
  {id:'a',date:'2026-09-23',achievement:true,text:'Logro'}
 ];
 assert.deepEqual(diaryEntries(rows).map(x=>x.id),['d']);
});

test('materias y proyectos personales quedan separados',()=>{
 const rows=[{id:'p',name:'Casa'},{id:'s',name:'Física',category:'subject'}];
 assert.deepEqual(personalProjects(rows).map(x=>x.id),['p']);
 assert.deepEqual(subjectProjects(rows).map(x=>x.id),['s']);
 assert.deepEqual(taskProjectOptions(rows,'').map(x=>x.id),['p']);
 assert.deepEqual(taskProjectOptions(rows,'s').map(x=>x.id),['p','s']);
});

test('el hábito viejo de 8 vasos se reconoce como hidratación y equivale a 2 litros',()=>{
 const h={name:'Tomar agua',area:'salud',unit:'vasos',target:8};
 assert.equal(isHydrationHabit(h),true);
 assert.equal(hydrationTargetMl(h),2000);
});

test('los tipos de día reducen solo cuando corresponde y priorizan sin esconder',()=>{
 const personal={area:'personal',essential:false},work={area:'trabajo',essential:false},study={area:'facultad',essential:false},essential={area:'personal',essential:true};
 assert.equal(dayModeAllowsHabit(work,'trabajo'),true);
 assert.equal(dayModeAllowsHabit(personal,'trabajo'),true);
 assert.equal(dayModeAllowsHabit(study,'facultad'),true);
 assert.equal(dayModeAllowsHabit(personal,'facultad'),true);
 assert.equal(priorityAreaForDayMode('trabajo'),'trabajo');
 assert.equal(priorityAreaForDayMode('facultad'),'facultad');
 assert.equal(dayModeAllowsHabit(personal,'tranquilo'),false);
 assert.equal(dayModeAllowsHabit(essential,'descanso'),true);
 assert.equal(dayModeAllowsHabit(work,'finDeSemana'),false);
});
