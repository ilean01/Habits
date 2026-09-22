const CACHE = 'habits-shell-v1';
const ASSETS = ['./','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));});
self.addEventListener('activate', event => {event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('habits-shell-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch', event => {
 const r=event.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==self.location.origin)return;
 if(r.mode==='navigate'){
  event.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put('./',copy)));}return res;}).catch(()=>caches.match('./')));return;
 }
 if(/\.(js|css|png|svg|webmanifest)$/.test(u.pathname))event.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(res=>{if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(r,copy)));}return res;})));
});
