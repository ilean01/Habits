import {habitStatus,effectiveHabitsForDate} from './domain.js';
// Only explicitly recorded activities contribute to the daily message.
export function daySummary({ habits=[], logs=[], events=[], eventLogs=[], readings=[], journals=[], finishedBooks=[] }, date, mode='habitual') {
 const parts = effectiveHabitsForDate(habits,date,mode).filter(h=>habitStatus(h,logs,date).done).map(h=>h.name);
 for(const l of eventLogs.filter(l=>l.date===date)) parts.push(events.find(e=>e.id===l.eventId)?.name||'Un evento completado');
 const minutes=readings.filter(r=>r.date===date).reduce((sum,r)=>sum+(Number(r.minutes)||0),0);
 if(minutes)parts.push(`${minutes} ${minutes===1?'minuto':'minutos'} de lectura`);
 for(const title of finishedBooks) parts.push(`terminar «${title}»`);
 parts.push(...journals.filter(j=>j.date===date&&j.achievement&&j.text?.trim()).map(j=>j.text.trim()));
 if(mode==='descanso'&&!parts.length)return 'Hoy es un día de descanso. No tenés hábitos obligatorios y tus rachas quedan protegidas automáticamente.';
 return parts.length ? `Hoy hiciste espacio para: ${parts.join('; ')}. ¡Cada paso cuenta!` : 'Cada pequeño paso cuenta. Elegí por dónde querés empezar hoy.';
}
export function dayWelcome(hour=new Date().getHours()) {
 if(hour<5)return {greeting:'Buenas noches',icon:'Moon',subtitle:'Ya es tarde. Descansá, mañana seguimos a tu ritmo.',hero:'Tu día puede terminar acá. Descansar también cuenta.',note:'Si algo quedó pendiente, mañana habrá otro momento.'};
 if(hour<12)return {greeting:'Buen día',icon:'Sun',subtitle:'Un nuevo día para dedicarte un poco de tiempo.',hero:'Un nuevo día. Un poquito más para vos.',note:'Sin apuro. Lo importante es empezar.'};
 if(hour<19)return {greeting:'Buenas tardes',icon:'Sun',subtitle:'Todavía hay espacio para algo que te haga bien.',hero:'Todavía queda día para algo que te haga bien.',note:'Elegí una cosa posible y hacela a tu ritmo.'};
 return {greeting:'Buenas noches',icon:'Moon',subtitle:'Un momento para descansar y reconocer lo que hiciste hoy.',hero:'Mirá todo lo que ya hiciste hoy.',note:'Lo que hiciste alcanza. Lo demás puede esperar.'};
}
