# Requisitos de Habits

Lista oficial de lo pedido para la app y estado real del código.

✅ hecho · 🟡 parcial · ❌ falta · 🔧 programado pero falta activarlo/verificarlo en producción

Última revisión: 23 de septiembre de 2026 · consolidación HCI/ingeniería.

## Principio de datos

- ✅ Habits sigue siendo multiusuario: cada cuenta tiene sus propios hábitos, agenda, tareas, diario, progreso y demás datos.
- ✅ La Biblioteca avanzada es una función disponible para todas las cuentas. Cada cuenta tiene su propia biblioteca vacía al comenzar.
- ✅ Una biblioteca puede compartirse explícitamente sin copiar ni mezclar datos.
- ✅ Roles de Biblioteca: `reader` (ver), `editor` (ver/modificar) y `manager` (ver/modificar/administrar accesos).
- ✅ La biblioteca histórica de mamá sigue perteneciendo a su dueña y solo pueden abrirla las cuentas autorizadas. Revocar acceso no borra la biblioteca personal del invitado.

## 0. Producción (prioridad máxima)

- 🔧 Aplicar y verificar todas las migraciones en el Supabase real, en orden, incluidas `biblioteca_para_todos` y `biblioteca_gestores`.
- 🔧 Definir en producción quién es dueña/manager/reader/editor de la biblioteca histórica mediante `biblioteca_members`; `biblioteca_seleccion` mantiene qué biblioteca está viendo cada cuenta.
- 🔧 Importar y controlar los 1.470 libros, lecturas, personas, préstamos, configuraciones y portadas de la biblioteca histórica.
- 🔧 Definir un día de corte: desde ese día la Biblioteca nueva es la fuente activa y Flask queda solo como respaldo/lectura durante la validación.
- 🔧 VAPID, Edge Function `send-reminders`, cron y prueba de push real.
- 🔧 SMTP propio: registro, confirmación y recuperación de contraseña.
- ❌ Prueba real completa en iPhone instalado desde Safari y notebook Windows.
- ❌ Prueba real offline → modificar → reconectar → conflicto entre dispositivos.
- ❌ Comparación final pantalla por pantalla con Biblioteca Flask v18 y datos importados.

## 1. Cuenta, sincronización y datos

- ✅ Email y contraseña, confirmación y recuperación (código).
- ✅ Misma cuenta en iPhone y notebook, sincronización incremental.
- ✅ Offline con cola de cambios en IndexedDB.
- ✅ Resolución explícita de conflictos.
- ✅ PWA instalable y guía visual de instalación en iPhone.
- ✅ Exportar e importar JSON.
- ✅ Papelera y restauración.
- ✅ Selectores de dominio separan diario, Gym, Inglés, materias, proyectos e hidratación para evitar que un tipo de dato aparezca en una vista equivocada.

## 2. Mi día

- ✅ Fecha/hora y saludo completo según madrugada, mañana, tarde o noche; título, subtítulo y mensaje central siguen la misma franja.
- ✅ Resumen solo con lo registrado: hábitos, eventos realizados, lectura, logros y libros terminados en la Biblioteca activa.
- ✅ Progreso del día calculado sobre los hábitos realmente visibles para el tipo de día.
- ✅ Línea de tiempo, “También hice esto”, ánimo, Qué sigue, rato libre y cierre del día.
- ✅ “Tengo un rato libre” respeta tiempo disponible, tipo de día y metas semanales ya cumplidas.
- ✅ Agua de hoy aparece como acción; promedios e historial están en Progreso para reducir carga visual.
- ✅ Rincón de lectura conectado a la Biblioteca avanzada activa.
- ❌ Elegir manualmente qué bloques aparecen en Mi día.

## 3. Hábitos y fichas

- ✅ Nombre, ícono visual, color, área, días, momento, hora sugerida, nota y recordatorio.
- ✅ Tipos: completar, tiempo y cantidad.
- ✅ Agua tiene una sola fuente de verdad: tomas en ml/L alimentan el mismo hábito; el hábito inicial viejo de 8 vasos se migra a 2 L y conserva historial convertible.
- ✅ Hoy no, pausar/archivar, X veces por semana.
- ✅ Reordenado por arrastre en notebook y modo Reordenar con flechas para móvil/touch.
- ✅ Metas flexibles semanales no penalizan días sin registro; si se hicieron hoy sí cuentan en el progreso de hoy.
- ✅ Rachas diarias se muestran en días y rachas flexibles en semanas.
- ✅ Días configurados como descanso, incluso recurrentes, no rompen rachas.
- ✅ Tipos de día con comportamiento real: habitual, trabajo, facultad, fin de semana, tranquilo y descanso.
- ❌ Duplicar ficha. ❌ Favoritas fijadas. ❌ Subtareas/checklist.
- ❌ Meta mínima + ideal. ❌ Tipo avance/lista de pasos. ❌ Adjuntos/portada de hábito.

## 4. Calendario y eventos

- ✅ Vista mensual y semanal, navegación Hoy/anterior/siguiente, feriados PY.
- ✅ Repeticiones y editar/cancelar una sola ocurrencia.
- ✅ Detección de choque antes de guardar, incluidos eventos sin hora final y recurrencias futuras; se puede cancelar o guardar igualmente de forma explícita.
- ✅ Agenda próxima dentro de cada área.
- ❌ Vista Día y vista Agenda cronológica completa.
- ❌ Arrastrar eventos. ❌ Filtro por área dentro del calendario. ❌ Hábitos como capa opcional del calendario.

## 5. Tareas, proyectos y Para después

