import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calendarDayIndicators,compactLiters} from '../src/calendar-day-indicators.js';

test('los indicadores resumen ánimo, agua, fotos y completados de una sola fecha',()=>{
 const date='2026-09-25';
 const info=calendarDayIndicators({
  date,
  habitDone:2,
  journals:[
   {id:'mood',date,mood:4,text:'Bien',at:'2026-09-25T20:00:00Z'},
   {id:'photo',date,workoutPhoto:true,path:'u/gym.jpg',at:'2026-09-25T19:00:00Z'},
   {id:'old',date:'2026-09-24',mood:1}
  ],
  tasks:[{id:'t1',due:date,done:true},{id:'t2',due:date,done:false},{id:'t3',due:'2026-09-24',done:true}],
  logs:[{id:'w1',date,hydration:true,milliliters:1250},{id:'old-water',date:'2026-09-24',hydration:true,milliliters:2000}],
  eventLogs:[{id:'e1',date,eventId:'event-1'},{id:'old-event',date:'2026-09-24',eventId:'event-2'}]
 });
 assert.deepEqual(info.mood,{emoji:'😊',label:'Muy bien'});
 assert.equal(info.waterLiters,1.25);
 assert.equal(info.photos,1);
 assert.equal(info.completed,4);
 assert.equal(info.hasAny,true);
});

test('un día sin señales no inventa indicadores',()=>{
 const info=calendarDayIndicators({date:'2026-09-25'});
 assert.equal(info.mood,null);
 assert.equal(info.waterLiters,0);
 assert.equal(info.photos,0);
 assert.equal(info.completed,0);
 assert.equal(info.hasAny,false);
});

test('los litros usan una etiqueta compacta',()=>{
 assert.equal(compactLiters(0),'');
 assert.equal(compactLiters(0.75),'0,8');
 assert.equal(compactLiters(1.25),'1,3');
 assert.equal(compactLiters(2),'2');
});

test('el calendario principal integra los indicadores en su render normal',()=>{
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../src/calendar-indicators.css',import.meta.url),'utf8');
 assert.match(main,/calendarDayIndicators/);
 assert.match(main,/calendar-indicators\.css/);
 assert.match(main,/calendar-signal mood/);
 assert.match(main,/calendar-signal water/);
 assert.match(main,/calendar-signal photos/);
 assert.match(main,/calendar-signal done/);
 assert.match(css,/\.calendar-indicators/);
});
