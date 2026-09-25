import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Bibliotecaria queda como burbuja flotante siempre accesible dentro de Biblioteca',async()=>{
  const source=await readFile(new URL('../src/library-assistant.js',import.meta.url),'utf8');
  assert.match(source,/library-ai-launch/);
  assert.match(source,/position:fixed;right:18px;bottom:18px/);
  assert.match(source,/panel\.classList\.contains\('open'\)\?close\(\):open\(\)/);
  assert.match(source,/Cerrar Bibliotecaria/);
});
