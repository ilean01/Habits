import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {nutritionProgressView} from '../src/nutrition-progress.js';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const prettyDate=date=>date;
const btn=(text,action,extra='',cls='button')=>`<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;

test('Progreso muestra 7, 30 y 90 días con promedios, kcal, proteína y macros',()=>{
 const html=nutritionProgressView({
  meals:[{date:'2026-09-25',mealType:'lunch',totals:{calories:700,protein:35,carbs:80,fat:20}}],
  endDate:'2026-09-25',days:30,prettyDate,btn
 });
 assert.match(html,/7 días/);
 assert.match(html,/30 días/);
 assert.match(html,/90 días/);
 assert.match(html,/≈ 700<small> kcal/);
 assert.match(html,/35<small> g<\/small>.*proteína por día/s);
 assert.match(html,/1<small>\/30<\/small>.*días con datos/s);
 assert.match(html,/kcal por día/);
 assert.match(html,/Proteína por día/);
 assert.match(html,/Distribución promedio de macros/);
 assert.match(html,/Objetivos nutricionales/);
 assert.match(html,/data-action="nutrition-goals"/);
 assert.match(html,/sin registro, no días con 0 kcal/);
});

test('Progreso de alimentación queda conectado a la vista real y es desplazable en móvil',async()=>{
 const [main,css,module]=await Promise.all([
  read('src/main.js'),read('src/nutrition-progress.css'),read('src/nutrition-progress.js')
 ]);
 assert.match(main,/import '\.\/nutrition-progress\.css'/);
 assert.match(main,/nutritionProgressView\(\{meals:rec\('meal'\),endDate:today,days:window\.nutritionProgressDays\|\|30,prettyDate,btn\}\)/);
 assert.match(main,/a==='nutrition-range'/);
 assert.match(module,/nutritionRangeStats/);
 assert.match(module,/nutritionGoalProgress/);
 assert.match(module,/nutrition-protein-chart/);
 assert.match(module,/nutrition-macro-bar/);
 assert.match(css,/\.nutrition-chart-scroll\{overflow-x:auto/);
 assert.match(css,/\.nutrition-macro-bar/);
 assert.match(css,/\.nutrition-goal-track/);
 assert.match(css,/--nutrition-days/);
});
