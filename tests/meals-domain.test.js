import test from 'node:test';
import assert from 'node:assert/strict';
import {mondayOf,weekDateKeys,normalizeIngredientName,buildShoppingNeeds,ingredientMatchSummary,missingIngredients} from '../src/meals-domain.js';

test('la semana de Comidas empieza el lunes y conserva 7 fechas',()=>{
 assert.equal(mondayOf('2026-10-01'),'2026-09-28');
 assert.deepEqual(weekDateKeys('2026-09-28'),['2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-03','2026-10-04']);
});

test('normaliza plurales comunes para evitar duplicados en el súper',()=>{
 assert.equal(normalizeIngredientName('Tomates'),'tomate');
 assert.equal(normalizeIngredientName('Papas'),'papa');
 assert.equal(normalizeIngredientName('  POLLO  '),'pollo');
});

test('suma necesidades semanales y resta lo que ya hay en la despensa',()=>{
 const plans=[{id:'lunes',ingredients:[{name:'Pollo',quantity:500,unit:'g'}]},{id:'miercoles',ingredients:[{name:'pollo',quantity:400,unit:'g'}]}];
 const pantry=[{name:'Pollo',quantity:300,unit:'g',status:'available'}];
 const needs=buildShoppingNeeds(plans,pantry);
 assert.equal(needs.length,1);assert.equal(needs[0].normalizedName,'pollo');assert.equal(needs[0].quantity,600);assert.equal(needs[0].unit,'g');
 assert.deepEqual(needs[0].sourcePlanIds,['lunes','miercoles']);
});

test('no mezcla unidades incompatibles del mismo ingrediente',()=>{
 const plans=[{id:'a',ingredients:[{name:'Tomate',quantity:500,unit:'g'}]},{id:'b',ingredients:[{name:'Tomates',quantity:2,unit:'unit'}]}];
 const needs=buildShoppingNeeds(plans,[]);assert.equal(needs.length,2);assert.deepEqual(new Set(needs.map(x=>x.family)),new Set(['mass','count']));
});

test('reconoce qué ingredientes están cubiertos y cuáles faltan',()=>{
 const pantry=[{name:'Huevos',quantity:6,unit:'unit',status:'available'},{name:'Papa',quantity:1,unit:'kg',status:'available'}];
 const recipe=[{name:'huevo',quantity:2,unit:'unit'},{name:'papas',quantity:500,unit:'g'},{name:'cebolla',quantity:1,unit:'unit'}];
 const summary=ingredientMatchSummary(recipe,pantry);assert.equal(summary.total,3);assert.equal(summary.available,2);
 assert.deepEqual(missingIngredients(recipe,pantry).map(x=>x.normalizedName),['cebolla']);
});
