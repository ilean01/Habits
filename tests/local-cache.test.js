import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {resetLocalCacheForTests,saveRecord,savePending,saveConflict,saveMeta,loadOwner,removePending,removeConflict} from '../src/local-cache.js';

test('IndexedDB conserva registros por separado y cursor incremental',async()=>{
 await resetLocalCacheForTests();
 await saveRecord('u1','a',{id:'a',kind:'habit',data:{name:'A'},rev:1,deleted:false});
 await saveRecord('u1','b',{id:'b',kind:'habit',data:{name:'B'},rev:2,deleted:false});
 await saveMeta('u1',{lastSync:'2026-09-22T12:00:00.000Z'});
 const state=await loadOwner('u1');
 assert.equal(state.records.a.data.name,'A');assert.equal(state.records.b.rev,2);assert.equal(state.meta.lastSync,'2026-09-22T12:00:00.000Z');
});

test('IndexedDB persiste cola y conflictos sin reescribir otros registros',async()=>{
 await resetLocalCacheForTests();
 const pending={id:'a',kind:'habit',data:{name:'local'},expected:1,op:'00000000-0000-4000-8000-000000000001'};
 const conflict={id:'a',local:pending,remote:{id:'a',kind:'habit',data:{name:'remote'},rev:2}};
 await savePending('u1','a',pending);await saveConflict('u1','a',conflict);
 let state=await loadOwner('u1');assert.equal(state.pending.a.data.name,'local');assert.equal(state.conflicts.a.remote.rev,2);
 await removePending('u1','a');await removeConflict('u1','a');state=await loadOwner('u1');assert.deepEqual(state.pending,{});assert.deepEqual(state.conflicts,{});
});
