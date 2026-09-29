alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries add constraint entries_kind_check check (kind = any (array['settings'::text,'area'::text,'habit'::text,'log'::text,'event'::text,'eventLog'::text,'task'::text,'project'::text,'book'::text,'reading'::text,'quote'::text,'journal'::text,'timer'::text,'word'::text,'dailyPlan'::text,'photo'::text,'meal'::text,'activity'::text,'notice'::text]));
create index if not exists entries_user_kind_updated_idx on public.entries(user_id,kind,updated_at desc,id);
