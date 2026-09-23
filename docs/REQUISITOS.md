# Requisitos de Habits

Lista oficial de lo pedido para la app. Cada cambio se valida contra esta lista.

✅ hecho · 🟡 parcial · ❌ falta · 🔧 programado pero falta activarlo/probarlo en producción

Última revisión: 23 de septiembre de 2026.

## 0. Producción (prioridad máxima)

- 🔧 Aplicar y verificar todas las migraciones en el Supabase real, en orden.
- ✅ Verificada la arquitectura de bibliotecas personales, `biblioteca_members`, `biblioteca_seleccion` y roles reader/editor/manager en código y pruebas.
- 🔧 Importar los 1.470 libros, lecturas, personas, préstamos, configuraciones y portadas históricas de mamá; controlar cantidades y rendimiento real.
- 🔧 Definir un día de corte: desde ese día solo se usa la Biblioteca nueva (la app Flask queda de solo lectura).
- 🔧 VAPID, Edge Function `send-reminders`, cron y prueba de push real.
- 🔧 SMTP propio: registro, confirmación y recuperación de contraseña.
- ✅ GitHub Pages ejecuta tests, build y Playwright antes de publicar; si E2E falla, no hay deploy.
- 🟡 Falta activar protección de `main`/required checks desde la configuración administrativa de GitHub para impedir también merges o pushes directos con CI rojo.
- ❌ Prueba real en iPhone instalado desde Safari y en la notebook Windows.
- ❌ Prueba offline → modificar → reconectar → conflicto entre dispositivos.
- ❌ Comparación pantalla por pantalla con la Biblioteca Flask v18 y datos reales.

## 1. Cuenta, sincronización y datos

- ✅ Email y contraseña, confirmación y recuperación (código).
- ✅ Misma cuenta en iPhone y notebook, sincronización incremental.
- ✅ Offline con cola de cambios en IndexedDB.
- ✅ Resolución explícita de conflictos.
- ✅ PWA instalable y guía de instalación en iPhone.
- ✅ Exportar e importar JSON de datos estructurados.
- ✅ Papelera y deshacer.
- 🟡 Fotos/archivos privados todavía requieren estrategia de respaldo completa además del JSON estructurado.

## 2. Mi día

- ✅ Fecha y hora, saludo con nombre y según el momento (incluida la madrugada).
- ✅ Resumen solo con lo registrado: hábitos, eventos realizados, lectura, logros y libros terminados en la Biblioteca.
- ✅ Progreso del día, línea de tiempo, "También hice esto", ánimo.
- ✅ Qué sigue, rato libre, cierre del día, resumen semanal, clima de Asunción.
- ✅ Rincón de lectura conectado al catálogo de la Biblioteca cuando corresponde.
- 🟡 Inicio que cambia por momento del día (principalmente saludo/subtítulo y priorización de contexto).
- ❌ Elegir qué bloques aparecen en Mi día.

## 3. Hábitos y fichas

- ✅ Nombre, ícono (selector visual), color, área, días, momento, hora sugerida, nota.
- ✅ Tipos: completar, tiempo, cantidad. Agua por tomas.
- ✅ Hoy no, pausar/archivar, reordenar con mouse o controles táctiles, X veces por semana.
- ✅ Rachas que respetan días programados.
- ✅ Tipos de día: habitual, tranquilo, trabajo, facultad, fin de semana, descanso.
- ❌ Duplicar ficha. ❌ Favoritas fijadas. ❌ Subtareas/checklist.
- ❌ Meta mínima + meta ideal. ❌ Tipo "avance" y "lista de pasos".
- ❌ Adjuntos y portada propia. ❌ Actividades de una sola vez.
- ❌ "Empezar mi mañana" guiado. ❌ Pausa explícita por vacaciones/enfermedad.

## 4. Calendario y eventos

