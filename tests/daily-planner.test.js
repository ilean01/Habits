import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeDailyPlan,plannerRecordId,plannerTasks,plannerEvents,eventsByHour,nextHour} from '../src/daily-planner-domain.js';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('agenda diaria conserva tres prioridades y limita texto libre',()=>{
 const plan=normalizeDailyPlan({priorities:['Uno','Dos','Tres','Cuatro'],gratitude:'Gracias',notes:'Nota'},'2026-09-24');
 assert.deepEqual(plan.priorities,['Uno','Dos','Tres']);
 assert.equal(plan.date,'2026-09-24');
 assert.equal(plannerRecordId(plan.date),'daily-plan:2026-09-24');
});

test('checklist del planner usa tareas reales de hoy y vencidas',()=>{
 const rows=plannerTasks([
  {id:'a',name:'Hoy',due:'2026-09-24',done:false,priority:'media'},
  {id:'b',name:'Vencida',due:'2026-09-23',done:false,priority:'alta'},
  {id:'c',name:'Mañana',due:'2026-09-25',done:false,priority:'alta'},
  {id:'d',name:'Hecha hoy',due:'2026-09-24',done:true,priority:'baja'},
  {id:'e',name:'Para después',due:'',done:false,priority:'media'}
 ],'2026-09-24');
 assert.deepEqual(rows.map(x=>x.id),['b','a','d']);
});

test('agenda horaria reutiliza eventos recurrentes del calendario',()=>{
 const events=plannerEvents([
  {id:'weekly',name:'Clase',date:'2026-09-17',repeat:'weekly',time:'18:00',end:'19:00'},
  {id:'other',name:'Otro día',date:'2026-09-25',repeat:'none',time:'09:00'}
 ],'2026-09-24');
 assert.equal(events.length,1);
 assert.equal(events[0].name,'Clase');
 const grouped=eventsByHour(events);
 assert.equal(grouped.grouped.get('18')[0].id,'weekly');
 assert.equal(nextHour('18:00'),'19:00');
});

test('vista planner está conectada a Habits, respaldo, impresión y migración',async()=>{
 const [ui,css,index,main,extras,migration]=await Promise.all([
  read('src/daily-planner.js'),read('src/daily-planner.css'),read('index.html'),read('src/main.js'),read('src/extras.js'),read('supabase/migrations/20260924221500_daily_planner.sql')
 ]);
 assert.doesNotMatch(index,/src\/daily-planner\.js/);
 assert.match(main,/import \{dailyPlannerLayout\} from '\.\/daily-planner\.js'/);
 assert.match(main,/function todayView\(\)\{const today=dayKey\(\);return dailyPlannerLayout\(todayDashboardView\(\),today,nutritionSummaryView/);
 assert.match(ui,/dailyPlannerLayout\(dashboardHtml,date=dayKey\(\),summaryHtml=''/);
 assert.doesNotMatch(ui,/MutationObserver/);
 assert.match(ui,/data-action=\"event-options\"/);
 assert.match(ui,/data-action=\"task-done\"/);
 assert.match(ui,/habit-action/);
 assert.match(ui,/todayLayout/);
 assert.match(ui,/window\.print\(\)/);
 assert.match(css,/@media print/);
 assert.match(css,/@page\{size:A4 portrait/);
 assert.match(extras,/'dailyPlan'/);
 assert.match(migration,/'dailyPlan'/);
});
