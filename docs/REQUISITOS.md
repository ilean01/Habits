# Requisitos de Habits

Lista oficial de lo pedido para la app. Cada cambio se valida contra esta lista.

✅ hecho · 🟡 parcial · ❌ falta · 🔧 programado pero falta activarlo en producción

Última revisión: 23 de septiembre de 2026.

## 0. Producción (prioridad máxima)

- 🔧 Aplicar y verificar todas las migraciones en el Supabase real, en orden.
- 🔧 Verificar en Supabase real bibliotecas personales, `biblioteca_members`, `biblioteca_seleccion` y roles reader/editor/manager.
- 🔧 Importar los 1.470 libros, lecturas, personas, préstamos, configuraciones y 59 portadas; controlar cantidades.
- 🔧 Definir un día de corte: desde ese día solo se usa la Biblioteca nueva (la app Flask queda de solo lectura).
- 🔧 VAPID, Edge Function `send-reminders`, cron y prueba de push real.
- 🔧 SMTP propio: registro, confirmación y recuperación de contraseña.
- ❌ Prueba real en iPhone instalado desde Safari y en la notebook Windows.
- ❌ Prueba offline → modificar → reconectar → conflicto entre dispositivos.
- ❌ Comparación pantalla por pantalla con la Biblioteca Flask v18 y datos reales.
- ❌ Confirmar que el último commit de `main` es el publicado en GitHub Pages.

## 1. Cuenta, sincronización y datos

- ✅ Email y contraseña, confirmación y recuperación (código).
- ✅ Misma cuenta en iPhone y notebook, sincronización incremental.
- ✅ Offline con cola de cambios en IndexedDB.
- ✅ Resolución explícita de conflictos.
- ✅ PWA instalable y guía de instalación en iPhone.
- ✅ Exportar e importar JSON.
- ✅ Papelera y deshacer.

## 2. Mi día

- ✅ Fecha y hora, saludo con nombre y según el momento (incluida la madrugada).
- ✅ Resumen solo con lo registrado: hábitos, eventos realizados, lectura, logros y libros terminados en la Biblioteca.
- ✅ Progreso del día, línea de tiempo, "También hice esto", ánimo.
- ✅ Qué sigue, rato libre, cierre del día, resumen semanal, clima de Asunción.
- ✅ Rincón de lectura conectado al catálogo de la Biblioteca (si la cuenta tiene acceso).
- 🟡 Inicio que cambia por momento del día (solo saludo y subtítulo).
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
- ✅ Aviso de choque antes de guardar, incluidas recurrencias futuras y eventos sin hora final. ❌ Días cargados. ❌ Filtro por área.
- ❌ Hábitos visibles dentro del calendario.
- ❌ Mapa, traslado, cosas para llevar, preparación, documentos.
- ❌ Estado por confirmar/confirmado/cancelado. ❌ Cuenta regresiva.

## 5. Tareas, proyectos y Para después

- ✅ Tareas con fecha límite y prioridad. Proyectos. Bandeja "Para después".
- ❌ Subtareas en tareas. ❌ Vistas Hoy/Semana/Vencidas.

## 6. Trabajo

- ✅ Horario laboral semanal. Prioridad de lo laboral dentro del horario.
- ❌ Entrada/salida y horas trabajadas. ❌ Reuniones con temas.
- ❌ Notas laborales separadas. ❌ Modo "Desconectar" y ocultar lo laboral fuera de horario.

## 7. Facultad

- ✅ Materias, semestre, aula, notas y promedio. Exámenes/entregas. Horario semanal.
- ❌ Docente y color por materia. ❌ Apuntes, fotos del pizarrón, archivos.
- ❌ Asistencia. ❌ Estado de TP. ❌ Parcial/final/recuperatorio.
- ❌ Pomodoro y sesiones de estudio. ❌ Plan de estudio por fecha de examen.
- ❌ Archivar semestre.

## 8. Inglés

