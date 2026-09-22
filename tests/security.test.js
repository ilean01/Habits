import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('real PostgreSQL: account isolation, optimistic locking, retries and tombstones',async()=>{
 const pg=new PGlite();
 try{
 await pg.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');`);
 const schema=await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8');await pg.exec(schema);
 await pg.exec(`set role authenticated;set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';`);
 const write=async(expected,op,data={name:'Leer'},deleted=false)=>(await pg.query('select public.write_entry($1,$2,$3,$4,$5,$6) as result',['habit-1','habit',JSON.stringify(data),deleted,expected,op])).rows[0].result;
 const op1='00000000-0000-4000-8000-000000000010',op2='00000000-0000-4000-8000-000000000011',op3='00000000-0000-4000-8000-000000000012';
 const first=await write(0,op1);assert.equal(first.ok,true);assert.equal(first.entry.rev,1);
 const retry=await write(0,op1);assert.equal(retry.ok,true);assert.equal(retry.entry.rev,1);
 const second=await write(1,op2,{name:'Leer 20 minutos'});assert.equal(second.entry.rev,2);
 const conflict=await write(1,op3,{name:'Leer 30 minutos'});assert.equal(conflict.ok,false);assert.equal(conflict.entry.data.name,'Leer 20 minutos');
 await pg.exec(`set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';`);
 assert.equal((await pg.query('select * from public.entries')).rows.length,0);
 assert.equal((await write(0,op3,{name:'Privado B'})).ok,true);
 await assert.rejects(pg.query("insert into public.entries(user_id,id,kind) values ('00000000-0000-4000-8000-000000000001','attack','habit')"));
 await pg.exec(`set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';`);
 assert.equal((await pg.query('select data from public.entries')).rows[0].data.name,'Leer 20 minutos');
 const removed=await write(2,op3,{name:'Leer 20 minutos'},true);assert.equal(removed.entry.deleted,true);
 await pg.exec('reset role;set role anon;');await assert.rejects(pg.query('select * from public.entries'));
 }finally{await pg.close();}
});
