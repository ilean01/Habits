import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyBookRetirementPlan,retireLegacyBooks} from '../src/legacy-book-retirement.js';

test('retira libros legados sin perder títulos de sesiones y citas',()=>{
 const plan=legacyBookRetirementPlan({
  books:[{id:'book-1',title:'El nombre de la rosa',author:'Umberto Eco',status:'finished',pages:500,page:500}],
  readings:[{id:'reading-1',bookId:'book-1',minutes:35,date:'2026-09-20'}],
  quotes:[{id:'quote-1',bookId:'book-1',text:'Una cita',page:41}],
  timers:[{id:'reading-timer',bookId:'book-1',elapsed:120000,running:false}],
  settings:{id:'settings',name:'Ile'}
 });
 assert.equal(plan.retired,1);
 assert.equal(plan.bookArchives[0].id,'book-1');
 assert.equal(plan.bookArchives[0].data.legacyRetired,true);
 assert.deepEqual(plan.readingUpdates[0].data.bookId,'');
 assert.equal(plan.readingUpdates[0].data.bookTitle,'El nombre de la rosa');
 assert.equal(plan.readingUpdates[0].data.bookAuthor,'Umberto Eco');
 assert.equal(plan.readingUpdates[0].data.legacyBookId,'book-1');
 assert.equal(plan.quoteUpdates[0].data.bookTitle,'El nombre de la rosa');
 assert.equal(plan.timerUpdates[0].data.legacyBookTitle,'El nombre de la rosa');
 assert.equal(plan.settings.legacyFinishedBooks,1);
 assert.equal(plan.settings.legacyBookArchiveCount,1);
});

test('no toca referencias de la Biblioteca nueva y cuenta archivos previos sin duplicarlos',()=>{
 const plan=legacyBookRetirementPlan({
  books:[{id:'old-2',title:'Viejo',status:'reading'}],
  archives:[{id:'old-1',title:'Ya archivado',status:'finished'}],
  readings:[{id:'r-new',bookId:'lib:77',bookTitle:'Libro nuevo'}],
  quotes:[{id:'q-new',bookId:'lib:77',text:'Nueva'}],
  settings:{id:'settings',legacyFinishedBooks:0}
 });
 assert.equal(plan.readingUpdates.length,0);
 assert.equal(plan.quoteUpdates.length,0);
 assert.equal(plan.settings.legacyBookArchiveCount,2);
 assert.equal(plan.settings.legacyFinishedBooks,1);
});

test('retireLegacyBooks elimina el kind book pero conserva un archivo interno',()=>{
 const rows=new Map([
  ['settings',{kind:'settings',data:{name:'Ile'}}],
  ['book-1',{kind:'book',data:{title:'Libro viejo',author:'Autora',status:'finished'}}],
  ['reading-1',{kind:'reading',data:{bookId:'book-1',minutes:20,date:'2026-09-20'}}]
 ]);
 const db={
  records(kind){return [...rows].flatMap(([id,row])=>row.kind===kind?[{...row.data,id}]:[]);},
  put(kind,data,id){rows.set(id,{kind,data:{...data}});return id;}
 };
 assert.equal(retireLegacyBooks(db),1);
 assert.equal(db.records('book').length,0);
 assert.equal(db.records('legacyBookArchive').length,1);
 assert.equal(db.records('reading')[0].bookTitle,'Libro viejo');
 assert.equal(db.records('reading')[0].bookId,'');
 assert.equal(db.records('settings')[0].legacyFinishedBooks,1);
});
