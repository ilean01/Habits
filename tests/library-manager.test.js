import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('Ile can manage mom historical library without mixing it with her own library', async () => {
  const pg = new PGlite();
  const mom = '00000000-0000-4000-8000-000000000001';
  const ile = '00000000-0000-4000-8000-000000000002';
  const invited = '00000000-0000-4000-8000-000000000003';
  try {
    await pg.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id bigint generated always as identity,bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
    await pg.query('insert into auth.users values($1,$2),($3,$4),($5,$6)', [mom,'mama@x.com',ile,'ile@x.com',invited,'invitada@x.com']);
    for (const file of ['20260922203000_biblioteca_privada.sql','20260922204000_biblioteca_backups.sql','20260923091000_biblioteca_members.sql','20260923092000_biblioteca_transactions.sql','20260923100000_biblioteca_para_todos.sql','20260923101000_biblioteca_gestores.sql'])
      await pg.exec(await readFile(new URL('../supabase/migrations/'+file, import.meta.url),'utf8'));
    const as = async id => { await pg.exec('reset role;set role authenticated;'); await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); };
    const titles = async () => (await pg.query('select titulo from biblioteca_libros order by titulo')).rows.map(r=>r.titulo);

    await as(mom);
    await pg.query("insert into biblioteca_libros(owner_id,titulo) values(biblioteca_owner(),'Histórico mamá')");
    await pg.query('insert into biblioteca_members(owner_id,user_id,role) values($1,$2,\'manager\')',[mom,ile]);

    await as(ile);
    assert.deepEqual(await titles(), [], 'Ile starts in her own personal library');
    await pg.query("insert into biblioteca_libros(owner_id,titulo) values(biblioteca_owner(),'Libro personal de Ile')");
    await pg.query('select biblioteca_elegir($1)',[mom]);
    assert.deepEqual(await titles(), ['Histórico mamá'], 'switching to mom library does not merge personal books');
    assert.equal((await pg.query('select biblioteca_can_manage() as ok')).rows[0].ok,true);
    await pg.query("select biblioteca_invitar('invitada@x.com','reader')");

    await as(invited);
    assert.deepEqual(await titles(), [], 'invited account still opens its own library by default');
    await pg.query('select biblioteca_elegir($1)',[mom]);
    assert.deepEqual(await titles(), ['Histórico mamá'], 'shared library is accessed separately');
    assert.equal((await pg.query('select biblioteca_can_write() as ok')).rows[0].ok,false);

    await as(ile);
    await pg.query('select biblioteca_elegir($1)',[ile]);
    assert.deepEqual(await titles(), ['Libro personal de Ile'], 'Ile personal library remained separate');
  } finally { await pg.close(); }
});
