from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

# Biblioteca principal: estilo compartido, rol visual y búsqueda inicial.
p=ROOT/'src/biblioteca-main.js'
s=p.read_text()
s=s.replace("import './biblioteca.css';","import './biblioteca.css';\nimport './biblioteca-habits.css';",1)
s=s.replace("const root=document.querySelector('#library-app'),modal=document.querySelector('#library-modal');","const root=document.querySelector('#library-app'),modal=document.querySelector('#library-modal'),initialQuery=new URL(location.href).searchParams.get('q')?.trim()||'';",1)
s=s.replace("filters:{q:'',genero:'',codigo_p:'',idioma:'',estado_lectura:'',favorito:false}","filters:{q:initialQuery,genero:'',codigo_p:'',idioma:'',estado_lectura:'',favorito:false}",1)
s=s.replace("function render(){root.innerHTML=headerView(s)+`<main class=\"lib-main\"><div class=\"lib-actions\">", "function render(){s.canWrite=canWrite;root.dataset.permission=canWrite?'write':'read';root.innerHTML=headerView(s)+`<main class=\"lib-main\"><div class=\"lib-actions\">",1)
s=s.replace("${!canWrite?'<p class=\"lib-panel\">Acceso de lectura. Solo las personas con permiso de edición pueden modificar esta biblioteca.</p>':''}","${!canWrite?'<p class=\"lib-panel lib-readonly-note\">👁️ Acceso de lectura. Podés consultar toda la biblioteca; los controles de edición están ocultos.</p>':''}",1)
p.write_text(s)

# Búsqueda global: abrir Biblioteca con la consulta ya cargada.
p=ROOT/'src/main.js'; s=p.read_text()
old="library=q&&hasCatalog?btn(`<strong>Buscar “${esc(q)}” en mi Biblioteca</strong><small>Catálogo completo</small>`,'library','','search-result'):'';"
new="library=q&&hasCatalog?btn(`<strong>Buscar “${esc(q)}” en mi Biblioteca</strong><small>Catálogo completo · ${esc(catalog().libraryName||'Mi biblioteca')}</small>`,'library-search',`data-q=\"${esc(q)}\"`,'search-result'):'';"
if old not in s: raise SystemExit('No encontré resultado global de Biblioteca')
s=s.replace(old,new,1)
old="if(a==='progress'){view='progress';render();return;}if(a==='library'){view='space';tab='biblioteca';render();return;}"
new="if(a==='progress'){view='progress';render();return;}if(a==='library-search'){location.href='./biblioteca.html?q='+encodeURIComponent(el.dataset.q||'');return;}if(a==='library'){view='space';tab='biblioteca';render();return;}"
if old not in s: raise SystemExit('No encontré acción library')
s=s.replace(old,new,1)
p.write_text(s)

# HTML ya no describe Biblioteca como privada en general.
p=ROOT/'biblioteca.html'; s=p.read_text().replace('Biblioteca privada integrada a Habits.','Biblioteca integrada a Habits, personal y compartible con permisos.')
p.write_text(s)

# Documentación oficial: reflejar lo resuelto y la arquitectura actual.
p=ROOT/'docs/REQUISITOS.md'; s=p.read_text()
s=s.replace('- 🔧 Configurar dueña y miembros de la Biblioteca (`biblioteca_access`, `biblioteca_members`).','- 🔧 Verificar en Supabase real bibliotecas personales, `biblioteca_members`, `biblioteca_seleccion` y roles reader/editor/manager.')
s=s.replace('- ✅ Hoy no, pausar/archivar, reordenar arrastrando, X veces por semana.','- ✅ Hoy no, pausar/archivar, reordenar con mouse o controles táctiles, X veces por semana.')
s=s.replace('- ❌ Aviso de choque de horarios. ❌ Días cargados. ❌ Filtro por área.','- ✅ Aviso de choque antes de guardar, incluidas recurrencias futuras y eventos sin hora final. ❌ Días cargados. ❌ Filtro por área.')
s=s.replace('- ❌ Aviso de formulario sin guardar.','- ✅ Aviso de formulario sin guardar.')
s=s.replace('- ❌ Misma navegación y estilo visual que Habits (hoy es una página aparte).','- 🟡 Biblioteca sigue siendo una página especializada, pero comparte lenguaje visual, blancos táctiles y regreso claro a Habits.')
s=s.replace('- ✅ Semana, rachas, heatmap, lectura, libros terminados, agua, logros básicos.','- ✅ Semana, rachas con unidad correcta (días/semanas), heatmap, lectura, libros terminados, agua, logros básicos.')
s=s.replace('- ✅ Claro/oscuro, letra grande, diseño adaptable.','- ✅ Claro/oscuro, escala de texto global, blancos táctiles de 44 px, diseño adaptable y reducción de movimiento.')
s += "\n## 14. Calidad y coherencia de interacción\n\n- ✅ Progreso es destino real en notebook y móvil; Para después vive dentro de Más.\n- ✅ Diario excluye registros técnicos de Gym, Inglés y logros; materias y proyectos personales tienen selectores separados.\n- ✅ Hidratación usa una sola fuente de verdad: las tomas completan la meta de agua, incluido el hábito legado de 8 vasos.\n- ✅ Formularios avisan antes de descartar cambios; papelera, pausas y agua ofrecen deshacer donde corresponde.\n- ✅ Tests unitarios, PGlite, JSDOM y Playwright en notebook/móvil cubren navegación y choque de agenda.\n- 🟡 Refactor de `main.js` por vistas puede continuar sin cambiar comportamiento; ya se centralizaron selectores y reglas de dominio.\n"
p.write_text(s)
print('Biblioteca/HCI final aplicado')
