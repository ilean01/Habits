import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makePhotoData,photoCountForDate} from '../src/day-photos.js';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('una foto de comida usa el sistema común y cuenta en el Calendario',()=>{
 const photo={id:'photo-1',...makePhotoData({date:'2026-09-26',path:'user/comida.jpg',category:'food',mealId:'meal-1'})};
 assert.equal(photo.category,'food');
 assert.equal(photo.mealId,'meal-1');
 assert.equal(photoCountForDate({photos:[photo],journals:[],date:'2026-09-26'}),1);
});

test('Groq conserva la foto privada y enlaza meal con photo',async()=>{
 const nutrition=await read('src/nutrition.js');
 assert.match(nutrition,/compressPhoto\(file\)/);
 assert.match(nutrition,/uploadDayPhoto\(prepared\.blob/);
 assert.match(nutrition,/category:'food'/);
 assert.match(nutrition,/mealId/);
 assert.match(nutrition,/photoId/);
 assert.match(nutrition,/photoPath:uploaded\.path/);
 assert.match(nutrition,/name="time"/);
 assert.match(nutrition,/name="comment"/);
 assert.doesNotMatch(nutrition,/todavía no se guarda con el registro/);
});

test('Gym y comida comparten un único compresor de imágenes',async()=>{
 const [storage,gym,nutrition]=await Promise.all([read('src/photo-storage.js'),read('src/gym.js'),read('src/nutrition.js')]);
 assert.match(storage,/export async function compressPhoto/);
 assert.match(gym,/compressPhoto\(file\)/);
 assert.match(nutrition,/compressPhoto\(file\)/);
 assert.doesNotMatch(gym,/async function shrink\(/);
});

test('Ficha del día muestra foto, hora, comentario y análisis nutricional',async()=>{
 const [main,css]=await Promise.all([read('src/main.js'),read('src/nutrition-summary.css')]);
 assert.match(main,/day-detail-meal-thumb/);
 assert.match(main,/data-day-photo/);
 assert.match(main,/m\.time/);
 assert.match(main,/m\.comment/);
 assert.match(main,/day-detail-meal-macros/);
 assert.match(css,/\.day-detail-meal-thumb/);
 assert.match(css,/\.food-view-photo/);
});
