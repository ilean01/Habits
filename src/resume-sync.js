import './pull-to-refresh.css';
import * as db from './store.js';

const RESUME_MIN_INTERVAL=12000;
const PULL_TRIGGER=72;
const PULL_MAX=112;
let timer=null;
let inFlight=null;
let lastLifecycleSync=0;
let pullStartY=null;
let pullDistance=0;
let pullEligible=false;
let indicator=null;
let hideTimer=null;

const now=()=>Date.now();
const isVisible=()=>typeof document==='undefined'||document.visibilityState!=='hidden';
const atTop=()=>{
 if(typeof window==='undefined'||typeof document==='undefined')return false;
 const scroller=document.scrollingElement||document.documentElement;
 return (window.scrollY||scroller?.scrollTop||0)<=0;
};

function ensureIndicator(){
 if(typeof document==='undefined')return null;
 if(indicator?.isConnected)return indicator;
 indicator=document.createElement('div');
 indicator.className='pull-refresh-indicator';
 indicator.setAttribute('role','status');
 indicator.setAttribute('aria-live','polite');
 indicator.innerHTML='<span class="pull-refresh-spinner" aria-hidden="true">↻</span><span data-pull-label>Deslizá para actualizar</span>';
 document.body.append(indicator);
 return indicator;
}

function setIndicator(state,label,distance=0){
 const el=ensureIndicator();if(!el)return;
 clearTimeout(hideTimer);el.dataset.state=state;
 el.style.setProperty('--pull-distance',`${Math.min(PULL_MAX,Math.max(0,distance))}px`);
 const text=el.querySelector('[data-pull-label]');if(text)text.textContent=label;
 el.classList.toggle('visible',state!=='idle');
}
function hideIndicator(delay=0){
 clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!indicator)return;indicator.dataset.state='idle';indicator.classList.remove('visible');indicator.style.setProperty('--pull-distance','0px');},delay);
}
function refreshSidecars(reason){
 if(typeof window==='undefined')return;
 window.dispatchEvent(new CustomEvent('habits:library-data-changed',{detail:{reason}}));
 window.dispatchEvent(new CustomEvent('habits:sync-complete',{detail:{reason,status:db.info().status,lastSync:db.info().lastSync}}));
}

export async function syncNow({reason='manual',showIndicator=false}={}){
 if(inFlight)return inFlight;
 if(!isVisible()&&reason!=='online')return;
 if(showIndicator)setIndicator('syncing','Actualizando…',PULL_TRIGGER);
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('habits:sync-start',{detail:{reason}}));
 inFlight=(async()=>{
  try{
   await db.sync();lastLifecycleSync=now();refreshSidecars(reason);
   const state=db.info().status;
   if(showIndicator){
    if(state==='offline')setIndicator('offline','Sin conexión · tus cambios siguen guardados',PULL_TRIGGER);
    else if(state==='error')setIndicator('error','No se pudo actualizar',PULL_TRIGGER);
    else setIndicator('done','✓ Actualizado',PULL_TRIGGER);
    hideIndicator(state==='synced'||state==='pending'?900:1800);
   }
   return db.info();
  }catch(error){
   if(showIndicator){setIndicator('error','No se pudo actualizar',PULL_TRIGGER);hideIndicator(1800);}
   if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('habits:sync-error',{detail:{reason,message:error?.message||String(error)}}));
   throw error;
  }finally{inFlight=null;}
 })();
 return inFlight;
}
function lifecycleSync(reason,{force=false}={}){
 if(!isVisible())return;clearTimeout(timer);
 timer=setTimeout(()=>{if(!force&&now()-lastLifecycleSync<RESUME_MIN_INTERVAL)return;void syncNow({reason}).catch(()=>{});},140);
}
function resetPull(){pullStartY=null;pullDistance=0;pullEligible=false;}
function onTouchStart(event){
 if(event.touches?.length!==1||!atTop())return resetPull();
 if(document.querySelector('dialog[open]'))return resetPull();
 pullEligible=true;pullStartY=event.touches[0].clientY;pullDistance=0;
}
function onTouchMove(event){
 if(!pullEligible||pullStartY===null||event.touches?.length!==1)return;
 const dy=event.touches[0].clientY-pullStartY;
 if(dy<=0){pullDistance=0;hideIndicator();return;}
 pullDistance=Math.min(PULL_MAX,dy*0.55);
 if(dy>8&&event.cancelable)event.preventDefault();
 if(pullDistance>=PULL_TRIGGER)setIndicator('ready','Soltá para actualizar',pullDistance);
 else setIndicator('pulling','Deslizá para actualizar',pullDistance);
}
function onTouchEnd(){
 if(!pullEligible)return resetPull();const shouldRefresh=pullDistance>=PULL_TRIGGER;resetPull();
 if(shouldRefresh)void syncNow({reason:'pull',showIndicator:true}).catch(()=>{});else hideIndicator();
}

if(typeof window!=='undefined'){
 // store.js ya controla online/offline/focus. Aquí cubrimos reanudación PWA y gesto táctil sin duplicar esos listeners.
 window.addEventListener('pageshow',event=>lifecycleSync(event.persisted?'pageshow-cache':'pageshow'));
 window.addEventListener('touchstart',onTouchStart,{passive:true});
 window.addEventListener('touchmove',onTouchMove,{passive:false});
 window.addEventListener('touchend',onTouchEnd,{passive:true});
 window.addEventListener('touchcancel',()=>{resetPull();hideIndicator();},{passive:true});
}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')lifecycleSync('visible',{force:true});});
