do $$
declare
  t text;
begin
  foreach t in array array[
    'biblioteca_libros',
    'biblioteca_lecturas',
    'biblioteca_lecturas_finalizadas',
    'biblioteca_personas',
    'biblioteca_prestamos',
    'biblioteca_config',
    'biblioteca_members'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
