import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoute,routeHash} from '../src/router.js';

test('rutas principales tienen hash estable y compatible con GitHub Pages',()=>{
 const cases=[['today','#/today'],['calendar','#/calendar'],['progress','#/progress'],['diary','#/diary'],['library','#/library'],['space','#/tasks']];
 for(const [view,hash] of cases){assert.equal(routeHash({view}),hash);assert.equal(parseRoute(hash).view,view);}
});

test('áreas admiten una ruta con identificador sin confundir la vista',()=>{
 assert.equal(routeHash({view:'areas',areaId:'ingles'}),'#/areas/ingles');
 assert.deepEqual(parseRoute('#/areas/ingles'),{view:'areas',areaId:'ingles',hash:'#/areas/ingles'});
});

test('una ruta desconocida cae en Mi día de manera canónica',()=>{
 assert.deepEqual(parseRoute('#/algo-que-no-existe'),{view:'today',areaId:'',hash:'#/today'});
});
