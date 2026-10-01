import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoute,routeHash} from '../src/router.js';

test('rutas principales tienen hash estable y compatible con GitHub Pages',()=>{
 const cases=[['today','#/today'],['calendar','#/calendar'],['meals','#/meals'],['progress','#/progress'],['diary','#/diary'],['library','#/library'],['space','#/tasks']];
 for(const [view,hash] of cases){assert.equal(routeHash({view}),hash);assert.equal(parseRoute(hash).view,view);}
});
test('una ruta antigua de áreas vuelve de forma segura a Mi día',()=>{
 const route=parseRoute('#/areas/ingles');assert.equal(route.view,'today');assert.equal(route.hash,'#/today');
 assert.equal(routeHash({view:'areas'}),'#/today');
});
test('calendario conserva la fecha exacta al recargar y usar Atrás',()=>{
 const hash=routeHash({view:'calendar',date:'2026-09-27'});assert.equal(hash,'#/calendar/2026-09-27');
 const route=parseRoute(hash);assert.equal(route.view,'calendar');assert.equal(route.date,'2026-09-27');assert.equal(route.hash,hash);
});
test('Biblioteca conserva una ficha de libro en la URL',()=>{
 const hash=routeHash({view:'library',bookId:147});assert.equal(hash,'#/library/book/147');
 const route=parseRoute(hash);assert.equal(route.view,'library');assert.equal(route.bookId,'147');assert.equal(route.hash,hash);
});
test('una ruta desconocida cae en Mi día de manera canónica',()=>{const route=parseRoute('#/algo-que-no-existe');assert.equal(route.view,'today');assert.equal(route.hash,'#/today');});
