import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const load=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('settings remains reachable from desktop sidebar and the persistent top bar',async()=>{
 const [main,css]=await Promise.all([load('src/main.js'),load('src/accessibility.css')]);
 assert.match(main,/Ajustes','settings'/,'sidebar must expose a Settings action');
 assert.match(main,/Abrir perfil y ajustes/,'top bar must expose profile/settings');
 assert.match(main,/profile-button/,'top bar must render the persistent profile control');
 assert.match(css,/\.topbar\{position:sticky;top:0;z-index:/,'top bar must stay visible while scrolling');
 assert.match(css,/@media \(min-width:651px\)[\s\S]*\.sidebar\{height:100dvh;overflow-y:auto/,'sidebar must scroll on shorter desktop/tablet viewports');
 assert.match(css,/\.sidebar>\.nav-link:last-child\{position:sticky;bottom:0/,'desktop Settings entry must stay pinned to the bottom of the sidebar');
});

test('phone layout keeps the profile/settings control above the fixed navigation',async()=>{
 const css=await load('src/accessibility.css');
 assert.match(css,/@media \(max-width:650px\)[\s\S]*\.topbar\{top:0;z-index:25\}/);
 assert.match(css,/\.topbar \.profile-button\{min-width:44px;min-height:44px\}/);
});
