-- Biblioteca para todas las cuentas.
-- Cada persona tiene su propia biblioteca (vacía al principio) con todas las funciones.
-- La biblioteca de otra persona (por ejemplo, la de mamá) solo se puede ver si su dueña
-- invita a esa cuenta, como lectora (solo ver) o editora (puede cambiar cosas).
-- Los datos nunca se mezclan: cada fila tiene owner_id y las políticas RLS ya existentes
-- solo muestran la biblioteca que la cuenta tiene elegida en ese momento.

-- 1) Los miembros ya no dependen de la biblioteca única (slot=1): cualquier cuenta puede invitar a su biblioteca.
alter table public.biblioteca_members drop constraint if exists biblioteca_members_owner_id_fkey;
alter table public.biblioteca_members add constraint biblioteca_members_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete cascade;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'biblioteca_members_not_self') then
    alter table public.biblioteca_members add constraint biblioteca_members_not_self check (owner_id <> user_id);
  end if;
end $$;

-- 2) Qué biblioteca está mirando cada cuenta (la propia por defecto).
create table if not exists public.biblioteca_seleccion (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.biblioteca_seleccion enable row level security;
revoke all on public.biblioteca_seleccion from public, anon, authenticated;
-- Sin políticas: solo se modifica mediante las funciones de abajo.

create or replace function public.biblioteca_puede_ver(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and p_owner is not null and (
    p_owner = auth.uid()
    or exists (select 1 from public.biblioteca_members m where m.owner_id = p_owner and m.user_id = auth.uid())
  )
$$;

-- La biblioteca activa: la elegida si todavía hay permiso; si no, la propia.
create or replace function public.biblioteca_owner()
returns uuid language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else coalesce(
    (select s.owner_id from public.biblioteca_seleccion s
      where s.user_id = auth.uid() and public.biblioteca_puede_ver(s.owner_id)),
    auth.uid()) end
$$;

create or replace function public.biblioteca_can_write()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.biblioteca_owner() = auth.uid()
    or exists (select 1 from public.biblioteca_members m
      where m.owner_id = public.biblioteca_owner() and m.user_id = auth.uid() and m.role = 'editor')
  )
$$;

-- Todas las cuentas tienen biblioteca (la propia).
create or replace function public.has_biblioteca_access()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
$$;

-- 3) Bibliotecas que la cuenta puede abrir: la propia y las que le compartieron.
create or replace function public.biblioteca_disponibles()
returns table (owner_id uuid, nombre text, email text, rol text, propia boolean, activa boolean)
language sql stable security definer set search_path = public as $$
  select u.id,
         coalesce((select c.valor from public.biblioteca_config c where c.owner_id = u.id and c.clave = 'nombre_biblioteca'), 'Mi biblioteca'),
         u.email::text, 'duenia', true, public.biblioteca_owner() = u.id
    from auth.users u where u.id = auth.uid()
  union all
  select m.owner_id,
         coalesce((select c.valor from public.biblioteca_config c where c.owner_id = m.owner_id and c.clave = 'nombre_biblioteca'), 'Biblioteca compartida'),
         u.email::text, m.role, false, public.biblioteca_owner() = m.owner_id
    from public.biblioteca_members m join auth.users u on u.id = m.owner_id
   where m.user_id = auth.uid()
$$;

create or replace function public.biblioteca_elegir(p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.biblioteca_puede_ver(p_owner) then raise exception 'No tenés acceso a esa biblioteca'; end if;
  insert into public.biblioteca_seleccion (user_id, owner_id) values (auth.uid(), p_owner)
  on conflict (user_id) do update set owner_id = excluded.owner_id, updated_at = now();
end $$;

-- 4) Compartir: solo la dueña maneja quién entra a SU biblioteca.
create or replace function public.biblioteca_miembros()
returns table (user_id uuid, email text, rol text, desde timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, m.role, m.created_at
    from public.biblioteca_members m join auth.users u on u.id = m.user_id
   where m.owner_id = auth.uid()
   order by m.created_at
$$;

create or replace function public.biblioteca_invitar(p_email text, p_rol text default 'reader')
returns void language plpgsql security definer set search_path = public as $$
declare invited uuid;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión primero'; end if;
  if p_rol not in ('reader', 'editor') then raise exception 'Permiso inválido'; end if;
  select id into invited from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if invited is null then raise exception 'No encontramos una cuenta de Habits con ese correo. Pedile que se registre primero.'; end if;
  if invited = auth.uid() then raise exception 'Esa es tu propia cuenta'; end if;
  insert into public.biblioteca_members (owner_id, user_id, role) values (auth.uid(), invited, p_rol)
  on conflict (owner_id, user_id) do update set role = excluded.role;
end $$;

create or replace function public.biblioteca_quitar_miembro(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.biblioteca_members where owner_id = auth.uid() and user_id = p_user;
  delete from public.biblioteca_seleccion where user_id = p_user and owner_id = auth.uid();
end $$;

-- Una persona invitada también puede salir por su cuenta.
create or replace function public.biblioteca_salir(p_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.biblioteca_members where owner_id = p_owner and user_id = auth.uid();
  delete from public.biblioteca_seleccion where user_id = auth.uid() and owner_id = p_owner;
end $$;

revoke all on function public.biblioteca_puede_ver(uuid), public.biblioteca_disponibles(), public.biblioteca_elegir(uuid),
  public.biblioteca_miembros(), public.biblioteca_invitar(text, text), public.biblioteca_quitar_miembro(uuid), public.biblioteca_salir(uuid)
  from public, anon;
grant execute on function public.biblioteca_puede_ver(uuid), public.biblioteca_disponibles(), public.biblioteca_elegir(uuid),
  public.biblioteca_miembros(), public.biblioteca_invitar(text, text), public.biblioteca_quitar_miembro(uuid), public.biblioteca_salir(uuid)
  to authenticated;
