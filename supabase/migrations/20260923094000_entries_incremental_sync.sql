-- Índice para sincronización incremental de Habits por usuario y fecha de cambio.
create index if not exists entries_user_updated_at_idx
on public.entries(user_id, updated_at, id);

-- Mantiene updated_at obligatorio para que los clientes puedan pedir solo cambios posteriores.
alter table public.entries alter column updated_at set not null;
