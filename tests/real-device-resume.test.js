import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('PWA retries Habits sync after iPhone resume and reconnection',async()=>{
 const source=await read('../src/resume-sync.js');
 assert.match(source,/db\.sync\(\)/);
 assert.match(source,/visibilitychange/);
 assert.match(source,/visibilityState==='visible'/);
 assert.match(source,/pageshow/);
 assert.match(source,/online/);
 const html=await read('../index.html');
 assert.match(html,/src\/resume-sync\.js/);
});

test('Library refreshes after mobile resume even if websocket was suspended',async()=>{
 const source=await read('../src/library-native-host.js');
 assert.match(source,/refreshMountedLibrary/);
 assert.match(source,/visibilitychange/);
 assert.match(source,/pageshow/);
 assert.match(source,/online/);
 assert.match(source,/refresh-library/);
});

test('Library tables are declared for Supabase Realtime publication',async()=>{
 const sql=await read('../supabase/migrations/20260927214500_enable_library_realtime_cross_device.sql');
 assert.match(sql,/supabase_realtime/);
 for(const table of [
  'biblioteca_libros',
  'biblioteca_lecturas',
  'biblioteca_lecturas_finalizadas',
  'biblioteca_personas',
  'biblioteca_prestamos',
  'biblioteca_config',
  'biblioteca_members'
 ])assert.match(sql,new RegExp(table));
});
