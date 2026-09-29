import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const navigation=fs.readFileSync(new URL('../src/app-navigation.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const legacyNavigation=new URL('../src/navigation-simplify.js',import.meta.url);

test('Tareas nace desde la navegación nativa sin navigation-simplify',()=>{
 assert.match(navigation,/\['space','CheckCheck','Tareas'\]/);
 assert.doesNotMatch(navigation,/\['space','Flower2','Más'\]/);
 assert.match(main,/from '\.\/app-navigation\.js'/);
 assert.match(main,/const nav=APP_NAV,mobileNav=mobileNavigation\(\)/);
 assert.doesNotMatch(index,/navigation-simplify\.js/);
 assert.equal(fs.existsSync(legacyNavigation),false);
});

test('Tareas separa pendientes, programadas, para después y proyectos',()=>{
 const start=main.indexOf('function spaceView()');
 const end=main.indexOf('\nfunction taskList',start);
 assert.ok(start>=0&&end>start);
 const source=main.slice(start,end);
 assert.match(source,/ORGANIZÁ LO QUE TENÉS QUE HACER/);
 assert.match(source,/'Tareas'/);
 assert.match(source,/\['tareas','Pendientes'\]/);
 assert.match(source,/\['scheduled','Programadas'\]/);
 assert.match(source,/\['later','Para después'\]/);
 assert.match(source,/\['proyectos','Proyectos'\]/);
 assert.match(source,/Tareas vencidas o para hoy/);
 assert.match(source,/Tareas con fecha futura/);
 assert.doesNotMatch(source,/Estudio y trabajo/);
 assert.doesNotMatch(source,/data-tab=\\?"planning/);
});

test('la navegación nativa ya no depende de la pantalla de Áreas',()=>{
 assert.doesNotMatch(main,/area-domain-planning/);
 assert.doesNotMatch(main,/planningView\(\{esc,btn,area:/);
 assert.doesNotMatch(main,/btn\('Organizar semana','plan-week'/);
 assert.doesNotMatch(main,/mobile-more-shortcuts/);
 assert.doesNotMatch(main,/mobile-task-shortcuts/);
 assert.match(main,/function mobileMoreModal\(/);
});
