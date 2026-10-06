import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {newBookEditorHtml,bookEditorHtml,bookEditorValues,bindBookEditor,coverEditorHtml} from '../src/biblioteca/book-editor.js';
import {catalogView} from '../src/biblioteca/views.js';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('el editor conserva metadatos, casillas y puntuación original sin enviar controles auxiliares',()=>{
 const dom=new JSDOM(`<form>${bookEditorHtml({titulo:'Libro',rating:8,item:618,codigo_p:'LR',favorito:true,proxima_lectura:true,relacionados:'Otro libro'})}</form>`);
 const f=dom.window.document.querySelector('form');const data=new dom.window.FormData(f);const v=bookEditorValues(data);
 assert.equal(v.rating,8);assert.equal(v.favorito,true);assert.equal(v.proxima_lectura,true);assert.equal(v.relacionados,'Otro libro');assert.equal(v.codigo_p,'LR');assert.equal('item' in v,false);assert.equal('coverUrl' in v,false);
 data.set('paginas','20');assert.throws(()=>bookEditorValues(data,{pagina_actual:30}),/menor/);data.set('paginas','2.5');assert.throws(()=>bookEditorValues(data),/válida/);
 dom.window.close();
});

test('ISBN completa vacíos sin pisar título ni mezclar portada y sinopsis',async()=>{
 const dom=new JSDOM(`<form>${coverEditorHtml({})}${bookEditorHtml({titulo:'Mi título',isbn:'123',descripcion:'Mi sinopsis'})}</form>`);globalThis.document=dom.window.document;
 try{const form=document.querySelector('form');const editor=bindBookEditor(form,{lookup:async()=>({titulo:'Otro título',autor:'Autora',descripcion:'Nueva sinopsis',portada_url:'https://example.org/a.jpg'})});
 await form.querySelector('[data-editor=isbn]').onclick();
 const buttons=[...form.querySelectorAll('[data-editor-results] button')];buttons.find(x=>x.textContent==='Completar campos vacíos').click();
 assert.equal(form.elements.titulo.value,'Mi título');assert.equal(form.elements.autor.value,'Autora');assert.equal(form.elements.descripcion.value,'Mi sinopsis');assert.equal(editor.cover().changed,false);
 buttons.find(x=>x.textContent==='Usar esta portada').click();assert.equal(editor.cover().url,'https://example.org/a.jpg');assert.equal(form.elements.descripcion.value,'Mi sinopsis');
 form.querySelector('[data-editor=remove-cover]').click();assert.equal(editor.cover().url,null);editor.dispose();
 }finally{delete globalThis.document;dom.window.close();}
});

test('catálogo limita tarjetas y deja cantidad y navegación arriba y abajo',()=>{
 const books=Array.from({length:75},(_,i)=>({id:i+1,titulo:`Libro ${i}`,lista:'catalogo'}));
 const state={data:{books,loans:[]},covers:new Map(),filteredBooks:()=>books,perPage:12,pageSize:'12',page:2,filters:{},filterOptions:{generos:[],codigos:[],idiomas:[]},viewMode:'cuadricula',config:{},canWrite:true};
 const dom=new JSDOM(catalogView(state));const doc=dom.window.document;
 assert.equal(doc.querySelectorAll('.celda').length,12);
 assert.equal(doc.querySelectorAll('[data-page-size]').length,2);assert.equal(doc.querySelector('[data-page-size]').value,'12');assert.match(doc.body.textContent,/13–24 de 75/);dom.window.close();
});

