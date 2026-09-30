import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeSleep,sleepLabel,sleepStars} from '../src/sleep-rating.js';

test('calidad de sueño usa una escala estable de 1 a 5 estrellas',()=>{
 assert.equal(normalizeSleep(0),0);
 assert.equal(normalizeSleep(3.2),3);
 assert.equal(normalizeSleep(5),5);
 assert.equal(normalizeSleep(8),0);
 assert.equal(sleepLabel(1),'Muy mal');
 assert.equal(sleepLabel(3),'Regular');
 assert.equal(sleepLabel(5),'Excelente');
 assert.equal(sleepStars(4),'★★★★☆');
});

test('Mi día usa opciones visibles para tipo de día y alimentación solo en Dashboard',()=>{
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const planner=fs.readFileSync(new URL('../src/daily-planner.js',import.meta.url),'utf8');
 assert.match(main,/class=\\?"day-mode-picker/);
 assert.match(main,/\['descanso','🌙','Descanso'\]/);
 assert.match(main,/,'day-mode',/);
 assert.doesNotMatch(main,/<select id=\\?"day-mode/);
 assert.match(planner,/planner-mode-switch planner-mode-switch-compact/);
 assert.doesNotMatch(planner,/Elegí cómo querés ver tu día/);
 assert.match(planner,/mode==='planner'\?plannerHtml\(date\):`\$\{dashboardHtml\}\$\{summaryHtml\}`/);
});
