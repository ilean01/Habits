import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Agenda del día reutiliza el registro de ánimo existente',async()=>{
 const [ui,css,index]=await Promise.all([
  read('src/daily-planner-mood.js'),
  read('src/daily-planner-mood.css'),
  read('index.html')
 ]);
 assert.match(index,/daily-planner-mood\.js/);
 assert.match(ui,/db\.records\('journal'\)/);
 assert.match(ui,/data-action=\"mood\"/);
 assert.match(ui,/data-mood=\"\$\{value\}\"/);
 assert.match(ui,/¿Cómo te sentís hoy\?/);
 assert.match(ui,/role=\"radiogroup\"/);
 assert.match(ui,/aria-checked/);
 assert.match(css,/\.planner-mood\.chosen/);
 assert.match(css,/@media\(max-width:650px\)/);
});
