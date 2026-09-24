import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const load=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('water history is enhanced as a seven-column chart without changing hydration data',async()=>{
 const [main,enhancements]=await Promise.all([load('src/main.js'),load('src/enhancements.js')]);
 assert.match(main,/class=\\?"water-days\\?"/,'progress view must keep the seven-day hydration container');
 assert.match(main,/water\.keys\.map/,'the chart must continue using the existing waterStats data');
 assert.match(enhancements,/function enhanceWaterHistory\(\)/,'water history must receive its visual enhancement');
 assert.match(enhancements,/grid-template-columns:repeat\(7,minmax\(/,'seven days must render as seven columns');
 assert.match(enhancements,/water-column-track/,'each day must have an independent chart track');
 assert.match(enhancements,/--water-level/,'bar height must be driven by the liters recorded for that day');
 assert.match(enhancements,/values\[i\]===0\?3/,'zero-liter days must keep a visible baseline');
});

test('water history remains compact on phones',async()=>{
 const enhancements=await load('src/enhancements.js');
 assert.match(enhancements,/@media\(max-width:650px\)[\s\S]*grid-template-columns:repeat\(7,minmax\(38px,1fr\)\)/);
 assert.match(enhancements,/grid-template-rows:auto 92px auto/);
});