- ✅ Vista mensual y semanal. Repeticiones. Editar/cancelar una ocurrencia.
- ✅ Feriados de Paraguay.
- ❌ Vista Día y vista Agenda. ❌ Arrastrar eventos.
- ✅ Aviso de choque antes de guardar eventos creados desde el editor principal, incluidas recurrencias futuras y eventos sin hora final.
- 🟡 Los horarios semanales creados desde Planificación todavía deben pasar por exactamente el mismo servicio central de validación.
- ❌ Días cargados. ❌ Filtro por área.
- ❌ Hábitos visibles dentro del calendario como capa opcional.
- ❌ Mapa, traslado, cosas para llevar, preparación, documentos.
- ❌ Estado por confirmar/confirmado/cancelado. ❌ Cuenta regresiva.

## 5. Tareas, proyectos y Para después

- ✅ Tareas con fecha límite y prioridad. Proyectos. Bandeja "Para después".
- 🟡 Pendientes y Para después todavía deben quedar mutuamente excluyentes: con fecha / sin fecha / completadas.
- ❌ Subtareas en tareas. ❌ Vistas Hoy/Semana/Vencidas.

## 6. Trabajo

- ✅ Horario laboral semanal. Prioridad de lo laboral dentro del horario.
- ❌ Entrada/salida y horas trabajadas. ❌ Reuniones con temas.
- ❌ Notas laborales separadas. ❌ Modo "Desconectar" y ocultar lo laboral fuera de horario.

## 7. Facultad

- ✅ Materias, semestre, aula, notas y promedio. Exámenes/entregas. Horario semanal.
- ❌ Docente y color por materia. ❌ Apuntes, fotos del pizarrón, archivos.
- ❌ Asistencia. ❌ Estado de TP. ❌ Parcial/final/recuperatorio estructurados.
- ❌ Evaluaciones con peso y cálculo de nota necesaria.
- ❌ Pomodoro y sesiones de estudio. ❌ Plan de estudio por fecha de examen.
- ❌ Archivar semestre.

## 8. Inglés

- ✅ Vocabulario con tarjetas. Práctica por habilidad con minutos semanales.
- ❌ Nivel actual y meta. ❌ Tareas del curso. ❌ Frases y gramática.
- ❌ Libros en inglés desde la Biblioteca. ❌ Unidades. ❌ Exámenes internacionales.

## 9. Biblioteca

- ✅ Es un destino propio dentro de Habits en notebook y móvil.
- ✅ Catálogo, búsqueda sin tildes y por "LR 618", filtros, cuadrícula/lista.
- ✅ Favoritos, autografiados, Estoy leyendo, página, concluir/abandonar, historial.
- ✅ Préstamos con persona, fecha prevista, devolución, perdido e historial por persona.
- ✅ Deseos, Leer después con "Empezar a leer", papelera, revisión, duplicados.
- ✅ ISBN, cámara, datos externos, portadas, etiquetas PDF, CSV/JSON, respaldos, estadísticas.
- ✅ Cada cuenta tiene su propia biblioteca vacía al empezar con las mismas funciones avanzadas.
- ✅ La biblioteca de mamá es una colección distinta: solo acceden las cuentas autorizadas y nunca se mezclan sus datos con la biblioteca personal de quien la abre.
- ✅ Roles reader/editor/manager y RLS en tablas/archivos.
- ✅ Habits muestra la lectura actual del catálogo y guarda página/final con `biblioteca_transition`.
- ✅ Cuando Biblioteca está dentro de Habits no muestra una segunda marca/segunda cabecera; usa el shell de Habits, subnavegación propia del catálogo y selector visible de biblioteca activa.
- ✅ Tema claro/oscuro, Texto grande y reducción de movimiento se sincronizan desde Habits a la Biblioteca embebida.
- ✅ Tipografía del catálogo reducida y alineada con la escala visual de Habits, manteniendo inputs móviles de 16 px para evitar zoom accidental.
- ✅ Altura del catálogo se comunica al contenedor para evitar la sensación de una página independiente con scroll interno fijo.
- 🟡 QR de portadas: pide sesión (el original usaba token temporal).
- 🟡 Recomendador por reglas simples; conviene unificarlo con la lógica de recomendaciones de la Bibliotecaria.
- 🟡 La implementación interna todavía conserva `biblioteca.html` aislada dentro del shell para proteger las funciones originales. A largo plazo puede convertirse en una ruta/vista nativa sin iframe, pero visualmente debe comportarse como una sola app.
- ❌ Importar los datos históricos reales de mamá al Supabase de producción.
- ❌ Citas y libros simples heredados de Habits migrados al catálogo; mientras tanto solo deben conservarse como legado, no como una segunda Biblioteca nueva.

