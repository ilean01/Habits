import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

// Todas las cuentas tienen biblioteca propia; la de mamá solo la ven las cuentas invitadas.
test('library for everyone: own library by default, shared library only by invitation', async () => {
  const pg = new PGlite();
  const ids = [1, 2, 3, 4].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
  const [mama, ileana, extrana, amiga] = ids;
  try {
    await pg.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id bigint generated always as identity,bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
    for (const [i, id] of ids.entries()) await pg.query('insert into auth.users values($1,$2)', [id, ['mama@x.com', 'ileana@x.com', 'extrana@x.com', 'amiga@x.com'][i]]);
    for (const file of ['20260922203000_biblioteca_privada.sql', '20260922204000_biblioteca_backups.sql', '20260923091000_biblioteca_members.sql', '20260923092000_biblioteca_transactions.sql', '20260923100000_biblioteca_para_todos.sql'])
      await pg.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
    const as = async id => { await pg.exec('reset role;set role authenticated;'); await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
    const books = async () => (await pg.query('select titulo from biblioteca_libros order by titulo')).rows.map(r => r.titulo);

    // Mamá carga su libro e invita a Ileana (editora) y a una amiga (solo lectura), usando el correo.
    await as(mama);
    await pg.query("insert into biblioteca_libros(owner_id,titulo,paginas) values(biblioteca_owner(),'Libro de mamá',100)");
    await pg.query("insert into storage.objects(bucket_id,name) values('biblioteca-portadas',$1)", [mama + '/tapa.jpg']);
    await pg.query("select biblioteca_invitar('ILEANA@x.com','editor')");
    await pg.query("select biblioteca_invitar('amiga@x.com','reader')");
    await assert.rejects(pg.query("select biblioteca_invitar('nadie@x.com','reader')"), /No encontramos/);
    assert.equal((await pg.query('select * from biblioteca_miembros()')).rows.length, 2);

    // Una cuenta cualquiera tiene su propia biblioteca, vacía, y no puede ver ni elegir la de mamá.
    await as(extrana);
    assert.deepEqual(await books(), []);
    assert.equal((await pg.query('select has_biblioteca_access() as ok')).rows[0].ok, true);
    await pg.query("insert into biblioteca_libros(owner_id,titulo) values(biblioteca_owner(),'Libro de la extraña')");
    assert.deepEqual(await books(), ['Libro de la extraña']);
    await assert.rejects(pg.query('select biblioteca_elegir($1)', [mama]), /No tenés acceso/);
    await assert.rejects(pg.query("insert into biblioteca_libros(owner_id,titulo) values($1,'Intruso')", [mama]));
    assert.equal((await pg.query('select * from storage.objects')).rows.length, 0);
    await assert.rejects(pg.query("select biblioteca_invitar('amiga@x.com','superadmin')"), /Permiso inválido/);
    assert.equal((await pg.query('select * from biblioteca_miembros()')).rows.length, 0, 'no ve los miembros de mamá');

    // Mamá nunca ve la biblioteca de otra persona.
    await as(mama);
    assert.deepEqual(await books(), ['Libro de mamá']);

    // La amiga ve su propia biblioteca por defecto; al elegir la de mamá la ve, pero no la puede cambiar.
    await as(amiga);
    assert.deepEqual(await books(), []);
    assert.equal((await pg.query('select * from biblioteca_disponibles()')).rows.length, 2);
    await pg.query('select biblioteca_elegir($1)', [mama]);
    assert.deepEqual(await books(), ['Libro de mamá']);
    assert.equal((await pg.query('select * from storage.objects')).rows.length, 1);
    assert.equal((await pg.query("update biblioteca_libros set titulo='cambio' returning id")).rows.length, 0);
    assert.equal((await pg.query('select biblioteca_can_write() as w')).rows[0].w, false);

    // Ileana, como editora, puede actualizar la biblioteca de mamá.
    await as(ileana);
    await pg.query('select biblioteca_elegir($1)', [mama]);
    assert.equal((await pg.query("update biblioteca_libros set paginas=120 returning id")).rows.length, 1);

    // Si mamá quita a la amiga, la amiga vuelve automáticamente a su biblioteca propia.
    await as(mama);
    const amigaId = (await pg.query("select user_id from biblioteca_miembros() where email='amiga@x.com'")).rows[0].user_id;
    await pg.query('select biblioteca_quitar_miembro($1)', [amigaId]);
    await as(amiga);
    assert.deepEqual(await books(), []);
    await assert.rejects(pg.query('select biblioteca_elegir($1)', [mama]), /No tenés acceso/);

    // Una invitada también puede salir sola.
    await as(ileana);
    await pg.query('select biblioteca_salir($1)', [mama]);
    assert.deepEqual(await books(), []);
  } finally { await pg.close(); }
});
