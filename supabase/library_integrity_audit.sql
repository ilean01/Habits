-- Auditoría de integridad de Biblioteca. Solo lectura.
-- Producción verificada el 2026-09-27: 1.470 libros totales, 1.468 activos, 2 en papelera,
-- 0 referencias huérfanas en préstamos/lecturas y 0 portadas huérfanas o faltantes en Storage.

select
  count(*) filter (where not eliminado) as libros_activos,
  count(*) filter (where eliminado) as libros_papelera,
  count(*) as libros_total,
  count(*) filter (where titulo is null or btrim(titulo)='') as sin_titulo,
  count(*) filter (where autor is null or btrim(autor)='') as sin_autor,
  count(*) filter (where dewey is null or btrim(dewey)='') as sin_dewey,
  count(*) filter (where paginas is null or paginas<=0) as sin_paginas,
  count(*) filter (where isbn is null or btrim(isbn)='') as sin_isbn,
  count(*) filter (where portada is null or btrim(portada)='') as sin_portada
from public.biblioteca_libros;

with b as (
  select id,owner_id,eliminado,estado_lectura from public.biblioteca_libros
)
select
  (select count(distinct owner_id) from b) as owners_libros,
  (select count(*) from b where estado_lectura in ('leyendo','releyendo') and not eliminado) as leyendo_ahora,
  (select count(*) from public.biblioteca_prestamos where activo) as prestamos_activos,
  (select count(*) from public.biblioteca_prestamos p left join b on b.id=p.libro_id where b.id is null) as prestamos_huerfanos,
  (select count(*) from public.biblioteca_lecturas r left join b on b.id=r.libro_id where b.id is null) as lecturas_huerfanas,
  (select count(*) from public.biblioteca_lecturas_finalizadas f left join b on b.id=f.libro_id where b.id is null) as finalizadas_huerfanas;

with cover_refs as (
  select distinct portada as path
  from public.biblioteca_libros
  where portada is not null and btrim(portada)<>'' and portada !~* '^https?://'
), stored as (
  select name as path
  from storage.objects
  where bucket_id='biblioteca-portadas'
)
select
  (select count(*) from stored) as portadas_storage,
  (select count(*) from cover_refs) as portadas_referenciadas,
  (select count(*) from stored s left join cover_refs r on r.path=s.path where r.path is null) as portadas_huerfanas,
  (select count(*) from cover_refs r left join stored s on s.path=r.path where s.path is null) as portadas_faltantes;
