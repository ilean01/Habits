-- Sistema común de fotos del día.
-- Los registros usan kind='photo' y los archivos nuevos viven en un bucket privado por usuario.

alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries
  add constraint entries_kind_check
  check (kind in ('settings','area','habit','log','event','eventLog','task','project','book','reading','quote','journal','timer','word','dailyPlan','photo'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('day-photos','day-photos',false,15728640,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists day_photos_read on storage.objects;
drop policy if exists day_photos_insert on storage.objects;
drop policy if exists day_photos_delete on storage.objects;

create policy day_photos_read on storage.objects for select to authenticated
using(bucket_id='day-photos' and (storage.foldername(name))[1]=auth.uid()::text);

create policy day_photos_insert on storage.objects for insert to authenticated
with check(bucket_id='day-photos' and (storage.foldername(name))[1]=auth.uid()::text);

create policy day_photos_delete on storage.objects for delete to authenticated
using(bucket_id='day-photos' and (storage.foldername(name))[1]=auth.uid()::text);
