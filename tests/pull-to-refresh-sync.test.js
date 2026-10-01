import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('pull to refresh usa la sincronización de datos y nunca recarga la página',async()=>{
 const source=await read('../src/resume-sync.js');
 assert.match(source,/export async function syncNow/);
 assert.match(source,/await db\.sync\(\)/);
 assert.match(source,/touchstart/);
 assert.match(source,/touchmove/);
 assert.match(source,/touchend/);
 assert.match(source,/PULL_TRIGGER/);
 assert.match(source,/reason:'pull'/);
 assert.doesNotMatch(source,/location\.reload|window\.location\.reload/);
});

test('al volver a primer plano se sincroniza y se refrescan datos auxiliares',async()=>{
 const source=await read('../src/resume-sync.js');
 assert.match(source,/visibilitychange/);
 assert.match(source,/visibilityState==='visible'/);
 assert.match(source,/pageshow/);
 assert.match(source,/habits:library-data-changed/);
 assert.match(source,/RESUME_MIN_INTERVAL/);
});

test('los listeners de red y foco siguen centralizados en store sin duplicarse en resume sync',async()=>{
 const resume=await read('../src/resume-sync.js');
 const store=await read('../src/store.js');
 assert.match(store,/addEventListener\('online'/);
 assert.match(store,/addEventListener\('offline'/);
 assert.match(store,/addEventListener\('focus'/);
 assert.doesNotMatch(resume,/addEventListener\('online'/);
 assert.doesNotMatch(resume,/addEventListener\('offline'/);
 assert.doesNotMatch(resume,/addEventListener\('focus'/);
});

test('el service worker no intercepta respuestas externas de Supabase como datos cacheados',async()=>{
 const sw=await read('../public/sw.js');
 assert.match(sw,/u\.origin!==self\.location\.origin/);
 assert.match(sw,/r\.method!==['"]GET['"]/);
});
