import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');

test('una fecha futura se presenta como Programada y no como pendiente',()=>{
 assert.match(main,/future=d>currentDay/);
 assert.match(main,/future\?'Programado':'Pendiente'/);
 assert.match(main,/future\?'Programada':t\.priority/);
 assert.match(main,/Programadas para esa fecha/);
});

test('Tareas y Áreas usan la clasificación central de Programadas',()=>{
 assert.match(main,/scheduledTasks\(tasks,today\)/);
 assert.match(main,/\['scheduled','Programadas'\]/);
 assert.match(main,/Todavía no requieren acción/);
 assert.match(main,/scheduledTasks\(taskRows,today\)/);
 assert.match(main,/No hay tareas vencidas o para hoy en esta área/);
});
