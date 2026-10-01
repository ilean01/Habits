import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { APP_NAV, mobileNavigation, mobileMoreNavigation } from '../src/app-navigation.js';

test('mobile primary and more navigation cover every app destination once', () => {
  const primary=mobileNavigation().map(([id])=>id);
  const more=mobileMoreNavigation().map(([id])=>id);
  assert.deepEqual(primary,['today','calendar','library','space']);
  assert.deepEqual(more,['meals','progress','diary']);
  assert.equal(new Set([...primary,...more]).size,APP_NAV.length);
});

test('desktop no expone Mis áreas y mobile conserva el menú global Más', async () => {
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/class="sidebar-areas"/);
  assert.match(source,/data-action="mobile-more"|,'mobile-more'/);
  assert.match(source,/function mobileMoreModal\(/);
  assert.doesNotMatch(source,/mobile-task-shortcuts/);
});
