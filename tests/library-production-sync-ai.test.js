import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('library listens for remote changes from another device',async()=>{
 const source=await readFile(new URL('../src/biblioteca-main.js',import.meta.url),'utf8');
 for(const table of ['biblioteca_libros','biblioteca_lecturas','biblioteca_personas','biblioteca_prestamos','biblioteca_config']){
  assert.match(source,new RegExp(table));
 }
 assert.match(source,/postgres_changes/);
 assert.match(source,/owner_id=eq/);
 assert.match(source,/startLibraryRealtime\(\)/);
});

test('librarian uses Groq by default and preserves local fallback',async()=>{
 const source=await readFile(new URL('../src/library-assistant.js',import.meta.url),'utf8');
 assert.match(source,/data-cloud-mode checked/);
 assert.match(source,/Groq no respondió/);
 assert.match(source,/answerLocally/);
 assert.match(source,/contexto acotado/);
});
