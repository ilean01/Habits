const SEGMENT_TO_VIEW={today:'today',calendar:'calendar',areas:'areas',progress:'progress',diary:'diary',library:'library',tasks:'space'};
const VIEW_TO_SEGMENT={today:'today',calendar:'calendar',areas:'areas',progress:'progress',diary:'diary',library:'library',space:'tasks'};

const clean=value=>decodeURIComponent(String(value||'')).trim().replace(/^\/+|\/+$/g,'');

export function parseRoute(hash=globalThis.location?.hash||''){
 const raw=String(hash||'').replace(/^#/,''),parts=raw.split('/').map(clean).filter(Boolean);
 const segment=parts[0]||'today',view=SEGMENT_TO_VIEW[segment]||'today';
 return {view,areaId:view==='areas'?(parts[1]||''):'',hash:routeHash({view,areaId:view==='areas'?(parts[1]||''):''})};
}

export function routeHash({view='today',areaId=''}={}){
 const segment=VIEW_TO_SEGMENT[view]||'today';
 return `#/${segment}${view==='areas'&&areaId?`/${encodeURIComponent(areaId)}`:''}`;
}

export function currentRoute(){return parseRoute();}

export function navigateRoute(route,{replace=false}={}){
 const hash=routeHash(route),url=`${location.pathname}${location.search}${hash}`;
 history[replace?'replaceState':'pushState'](null,'',url);
 window.dispatchEvent(new CustomEvent('habits:route-change',{detail:parseRoute(hash)}));
 return parseRoute(hash);
}

export function ensureRoute(){
 const parsed=currentRoute();
 if(!location.hash||location.hash!==parsed.hash)navigateRoute(parsed,{replace:true});
 return parsed;
}

export function onRouteChange(callback){
 let last='';
 const notify=event=>{
  const route=event?.detail?.view?event.detail:currentRoute(),key=route.hash;
  if(key===last&&event?.type!=='habits:route-change')return;
  last=key;callback(route);
 };
 window.addEventListener('habits:route-change',notify);
 window.addEventListener('hashchange',notify);
 window.addEventListener('popstate',notify);
 return ()=>{window.removeEventListener('habits:route-change',notify);window.removeEventListener('hashchange',notify);window.removeEventListener('popstate',notify);};
}
