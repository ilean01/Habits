import {occurs} from './domain.js';

export function activeWorkBlock(events,date,time){
 return events.map(e=>occurs(e,date)?{...e,...(e.exceptions?.[date]||{})}:null).filter(Boolean).find(e=>e.area==='trabajo'&&e.time&&e.end&&e.time<=time&&time<e.end)||null;
}

export function prioritizeForWork(items,workActive){
 if(!workActive)return [...items];
 return [...items].sort((a,b)=>Number(b.area==='trabajo')-Number(a.area==='trabajo')||(a.order||0)-(b.order||0));
}

export function shouldSilencePersonal(settings,events,date,time){return !!settings?.quietWork&&!!activeWorkBlock(events,date,time);}
