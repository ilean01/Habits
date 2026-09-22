-- Respaldo diario privado de Biblioteca. El navegador genera un JSON al abrir
-- la biblioteca si todavía no existe el respaldo del día y conserva los últimos 10.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'biblioteca-backups',
  'biblioteca-backups',
  false,
  52428800,
  array['application/json','application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists biblioteca_backups_select on storage.objects;
create policy biblioteca_backups_select on storage.objects
for select to authenticated
using (
  bucket_id = 'biblioteca-backups'
  and public.has_biblioteca_access()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists biblioteca_backups_insert on storage.objects;
create policy biblioteca_backups_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'biblioteca-backups'
  and public.has_biblioteca_access()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists biblioteca_backups_update on storage.objects;
create policy biblioteca_backups_update on storage.objects
for update to authenticated
using (
  bucket_id = 'biblioteca-backups'
  and public.has_biblioteca_access()
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'biblioteca-backups'
  and public.has_biblioteca_access()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists biblioteca_backups_delete on storage.objects;
create policy biblioteca_backups_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'biblioteca-backups'
  and public.has_biblioteca_access()
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
