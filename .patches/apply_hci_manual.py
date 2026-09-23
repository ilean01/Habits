from pathlib import Path
import re


def replace(path, old, new, count=1):
    p=Path(path); text=p.read_text()
    found=text.count(old)
    if found < count:
        raise SystemExit(f'{path}: esperado {count} patrón(es), encontrados {found}: {old[:100]!r}')
    text=text.replace(old,new,count)
    p.write_text(text)


def sub(path, pattern, replacement, count=1):
    p=Path(path); text=p.read_text()
    text,n=re.subn(pattern,replacement,text,count=count,flags=re.S)
    if n != count:
        raise SystemExit(f'{path}: regex esperado {count}, reemplazado {n}: {pattern[:100]!r}')
    p.write_text(text)

# 1. No crear accesos que existen solo en escritorio: Progreso queda en Mi espacio y Para después en Pendientes.
replace('src/enhancements.js','prioritizeWork();addProgressShortcut();addLaterShortcut();decorateWaterProgress();','prioritizeWork();decorateWaterProgress();')

# 2. La Biblioteca avanzada es la fuente de verdad para el total de libros terminados.
replace('src/library-bridge.js',"finishedToday:[], day:''","finishedToday:[], finishedCount:0, day:''")
replace('src/library-bridge.js','const [reading, finished] = await Promise.all([','const [reading, finished, totalFinished] = await Promise.all([')
replace('src/library-bridge.js',"supabase.from('biblioteca_lecturas_finalizadas').select('libro_id').eq('fecha_fin', today)\n    ]);","supabase.from('biblioteca_lecturas_finalizadas').select('libro_id').eq('fecha_fin', today),\n      supabase.from('biblioteca_libros').select('id',{count:'exact',head:true}).eq('estado_lectura','leido').eq('eliminado',false)\n    ]);")
replace('src/library-bridge.js','if(reading.error) throw reading.error;','if(reading.error) throw reading.error;\n    if(totalFinished.error) throw totalFinished.error;')
replace('src/library-bridge.js','finishedToday, day:today','finishedToday, finishedCount:Number(totalFinished.count||0), day:today')

# 3. Resumen semanal fuera de Mi día y usando también el catálogo real.
replace('src/extras.js',"import {daySummary} from './daily.js';","import {daySummary} from './daily.js';\nimport {catalog} from './library-bridge.js';")
replace('src/extras.js',"${btn('Mi semana y logros','extra-week','','button outline')}",'')
replace('src/extras.js',"books=db.records('book').filter(b=>b.status==='finished')","c=catalog(),booksFinished=c.allowed?(c.finishedCount||0):db.records('book').filter(b=>b.status==='finished').length")
replace('src/extras.js','if(books.length>=10)', 'if(booksFinished>=10)')

# 4. Mi espacio deja de duplicar Mi diario; el Diario sigue siendo destino principal.
replace('src/main.js',"tab='diario'","tab='tareas'")
sub('src/main.js',r"function spaceView\(\)\{.*?\}\nfunction taskList",'''function spaceView(){const tabs=[['tareas','Pendientes'],['biblioteca','Biblioteca'],['proyectos','Proyectos'],['planning','Estudio y trabajo'],['progreso','Mi progreso']];return `${heading('ORGANIZÁ SIN PERDERTE','Mi espacio','Pendientes, proyectos, estudio y progreso en un solo lugar.')}<div class="chips space-tabs">${tabs.map(([id,name])=>btn(name,'space-tab',`data-tab="${id}"`,tab===id?'chip selected':'chip')).join('')}</div>${tab==='planning'?planningView({esc,btn}):tab==='biblioteca'?libraryView():tab==='progreso'?progressView():tab==='proyectos'?projectsView():`<div class="section-title"><h2>Una cosa a la vez</h2>${btn(icon('Plus')+'Nueva tarea','new-task','','button primary')}</div>${taskList(rec('task'))}`}`;}\nfunction taskList''')

# 5. Evitar que registros técnicos se mezclen con modelos mentales del usuario.
replace('src/main.js',".filter(j=>!j.workoutPhoto).sort((a,b)=>b.date.localeCompare(a.date))",".filter(j=>!j.workoutPhoto&&!j.englishPractice).sort((a,b)=>b.date.localeCompare(a.date))")
replace('src/main.js',"rec('project').map(p=>{const tasks=rec('task').filter(t=>t.projectId===p.id)","rec('project').filter(p=>p.category!=='subject').map(p=>{const tasks=rec('task').filter(t=>t.projectId===p.id)")

