import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('embedded library delegates vertical scrolling to the Habits page', async () => {
  const css = await readFile(new URL('../src/library-native.css', import.meta.url), 'utf8');

  assert.match(css, /\.library-native-shell[\s\S]*?overflow-y:visible/);
  assert.match(css, /\.library-native-shell \.lib-label-list\{overflow:visible\}/);
  assert.match(css, /\.library-native-shell \.lib-nav\{[\s\S]*?overflow:visible;[\s\S]*?flex-wrap:wrap/);
  assert.match(css, /\.library-native-shell \.lib-table-wrap\{[\s\S]*?overflow-y:visible;[\s\S]*?max-height:none/);
});

test('modal surfaces may still scroll independently', async () => {
  const css = await readFile(new URL('../src/library-native.css', import.meta.url), 'utf8');
  assert.match(css, /\.library-native-modal[^{]*\{[^}]*overflow:auto/);
});
