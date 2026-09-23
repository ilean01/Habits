import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const enhancements=fs.readFileSync(new URL('../src/enhancements.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8');

test('el editor de hábitos renderiza frecuencia semanal de forma nativa',()=>{
 assert.match(main,/frequencyMode/);
 assert.match(main,/weeklyTarget/);
 assert.match(main,/X veces por semana/);
 assert.match(main,/Elegí entre 1 y 7 veces por semana/);
});

test('enhancements ya no inyecta ni rastrea la frecuencia del hábito',()=>{
 assert.doesNotMatch(enhancements,/enhanceHabitEditor/);
 assert.doesNotMatch(enhancements,/currentHabitId/);
 assert.doesNotMatch(enhancements,/weekly-frequency-grid/);
});

test('los estilos de frecuencia viven con la aplicación',()=>{
 assert.match(css,/native weekly frequency/);
 assert.match(css,/\.weekly-frequency-grid/);
});
