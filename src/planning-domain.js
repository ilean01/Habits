import {addDays,dayKey,eventOnDate,occurs,parseDay,weekKeys} from './domain.js';

const ACTIVE_AREAS=new Set(['facultad','trabajo','ingles']);
const skillKeys=['listening','reading','speaking','writing'];

const activeTasks=(tasks,area)=>tasks
 .filter(t=>t?.area===area&&!t?.done)
 .sort((a,b)=>(a.due||'9999-12-31').localeCompare(b.due||'9999-12-31')||String(a.name||'').localeCompare(String(b.name||''),'es'));

export function nextAreaEvents(events,area,today=dayKey(),days=45,limit=6){
 const out=[];
 for(let i=0;i<days&&out.length<limit;i++){
  const date=addDays(today,i);
  const matches=events
   .filter(e=>e?.area===area&&occurs(e,date))
   .map(e=>eventOnDate(e,date))
   .sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')||String(a.name||'').localeCompare(String(b.name||''),'es'));
  for(const event of matches){out.push({date,event});if(out.length>=limit)break;}
 }
 return out;
}

export function planningSnapshot({projects=[],tasks=[],journals=[],events=[],words=[],settings={},today=dayKey()}={}){
 const week=weekKeys(today);
 const practices=journals.filter(j=>j?.englishPractice===true);
 const weekPractices=practices.filter(p=>week.includes(p.date));
 const skillMinutes=Object.fromEntries(skillKeys.map(skill=>[
  skill,
  weekPractices.filter(p=>p.skill===skill).reduce((sum,p)=>sum+(Number(p.minutes)||0),0)
 ]));
 const englishMinutes=Object.values(skillMinutes).reduce((sum,n)=>sum+n,0);
 const englishGoal=Math.max(1,Number(settings.englishWeeklyGoal)||120);
 const weeklyBlocks=events
  .filter(e=>ACTIVE_AREAS.has(e?.area)&&e?.repeat==='weekly')
  .sort((a,b)=>{
   const dayA=(parseDay(a.date).getDay()+6)%7,dayB=(parseDay(b.date).getDay()+6)%7;
   return dayA-dayB||(a.time||'99:99').localeCompare(b.time||'99:99')||String(a.name||'').localeCompare(String(b.name||''),'es');
  });
 return {
  today,
  week,
  faculty:{
   subjects:projects.filter(p=>p?.category==='subject'),
   tasks:activeTasks(tasks,'facultad'),
   events:nextAreaEvents(events,'facultad',today)
  },
  work:{
   tasks:activeTasks(tasks,'trabajo'),
   events:nextAreaEvents(events,'trabajo',today)
  },
  english:{
   words,
   practices,
   weekPractices,
   skillMinutes,
   minutes:englishMinutes,
   goal:englishGoal,
   percent:Math.min(100,Math.round(englishMinutes/englishGoal*100)),
   events:nextAreaEvents(events,'ingles',today)
  },
  weekly:{blocks:weeklyBlocks}
 };
}
