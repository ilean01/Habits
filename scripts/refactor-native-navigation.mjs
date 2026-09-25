import fs from 'node:fs';

const mainPath='src/main.js';
let main=fs.readFileSync(mainPath,'utf8');

function replaceOnce(source,oldText,newText,label){
 const count=source.split(oldText).length-1;
 if(count!==1)throw new Error(`${label}: se esperaba 1 coincidencia y se encontraron ${count}`);
 return source.replace(oldText,newText);
}

main=replaceOnce(
 main,
 "['space','Flower2','Más']",
 "['space','CheckCheck','Tareas']",
 'navegación Tareas'
);

const calendarHeading="heading('HACÉ ESPACIO PARA TUS PLANES','Tu calendario','Tus compromisos y tus momentos, en equilibrio.',btn(icon('Plus')+'Nuevo evento','new-event','','button primary'))";
const calendarHeadingNative="heading('HACÉ ESPACIO PARA TUS PLANES','Tu calendario','Tus compromisos y tus momentos, en equilibrio.',btn('Organizar semana','plan-week','','button outline')+btn(icon('Plus')+'Nuevo evento','new-event','','button primary'))";
const calendarCount=main.split(calendarHeading).length-1;
if(calendarCount!==2)throw new Error(`Calendario: se esperaban 2 encabezados y se encontraron ${calendarCount}`);
main=main.split(calendarHeading).join(calendarHeadingNative);

const areaNeedle="</div>${a.id==='ingles'?vocabView():a.id===GYM_AREA?gymView({esc,btn,icon}):''}${areaAgenda(a)}";
const areaNative="</div>${['facultad','trabajo','ingles'].includes(a.id)?`<div class=\"area-domain-planning\" data-area=\"${a.id}\">${planningView({esc,btn,area:a.id})}</div>`:''}${a.id==='ingles'?vocabView():a.id===GYM_AREA?gymView({esc,btn,icon}):''}${areaAgenda(a)}";
main=replaceOnce(main,areaNeedle,areaNative,'planificación por área');

const oldSpace=/function spaceView\(\)\{[^\n]*\}\nfunction taskList/;
if(!oldSpace.test(main))throw new Error('No se encontró spaceView');
const newSpace=`function spaceView(){const tasks=rec('task'),pending=pendingTasks(tasks),later=laterTasks(tasks),completed=completedTasks(tasks);const tabs=[['tareas','Pendientes'],['later','Para después'],['proyectos','Proyectos']];if(!tabs.some(([id])=>id===tab))tab='tareas';return \`${'${'}heading('ORGANIZÁ LO QUE TENÉS QUE HACER','Tareas','Pendientes, para después y proyectos personales, sin mezclar tus áreas.')}<div class=\"button-row mobile-task-shortcuts\">${'${'}[['areas','Mis áreas'],['progress','Progreso'],['diary','Mi diario']].map(([v,n])=>btn(n,'nav',\`data-view=\"${'${'}v}\"\`,'button outline')).join('')}</div><div class=\"chips space-tabs\">${'${'}tabs.map(([id,name])=>btn(name,'space-tab',\`data-tab=\"${'${'}id}\"\`,tab===id?'chip selected':'chip')).join('')}</div>${'${'}tab==='proyectos'?projectsView():tab==='later'?\`<div class=\"section-title\"><div><h2>Para después</h2><p>Tareas activas sin fecha, guardadas sin presión.</p></div>${'${'}btn(icon('Plus')+'Nueva tarea','new-task','','button primary')}</div>${'${'}taskList(later,{emptyText:'No tenés tareas guardadas para después.'})}\`:\`<div class=\"section-title\"><div><h2>Pendientes</h2><p>Tareas activas con fecha. Lo que no tiene fecha vive en Para después.</p></div>${'${'}btn(icon('Plus')+'Nueva tarea','new-task','','button primary')}</div>${'${'}taskList(pending,{emptyText:'No tenés pendientes con fecha.'})}<details class=\"completed-tasks\"><summary>Completadas <span>${'${'}completed.length}</span></summary><div class=\"completed-tasks-body\">${'${'}taskList(completed,{emptyText:'Todavía no completaste tareas.',emptyAction:''})}</div></details>\`}\`;}
function taskList`;
main=main.replace(oldSpace,newSpace);

main=replaceOnce(
 main,
 "if(a==='space-tab'){if(el.dataset.tab==='biblioteca'){view='library';}else tab=el.dataset.tab;render();return;}",
 "if(a==='space-tab'){tab=el.dataset.tab;render();return;}",
 'acción de pestañas de Tareas'
);

main=main.replaceAll('mobile-more-shortcuts','mobile-task-shortcuts');
fs.writeFileSync(mainPath,main);

const indexPath='index.html';
let index=fs.readFileSync(indexPath,'utf8');
index=replaceOnce(index,'<script type="module" src="/src/navigation-simplify.js"></script>','', 'script navigation-simplify');
fs.writeFileSync(indexPath,index);

for(const cssPath of ['src/style.css','src/accessibility.css','src/native-ui.css']){
 if(!fs.existsSync(cssPath))continue;
 const css=fs.readFileSync(cssPath,'utf8');
 fs.writeFileSync(cssPath,css.replaceAll('mobile-more-shortcuts','mobile-task-shortcuts'));
}

if(!fs.existsSync('src/navigation-simplify.js'))throw new Error('navigation-simplify.js ya no existe antes del refactor');
fs.unlinkSync('src/navigation-simplify.js');

if(main.includes("['space','Flower2','Más']"))throw new Error('La navegación vieja sigue presente');
if(main.includes("['planning','Estudio y trabajo']"))throw new Error('La pestaña vieja de planificación sigue presente');
if(!main.includes("['space','CheckCheck','Tareas']"))throw new Error('Tareas no quedó como navegación nativa');
if(!main.includes('area-domain-planning'))throw new Error('La planificación por área no quedó nativa');
if(!main.includes("btn('Organizar semana','plan-week'"))throw new Error('Organizar semana no quedó nativo');
console.log('Refactor de navegación aplicado.');
