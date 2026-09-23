import {flexibleWeekly,logForDay,shouldOfferHabit,weeklyProgress} from './domain.js';

export function habitsForDayMode(habits,logs,date,mode='habitual'){
 const visible=habits.filter(h=>shouldOfferHabit(h,logs,date));
 const keepLogged=h=>!!logForDay(h,logs,date);
 const filtered=visible.filter(h=>{
  if(mode==='tranquilo'||mode==='descanso')return h.essential||keepLogged(h);
  if(mode==='finDeSemana')return h.area!=='trabajo'||keepLogged(h);
  return true;
 });
 const priority=mode==='trabajo'?'trabajo':mode==='facultad'?'facultad':null;
 return filtered.sort((a,b)=>{
  if(priority){const d=Number(b.area===priority)-Number(a.area===priority);if(d)return d;}
  return (a.order||0)-(b.order||0);
 });
}

export function freeTimeSuggestions(habits,logs,date,minutes,mode='habitual'){
 return habitsForDayMode(habits,logs,date,mode).filter(h=>{
  const l=logForDay(h,logs,date);if(l&&['done','skip'].includes(l.status))return false;
  if(flexibleWeekly(h)&&weeklyProgress(h,logs,date).complete)return false;
  return h.type!=='time'||Number(h.target)<=minutes;
 });
}

export function dayModeNotice(mode){
 return ({
  trabajo:'Durante tu horario laboral, lo de Trabajo aparece primero. Lo personal sigue disponible.',
  facultad:'Hoy priorizamos Facultad: clases, estudio y entregas aparecen primero.',
  finDeSemana:'Ocultamos la rutina laboral para dejar más espacio al fin de semana.',
  tranquilo:'Hoy mostramos solo lo esencial y lo que ya registraste.',
  descanso:'Día de descanso: solo lo esencial queda visible. Podés usar “Hoy no” para registrar una pausa.',
  habitual:''
 })[mode]||'';
}
