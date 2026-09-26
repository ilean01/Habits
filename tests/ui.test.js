import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import 'fake-indexeddb/auto';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(check,{timeout=2500,step=20}={}){const start=Date.now();while(Date.now()-start<timeout){if(check())return;await sleep(step);}assert.ok(check(),'La interfaz no alcanzó el estado esperado dentro del tiempo de prueba.');}

test('demo UI preserves navigation, diary, incremental water, habit fields and calendar',async()=>{
 const bundle=await build({entryPoints:['src/main.js'],bundle:true,write:false,format:'iife',loader:{'.css':'empty'},define:{'import.meta.env':'{}'},plugins:[{name:'fake-auth',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:'fake',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const createClient=()=>({auth:{onAuthStateChange(){}},removeChannel(){}});',loader:'js'}));}}]});
 const dom=new JSDOM('<div id="app"></div><dialog id="modal"></dialog><div id="toast"></div>',{url:'https://example.test/',runScripts:'outside-only'});const w=dom.window;
 for(const key of ['indexedDB','IDBKeyRange','IDBRequest','IDBOpenDBRequest','IDBDatabase','IDBTransaction','IDBObjectStore','IDBIndex','IDBCursor','IDBCursorWithValue'])if(globalThis[key])Object.defineProperty(w,key,{value:globalThis[key],configurable:true});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.scrollTo=()=>{};w.confirm=()=>true;
 try{w.eval(bundle.outputFiles[0].text);const click=async selector=>{const el=w.document.querySelector(selector);assert.ok(el,selector);el.click();await sleep(20);};const water=()=>Number(String(w.document.querySelector('.water-panel strong')?.textContent||'0').replace(',','.').match(/[\d.]+/)?.[0]||0);
 await click('[data-action=demo]');await waitFor(()=>w.document.querySelectorAll('.habit-card').length>0);assert.ok(w.document.querySelectorAll('.habit-card').length>0,'La demo debe mostrar los hábitos programados para el día actual.');
 const start=water();await click('[data-action=water-add][data-ml="250"]');await click('[data-action=water-add][data-ml="500"]');await waitFor(()=>Math.abs(water()-(start+0.75))<0.001);assert.ok(Math.abs(water()-(start+0.75))<0.001);
 await click('.water-panel [data-action=water-remove]');await waitFor(()=>water()<start+0.75);assert.ok(water()<start+0.75);
 await click('[data-view=progress]');assert.match(w.document.body.textContent,/PROMEDIO DE AGUA/);assert.match(w.document.body.textContent,/Tu agua, día por día/);
 await click('[data-view=diary]');assert.match(w.document.body.textContent,/Qué te gustaría recordar/);
 await click('[data-action=journal]');w.document.querySelector('[name=text]').value='Mi diario privado';w.document.querySelector('[name=text]').dispatchEvent(new w.Event('input',{bubbles:true}));w.document.querySelector('#modal form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>/Mi diario privado/.test(w.document.body.textContent));assert.match(w.document.body.textContent,/Mi diario privado/);
 await click('[data-view=today]');await click('[data-action=new-habit]');assert.equal(w.document.querySelectorAll('[name=icon]').length,18);assert.equal(w.document.querySelector('[data-target-fields]').hidden,true);const type=w.document.querySelector('[name=type]');type.value='time';type.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(w.document.querySelector('[name=unit]').value,'minutos');assert.equal(w.document.querySelector('[data-target-fields]').hidden,false);
 await click('[data-action=close]');await click('[data-view=calendar]');await click('[data-action=calendar-mode][data-mode=week]');assert.equal(w.document.querySelectorAll('.week-agenda>section').length,7);
 await click('[data-view=library]');assert.equal(w.document.querySelectorAll('[data-library-host] iframe').length,1);const frame=w.document.querySelector('[data-library-host] iframe');await click('[data-view=library]');assert.equal(w.document.querySelector('[data-library-host] iframe'),frame);await click('[data-view=space]');assert.equal(w.document.querySelectorAll('.space-tabs [data-tab=biblioteca]').length,0);
 await click('[data-action=settings]');assert.match(w.document.querySelector('#modal').textContent,/Exportar mis datos/);
 }finally{w.close();}
});
