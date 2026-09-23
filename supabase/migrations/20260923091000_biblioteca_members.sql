-- One shared private catalog, explicitly authorized accounts only.
-- No change to Habits entries policies: diaries and habits remain personal.
create table if not exists public.biblioteca_members (
 owner_id uuid not null references public.biblioteca_access(user_id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'reader' check(role in ('reader','editor')),
 created_at timestamptz not null default now(),
 primary key(owner_id,user_id)
);
alter table public.biblioteca_members enable row level security;
revoke all on public.biblioteca_members from public,anon,authenticated;
grant select on public.biblioteca_members to authenticated;
create policy members_self on public.biblioteca_members for select to authenticated
using(user_id=auth.uid() or owner_id=auth.uid());
-- Membership is managed administratively; a visitor cannot grant themselves access.
create or replace function public.biblioteca_owner()
returns uuid language sql stable security definer set search_path=public
as $$ select a.user_id from public.biblioteca_access a where a.slot=1
 and (a.user_id=auth.uid() or exists(select 1 from public.biblioteca_members m where m.owner_id=a.user_id and m.user_id=auth.uid())) $$;
create or replace function public.biblioteca_can_write()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.biblioteca_access a where a.slot=1
 and (a.user_id=auth.uid() or exists(select 1 from public.biblioteca_members m where m.owner_id=a.user_id and m.user_id=auth.uid() and m.role='editor'))) $$;
create or replace function public.has_biblioteca_access()
returns boolean language sql stable security definer set search_path=public
as $$ select public.biblioteca_owner() is not null $$;
revoke all on function public.biblioteca_owner(), public.biblioteca_can_write() from public,anon;
grant execute on function public.biblioteca_owner(), public.biblioteca_can_write() to authenticated;
do $$ declare t text; begin
 foreach t in array array['biblioteca_libros','biblioteca_lecturas','biblioteca_lecturas_finalizadas','biblioteca_personas','biblioteca_prestamos','biblioteca_config'] loop
  execute format('drop policy if exists %I on public.%I',t||'_private',t);
  execute format('create policy %I on public.%I for select to authenticated using(owner_id=(select public.biblioteca_owner()))',t||'_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check(owner_id=(select public.biblioteca_owner()) and (select public.biblioteca_can_write()))',t||'_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using(owner_id=(select public.biblioteca_owner()) and (select public.biblioteca_can_write())) with check(owner_id=(select public.biblioteca_owner()) and (select public.biblioteca_can_write()))',t||'_update',t);
  execute format('create policy %I on public.%I for delete to authenticated using(owner_id=(select public.biblioteca_owner()) and (select public.biblioteca_can_write()))',t||'_delete',t);
 end loop;
end $$;
-- Child records must reference books and people from the same catalog.
create or replace function public.biblioteca_check_parent()
returns trigger language plpgsql set search_path=public as $$ begin
 if not exists(select 1 from public.biblioteca_libros where id=new.libro_id and owner_id=new.owner_id) then raise exception 'El libro no pertenece a esta biblioteca'; end if;
 if TG_TABLE_NAME='biblioteca_prestamos' then
  if new.persona_id is not null and not exists(select 1 from public.biblioteca_personas where id=new.persona_id and owner_id=new.owner_id) then raise exception 'La persona no pertenece a esta biblioteca'; end if;
 end if;
 return new;
end $$;
create trigger biblioteca_reading_parent before insert or update on public.biblioteca_lecturas for each row execute function public.biblioteca_check_parent();
create trigger biblioteca_finished_parent before insert or update on public.biblioteca_lecturas_finalizadas for each row execute function public.biblioteca_check_parent();
create trigger biblioteca_loan_parent before insert or update on public.biblioteca_prestamos for each row execute function public.biblioteca_check_parent();
do $$ declare prefix text; bucket text; begin
 foreach prefix in array array['biblioteca_portadas','biblioteca_backups'] loop
  bucket:=replace(prefix,'_','-');
  execute format('drop policy if exists %I on storage.objects',prefix||'_select');
  execute format('drop policy if exists %I on storage.objects',prefix||'_insert');
  execute format('drop policy if exists %I on storage.objects',prefix||'_update');
  execute format('drop policy if exists %I on storage.objects',prefix||'_delete');
  execute format('create policy %I on storage.objects for select to authenticated using(bucket_id=%L and (storage.foldername(name))[1]=(select public.biblioteca_owner())::text)',prefix||'_select',bucket);
  execute format('create policy %I on storage.objects for insert to authenticated with check(bucket_id=%L and (storage.foldername(name))[1]=(select public.biblioteca_owner())::text and (select public.biblioteca_can_write()))',prefix||'_insert',bucket);
  execute format('create policy %I on storage.objects for update to authenticated using(bucket_id=%L and (storage.foldername(name))[1]=(select public.biblioteca_owner())::text and (select public.biblioteca_can_write())) with check(bucket_id=%L and (storage.foldername(name))[1]=(select public.biblioteca_owner())::text and (select public.biblioteca_can_write()))',prefix||'_update',bucket,bucket);
  execute format('create policy %I on storage.objects for delete to authenticated using(bucket_id=%L and (storage.foldername(name))[1]=(select public.biblioteca_owner())::text and (select public.biblioteca_can_write()))',prefix||'_delete',bucket);
 end loop;
end $$;

create or replace function public.biblioteca_asegurar_config()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.has_biblioteca_access() then
    raise exception 'Biblioteca privada no habilitada para esta cuenta';
  end if;
  if not public.biblioteca_can_write() then return; end if;
  insert into public.biblioteca_config(owner_id, clave, valor)
  values
    (public.biblioteca_owner(), 'nombre_biblioteca', 'Mi biblioteca'),
    (public.biblioteca_owner(), 'color_principal', '#6f7f64'),
    (public.biblioteca_owner(), 'color_fondo', '#f5f1e8'),
    (public.biblioteca_owner(), 'color_texto', '#292823'),
    (public.biblioteca_owner(), 'color_tarjeta', '#fffdf8'),
    (public.biblioteca_owner(), 'fuente', 'Georgia, serif'),
    (public.biblioteca_owner(), 'fuente_titulos', 'Georgia, serif'),
    (public.biblioteca_owner(), 'fuente_botones', 'Georgia, serif'),
    (public.biblioteca_owner(), 'tamano_texto', '16'),
    (public.biblioteca_owner(), 'tamano_titulos', '30'),
    (public.biblioteca_owner(), 'tamano_botones', '16'),
    (public.biblioteca_owner(), 'por_pagina', '200'),
    (public.biblioteca_owner(), 'mostrar_favoritos_catalogo', '1'),
    (public.biblioteca_owner(), 'vista_default', 'cuadricula')
  on conflict (owner_id, clave) do nothing;
end;
$$;

revoke all on function public.biblioteca_asegurar_config() from public, anon;
grant execute on function public.biblioteca_asegurar_config() to authenticated;

