import {addDays,occurs,eventOnDate} from './domain.js';

const hasTime=e=>!!e?.time;
const endOf=e=>e.end||e.time||'';
const overlaps=(a,b)=>hasTime(a)&&hasTime(b)&&a.time<endOf(b)&&b.time<endOf(a);

export function findEventConflicts(candidate,events,{ignoreId='',days=120}={}){
 const out=[];
 const start=candidate.date;
 if(!start||!candidate.time)return out;
 for(let i=0;i<days;i++){
  const date=addDays(start,i);
  if(candidate.until&&date>candidate.until)break;
  if(!occurs(candidate,date))continue;
  const current=eventOnDate(candidate,date);
  for(const event of events){
   if(event.id===ignoreId||!occurs(event,date))continue;
   const other=eventOnDate(event,date);
   if(overlaps(current,other))out.push({date,event:other});
  }
  if(out.length>=8)break;
 }
 return out;
}

export function conflictMessage(conflicts){
 if(!conflicts.length)return '';
 const first=conflicts[0],more=conflicts.length-1;
 const time=first.event.time?` ${first.event.time}${first.event.end?`–${first.event.end}`:''}`:'';
 return `Coincide con «${first.event.name}»${time} el ${first.date}${more?` y con ${more} ocurrencia${more===1?'':'s'} más`:''}.`;
}
