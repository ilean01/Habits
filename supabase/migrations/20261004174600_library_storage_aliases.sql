-- Conserva acceso a portadas y respaldos históricos cuando una biblioteca
-- cambia de dueña sin copiar ni romper los objetos existentes de Storage.
create table if not exists public.biblioteca_storage_aliases (
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, folder_owner_id),
  constraint biblioteca_storage_aliases_not_self check (owner_id <> folder_owner_id)
);

create index if not exists biblioteca_storage_aliases_folder_owner_idx
  on public.biblioteca_storage_aliases(folder_owner_id);

alter table public.biblioteca_storage_aliases enable row level security;
revoke all on public.biblioteca_storage_aliases from public, anon;
grant select on public.biblioteca_storage_aliases to authenticated;

drop policy if exists biblioteca_storage_aliases_select on public.biblioteca_storage_aliases;
create policy biblioteca_storage_aliases_select
on public.biblioteca_storage_aliases
for select to authenticated
using (public.biblioteca_puede_ver(owner_id));

create or replace function public.biblioteca_storage_folder_allowed(p_folder text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select auth.uid() is not null and (
    p_folder = public.biblioteca_owner()::text
    or exists (
      select 1
      from public.biblioteca_storage_aliases a
      where a.owner_id = public.biblioteca_owner()
        and a.folder_owner_id::text = p_folder
    )
  )
$$;

revoke all on function public.biblioteca_storage_folder_allowed(text) from public, anon;
grant execute on function public.biblioteca_storage_folder_allowed(text) to authenticated;

drop policy if exists biblioteca_portadas_select on storage.objects;
create policy biblioteca_portadas_select on storage.objects
for select to authenticated
using (
  bucket_id = 'biblioteca-portadas'
  and public.biblioteca_storage_folder_allowed((storage.foldername(name))[1])
);

drop policy if exists biblioteca_portadas_insert on storage.objects;
create policy biblioteca_portadas_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'biblioteca-portadas'
  and (storage.foldername(name))[1] = public.biblioteca_owner()::text
  and public.biblioteca_can_write()
);

drop policy if exists biblioteca_portadas_update on storage.objects;
create policy biblioteca_portadas_update on storage.objects
for update to authenticated
using (
  bucket_id = 'biblioteca-portadas'
  and public.biblioteca_storage_folder_allowed((storage.foldername(name))[1])
  and public.biblioteca_can_write()
)
with check (
  bucket_id = 'biblioteca-portadas'
  and public.biblioteca_storage_folder_allowed((storage.foldername(name))[1])
  and public.biblioteca_can_write()
);

drop policy if exists biblioteca_portadas_delete on storage.objects;
create policy biblioteca_portadas_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'biblioteca-portadas'
  and public.biblioteca_storage_folder_allowed((storage.foldername(name))[1])
  and public.biblioteca_can_write()
);

drop policy if exists biblioteca_backups_select on storage.objects;
create policy biblioteca_backups_select on storage.objects
for select to authenticated
using (
  bucket_id = 'biblioteca-backups'
  and public.biblioteca_storage_folder_allowed((storage.foldername(name))[1])
);

drop policy if exists biblioteca_backups_insert on storage.objects;
create policy biblioteca_backups_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'biblioteca-backups'
  and (storage.foldername(name))[1] = public.biblioteca_owner()::text
  and public.biblioteca_can_write()
);

drop policy if exists biblioteca_backups_update on storage.objects;
create policy biblioteca_backups_update on storage.objects
for update to authenticated
using (
  bucket_id = 'biblioteca-backups'
  and public.biblioteca_storage_folder_allowed((storage.foldername(name))[1])
  and public.biblioteca_can_write()
)
with check (
  bucket_id = 'biblioteca-backups'
  and public.biblioteca_storage_folder_allowed((storage.foldername(name))[1])
  and public.biblioteca_can_write()
);

drop policy if exists biblioteca_backups_delete on storage.objects;
create policy biblioteca_backups_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'biblioteca-backups'
  and public.biblioteca_storage_folder_allowed((storage.foldername(name))[1])
  and public.biblioteca_can_write()
);
