let shell=null;
let modulePromise=null;
let lastQuery='';

function createShell(){
 const node=document.createElement('section');
 node.className='library-native-shell';
 node.dataset.libraryNativeRoot='';
 node.innerHTML='<div id="library-app" class="library-native-app" aria-live="polite"></div><dialog id="library-modal" class="library-native-modal"></dialog><div id="library-toast" class="library-native-toast" role="status" aria-live="polite"></div>';
 return node;
}

async function waitForCatalog(){
 for(let i=0;i<40;i++){
  const input=shell?.querySelector('#catalog-q');
  if(input)return input;
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 return null;
}

async function applyQuery(query){
 const q=String(query||'').trim();
 if(!q||q===lastQuery)return;
 const catalogButton=shell?.querySelector('[data-action="view"][data-view="catalogo"]');
 if(catalogButton)catalogButton.click();
 const input=await waitForCatalog();
 if(!input)return;
 input.value=q;
 shell.querySelector('[data-action="apply-filters"]')?.click();
 lastQuery=q;
}

export async function mountNativeLibrary(host,{query='',bookId=''}={}){
 if(!host)return;
 if(!shell)shell=createShell();
 if(shell.parentElement!==host)host.replaceChildren(shell);
 shell.hidden=false;
 window.__habitsLibraryNative=true;
 window.__habitsLibraryInitialQuery=String(query||'').trim();
 if(!modulePromise)modulePromise=import('./biblioteca-main.js');
 await modulePromise;
 shell.dataset.libraryMounted='true';
 await applyQuery(query);
 if(bookId)window.dispatchEvent(new CustomEvent('habits:library-open-book',{detail:{id:Number(bookId)}}));
}

export function detachNativeLibrary(){
 if(shell?.isConnected)shell.remove();
}

export function nativeLibraryMounted(){return !!shell?.dataset.libraryMounted;}
