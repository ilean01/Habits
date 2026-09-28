import * as db from './store.js';
import {downloadCompleteBackup} from './complete-backup.js';

let lastMessage='',lastAt=0;
const text=value=>String(value?.message||value||'Error inesperado').slice(0,500);

function recoveryBar(){
 let bar=document.querySelector('#global-recovery');
 if(bar)return bar;
 bar=document.createElement('aside');bar.id='global-recovery';bar.className='global-recovery';bar.hidden=true;
 bar.innerHTML='<div><strong>Habits tuvo un problema</strong><p>Tus cambios guardados siguen en este dispositivo.</p></div><div class="global-recovery-actions"><button type="button" data-recovery="retry">Reintentar</button><button type="button" data-recovery="backup">Guardar respaldo</button><button type="button" data-recovery="close" aria-label="Cerrar">×</button></div>';
 document.body.append(bar);
 bar.addEventListener('click',async event=>{const action=event.target.closest('[data-recovery]')?.dataset.recovery;if(!action)return;if(action==='close'){bar.hidden=true;return;}if(action==='retry'){bar.hidden=true;try{await db.sync();window.dispatchEvent(new CustomEvent('habits:rerender'));}catch{location.reload();}return;}if(action==='backup'){const button=event.target;button.disabled=true;try{await downloadCompleteBackup(`habits-respaldo-${new Date().toISOString().slice(0,10)}.json`);}catch(error){console.error('No se pudo crear el respaldo de recuperación:',error);}finally{button.disabled=false;}}});
 return bar;
}

export function reportGlobalError(error,{source='app'}={}){
 if(typeof document==='undefined')return;
 const message=text(error),now=Date.now();if(message===lastMessage&&now-lastAt<2500)return;lastMessage=message;lastAt=now;
 try{sessionStorage.setItem('habits-last-error',JSON.stringify({at:new Date().toISOString(),source,message,status:db.info?.().status||'unknown'}));}catch{}
 const bar=recoveryBar();bar.hidden=false;
}

if(typeof window!=='undefined'){
 window.addEventListener('error',event=>reportGlobalError(event.error||event.message,{source:'window'}));
 window.addEventListener('unhandledrejection',event=>reportGlobalError(event.reason,{source:'promise'}));
 window.addEventListener('habits:error',event=>reportGlobalError(event.detail,{source:'handled'}));
}
