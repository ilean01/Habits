-- La vista Agenda del día guarda solamente prioridades, gratitud y notas.
-- Eventos, tareas y hábitos siguen usando sus registros existentes.
alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries
 add constraint entries_kind_check
 check (kind in ('settings','area','habit','log','event','eventLog','task','project','book','reading','quote','journal','timer','word','dailyPlan'));
