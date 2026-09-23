import {test} from 'node:test';
import assert from 'node:assert/strict';
import {daySummary,dayWelcome} from '../src/daily.js';
test('summary preserves names and includes only recorded activity',()=>{
 const summary=daySummary({habits:[{id:'h',name:'Clase con Laura'}],logs:[{habitId:'h',date:'2026-09-23',status:'done'}],events:[{id:'e',name:'Inglés'},{id:'unmarked',name:'Sin completar'}],eventLogs:[{eventId:'e',date:'2026-09-23'}],readings:[{date:'2026-09-23',minutes:30},{date:'2026-09-22',minutes:50}],journals:[{date:'2026-09-23',achievement:true,text:'Terminé mi trabajo'}]},'2026-09-23');
 assert.match(summary,/Clase con Laura/);assert.match(summary,/Inglés/);assert.match(summary,/30 minutos/);assert.match(summary,/Terminé mi trabajo/);assert.doesNotMatch(summary,/Sin completar|50 minutos/);
});
test('night has a moon and appropriate copy',()=>{assert.equal(dayWelcome(22).icon,'Moon');assert.equal(dayWelcome(3).icon,'Moon');assert.equal(dayWelcome(10).icon,'Sun');});
test('madrugada says good night and never "Buen día"',()=>{assert.equal(dayWelcome(1).greeting,'Buenas noches');assert.equal(dayWelcome(1).icon,'Moon');assert.doesNotMatch(dayWelcome(1).subtitle,/hiciste hoy/);assert.equal(dayWelcome(8).greeting,'Buen día');assert.equal(dayWelcome(15).greeting,'Buenas tardes');assert.equal(dayWelcome(21).greeting,'Buenas noches');});
test('summary celebrates books finished in the library catalog',()=>{const s=daySummary({finishedBooks:['Matar a un ruiseñor']},'2026-09-23');assert.match(s,/terminar «Matar a un ruiseñor»/);});
