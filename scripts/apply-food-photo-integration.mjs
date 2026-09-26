import fs from 'node:fs';

function replaceOnce(source,from,to,label){
 const count=source.split(from).length-1;
 if(count!==1)throw new Error(`${label}: se esperaba 1 coincidencia y hubo ${count}`);
 return source.replace(from,to);
}

let gym=fs.readFileSync('src/gym.js','utf8');
gym=replaceOnce(gym,"import {hydrateDayPhotos,uploadDayPhoto,removeDayPhotoFile} from './photo-storage.js';","import {compressPhoto,hydrateDayPhotos,uploadDayPhoto,removeDayPhotoFile} from './photo-storage.js';",'import compresor común');
const shrink=`async function shrink(file) {\n  const bitmap = await createImageBitmap(file).catch(() => null);\n  if (!bitmap) { if (['image/jpeg','image/png','image/webp'].includes(file.type) && file.size <= 10485760) return file; throw new Error('No se pudo leer esa imagen. Probá con otra foto.'); }\n  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));\n  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);\n  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);\n  return await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('No se pudo preparar la foto.')), 'image/jpeg', 0.85));\n}\n\n`;
gym=replaceOnce(gym,shrink,'','retirar compresor duplicado');
gym=replaceOnce(gym,"    const blob = await shrink(file);\n    const uploaded = await uploadDayPhoto(blob, {bucket:DAY_PHOTO_BUCKET, extension:'jpg', contentType:'image/jpeg'});","    const prepared = await compressPhoto(file);\n    const uploaded = await uploadDayPhoto(prepared.blob, {bucket:DAY_PHOTO_BUCKET, extension:prepared.extension, contentType:prepared.contentType});",'usar compresor común en gym');
fs.writeFileSync('src/gym.js',gym);

let main=fs.readFileSync('src/main.js','utf8');
const oldMeal=" const mealRows=day.nutrition.meals.map(m=>`<button class=\"day-detail-meal\" data-action=\"food-view\" data-id=\"${esc(m.id)}\"><span><strong>${esc(m.label||m.mealTypeLabel)}</strong><small>${esc(m.mealTypeLabel)}</small></span><b>≈ ${Math.round(Number(m.totals?.calories)||0)} kcal</b></button>`).join('');";
const newMeal=" const mealRows=day.nutrition.meals.map(m=>{const photo=day.dayPhotos.find(p=>p.id===m.photoId||p.mealId===m.id);return `<button class=\"day-detail-meal ${photo?'':'no-photo'}\" data-action=\"food-view\" data-id=\"${esc(m.id)}\">${photo?`<span class=\"day-detail-meal-thumb\" data-day-photo=\"${esc(photo.path)}\" data-photo-bucket=\"${esc(photo.bucket)}\" data-photo-alt=\"${esc(m.label||'Foto de comida')}\"><span>Cargando…</span></span>`:''}<span><strong>${esc(m.label||m.mealTypeLabel)}</strong><small>${esc(m.mealTypeLabel)}${m.time?' · '+esc(m.time):''}${m.comment?' · '+esc(m.comment):''}</small><small class=\"day-detail-meal-macros\">P ${Number(m.totals?.protein)||0} g · C ${Number(m.totals?.carbs)||0} g · G ${Number(m.totals?.fat)||0} g</small></span><b>≈ ${Math.round(Number(m.totals?.calories)||0)} kcal</b></button>`;}).join('');";
main=replaceOnce(main,oldMeal,newMeal,'enriquecer comidas en ficha diaria');
fs.writeFileSync('src/main.js',main);