test('numeración automática conserva ejemplares antiguos, deseos y escala 1–10',async()=>{
 const pg=new PGlite();try{
 await pg.exec(`create role anon;create role authenticated;create table biblioteca_libros(id bigint generated always as identity,owner_id uuid,legacy_id bigint,titulo text,item integer,codigo_p text,lista text default 'catalogo',rating integer,constraint biblioteca_libros_rating check(rating between 0 and 5));`);
 await pg.exec("insert into biblioteca_libros(owner_id,titulo,item,codigo_p) values('00000000-0000-4000-8000-000000000001','Existente',618,'LR')");
 await pg.exec(await readFile(new URL('../supabase/migrations/20260928014650_library_original_book_fields.sql',import.meta.url),'utf8'));
 const owner='00000000-0000-4000-8000-000000000001';
 const insert=async(lista='catalogo')=>(await pg.query("insert into biblioteca_libros(owner_id,titulo,codigo_p,lista,rating) values($1,'Nuevo','lr',$2,9) returning *",[owner,lista])).rows[0];
 const a=await insert();assert.equal(a.item,619);assert.equal(a.codigo_p,'LR');assert.equal(a.rating,9);assert.equal((await insert()).item,620);
 const wish=await insert('deseos');assert.equal(wish.item,null);
 const promoted=(await pg.query("update biblioteca_libros set lista='catalogo' where id=$1 returning item",[wish.id])).rows[0];assert.equal(promoted.item,621);
 await pg.query("update biblioteca_libros set titulo='Editado',codigo_p='LR' where id=$1",[a.id]);assert.equal((await pg.query('select item from biblioteca_libros where id=$1',[a.id])).rows[0].item,619);
 await pg.query("update biblioteca_libros set codigo_p='AB' where id=$1",[a.id]);assert.equal((await pg.query('select item from biblioteca_libros where id=$1',[a.id])).rows[0].item,1);
 assert.equal((await pg.query('select item from biblioteca_libros where id=1')).rows[0].item,618);
 await assert.rejects(pg.query('update biblioteca_libros set rating=11 where id=1'));
 }finally{await pg.close();}
});

test('alta respeta el orden original y permite elegir o crear propietario sin perder campos adicionales',()=>{
 const dom=new JSDOM(`<form>${newBookEditorHtml({titulo:'Nuevo'},[{codigo_p:'LR'}])}</form>`);const form=dom.window.document.querySelector('form');
 const names=[...form.querySelectorAll('input,textarea,select')].map(x=>x.name);
 const order=['titulo','autor','descripcion','editorial','paginas','autografiado','proxima_lectura','isbn','idioma','genero','dewey','codigo_p','subdivision','dedicatoria','observaciones','lista'];
 for(let i=1;i<order.length;i++)assert.ok(names.indexOf(order[i])>names.indexOf(order[i-1]),order[i]);
 const editor=bindBookEditor(form);const select=form.querySelector('[data-owner-select]');select.value='LR';select.onchange();assert.equal(bookEditorValues(new dom.window.FormData(form)).codigo_p,'LR');
 select.value='__nuevo__';select.onchange();form.elements.codigo_p_nuevo.value='mr';form.elements.codigo_p_nuevo.oninput();assert.equal(bookEditorValues(new dom.window.FormData(form)).codigo_p,'MR');
 assert.ok(form.elements.rating);assert.ok(form.elements.relacionados);assert.ok(form.elements.favorito);editor.dispose();dom.window.close();
});

test('portadas tienen resultados propios, conservan sinopsis y no cierran al elegir',async()=>{
 const dom=new JSDOM(`<form>${newBookEditorHtml({titulo:'Libro',descripcion:'Sinopsis propia'})}</form>`);globalThis.document=dom.window.document;
 try{const form=document.querySelector('form');const win=form.querySelector('[data-cover-window]');win.showModal=()=>win.setAttribute('open','');win.close=()=>win.removeAttribute('open');const editor=bindBookEditor(form,{search:async()=>[{titulo:'Edición',descripcion:'Texto ajeno',portada_url:'https://example.org/cover.jpg'}]});
 form.querySelector('[data-cover-open]').click();await form.querySelector('[data-editor=covers]').onclick();assert.equal(win.open,true);assert.equal(form.querySelector('[data-editor-results]').children.length,0);assert.equal(form.querySelector('[data-cover-results]').textContent.includes('Usar esta sinopsis'),false);
 [...form.querySelectorAll('[data-cover-results] button')].find(b=>b.textContent==='Usar esta portada').click();assert.equal(win.open,true);assert.equal(form.elements.descripcion.value,'Sinopsis propia');assert.equal(editor.cover().url,'https://example.org/cover.jpg');
 form.querySelector('[data-cover-close]').click();assert.equal(win.open,false);form.querySelector('[data-cover-open]').click();assert.equal(editor.cover().url,'https://example.org/cover.jpg');form.querySelector('[data-editor=remove-cover]').click();assert.equal(editor.cover().url,null);assert.equal(win.open,true);editor.dispose();
 }finally{delete globalThis.document;dom.window.close();}
});
