import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultMealType,inferMealType,mealTypeLabel,nutritionForDate} from '../src/nutrition-domain.js';

test('resume calorías, macros y tipos de comida de una fecha',()=>{
 const meals=[
  {id:'a',date:'2026-09-25',mealType:'breakfast',at:'2026-09-25T08:00:00-03:00',totals:{calories:420,protein:22.4,carbs:51,fat:13.2}},
  {id:'b',date:'2026-09-25',mealType:'lunch',at:'2026-09-25T13:00:00-03:00',totals:{calories:680,protein:39.6,carbs:72.5,fat:24.1}},
  {id:'c',date:'2026-09-24',mealType:'dinner',totals:{calories:500,protein:20,carbs:40,fat:20}}
 ];
 const day=nutritionForDate(meals,'2026-09-25');
 assert.equal(day.count,2);
 assert.deepEqual(day.totals,{calories:1100,protein:62,carbs:123.5,fat:37.3});
 assert.deepEqual(day.types,['breakfast','lunch']);
 assert.deepEqual(day.typeLabels,['Desayuno','Almuerzo']);
 assert.equal(day.hasData,true);
});

test('clasifica registros antiguos que todavía no tienen mealType',()=>{
 assert.equal(inferMealType({label:'Mi desayuno'}),'breakfast');
 assert.equal(inferMealType({label:'Almuerzo rápido'}),'lunch');
 assert.equal(mealTypeLabel('snack'),'Merienda');
});

test('sugiere tipo de comida por hora',()=>{
 assert.equal(defaultMealType(new Date(2026,8,25,8,0)),'breakfast');
 assert.equal(defaultMealType(new Date(2026,8,25,13,0)),'lunch');
 assert.equal(defaultMealType(new Date(2026,8,25,17,0)),'snack');
 assert.equal(defaultMealType(new Date(2026,8,25,21,0)),'dinner');
});
