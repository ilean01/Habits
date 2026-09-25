import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const load=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('water history is rendered natively as a seven-column chart without changing hydration data',async()=>{
 const [main,nativeUi,css]=await Promise.all([load('src/main.js'),load('src/native-ui.js'),load('src/native-ui.css')]);
 assert.match(main,/waterDaysHtml\(water,prettyDate\)/,'progress view must render from the existing waterStats data');
 assert.match(nativeUi,/function waterDaysHtml|export function waterDaysHtml/);
 assert.match(nativeUi,/water-column-track/,'each day must have an independent chart track');
 assert.match(nativeUi,/--water-level/,'bar height must be driven by the liters recorded for that day');
 assert.match(nativeUi,/value===0\?3/,'zero-liter days must keep a visible baseline');
 assert.match(css,/grid-template-columns:repeat\(7,minmax\(58px,1fr\)\)/,'seven days must render as seven columns');
});

test('water history remains compact on phones',async()=>{
 const css=await load('src/native-ui.css');
 assert.match(css,/@media\(max-width:650px\)[\s\S]*grid-template-columns:repeat\(7,minmax\(38px,1fr\)\)/);
 assert.match(css,/grid-template-rows:auto 92px auto/);
});
