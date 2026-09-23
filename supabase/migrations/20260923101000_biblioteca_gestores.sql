-- Gestión explícita de bibliotecas compartidas.
-- Permite que una persona (por ejemplo Ile) administre quién accede a una biblioteca
-- histórica ajena sin convertir esa biblioteca en su biblioteca personal.

alter table public.biblioteca_members drop constraint if exists biblioteca_members_role_check;
alter table public.biblioteca_members add constraint biblioteca_members_role_check
  check (role in ('reader','editor','manager'));

create or replace function public.biblioteca_can_manage()
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and (
    public.biblioteca_owner() = auth.uid()
    or exists (
      select 1 from public.biblioteca_members m
      where m.owner_id = public.biblioteca_owner()
        and m.user_id = auth.uid()
        and m.role = 'manager'
    )
  )
$$;

create or replace function public.biblioteca_can_write()
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and (
    public.biblioteca_owner() = auth.uid()
    or exists (
      select 1 from public.biblioteca_members m
      where m.owner_id = public.biblioteca_owner()
        and m.user_id = auth.uid()
        and m.role in ('editor','manager')
    )
  )
$$;

create or replace function public.biblioteca_miembros()
returns table (user_id uuid, email text, rol text, desde timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.biblioteca_can_manage() then
    raise exception 'No tenés permiso para administrar los accesos de esta biblioteca';
  end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at
    from public.biblioteca_members m
    join auth.users u on u.id = m.user_id
    where m.owner_id = public.biblioteca_owner()
    order by m.created_at;
end
$$;

create or replace function public.biblioteca_invitar(p_email text, p_rol text default 'reader')
returns void language plpgsql security definer set search_path=public as $$
declare invited uuid; target_owner uuid;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión primero'; end if;
  if not public.biblioteca_can_manage() then raise exception 'No tenés permiso para administrar esta biblioteca'; end if;
  if p_rol not in ('reader','editor','manager') then raise exception 'Permiso inválido'; end if;
  target_owner := public.biblioteca_owner();
  select id into invited from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if invited is null then raise exception 'No encontramos una cuenta de Habits con ese correo. Pedile que se registre primero.'; end if;
  if invited = target_owner then raise exception 'Esa cuenta ya es la dueña de esta biblioteca'; end if;
  if invited = auth.uid() and target_owner <> auth.uid() then raise exception 'Tu acceso ya se administra desde la membresía actual'; end if;
  insert into public.biblioteca_members(owner_id,user_id,role)
  values(target_owner,invited,p_rol)
  on conflict(owner_id,user_id) do update set role=excluded.role;
end
$$;

create or replace function public.biblioteca_quitar_miembro(p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
declare target_owner uuid;
begin
  if not public.biblioteca_can_manage() then raise exception 'No tenés permiso para administrar esta biblioteca'; end if;
  target_owner := public.biblioteca_owner();
  if p_user = auth.uid() and target_owner <> auth.uid() then
    raise exception 'Para salir de una biblioteca compartida usá la opción Salir';
  end if;
  delete from public.biblioteca_members where owner_id=target_owner and user_id=p_user;
  delete from public.biblioteca_seleccion where user_id=p_user and owner_id=target_owner;
end
$$;

revoke all on function public.biblioteca_can_manage(), public.biblioteca_miembros(), public.biblioteca_invitar(text,text), public.biblioteca_quitar_miembro(uuid) from public,anon;
grant execute on function public.biblioteca_can_manage(), public.biblioteca_miembros(), public.biblioteca_invitar(text,text), public.biblioteca_quitar_miembro(uuid) to authenticated;
