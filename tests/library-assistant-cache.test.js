import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnapshotCache} from '../src/library-assistant-cache.js';

test('varias preguntas reutilizan una sola carga del catálogo',async()=>{
 let calls=0,clock=1000;
 const load=createSnapshotCache(async()=>{calls++;return {books:[{id:1}]};},{ttl:120000,now:()=>clock});
 const [a,b,c]=await Promise.all([load(),load(),load()]);
 assert.equal(calls,1);
 assert.equal(a,b);assert.equal(b,c);
 await load();
 assert.equal(calls,1);
 clock+=120001;
 await load();
 assert.equal(calls,2);
});

test('la caché puede invalidarse al cambiar la biblioteca',async()=>{
 let calls=0;
 const load=createSnapshotCache(async()=>({version:++calls}),{ttl:999999});
 assert.equal((await load()).version,1);
 load.invalidate();
 assert.equal((await load()).version,2);
});
