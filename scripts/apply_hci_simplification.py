from pathlib import Path

path=Path('src/main.js')
source=path.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global source
    if old not in source:
        raise SystemExit(f'Missing expected source for {label}')
    source=source.replace(old,new,1)

replace_once("import './library-native.css';","import './library-native.css';\nimport './hci-simplification.css';",'HCI stylesheet import')

replace_once(
"function empty(text,action='',label='Agregar'){return `<div class=\"empty\">${icon('Leaf')}<p>${text}</p>${action?btn(icon('Plus')+label,action,'','button outline'):''}</div>`;}",
"function empty(text,action='',label='Agregar',title=''){const lower=String(text||'').toLowerCase(),preset=action==='new-habit'?['Tu rutina empieza acá','Leaf']:action==='new-event'?['Tu agenda está libre','CalendarDays']:action==='new-project'?['Un proyecto puede empezar pequeño','Flag']:action==='new-task'?['Nada pendiente por ahora','CheckCheck']:lower.includes('programad')?['Nada programado por ahora','CalendarDays']:lower.includes('complet')?['Todavía no hay completadas','CheckCheck']:lower.includes('papelera')?['La papelera está vacía','Trash2']:['Este espacio está listo','Leaf'],heading=title||preset[0];return `<div class=\"empty\" role=\"status\"><span class=\"empty-icon\">${icon(preset[1])}</span><strong>${esc(heading)}</strong><p>${text}</p>${action?btn(icon('Plus')+label,action,'','button outline'):''}</div>`;}",
'empty state helper')

replace_once(
"<div class=\"section-title\"><div><h2>Mis hábitos de hoy <span class=\"count\">${shown.length}</span></h2><p>Pequeñas acciones que te hacen bien.</p></div>${btn(icon('Plus')+'Nuevo hábito','new-habit','','text-button')}</div>",
"<div class=\"section-title\"><div><h2>Mis hábitos de hoy <span class=\"count\">${shown.length}</span></h2><p>Pequeñas acciones que te hacen bien.</p></div></div>",
'redundant new habit action')

replace_once(
"<section class=\"timeline-section\"><div class=\"section-title\"><div><h2>Así va tu día</h2><p>Lo que hiciste merece su lugar.</p></div>${btn(icon('Plus')+'También hice esto','achievement','','text-button')}</div><div class=\"timeline\">",
"<section class=\"timeline-section\"><div class=\"section-title\"><div><h2>Así va tu día</h2><p>Lo que hiciste merece su lugar.</p></div></div><div class=\"timeline\">",
'timeline duplicate action')

replace_once(
"||'<p class=\"muted timeline-empty\">Cuando completes una actividad, aparecerá acá. Tu día todavía tiene mucho por contar.</p>'",
"||empty('Cuando completes una actividad, aparecerá acá. No hace falta llenar el día para que cuente.','','','Tu día todavía está abierto')",
'timeline empty state')

replace_once(
"<div class=\"agenda-list\">${upcoming.length?upcoming.slice(0,4).map(e=>eventCard(e,today)).join(''):'<div class=\"small-empty\">Un poco de espacio libre.<br>¿Qué te gustaría hacer hoy?</div>'}</div>${btn(icon('Plus')+'Agregar un evento','new-event','','button outline wide')}",
"<div class=\"agenda-list\">${upcoming.length?upcoming.slice(0,4).map(e=>eventCard(e,today)).join(''):empty('No tenés eventos para hoy. Podés dejar este espacio libre o agregar algo cuando quieras.','new-event','Agregar evento','Un poco de espacio libre')}</div>",
'agenda empty state and redundant add button')

replace_once(
"const items=[['habit','Sun','Un hábito','Algo que querés repetir'],['event','CalendarDays','Un evento','Un plan con fecha'],['task','CheckCheck','Una tarea','Un pendiente para resolver'],['project','Flag','Un proyecto','Algo grande, paso a paso'],['library','BookOpen','Un libro','Abrir el catálogo principal']];showModal('¿Qué querés agregar?',`<div class=\"create-options\">${items.map(([k,i,t,s])=>btn(icon(i)+`<div><strong>${t}</strong><small>${s}</small></div>`,k==='library'?'library':'new-'+k,'','create-option')).join('')}</div>`);return;",
"const items=[['habit','Sun','Un hábito','Algo que querés repetir'],['event','CalendarDays','Un evento','Un plan con fecha'],['task','CheckCheck','Una tarea','Un pendiente para resolver'],['project','Flag','Un proyecto','Algo grande, paso a paso'],['achievement','Sparkles','Un logro','Algo que también querés celebrar'],['library','BookOpen','Un libro','Abrir el catálogo principal']];showModal('¿Qué querés agregar?',`<div class=\"create-options\">${items.map(([k,i,t,s])=>btn(icon(i)+`<div><strong>${t}</strong><small>${s}</small></div>`,k==='library'?'library':k==='achievement'?'achievement':'new-'+k,'','create-option')).join('')}</div>`);return;",
'achievement in create menu')

path.write_text(source,encoding='utf-8')
