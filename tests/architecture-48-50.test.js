import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Mi día, Ficha, Progreso, Agenda, Calendario y Recordatorios comparten day-service',async()=>{
 const [main,planner,calendar,notifications]=await Promise.all([read('src/main.js'),read('src/daily-planner.js'),read('src/calendar-day-indicators.js'),read('src/notifications.js')]);
 assert.match(main,/import \{daySnapshot\} from '\.\/day-service\.js'/);
 assert.ok((main.match(/daySnapshot\(/g)||[]).length>=5,'main debe usar el snapshot en Mi día, Ficha y Progreso');
 assert.match(planner,/from '\.\/day-service\.js'/);
 assert.match(planner,/snapshot\(date\)/);
 assert.match(calendar,/from '\.\/day-service\.js'/);
 assert.match(notifications,/notificationDayContext/);
});

test('main delega navegación y rutas a módulos dedicados',async()=>{
 const [main,router,navigation]=await Promise.all([read('src/main.js'),read('src/router.js'),read('src/app-navigation.js')]);
 assert.match(main,/from '\.\/router\.js'/);
 assert.match(main,/from '\.\/app-navigation\.js'/);
 assert.match(main,/navigateRoute\(\{view:el\.dataset\.view\}\)/);
 assert.match(main,/onRouteChange\(/);
 assert.doesNotMatch(main,/const nav=\[\['today'/);
 assert.match(router,/#\/\$\{segment/);
 assert.match(navigation,/APP_NAV/);
});
