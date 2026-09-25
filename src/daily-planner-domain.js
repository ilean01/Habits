import {eventOnDate,occurs} from './domain.js';

export const DAILY_PLAN_KIND='dailyPlan';
export const plannerRecordId=date=>`daily-plan:${date}`;

export function normalizeDailyPlan(value={},date=''){
 const priorities=Array.isArray(value.priorities)?value.priorities.slice(0,3):[];
 while(priorities.length<3)priorities.push('');
 return {
  date:value.date||date,
  priorities:priorities.map(x=>String(x||'').slice(0,180)),
  gratitude:String(value.gratitude||'').slice(0,4000),
  notes:String(value.notes||'').slice(0,10000)
 };
}

export function planForDate(records=[],date){
 const found=records.find(r=>r.id===plannerRecordId(date)||r.date===date);
 return normalizeDailyPlan(found||{},date);
}

export function plannerTasks(tasks=[],date){
 return tasks
  .filter(t=>t?.due===date||(!t?.done&&t?.due&&t.due<date))
  .sort((a,b)=>Number(a.done)-Number(b.done)||(a.due||'9999').localeCompare(b.due||'9999')||({alta:0,media:1,baja:2}[a.priority]??1)-({alta:0,media:1,baja:2}[b.priority]??1));
}

export function plannerEvents(events=[],date){
 return events
  .filter(e=>occurs(e,date))
  .map(e=>eventOnDate(e,date))
  .sort((a,b)=>(a.time||'').localeCompare(b.time||'')||(a.name||'').localeCompare(b.name||''));
}

export function eventsByHour(events=[]){
 const grouped=new Map();
 const allDay=[];
 for(const event of events){
  if(!event.time){allDay.push(event);continue;}
  const hour=String(event.time).slice(0,2);
  if(!grouped.has(hour))grouped.set(hour,[]);
  grouped.get(hour).push(event);
 }
 return {grouped,allDay};
}

export function nextHour(time='08:00'){
 const [h,m]=String(time).split(':').map(Number);
 if(!Number.isFinite(h)||!Number.isFinite(m))return '';
 const total=Math.min(23*60+59,h*60+m+60);
 return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
