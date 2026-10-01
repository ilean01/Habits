import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Comidas está conectado a la navegación, ruta y entrada principal',()=>{
 const nav=read('src/app-navigation.js'),router=read('src/router.js'),index=read('index.html');
 assert.match(nav,/\['meals','Coffee','Comidas'\]/);assert.match(router,/meals:'meals'/);assert.match(index,/src\/meals\.js/);
});

test('Comidas mantiene separado lo planificado de lo realmente consumido',()=>{
 const ui=read('src/meals.js');assert.match(ui,/rec\('mealPlan'\)/);assert.match(ui,/rec\('meal'\)/);assert.match(ui,/source:'meal-plan'/);assert.match(ui,/data-meals=\\?"eat/);
});

test('Comidas reutiliza entries para offline, Realtime y conflictos',()=>{
 const ui=read('src/meals.js'),migration=read('supabase/migrations/20261001030000_comidas_module.sql');
 assert.match(ui,/db\.put\('pantry'/);assert.match(ui,/db\.put\('shopping'/);assert.match(ui,/db\.put\('recipe'/);assert.match(ui,/db\.put\('mealPlan'/);
 for(const kind of ['mealPlan','recipe','pantry','shopping'])assert.ok(migration.includes(`'${kind}'`));
});
