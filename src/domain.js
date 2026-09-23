import {isHydrationHabit,hydrationTargetMl} from './selectors.js';
export const AREAS = [
 {id:'personal',name:'Personal',icon:'Sun',color:'#bf9360'},
 {id:'salud',name:'Gym y bienestar',icon:'Dumbbell',color:'#738d70'},
 {id:'lectura',name:'Biblioteca',icon:'BookOpen',color:'#a98b70'},
 {id:'trabajo',name:'Trabajo',icon:'BriefcaseBusiness',color:'#7791a3'},
 {id:'facultad',name:'Facultad',icon:'GraduationCap',color:'#a08aa9'},
 {id:'ingles',name:'Inglés',icon:'Languages',color:'#c28f8c'},
 {id:'hogar',name:'Hogar',icon:'House',color:'#b7a368'}
];
export const ICONS=['Sun','Dumbbell','Coffee','ShowerHead','BookOpen','LibraryBig','Droplets','Footprints','Heart','Moon','Flower2','BriefcaseBusiness','GraduationCap','Languages','House','Music','NotebookPen','Leaf'];
export const PALETTE=['#738d70','#a98b70','#7791a3','#a08aa9','#c28f8c','#b7a368'];
export const uid=()=>crypto.randomUUID();
export function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function parseDay(s){return new Date(`${s}T12:00:00`);}
export function addDays(key,n){const d=parseDay(key);d.setDate(d.getDate()+n);return dayKey(d);}
export function weekKeys(today){const dow=parseDay(today).getDay();const monday=addDays(today,-((dow+6)%7));return Array.from({length:7},(_,i)=>addDays(monday,i));}
export function flexibleWeekly(h){return h?.frequencyMode==='weekly'&&Number(h.weeklyTarget)>0;}
export function scheduled(h,date){
 if(h.archived||(h.startDate&&date<h.startDate))return false;
 const days=h.days||[0,1,2,3,4,5,6];
 return days.includes(parseDay(date).getDay());
}
export function weeklyProgress(h,logs,date=dayKey()){
 const keys=weekKeys(date),target=Math.max(1,Number(h.weeklyTarget)||1),week=new Set(keys);
 const own=logs.filter(l=>l.habitId===h.id&&week.has(l.date));
 const done=own.filter(l=>l.status==='done').length;
 const skipped=own.filter(l=>l.status==='skip').length;
 return {done,target,skipped,complete:done>=target,keys};
}
export function hydrationLiters(logs,date){return Math.round(logs.filter(l=>l.hydration&&l.date===date).reduce((n,l)=>n+(Number(l.milliliters)||0),0))/1000;}
export function habitStatus(h,logs,date=dayKey()){
 if(isHydrationHabit(h)){
  const ml=logs.filter(l=>l.hydration&&l.date===date).reduce((n,l)=>n+(Number(l.milliliters)||0),0),target=hydrationTargetMl(h);
  return {done:ml>=target,skip:false,partial:ml>0&&ml<target,value:ml,target,unit:'ml',hydration:true,log:null,weekly:null};
 }
 const own=logs.filter(l=>l.habitId===h.id&&l.date===date),log=own.at(-1)||null,weekly=flexibleWeekly(h)?weeklyProgress(h,logs,date):null;
 return {done:log?.status==='done',skip:log?.status==='skip',partial:log?.status==='partial',value:Number(log?.value)||0,target:Number(h.target)||1,unit:h.unit,hydration:false,log,weekly};
}
export function occurs(e,date){if(e.exceptions?.[date]?.cancelled)return false;if(date<e.date || (e.until && date>e.until))return false;if(e.repeat==='daily')return true;if(e.repeat==='weekly')return parseDay(date).getDay()===parseDay(e.date).getDay();if(e.repeat==='monthly')return date.slice(8)===e.date.slice(8);if(e.repeat==='yearly')return date.slice(5)===e.date.slice(5);return e.date===date;}
export function dayStats(habits,logs,date){
 const scheduledToday=habits.filter(h=>scheduled(h,date));
 let total=0,done=0,skipped=0;
 for(const h of scheduledToday){
  const s=habitStatus(h,logs,date);
  if(flexibleWeekly(h)){
   if(s.done){total++;done++;}
   else if(s.skip)skipped++;
   continue;
  }
  total++;
  if(s.done)done++;else if(s.skip)skipped++;
 }
 return {total,done,skipped,percent:total?Math.round(done/total*100):0};
}
export function streak(h,logs,today){
 if(flexibleWeekly(h)){
  let count=0;let anchor=today;
  const current=weeklyProgress(h,logs,anchor);
  if(!current.complete)anchor=addDays(anchor,-7);
  for(let i=0;i<520;i++){
   const p=weeklyProgress(h,logs,anchor),weekStart=p.keys[0];
   if(h.startDate&&p.keys[6]<h.startDate)break;
   if(p.complete)count++;else break;
   anchor=addDays(weekStart,-1);
  }
  return count;
 }
 let n=0;
 for(let i=0;i<3660;i++){
  const key=addDays(today,-i);if(h.startDate&&key<h.startDate)break;if(!scheduled(h,key))continue;
  const s=habitStatus(h,logs,key);if(s.done)n++;else if(s.skip)continue;else if(i!==0)break;
 }
 return n;
}
export function elapsed(timer,now=Date.now()){return Math.max(0,Math.floor(((timer.elapsed||0)+(timer.running?now-timer.startedAt:0))/1000));}
export function fmtDuration(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export function newRecord(kind,data,id=uid()){return {id,kind,data,rev:0,deleted:false};}
export function starterRecords(){const today=dayKey();return [newRecord('settings',{name:'',tone:'warm',theme:'light',large:false,quiet:false,dayMode:'habitual'},'settings'),...AREAS.map(a=>newRecord('area',a,a.id)),...[
 ['Despertar con calma','Sun','personal','mañana','check',1,'veces',false],['Ir al gym','Dumbbell','salud','mañana','check',1,'veces',false],['Disfrutar el desayuno','Coffee','personal','mañana','check',1,'veces',false],['Ducha y cuidado personal','ShowerHead','personal','mañana','check',1,'veces',false],['Un rato de lectura','BookOpen','lectura','tarde','time',20,'minutos',false],['Tomar agua','Droplets','salud','tarde','quantity',2000,'ml',true]
].map(([name,icon,area,period,type,target,unit,hydration],i)=>newRecord('habit',{name,icon,area,period,type,target,unit,hydration,targetMl:hydration?2000:null,days:i===1?[1,2,3,4,5]:[0,1,2,3,4,5,6],startDate:today,essential:i===0||i===2,order:i,note:'',frequencyMode:'days',weeklyTarget:null}))];}
export function eventOnDate(e,date){return {...e,...(e.exceptions?.[date]||{}),id:e.id};}
