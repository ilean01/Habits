import fs from 'node:fs';

const path='src/main.js';
let source=fs.readFileSync(path,'utf8');
function replaceOnce(from,to,label){
 const count=source.split(from).length-1;
 if(count!==1)throw new Error(`${label}: se esperaba 1 coincidencia y hubo ${count}`);
 source=source.replace(from,to);
}

replaceOnce("import './nutrition-summary.css';","import './nutrition-summary.css';\nimport './nutrition-progress.css';",'css progreso nutricional');
replaceOnce("import {nutritionView,nutritionAction,nutritionSummaryView} from './nutrition.js';","import {nutritionView,nutritionAction,nutritionSummaryView} from './nutrition.js';\nimport {nutritionProgressView} from './nutrition-progress.js';",'modulo progreso nutricional');
replaceOnce('</div><section class="panel"><div class="section-title"><h2>Tu semana, paso a paso</h2>','</div>${nutritionProgressView({meals:rec(\'meal\'),endDate:today,days:window.nutritionProgressDays||30,prettyDate,btn})}<section class="panel"><div class="section-title"><h2>Tu semana, paso a paso</h2>','montaje en Progreso');
replaceOnce('async function action(a,el){','async function action(a,el){if(a===\'nutrition-range\'){const days=Number(el.dataset.days);window.nutritionProgressDays=[7,30,90].includes(days)?days:30;render();return;}','accion rango nutricional');

fs.writeFileSync(path,source);
