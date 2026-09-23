import {mountLibraryAssistant} from './library-assistant.js';

const LIBRARY_URL='./biblioteca.html?embedded=1';

function selectedLibraryTab(){
  const tab=document.querySelector('.space-tabs [data-action="space-tab"][data-tab="biblioteca"]');
  return tab?.classList.contains('selected');
}

function mountEmbeddedLibrary(){
  if(!selectedLibraryTab())return;
  const content=document.querySelector('main.content');
  const tabs=content?.querySelector('.space-tabs');
  if(!content||!tabs)return;
  if(content.querySelector('[data-embedded-library]'))return;

  let node=tabs.nextSibling;
  while(node){
    const next=node.nextSibling;
    node.remove();
    node=next;
  }

  const shell=document.createElement('section');
  shell.className='habits-library-embed';
  shell.dataset.embeddedLibrary='true';
  shell.innerHTML=`<iframe class="habits-library-frame" title="Biblioteca" src="${LIBRARY_URL}" loading="eager"></iframe>`;
  content.append(shell);
  mountLibraryAssistant(shell);
}

function openEmbeddedLibrary(){
  const space=document.querySelector('[data-action="nav"][data-view="space"]');
  const current=document.querySelector('.space-tabs [data-tab="biblioteca"]');
  if(current){
    if(!current.classList.contains('selected'))current.click();
    else mountEmbeddedLibrary();
    return;
  }
  if(space){
    space.click();
    setTimeout(()=>{
      const tab=document.querySelector('.space-tabs [data-action="space-tab"][data-tab="biblioteca"]');
      if(tab)tab.click();
    },0);
  }
}

const style=document.createElement('style');
style.textContent=`
.habits-library-embed{position:relative;margin:10px -2px 0;overflow:visible;background:transparent}
.habits-library-frame{display:block;width:100%;height:calc(100dvh - 178px);min-height:760px;border:0;border-radius:18px;background:#f5f1e8}
@media(max-width:900px){.habits-library-embed{margin:8px -6px 0}.habits-library-frame{height:calc(100dvh - 154px);min-height:700px;border-radius:14px}}
@media(max-width:600px){.habits-library-embed{margin:6px -10px 0}.habits-library-frame{height:calc(100dvh - 132px);min-height:660px;border-radius:0}}
`;
document.head.append(style);

document.addEventListener('click',event=>{
  const legacyLink=event.target.closest('a[href="./biblioteca.html"],a[href="biblioteca.html"]');
  if(legacyLink && !legacyLink.closest('iframe')){
    event.preventDefault();
    openEmbeddedLibrary();
    return;
  }
  const tab=event.target.closest('[data-action="space-tab"][data-tab="biblioteca"]');
  if(tab)requestAnimationFrame(()=>setTimeout(mountEmbeddedLibrary,0));
});

window.addEventListener('load',()=>setTimeout(mountEmbeddedLibrary,0));
