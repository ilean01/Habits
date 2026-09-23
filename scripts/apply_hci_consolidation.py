from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
main=ROOT/'src/main.js'
enh=ROOT/'src/enhancements.js'

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'No encontré el fragmento: {label}')
    if text.count(old)!=1:
        raise SystemExit(f'Fragmento ambiguo ({text.count(old)}): {label}')
    return text.replace(old,new,1)

s=main.read_text()
s=replace_once(s,"import './style.css';","import './style.css';\nimport './accessibility.css';",'accessibility import')
s=replace_once(s,"import { wellbeingView, wellbeingAction } from './wellbeing.js';","import { wellbeingView, wellbeingAction, ensureHydrationHabit, syncHydrationHabit } from './wellbeing.js';",'wellbeing import')
s=replace_once(s,"import {notificationsView,notificationsAction} from './notifications.js';","import {notificationsView,notificationsAction} from './notifications.js';\nimport {habitsForDayMode,dayModeNotice} from './day-context.js';\nimport {eventConflictDates,conflictMessage} from './scheduling.js';\nimport {diaryEntries,personalProjects,undatedTasks} from './selectors.js';\nimport {progressView as progressViewV2} from './progress-view.js';",'new imports')
s=replace_once(s,"await db.openStore(u.id,render);initCatalog(u.id,render);","await db.openStore(u.id,render);ensureHydrationHabit();syncHydrationHabit(dayKey());initCatalog(u.id,render);",'hydrate on enter')

old_nav="const nav=[['today','LayoutDashboard','Mi día'],['calendar','CalendarDays','Calendario'],['areas','Layers','Mis áreas'],['space','Flower2','Mi espacio'],['diary','NotebookPen','Mi diario']];"
new_nav="const nav=[['today','LayoutDashboard','Mi día'],['calendar','CalendarDays','Calendario'],['areas','Layers','Mis áreas'],['progress','ChartNoAxesColumn','Progreso'],['diary','NotebookPen','Mi diario'],['space','Menu','Más']];const mobileNav=[['today','LayoutDashboard','Hoy'],['calendar','CalendarDays','Calendario'],['areas','Layers','Áreas'],['progress','ChartNoAxesColumn','Progreso'],['space','Menu','Más']];"
s=replace_once(s,old_nav,new_nav,'navigation model')
s=replace_once(s,'<div class="breadcrumb">Mi espacio <span>/</span>','<div class="breadcrumb">Habits <span>/</span>','breadcrumb')
s=replace_once(s,"${view==='today'?todayView():view==='calendar'?calendarView():view==='areas'?areasView():view==='diary'?journalView():spaceView()}","${view==='today'?todayView():view==='calendar'?calendarView():view==='areas'?areasView():view==='progress'?progressViewV2({records:rec,catalog,prettyDate,esc,icon,btn,settings}):view==='diary'?journalView():spaceView()}",'render route')
s=replace_once(s,'${nav.map(([id,ic,label])=>btn(icon(ic)+`<span>${label}</span>`,`nav`,`data-view="${id}"`,view===id?\'active\':\'\')).join(\'\')}','${mobileNav.map(([id,ic,label])=>btn(icon(ic)+`<span>${label}</span>`,`nav`,`data-view="${id}"`,view===id?\'active\':\'\')).join(\'\')}','mobile nav')

# Contexto de Mi día.
s=re.sub(r"const done=hs\.filter\((.*?)\);const summary=",lambda m:f"const done=hs.filter({m.group(1)});const welcome=dayWelcome(undefined,done.length>0);const summary=",s,count=1)
s=replace_once(s,"const dayMode=effectiveDayMode(settings());const shown=hs.filter(h=>scheduled(h,today)&&(dayMode==='tranquilo'?h.essential:true));return","const dayMode=effectiveDayMode(settings());const shown=habitsForDayMode(hs,logs,today,dayMode);const modeNote=dayModeNotice(dayMode);return",'day mode behavior')
s=s.replace('dayWelcome().icon','welcome.icon',1).replace('dayWelcome().subtitle','welcome.subtitle',1)
s=replace_once(s,"${done.length?'Mirá todo lo que ya hiciste.':'Un nuevo día.<br>Un poquito más para vos.'}","${esc(welcome.hero)}",'hero text')
s=replace_once(s,"${done.length?'¡Bien por vos! Cada paso suma.':'Sin apuro. Lo importante es empezar.'}","${esc(welcome.note)}",'hero note')
s=replace_once(s,"${dayMode==='descanso'?'<div class=\"notice\">Hoy podés ir más despacio. Usá “Hoy no” en los hábitos que quieras pausar.</div>':''}","${modeNote?`<div class=\"notice day-mode-notice\">${esc(modeNote)}</div>`:''}",'day mode notice')

