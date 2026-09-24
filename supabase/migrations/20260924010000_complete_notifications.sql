-- Completa el runtime de notificaciones sin secretos hardcodeados.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.notification_runtime (
  id smallint primary key default 1 check (id = 1),
  cron_secret text not null default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  vapid_public_key text,
  vapid_private_key text,
  vapid_subject text,
  updated_at timestamptz not null default now()
);
revoke all on private.notification_runtime from public, anon, authenticated;
insert into private.notification_runtime(id) values(1) on conflict (id) do nothing;

create or replace function public.notification_cron_valid(p_secret text)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  select coalesce(length(p_secret) >= 32 and exists(
    select 1 from private.notification_runtime where id=1 and cron_secret=p_secret
  ),false)
$$;
revoke all on function public.notification_cron_valid(text) from public, anon, authenticated;
grant execute on function public.notification_cron_valid(text) to service_role;

create or replace function public.notification_vapid_get()
returns table(public_key text, private_key text, subject text)
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  select vapid_public_key,vapid_private_key,vapid_subject
  from private.notification_runtime where id=1
$$;
revoke all on function public.notification_vapid_get() from public, anon, authenticated;
grant execute on function public.notification_vapid_get() to service_role;

create or replace function public.notification_vapid_initialize(p_public text,p_private text,p_subject text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare changed_rows integer := 0;
begin
  if p_public !~ '^[A-Za-z0-9_-]{80,120}$' or p_private !~ '^[A-Za-z0-9_-]{30,120}$' then
    raise exception 'Invalid VAPID keys';
  end if;
  update private.notification_runtime
  set vapid_public_key=p_public,vapid_private_key=p_private,vapid_subject=p_subject,updated_at=now()
  where id=1 and vapid_public_key is null;
  get diagnostics changed_rows = row_count;
  return changed_rows > 0;
end
$$;
revoke all on function public.notification_vapid_initialize(text,text,text) from public, anon, authenticated;
grant execute on function public.notification_vapid_initialize(text,text,text) to service_role;

-- Reinstala los jobs de forma idempotente.
do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname in ('habits-send-reminders','habits-push-cleanup') loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;

select cron.schedule(
  'habits-send-reminders',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://hlpaaemnjjixigkhnqdq.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-cron-secret',(select cron_secret from private.notification_runtime where id=1)
      ),
      body := jsonb_build_object('time',now()),
      timeout_milliseconds := 8000
    ) as request_id;
  $job$
);

select cron.schedule(
  'habits-push-cleanup',
  '17 3 * * *',
  $job$
    delete from public.push_deliveries where attempt_at < now() - interval '90 days';
  $job$
);
