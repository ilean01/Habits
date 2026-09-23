-- Related changes are committed together; row lock serializes reading/loan actions.
create or replace function public.biblioteca_transition(p_action text,p_book bigint,p_data jsonb default '{}'::jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare b public.biblioteca_libros; n integer; person_id bigint; person_name text; d date := (now() at time zone 'America/Asuncion')::date;
begin
 if not public.biblioteca_can_write() then raise exception 'No tenés permiso de edición'; end if;
 select * into b from public.biblioteca_libros where id=p_book and owner_id=public.biblioteca_owner() for update;
 if not found or b.eliminado then raise exception 'Libro no disponible'; end if;
 if p_action='start' then
  if b.estado_lectura in ('leyendo','releyendo') then return; end if;
  update public.biblioteca_libros set estado_lectura=case when b.estado_lectura='leido' then 'releyendo' else 'leyendo' end,fecha_inicio=d,fecha_fin=null,pagina_actual=0,proxima_lectura=false where id=b.id;
 elsif p_action='page' then
  n:=(p_data->>'page')::integer;
  if n is null or n<0 or (b.paginas is not null and n>b.paginas) then raise exception 'Página inválida'; end if;
  if n=coalesce(b.pagina_actual,0) then return; end if;
  insert into public.biblioteca_lecturas(owner_id,libro_id,fecha,pagina,paginas_leidas) values(b.owner_id,b.id,d,n,greatest(0,n-coalesce(b.pagina_actual,0)));
  update public.biblioteca_libros set pagina_actual=n where id=b.id;
 elsif p_action='finish' then
  if b.estado_lectura='leido' then return; end if;
  insert into public.biblioteca_lecturas_finalizadas(owner_id,libro_id,fecha_inicio,fecha_fin,dias_lectura,tiempo_lectura,comentario)
  values(b.owner_id,b.id,b.fecha_inicio,d,case when b.fecha_inicio is not null then greatest(1,d-b.fecha_inicio+1) end,case when b.fecha_inicio is not null then greatest(1,d-b.fecha_inicio+1)::text||' días' end,p_data->>'comment');
  if b.paginas>coalesce(b.pagina_actual,0) then insert into public.biblioteca_lecturas(owner_id,libro_id,fecha,pagina,paginas_leidas) values(b.owner_id,b.id,d,b.paginas,b.paginas-coalesce(b.pagina_actual,0)); end if;
  update public.biblioteca_libros set estado_lectura='leido',fecha_fin=d,pagina_actual=coalesce(paginas,pagina_actual) where id=b.id;
 elsif p_action='abandon' then
  update public.biblioteca_libros set estado_lectura='abandonado',fecha_fin=d where id=b.id;
 elsif p_action='loan' then
  if exists(select 1 from public.biblioteca_prestamos where libro_id=b.id and activo) then raise exception 'Este libro ya está prestado'; end if;
  person_name:=trim(p_data->>'person');if person_name is null or person_name='' then raise exception 'Indicá la persona'; end if;
  insert into public.biblioteca_personas(owner_id,nombre) values(b.owner_id,person_name) on conflict(owner_id,nombre) do update set nombre=excluded.nombre returning id into person_id;
  insert into public.biblioteca_prestamos(owner_id,libro_id,persona,persona_id,fecha_prestamo,fecha_devolucion_prevista,notas)
  values(b.owner_id,b.id,person_name,person_id,d,(p_data->>'due')::date,p_data->>'notes');
 elsif p_action in ('return','lost') then
  update public.biblioteca_prestamos set activo=false,estado=case when p_action='return' then 'devuelto' else 'perdido' end,fecha_devuelto=case when p_action='return' then d else null end,estado_devolucion=p_data->>'condition'
  where id=(p_data->>'loan')::bigint and libro_id=b.id and owner_id=b.owner_id;
 else raise exception 'Acción desconocida'; end if;
end $$;
revoke all on function public.biblioteca_transition(text,bigint,jsonb) from public,anon;
grant execute on function public.biblioteca_transition(text,bigint,jsonb) to authenticated;
