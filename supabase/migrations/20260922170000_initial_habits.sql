-- Ejecutar una vez en SQL Editor del proyecto Supabase.
create table if not exists public.entries (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null,
 kind text not null check (kind in ('settings','area','habit','log','event','eventLog','task','project','book','reading','quote','journal','timer','word')),
 data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object'),
 rev bigint not null default 1,
 deleted boolean not null default false,
 last_op uuid,
 updated_at timestamptz not null default now(),
 primary key(user_id,id)
);
alter table public.entries enable row level security;
revoke all on public.entries from anon;
grant select,insert,update on public.entries to authenticated;
drop policy if exists owner_select on public.entries;
create policy owner_select on public.entries for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists owner_insert on public.entries;
create policy owner_insert on public.entries for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists owner_update on public.entries;
create policy owner_update on public.entries for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.write_entry(p_id text,p_kind text,p_data jsonb,p_deleted boolean,p_expected bigint,p_op uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare r public.entries;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 -- Serialize edits to the same user's record, including concurrent first inserts.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_id,0));
 select * into r from public.entries where user_id=auth.uid() and id=p_id;
 if found then
  if r.last_op=p_op then return jsonb_build_object('ok',true,'entry',to_jsonb(r)); end if;
  if r.rev<>p_expected then return jsonb_build_object('ok',false,'entry',to_jsonb(r)); end if;
  update public.entries set kind=p_kind,data=p_data,deleted=p_deleted,rev=rev+1,last_op=p_op,updated_at=now() where user_id=auth.uid() and id=p_id returning * into r;
 else
  if p_expected<>0 then return jsonb_build_object('ok',false,'entry',null); end if;
  insert into public.entries(user_id,id,kind,data,deleted,last_op) values(auth.uid(),p_id,p_kind,p_data,p_deleted,p_op) returning * into r;
 end if;
 return jsonb_build_object('ok',true,'entry',to_jsonb(r));
end;$$;
revoke all on function public.write_entry(text,text,jsonb,boolean,bigint,uuid) from public,anon;
grant execute on function public.write_entry(text,text,jsonb,boolean,bigint,uuid) to authenticated;
-- Polling every 20 seconds works even without Realtime. Enable it when available.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='entries' and schemaname='public') then
  alter publication supabase_realtime add table public.entries;
 end if;
end $$;
