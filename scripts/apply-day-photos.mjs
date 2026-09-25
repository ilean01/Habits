import fs from 'node:fs';

function mustReplace(source,from,to,label){
 if(!source.includes(from))throw new Error(`No se encontró ${label}`);
 return source.replace(from,to);
}

// Gym: las fotos nuevas pasan al modelo photo; las antiguas siguen visibles por compatibilidad.
{
 const path='src/gym.js';
 let src=fs.readFileSync(path,'utf8');
 src=mustReplace(src,"import * as db from './store.js';",`import * as db from './store.js';\nimport {allDayPhotos,makePhotoData,DAY_PHOTO_BUCKET} from './day-photos.js';\nimport {hydrateDayPhotos,uploadDayPhoto,removeDayPhotoFile} from './photo-storage.js';`,'imports de gym');
 src=src.replace('const urlCache = new Map();\n','');
 src=mustReplace(src,"export const photos = () => db.records('journal').filter(r => r.workoutPhoto && r.path).sort((a, b) => b.date.localeCompare(a.date) || (b.at || '').localeCompare(a.at || ''));","export const photos = () => allDayPhotos(db.records('photo'), db.records('journal')).filter(r => r.category === 'workout');",'selector de fotos de gym');
 src=src.replaceAll('data-gym-photo="${esc(p.path)}"','data-day-photo="${esc(p.path)}" data-photo-bucket="${esc(p.bucket)}" data-photo-alt="Foto de gym"');
 src=src.replace(/export async function hydrateGymPhotos\(\) \{[\s\S]*?\n\}\n\nasync function shrink/,`export async function hydrateGymPhotos() {\n  return hydrateDayPhotos();\n}\n\nasync function shrink`);
 const oldUpload=`    const blob = await shrink(file);\n    const {data:{user}} = await db.supabase.auth.getUser(); if (!user) throw new Error('Iniciá sesión de nuevo.');\n    const path = \`${'${user.id}'}/${'${crypto.randomUUID()}'}.jpg\`;\n    const {error} = await db.supabase.storage.from('workout-photos').upload(path, blob, {contentType:'image/jpeg'});\n    if (error) throw new Error('No se pudo subir la foto. Revisá la conexión.');\n    db.put('journal', {workoutPhoto:true, path, angle:f.get('angle') || 'frente', text:String(f.get('text') || ''), date:f.get('date'), at:new Date().toISOString()});`;
 const newUpload=`    const blob = await shrink(file);\n    const uploaded = await uploadDayPhoto(blob, {bucket:DAY_PHOTO_BUCKET, extension:'jpg', contentType:'image/jpeg'});\n    db.put('photo', makePhotoData({date:f.get('date'), path:uploaded.path, bucket:uploaded.bucket, category:'workout', angle:f.get('angle') || 'frente', caption:String(f.get('text') || '')}));`;
 src=mustReplace(src,oldUpload,newUpload,'subida de foto de gym');
 const oldDelete=`      if (!db.info().demo) { const {error} = await db.supabase.storage.from('workout-photos').remove([p.path]); if (error) throw error; }\n      urlCache.delete(p.path); db.remove(p.id); modal.close(); toast('Foto quitada.');`;
 const newDelete=`      if (!db.info().demo) await removeDayPhotoFile(p);\n      db.remove(p.id); modal.close(); toast('Foto quitada.');`;
 src=mustReplace(src,oldDelete,newDelete,'borrado de foto de gym');
 if(src.includes("storage.from('workout-photos')"))throw new Error('Gym todavía escribe directamente en workout-photos');
 fs.writeFileSync(path,src);
}

