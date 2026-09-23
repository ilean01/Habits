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
  shell.innerHTML=`
    <div class="habits-library-embed-head">
      <div>
        <p class="eyebrow">TU BIBLIOTECA COMPLETA</p>
        <h2>Todo acá, sin salir de Habits</h2>
        <p class="muted">Catálogo, lecturas, préstamos, deseos, estadísticas, etiquetas, papelera, configuración y accesos.</p>
      </div>
    </div>
    <iframe class="habits-library-frame" title="Biblioteca" src="${LIBRARY_URL}" loading="eager"></iframe>`;
  content.append(shell);
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
.habits-library-embed{margin-top:22px;border:1px solid var(--line,#e6dfd5);border-radius:22px;overflow:hidden;background:var(--card,#fff);box-shadow:0 12px 32px rgba(45,50,42,.06)}
.habits-library-embed-head{padding:20px 22px 16px;border-bottom:1px solid var(--line,#e6dfd5);background:var(--card,#fff)}
.habits-library-embed-head h2{margin:.15rem 0 .35rem;font-size:1.35rem}.habits-library-embed-head p{margin:0}
.habits-library-frame{display:block;width:100%;height:calc(100dvh - 245px);min-height:720px;border:0;background:#f5f1e8}
@media(max-width:900px){.habits-library-embed{margin:14px -4px 0;border-radius:16px}.habits-library-embed-head{padding:16px}.habits-library-frame{height:calc(100dvh - 210px);min-height:680px}}
@media(max-width:600px){.habits-library-embed-head h2{font-size:1.15rem}.habits-library-frame{height:calc(100dvh - 190px);min-height:640px}}
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
