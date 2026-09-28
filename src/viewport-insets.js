export function keyboardOffset({innerHeight,visualHeight,offsetTop=0}){
 const total=Number(innerHeight)||0,visible=Number(visualHeight)||total,top=Number(offsetTop)||0;
 return Math.max(0,Math.round(total-visible-top));
}

export function applyViewportInsets(target=document.documentElement,viewport=window.visualViewport){
 if(!target||typeof window==='undefined')return {keyboard:0,height:0,open:false};
 const visualHeight=viewport?.height||window.innerHeight;
 const offsetTop=viewport?.offsetTop||0;
 const keyboard=keyboardOffset({innerHeight:window.innerHeight,visualHeight,offsetTop});
 const open=keyboard>80;
 target.style.setProperty('--visual-viewport-height',`${Math.round(visualHeight)}px`);
 target.style.setProperty('--keyboard-offset',`${keyboard}px`);
 target.dataset.keyboardOpen=open?'true':'false';
 return {keyboard,height:Math.round(visualHeight),open};
}

function installViewportTracking(){
 if(typeof window==='undefined'||typeof document==='undefined')return;
 const update=()=>applyViewportInsets(document.documentElement,window.visualViewport);
 update();
 window.addEventListener('resize',update,{passive:true});
 window.addEventListener('orientationchange',update,{passive:true});
 window.visualViewport?.addEventListener?.('resize',update,{passive:true});
 window.visualViewport?.addEventListener?.('scroll',update,{passive:true});
 document.addEventListener('focusin',()=>requestAnimationFrame(update));
 document.addEventListener('focusout',()=>setTimeout(update,80));
}

installViewportTracking();
