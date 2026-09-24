const CACHE='habits-shell-v2';
const ASSETS=['./','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('habits-shell-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const r=event.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
 if(r.mode==='navigate'){event.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(u.pathname.endsWith('/biblioteca.html')?'./biblioteca.html':'./',copy)));}return res;}).catch(()=>caches.match(u.pathname.endsWith('/biblioteca.html')?'./biblioteca.html':'./')));return;}
 if(/\.(js|css|png|svg|webmanifest)$/.test(u.pathname))event.respondWith(caches.match(r).then(cached=>cached||fetch(r).then(res=>{if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(r,copy)));}return res;})));
});
self.addEventListener('push',event=>{
 let p={};try{p=event.data?.json()||{};}catch{}
 const data={date:/^\d{4}-\d{2}-\d{2}$/.test(p.date)?p.date:'',view:p.view||'today',url:p.url||'./'};
 event.waitUntil(self.registration.showNotification(p.title||'Habits',{body:p.body||'Tenés una actividad pendiente.',icon:'./icon-192.png',badge:'./icon-192.png',tag:p.tag||'habits-reminder',renotify:false,data}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
  if(existing){await existing.focus();existing.postMessage({type:'habits-notification-click',...event.notification.data});return;}
  const url=new URL(event.notification.data?.url||'./',self.registration.scope);if(event.notification.data?.date)url.searchParams.set('date',event.notification.data.date);await self.clients.openWindow(url.href);
 })());
});
