import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const CACHE_VERSION_MARKER='__HABITS_BUILD_VERSION__';
const STATIC_ASSETS_PATTERN="['./','./icon.svg','./manifest.webmanifest']";

const assets=(await readdir('dist/assets')).map(f=>'./assets/'+f).sort();
const html=await readFile('dist/index.html','utf8');
const version=createHash('sha256').update(html+assets.join()).digest('hex').slice(0,12);
let sw=await readFile('public/sw.js','utf8');

if(!sw.includes(CACHE_VERSION_MARKER)){
 throw new Error(`Service Worker inválido: falta el marcador ${CACHE_VERSION_MARKER}.`);
}
if(!sw.includes(STATIC_ASSETS_PATTERN)){
 throw new Error('Service Worker inválido: no se encontró la lista base de assets.');
}

sw=sw
 .replace(CACHE_VERSION_MARKER,version)
 .replace(STATIC_ASSETS_PATTERN,JSON.stringify(['./','./biblioteca.html','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest',...assets]));

if(sw.includes(CACHE_VERSION_MARKER)){
 throw new Error('No se pudo reemplazar la versión del caché del Service Worker.');
}
if(!sw.includes(`habits-shell-${version}`)){
 throw new Error('El Service Worker generado no contiene la versión esperada del caché.');
}

await writeFile('dist/sw.js',sw);
console.log(`Offline shell: ${assets.length} compiled assets, version ${version}`);
