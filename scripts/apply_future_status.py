from pathlib import Path

path = Path('src/main.js')
source = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global source
    if old not in source:
        raise SystemExit(f'Missing expected source for {label}')
    source = source.replace(old, new, 1)


def replace_between(start, end, replacement, label):
    global source
    a = source.find(start)
    b = source.find(end, a)
    if a < 0 or b < 0:
        raise SystemExit(f'Missing function boundary for {label}')
    source = source[:a] + replacement.rstrip() + '\n' + source[b:]


replace_once(
    "import {diaryEntries,personalProjects,pendingTasks,laterTasks,completedTasks,isDiaryEntry,taskProjectOptions} from './selectors.js';",
    "import {diaryEntries,personalProjects,pendingTasks,scheduledTasks,laterTasks,completedTasks,isDiaryEntry,taskProjectOptions} from './selectors.js';",
    'selectors import',
)

replace_once(
    " const holiday=holidayOn(d),today=d===dayKey();",
    " const currentDay=dayKey(),holiday=holidayOn(d),today=d===currentDay,future=d>currentDay;",
    'future day flag',
)

replace_once(
    "const label=status.done?'Hecho':status.skip?'Pausa':status.partial?(status.hydration?`${Math.round(status.value/10)/100} / ${Math.round(status.target/10)/100} L`:'En progreso'):'Pendiente';",
    "const label=status.done?'Hecho':status.skip?'Pausa':status.partial?(status.hydration?`${Math.round(status.value/10)/100} / ${Math.round(status.target/10)/100} L`:'En progreso'):future?'Programado':'Pendiente';",
    'future habit label',
)

replace_once(
    "<small>${t.done?'Completada':t.priority==='alta'?'Prioridad alta':'Pendiente'} · ${esc(area(t.area).name)}</small>",
    "<small>${t.done?'Completada':future?'Programada':t.priority==='alta'?'Prioridad alta':'Pendiente'} · ${esc(area(t.area).name)}</small>",
    'future task label',
)

replace_once(
    "<h3>Pendientes de esa fecha</h3>",
    "<h3>${future?'Programadas para esa fecha':'Pendientes de esa fecha'}</h3>",
    'day detail task heading',
)

areas_view = r'''function areasView(){
 const a=areaFilter?area(areaFilter):null,today=dayKey();
 const tile=x=>{const taskRows=rec('task').filter(t=>t.area===x.id),pending=pendingTasks(taskRows,today).length,scheduled=scheduledTasks(taskRows,today).length,upcoming=upcomingForArea(x.id).length;return `<button class="area-tile" style="--area:${safeColor(x.color)}" data-action="area" data-id="${x.id}"><span class="habit-icon">${icon(x.icon)}</span><h2>${esc(x.name)}</h2><p>${rec('habit').filter(h=>h.area===x.id&&!h.archived).length} hábitos · ${pending} pendientes${scheduled?` · ${scheduled} programada${scheduled===1?'':'s'}`:''}${upcoming?` · ${upcoming} ${upcoming===1?'evento próximo':'eventos próximos'}`:''}</p>${icon('ArrowUpRight')}</button>`;};
 if(!a)return `${heading('LO QUE IMPORTA EN TU VIDA','Mis áreas','Un lugar para cada parte de vos.',btn(icon('Plus')+'Nueva área','new-area','','button primary'))}<div class="chips area-filters">${btn('Todas','area','data-id=""','chip selected')}${areas().map(x=>btn(icon(x.icon)+esc(x.name),'area',`data-id="${x.id}"`,'chip')).join('')}</div><div class="areas-grid">${areas().map(tile).join('')}</div>`;
 const taskRows=rec('task').filter(t=>t.area===a.id),pending=pendingTasks(taskRows,today),scheduled=scheduledTasks(taskRows,today);
 return `${heading('LO QUE IMPORTA EN TU VIDA',esc(a.name),'Un lugar para cada parte de vos.',btn(icon('Plus')+'Nueva área','new-area','','button primary'))}<div class="chips area-filters">${btn('Todas','area','data-id=""','chip')}${areas().map(x=>btn(icon(x.icon)+esc(x.name),'area',`data-id="${x.id}"`,x.id===areaFilter?'chip selected':'chip')).join('')}</div><div class="button-row area-tools">${btn(icon('Plus')+'Hábito','new-habit','','button outline')}${btn(icon('Plus')+'Tarea','new-task','','button outline')}${btn(icon('Settings')+'Editar área','edit-area',`data-id="${a.id}"`,'button outline')}</div>${['facultad','trabajo','ingles'].includes(a.id)?`<div class="area-domain-planning" data-area="${a.id}">${planningView({esc,btn,area:a.id})}</div>`:''}${a.id==='ingles'?vocabView():a.id===GYM_AREA?gymView({esc,btn,icon}):''}${areaAgenda(a)}<div class="section-title"><h2>Hábitos de ${esc(a.name)}</h2></div><div class="habit-grid">${rec('habit').filter(h=>h.area===a.id&&!h.archived).map(h=>habitCard(h,today)).join('')||empty('Agregá tu primer hábito para esta área.','new-habit')}</div><div class="section-title"><h2>Pendientes</h2></div>${taskList(pending,{emptyText:'No hay tareas vencidas o para hoy en esta área.'})}${scheduled.length?`<div class="section-title"><div><h2>Programadas</h2><p>Tienen fecha futura y todavía no requieren acción.</p></div></div>${taskList(scheduled,{emptyText:'No hay tareas programadas en esta área.',emptyAction:''})}`:''}`;
}'''
replace_between('function areasView(){', 'function spaceView(){', areas_view, 'areasView')

