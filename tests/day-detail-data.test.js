import test from 'node:test';
import assert from 'node:assert/strict';
import {dayDetailData} from '../src/day-detail-data.js';

test('la ficha diaria reúne planner, ánimo, tareas, agua, lectura y gym sin mezclar otros días',()=>{
 const date='2026-09-25';
 const data=dayDetailData({
  date,
  dailyPlans:[{id:'daily-plan:2026-09-25',date,priorities:['Estudiar','Llamar a mamá',''],gratitude:'Mi familia',notes:'Día tranquilo'}],
  journals:[
   {id:'j1',date,mood:4,text:'Me sentí bien',at:'2026-09-25T20:00:00Z'},
   {id:'p1',date,workoutPhoto:true,path:'u/photo.jpg',angle:'frente',at:'2026-09-25T19:00:00Z'},
   {id:'b1',date,bodyLog:true,weight:80.4,waist:83,at:'2026-09-25T19:10:00Z'},
   {id:'a1',date,achievement:true,text:'Terminé el trabajo',at:'2026-09-25T18:00:00Z'},
   {id:'other',date:'2026-09-24',mood:1,text:'Otro día'}
  ],
  photos:[{id:'general-photo',date,path:'u/day.jpg',bucket:'day-photos',category:'general',caption:'Un recuerdo',at:'2026-09-25T17:00:00Z'}],
  tasks:[{id:'t1',name:'Una',due:date,done:true,priority:'alta'},{id:'t2',name:'Dos',due:date,done:false,priority:'media'},{id:'t3',name:'Otro día',due:'2026-09-24',done:true}],
  readings:[{id:'r1',date,minutes:18,bookTitle:'Libro A',at:'2026-09-25T10:00:00Z'},{id:'r2',date,minutes:12,bookTitle:'Libro B',at:'2026-09-25T21:00:00Z'}],
  logs:[{id:'w1',date,hydration:true,milliliters:750},{id:'w2',date,hydration:true,milliliters:500},{id:'old',date:'2026-09-24',hydration:true,milliliters:2000}]
 });
 assert.deepEqual(data.priorities,['Estudiar','Llamar a mamá']);
 assert.equal(data.gratitude,'Mi familia');
 assert.equal(data.notes,'Día tranquilo');
 assert.equal(data.mood,4);
 assert.equal(data.diary.text,'Me sentí bien');
 assert.equal(data.tasks.length,2);
 assert.equal(data.tasksDone,1);
 assert.equal(data.waterLiters,1.25);
 assert.equal(data.readingMinutes,30);
 assert.equal(data.readings.length,2);
 assert.equal(data.dayPhotos.length,2);
 assert.equal(data.workoutPhotos.length,1);
 assert.equal(data.hasPhotos,true);
 assert.equal(data.bodyLog.weight,80.4);
 assert.equal(data.achievements.length,1);
 assert.equal(data.hasReflection,true);
 assert.equal(data.hasWellbeing,true);
});

test('una fecha vacía devuelve una ficha limpia sin datos falsos',()=>{
 const data=dayDetailData({date:'2026-09-25'});
 assert.deepEqual(data.priorities,[]);
 assert.equal(data.mood,0);
 assert.equal(data.tasks.length,0);
 assert.equal(data.waterLiters,0);
 assert.equal(data.readingMinutes,0);
 assert.equal(data.dayPhotos.length,0);
 assert.equal(data.workoutPhotos.length,0);
 assert.equal(data.hasPhotos,false);
 assert.equal(data.hasReflection,false);
 assert.equal(data.hasWellbeing,false);
});
