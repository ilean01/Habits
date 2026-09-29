# Comparación con biblioteca.zip — 28 de septiembre de 2026

Fuente consultada: formulario.html, libro.html y las rutas agregar / editar de app.py de la biblioteca original. No se publica el catálogo ni archivos privados en este documento.

## Correcciones verificadas en esta entrega

- Alta y edición comparten un formulario con los metadatos originales, sugerencias de códigos, géneros e idiomas, autógrafo, favoritos y próximas lecturas.
- Búsqueda por ISBN, título/autor, sinopsis y portadas dentro del formulario. Completar información solo ocupa campos vacíos; elegir portada no altera sinopsis y viceversa.
- Portada al crear o editar: archivo, pegar, arrastrar, URL, previsualizar, sustituir y quitar. Si falla subir la portada después de crear el libro, reintentar Guardar no inserta otro ejemplar.
- Numeración automática por biblioteca y código de propietario, serializada en PostgreSQL. Los números existentes permanecen intactos. Un deseo se numera al entrar al catálogo.
- Puntuación 1–10; la migración amplía la validación sin reinterpretar puntuaciones existentes.
- Guardar abre la ficha. La ficha usa etiquetas legibles y conserva las acciones de lectura, portada y papelera.
- Temporizador antes del catálogo; historial y citas desplegables para mantener la pantalla corta.
- Catálogo de 24 ejemplares por defecto. Selector visible 12/24/48/100/200/500/todos, navegación arriba y abajo, preferencia por cuenta/biblioteca en el dispositivo. Ningún libro se elimina para reducir la lista.

## Diferencias de flujo que siguen existiendo

- La edición usa Guardar explícito; la original también permitía autoguardado al editar cada campo en la ficha.
- El QR para portada requiere guardar primero el libro. El token temporal para subir desde otro celular antes de crear el ejemplar no está reproducido.
- Las búsquedas usan Google Books y Open Library, sujetas a disponibilidad, CORS y cuotas. No garantizan los mismos resultados que el servidor Flask original.
- Esta entrega verifica alta, edición, numeración, permisos, paginación y acceso al temporizador. No constituye una certificación de identidad completa de todas las rutas de Flask.

## Verificación

Pruebas de formulario con DOM: preservar contenido propio, casillas, valoración y separación de datos/portada. Pruebas PostgreSQL: número secuencial, deseo convertido en catálogo, cambio de propietario y preservación de números anteriores. Pruebas de permisos de lectura/escritura existentes ejecutadas con la migración nueva. Prueba real de inserción dentro de una transacción revertida: números 1 y 2, puntuaciones 9 y 10. Catálogo real antes/después: 1.470 libros, 1.327 numerados.

El asesor de Supabase conserva avisos previos sobre funciones SECURITY DEFINER de acceso y tablas sin políticas destinadas a uso interno. La función nueva es SECURITY INVOKER y no amplía RLS. También persiste la protección de contraseñas filtradas desactivada: [configuración y explicación oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Ampliación del 29 de septiembre de 2026

Se implementaron los pendientes funcionales identificados en la comparación:

- Edición dentro de la ficha con autoguardado por campo, estado visible, cola serial y reintento. La escritura compara el valor anterior para detectar cambios concurrentes; no sobrescribe silenciosamente un campo modificado en otro dispositivo.
- QR previo al alta: borrador privado de portada por una hora. Requiere sesión y permiso de edición; el enlace conserva el destino durante el login. El libro se crea solo al guardar. Archivos temporales no referenciados se eliminan con la limpieza existente después de 24 horas; las filas expiradas dejan de ser accesibles.
- Búsqueda general de imágenes y extractos de sinopsis mediante una función autenticada, con consulta personalizada, fuente visible y búsqueda manual alternativa. Los resultados externos dependen de la disponibilidad del buscador y no garantizan cubrir un título determinado.
- Columnas elegibles en lista y cuadrícula; orden ascendente/descendente y encabezados interactivos. Preferencias por cuenta y biblioteca en el dispositivo.
- Inicio/final históricos y puntuación al concluir; fecha histórica de préstamo. Validaciones en la transacción PostgreSQL.
- Historial del ejemplar: avances, lecturas concluidas y préstamos.
- Tipografías y tamaños independientes para texto, títulos y botones.
- Estadísticas de racha, promedio de duración, clasificación Dewey, adquisiciones mensuales, géneros leídos, mejores puntuaciones, devoluciones, pérdidas, personas/libros más prestados y mayor tiempo fuera.

La sección anterior “Diferencias de flujo” corresponde al estado del 28 de septiembre y queda superada por esta ampliación, salvo la dependencia de proveedores externos. Esto no afirma identidad visual píxel por píxel ni reemplaza una validación física con los dispositivos de la usuaria.

Validación: pruebas unitarias y PostgreSQL incluyen aislamiento de borradores, permisos por columnas, orden numérico, estadísticas y reintento de autoguardado. La prueba de producción de fechas/valoración y borrador se ejecutó con ROL authenticated y ROLLBACK. Pruebas de navegador con datos sintéticos cubren QR previo al alta, recepción de portada, creación única, autoguardado, búsqueda de sinopsis, fechas y permiso lector. El servicio de búsquedas verifica usuario y acceso; no utiliza una clave administrativa.
