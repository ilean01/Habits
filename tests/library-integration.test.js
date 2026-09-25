import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Biblioteca embebida hereda apariencia y altura del shell de Habits',async()=>{
 const embed=await read('src/library-embed.js');
 const main=await read('src/biblioteca-main.js');
 assert.match(embed,/habits-shell/);
 assert.match(embed,/type:'appearance'/);
 assert.match(embed,/type==='resize'/);
 assert.match(main,/source:'habits-library'/);
 assert.match(main,/habitsTheme/);
 assert.match(main,/ResizeObserver/);
});

test('Biblioteca embebida elimina la segunda marca pero conserva biblioteca activa y navegación',async()=>{
 const views=await read('src/biblioteca/views.js');
 const css=await read('src/biblioteca-habits.css');
 assert.match(views,/if\(s\.embedded\)/);
 assert.match(views,/Biblioteca activa/);
 assert.match(views,/data-lib-switch/);
 assert.match(views,/Catálogo/);
 assert.match(views,/Préstamos/);
 assert.match(views,/Papelera/);
 assert.match(css,/html\.embedded-library \.lib-brand/);
 assert.match(css,/font-size:14px/);
 assert.match(css,/--lib-main:#48634d/);
});

test('GitHub Pages no publica si Playwright no pasa',async()=>{
 const workflow=await read('.github/workflows/deploy.yml');
 assert.match(workflow,/npm run test:e2e/);
 assert.match(workflow,/playwright install --with-deps chromium/);
 assert.match(workflow,/needs: validate/);
 assert.match(workflow,/needs\.validate\.result == 'success'/);
});

test('la Biblioteca nueva es el único catálogo visible del shell sin parche posterior',async()=>{
 const [main,index,retirement]=await Promise.all([read('src/main.js'),read('index.html'),read('src/legacy-book-retirement.js')]);
 assert.match(main,/function unifiedLibraryView\(\)[\s\S]*habits-library-embed[\s\S]*readingCompanionView\(\)/);
 assert.match(main,/function readingCompanionView\(\)[\s\S]*Sesiones y citas de lectura/);
 assert.doesNotMatch(main,/function unifiedLibraryView\(\)[\s\S]{0,500}libraryView\(\)/);
 assert.doesNotMatch(index,/enhancements\.js/);
 assert.match(retirement,/legacyBookArchive/);
 assert.match(retirement,/bookTitle/);
 assert.match(retirement,/legacyBookId/);
});