space_view = r'''function spaceView(){
 const tasks=rec('task'),today=dayKey(),pending=pendingTasks(tasks,today),scheduled=scheduledTasks(tasks,today),later=laterTasks(tasks,today),completed=completedTasks(tasks,today);
 const tabs=[['tareas','Pendientes'],['scheduled','Programadas'],['later','Para después'],['proyectos','Proyectos']];
 if(!tabs.some(([id])=>id===tab))tab='tareas';
 const head=`${heading('ORGANIZÁ LO QUE TENÉS QUE HACER','Tareas','Pendientes, programadas, para después y proyectos personales, sin mezclar tus áreas.')}<div class="chips space-tabs">${tabs.map(([id,name])=>btn(name,'space-tab',`data-tab="${id}"`,tab===id?'chip selected':'chip')).join('')}</div>`;
 if(tab==='proyectos')return `${head}${projectsView()}`;
 if(tab==='later')return `${head}<div class="section-title"><div><h2>Para después</h2><p>Tareas activas sin fecha, guardadas sin presión.</p></div>${btn(icon('Plus')+'Nueva tarea','new-task','','button primary')}</div>${taskList(later,{emptyText:'No tenés tareas guardadas para después.'})}`;
 if(tab==='scheduled')return `${head}<div class="section-title"><div><h2>Programadas</h2><p>Tareas con fecha futura. Todavía no requieren acción.</p></div>${btn(icon('Plus')+'Nueva tarea','new-task','','button primary')}</div>${taskList(scheduled,{emptyText:'No tenés tareas programadas.'})}`;
 return `${head}<div class="section-title"><div><h2>Pendientes</h2><p>Tareas vencidas o para hoy. Son las que requieren acción.</p></div>${btn(icon('Plus')+'Nueva tarea','new-task','','button primary')}</div>${taskList(pending,{emptyText:'No tenés tareas pendientes para hoy.'})}<details class="completed-tasks"><summary>Completadas <span>${completed.length}</span></summary><div class="completed-tasks-body">${taskList(completed,{emptyText:'Todavía no completaste tareas.',emptyAction:''})}</div></details>`;
}'''
replace_between('function spaceView(){', 'function taskList(', space_view, 'spaceView')

path.write_text(source, encoding='utf-8')
