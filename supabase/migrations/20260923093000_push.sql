create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null check(endpoint like 'https://%' and length(endpoint)<4096),keys jsonb not null,
 timezone text not null default 'America/Asuncion',created_at timestamptz not null default now(),unique(user_id,endpoint)
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;
grant select,insert,update,delete on public.push_subscriptions to authenticated;
create policy push_owner on public.push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create table public.push_deliveries (
 subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
 occurrence text not null,attempt_at timestamptz not null default now(),sent_at timestamptz,
 primary key(subscription_id,occurrence)
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon,authenticated;
create or replace function public.claim_push(p_subscription uuid,p_occurrence text)
returns boolean language sql security invoker set search_path=public as $$
 with claimed as(insert into public.push_deliveries(subscription_id,occurrence) values(p_subscription,p_occurrence)
 on conflict(subscription_id,occurrence) do update set attempt_at=now()
 where push_deliveries.sent_at is null and push_deliveries.attempt_at<now()-interval '2 minutes'
 returning 1) select exists(select 1 from claimed)
$$;
revoke all on function public.claim_push(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_push(uuid,text) to service_role;
create index entries_user_updated_idx on public.entries(user_id,updated_at,id);
