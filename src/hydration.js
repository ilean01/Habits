import {dayKey,addDays} from './domain.js';

export const waterTotal=(records,date)=>Math.round(records.filter(r=>r.hydration&&r.date===date).reduce((n,r)=>n+(Number(r.milliliters)||0),0))/1000;

export function waterStats(records,endDate=dayKey(),days=7){
 const safeDays=Math.max(1,Math.min(365,Number(days)||7));
 const keys=Array.from({length:safeDays},(_,i)=>addDays(endDate,i-(safeDays-1)));
 const liters=keys.map(date=>waterTotal(records,date));
 const total=Math.round(liters.reduce((n,v)=>n+v,0)*100)/100;
 const average=Math.round((total/safeDays)*100)/100;
 const daysWithWater=liters.filter(v=>v>0).length;
 return {keys,liters,total,average,daysWithWater,days:safeDays};
}

export function hydrationHabit(habits){
 return habits.find(h=>h.hydration===true)||habits.find(h=>h.name==='Tomar agua'&&h.icon==='Droplets'&&h.area==='salud')||null;
}
export function normalizeHydrationHabit(h){
 if(!h)return null;
 if(h.hydration===true)return h;
 const legacy=h.name==='Tomar agua'&&h.icon==='Droplets'&&h.area==='salud'&&h.type==='quantity'&&Number(h.target)===8&&String(h.unit||'').toLowerCase()==='vasos';
 return legacy?{...h,target:2,unit:'litros',hydration:true}:h;
}
export function hydrationHabitValue(h,waterLiters){
 const target=Math.max(.1,Number(h?.target)||2),value=Math.round(Number(waterLiters||0)*100)/100;
 return {value,target,status:value>=target?'done':value>0?'partial':null};
}
