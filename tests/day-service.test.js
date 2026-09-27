import test from 'node:test';
import assert from 'node:assert/strict';
import {daySnapshot,notificationDayContext} from '../src/day-service.js';

const date='2026-09-25';
const source={
 event:[{id:'e1',name:'Médico',date,time:'09:00',repeat:'none'},{id:'e2',name:'Otro',date:'2026-09-24',repeat:'none'}],
 eventLog:[],
 task:[{id:'t1',name:'Hoy',due:date,done:false,priority:'alta'},{id:'late',name:'Ayer',due:'2026-09-24',done:false,priority:'media'}],
 dailyPlan:[{id:`daily-plan:${date}`,date,priorities:['Estudiar','',''],gratitude:'Tiempo',notes:'Nota'}],
 journal:[{id:'j1',date,mood:4,text:'Buen día',at:`${date}T20:00:00Z`}],
 reading:[{id:'r1',date,minutes:20,bookTitle:'Libro',at:`${date}T18:00:00Z`}],
 log:[{id:'w1',date,hydration:true,milliliters:750}],
 meal:[{id:'m1',date,mealType:'almuerzo',calories:500,protein:30,carbs:50,fat:18}],
 photo:[],habit:[]
};
const records=kind=>source[kind]||[];

test('daySnapshot reúne una sola versión del día para todas las vistas',()=>{
 const day=daySnapshot({date,records,settings:{}});
 assert.equal(day.date,date);
 assert.equal(day.mode,'habitual');
 assert.deepEqual(day.events.map(e=>e.id),['e1']);
 assert.equal(day.detail.mood,4);
 assert.equal(day.detail.waterLiters,.75);
 assert.equal(day.detail.readingMinutes,20);
 assert.deepEqual(day.detail.priorities,['Estudiar']);
 assert.equal(day.detail.tasks.length,1);
 assert.equal(day.agendaTasks.length,2,'Agenda incluye lo vencido además de hoy');
 assert.match(day.summary,/20 minutos de lectura/);
});

test('recordatorios derivan pendientes del mismo snapshot',()=>{
 const context=notificationDayContext(daySnapshot({date,records,settings:{}}));
 assert.equal(context.pendingEvents.length,1);
 assert.equal(context.pendingCount,1);
 assert.equal(context.suppressed,false);
});

test('descanso suprime hábitos pendientes en el contexto común',()=>{
 const day=daySnapshot({date,records,settings:{dayModeOverrides:{[date]:'descanso'}}});
 const context=notificationDayContext(day);
 assert.equal(day.mode,'descanso');
 assert.equal(context.suppressed,true);
});
