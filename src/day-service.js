import {effectiveHabitsForDate,habitStatus,occurs,eventOnDate,dayStats} from './domain.js';
import {effectiveDayMode} from './day-modes.js';
import {dayDetailData} from './day-detail-data.js';
import {plannerTasks} from './daily-planner-domain.js';
import {daySummary} from './daily.js';

const rows=(records,kind)=>typeof records==='function'?(records(kind)||[]):(records?.[kind]||[]);

export function daySnapshot({date,records,settings={},finishedBooks=[]}={}){
 if(!date)throw new Error('daySnapshot necesita una fecha.');
 const habits=rows(records,'habit').slice().sort((a,b)=>(a.order||0)-(b.order||0));
 const logs=rows(records,'log');
 const events=rows(records,'event').filter(event=>occurs(event,date)).map(event=>eventOnDate(event,date)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 const eventLogs=rows(records,'eventLog').filter(row=>row.date===date);
 const mode=effectiveDayMode(settings,date);
 const effectiveHabits=effectiveHabitsForDate(habits,date,mode);
 const habitRows=effectiveHabits.map(habit=>({habit,status:habitStatus(habit,logs,date)}));
 const stats=dayStats(habits,logs,date,mode);
 const detail=dayDetailData({
  date,
  journals:rows(records,'journal'),
  photos:rows(records,'photo'),
  dailyPlans:rows(records,'dailyPlan'),
  tasks:rows(records,'task'),
  readings:rows(records,'reading'),
  logs,
  meals:rows(records,'meal')
 });
 const agendaTasks=plannerTasks(rows(records,'task'),date);
 const summary=daySummary({
  habits,
  logs,
  events:rows(records,'event'),
  eventLogs:rows(records,'eventLog'),
  readings:rows(records,'reading'),
  journals:rows(records,'journal'),
  finishedBooks
 },date,mode);
 return {date,mode,habits,effectiveHabits,habitRows,events,eventLogs,stats,detail,agendaTasks,summary};
}

export function notificationDayContext(snapshot){
 const pendingHabits=(snapshot?.habitRows||[]).filter(({status})=>!status.done&&!status.skip);
 const completedEventIds=new Set((snapshot?.eventLogs||[]).map(row=>row.eventId));
 const pendingEvents=(snapshot?.events||[]).filter(event=>!completedEventIds.has(event.id));
 return {
  date:snapshot?.date||'',
  mode:snapshot?.mode||'habitual',
  pendingHabits,
  pendingEvents,
  suppressed:snapshot?.mode==='descanso',
  pendingCount:(snapshot?.mode==='descanso'?0:pendingHabits.length)+pendingEvents.length
 };
}
