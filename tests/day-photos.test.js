import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {allDayPhotos,photosForDate,makePhotoData,DAY_PHOTO_BUCKET,LEGACY_WORKOUT_BUCKET} from '../src/day-photos.js';

test('combina fotos nuevas y fotos viejas de gym en un solo sistema',()=>{
 const photos=[
  {id:'p1',date:'2026-09-25',path:'u/general.jpg',bucket:DAY_PHOTO_BUCKET,category:'general',caption:'Paseo',at:'2026-09-25T12:00:00Z'},
  {id:'p2',date:'2026-09-25',path:'u/gym-new.jpg',bucket:DAY_PHOTO_BUCKET,category:'workout',angle:'frente',at:'2026-09-25T18:00:00Z'}
 ];
 const journals=[
  {id:'legacy',date:'2026-09-25',workoutPhoto:true,path:'u/gym-old.jpg',angle:'perfil',text:'Antes',at:'2026-09-25T09:00:00Z'},
  {id:'diary',date:'2026-09-25',mood:4,text:'Bien'}
 ];
 const rows=allDayPhotos(photos,journals);
 assert.equal(rows.length,3);
 assert.equal(rows.filter(r=>r.category==='workout').length,2);
 assert.equal(rows.find(r=>r.id==='legacy').bucket,LEGACY_WORKOUT_BUCKET);
 assert.equal(rows.find(r=>r.id==='legacy').legacy,true);
 assert.equal(rows.find(r=>r.id==='p1').caption,'Paseo');
});

test('no duplica una foto antigua si ya existe una referencia canónica al mismo archivo',()=>{
 const photos=[{id:'canonical',date:'2026-09-25',path:'u/same.jpg',bucket:LEGACY_WORKOUT_BUCKET,category:'workout'}];
 const journals=[{id:'legacy',date:'2026-09-25',workoutPhoto:true,path:'u/same.jpg'}];
 assert.equal(allDayPhotos(photos,journals).length,1);
});

test('filtra por fecha y categoría',()=>{
 const photos=[
  {id:'a',date:'2026-09-25',path:'a.jpg',category:'general'},
  {id:'b',date:'2026-09-25',path:'b.jpg',category:'workout'},
  {id:'c',date:'2026-09-24',path:'c.jpg',category:'general'}
 ];
 assert.deepEqual(photosForDate({photos,date:'2026-09-25'}).map(r=>r.id).sort(),['a','b']);
 assert.deepEqual(photosForDate({photos,date:'2026-09-25',category:'workout'}).map(r=>r.id),['b']);
});

test('crea registros canónicos preparados para categorías futuras',()=>{
 const row=makePhotoData({date:'2026-09-25',path:'u/x.jpg',category:'food',caption:'Almuerzo',at:'2026-09-25T13:00:00Z'});
 assert.equal(row.bucket,DAY_PHOTO_BUCKET);
 assert.equal(row.category,'food');
 assert.equal(row.caption,'Almuerzo');
});

test('Supabase acepta kind photo y mantiene el bucket privado',()=>{
 const sql=fs.readFileSync(new URL('../supabase/migrations/20260925193000_day_photos.sql',import.meta.url),'utf8');
 assert.match(sql,/dailyPlan','photo/);
 assert.match(sql,/values \('day-photos','day-photos',false/);
 assert.match(sql,/auth\.uid\(\)::text/);
});
