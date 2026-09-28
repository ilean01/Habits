import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const main=read('src/main.js');
const productivity=read('src/productivity-tools.js');
const assistant=read('src/library-assistant.js');
const reliability=read('src/reliability-center.js');
const photos=read('src/photo-gallery.js');

test('búsqueda, registro rápido y papelera tienen una sola implementación visible',()=>{
 assert.doesNotMatch(main,/searchLocalSpace|searchLibraryCatalog/);
 assert.doesNotMatch(main,/function searchModal/);
 assert.doesNotMatch(main,/if\(a==='create'\)/);
 assert.doesNotMatch(main,/if\(a==='trash'\)/);
 assert.match(productivity,/export function openAdvancedSearch/);
 assert.match(productivity,/export function openQuickAdd/);
 assert.match(productivity,/normal\.dataset\.action==='search'/);
 assert.match(productivity,/normal\.dataset\.action==='create'/);
});

test('la interfaz elimina decoración sin función y reduce texto permanente redundante',()=>{
 assert.doesNotMatch(main,/sidebar-quote|journal-flower|page-footer/);
 assert.doesNotMatch(main,/Pendientes, programadas, para después y proyectos personales, sin mezclar tus áreas/);
 assert.doesNotMatch(main,/Tus compromisos y tus momentos, en equilibrio/);
 assert.doesNotMatch(main,/Catálogo, lecturas, préstamos y tu bibliotecaria/);
});

test('borrar usa papelera con Deshacer sin modal trivial de confirmación',()=>{
 assert.doesNotMatch(main,/¿Mover a la papelera\?/);
 assert.match(main,/db\.remove\(id\);modal\.close\(\);toast\('Movido a la papelera\.'/);
});

test('Ajustes deja datos y soporte dentro de opciones avanzadas',()=>{
 assert.match(main,/settings-advanced/);
 assert.match(main,/Datos y opciones avanzadas/);
 assert.doesNotMatch(main,/icon\('Trash2'\)\+'Papelera'/);
});

test('la UI normal no expone proveedores ni jerga técnica',()=>{
 assert.doesNotMatch(main,/conectemos Supabase/);
 assert.doesNotMatch(main,/Sincronizando…|Todo sincronizado|Reintentar sincronización/);
 assert.doesNotMatch(assistant,/Usar Groq|Groq no respondió/);
 assert.match(assistant,/Usar asistente en línea/);
 assert.doesNotMatch(reliability,/Comprobar sincronización/);
 assert.match(reliability,/Comprobar conexión/);
 assert.doesNotMatch(photos,/Fotos sincronizadas/);
 assert.match(photos,/Fotos al día/);
});

test('código legado y capas CSS de parche fueron retirados',()=>{
 assert.equal(fs.existsSync(new URL('../src/legacy-book-retirement.js',import.meta.url)),false);
 assert.equal(fs.existsSync(new URL('../src/hci-simplification.css',import.meta.url)),false);
 assert.equal(fs.existsSync(new URL('../src/reliability.css',import.meta.url)),false);
 assert.equal(fs.existsSync(new URL('../src/app-shell.css',import.meta.url)),true);
 assert.match(main,/import '\.\/app-shell\.css'/);
 assert.doesNotMatch(main,/hci-simplification\.css|reliability\.css/);
});