# Diario sin registros técnicos.
new_journal="""function journalView(){const entries=diaryEntries(rec('journal')),j=entries.find(j=>j.date===dayKey()&&!j.achievement);return `<section class=\"journal-intro\"><div><p class=\"eyebrow\">UN MOMENTO CON VOS</p><h2>¿Qué te gustaría recordar de hoy?</h2><p>Un pensamiento, una alegría, algo que aprendiste.</p>${btn(icon('NotebookPen')+(j?'Editar mi día':'Escribir sobre mi día'),'journal','','button primary')}</div><span class=\"journal-flower\">${icon('Flower2')}</span></section><div class=\"journal-grid\">${entries.sort((a,b)=>b.date.localeCompare(a.date)).map(j=>`<button class=\"journal-card\" data-action=\"edit-journal\" data-id=\"${j.id}\"><small>${prettyDate(j.date)}</small><h3>${j.achievement?'✧ Un logro para recordar':['','😔','😐','🙂','😊','🤩'][j.mood||0]||'Mi día'}</h3><p>${esc(j.text||'Hoy me tomé un momento para registrar cómo me sentía.')}</p></button>`).join('')||empty('Este espacio es tuyo. No hace falta escribir algo perfecto.')}</div>`;}"""
s,n=re.subn(r"function journalView\(\)\{.*?\}\nfunction projectsView",new_journal+'\nfunction projectsView',s,count=1,flags=re.S)
if n!=1: raise SystemExit('No pude reemplazar journalView')
s=replace_once(s,"rec('project').filter(p=>p.category!=='subject')","personalProjects(rec('project'))",'project selector')

# Más: un solo destino, con Para después; Progreso queda como destino principal.
new_space="""function spaceView(){const tabs=[['diario','Mi diario'],['tareas','Pendientes'],['later','Para después'],['biblioteca','Biblioteca'],['proyectos','Proyectos'],['planning','Estudio y trabajo']];return `${heading('TU ESPACIO, SIN RUIDO','Más','Accesos a lo que no necesitás tener siempre en primera fila.')}<div class=\"chips space-tabs\">${tabs.map(([id,name])=>btn(name,'space-tab',`data-tab=\"${id}\"`,tab===id?'chip selected':'chip')).join('')}</div>${tab==='planning'?planningView({esc,btn}):tab==='biblioteca'?libraryView():tab==='later'?`<div class=\"section-title\"><div><h2>Para después</h2><p>Ideas y pendientes sin fecha.</p></div>${btn(icon('Plus')+'Nueva tarea','new-task','','button primary')}</div>${taskList(undatedTasks(rec('task')))}`:tab==='tareas'?`<div class=\"section-title\"><h2>Una cosa a la vez</h2>${btn(icon('Plus')+'Nueva tarea','new-task','','button primary')}</div>${taskList(rec('task'))}`:tab==='proyectos'?projectsView():journalView()}`;}"""
s,n=re.subn(r"function spaceView\(\)\{.*?\}\nfunction taskList",new_space+'\nfunction taskList',s,count=1,flags=re.S)
if n!=1: raise SystemExit('No pude reemplazar spaceView')

# Progreso viejo deja de vivir en main.js.
s,n=re.subn(r"function progressView\(\)\{.*?\}\nfunction showModal",'function showModal',s,count=1,flags=re.S)
if n!=1: raise SystemExit('No pude retirar progressView viejo')

# Modal con protección ante cambios sin guardar.
new_modal="""function requestModalClose(){if(modal.dataset.dirty==='1'&&!confirm('Tenés cambios sin guardar. ¿Descartarlos?'))return false;modal.dataset.dirty='0';modal.close();return true;}
function showModal(title,body,onSubmit){modal.dataset.dirty='0';modal.innerHTML=`<div class=\"modal-heading\"><h2>${title}</h2>${btn(icon('X'),'close','aria-label=\"Cerrar\"','icon-button')}</div>${body}`;if(!modal.open)modal.showModal();paintIcons();const f=modal.querySelector('form');if(f){const mark=()=>modal.dataset.dirty='1';f.addEventListener('input',mark);f.addEventListener('change',mark);f.onsubmit=async e=>{e.preventDefault();const submit=f.querySelector('[type=\"submit\"]');if(submit)submit.disabled=true;try{await onSubmit(new FormData(f));modal.dataset.dirty='0';}catch(error){toast('No se pudo guardar: '+error.message);}finally{if(submit)submit.disabled=false;}};}}"""
s,n=re.subn(r"function showModal\(title,body,onSubmit\)\{.*?\}\nconst input=",new_modal+'\nconst input=',s,count=1,flags=re.S)
if n!=1: raise SystemExit('No pude reemplazar showModal')

