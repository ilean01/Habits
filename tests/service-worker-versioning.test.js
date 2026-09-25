import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const load=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Service Worker usa un marcador estable que el build debe reemplazar',async()=>{
 const [sw,build]=await Promise.all([load('public/sw.js'),load('scripts/build-sw.js')]);
 assert.match(sw,/const CACHE='habits-shell-__HABITS_BUILD_VERSION__'/);
 assert.match(build,/CACHE_VERSION_MARKER='__HABITS_BUILD_VERSION__'/);
 assert.match(build,/if\(!sw\.includes\(CACHE_VERSION_MARKER\)\)/,'el build debe fallar si desaparece el marcador');
 assert.match(build,/habits-shell-\$\{version\}/,'el build debe verificar la versión generada');
 assert.doesNotMatch(build,/habits-shell-v1/,'el build no debe depender de una versión anterior hardcodeada');
});

test('la lista de assets del shell también se valida antes de publicar',async()=>{
 const build=await load('scripts/build-sw.js');
 assert.match(build,/STATIC_ASSETS_PATTERN/);
 assert.match(build,/biblioteca\.html/);
 assert.match(build,/icon-192\.png/);
 assert.match(build,/icon-512\.png/);
 assert.match(build,/\.sort\(\)/,'los assets compilados deben producir una versión determinista');
});
