import test from 'node:test';
import assert from 'node:assert/strict';
import {holidayOn,paraguayHolidays} from '../src/paraguay-holidays.js';

test('feriados paraguayos 2026 incorporan traslados confirmados',()=>{
 assert.equal(holidayOn('2026-03-02')?.name,'Día de los Héroes de la Patria');
 assert.equal(holidayOn('2026-06-22')?.name,'Día de la Jura de la Constitución Nacional');
 assert.equal(holidayOn('2026-09-28')?.name,'Día de la Batalla de Boquerón');
 assert.equal(holidayOn('2026-09-29'),null);
});

test('incluye el feriado extraordinario del 30 de junio de 2026',()=>{
 const h=holidayOn('2026-06-30');assert.ok(h);assert.match(h.decree,/6280/);assert.equal(h.extra,true);
});

test('los feriados móviles futuros quedan identificados como pendientes de decreto',()=>{
 const h=paraguayHolidays(2027).find(x=>x.legalDate==='2027-06-20');assert.equal(h.movable,true);assert.equal(h.confirmed,false);
});
