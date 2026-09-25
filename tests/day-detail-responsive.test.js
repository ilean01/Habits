import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Ficha del día tiene diseño dedicado para notebook e iPhone',async()=>{
 const css=await readFile(new URL('../src/day-detail-responsive.css',import.meta.url),'utf8');
 assert.match(css,/@media\(min-width:1201px\)/);
 assert.match(css,/max-height:calc\(100dvh - 118px\)/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/\.day-detail-back\{grid-column:1\/-1;display:inline-flex/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/min-height:54px/);
});

test('Ficha móvil ofrece regreso directo al calendario',async()=>{
 const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/import '\.\/day-detail-responsive\.css';/);
 assert.match(main,/class="day-detail-back" href="#calendar-month"/);
 assert.match(main,/id="calendar-month"/);
});
