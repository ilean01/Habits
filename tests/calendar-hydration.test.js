import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {habitStatus,dayStats} from '../src/domain.js';

test('las tomas de agua completan el hábito también para las estadísticas del calendario',()=>{
  const h={id:'agua',name:'Tomar agua',hydration:true,type:'quantity',target:2000,targetMl:2000,unit:'ml',days:[0,1,2,3,4,5,6]};
  const logs=[
    {id:'w1',date:'2026-09-23',hydration:true,milliliters:500},
    {id:'w2',date:'2026-09-23',hydration:true,milliliters:1500}
  ];
  const status=habitStatus(h,logs,'2026-09-23');
  assert.equal(status.done,true);
  assert.equal(status.value,2000);
  assert.deepEqual(dayStats([h],logs,'2026-09-23'),{total:1,done:1,skipped:0,percent:100});
});

test('la Ficha del día usa habitStatus y muestra progreso parcial de agua',async()=>{
  const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/function dayDetailView\(d\)/);
  assert.match(main,/status:habitStatus\(h,rec\('log'\),d\)/);
  assert.match(main,/status\.hydration/);
  assert.doesNotMatch(main,/const l=rec\('log'\)\.find\(l=>l\.habitId===h\.id&&l\.date===date\)/);
});
