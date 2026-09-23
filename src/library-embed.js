import './library-integration.css';

const MESSAGE_SOURCE='habits-library';
let listenerInstalled=false;

function appearance(){
  return {
    theme:document.documentElement.dataset.theme||'light',
    large:document.documentElement.classList.contains('large'),
    quiet:document.documentElement.classList.contains('quiet')
  };
}

function sendAppearance(frame){
  if(!frame?.contentWindow)return;
  frame.contentWindow.postMessage({source:'habits-shell',type:'appearance',...appearance()},location.origin);
}

function installMessageListener(){
  if(listenerInstalled)return;
  listenerInstalled=true;
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.data?.source!==MESSAGE_SOURCE)return;
    const frame=document.querySelector('.habits-library-frame');
    if(!frame||event.source!==frame.contentWindow)return;
    if(event.data.type==='resize'){
      const height=Math.max(520,Math.min(30000,Number(event.data.height)||0));
      if(height)frame.style.height=`${height}px`;
    }
    if(event.data.type==='ready')sendAppearance(frame);
    if(event.data.type==='context'){
      frame.dataset.libraryName=event.data.name||'Biblioteca';
      frame.dataset.libraryRole=event.data.role||'';
    }
  });
}

export function mountEmbeddedLibrary(query='') {
  const host=document.querySelector('[data-library-host]');
  if(!host)return;
  installMessageListener();
  let frame=host.querySelector('iframe');
  if(frame){sendAppearance(frame);return;}
  frame=document.createElement('iframe');
  frame.className='habits-library-frame';
  frame.title='Biblioteca de Habits';
  frame.setAttribute('loading','eager');
  const url=new URL('./biblioteca.html',location.href);
  url.searchParams.set('embedded','1');
  if(query)url.searchParams.set('q',query);
  frame.src=url.href;
  frame.addEventListener('load',()=>sendAppearance(frame));
  host.append(frame);
  const observer=new MutationObserver(()=>sendAppearance(frame));
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','class']});
  frame.addEventListener('load',()=>{
    if(!frame.isConnected)observer.disconnect();
  },{once:false});
}
