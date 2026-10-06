# Restauración de Biblioteca — auditoría en curso

Referencia funcional: `biblioteca.zip`, `app.py` versión 18 y sus rutas activas. Referencia visual: capturas originales suministradas por la propietaria. Base de trabajo: main `4df1082`, incluidos los cambios de Mi día de PR #77.

No se copia la base ni las imágenes privadas al repositorio. `scripts/reference/fixture.json` contiene únicamente libros ficticios para comparar ambos programas.

| Pantalla | Diferencia comprobada al iniciar | Corrección en trabajo |
|---|---|---|
| Catálogo | Navegación agrupada, color oliva, cuatro contadores extra, tarjetas mayores | Cabecera y navegación originales; estilos del ZIP acotados a Biblioteca |
| Ficha | Metadatos debajo y editor duplicado | Portada/propietario a izquierda, ficha a derecha y edición alternativa |
| Editar | Formulario adicional completo | Edición de la misma ficha, tres columnas, autoguardado con conflicto/error |
| Agregar | Controles ISBN separados, título dentro de otra tarjeta | Título/ayuda fuera, tarjeta de 650 px, ISBN y Completar juntos |
| Portadas | QR por clic, buscador en otra fila, botones blancos | Ventana original, QR al abrir, resultados independientes de sinopsis |
| Lecturas | Inicio, página y conclusión en modales | Inicio visible, acciones y formulario completos en cada tarjeta |
| Préstamos | Alta en modal | Alta visible, devolución con estado e historial |
| Estadísticas | Agrupación Dewey por centenas, orden distinto, días +1 | Grupos exactos y cálculos contrastados con SQL original |

## Hallazgos funcionales del original

- `/recomendador` y `/duplicados` redirigen: sus plantillas antiguas no eran funciones activas en versión 18. Las herramientas actuales de Habits se conservan como adicionales en Configuración.
- La búsqueda original agrega catálogos bibliográficos y hasta 36 imágenes de Bing, deduplica y limita a 40. La función anterior de Habits solo leía Bing y devolvía `200 []` incluso ante HTML inesperado. El nuevo contrato distingue fallos, resultados parciales y búsquedas sin coincidencias.
- Una consulta real `mar` a Bing en este entorno respondió HTTP 200 con metadatos de imágenes. Esto no demuestra cuál fue la respuesta en el incidente previo, ni garantiza igual contenido/cantidad desde Supabase.
- Géneros más leídos en el original incluye estados `leido`, `leyendo` y `releyendo`; se conserva ese cálculo.
- La racha original cuenta fechas de registros, aun si tienen cero páginas. Los días fuera en préstamos son diferencia entre fechas, sin sumar uno.

## Validación pendiente antes de afirmar equivalencia

Comparaciones renderizadas a 1440×900 y en teléfono; recorridos completos; permisos y persistencia; proveedor desde función desplegada; revisión de Revisar, próximas lecturas, etiquetas, configuración y exportación. Las pruebas unitarias no certifican identidad visual.

## Comprobación de privacidad de las referencias (6 de octubre)

Se verificó mediante SQLite de solo lectura que la base de referencia tiene exactamente los 12 libros de `fixture.json`, todos ficticios, y cero registros de personas, préstamos y lecturas. Las páginas renderizadas no contienen emails ni patrones de tokens/secretos. Sus únicos enlaces externos son búsquedas públicas, QR de localhost y Google. No se incluye SQLite ni portadas en Git. El destino autorizado por la usuaria es `ilean01/Habits`.
