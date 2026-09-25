export const PHOTO_KIND='photo';
export const DAY_PHOTO_BUCKET='day-photos';
export const LEGACY_WORKOUT_BUCKET='workout-photos';

export const PHOTO_CATEGORIES={
 general:'General',
 workout:'Gym',
 food:'Comida'
};

const clean=value=>String(value??'').trim();
const validCategory=value=>Object.hasOwn(PHOTO_CATEGORIES,value)?value:'general';

export function normalizeDayPhoto(row,{legacy=false}={}){
 if(!row?.path||!row?.date)return null;
 const isLegacy=legacy||row.workoutPhoto===true;
 const category=isLegacy?'workout':validCategory(row.category);
 const bucket=clean(row.bucket)||(isLegacy?LEGACY_WORKOUT_BUCKET:DAY_PHOTO_BUCKET);
 const caption=clean(row.caption||row.text);
 return {
  ...row,
  id:clean(row.id),
  date:clean(row.date),
  path:clean(row.path),
  bucket,
  category,
  caption,
  text:caption,
  angle:clean(row.angle),
  at:clean(row.at),
  legacy:isLegacy,
  sourceKind:isLegacy?'journal':'photo'
 };
}

export function allDayPhotos(photoRows=[],journals=[]){
 const canonical=photoRows.map(row=>normalizeDayPhoto(row)).filter(Boolean);
 const canonicalPaths=new Set(canonical.map(row=>`${row.bucket}:${row.path}`));
 const legacy=journals
  .filter(row=>row?.workoutPhoto===true&&row?.path)
  .map(row=>normalizeDayPhoto(row,{legacy:true}))
  .filter(Boolean)
  .filter(row=>!canonicalPaths.has(`${row.bucket}:${row.path}`));
 return [...canonical,...legacy].sort((a,b)=>
  b.date.localeCompare(a.date)||(b.at||'').localeCompare(a.at||'')||(b.id||'').localeCompare(a.id||'')
 );
}

export function photosForDate({photos=[],journals=[],date,category=''}={}){
 const wanted=category&&Object.hasOwn(PHOTO_CATEGORIES,category)?category:'';
 return allDayPhotos(photos,journals).filter(row=>row.date===date&&(!wanted||row.category===wanted));
}

export function photoCountForDate(args={}){
 return photosForDate(args).length;
}

export function photoCategoryLabel(category){
 return PHOTO_CATEGORIES[validCategory(category)];
}

export function makePhotoData({date,path,bucket=DAY_PHOTO_BUCKET,category='general',caption='',angle='',at=new Date().toISOString(),...extra}={}){
 if(!clean(date)||!clean(path))throw new Error('La foto necesita fecha y archivo.');
 return {
  ...extra,
  date:clean(date),
  path:clean(path),
  bucket:clean(bucket)||DAY_PHOTO_BUCKET,
  category:validCategory(category),
  caption:clean(caption),
  angle:clean(angle),
  at:clean(at)||new Date().toISOString()
 };
}
