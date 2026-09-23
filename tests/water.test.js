import test from 'node:test';
import assert from 'node:assert/strict';
import {waterTotal,waterStats} from '../src/hydration.js';

const logs=[
 {hydration:true,date:'2026-09-16',milliliters:1000},
 {hydration:true,date:'2026-09-17',milliliters:500},
 {hydration:true,date:'2026-09-17',milliliters:750},
 {hydration:true,date:'2026-09-22',milliliters:2000},
 {hydration:false,date:'2026-09-22',milliliters:9999}
];

test('suma cada toma de agua del día sin mezclar otros logs',()=>{
 assert.equal(waterTotal(logs,'2026-09-17'),1.25);
 assert.equal(waterTotal(logs,'2026-09-22'),2);
});

test('calcula promedio diario real sobre siete días incluyendo días sin registro',()=>{
 const stats=waterStats(logs,'2026-09-22',7);
 assert.equal(stats.total,4.25);
 assert.equal(stats.average,0.61);
 assert.equal(stats.daysWithWater,3);
 assert.equal(stats.liters.length,7);
});