# 6. Progreso muestra el catálogo avanzado cuando está disponible y aloja el resumen semanal.
sub('src/main.js',r"function progressView\(\)\{.*?\}\nfunction showModal",'''function progressView(){const today=dayKey(),week=weekKeys(today),logs=rec('log').filter(l=>week.includes(l.date)&&l.status==='done'),minutes=rec('reading').filter(r=>week.includes(r.date)).reduce((n,r)=>n+Number(r.minutes),0),c=catalog(),finishedBooks=c.allowed?(c.finishedCount||0):rec('book').filter(b=>b.status==='finished').length;return `<div class="section-title"><div><h2>Mi progreso</h2><p>Tu semana, tus constancias y tus logros.</p></div>${btn('Ver resumen semanal','extra-week','','button outline')}</div><div class="stat-grid"><article class="panel"><span>${icon('CheckCheck')} ESTA SEMANA</span><strong>${logs.length}</strong><p>hábitos completados</p></article><article class="panel"><span>${icon('BookOpen')} TIEMPO PARA LEER</span><strong>${minutes}<small> min</small></strong><p>de lectura registrada esta semana</p></article><article class="panel"><span>${icon('Target')} TUS LIBROS</span><strong>${finishedBooks}</strong><p>historias terminadas</p></article></div><section class="panel"><div class="section-title"><h2>Tu semana, paso a paso</h2><p>Hábitos completados</p></div><div class="week-chart">${week.map(d=>{const st=dayStats(rec('habit'),rec('log'),d);return `<div><b>${st.done}</b><div class="bar-track"><span style="height:${st.percent}%"></span></div><small>${prettyDate(d,{weekday:'short'})}</small></div>`;}).join('')}</div></section><section class="panel"><h2>Pequeñas constancias</h2><p class="muted">Las pausas registradas y los días no programados no cortan tu racha.</p>${rec('habit').filter(h=>!h.archived).map(h=>`<div class="streak-row">${icon(h.icon)}<span>${esc(h.name)}</span><b>${streak(h,rec('log'),today)} días</b></div>`).join('')}</section><section class="panel"><h2>Las últimas cuatro semanas</h2><div class="heatmap">${Array.from({length:28},(_,i)=>{const d=addDays(today,i-27),st=dayStats(rec('habit'),rec('log'),d);return `<button style="--level:${st.percent/100}" data-action="date" data-date="${d}" title="${d}: ${st.done} completados"><small>${parseDay(d).getDate()}</small></button>`;}).join('')}</div></section>`;}\nfunction showModal''')

# 7. El aviso de choque debe sobrevivir al toast genérico de guardado.
replace('src/main.js','delete data.id;','delete data.id;let warning=\'\';')
replace('src/main.js',"if(overlap)toast('Guardado. Atención: coincide con otro evento de ese día.');","if(overlap)warning='Guardado, pero coincide con otro evento de ese día. Revisá el calendario.';")
replace('src/main.js',"modal.close();toast('Guardado. Un pequeño paso más.');});","modal.close();toast(warning||'Guardado. Un pequeño paso más.');});")

# 8. Si hay catálogo avanzado, no crear otro libro local ni fingir que el buscador local contiene toda la Biblioteca.
sub('src/main.js',r"function searchModal\(\)\{.*?\}\nasync function action",'''function searchModal(){showModal('Encontrá lo que buscás',`<label>Buscar en tu espacio<input id="global-search" type="search" placeholder="Una tarea, un hábito, un evento…" autofocus></label><div id="search-results"></div>`);modal.querySelector('#global-search').oninput=e=>{const q=e.target.value.trim().toLocaleLowerCase(),hasCatalog=catalog().allowed;const kinds=hasCatalog?['habit','event','task','project','quote','journal','word']:['habit','event','task','project','book','quote','journal','word'];const results=q?kinds.flatMap(kind=>rec(kind).filter(r=>(kind!=='project'||r.category!=='subject')&&!(kind==='journal'&&r.englishPractice)&&`${r.name||''} ${r.title||''} ${r.text||''} ${r.note||''} ${r.author||''}`.toLocaleLowerCase().includes(q)).map(r=>({kind,...r}))):[];const local=results.slice(0,30).map(r=>btn(`<strong>${esc(r.name||r.title||r.text?.slice(0,100))}</strong><small>${({habit:'Hábito',event:'Evento',task:'Tarea',project:'Proyecto',book:'Libro',quote:'Cita',journal:'Diario',word:'Vocabulario'})[r.kind]}</small>`,'search-result',`data-kind="${r.kind}" data-id="${r.id}"`,'search-result')).join(''),library=q&&hasCatalog?btn(`<strong>Buscar “${esc(q)}” en mi Biblioteca</strong><small>Catálogo completo</small>`,'library','','search-result'):'';modal.querySelector('#search-results').innerHTML=local+library||'<p class="muted">'+(q?'No encontramos coincidencias.':'Escribí para buscar.')+'</p>';};}\nasync function action''')
sub('src/main.js',r"if\(a==='create'\)\{showModal\('¿Qué querés agregar\?',.*?;return;\}",'''if(a==='create'){const items=[['habit','Sun','Un hábito','Algo que querés repetir'],['event','CalendarDays','Un evento','Un plan con fecha'],['task','CheckCheck','Una tarea','Un pendiente para resolver'],['project','Flag','Un proyecto','Algo grande, paso a paso'],[catalog().allowed?'library':'book','BookOpen','Un libro',catalog().allowed?'Abrir el catálogo principal':'Tu próxima lectura']];showModal('¿Qué querés agregar?',`<div class="create-options">${items.map(([k,i,t,s])=>btn(icon(i)+`<div><strong>${t}</strong><small>${s}</small></div>`,k==='library'?'library':'new-'+k,'','create-option')).join('')}</div>`);return;}''')

# 9. Controles táctiles principales de al menos 44 px en móvil.
p=Path('src/style.css'); css=p.read_text(); marker='/* HCI touch targets */'
if marker not in css:
    css += '\n'+marker+'\n@media(max-width:650px){.icon-button{min-width:44px;min-height:44px}.event-card .icon-button,.habit-top .icon-button{width:44px;height:44px}.text-button{min-height:44px}.mobile-nav button{min-height:52px}.calendar-events small{font-size:9px}}\n'
    p.write_text(css)

print('HCI coherence transformations applied')
