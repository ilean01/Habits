import * as db from './store.js';
import {saveMedia,removeMedia,loadMedia,listMedia} from './local-cache.js';
import {DAY_PHOTO_BUCKET,LEGACY_WORKOUT_BUCKET,makePhotoData} from './day-photos.js';

const urlCache=new Map();
const localUrlCache=new Map();
const key=(bucket,path)=>`${bucket}:${path}`;
const pendingPath=id=>`pending:${id}`;
const pendingId=path=>String(path||'').startsWith('pending:')?String(path).slice(8):'';
const online=()=>typeof navigator==='undefined'||navigator.onLine!==false;

function slotInfo(slot){
 const path=slot.dataset.dayPhoto||slot.dataset.gymPhoto||'';
 const bucket=slot.dataset.photoBucket||(slot.dataset.gymPhoto?LEGACY_WORKOUT_BUCKET:DAY_PHOTO_BUCKET);
 return {path,bucket};
}

async function localPhotoUrl(path){
 const id=pendingId(path),owner=db.currentOwner?.();
 if(!id||!owner)return '';
 if(localUrlCache.has(id))return localUrlCache.get(id);
 const row=await loadMedia(owner,id);if(!row?.blob)return '';
 const url=URL.createObjectURL(row.blob);localUrlCache.set(id,url);return url;
}

export async function hydrateDayPhotos(root=document){
 const slots=[...root.querySelectorAll('[data-day-photo],[data-gym-photo]')];
 if(!slots.length)return;
 const pendingSlots=slots.filter(slot=>pendingId(slotInfo(slot).path));
 for(const slot of pendingSlots){
  const {path}=slotInfo(slot),url=await localPhotoUrl(path);
  if(url&&!slot.querySelector('img')){const img=document.createElement('img');img.src=url;img.alt=slot.dataset.photoAlt||'Foto pendiente de subir';img.loading='lazy';slot.replaceChildren(img);}else if(!url)slot.innerHTML='<span>Pendiente de sincronizar</span>';
 }
 const remoteSlots=slots.filter(slot=>!pendingId(slotInfo(slot).path));
 if(!remoteSlots.length)return;
 if(db.info().demo||!db.supabase){remoteSlots.forEach(slot=>{slot.innerHTML='<span>Foto disponible con tu cuenta</span>';});return;}
 const now=Date.now(),groups=new Map();
 for(const slot of remoteSlots){
  const {path,bucket}=slotInfo(slot);if(!path)continue;
  if(urlCache.get(key(bucket,path))?.until>now)continue;
  if(!groups.has(bucket))groups.set(bucket,new Set());groups.get(bucket).add(path);
 }
 for(const [bucket,paths] of groups){
  const list=[...paths],{data,error}=await db.supabase.storage.from(bucket).createSignedUrls(list,3600);if(error)continue;
  for(const row of data||[])if(row?.path&&row.signedUrl)urlCache.set(key(bucket,row.path),{url:row.signedUrl,until:now+55*60000});
 }
 for(const slot of remoteSlots){
  const {path,bucket}=slotInfo(slot),url=urlCache.get(key(bucket,path))?.url;
  if(url&&!slot.querySelector('img')){const img=document.createElement('img');img.src=url;img.alt=slot.dataset.photoAlt||'Foto del día';img.loading='lazy';slot.replaceChildren(img);}else if(!url)slot.innerHTML='<span>No se pudo cargar</span>';
 }
}

