import {nutritionRangeStats} from './nutrition-domain.js';

const metric=(value,label,detail='')=>`<article class="nutrition-progress-metric"><strong>${value}</strong><span>${label}</span>${detail?`<small>${detail}</small>`:''}</article>`;

function chartLabel(date,index,days,prettyDate){
 if(days===7)return prettyDate(date,{weekday:'short'}).slice(0,3);
 const step=days===30?5:15;
 return index%step===0||index===days-1?prettyDate(date,{day:'numeric',month:'short'}):'';
}

export function nutritionProgressView({meals=[],endDate,days=30,prettyDate,btn}={}){
 const stats=nutritionRangeStats(meals,endDate,days);
 const rangeButtons=[7,30,90].map(value=>btn(`${value} días`,'nutrition-range',`data-days="${value}" aria-pressed="${stats.days===value}"`,stats.days===value?'active':'')).join('');
 const summary=stats.daysWithData
  ? `<div class="nutrition-progress-grid">${metric(`≈ ${stats.averages.calories}<small> kcal</small>`,'promedio diario','en días registrados')}${metric(`${stats.averages.protein}<small> g</small>`,'proteína por día')}${metric(`${stats.averages.carbs}<small> g</small>`,'carbohidratos por día')}${metric(`${stats.averages.fat}<small> g</small>`,'grasas por día')}${metric(stats.averages.meals,'comidas por día registrado',`${stats.mealsRecorded} comidas en total`)}${metric(`${stats.daysWithData}<small>/${stats.days}</small>`,'días con datos',`${stats.coverage}% del período`)}</div>`
  : '<div class="nutrition-progress-empty"><strong>Todavía no hay datos suficientes.</strong><p>Cuando registres comidas, acá vas a ver tus promedios y tu evolución.</p></div>';
 const chart=stats.daysWithData?`<div class="nutrition-chart-scroll"><div class="nutrition-kcal-chart" style="--nutrition-days:${stats.days}" aria-label="Calorías registradas por día">${stats.byDay.map((day,index)=>`<div class="nutrition-kcal-day ${day.hasData?'has-data':'no-data'}" title="${prettyDate(day.date,{day:'numeric',month:'long'})}: ${day.hasData?`≈ ${day.totals.calories} kcal`:'sin registro'}"><b>${day.hasData?day.totals.calories:''}</b><div class="nutrition-kcal-track"><span style="height:${day.caloriePercent}%"></span></div><small>${chartLabel(day.date,index,stats.days,prettyDate)}</small></div>`).join('')}</div></div>`:'';
 return `<section class="panel nutrition-progress"><div class="section-title nutrition-progress-head"><div><p class="eyebrow">ALIMENTACIÓN</p><h2>Tu alimentación en el tiempo</h2><p>Promedios calculados solo con los días que tienen comidas registradas.</p></div><div class="segmented nutrition-range" role="group" aria-label="Período de alimentación">${rangeButtons}</div></div>${summary}${chart?`<div class="nutrition-chart-head"><div><h3>kcal por día</h3><p class="muted">Los espacios sin barra son días sin registro, no días con 0 kcal.</p></div><span>${prettyDate(stats.startDate,{day:'numeric',month:'short'})} – ${prettyDate(stats.endDate,{day:'numeric',month:'short'})}</span></div>${chart}`:''}</section>`;
}
