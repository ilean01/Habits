-- Módulo Comidas: amplía los tipos sincronizables sin crear un segundo sistema de sync.
-- Los registros siguen usando public.entries, su RLS, revisionado, cola offline y Realtime.
alter table public.entries drop constraint if exists entries_kind_check;

alter table public.entries
  add constraint entries_kind_check
  check (kind in (
    'settings','area','habit','log','event','eventLog','task','project','book','reading','quote','journal',
    'timer','word','dailyPlan','photo','meal','activity','notice','device',
    'mealPlan','recipe','pantry','shopping'
  ));
