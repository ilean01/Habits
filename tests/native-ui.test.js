import test from 'node:test';
import assert from 'node:assert/strict';
import {installBannerHtml,installHelpHtml,todayUiContext,waterDaysHtml} from '../src/native-ui.js';

test('la guía de instalación se renderiza sin depender de parches del DOM',()=>{
 const env={navigator:{userAgent:'Mozilla/5.0 (iPhone)',platform:'iPhone',maxTouchPoints:5,standalone:false},matchMedia:()=>({matches:false}),dismissed:false};
 assert.match(installBannerHtml(env),/Instalá Habits en tu iPhone/);
 assert.match(installBannerHtml(env),/data-action="dismiss-install"/);
 assert.match(installHelpHtml(env),/Agregar a inicio/);
 assert.equal(installBannerHtml({...env,dismissed:true}),'');
});

test('Mi día prioriza trabajo y genera el contexto dentro del render',()=>{
 const now=new Date(2026,8,25,10,30,0),events=[{id:'work',name:'Bloque oficina',area:'trabajo',date:'2026-09-25',repeat:'none',time:'09:00',end:'12:00'}],habits=[{id:'p',name:'Personal',area:'personal',order:0},{id:'w',name:'Trabajo',area:'trabajo',order:1}];
 const ui=todayUiContext({events,habits,dayMode:'habitual',now,escape:String});
 assert.equal(ui.habits[0].id,'w');
 assert.match(ui.contextHtml,/Bloque oficina/);
 assert.equal(ui.priorityArea,'trabajo');
});

test('el gráfico de agua nace con sus barras y etiquetas',()=>{
 const html=waterDaysHtml({keys:['2026-09-24','2026-09-25'],liters:[0,1.5]},d=>d);
 assert.match(html,/water-column-track/);
 assert.match(html,/--water-level:75%/);
 assert.match(html,/1,5 L/);
 assert.match(html,/aria-label="2026-09-25: 1,5 litros"/);
});
