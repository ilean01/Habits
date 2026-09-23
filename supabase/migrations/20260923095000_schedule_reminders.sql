-- Programa la Edge Function send-reminders una vez por minuto.
-- Antes de que el job pueda enviar, crear en Vault:
--   project_url            = https://<project-ref>.supabase.co
--   reminder_cron_secret   = el mismo REMINDER_CRON_SECRET de la Edge Function
-- La función send-reminders valida x-cron-secret y se despliega con JWT verification desactivada.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'habits-send-reminders';

select cron.schedule(
  'habits-send-reminders',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1)
             || '/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret' limit 1)
      ),
      body := jsonb_build_object('time', now()),
      timeout_milliseconds := 5000
    ) as request_id;
  $job$
);
