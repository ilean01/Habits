import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {effectiveDayMode} from '../src/day-modes.js';
import {daySummary} from '../src/daily.js';

test('los overrides de tipo de día se conservan por fecha',()=>{
 const settings={dayMode:'habitual',weekModes:{2:'tranquilo'},dayModeOverrides:{'2026-09-22':'descanso'}};
 assert.equal(effectiveDayMode(settings,'2026-09-22'),'descanso');
 assert.equal(effectiveDayMode(settings,'2026-09-29'),'tranquilo');
});

test('el resumen de descanso explica que las rachas quedan protegidas',()=>{
 const text=daySummary({habits:[{id:'h',name:'Agua',area:'salud',days:[2],essential:true}],logs:[]},'2026-09-22','descanso');
 assert.match(text,/día de descanso/i);
 assert.match(text,/rachas quedan protegidas/i);
});

test('Mi día diferencia visualmente Tranquilo de Descanso y no pide usar Hoy no',()=>{
 const src=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(src,/Día de descanso.*no tenés hábitos obligatorios.*rachas quedan protegidas/s);
 assert.match(src,/Día tranquilo.*solo cuentan tus hábitos esenciales/s);
 assert.doesNotMatch(src,/Usá “Hoy no” en los hábitos que quieras pausar/);
 assert.match(src,/dayModeOverrides/);
});
