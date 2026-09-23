import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('la integración de lectura usa el catálogo privado sin quitar el modo local',async()=>{
 const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
 const bridge=await readFile(new URL('../src/library-bridge.js',import.meta.url),'utf8');
 assert.match(main,/currentReading\(\)/);
 assert.match(main,/finishedBooks:catalog\(\)\.finishedToday/);
 assert.match(main,/recordProgress\(bookId/);
 assert.match(main,/rec\('book'\)\.find\(b=>b\.status==='reading'\)/);
 assert.match(bridge,/has_biblioteca_access/);
 assert.match(bridge,/biblioteca_can_write/);
 assert.match(bridge,/biblioteca_transition/);
});
