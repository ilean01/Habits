import * as db from './store.js';
import {DAY_PHOTO_BUCKET,LEGACY_WORKOUT_BUCKET} from './day-photos.js';

const urlCache=new Map();
const key=(bucket,path)=>`${bucket}:${path}`;

function slotInfo(slot){
 const path=slot.dataset.dayPhoto||slot.dataset.gymPhoto||'';
 const bucket=slot.dataset.photoBucket||(slot.dataset.gymPhoto?LEGACY_WORKOUT_BUCKET:DAY_PHOTO_BUCKET);
 return {path,bucket};
}

export async function hydrateDayPhotos(root=document){
 const slots=[...root.querySelectorAll('[data-day-photo],[data-gym-photo]')];
 if(!slots.length)return;
 if(db.info().demo||!db.supabase){
  slots.forEach(slot=>{slot.innerHTML='<span>Foto disponible con tu cuenta</span>';});
  return;
 }
 const now=Date.now(),groups=new Map();
 for(const slot of slots){
  const {path,bucket}=slotInfo(slot);if(!path)continue;
  if(urlCache.get(key(bucket,path))?.until>now)continue;
  if(!groups.has(bucket))groups.set(bucket,new Set());
  groups.get(bucket).add(path);
 }
 for(const [bucket,paths] of groups){
  const list=[...paths];
  const {data,error}=await db.supabase.storage.from(bucket).createSignedUrls(list,3600);
  if(error)continue;
  for(const row of data||[])if(row?.path&&row.signedUrl)urlCache.set(key(bucket,row.path),{url:row.signedUrl,until:now+55*60000});
 }
 for(const slot of slots){
  const {path,bucket}=slotInfo(slot),url=urlCache.get(key(bucket,path))?.url;
  if(url&&!slot.querySelector('img')){
   const alt=slot.dataset.photoAlt||'Foto del día';
   const img=document.createElement('img');img.src=url;img.alt=alt;img.loading='lazy';
   slot.replaceChildren(img);
  }else if(!url)slot.innerHTML='<span>No se pudo cargar</span>';
 }
}

export async function uploadDayPhoto(blob,{bucket=DAY_PHOTO_BUCKET,extension='jpg',contentType='image/jpeg'}={}){
 if(db.info().demo)throw new Error('Iniciá sesión para guardar fotos privadas.');
 const {data:{user}}=await db.supabase.auth.getUser();
 if(!user)throw new Error('Iniciá sesión de nuevo.');
 const safeExtension=String(extension||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
 const path=`${user.id}/${crypto.randomUUID()}.${safeExtension}`;
 const {error}=await db.supabase.storage.from(bucket).upload(path,blob,{contentType});
 if(error)throw new Error('No se pudo subir la foto. Revisá la conexión.');
 return {path,bucket};
}

export async function removeDayPhotoFile(photo){
 if(!photo?.path||db.info().demo)return;
 const bucket=photo.bucket||DAY_PHOTO_BUCKET;
 const {error}=await db.supabase.storage.from(bucket).remove([photo.path]);
 if(error)throw error;
 urlCache.delete(key(bucket,photo.path));
}

export function forgetDayPhotoUrl(photo){
 if(photo?.path)urlCache.delete(key(photo.bucket||DAY_PHOTO_BUCKET,photo.path));
}
