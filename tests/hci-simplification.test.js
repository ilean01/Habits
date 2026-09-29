import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const productivity=fs.readFileSync(new URL('../src/productivity-tools.js',import.meta.url),'utf8');
const extras=fs.readFileSync(new URL('../src/extras.js',import.meta.url),'utf8');
const wellbeing=fs.readFileSync(new URL('../src/wellbeing.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/app-shell.css',import.meta.url),'utf8');

function sourceBetween(start,end){
 const a=main.indexOf(start),b=main.indexOf(end,a);
 assert.ok(a>=0&&b>a,`No se encontró ${start}`);
 return main.slice(a,b);
}

test('Mi día reduce acciones duplicadas sin perder funciones',()=>{
 const today=sourceBetween('function todayDashboardView()','\nfunction todayView()');
 assert.doesNotMatch(today,/Nuevo hábito/);
 assert.doesNotMatch(today,/También hice esto/);
 assert.match(today,/data-action=\\?"create|,'create'/);
 assert.match(productivity,/export function openQuickAdd/);
 assert.match(productivity,/<strong>Logro<\/strong>/);
 assert.match(productivity,/data-action="achievement"/);
});

test('acciones secundarias quedan agrupadas en lugar de cuatro botones simultáneos',()=>{
 assert.match(extras,/secondary-actions/);
 assert.match(extras,/Más opciones para hoy/);
 assert.match(extras,/<details/);
 assert.doesNotMatch(wellbeing,/Ver progreso/);
});

test('los paneles secundarios y la cronología dejan de parecer tarjetas independientes',()=>{
 assert.match(css,/\.right-column>\.panel:not\(\.reading-panel\)/);
 assert.match(css,/background:transparent/);
 assert.match(css,/\.timeline\{/);
 assert.match(css,/border:0/);
});

test('los estados vacíos explican contexto y ofrecen CTA solo cuando aporta',()=>{
 assert.match(main,/role=\\?"status/);
 assert.match(main,/empty-icon/);
 assert.match(main,/Tu rutina empieza acá/);
 assert.match(main,/Tu agenda está libre/);
 const today=sourceBetween('function todayDashboardView()','\nfunction todayView()');
 assert.match(today,/Tu día todavía está abierto/);
 assert.match(today,/Un poco de espacio libre/);
 assert.match(today,/new-event/);
});
