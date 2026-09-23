import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyProgress,dayStats,streak,scheduled,shouldOfferHabit} from '../src/domain.js';

const habit={id:'gym',name:'Gym',frequencyMode:'weekly',weeklyTarget:3,days:[0,1,2,3,4,5,6],startDate:'2026-09-01'};
const done=date=>({habitId:'gym',date,status:'done'});

test('meta semanal flexible cuenta cualquier tres días habilitados',()=>{
 const logs=[done('2026-09-21'),done('2026-09-23'),done('2026-09-26')];
 const p=weeklyProgress(habit,logs,'2026-09-23');
 assert.equal(p.done,3);assert.equal(p.target,3);assert.equal(p.complete,true);
 assert.equal(scheduled(habit,'2026-09-24'),true);
});

test('un hábito semanal flexible no penaliza un día donde no se registró',()=>{
 const daily={id:'agua',days:[0,1,2,3,4,5,6],startDate:'2026-09-01'};
 const stats=dayStats([habit,daily],[{habitId:'agua',date:'2026-09-23',status:'done'}],'2026-09-23');
 assert.deepEqual(stats,{total:1,done:1,skipped:0,percent:100});
});

test('si el hábito flexible se hizo hoy, sí forma parte del progreso de hoy',()=>{
 const daily={id:'agua',days:[0,1,2,3,4,5,6],startDate:'2026-09-01'};
 const logs=[{habitId:'agua',date:'2026-09-23',status:'done'},done('2026-09-23')];
 assert.deepEqual(dayStats([habit,daily],logs,'2026-09-23'),{total:2,done:2,skipped:0,percent:100});
});

test('una meta semanal ya completa deja de ofrecerse salvo que tenga registro hoy',()=>{
 const logs=[done('2026-09-21'),done('2026-09-22'),done('2026-09-23')];
 assert.equal(shouldOfferHabit(habit,logs,'2026-09-24'),false);
 assert.equal(shouldOfferHabit(habit,logs,'2026-09-23'),true);
});

test('racha semanal cuenta semanas completas consecutivas',()=>{
 const logs=[done('2026-09-21'),done('2026-09-23'),done('2026-09-26'),done('2026-09-14'),done('2026-09-16'),done('2026-09-18')];
 assert.equal(streak(habit,logs,'2026-09-26'),2);
});
