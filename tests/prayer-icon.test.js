import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('habit icon picker includes praying hands for prayer habits',async()=>{
 const domain=await read('../src/domain.js');
 const main=await read('../src/main.js');
 assert.match(domain,/PrayingHands/);
 assert.match(main,/lucide-praying-hands/);
 assert.match(main,/name==='PrayingHands'/);
 assert.match(main,/ICONS\.map/);
});
