import * as db from './store.js';

let timer=null;

export function resumeSync(){
  if(typeof document!=='undefined'&&document.visibilityState==='hidden')return;
  clearTimeout(timer);
  timer=setTimeout(()=>{void db.sync();},120);
}

if(typeof window!=='undefined'){
  window.addEventListener('online',resumeSync);
  window.addEventListener('focus',resumeSync);
  window.addEventListener('pageshow',resumeSync);
}
if(typeof document!=='undefined'){
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')resumeSync();
  });
}
