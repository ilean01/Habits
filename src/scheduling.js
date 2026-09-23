import {addDays,occurs,parseDay} from './domain.js';

const minutes=t=>{if(!t)return null;const [h,m]=String(t).split(':').map(Number);return h*60+m;};
export function eventInterval(event){
 const start=minutes(event.time);if(start===null)return null;
 let end=minutes(event.end);if(end===null||end<=start)end=start+1;
 return [start,end];
}
export function overlaps(a,b){
 const ia=eventInterval(a),ib=eventInterval(b);if(!ia||!ib)return false;
 return ia[0]<ib[1]&&ib[0]<ia[1];
}
export function eventConflictDates(candidate,events,{excludeId=null,horizonDays=120}={}){
 if(!candidate?.date||!candidate.time)return [];
 const start=candidate.date;
 const limit=candidate.repeat&&candidate.repeat!=='none'
  ? (candidate.until&&candidate.until<addDays(start,horizonDays)?candidate.until:addDays(start,horizonDays))
  : start;
 const out=[];
 for(let d=start;d<=limit;d=addDays(d,1)){
  if(!occurs(candidate,d))continue;
  for(const e of events){
   if(e.id===excludeId||!occurs(e,d)||!e.time)continue;
   const a={...candidate,...(candidate.exceptions?.[d]||{})},b={...e,...(e.exceptions?.[d]||{})};
   if(overlaps(a,b)){out.push({date:d,event:e});break;}
  }
  if(out.length>=8)break;
 }
 return out;
}
export function conflictMessage(conflicts,pretty=(d=>d)){
 if(!conflicts.length)return'';
 const first=conflicts[0],extra=conflicts.length-1;
 return `Coincide con “${first.event.name||'otro evento'}” el ${pretty(first.date)}${extra?` y en ${extra} fecha${extra===1?'':'s'} más`:''}.`;
}
