import {allDayPhotos,photoCategoryLabel} from './day-photos.js';
import {pendingPhotoCount} from './photo-storage.js';

const FILTERS=[['all','Todas'],['food','Comida'],['workout','Gym'],['general','General']];

export function photoGalleryView({photos=[],journals=[],filter='all',esc,btn,prettyDate}={}){
 const selected=FILTERS.some(([id])=>id===filter)?filter:'all';
 const rows=allDayPhotos(photos,journals).filter(p=>selected==='all'||p.category===selected);
 const groups=new Map();for(const photo of rows){if(!groups.has(photo.date))groups.set(photo.date,[]);groups.get(photo.date).push(photo);}
 const chips=FILTERS.map(([id,label])=>btn(label,'photo-filter',`data-filter="${id}" aria-pressed="${selected===id}"`,selected===id?'chip selected':'chip')).join('');
 const pending=pendingPhotoCount();
 const content=[...groups].map(([date,items])=>`<section class="photo-day-group"><div class="photo-day-head"><div><p class="eyebrow">${esc(prettyDate(date,{weekday:'long'}))}</p><h3>${esc(prettyDate(date,{day:'numeric',month:'long',year:'numeric'}))}</h3></div><span>${items.length} ${items.length===1?'foto':'fotos'}</span></div><div class="photo-gallery-grid">${items.map(p=>`<figure class="photo-gallery-card"><div class="photo-gallery-image" data-day-photo="${esc(p.path)}" data-photo-bucket="${esc(p.bucket)}" data-photo-alt="${esc(photoCategoryLabel(p.category))}"><span>${p.pendingUpload?'Pendiente':'Cargando…'}</span></div><figcaption><div><strong>${esc(photoCategoryLabel(p.category))}</strong>${p.pendingUpload?'<small class="photo-pending-badge">Pendiente de subir</small>':''}${p.caption?`<small>${esc(p.caption)}</small>`:''}</div>${!p.legacy?btn('Quitar','photo-delete',`data-id="${esc(p.id)}"`,'text-button danger small'):''}</figcaption></figure>`).join('')}</div></section>`).join('');
 return `<section class="panel photo-gallery-panel"><div class="section-title photo-gallery-title"><div><p class="eyebrow">FOTOS</p><h2>Tu historia en imágenes</h2><p>Comida, gym y momentos generales ordenados por fecha.</p></div>${pending?`<button class="photo-queue-pill" data-action="photo-queue"><strong>${pending}</strong> pendiente${pending===1?'':'s'}</button>`:''}</div><div class="chips photo-gallery-filters">${chips}</div>${content||'<div class="empty"><p>Todavía no hay fotos en este filtro.</p></div>'}</section>`;
}

export function photoQueueStatusView({btn}={}){
 const pending=pendingPhotoCount();
 return `<section class="photo-queue-status"><div><strong>${pending?`${pending} ${pending===1?'foto pendiente':'fotos pendientes'}`:'Fotos al día'}</strong><p>${pending?'Se guardaron en este dispositivo y subirán cuando vuelva internet.':'No hay archivos esperando una conexión.'}</p></div>${pending?btn('Reintentar ahora','photo-queue-retry','','button outline'):''}</section>`;
}
