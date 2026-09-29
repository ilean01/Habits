-- Related changes are committed together; row lock serializes reading/loan actions.
create or replace function public.biblioteca_transition(p_action text,p_book bigint,p_data jsonb default '{}'::jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare b public.biblioteca_libros; n integer; person_id bigint; person_name text; d date := (now() at time zone 'America/Asuncion')::date; started date; ended date; score integer;
begin
 if not public.biblioteca_can_write() then raise exception 'No tenés permiso de edición'; end if;
 select * into b from public.biblioteca_libros where id=p_book and owner_id=public.biblioteca_owner() for update;
 if not found or b.eliminado then raise exception 'Libro no disponible'; end if;
 if p_action='start' then
  started:=coalesce(nullif(p_data->>'start','')::date,d);if started>d then raise exception 'La fecha de inicio no puede ser futura'; end if;
  if b.estado_lectura in ('leyendo','releyendo') then return; end if;
  update public.biblioteca_libros set estado_lectura=case when b.estado_lectura='leido' then 'releyendo' else 'leyendo' end,fecha_inicio=started,fecha_fin=null,pagina_actual=0,proxima_lectura=false where id=b.id;
 elsif p_action='page' then
  n:=(p_data->>'page')::integer;
  if n is null or n<0 or (b.paginas is not null and n>b.paginas) then raise exception 'Página inválida'; end if;
  if n=coalesce(b.pagina_actual,0) then return; end if;
  insert into public.biblioteca_lecturas(owner_id,libro_id,fecha,pagina,paginas_leidas) values(b.owner_id,b.id,d,n,greatest(0,n-coalesce(b.pagina_actual,0)));
  update public.biblioteca_libros set pagina_actual=n where id=b.id;
 elsif p_action='finish' then
  if b.estado_lectura='leido' then return; end if;
  started:=coalesce(nullif(p_data->>'start','')::date,b.fecha_inicio,d);ended:=coalesce(nullif(p_data->>'end','')::date,d);score:=nullif(p_data->>'rating','')::integer;
  if ended<started or ended>d then raise exception 'Revisá las fechas: el final debe ser posterior al inicio y no futuro'; end if;
  if score is not null and (score<1 or score>10) then raise exception 'La puntuación va de 1 a 10'; end if;
  insert into public.biblioteca_lecturas_finalizadas(owner_id,libro_id,fecha_inicio,fecha_fin,dias_lectura,tiempo_lectura,comentario)
  values(b.owner_id,b.id,started,ended,greatest(1,ended-started+1),greatest(1,ended-started+1)::text||' días',p_data->>'comment');
  if b.paginas>coalesce(b.pagina_actual,0) then insert into public.biblioteca_lecturas(owner_id,libro_id,fecha,pagina,paginas_leidas) values(b.owner_id,b.id,ended,b.paginas,b.paginas-coalesce(b.pagina_actual,0)); end if;
  update public.biblioteca_libros set estado_lectura='leido',fecha_inicio=started,fecha_fin=ended,rating=coalesce(score,rating),pagina_actual=coalesce(paginas,pagina_actual) where id=b.id;
 elsif p_action='abandon' then
  update public.biblioteca_libros set estado_lectura='abandonado',fecha_fin=d where id=b.id;
 elsif p_action='loan' then
  if exists(select 1 from public.biblioteca_prestamos where libro_id=b.id and activo) then raise exception 'Este libro ya está prestado'; end if;
  started:=coalesce(nullif(p_data->>'date','')::date,d);if started>d or nullif(p_data->>'due','')::date<started then raise exception 'Revisá las fechas del préstamo'; end if;
  person_name:=trim(p_data->>'person');if person_name is null or person_name='' then raise exception 'Indicá la persona'; end if;
  insert into public.biblioteca_personas(owner_id,nombre) values(b.owner_id,person_name) on conflict(owner_id,nombre) do update set nombre=excluded.nombre returning id into person_id;
  insert into public.biblioteca_prestamos(owner_id,libro_id,persona,persona_id,fecha_prestamo,fecha_devolucion_prevista,notas)
  values(b.owner_id,b.id,person_name,person_id,started,nullif(p_data->>'due','')::date,p_data->>'notes');
 elsif p_action in ('return','lost') then
  update public.biblioteca_prestamos set activo=false,estado=case when p_action='return' then 'devuelto' else 'perdido' end,fecha_devuelto=case when p_action='return' then d else null end,estado_devolucion=p_data->>'condition'
  where id=(p_data->>'loan')::bigint and libro_id=b.id and owner_id=b.owner_id;
 else raise exception 'Acción desconocida'; end if;
end $$;
revoke all on function public.biblioteca_transition(text,bigint,jsonb) from public,anon;
grant execute on function public.biblioteca_transition(text,bigint,jsonb) to authenticated;

-- Draft photos use the existing private bucket and require an authorized editor.
create table if not exists public.biblioteca_cover_drafts(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '1 hour',
 uploaded_at timestamptz
);
alter table public.biblioteca_cover_drafts enable row level security;
revoke all on public.biblioteca_cover_drafts from public,anon,authenticated;
grant select,delete on public.biblioteca_cover_drafts to authenticated;
grant insert(id,owner_id) on public.biblioteca_cover_drafts to authenticated;
grant update(uploaded_at) on public.biblioteca_cover_drafts to authenticated;
create policy cover_draft_read on public.biblioteca_cover_drafts for select to authenticated using(owner_id=(select public.biblioteca_owner()) and (select public.biblioteca_can_write()) and expires_at>now());
create policy cover_draft_insert on public.biblioteca_cover_drafts for insert to authenticated with check(owner_id=(select public.biblioteca_owner()) and (select public.biblioteca_can_write()));
create policy cover_draft_update on public.biblioteca_cover_drafts for update to authenticated using(owner_id=(select public.biblioteca_owner()) and (select public.biblioteca_can_write()) and expires_at>now()) with check(owner_id=(select public.biblioteca_owner()) and (select public.biblioteca_can_write()) and expires_at>now());
create policy cover_draft_delete on public.biblioteca_cover_drafts for delete to authenticated using(owner_id=(select public.biblioteca_owner()) and (select public.biblioteca_can_write()));
