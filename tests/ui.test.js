import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
test('demo UI preserves navigation, diary, incremental water, habit fields and calendar',async()=>{
 const bundle=await build({entryPoints:['src/main.js'],bundle:true,write:false,format:'iife',loader:{'.css':'empty'},define:{'import.meta.env':'{}'},plugins:[{name:'fake-auth',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'fake',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const createClient=()=>({auth:{onAuthStateChange(){}},removeChannel(){}});',loader:'js'}));}}]});
 const dom=new JSDOM('<div id="app"></div><dialog id="modal"></dialog><div id="toast"></div>',{url:'https://example.test/',runScripts:'outside-only'});const w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.scrollTo=()=>{};
 try{w.eval(bundle.outputFiles[0].text);const click=async selector=>{const el=w.document.querySelector(selector);assert.ok(el,selector);el.click();await new Promise(r=>setTimeout(r,20));};
 await click('[data-action=demo]');assert.equal(w.document.querySelectorAll('.habit-card').length,6);
 await click('[data-action=water-add][data-ml="250"]');await click('[data-action=water-add][data-ml="500"]');assert.match(w.document.body.textContent,/0[,.]75 litros/);
 await click('[data-action=water-remove]');assert.match(w.document.body.textContent,/0[,.]5 litros/);
 await click('[data-view=diary]');assert.match(w.document.body.textContent,/Qué te gustaría recordar/);
 await click('[data-action=journal]');w.document.querySelector('[name=text]').value='Mi diario privado';w.document.querySelector('#modal form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,20));assert.match(w.document.body.textContent,/Mi diario privado/);
 await click('[data-view=today]');await click('[data-action=new-habit]');assert.equal(w.document.querySelectorAll('[name=icon]').length,18);assert.equal(w.document.querySelector('[data-target-fields]').hidden,true);const type=w.document.querySelector('[name=type]');type.value='time';type.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelector('[name=unit]').value,'minutos');assert.equal(w.document.querySelector('[data-target-fields]').hidden,false);
 await click('[data-action=close]');await click('[data-view=calendar]');await click('[data-action=calendar-mode]');assert.equal(w.document.querySelectorAll('.week-agenda>section').length,7);
 await click('[data-action=settings]');assert.match(w.document.querySelector('#modal').textContent,/Exportar mis datos/);
 }finally{w.close();}
});
