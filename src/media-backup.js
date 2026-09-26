import * as db from './store.js';
import {allDayPhotos,DAY_PHOTO_BUCKET} from './day-photos.js';
import {loadMedia} from './local-cache.js';
import {uploadDayPhoto} from './photo-storage.js';

const extensionFor=(type='image/jpeg')=>type==='image/png'?'png':type==='image/webp'?'webp':'jpg';

function blobToBase64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('No se pudo leer una foto para el respaldo.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.readAsDataURL(blob);});}
function base64ToBlob(data,type='image/jpeg'){const binary=atob(data),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type});}

async function photoBlob(photo){
 const owner=db.currentOwner?.();
 if(String(photo.path||'').startsWith('pending:')){const queued=owner?await loadMedia(owner,photo.id):null;if(!queued?.blob)throw new Error(`Falta el archivo local de la foto ${photo.id}.`);return queued.blob;}
 const {data,error}=await db.supabase.storage.from(photo.bucket||DAY_PHOTO_BUCKET).download(photo.path);if(error||!data)throw new Error(`No se pudo descargar una foto privada para el respaldo.`);return data;
}

export async function createFullBackup(){
 const base=db.exportData(),photos=allDayPhotos(db.records('photo'),db.records('journal')),media=[];
 if(db.info().demo)return {...base,version:2,media:[]};
 for(const photo of photos){
  const blob=await photoBlob(photo),contentType=blob.type||'image/jpeg';
  media.push({recordId:photo.id,sourceKind:photo.sourceKind||'photo',category:photo.category||'general',bucket:photo.bucket||DAY_PHOTO_BUCKET,contentType,extension:extensionFor(contentType),size:blob.size,data:await blobToBase64(blob)});
 }
 return {...base,version:2,media};
}

export async function downloadFullBackup(filename){
 const payload=await createFullBackup(),blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);return {photos:payload.media.length,size:blob.size};
}

export function backupMediaItems(value){return value?.version>=2&&Array.isArray(value.media)?value.media:[];}

export async function restoreBackupMedia(value,records=[]){
 const media=backupMediaItems(value);if(!media.length)return {restored:0,skipped:0};if(typeof navigator!=='undefined'&&navigator.onLine===false)throw new Error('Conectate a internet para restaurar los archivos de fotos.');
 const recordMap=new Map(records.map(r=>[r.id,r]));let restored=0,skipped=0;
 for(const item of media){
  if(!item?.recordId||!item.data||String(item.data).length>80*1024*1024){skipped++;continue;}
  if(db.raw(item.recordId)){skipped++;continue;}
  const record=recordMap.get(item.recordId);if(!record||!['photo','journal'].includes(record.kind)){skipped++;continue;}
  const blob=base64ToBlob(item.data,item.contentType||'image/jpeg'),uploaded=await uploadDayPhoto(blob,{bucket:item.bucket||DAY_PHOTO_BUCKET,extension:item.extension||extensionFor(item.contentType),contentType:item.contentType||'image/jpeg'});
  db.put(record.kind,{...record.data,path:uploaded.path,bucket:uploaded.bucket,pendingUpload:false},record.id);restored++;
 }
 return {restored,skipped};
}
