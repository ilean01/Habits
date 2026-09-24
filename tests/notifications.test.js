import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Ajustes permite activar, probar y desactivar avisos con clave del servidor',async()=>{
 const src=await read('src/notifications.js');
 assert.match(src,/push-enable/);assert.match(src,/push-test/);assert.match(src,/push-disable/);
 assert.match(src,/functions\/v1\/send-reminders/);
 assert.match(src,/showNotification\('Habits · aviso de prueba'/);
 assert.match(src,/onConflict:'user_id,endpoint'/);
});

test('service worker muestra push y reutiliza una ventana abierta',async()=>{
 const sw=await read('public/sw.js');
 assert.match(sw,/addEventListener\('push'/);
 assert.match(sw,/showNotification/);
 assert.match(sw,/clients\.matchAll/);
 assert.match(sw,/existing\.focus\(\)/);
 assert.match(sw,/habits-notification-click/);
});

test('dispatcher respeta seguridad, modos de día y suscripciones vencidas',async()=>{
 const fn=await read('supabase/functions/send-reminders/index.ts');
 assert.match(fn,/notification_cron_valid/);
 assert.match(fn,/notification_vapid_initialize/);
 assert.match(fn,/effectiveDayMode/);
 assert.match(fn,/dayModeAllowsHabit/);
 assert.match(fn,/quietWork/);
 assert.match(fn,/\[404,410\]/);
 assert.match(fn,/\.gt\('id',lastId\)/);
});

test('migración activa cron, guarda secretos fuera de public y limpia deduplicación vieja',async()=>{
 const sql=await read('supabase/migrations/20260924010000_complete_notifications.sql');
 const config=await read('supabase/config.toml');
 assert.match(sql,/create extension if not exists pg_cron/i);
 assert.match(sql,/private\.notification_runtime/);
 assert.match(sql,/habits-send-reminders/);
 assert.match(sql,/habits-push-cleanup/);
 assert.match(sql,/90 days/);
 assert.match(config,/\[functions\.send-reminders\]/);
 assert.match(config,/verify_jwt = false/);
});