## 10. Planificación semanal y balance

- ✅ Semana con horarios fijos.
- ❌ Arrastrar, copiar semana, tres prioridades, tiempo libre protegido.
- ❌ Medidor de carga, sugerencia de descanso, semana de exámenes.

## 11. Progreso y motivación

- ✅ Semana, rachas con unidad correcta (días/semanas), heatmap, lectura, libros terminados, agua, logros básicos.
- ❌ Unificar definitivamente el cálculo de "hábitos efectivos del día" entre Mi día, Calendario, heatmap y Progreso.
- ❌ Horas por área y balance. ❌ Hora promedio por hábito. ❌ Resumen mensual/cartita.
- ❌ Relación ánimo-actividades. ❌ Tono cálido/directo/entusiasta configurable.
- ❌ Frases y motivos propios. ❌ Activar/desactivar medallas y confeti.
- ❌ Celebrar la vuelta a un hábito.

## 12. Recordatorios

- 🔧 Push: service worker, suscripciones y Edge Function existen; falta activación/cron/secretos y prueba real en dispositivo.
- ❌ Deep-link completo: tocar la notificación debe abrir la fecha/actividad correcta dentro de Habits.
- ❌ Acciones en el aviso: Lo hice · En 15 minutos · Cambiar horario · Hoy no.
- ❌ Agrupar avisos, centro de recordatorios, importante vs. sugerencia.

## 13. Personalización y accesibilidad

- ✅ Claro/oscuro, escala de texto global, blancos táctiles de 44 px, diseño adaptable y reducción de movimiento.
- ✅ Aviso antes de cerrar formularios con cambios sin guardar.
- ✅ Opción "Reducir animaciones" y respeto por `prefers-reduced-motion`.
- ❌ Foto de perfil. ❌ Resumen en voz alta. ❌ Dictado.
- ❌ Ayuda contextual. ❌ Modo discreto.
- ❌ Restaurar disposición sin borrar datos.

## 14. Calidad y coherencia de interacción

- ✅ Notebook: Progreso, Diario, Biblioteca y Más son destinos reales.
- ✅ Móvil: destinos primarios Mi día, Calendario, Biblioteca y Más; Más conserva accesos a Mis áreas, Progreso, Mi diario y Para después.
- ✅ Diario excluye registros técnicos de Gym, Inglés y logros; materias y proyectos personales tienen selectores separados.
- ✅ Hidratación usa una sola fuente de verdad: las tomas completan la meta de agua, incluido el hábito legado de 8 vasos.
- ✅ Formularios avisan antes de descartar cambios; papelera, pausas y agua ofrecen deshacer donde corresponde.
- ✅ Tests unitarios, PGlite, JSDOM y Playwright cubren navegación y choque de agenda.
- ✅ El deploy de GitHub Pages queda bloqueado hasta que tests, build y Playwright terminen correctamente.
- 🟡 Falta E2E con una cuenta Supabase real, Biblioteca compartida real, offline/reconexión y WebKit/iPhone.
- 🟡 Refactor de `main.js` por vistas puede continuar sin cambiar comportamiento; ya se centralizaron selectores y reglas de dominio.
