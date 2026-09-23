import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('la interfaz de práctica de inglés muestra etiquetas en español',async()=>{
 const src=await readFile(new URL('../src/planning.js',import.meta.url),'utf8');
 for(const label of ['Comprensión auditiva','Lectura','Conversación','Escritura'])assert.match(src,new RegExp(label));
 assert.doesNotMatch(src,/<h3>\$\{skill\}<\/h3>/);
});

test('el modo oscuro define contraste explícito para texto, formularios y paneles',async()=>{
 const css=await readFile(new URL('../src/dark-theme.css',import.meta.url),'utf8');
 assert.match(css,/--text:#eef2e9/);
 assert.match(css,/input:not\(\[type=checkbox\]\)/);
 assert.match(css,/\.reading-panel/);
 assert.match(css,/\.journal-intro/);
});

test('Progreso y agua viven en la arquitectura principal y no en un parche del DOM',async()=>{
 const [main,progress,enh]=await Promise.all([
  readFile(new URL('../src/main.js',import.meta.url),'utf8'),
  readFile(new URL('../src/progress-view.js',import.meta.url),'utf8'),
  readFile(new URL('../src/enhancements.js',import.meta.url),'utf8')
 ]);
 assert.match(main,/\['progress','ChartNoAxesColumn','Progreso'\]/);
 assert.match(progress,/PROMEDIO DE AGUA/);
 assert.match(progress,/Tu agua, día por día/);
 assert.doesNotMatch(enh,/function addProgressShortcut/);
 assert.doesNotMatch(enh,/function decorateWaterProgress/);
});
