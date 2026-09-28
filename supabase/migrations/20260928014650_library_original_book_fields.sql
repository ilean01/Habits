-- Restore the original 1–10 scale; keep every existing value unchanged.
alter table public.biblioteca_libros drop constraint if exists biblioteca_libros_rating;
alter table public.biblioteca_libros add constraint biblioteca_libros_rating check (rating is null or rating between 0 and 10);

-- Number new catalog copies by library and owner code. Existing rows keep their
-- number unless their owner changes or a wish becomes a catalog copy.
create or replace function public.biblioteca_assign_item()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare needs_number boolean := false; next_item integer;
begin
 if tg_op='INSERT' then
   if new.legacy_id is not null then return new; end if;
   new.codigo_p:=nullif(upper(trim(new.codigo_p)),'');
   needs_number:=true;
 else
   if new.codigo_p is distinct from old.codigo_p then
     new.codigo_p:=nullif(upper(trim(new.codigo_p)),'');
     needs_number:=new.codigo_p is distinct from old.codigo_p;
   end if;
   needs_number:=needs_number or (new.lista='catalogo' and old.lista is distinct from 'catalogo' and new.item is null);
   if not needs_number then new.item:=old.item;return new;end if;
 end if;
 if new.codigo_p is null or new.lista is distinct from 'catalogo' then new.item:=null;return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text||':'||new.codigo_p,0));
 select greatest(coalesce(max(item),0),count(*)::integer)+1 into next_item
 from public.biblioteca_libros where owner_id=new.owner_id and codigo_p=new.codigo_p and lista='catalogo' and id is distinct from new.id;
 new.item:=next_item;
 return new;
end $$;
revoke all on function public.biblioteca_assign_item() from public,anon;
grant execute on function public.biblioteca_assign_item() to authenticated;
drop trigger if exists biblioteca_assign_item on public.biblioteca_libros;
create trigger biblioteca_assign_item before insert or update of codigo_p,lista,item on public.biblioteca_libros for each row execute function public.biblioteca_assign_item();
