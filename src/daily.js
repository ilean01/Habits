// Only explicitly recorded activities contribute to the daily message.
export function daySummary({ habits=[], logs=[], events=[], eventLogs=[], readings=[], journals=[] }, date) {
 const parts = habits.filter(h=>logs.some(l=>l.habitId===h.id&&l.date===date&&l.status==='done')).map(h=>h.name);
 for(const l of eventLogs.filter(l=>l.date===date)) parts.push(events.find(e=>e.id===l.eventId)?.name||'Un evento completado');
 const minutes=readings.filter(r=>r.date===date).reduce((sum,r)=>sum+(Number(r.minutes)||0),0);
 if(minutes)parts.push(`${minutes} minutos de lectura`);
 parts.push(...journals.filter(j=>j.date===date&&j.achievement&&j.text?.trim()).map(j=>j.text.trim()));
 return parts.length ? `Hoy hiciste espacio para: ${parts.join('; ')}. ¡Cada paso cuenta!` : 'Cada pequeño paso cuenta. Elegí por dónde querés empezar hoy.';
}
export function dayWelcome(hour=new Date().getHours()) {
 if(hour<6||hour>=20)return {icon:'Moon',subtitle:'Un momento para descansar y reconocer lo que hiciste hoy.'};
 if(hour<12)return {icon:'Sun',subtitle:'Un nuevo día para dedicarte un poco de tiempo.'};
 return {icon:'Sun',subtitle:'Todavía hay espacio para algo que te haga bien.'};
}
