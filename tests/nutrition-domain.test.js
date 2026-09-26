import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultMealType,inferMealType,mealTime,mealTypeLabel,normalizeNutritionGoals,nutritionForDate,nutritionGoalProgress,nutritionRangeStats} from '../src/nutrition-domain.js';

test('resume calorías, macros y tipos de comida de una fecha',()=>{
 const meals=[
  {id:'a',date:'2026-09-25',mealType:'breakfast',time:'08:10',at:'2026-09-25T08:00:00-03:00',totals:{calories:420,protein:22.4,carbs:51,fat:13.2}},
  {id:'b',date:'2026-09-25',mealType:'lunch',at:'2026-09-25T13:00:00-03:00',totals:{calories:680,protein:39.6,carbs:72.5,fat:24.1}},
  {id:'c',date:'2026-09-24',mealType:'dinner',totals:{calories:500,protein:20,carbs:40,fat:20}}
 ];
 const day=nutritionForDate(meals,'2026-09-25');
 assert.equal(day.count,2);
 assert.deepEqual(day.totals,{calories:1100,protein:62,carbs:123.5,fat:37.3});
 assert.deepEqual(day.types,['breakfast','lunch']);
 assert.deepEqual(day.typeLabels,['Desayuno','Almuerzo']);
 assert.equal(day.meals[0].time,'08:10');
 assert.equal(day.hasData,true);
});

test('clasifica registros antiguos que todavía no tienen mealType',()=>{
 assert.equal(inferMealType({label:'Mi desayuno'}),'breakfast');
 assert.equal(inferMealType({label:'Almuerzo rápido'}),'lunch');
 assert.equal(mealTypeLabel('snack'),'Merienda');
});

test('sugiere tipo de comida por hora y conserva hora explícita',()=>{
 assert.equal(defaultMealType(new Date(2026,8,25,8,0)),'breakfast');
 assert.equal(defaultMealType(new Date(2026,8,25,13,0)),'lunch');
 assert.equal(defaultMealType(new Date(2026,8,25,17,0)),'snack');
 assert.equal(defaultMealType(new Date(2026,8,25,21,0)),'dinner');
 assert.equal(mealTime({time:'18:35'}),'18:35');
});

test('promedia kcal, macros y comidas solo sobre días con datos',()=>{
 const meals=[
  {date:'2026-09-25',mealType:'breakfast',totals:{calories:500,protein:20,carbs:60,fat:15}},
  {date:'2026-09-25',mealType:'dinner',totals:{calories:700,protein:40,carbs:40,fat:25}},
  {date:'2026-09-24',mealType:'lunch',totals:{calories:800,protein:40,carbs:80,fat:20}},
  {date:'2026-09-10',mealType:'lunch',totals:{calories:3000,protein:200,carbs:200,fat:100}}
 ];
 const stats=nutritionRangeStats(meals,'2026-09-25',7);
 assert.equal(stats.startDate,'2026-09-19');
 assert.equal(stats.daysWithData,2);
 assert.equal(stats.mealsRecorded,3);
 assert.equal(stats.coverage,29);
 assert.deepEqual(stats.averages,{calories:1000,protein:50,carbs:90,fat:30,meals:1.5});
 assert.deepEqual(stats.macroDistribution,{protein:24,carbs:43,fat:33});
 assert.equal(stats.byDay.find(d=>d.date==='2026-09-25').proteinPercent,100);
 assert.equal(stats.byDay.find(d=>d.date==='2026-09-24').proteinPercent,67);
 assert.equal(stats.byDay.find(d=>d.date==='2026-09-23').hasData,false);
});

test('objetivos nutricionales son opcionales y calculan avance solo cuando existen',()=>{
 assert.deepEqual(normalizeNutritionGoals({calories:'',protein:'100',carbs:0,fat:'60'}),{calories:null,protein:100,carbs:null,fat:60});
 const progress=nutritionGoalProgress({calories:1800,protein:90,carbs:200,fat:50},{calories:2000,protein:100});
 assert.equal(progress.configured,true);
 assert.equal(progress.calories,90);
 assert.equal(progress.protein,90);
 assert.equal(progress.carbs,null);
});

test('soporta períodos de 7, 30 y 90 días y normaliza valores inválidos',()=>{
 assert.equal(nutritionRangeStats([],'2026-09-25',7).days,7);
 assert.equal(nutritionRangeStats([],'2026-09-25',90).byDay.length,90);
 assert.equal(nutritionRangeStats([],'2026-09-25',12).days,30);
});
