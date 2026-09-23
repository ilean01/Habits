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

test('Lectura aparece antes del catálogo y las insignias quedan ancladas a cada libro',async()=>{
 const main=await read('src/main.js');
 const integration=await read('src/library-integration.css');
 const catalogCss=await read('src/biblioteca.css');
 const reading=main.indexOf('legacy-reading-tools-primary');
 const catalog=main.indexOf('habits-library-embed');
 assert.ok(reading>=0&&catalog>=0&&reading<catalog);
 assert.match(integration,/legacy-reading-tools-heading/);
 assert.match(catalogCss,/lib-book-card>button:first-child\{position:relative/);
});
