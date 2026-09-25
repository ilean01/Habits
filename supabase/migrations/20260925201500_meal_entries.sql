-- Alimentación forma parte del registro sincronizable de Habits.
alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries
  add constraint entries_kind_check
  check (kind in ('settings','area','habit','log','event','eventLog','task','project','book','reading','quote','journal','timer','word','dailyPlan','photo','meal'));
