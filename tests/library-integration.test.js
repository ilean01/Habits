import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Biblioteca se monta nativamente dentro del shell sin iframe',async()=>{
 const [main,host,library]=await Promise.all([read('src/main.js'),read('src/library-native-host.js'),read('src/biblioteca-main.js')]);
 assert.match(main,/mountNativeLibrary/);
 assert.match(main,/data-library-native-host/);
 assert.doesNotMatch(main,/mountEmbeddedLibrary/);
 assert.doesNotMatch(main,/habits-library-frame/);
 assert.match(host,/library-native-shell/);
 assert.match(host,/import\('\.\/biblioteca-main\.js'\)/);
 assert.doesNotMatch(host,/<iframe/i);
 assert.match(library,/window\.__habitsLibraryNative===true/);
 assert.match(library,/root\?\.contains\(el\)\|\|modal\?\.contains\(el\)/);
});

test('Biblioteca nativa elimina segunda marca y conserva contexto y navegación completa',async()=>{
 const [views,css]=await Promise.all([read('src/biblioteca/views.js'),read('src/library-native.css')]);
 assert.match(views,/if\(s\.embedded\)/);
 assert.match(views,/Biblioteca activa/);
 assert.match(views,/data-lib-switch/);
 for(const label of ['Catálogo','Estoy leyendo','Préstamos','Deseos','Leer después','Revisar','Estadísticas','Etiquetas','Papelera','Configuración'])assert.match(views,new RegExp(label));
 assert.match(css,/\.library-native-shell \.lib-header/);
 assert.match(css,/\.library-native-modal/);
 assert.match(css,/\.library-native-shell \.lib-nav/);
});

test('catálogo, préstamos, Dewey, portadas, miembros, lectura y Bibliotecaria conservan sus acciones',async()=>{
 const [library,assistant,views]=await Promise.all([read('src/biblioteca-main.js'),read('src/library-assistant.js'),read('src/biblioteca/views.js')]);
 for(const action of ['new-book','new-loan','print-labels','cover','phone-cover','share-remove','start-reading','update-page'])assert.match(library,new RegExp(action));
 assert.match(library,/mountLibraryAssistant/);
 assert.match(library,/root\.append\(assistantHost\)/);
 assert.match(library,/new URL\('biblioteca\.html',location\.href\)/);
 assert.match(views,/biblioteca_invitar|share-form/);
 assert.match(assistant,/Bibliotecaria|assistant/i);
});

test('Biblioteca visible ya no depende del bridge de iframe',async()=>{
 await assert.rejects(access(new URL('../src/library-embed.js',import.meta.url)));
 const main=await read('src/main.js');
 const start=main.indexOf('function unifiedLibraryView()');
 const end=main.indexOf('function libraryView()',start);
 const unified=main.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(unified,/habits-library-native/);
 assert.match(unified,/readingCompanionView\(\)/);
 assert.doesNotMatch(unified,/iframe|library-embed/);
});

test('GitHub Pages no publica si Playwright no pasa',async()=>{
 const workflow=await read('.github/workflows/deploy.yml');
 assert.match(workflow,/npm run test:e2e/);
 assert.match(workflow,/playwright install --with-deps chromium/);
 assert.match(workflow,/needs: validate/);
 assert.match(workflow,/needs\.validate\.result == 'success'/);
});