- ✅ Vocabulario con tarjetas. Práctica por habilidad con minutos semanales.
- ❌ Nivel actual y meta. ❌ Tareas del curso. ❌ Frases y gramática.
- ❌ Libros en inglés desde la Biblioteca. ❌ Unidades. ❌ Exámenes internacionales.

## 9. Biblioteca

- ✅ Catálogo, búsqueda sin tildes y por "LR 618", filtros, cuadrícula/lista.
- ✅ Favoritos, autografiados, Estoy leyendo, página, concluir/abandonar, historial.
- ✅ Préstamos con persona, fecha prevista, devolución, perdido e historial por persona.
- ✅ Deseos, Leer después con "Empezar a leer", papelera, revisión, duplicados.
- ✅ ISBN, cámara, datos externos, portadas, etiquetas PDF, CSV/JSON, respaldos, estadísticas.
- ✅ Cada cuenta tiene su propia biblioteca (vacía al empezar) con todas las funciones.
- ✅ La biblioteca de mamá solo la ven las cuentas que su dueña invite por correo (solo ver o editar); se puede quitar el acceso en cualquier momento. RLS en tablas y archivos.
- ✅ Habits muestra la lectura actual del catálogo y guarda página/final con `biblioteca_transition`.
- 🟡 QR de portadas: pide sesión (el original usaba token temporal).
- 🟡 Recomendador por reglas simples. 🟡 Configuración tipográfica sin cotejar.
- 🟡 Biblioteca sigue siendo una página especializada, pero comparte lenguaje visual, blancos táctiles y regreso claro a Habits.
- ❌ Citas y libros simples de Habits migrados al catálogo para cuentas con Biblioteca.

## 10. Planificación semanal y balance

- ✅ Semana con horarios fijos.
- ❌ Arrastrar, copiar semana, tres prioridades, tiempo libre protegido.
- ❌ Medidor de carga, sugerencia de descanso, semana de exámenes.

## 11. Progreso y motivación

- ✅ Semana, rachas con unidad correcta (días/semanas), heatmap, lectura, libros terminados, agua, logros básicos.
- ❌ Horas por área y balance. ❌ Hora promedio por hábito. ❌ Resumen mensual/cartita.
- ❌ Relación ánimo-actividades. ❌ Tono cálido/directo/entusiasta.
- ❌ Frases y motivos propios. ❌ Activar/desactivar medallas y confeti.
- ❌ Celebrar la vuelta a un hábito.

## 12. Recordatorios

- 🔧 Push: service worker, suscripciones, Edge Function, cron.
- ❌ Acciones en el aviso: Lo hice · En 15 minutos · Cambiar horario · Hoy no.
- ❌ Agrupar avisos, centro de recordatorios, importante vs. sugerencia.

## 13. Personalización y accesibilidad

- ✅ Claro/oscuro, escala de texto global, blancos táctiles de 44 px, diseño adaptable y reducción de movimiento.
- ❌ Foto de perfil. ❌ Desactivar animaciones. ❌ Resumen en voz alta. ❌ Dictado.
- ❌ Ayuda contextual. ❌ Modo discreto. ❌ Aviso de formulario sin guardar.
- ❌ Restaurar disposición sin borrar datos.

## 14. Calidad y coherencia de interacción

- ✅ Progreso es destino real en notebook y móvil; Para después vive dentro de Más.
- ✅ Diario excluye registros técnicos de Gym, Inglés y logros; materias y proyectos personales tienen selectores separados.
- ✅ Hidratación usa una sola fuente de verdad: las tomas completan la meta de agua, incluido el hábito legado de 8 vasos.
- ✅ Formularios avisan antes de descartar cambios; papelera, pausas y agua ofrecen deshacer donde corresponde.
- ✅ Tests unitarios, PGlite, JSDOM y Playwright en notebook/móvil cubren navegación y choque de agenda.
- 🟡 Refactor de `main.js` por vistas puede continuar sin cambiar comportamiento; ya se centralizaron selectores y reglas de dominio.