export async function compressPhoto(file,{maxDimension=1600,quality=.85,maxInputBytes=20*1024*1024}={}){
 if(!file?.size)throw new Error('Elegí una foto.');if(file.size>maxInputBytes)throw new Error('La foto es demasiado grande. Elegí una de hasta 20 MB.');if(file.type&&!file.type.startsWith('image/'))throw new Error('Elegí un archivo de imagen.');
 const bitmap=typeof createImageBitmap==='function'?await createImageBitmap(file).catch(()=>null):null;
 if(!bitmap){if(['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=10*1024*1024){const extension=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';return {blob:file,extension,contentType:file.type,originalSize:file.size,size:file.size,width:null,height:null};}throw new Error('No se pudo preparar esa imagen. Probá con otra foto.');}
 try{const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se pudo preparar la foto.');ctx.drawImage(bitmap,0,0,width,height);const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('No se pudo preparar la foto.')),'image/jpeg',quality));return {blob,extension:'jpg',contentType:'image/jpeg',originalSize:file.size,size:blob.size,width,height};}finally{bitmap.close?.();}
}

export async function uploadDayPhoto(blob,{bucket=DAY_PHOTO_BUCKET,extension='jpg',contentType='image/jpeg'}={}){
 if(db.info().demo)throw new Error('Iniciá sesión para guardar fotos privadas.');const {data:{user}}=await db.supabase.auth.getUser();if(!user)throw new Error('Iniciá sesión de nuevo.');const safeExtension=String(extension||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg',path=`${user.id}/${crypto.randomUUID()}.${safeExtension}`;const {error}=await db.supabase.storage.from(bucket).upload(path,blob,{contentType});if(error)throw new Error('No se pudo subir la foto. Revisá la conexión.');return {path,bucket};
}

async function queuePreparedPhoto(id,prepared,data){
 const owner=db.currentOwner?.();if(!owner||owner==='demo')throw new Error('Iniciá sesión para guardar fotos privadas.');
 await saveMedia(owner,id,{blob:prepared.blob,extension:prepared.extension,contentType:prepared.contentType,createdAt:new Date().toISOString()});
 const record=makePhotoData({...data,path:pendingPath(id),bucket:data.bucket||DAY_PHOTO_BUCKET});db.put('photo',{...record,pendingUpload:true},id);return {id,pending:true,record:{...record,id,pendingUpload:true}};
}

export async function saveDayPhoto(prepared,data={},options={}){
 const id=options.id||crypto.randomUUID();if(!online())return queuePreparedPhoto(id,prepared,data);
 try{const uploaded=await uploadDayPhoto(prepared.blob,{bucket:data.bucket||DAY_PHOTO_BUCKET,extension:prepared.extension,contentType:prepared.contentType});const record=makePhotoData({...data,path:uploaded.path,bucket:uploaded.bucket});db.put('photo',{...record,pendingUpload:false},id);return {id,pending:false,record:{...record,id,pendingUpload:false}};}
 catch(error){if(!online()||/conex|network|fetch|offline/i.test(String(error?.message||'')))return queuePreparedPhoto(id,prepared,data);throw error;}
}

export const pendingPhotoCount=()=>db.records('photo').filter(p=>p.pendingUpload||pendingId(p.path)).length;
export async function queuedPhotoItems(){const owner=db.currentOwner?.();return owner?listMedia(owner):[];}

export async function processPhotoQueue(){
 const owner=db.currentOwner?.();if(!owner||owner==='demo'||!online())return {uploaded:0,pending:pendingPhotoCount()};let uploaded=0;
 for(const item of await listMedia(owner)){
  const raw=db.raw(item.id);if(!raw||raw.deleted||raw.kind!=='photo'){await removeMedia(owner,item.id);continue;}
  try{const result=await uploadDayPhoto(item.blob,{bucket:raw.data.bucket||DAY_PHOTO_BUCKET,extension:item.extension||'jpg',contentType:item.contentType||'image/jpeg'});db.put('photo',{...raw.data,path:result.path,bucket:result.bucket,pendingUpload:false},item.id);await removeMedia(owner,item.id);const local=localUrlCache.get(item.id);if(local){URL.revokeObjectURL(local);localUrlCache.delete(item.id);}uploaded++;}catch{break;}
 }
 return {uploaded,pending:pendingPhotoCount()};
}

export async function removeDayPhotoFile(photo){
 if(!photo?.path||db.info().demo)return;if(pendingId(photo.path)){const owner=db.currentOwner?.();if(owner)await removeMedia(owner,pendingId(photo.path));return;}
 const bucket=photo.bucket||DAY_PHOTO_BUCKET,{error}=await db.supabase.storage.from(bucket).remove([photo.path]);if(error)throw error;urlCache.delete(key(bucket,photo.path));
}

export async function deleteDayPhoto(photo){
 if(!photo?.id)return;await removeDayPhotoFile(photo);
 if(photo.mealId){const meal=db.records('meal').find(m=>m.id===photo.mealId);if(meal?.photoId===photo.id)db.put('meal',{...meal,photoId:''},meal.id);}
 db.remove(photo.id);forgetDayPhotoUrl(photo);
}

export function forgetDayPhotoUrl(photo){
 if(!photo)return;const id=pendingId(photo.path);if(id&&localUrlCache.has(id)){URL.revokeObjectURL(localUrlCache.get(id));localUrlCache.delete(id);}if(photo.path)urlCache.delete(key(photo.bucket||DAY_PHOTO_BUCKET,photo.path));
}

if(typeof window!=='undefined')window.addEventListener('online',()=>{void processPhotoQueue();});
