import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseRoute} from '../src/router.js';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

// Regression contract: the removed Areas feature must not return in navigation or editing UI.
test('Mis áreas desaparece de navegación y rutas',async()=>{
 const [nav,router,main]=await Promise.all([read('src/app-navigation.js'),read('src/router.js'),read('src/main.js')]);
 assert.doesNotMatch(nav,/Mis áreas|['\"]areas['\"]/);
 assert.doesNotMatch(router,/areas:'areas'|view==='areas'|#\/areas/);
 assert.equal(parseRoute('#/areas/facultad').view,'today');
 assert.doesNotMatch(main,/areasView\(|new-area|edit-area|view==='areas'|a==='area'/);
});

test('la usuaria ya no gestiona ni filtra por áreas',async()=>{
 const [main,tools,planner,planning]=await Promise.all([read('src/main.js'),read('src/productivity-tools.js'),read('src/daily-planner.js'),read('src/planning.js')]);
 assert.doesNotMatch(main,/>Área<|areaSelect\(|Nueva área|Editar área/);
 assert.doesNotMatch(tools,/search-area|Todas las áreas|areaName\(|>Área</);
 assert.doesNotMatch(planner,/>Área<|areaName\(/);
 assert.doesNotMatch(planning,/Ver área |['\"]area['\"],['\"]data-id=/);
});
