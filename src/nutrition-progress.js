import * as db from './store.js';
import {nutritionGoalProgress,nutritionRangeStats} from './nutrition-domain.js';

const metric=(value,label,detail='')=>`<article class="nutrition-progress-metric"><strong>${value}</strong><span>${label}</span>${detail?`<small>${detail}</small>`:''}</article>`;

function chartLabel(date,index,days,prettyDate){
 if(days===7)return prettyDate(date,{weekday:'short'}).slice(0,3);
 const step=days===30?5:15;
 return index%step===0||index===days-1?prettyDate(date,{day:'numeric',month:'short'}):'';
}

function trendChart(stats,prettyDate,{kind='calories'}={}){
 const protein=kind==='protein';
 const title=protein?'Proteína por día':'kcal por día';
 const aria=protein?'Proteína registrada por día':'Calorías registradas por día';
 const unit=protein?' g':' kcal';
 return `<div class="nutrition-chart-scroll"><div class="nutrition-kcal-chart ${protein?'nutrition-protein-chart':''}" style="--nutrition-days:${stats.days}" aria-label="${aria}">${stats.byDay.map((day,index)=>{const value=protein?day.totals.protein:day.totals.calories,percent=protein?day.proteinPercent:day.caloriePercent;return `<div class="nutrition-kcal-day ${day.hasData?'has-data':'no-data'}" title="${prettyDate(day.date,{day:'numeric',month:'long'})}: ${day.hasData?`${protein?'': '≈ '}${value}${unit}`:'sin registro'}"><b>${day.hasData?value:''}</b><div class="nutrition-kcal-track"><span style="height:${percent}%"></span></div><small>${chartLabel(day.date,index,stats.days,prettyDate)}</small></div>`;}).join('')}</div></div>`;
}

function macroView(stats){
 const m=stats.macroDistribution;
 if(!stats.daysWithData)return '';
 return `<section class="nutrition-macro-card"><div><h3>Distribución promedio de macros</h3><p class="muted">Porcentaje aproximado del aporte energético registrado.</p></div><div class="nutrition-macro-bar" role="img" aria-label="Proteína ${m.protein}%, carbohidratos ${m.carbs}%, grasas ${m.fat}%"><span class="protein" style="width:${m.protein}%"></span><span class="carbs" style="width:${m.carbs}%"></span><span class="fat" style="width:${m.fat}%"></span></div><div class="nutrition-macro-legend"><span><i class="protein"></i>Proteína <b>${m.protein}%</b></span><span><i class="carbs"></i>Carbohidratos <b>${m.carbs}%</b></span><span><i class="fat"></i>Grasas <b>${m.fat}%</b></span></div></section>`;
}

function goalsView(stats,btn){
 const settings=db.records('settings')[0]||{};
 const progress=nutritionGoalProgress(stats.averages,settings.nutritionGoals||{});
 const labels={calories:['kcal','kcal'],protein:['Proteína','g'],carbs:['Carbohidratos','g'],fat:['Grasas','g']};
 if(!progress.configured)return `<section class="nutrition-goals-card"><div><h3>Objetivos nutricionales</h3><p class="muted">Opcionales. Configuralos solo si querés comparar tus promedios con una referencia personal.</p></div>${btn('Configurar objetivos','nutrition-goals','','button outline')}</section>`;
 const rows=Object.entries(progress.goals).filter(([,goal])=>goal!==null).map(([key,goal])=>{const [label,unit]=labels[key],current=stats.averages[key]||0,pct=Math.min(160,progress[key]||0);return `<div class="nutrition-goal-row"><div><span>${label}</span><b>${current} / ${goal} ${unit}</b></div><div class="nutrition-goal-track"><span style="width:${Math.min(100,pct)}%"></span></div><small>${progress[key]}% del objetivo promedio</small></div>`;}).join('');
 return `<section class="nutrition-goals-card"><div class="nutrition-goals-head"><div><h3>Objetivos nutricionales</h3><p class="muted">Comparados con el promedio de los días registrados.</p></div>${btn('Editar','nutrition-goals','','text-button')}</div><div class="nutrition-goal-list">${rows}</div></section>`;
}

export function nutritionProgressView({meals=[],endDate,days=30,prettyDate,btn}={}){
 const stats=nutritionRangeStats(meals,endDate,days);
 const rangeButtons=[7,30,90].map(value=>btn(`${value} días`,'nutrition-range',`data-days="${value}" aria-pressed="${stats.days===value}"`,stats.days===value?'active':'')).join('');
 const summary=stats.daysWithData
  ? `<div class="nutrition-progress-grid">${metric(`≈ ${stats.averages.calories}<small> kcal</small>`,'promedio diario','en días registrados')}${metric(`${stats.averages.protein}<small> g</small>`,'proteína por día')}${metric(`${stats.averages.carbs}<small> g</small>`,'carbohidratos por día')}${metric(`${stats.averages.fat}<small> g</small>`,'grasas por día')}${metric(stats.averages.meals,'comidas por día registrado',`${stats.mealsRecorded} comidas en total`)}${metric(`${stats.daysWithData}<small>/${stats.days}</small>`,'días con datos',`${stats.coverage}% del período`)}</div>`
  : '<div class="nutrition-progress-empty"><strong>Todavía no hay datos suficientes.</strong><p>Cuando registres comidas, acá vas a ver tus promedios y tu evolución.</p></div>';
 const rangeLabel=`${prettyDate(stats.startDate,{day:'numeric',month:'short'})} – ${prettyDate(stats.endDate,{day:'numeric',month:'short'})}`;
 return `<section class="panel nutrition-progress"><div class="section-title nutrition-progress-head"><div><p class="eyebrow">ALIMENTACIÓN</p><h2>Tu alimentación en el tiempo</h2><p>Promedios calculados solo con los días que tienen comidas registradas.</p></div><div class="segmented nutrition-range" role="group" aria-label="Período de alimentación">${rangeButtons}</div></div>${summary}${stats.daysWithData?`<div class="nutrition-chart-head"><div><h3>kcal por día</h3><p class="muted">Los espacios sin barra son días sin registro, no días con 0 kcal.</p></div><span>${rangeLabel}</span></div>${trendChart(stats,prettyDate)}<div class="nutrition-chart-head nutrition-second-chart"><div><h3>Proteína por día</h3><p class="muted">Tendencia diaria basada en los registros revisados.</p></div><span>${rangeLabel}</span></div>${trendChart(stats,prettyDate,{kind:'protein'})}${macroView(stats)}`:''}${goalsView(stats,btn)}</section>`;
}
