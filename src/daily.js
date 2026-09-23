// Solo actividades registradas explícitamente contribuyen al resumen diario.
export function daySummary({ habits=[], logs=[], events=[], eventLogs=[], readings=[], journals=[], finishedBooks=[] }, date) {
 const parts = habits.filter(h=>logs.some(l=>l.habitId===h.id&&l.date===date&&l.status==='done')).map(h=>h.name);
 for(const l of eventLogs.filter(l=>l.date===date)) parts.push(events.find(e=>e.id===l.eventId)?.name||'Un evento completado');
 const minutes=readings.filter(r=>r.date===date).reduce((sum,r)=>sum+(Number(r.minutes)||0),0);
 if(minutes)parts.push(`${minutes} ${minutes===1?'minuto':'minutos'} de lectura`);
 for(const title of finishedBooks) parts.push(`terminar «${title}»`);
 parts.push(...journals.filter(j=>j.date===date&&j.achievement&&j.text?.trim()).map(j=>j.text.trim()));
 return parts.length ? `Hoy hiciste espacio para: ${parts.join('; ')}. ¡Cada paso cuenta!` : 'Cada pequeño paso cuenta. Elegí por dónde querés empezar hoy.';
}
export function dayWelcome(hour=new Date().getHours(),hasDone=false) {
 if(hour<5)return {greeting:'Buenas noches',icon:'Moon',subtitle:'Ya es tarde. Descansá; mañana seguimos a tu ritmo.',hero:hasDone?'Mirá todo lo que hiciste antes de descansar.':'Ya es hora de bajar el ritmo.',note:hasDone?'Tu día también cuenta aunque termine tarde.':'Descansar también forma parte de cuidarte.'};
 if(hour<12)return {greeting:'Buen día',icon:'Sun',subtitle:'Un nuevo día para dedicarte un poco de tiempo.',hero:hasDone?'Ya empezaste. Mirá todo lo que hiciste.':'Un nuevo día. Un poquito más para vos.',note:hasDone?'¡Bien por vos! Cada paso suma.':'Sin apuro. Lo importante es empezar.'};
 if(hour<19)return {greeting:'Buenas tardes',icon:'Sun',subtitle:'Todavía hay espacio para algo que te haga bien.',hero:hasDone?'Tu día ya tiene varios pasos hechos.':'Todavía queda espacio para algo que te haga bien.',note:hasDone?'Seguí a tu ritmo.':'Elegí solo lo que tenga sentido para esta tarde.'};
 return {greeting:'Buenas noches',icon:'Moon',subtitle:'Un momento para descansar y reconocer lo que hiciste hoy.',hero:hasDone?'Mirá todo lo que hiciste hoy.':'Podés cerrar el día sin exigirte más.',note:hasDone?'Bien por lo que sí hiciste.':'Descansar también cuenta.'};
}
