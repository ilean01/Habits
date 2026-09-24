import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextAreaEvents,planningSnapshot} from '../src/planning-domain.js';

test('planningSnapshot keeps Facultad, Trabajo and Inglés separated',()=>{
 const snapshot=planningSnapshot({
  today:'2026-09-23',
  projects:[
   {id:'s1',name:'Autómatas',category:'subject',area:'facultad'},
   {id:'p1',name:'Proyecto personal',category:'personal',area:'personal'}
  ],
  tasks:[
   {id:'f1',name:'Parcial',area:'facultad',due:'2026-09-25',done:false},
   {id:'f2',name:'Ya entregado',area:'facultad',due:'2026-09-22',done:true},
   {id:'w1',name:'Preparar informe',area:'trabajo',due:'',done:false},
   {id:'p2',name:'Comprar algo',area:'personal',due:'2026-09-24',done:false}
  ],
  journals:[
   {englishPractice:true,skill:'listening',date:'2026-09-22',minutes:30},
   {englishPractice:true,skill:'speaking',date:'2026-09-23',minutes:45},
   {englishPractice:true,skill:'reading',date:'2026-09-20',minutes:90}
  ],
  events:[
   {id:'ef',name:'Clase',area:'facultad',date:'2026-09-21',time:'18:00',repeat:'weekly'},
   {id:'ew',name:'Reunión',area:'trabajo',date:'2026-09-24',time:'09:00',repeat:'none'},
   {id:'ei',name:'English class',area:'ingles',date:'2026-09-23',time:'19:00',repeat:'weekly'},
   {id:'ep',name:'Personal',area:'personal',date:'2026-09-24',time:'08:00',repeat:'none'}
  ],
  words:[{id:'a',name:'fare'},{id:'b',name:'round-trip'}],
  settings:{englishWeeklyGoal:180}
 });

 assert.deepEqual(snapshot.faculty.subjects.map(x=>x.id),['s1']);
 assert.deepEqual(snapshot.faculty.tasks.map(x=>x.id),['f1']);
 assert.deepEqual(snapshot.work.tasks.map(x=>x.id),['w1']);
 assert.equal(snapshot.work.events[0].event.id,'ew');
 assert.equal(snapshot.english.minutes,75);
 assert.equal(snapshot.english.goal,180);
 assert.equal(snapshot.english.percent,42);
 assert.deepEqual(snapshot.english.skillMinutes,{listening:30,reading:0,speaking:45,writing:0});
 assert.equal(snapshot.english.words.length,2);
 assert.deepEqual(snapshot.weekly.blocks.map(x=>x.id),['ef','ei']);
});

test('nextAreaEvents expands recurring events and orders same-day times',()=>{
 const events=[
  {id:'late',name:'Tarde',area:'trabajo',date:'2026-09-23',time:'16:00',repeat:'weekly'},
  {id:'early',name:'Temprano',area:'trabajo',date:'2026-09-23',time:'08:00',repeat:'weekly'},
  {id:'other',name:'Facu',area:'facultad',date:'2026-09-23',time:'07:00',repeat:'weekly'}
 ];
 const rows=nextAreaEvents(events,'trabajo','2026-09-23',8,4);
 assert.deepEqual(rows.map(x=>[x.date,x.event.id]),[
  ['2026-09-23','early'],['2026-09-23','late'],
  ['2026-09-30','early'],['2026-09-30','late']
 ]);
});
