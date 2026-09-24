-- La Edge Function usa SUPABASE_SERVICE_ROLE_KEY, pero Postgres sigue exigiendo
-- privilegios de tabla además del bypass de RLS.
grant select,delete on public.push_subscriptions to service_role;
grant select,insert,update,delete on public.push_deliveries to service_role;
grant select on public.entries to service_role;
