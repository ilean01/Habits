import fs from 'node:fs';
const once=(src,from,to,label)=>{const n=src.split(from).length-1;if(n!==1)throw new Error(`${label}: ${n} coincidencias`);return src.replace(from,to);};

let library=fs.readFileSync('src/biblioteca-main.js','utf8');
library=once(library,"const params=new URL(location.href).searchParams,embedded=params.get('embedded')==='1';\nconst root=document.querySelector('#library-app'),modal=document.querySelector('#library-modal'),initialQuery=params.get('q')?.trim()||'';","const params=new URL(location.href).searchParams,embedded=window.__habitsLibraryNative===true||params.get('embedded')==='1';\nconst root=document.querySelector('#library-app'),modal=document.querySelector('#library-modal'),initialQuery=String(window.__habitsLibraryInitialQuery||params.get('q')||'').trim();",'modo nativo');
library=library.replace('document.body.append(assistantHost);','root.append(assistantHost);');
const clickOld="document.addEventListener('click',async e=>{const el=e.target.closest('[data-action]');if(!el)return;";
const clickNew="document.addEventListener('click',async e=>{const el=e.target.closest('[data-action]');if(!el||!(root?.contains(el)||modal?.contains(el)))return;";
library=once(library,clickOld,clickNew,'aislar clicks biblioteca');
fs.writeFileSync('src/biblioteca-main.js',library);

let main=fs.readFileSync('src/main.js','utf8');
main=once(main,"import './photo-gallery.css';","import './photo-gallery.css';\nimport './library-native.css';",'css biblioteca nativa');
main=once(main,"import {mountEmbeddedLibrary} from './library-embed.js';","import {mountNativeLibrary} from './library-native-host.js';",'host biblioteca nativa');
main=main.replace("if(view==='library'&&document.querySelector('[data-library-host] iframe')){const pill=document.querySelector('.sync-pill span');if(pill)pill.textContent=syncLabel();return;}","");
main=once(main,"function unifiedLibraryView(){return `${heading('TUS LIBROS, EN UN SOLO LUGAR','Biblioteca','Catálogo, lecturas, préstamos y tu bibliotecaria.')}<section class=\"habits-library-embed\" data-library-host></section>${readingCompanionView()}`;}","function unifiedLibraryView(){return `${heading('TUS LIBROS, EN UN SOLO LUGAR','Biblioteca','Catálogo, lecturas, préstamos y tu bibliotecaria.')}<section class=\"habits-library-native\" data-library-native-host></section>${readingCompanionView()}`;}",'vista biblioteca nativa');
main=once(main,"if(view==='library')mountEmbeddedLibrary(window.libraryQuery||'');","if(view==='library')void mountNativeLibrary(document.querySelector('[data-library-native-host]'),{query:window.libraryQuery||''}).catch(err=>{console.error(err);toast('No se pudo abrir Biblioteca: '+err.message);});",'montaje biblioteca nativa');
main=main.replace("if(a==='library-search'){window.libraryQuery=el.dataset.q||'';view='library';document.querySelector('[data-library-host] iframe')?.remove();modal.close();render();return;}","if(a==='library-search'){window.libraryQuery=el.dataset.q||'';view='library';modal.close();render();return;}");
main=once(main,"document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;e.preventDefault();Promise.resolve(action(el.dataset.action,el)).catch(err=>{console.error(err);toast('No se pudo completar: '+err.message);});});","document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||e.target.closest('[data-library-native-root]'))return;e.preventDefault();Promise.resolve(action(el.dataset.action,el)).catch(err=>{console.error(err);toast('No se pudo completar: '+err.message);});});",'aislar clicks habits');
fs.writeFileSync('src/main.js',main);