// Main: la ficha y el calendario consumen la colección común de fotos.
{
 const path='src/main.js';
 let src=fs.readFileSync(path,'utf8');
 src=mustReplace(src,"import { gymView, gymAction, afterGymDone, hydrateGymPhotos, GYM_AREA } from './gym.js';","import { gymView, gymAction, afterGymDone, GYM_AREA } from './gym.js';\nimport {hydrateDayPhotos} from './photo-storage.js';\nimport {photoCategoryLabel} from './day-photos.js';",'imports de fotos en main');
 src=mustReplace(src,'void hydrateGymPhotos().catch(()=>{});','void hydrateDayPhotos().catch(()=>{});','hidratación de fotos');
 src=mustReplace(src,"const day=dayDetailData({date:d,journals:rec('journal'),dailyPlans:rec('dailyPlan'),tasks:rec('task'),readings:rec('reading'),logs:rec('log')});","const day=dayDetailData({date:d,journals:rec('journal'),photos:rec('photo'),dailyPlans:rec('dailyPlan'),tasks:rec('task'),readings:rec('reading'),logs:rec('log')});",'datos de ficha diaria');
 const oldPhotos="const photos=day.workoutPhotos.map(p=>`<figure class=\"day-detail-photo\"><div class=\"gym-photo-img\" data-gym-photo=\"${esc(p.path)}\"><span>Cargando…</span></div>${p.text?`<figcaption>${esc(p.text)}</figcaption>`:''}</figure>`).join('');";
 const newPhotos="const photos=day.dayPhotos.map(p=>`<figure class=\"day-detail-photo\"><div class=\"gym-photo-img\" data-day-photo=\"${esc(p.path)}\" data-photo-bucket=\"${esc(p.bucket)}\" data-photo-alt=\"${esc(photoCategoryLabel(p.category))}\"><span>Cargando…</span></div><figcaption><strong>${esc(photoCategoryLabel(p.category))}</strong>${p.caption?`<small>${esc(p.caption)}</small>`:''}</figcaption></figure>`).join('');";
 src=mustReplace(src,oldPhotos,newPhotos,'galería de ficha diaria');
 src=src.replace("${day.workoutPhotos.length?`<span class=\"day-detail-count\">${day.workoutPhotos.length} ${day.workoutPhotos.length===1?'foto':'fotos'}</span>`:''}","${day.dayPhotos.length?`<span class=\"day-detail-count\">${day.dayPhotos.length} ${day.dayPhotos.length===1?'foto':'fotos'}</span>`:''}");
 src=src.replace('<p class="day-detail-label">Bienestar</p><h3>Gym, cuerpo y fotos</h3>','<p class="day-detail-label">Fotos y bienestar</p><h3>Momentos, gym y cuerpo</h3>');
 src=mustReplace(src,"calendarDayIndicators({date:d,journals:rec('journal'),tasks:rec('task'),logs:rec('log'),eventLogs:rec('eventLog'),habitDone})","calendarDayIndicators({date:d,journals:rec('journal'),photos:rec('photo'),tasks:rec('task'),logs:rec('log'),eventLogs:rec('eventLog'),habitDone})",'indicadores del calendario');
 if(src.includes('data-gym-photo='))throw new Error('Main todavía renderiza slots específicos de gym');
 fs.writeFileSync(path,src);
}

// Backup: reconoce metadatos photo, pero no los restaura todavía sin sus archivos privados.
{
 const path='src/extras.js';
 let src=fs.readFileSync(path,'utf8');
 src=mustReplace(src,"'word','dailyPlan']);","'word','dailyPlan','photo']);",'kinds permitidos del backup');
 src=mustReplace(src,"records.filter(r=>!db.raw(r.id)&&!r.data.workoutPhoto)","records.filter(r=>!db.raw(r.id)&&!r.data.workoutPhoto&&r.kind!=='photo')",'exclusión temporal de fotos en importación');
 fs.writeFileSync(path,src);
}

// Pruebas existentes: además de la foto antigua, comprueban una foto canónica general.
{
 const path='tests/day-detail-data.test.js';
 let src=fs.readFileSync(path,'utf8');
 src=mustReplace(src,"  tasks:[{id:'t1'", "  photos:[{id:'general-photo',date,path:'u/day.jpg',bucket:'day-photos',category:'general',caption:'Un recuerdo',at:'2026-09-25T17:00:00Z'}],\n  tasks:[{id:'t1'",'foto canónica en test de ficha');
 src=mustReplace(src," assert.equal(data.workoutPhotos.length,1);"," assert.equal(data.dayPhotos.length,2);\n assert.equal(data.workoutPhotos.length,1);\n assert.equal(data.hasPhotos,true);",'asserts de fotos de ficha');
 src=mustReplace(src," assert.equal(data.workoutPhotos.length,0);"," assert.equal(data.dayPhotos.length,0);\n assert.equal(data.workoutPhotos.length,0);\n assert.equal(data.hasPhotos,false);",'asserts de ficha vacía');
 fs.writeFileSync(path,src);
}

{
 const path='tests/calendar-day-indicators.test.js';
 let src=fs.readFileSync(path,'utf8');
 src=mustReplace(src,"  tasks:[{id:'t1'", "  photos:[{id:'general-photo',date,path:'u/day.jpg',category:'general'}],\n  tasks:[{id:'t1'",'foto canónica en test del calendario');
 src=mustReplace(src,' assert.equal(info.photos,1);',' assert.equal(info.photos,2);','conteo unificado del calendario');
 fs.writeFileSync(path,src);
}
