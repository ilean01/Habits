import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {readFile} from 'node:fs/promises';
import {saveMedia,loadMedia,listMedia,removeMedia,resetLocalCacheForTests} from '../src/local-cache.js';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('IndexedDB conserva blobs de fotos pendientes por usuario',async()=>{
 await resetLocalCacheForTests();
 const blob=new Blob(['foto'],{type:'image/jpeg'});
 await saveMedia('u1','p1',{blob,extension:'jpg',contentType:'image/jpeg'});
 const one=await loadMedia('u1','p1');
 assert.equal(one.blob.size,4);
 assert.equal((await listMedia('u1')).length,1);
 assert.equal((await listMedia('u2')).length,0);
 await removeMedia('u1','p1');
 assert.equal(await loadMedia('u1','p1'),null);
});

test('fotos offline usan path pendiente y se procesan al volver internet',async()=>{
 const [storage,store]=await Promise.all([read('src/photo-storage.js'),read('src/store.js')]);
 assert.match(store,/export const currentOwner=/);
 assert.match(storage,/pending:\$\{id\}/);
 assert.match(storage,/saveMedia\(owner,id/);
 assert.match(storage,/export async function processPhotoQueue/);
 assert.match(storage,/window\.addEventListener\('online'/);
 assert.match(storage,/db\.put\('photo'.*pendingUpload:true/s);
});

test('Progreso incluye galeria cronologica filtrable y cola visible',async()=>{
 const [main,gallery,css]=await Promise.all([read('src/main.js'),read('src/photo-gallery.js'),read('src/photo-gallery.css')]);
 assert.match(main,/photoGalleryView\(/);
 assert.match(main,/photoQueueStatusView/);
 assert.match(main,/a==='photo-filter'/);
 assert.match(main,/a==='photo-queue-retry'/);
 assert.match(gallery,/Todas/);
 assert.match(gallery,/Comida/);
 assert.match(gallery,/Gym/);
 assert.match(gallery,/General/);
 assert.match(gallery,/photo-day-group/);
 assert.match(css,/\.photo-gallery-grid/);
});

test('borrado comun elimina archivo y desacopla la comida',async()=>{
 const storage=await read('src/photo-storage.js');
 assert.match(storage,/export async function deleteDayPhoto/);
 assert.match(storage,/meal\?\.photoId===photo\.id/);
 assert.match(storage,/db\.put\('meal',\{\.\.\.meal,photoId:''\}/);
 assert.match(storage,/db\.remove\(photo\.id\)/);
});
