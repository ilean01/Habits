import {dayKey,addDays} from './domain.js';

const pad=n=>String(n).padStart(2,'0');
const iso=(year,month,day)=>`${year}-${pad(month)}-${pad(day)}`;

function easterSunday(year){
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
 return iso(year,month,day);
}

const MOVABLE=new Set(['03-01','06-12','06-20','09-29']);
const OVERRIDES={
 2026:{
  '03-01':{date:'2026-03-02',decree:'Decreto 5508/2026'},
  '06-20':{date:'2026-06-22',decree:'Decreto 6215/2026'},
  '09-29':{date:'2026-09-28',decree:'Decreto 6601/2026'}
 }
};
const EXTRAS={
 2026:[{date:'2026-06-30',name:'Feriado nacional por la clasificación de la Albirroja',decree:'Decreto 6280/2026'}]
};

export function paraguayHolidays(year){
 const easter=easterSunday(year),holyThursday=addDays(easter,-3),holyFriday=addDays(easter,-2);
 const base=[
  ['01-01','Año Nuevo'],['03-01','Día de los Héroes de la Patria'],
  [holyThursday.slice(5),'Jueves Santo'],[holyFriday.slice(5),'Viernes Santo'],
  ['05-01','Día de los Trabajadores'],['05-14','Día de la Independencia Nacional'],['05-15','Día de la Independencia Nacional'],
  ['06-12','Día de la Paz del Chaco'],['06-20','Día de la Jura de la Constitución Nacional'],
  ['08-15','Día de la Fundación de Asunción'],['09-29','Día de la Batalla de Boquerón'],
  ['12-08','Día de la Virgen de Caacupé'],['12-25','Navidad']
 ];
 const overrides=OVERRIDES[year]||{};
 const out=base.map(([md,name])=>{
  const legal=`${year}-${md}`,override=overrides[md];
  return {date:override?.date||legal,legalDate:legal,name,movable:MOVABLE.has(md),confirmed:!MOVABLE.has(md)||!!override||year<2026,decree:override?.decree||null};
 });
 return [...out,...(EXTRAS[year]||[]).map(h=>({...h,legalDate:h.date,movable:false,confirmed:true,extra:true}))].sort((a,b)=>a.date.localeCompare(b.date));
}

export function holidayOn(date){const year=Number(String(date).slice(0,4));return paraguayHolidays(year).find(h=>h.date===date)||null;}
export function holidaysBetween(start,end){const years=new Set([Number(start.slice(0,4)),Number(end.slice(0,4))]);return [...years].flatMap(paraguayHolidays).filter(h=>h.date>=start&&h.date<=end).sort((a,b)=>a.date.localeCompare(b.date));}
export function holidayStatusText(h){if(!h)return'';if(h.decree)return `${h.name} · ${h.decree}`;if(h.movable&&!h.confirmed)return `${h.name} · fecha legal; traslado anual pendiente de decreto`;return h.name;}