- ✅ Tareas con fecha límite y prioridad. Proyectos personales.
- ✅ Materias se excluyen de Proyectos mediante un selector de dominio; no vuelven a mezclarse por usar el mismo almacenamiento legado.
- ✅ “Para después” es una bandeja explícita dentro de Más para tareas sin fecha.
- ❌ Subtareas. ❌ Vistas dedicadas Hoy/Semana/Vencidas.

## 6. Trabajo

- ✅ Horario laboral semanal.
- ✅ Durante un bloque laboral activo, Trabajo sube de prioridad sin ocultar los datos personales.
- ✅ Día de trabajo prioriza hábitos del área Trabajo.
- ✅ Opción para pausar avisos personales durante bloques laborales.
- ❌ Entrada/salida y horas trabajadas. ❌ Notas laborales separadas. ❌ Modo desconectar completo.

## 7. Facultad

- ✅ Materias, semestre, aula, notas/promedio, exámenes/entregas y horario semanal.
- ✅ Día de Facultad prioriza esa área.
- ✅ Materias no aparecen como proyectos personales.
- ❌ Docente/color por materia, asistencia, archivos, Pomodoro, plan de estudio automático y archivo de semestre.

## 8. Inglés

- ✅ Vocabulario y práctica por Comprensión auditiva, Lectura, Conversación y Escritura con minutos semanales.
- ✅ Prácticas de inglés no aparecen en el diario personal.
- ❌ Nivel/meta, tareas de curso, gramática/unidades y exámenes internacionales.

## 9. Biblioteca

- ✅ Mismas funciones avanzadas para todas las cuentas: catálogo, fichas, filtros, cuadrícula/lista, favoritos, autografiados, lectura, historial, préstamos, deseos, leer después, papelera, revisión, duplicados, ISBN/cámara, datos externos, portadas, etiquetas PDF, CSV/JSON, respaldos, estadísticas y recomendador.
- ✅ Cada cuenta tiene su propia biblioteca; selector para cambiar entre la propia y bibliotecas compartidas autorizadas.
- ✅ `reader`, `editor`, `manager` y revocación protegidos por RLS/RPC.
- ✅ Tests específicos cubren biblioteca propia, aislamiento, reader/editor/manager, selección y revocación.
- ✅ Habits usa la Biblioteca activa para lectura actual, avance, libro terminado y resumen.
- ✅ Caché de lectura de Habits separado por cuenta + biblioteca activa para no mezclar la propia con la de mamá al trabajar offline.
- ✅ Biblioteca hereda modo claro/oscuro y texto grande de Habits, mejora tamaños táctiles y avisa si se intenta cerrar un formulario con cambios.
- 🟡 Sigue siendo una ruta/página propia (`biblioteca.html`) para mantener el módulo aislado; visualmente se alinea con Habits y vuelve a Habits desde su cabecera.
- 🟡 QR de portadas requiere sesión; el Flask original usaba token temporal.
- 🟡 Recomendador actual usa reglas simples.
- ❌ Migración automática de libros/citas del sistema simple legado de Habits al catálogo avanzado para cuentas antiguas; no se borra el legado hasta verificar la migración.

## 10. Progreso y motivación

- ✅ Progreso es destino principal en notebook y móvil, no un parche posterior del DOM.
- ✅ Semana, rachas con unidad correcta, heatmap, lectura, libros terminados y logros básicos.
- ✅ Promedio diario de agua, total semanal y detalle día por día viven en Progreso.
- ❌ Horas por área/balance, hora promedio por hábito y resumen mensual.

## 11. Navegación, HCI y accesibilidad

- ✅ Arquitectura principal coherente: Mi día / Calendario / Áreas / Progreso / Diario / Más en notebook; Hoy / Calendario / Áreas / Progreso / Más en móvil.
- ✅ Breadcrumb empieza en Habits, no en “Mi espacio”.
- ✅ “Más” reúne Diario, Pendientes, Para después, Biblioteca, Proyectos y Estudio/Trabajo sin crear copias de esos datos.
- ✅ Controles principales tienen objetivo táctil de ~44–46 px y la metadata importante deja de usar tamaños microscópicos.
- ✅ “Texto más grande” escala tipografía/controles sin depender de hacer zoom solo sobre `.content`.
- ✅ Formularios de Habits y Biblioteca avisan antes de descartar cambios sin guardar.
- ✅ `enhancements.js` ya no inyecta Progreso/agua/navegación; esas funciones viven en las vistas reales. Se mantiene solo para mejoras acotadas del editor, contexto laboral, instalación y feriado de hoy.
- ❌ Onboarding guiado de primera semana.

## 12. Recordatorios

- 🔧 Código de push: service worker, suscripciones, Edge Function y cron.
- 🔧 Falta configurar secretos reales y validar recepción con app cerrada en iPhone.
- ❌ Acciones desde la notificación: Lo hice / En 15 min / Cambiar horario / Hoy no.

## 13. Ingeniería y calidad

- ✅ `selectors.js` centraliza separación semántica de registros legado.
- ✅ `day-context.js` centraliza comportamiento de tipos de día y sugerencias de tiempo libre.
- ✅ `scheduling.js` centraliza detección de choques.
- ✅ `progress-view.js` separa Progreso del `main.js` monolítico.
- ✅ Tests de lógica, PGlite, IndexedDB, seguridad Biblioteca, HCI básica y build automático.
- 🟡 `main.js` todavía debe seguir dividiéndose por vistas/editores en refactors posteriores; ya se extrajeron varias responsabilidades nuevas.
- ❌ Falta suite E2E con navegador real/Playwright y capturas visuales responsive.

## Regla de producto

Antes de sumar otra función grande, se prioriza: datos coherentes, una sola fuente de verdad por concepto, navegación predecible, accesibilidad, tests y validación real en producción.
