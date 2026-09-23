# Activación de producción · Habits

El código ya contiene la infraestructura de recordatorios, sincronización incremental, IndexedDB y Biblioteca. Este archivo enumera únicamente los valores secretos o configuraciones del proyecto real que no deben escribirse en Git.

## 1. Aplicar migraciones

Aplicar las migraciones de `supabase/migrations` en orden. Las últimas agregan:

- índice `(user_id, updated_at, id)` para sincronización incremental;
- suscripciones y entregas push;
- cron de `send-reminders` cada minuto;
- Biblioteca, Storage y transacciones.

## 2. Recordatorios push

Generar un par VAPID localmente:

```sh
npm run vapid
```

Guardar:

- `VAPID_PUBLIC_KEY`: secreto/configuración de la Edge Function y variable pública `VITE_VAPID_PUBLIC_KEY` del build de GitHub Pages.
- `VAPID_PRIVATE_KEY`: solo secreto de la Edge Function.
- `VAPID_SUBJECT`: por ejemplo `mailto:correo-real@dominio.com`.
- `REMINDER_CRON_SECRET`: cadena aleatoria larga, solo servidor.

La Edge Function `send-reminders` debe desplegarse con verificación JWT desactivada porque autentica al cron mediante `x-cron-secret`.

En Supabase Vault crear:

- `project_url`: URL HTTPS del proyecto Supabase.
- `reminder_cron_secret`: exactamente el mismo valor de `REMINDER_CRON_SECRET`.

La migración `20260923095000_schedule_reminders.sql` programa el POST cada minuto con `pg_cron` + `pg_net`.

## 3. GitHub Pages

Crear la variable de Actions/Pages `VITE_VAPID_PUBLIC_KEY` con la clave pública. El workflow de despliegue la incorpora automáticamente al build. Nunca guardar la clave privada en GitHub Pages ni en variables `VITE_*`.

## 4. SMTP de Supabase Auth

Configurar un SMTP propio en Authentication para confirmación de cuenta y recuperación de contraseña. Mantener confirmación de email activa y configurar como URLs permitidas:

- `https://ilean01.github.io/Habits/`
- `http://localhost:5173/` para desarrollo, si se usa.

Las credenciales SMTP (host, puerto, usuario y contraseña) son secretos del proveedor de correo y no deben guardarse en este repositorio.

## 5. Prueba final obligatoria

Antes de considerar producción terminada:

1. instalar Habits desde Safari en un iPhone;
2. iniciar sesión con una cuenta real;
3. activar notificaciones tocando el botón dentro de la app;
4. crear un hábito con hora sugerida y recordatorio cercano;
5. comprobar recepción del push con la app cerrada;
6. comprobar confirmación y recuperación por email;
7. modificar un registro offline en notebook y otro dispositivo, reconectar y comprobar el diálogo de conflicto;
8. verificar que el segundo sync descarga solo cambios recientes y que IndexedDB conserva los datos al recargar.
