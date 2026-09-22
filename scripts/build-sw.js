import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const assets=(await readdir('dist/assets')).map(f=>'./assets/'+f);
const html=await readFile('dist/index.html','utf8');
const version=createHash('sha256').update(html+assets.join()).digest('hex').slice(0,12);
let sw=await readFile('public/sw.js','utf8');
sw=sw.replace("'habits-shell-v1'",JSON.stringify('habits-shell-'+version)).replace("['./','./icon.svg','./manifest.webmanifest']",JSON.stringify(['./','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest',...assets]));
await writeFile('dist/sw.js',sw);
console.log(`Offline shell: ${assets.length} compiled assets, version ${version}`);
