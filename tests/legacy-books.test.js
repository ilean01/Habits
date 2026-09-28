import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRENT_DATA_VERSION,migrationPlan,runDataMigrations} from '../src/data-migrations.js';

function mockDb(seed){
 const rows=new Map(seed.map(([id,kind,data])=>[id,{kind,data:{...data}}]));
 return {
  rows,
  records(kind){return [...rows].flatMap(([id,row])=>row.kind===kind?[{...row.data,id}]:[]);},
  put(kind,data,id){rows.set(id,{kind,data:{...data}});return id;},
  remove(id){rows.delete(id);}
 };
}

test('el plan de migraciones es versionado y llega a la versión actual',()=>{
 assert.equal(CURRENT_DATA_VERSION,2);
 assert.deepEqual(migrationPlan(0),[1,2]);
 assert.deepEqual(migrationPlan(1),[2]);
 assert.deepEqual(migrationPlan(2),[]);
});

test('la migración retira libros legados sin perder sesiones, citas ni temporizador',()=>{
 const db=mockDb([
  ['settings','settings',{name:'Ile',dataVersion:1}],
  ['book-1','book',{title:'El nombre de la rosa',author:'Umberto Eco',status:'finished',pages:500,page:500}],
  ['reading-1','reading',{bookId:'book-1',minutes:35,date:'2026-09-20'}],
  ['quote-1','quote',{bookId:'book-1',text:'Una cita',page:41}],
  ['reading-timer','timer',{bookId:'book-1',elapsed:120000,running:false}]
 ]);
 runDataMigrations(db);
 assert.equal(db.records('book').length,0);
 assert.equal(db.records('reading')[0].bookId,'');
 assert.equal(db.records('reading')[0].bookTitle,'El nombre de la rosa');
 assert.equal(db.records('reading')[0].bookAuthor,'Umberto Eco');
 assert.equal(db.records('quote')[0].bookTitle,'El nombre de la rosa');
 assert.equal(db.records('timer')[0].legacyBookTitle,'El nombre de la rosa');
 const settings=db.records('settings')[0];
 assert.equal(settings.dataVersion,2);
 assert.equal(settings.legacyBookArchiveCount,1);
 assert.equal(settings.legacyFinishedBooks,1);
});

test('la migración es idempotente y no toca referencias de la Biblioteca nueva',()=>{
 const db=mockDb([
  ['settings','settings',{name:'Ile',dataVersion:1,legacyBookArchive:[{id:'old-1',title:'Ya archivado',status:'finished'}]}],
  ['old-2','book',{title:'Viejo',status:'reading'}],
  ['r-new','reading',{bookId:'lib:77',bookTitle:'Libro nuevo'}],
  ['q-new','quote',{bookId:'lib:77',text:'Nueva'}]
 ]);
 runDataMigrations(db);
 const afterFirst=JSON.stringify(db.records('settings')[0].legacyBookArchive);
 runDataMigrations(db);
 assert.equal(JSON.stringify(db.records('settings')[0].legacyBookArchive),afterFirst);
 assert.equal(db.records('reading')[0].bookId,'lib:77');
 assert.equal(db.records('quote')[0].bookId,'lib:77');
 assert.equal(db.records('settings')[0].legacyBookArchiveCount,2);
});
