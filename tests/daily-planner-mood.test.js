import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Agenda del día integra ánimo nativamente desde day-service sin parche de DOM',async()=>{
 const [planner,service,css,index]=await Promise.all([read('src/daily-planner.js'),read('src/day-service.js'),read('src/daily-planner.css'),read('index.html')]);
 assert.match(planner,/import \{daySnapshot\} from '\.\/day-service\.js'/);
 assert.match(planner,/moodSection\(day\.detail\.mood\)/);
 assert.match(service,/journals:rows\(records,'journal'\)/);
 assert.match(planner,/data-action=\"mood\"/);
 assert.match(planner,/¿Cómo te sentís hoy\?/);
 assert.match(planner,/role=\"radiogroup\"/);
 assert.doesNotMatch(planner,/MutationObserver/);
 assert.match(css,/\.planner-mood\.chosen/);
 assert.doesNotMatch(index,/daily-planner-mood\.js/);
 await assert.rejects(access(new URL('../src/daily-planner-mood.js',import.meta.url)));
 await assert.rejects(access(new URL('../src/daily-planner-mood.css',import.meta.url)));
});
