import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dayDetailData} from '../src/day-detail-data.js';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('meal forma parte del contrato SQL y del respaldo',async()=>{
 const [sql,extras]=await Promise.all([
  read('supabase/migrations/20260925201500_meal_entries.sql'),
  read('src/extras.js')
 ]);
 assert.match(sql,/photo','meal/);
 assert.match(extras,/'photo','meal'/);
});

test('la ficha diaria recibe el mismo resumen nutricional',()=>{
 const day=dayDetailData({date:'2026-09-25',meals:[{id:'m1',date:'2026-09-25',mealType:'lunch',totals:{calories:700,protein:35,carbs:80,fat:20}}]});
 assert.equal(day.hasNutrition,true);
 assert.equal(day.nutrition.count,1);
 assert.equal(day.nutrition.totals.calories,700);
 assert.deepEqual(day.nutrition.typeLabels,['Almuerzo']);
});

test('Mi día y Ficha del día integran alimentación en el render principal',async()=>{
 const main=await read('src/main.js');
 assert.match(main,/nutritionSummaryView/);
 assert.match(main,/meals:rec\('meal'\)/);
 assert.match(main,/day\.nutrition\.totals\.calories/);
 assert.match(main,/Alimentación/);
 const css=await read('src/nutrition-summary.css');
 assert.match(css,/\.nutrition-day-summary/);
 assert.match(css,/\.day-detail-nutrition-grid/);
});
