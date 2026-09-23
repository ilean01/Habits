# Biblioteca unificada y bibliotecaria contextual

Corrección basada en `3690a7f` (versión actual de main), conservando las mejoras de otras ramas ya integradas.

- Un destino Biblioteca en el menú principal y navegación móvil. Se retiraron las entradas duplicadas de Más y del contenido del área de lectura.
- El área Lectura conserva sus hábitos, tareas y agenda. Los libros personales anteriores, citas y sesiones siguen disponibles en Biblioteca, dentro de «Mis sesiones, citas y registros anteriores».
- El catálogo embebido no se vuelve a crear durante las actualizaciones periódicas de sincronización; mantiene los formularios y la navegación abiertos.
- La bibliotecaria vive dentro del catálogo y recibe su misma colección activa. Ya no mantiene una caché independiente que puede pertenecer a otra biblioteca.
- Consultas de sinopsis, título/autor, préstamos, lecturas, favoritos, deseos y recomendaciones locales. No se inventan sinopsis ausentes.
- IA externa opcional y explícita. Si el proveedor no está disponible, se informa y se distingue la respuesta del catálogo. No se configura ni se envía una clave privada al navegador.
- Chat con texto de 14 px, campo de 16 px, líneas que se ajustan, mensajes desplazables y botones accesibles. El tamaño del catálogo no agranda el chat.
- Consultas de tablas vinculadas explícitamente al owner de la biblioteca activa, además de las políticas RLS existentes. Estado de sesión limpiado al perder acceso.

Verificación: 43 pruebas automatizadas aprobadas y compilación de ambas entradas correcta. Incluye recuperación de la sinopsis, consulta de préstamos sin respuestas ajenas y ausencia de pestaña duplicada. La prueba DOM no sustituye la comprobación en un iPhone físico. No se modifican las tablas, cuentas, libros ni portadas con esta corrección.
