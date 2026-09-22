# Habits · Tu día, a tu ritmo

Aplicación web instalable en español, diseñada para iPhone y Windows. Código en este repositorio; cuentas y datos en Supabase. Primera versión funcional, no implementación completa de todo el documento de ideas.

## Incluido

- Registro por email y contraseña, confirmación y recuperación de contraseña.
- Inicio con fecha/hora local, resumen de actividades realmente completadas y progreso.
- Hábitos personalizados: ícono, área, días, momento, meta, cantidad/minutos, pausas y archivo.
- Calendario mensual y agenda del día, eventos con repeticiones simples y registro de realización.
- Áreas personalizables; tareas, prioridades, fechas límite y proyectos.
- Biblioteca: libros, páginas, préstamos (campo de persona), reseñas, citas, temporizador y sesiones.
- Diario, estado de ánimo, logros espontáneos y vocabulario con tarjetas desplegables.
- Estadísticas semanales, rachas que respetan días programados y pausas, historial.
- Tema claro/oscuro, texto grande, búsqueda, papelera y exportación JSON.
- Demo local explícita. Cuenta real: caché por usuario, cola de cambios sin conexión, sincronización al recuperar conexión y cada 20 segundos, Realtime cuando esté habilitado, resolución explícita de conflictos.
- PWA: instalación y caché del programa después de la primera carga. No requiere instalar software en un servidor propio.

## 1. Crear las tablas en Supabase (necesario)

Proyecto: `https://hlpaaemnjjixigkhnqdq.supabase.co`.

En **SQL Editor → New query**, pegá todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsá **Run**. Crea la tabla, las políticas RLS y una función de escritura con control de versiones. El script es repetible. También hay una migración equivalente en `supabase/migrations` para la integración GitHub/Supabase; aplicar por uno de esos caminos basta.

La clave incluida en `src/config.js` es **publishable**, diseñada para el navegador. No es una clave administrativa. No agregues `service_role`, claves secretas ni contraseñas al repositorio.

La tabla nunca usa el email como autorización: `auth.uid()` identifica al dueño y RLS restringe cada operación. Se comprobó en PostgreSQL embebido que una cuenta no puede leer/escribir registros de otra.

## 2. Configurar el email

En Supabase, **Authentication → URL Configuration**:

- Site URL: `https://ilean01.github.io/Habits/`
- Redirect URLs: `https://ilean01.github.io/Habits/`
- Para desarrollo, agregar `http://localhost:5173/` si lo necesitás.

En **Authentication → Sign In / Providers → Email**, habilitá email/contraseña y confirmación de email.

Configurá SMTP propio en la sección de email de Authentication para enviar confirmaciones y recuperación a destinatarios reales. El remitente predeterminado de Supabase es solo para pruebas y está restringido. Mantené la verificación de email activa; no hace falta desactivarla para resolver un problema de entrega.

## 3. Publicar en GitHub Pages

En este repositorio, **Settings → Pages → Build and deployment → Source → GitHub Actions**.

El workflow `.github/workflows/deploy.yml` instala, ejecuta pruebas, compila y publica cada push a `main`. Si el primer intento ocurrió antes de habilitar Pages, abrí **Actions → Test and publish Habits → Run workflow**.

Dirección prevista: `https://ilean01.github.io/Habits/` (solo está disponible cuando el despliegue terminó correctamente).

También se puede alojar `dist/` en cualquier servidor estático HTTPS. Al cambiar el dominio, ajustá las URLs de Auth en Supabase. Nunca subas `node_modules` ni archivos `.env` al servidor público.

## Desarrollo

```sh
npm ci
npm run dev
npm test
npm run build
```

Node 22 o posterior. Copiá `.env.example` a `.env.local` si querés sobrescribir la conexión pública para otro entorno. `dist/` es el resultado de compilación. Las rutas son relativas, aptas para `/Habits/`.

## Cómo probar la app

1. Usá **Explorar la demo** para revisar el diseño sin crear cuentas. Sus datos se guardan solo en ese navegador y no se migran automáticamente a una cuenta.
2. Con SQL, URL y correo configurados, registrate con un email tuyo y confirmalo.
3. Creá un hábito y un evento. Iniciá sesión con la misma cuenta en otro dispositivo.
4. Completá el hábito: debe aparecer completado en ambos. La app refresca al volver a la ventana y cada 20 segundos (además de Realtime).
5. Probá el modo sin conexión tras una primera carga; revisá el indicador de cambios pendientes. No cierres/borras el almacenamiento del navegador hasta sincronizar.
6. Editá el mismo registro en ambos dispositivos sin conexión. Al reconectar, la app pide elegir una versión en lugar de perder cambios silenciosamente.
7. Probá recuperación de contraseña con un correo real. Este flujo necesita que SMTP y Redirect URLs estén configurados.

## Pruebas y límites actuales

`npm test` comprueba fechas, recurrencias, rachas, temporizadores y ejecuta el SQL contra PostgreSQL embebido (PGlite) para validar RLS, idempotencia, conflictos y borrado lógico. El flujo completo de email requiere validación contra el proyecto real después de configurarlo.

- Notificaciones push, alarmas en segundo plano, archivos/fotos, integración con calendarios externos, clima y feriados no están implementados.
- Calendario: vista mensual con agenda de fecha; editar una recurrencia modifica toda la serie. No hay excepciones por ocurrencia ni vista semanal arrastrable todavía.
- Facultad/trabajo usan áreas, eventos, tareas y proyectos; no hay un módulo específico de notas, asistencia ni cálculo de promedios.
- La lista avanzada de ideas (IA, planificación automática, voz, etc.) es un roadmap, no una lista de funciones ya terminadas.
- Exportación JSON disponible; importación automática aún no. La caché local y los datos de la demo pueden borrarse por el navegador. Supabase es la fuente remota de los registros sincronizados.
- Al registrar hábitos de días anteriores se guarda la fecha elegida y la hora real de registro. La zona horaria es la del dispositivo; deben tenerla configurada de forma consistente.
- Las sesiones de lectura son independientes de la ficha de hábito. Completar un temporizador no marca silenciosamente un hábito.
- No hay widgets nativos para iOS. Los cambios de versión se obtienen al reabrir la app online.

## Estructura

- `src/main.js`: vistas, formularios y navegación.
- `src/style.css`: diseño adaptable y temas.
- `src/domain.js`: reglas de calendario, hábitos y rachas.
- `src/store.js`: autenticación, caché, sincronización y conflictos.
- `supabase/schema.sql`: esquema y seguridad.
- `public/sw.js`: caché del programa, sin interceptar peticiones a Supabase.
