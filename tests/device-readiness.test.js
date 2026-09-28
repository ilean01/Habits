import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {keyboardOffset} from '../src/viewport-insets.js';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('iPhone usa viewport-fit cover y protege los cuatro safe-area insets',async()=>{
 const [html,css]=await Promise.all([read('index.html'),read('src/safe-area.css')]);
 assert.match(html,/viewport-fit=cover/);
 for(const side of ['top','right','bottom','left'])assert.match(css,new RegExp(`env\\(safe-area-inset-${side}`));
 assert.match(css,/\.topbar/);
 assert.match(css,/\.mobile-nav/);
 assert.match(css,/dialog/);
 assert.match(css,/#toast/);
});

test('teclado móvil se detecta por visualViewport sin falsos positivos pequeños',()=>{
 assert.equal(keyboardOffset({innerHeight:844,visualHeight:844,offsetTop:0}),0);
 assert.equal(keyboardOffset({innerHeight:844,visualHeight:820,offsetTop:0}),24);
 assert.equal(keyboardOffset({innerHeight:844,visualHeight:510,offsetTop:0}),334);
 assert.equal(keyboardOffset({innerHeight:844,visualHeight:500,offsetTop:12}),332);
});

test('CSS móvil oculta la barra inferior con teclado y conserva un solo scroll principal',async()=>{
 const [safe,accessibility]=await Promise.all([read('src/safe-area.css'),read('src/accessibility.css')]);
 assert.match(safe,/data-keyboard-open="true"[^}]*\.mobile-nav|data-keyboard-open="true"\]\s+\.mobile-nav/s);
 assert.match(safe,/--visual-viewport-height/);
 assert.match(accessibility,/One document scroll/);
 assert.match(accessibility,/\.sidebar\{position:relative/);
});

test('la prueba cruzada cubre iPhone a notebook, notebook a iPhone, offline y conflictos',async()=>{
 const source=await read('tests/cross-device-sync.test.js');
 assert.match(source,/Creado desde iPhone/);
 assert.match(source,/Editado desde notebook/);
 assert.match(source,/Cambio offline en iPhone/);
 assert.match(source,/Versión iPhone en conflicto/);
 assert.match(source,/resolveConflict/);
});
