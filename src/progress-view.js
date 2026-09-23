import {addDays,dayKey,dayStats,flexibleWeekly,parseDay,streak,weekKeys,weeklyProgress} from './domain.js';
import {waterStats} from './hydration.js';
import {hydrationLogs} from './selectors.js';

export function progressView({records,catalog,prettyDate,esc,icon,btn,settings}){
 const today=dayKey(),week=weekKeys(today),allLogs=records('log'),doneLogs=allLogs.filter(l=>week.includes(l.date)&&l.status==='done');
 const minutes=records('reading').filter(r=>week.includes(r.date)).reduce((n,r)=>n+Number(r.minutes||0),0),c=catalog();
 const finishedBooks=c.allowed?(c.finishedCount||0):records('book').filter(b=>b.status==='finished').length;
 const water=waterStats(hydrationLogs(allLogs),today,7),restDates=Object.entries(settings()?.dayModes||{}).filter(([,mode])=>mode==='descanso').map(([d])=>d);
 const streakRows=records('habit').filter(h=>!h.archived).map(h=>{
  const value=streak(h,allLogs,today,{restDates}),unit=flexibleWeekly(h)?(value===1?'semana':'semanas'):(value===1?'día':'días');
  const weekly=flexibleWeekly(h)?weeklyProgress(h,allLogs,today):null;
  return `<div class="streak-row">${icon(h.icon)}<span>${esc(h.name)}${weekly?`<small>Esta semana: ${weekly.done}/${weekly.target}</small>`:''}</span><b>${value} ${unit}</b></div>`;
 }).join('');
 return `<div class="section-title"><div><h2>Mi progreso</h2><p>Tu semana, tus constancias y tus logros.</p></div>${btn('Ver resumen semanal','extra-week','','button outline')}</div>
 <div class="stat-grid progress-stat-grid">
  <article class="panel"><span>${icon('CheckCheck')} ESTA SEMANA</span><strong>${doneLogs.length}</strong><p>acciones de hábitos registradas</p></article>
  <article class="panel"><span>${icon('BookOpen')} TIEMPO PARA LEER</span><strong>${minutes}<small> min</small></strong><p>de lectura registrada esta semana</p></article>
  <article class="panel"><span>${icon('Target')} TUS LIBROS</span><strong>${finishedBooks}</strong><p>historias terminadas</p></article>
  <article class="panel water-progress-stat"><span>💧 PROMEDIO DE AGUA</span><strong>${water.average.toLocaleString('es-PY')}<small> L/día</small></strong><p>${water.total.toLocaleString('es-PY')} L en 7 días · ${water.daysWithWater}/7 días con registro</p></article>
 </div>
 <section class="panel"><div class="section-title"><h2>Tu semana, paso a paso</h2><p>Lo que efectivamente registraste cada día.</p></div><div class="week-chart">${week.map(d=>{const st=dayStats(records('habit'),allLogs,d);return `<div><b>${st.done}</b><div class="bar-track"><span style="height:${st.percent}%"></span></div><small>${prettyDate(d,{weekday:'short'})}</small></div>`;}).join('')}</div></section>
 <section class="panel water-progress-detail"><h2>Tu agua, día por día</h2><p class="muted">Promedio de los últimos 7 días, contando también los días sin registro.</p><div class="water-days">${water.keys.map((d,i)=>`<div class="water-day"><b>${water.liters[i].toLocaleString('es-PY')} L</b><small>${parseDay(d).toLocaleDateString('es-PY',{weekday:'short'})}</small></div>`).join('')}</div></section>
 <section class="panel"><h2>Pequeñas constancias</h2><p class="muted">Los hábitos diarios muestran rachas en días. Las metas flexibles muestran rachas en semanas.</p>${streakRows}</section>
 <section class="panel"><h2>Las últimas cuatro semanas</h2><div class="heatmap">${Array.from({length:28},(_,i)=>{const d=addDays(today,i-27),st=dayStats(records('habit'),allLogs,d);return `<button style="--level:${st.percent/100}" data-action="date" data-date="${d}" title="${d}: ${st.done} completados"><small>${parseDay(d).getDate()}</small></button>`;}).join('')}</div></section>`;
}
