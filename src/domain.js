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
export function scheduled(h,date){return !h.archived && (!h.startDate || date>=h.startDate) && (h.days||[0,1,2,3,4,5,6]).includes(parseDay(date).getDay());}
export function occurs(e,date){if(e.exceptions?.[date]?.cancelled)return false;if(date<e.date || (e.until && date>e.until))return false;if(e.repeat==='daily')return true;if(e.repeat==='weekly')return parseDay(date).getDay()===parseDay(e.date).getDay();if(e.repeat==='monthly')return date.slice(8)===e.date.slice(8);if(e.repeat==='yearly')return date.slice(5)===e.date.slice(5);return e.date===date;}
export function dayStats(habits,logs,date){const hs=habits.filter(h=>scheduled(h,date));const done=hs.filter(h=>logs.some(l=>l.habitId===h.id&&l.date===date&&l.status==='done')).length;const skipped=hs.filter(h=>logs.some(l=>l.habitId===h.id&&l.date===date&&l.status==='skip')).length;return {total:hs.length,done,skipped,percent:hs.length?Math.round(done/hs.length*100):0};}
export function streak(h,logs,today){let n=0;for(let i=0;i<3660;i++){const key=addDays(today,-i);if(h.startDate&&key<h.startDate)break;if(!scheduled(h,key))continue;const l=logs.find(x=>x.habitId===h.id&&x.date===key);if(l?.status==='done')n++;else if(l?.status==='skip')continue;else if(i!==0)break;}return n;}
export function elapsed(timer,now=Date.now()){return Math.max(0,Math.floor(((timer.elapsed||0)+(timer.running?now-timer.startedAt:0))/1000));}
export function fmtDuration(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export function newRecord(kind,data,id=uid()){return {id,kind,data,rev:0,deleted:false};}
export function starterRecords(){const today=dayKey();return [newRecord('settings',{name:'',tone:'warm',theme:'light',large:false,quiet:false,dayMode:'habitual'},'settings'),...AREAS.map(a=>newRecord('area',a,a.id)),...[
 ['Despertar con calma','Sun','personal','mañana','check',1],['Ir al gym','Dumbbell','salud','mañana','check',1],['Disfrutar el desayuno','Coffee','personal','mañana','check',1],['Ducha y cuidado personal','ShowerHead','personal','mañana','check',1],['Un rato de lectura','BookOpen','lectura','tarde','time',20],['Tomar agua','Droplets','salud','tarde','quantity',8]
].map(([name,icon,area,period,type,target],i)=>newRecord('habit',{name,icon,area,period,type,target,unit:type==='time'?'minutos':type==='quantity'?'vasos':'veces',days:i===1?[1,2,3,4,5]:[0,1,2,3,4,5,6],startDate:today,essential:i===0||i===2,order:i,note:''}))];}
export function weekKeys(today){const dow=parseDay(today).getDay();const monday=addDays(today,-((dow+6)%7));return Array.from({length:7},(_,i)=>addDays(monday,i));}

export function eventOnDate(e,date){return {...e,...(e.exceptions?.[date]||{}),id:e.id};}