# Choques antes de guardar, incluyendo recurrencias.
old_overlap="const overlap=rec('event').some(e=>e.id!==id&&occurs(e,data.date)&&e.time&&data.time&&data.time<(e.end||e.time)&&e.time<(data.end||data.time));if(overlap)warning='Guardado, pero coincide con otro evento de ese día. Revisá el calendario.';"
new_overlap="const conflicts=eventConflictDates(data,rec('event'),{excludeId:id});if(conflicts.length&&!confirm(conflictMessage(conflicts,d=>prettyDate(d,{day:'numeric',month:'short'}))+' ¿Guardar igual?'))return;"
s=replace_once(s,old_overlap,new_overlap,'event conflicts')

# Agua: la ficha abre el mismo registro de tomas, no un segundo contador.
s=replace_once(s,"const h=get('habit',id);if(!h)return;const logId=","const h=get('habit',id);if(!h)return;if(h.hydration){wellbeingAction('water-custom',{dataset:{date:d}},{showModal,input,toast,modal});return;}const logId=",'hydration habit action')

# Búsqueda no muestra registros técnicos del journal.
s=replace_once(s,"(kind==='journal'&&r.englishPractice)","(kind==='journal'&&(r.englishPractice||r.workoutPhoto||r.bodyLog))",'search journal filter')

# Progreso como vista propia; Biblioteca sigue entrando al módulo desde Más.
s=replace_once(s,"if(a==='progress'||a==='library'){view='space';tab=a==='progress'?'progreso':'biblioteca';render();return;}","if(a==='progress'){view='progress';render();return;}if(a==='library'){view='space';tab='biblioteca';render();return;}",'progress action')
s=replace_once(s,"if(a==='close'){modal.close();return;}","if(a==='close'){requestModalClose();return;}",'safe close')

# Selector de tipo de día completo en Ajustes.
s=replace_once(s,"select('Cómo querés vivir hoy','dayMode',[['habitual','Día habitual'],['tranquilo','Día tranquilo'],['descanso','Descanso']],s.dayMode||'habitual')","select('Cómo querés vivir hoy','dayMode',[['habitual','Día habitual'],['trabajo','Día de trabajo'],['facultad','Día de facu'],['finDeSemana','Fin de semana'],['tranquilo','Día tranquilo'],['descanso','Descanso']],effectiveDayMode(s))",'settings day mode')

# Persistencia por fecha de las excepciones de tipo de día.
s=replace_once(s,"if(e.target.id==='day-mode')db.put('settings',{...settings(),dayMode:e.target.value,dayModeDate:dayKey()},'settings');","if(e.target.id==='day-mode'){const s=settings(),today=dayKey();db.put('settings',{...s,dayMode:e.target.value,dayModeDate:today,dayModes:{...(s.dayModes||{}),[today]:e.target.value}},'settings');}",'day mode history')

# Cerrar haciendo click afuera/Escape también protege cambios.
s=replace_once(s,"modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});","modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)requestModalClose();}});modal.addEventListener('cancel',e=>{if(modal.dataset.dirty==='1'){e.preventDefault();requestModalClose();}});",'modal outside close')

main.write_text(s)

# Retirar hacks de navegación/agua de enhancements.js: ahora viven en el render real.
e=enh.read_text()
e=e.replace("import {waterStats} from './wellbeing.js';\n",'')
e,n=re.subn(r"function progressIcon\(\).*?function isIOS\(\)","function isIOS()",e,count=1,flags=re.S)
if n!=1: raise SystemExit('No pude limpiar navegación/agua de enhancements')
e=e.replace('decorateWaterProgress();','')
e=e.replace("if(own.dataset.enhAction==='later'){e.preventDefault();openLater();}",'')
enh.write_text(e)
print('Consolidación HCI aplicada.')
