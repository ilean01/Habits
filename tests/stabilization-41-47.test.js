import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('auditoría de Biblioteca queda reproducible y no destructiva',async()=>{
 const sql=await read('supabase/library_integrity_audit.sql');
 assert.match(sql,/libros_total/);
 assert.match(sql,/prestamos_huerfanos/);
 assert.match(sql,/lecturas_huerfanas/);
 assert.match(sql,/finalizadas_huerfanas/);
 assert.doesNotMatch(sql,/\b(delete|update|insert|drop|truncate)\b/i);
});

test('Biblioteca avanzada es la única fuente de libros dentro del shell',async()=>{
 const [main,tools]=await Promise.all([read('src/main.js'),read('src/productivity-tools.js')]);
 assert.doesNotMatch(main,/rec\('book'\)/);
 assert.doesNotMatch(main,/get\('book'/);
 assert.doesNotMatch(main,/function libraryView\(/);
 assert.doesNotMatch(main,/kind==='book'/);
 assert.match(tools,/searchLibraryCatalog/);
 assert.match(tools,/library-book/);
});

test('ficha restaura composición original y edición única con autoguardado',async()=>{
 const [library,css]=await Promise.all([read('src/biblioteca-main.js'),read('src/biblioteca/reference-adapter.css')]);
 assert.match(library,/function bookDetail\(id,editing=false\)/);
 for(const cls of ['ficha-portada','ficha-datos','ficha-resumen-grid','ficha-acciones-superiores'])assert.ok(library.includes(cls));
 assert.match(library,/if\(editing\)bindInlineEditor\(b\)/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test('búsqueda global mezcla espacio local y catálogo y abre ficha de libro',async()=>{
 const [search,tools,host,library]=await Promise.all([read('src/global-search.js'),read('src/productivity-tools.js'),read('src/library-native-host.js'),read('src/biblioteca-main.js')]);
 for(const kind of ['habit','event','task','project','quote','journal','word'])assert.match(search,new RegExp(`${kind}:`));
 assert.match(search,/biblioteca_libros/);
 assert.match(tools,/Buscar en todo Habits/);
 assert.match(tools,/searchLocalSpace/);
 assert.match(tools,/searchLibraryCatalog/);
 assert.match(host,/habits:library-open-book/);
 assert.match(library,/habits:library-open-book/);
});
