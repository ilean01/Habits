import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('private library: explicit membership, read-only enforcement, revocation, atomic loans',async()=>{
 const pg=new PGlite();const ids=[1,2,3,4].map(n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
 try{
 await pg.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id bigint generated always as identity,bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
 for(const id of ids)await pg.query('insert into auth.users values($1)',[id]);
 for(const file of ['20260922203000_biblioteca_privada.sql','20260922204000_biblioteca_backups.sql','20260923091000_biblioteca_members.sql','20260923092000_biblioteca_transactions.sql','20260923090000_workout_photos.sql','20260928014650_library_original_book_fields.sql','20260929195335_library_full_parity.sql'])await pg.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 await pg.query('insert into biblioteca_access(user_id) values($1)',[ids[0]]);
 await pg.query("insert into biblioteca_members(owner_id,user_id,role) values($1,$2,'reader'),($1,$3,'editor')",ids.slice(0,3));
 const as=async n=>{await pg.exec('reset role;set role authenticated;');await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[n]]);};
 await as(0);const book=(await pg.query("insert into biblioteca_libros(owner_id,titulo,paginas) values($1,'Privado',100) returning id",[ids[0]])).rows[0].id;
 await pg.query("insert into storage.objects(bucket_id,name) values('biblioteca-portadas',$1),('workout-photos',$2)",[ids[0]+'/cover.jpg',ids[0]+'/gym.jpg']);
 const draft=(await pg.query('insert into biblioteca_cover_drafts(owner_id) values($1) returning id',[ids[0]])).rows[0].id;
 await as(1);assert.equal((await pg.query('select * from biblioteca_cover_drafts')).rows.length,0);await assert.rejects(pg.query('insert into biblioteca_cover_drafts(owner_id) values($1)',[ids[0]]));assert.equal((await pg.query('select * from biblioteca_libros')).rows.length,1);assert.equal((await pg.query('select * from storage.objects')).rows.length,1);assert.equal((await pg.query("update biblioteca_libros set titulo='attack' returning id")).rows.length,0);
 await assert.rejects(pg.query('insert into biblioteca_members(owner_id,user_id,role) values($1,$2,$3)',[ids[0],ids[3],'editor']));
 await as(3);assert.equal((await pg.query('select * from biblioteca_libros')).rows.length,0);assert.equal((await pg.query('select * from storage.objects')).rows.length,0);
 await as(2);await pg.query("select biblioteca_transition('start',$1)",[book]);await pg.query("select biblioteca_transition('page',$1,'{\"page\":25}')",[book]);assert.equal((await pg.query('select pagina_actual from biblioteca_libros')).rows[0].pagina_actual,25);
 await pg.query("select biblioteca_transition('loan',$1,'{\"person\":\"Persona\"}')",[book]);await assert.rejects(pg.query("select biblioteca_transition('loan',$1,'{\"person\":\"Otra\"}')",[book]));assert.equal((await pg.query('select * from biblioteca_prestamos')).rows.length,1);
 assert.equal((await pg.query('select * from biblioteca_cover_drafts')).rows.length,1);
 await pg.query('update biblioteca_cover_drafts set uploaded_at=now() where id=$1',[draft]);
 await assert.rejects(pg.query("update biblioteca_cover_drafts set expires_at=now()+interval '2 hours'"));
 await assert.rejects(pg.query("select biblioteca_transition('finish',$1,'{\"start\":\"2020-02-02\",\"end\":\"2020-02-01\"}')",[book]));
 await assert.rejects(pg.query("select biblioteca_transition('finish',$1,'{\"start\":\"2020-01-01\",\"end\":\"2020-01-03\",\"rating\":11}')",[book]));
 await pg.query("select biblioteca_transition('finish',$1,'{\"start\":\"2020-01-01\",\"end\":\"2020-01-03\",\"rating\":9}')",[book]);
 assert.equal((await pg.query('select rating from biblioteca_libros')).rows[0].rating,9);
 assert.equal(Number((await pg.query('select dias_lectura from biblioteca_lecturas_finalizadas')).rows[0].dias_lectura),3);
 const historical=(await pg.query("insert into biblioteca_libros(owner_id,titulo) values($1,'Histórico') returning id",[ids[0]])).rows[0].id;
 await pg.query("select biblioteca_transition('loan',$1,'{\"person\":\"Persona\",\"date\":\"2020-02-01\",\"due\":\"2020-02-03\"}')",[historical]);
 assert.equal((await pg.query('select fecha_prestamo::text as fecha from biblioteca_prestamos where libro_id=$1',[historical])).rows[0].fecha,'2020-02-01');
 await pg.exec('reset role');await pg.query('delete from biblioteca_members where user_id=$1',[ids[2]]);await as(2);assert.equal((await pg.query('select * from biblioteca_libros')).rows.length,0);await assert.rejects(pg.query("select biblioteca_transition('page',$1,'{\"page\":30}')",[book]));
 }finally{await pg.close();}
});
