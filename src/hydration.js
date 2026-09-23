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
