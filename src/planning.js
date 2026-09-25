import './planning.css';
import * as db from './store.js';
import {dayKey,parseDay} from './domain.js';
import {effectiveDayMode} from './day-modes.js';
import {authorizeEventSave} from './event-service.js';
import {planningSnapshot} from './planning-domain.js';
export {effectiveDayMode} from './day-modes.js';

const SKILLS={listening:'Comprensión auditiva',reading:'Lectura',speaking:'Conversación',writing:'Escritura'};
const AREA_LABELS={facultad:'Facultad',trabajo:'Trabajo',ingles:'Inglés'};

function dueText(task,today){
 if(!task.due)return 'Sin fecha';
 const days=Math.ceil((parseDay(task.due)-parseDay(today))/86400000);
 if(days<0)return `Venció hace ${Math.abs(days)} ${Math.abs(days)===1?'día':'días'}`;
 if(days===0)return 'Hoy';
 if(days===1)return 'Mañana';
 return `En ${days} días`;
}

function taskRows(tasks,today,{esc,btn},empty='Sin pendientes.'){
 return tasks.map(t=>`<div class="planning-row"><div><strong>${esc(t.name)}</strong><small>${t.due?`${esc(t.due)} · `:''}${esc(dueText(t,today))}</small></div>${btn('Ver / editar','edit-task',`data-id="${esc(t.id)}"`,'text-button')}</div>`).join('')||`<p class="muted">${empty}</p>`;
}

function eventRows(rows,{esc,btn},empty='Sin eventos próximos.'){
 return rows.map(({date,event})=>`<div class="planning-row"><div><strong>${esc(event.name)}</strong><small>${esc(date)} · ${esc(event.time||'Todo el día')}${event.location?' · '+esc(event.location):''}</small></div>${btn('Ver','event-options',`data-id="${esc(event.id)}" data-date="${esc(date)}"`,'text-button')}</div>`).join('')||`<p class="muted">${empty}</p>`;
}

function weeklyRows(blocks,{esc}){
 return blocks.map(e=>{const day=parseDay(e.date).toLocaleDateString('es-PY',{weekday:'long'});return `<div class="planning-row"><div><strong>${esc(e.name)}</strong><small>${esc(AREA_LABELS[e.area]||e.area)} · ${esc(day)} · ${esc(e.time||'Todo el día')}${e.end?' – '+esc(e.end):''}</small></div></div>`;}).join('')||'<p class="muted">Todavía no tenés bloques semanales de Facultad, Trabajo o Inglés.</p>';
}

export function planningView({esc,btn,area=''}){
 const snapshot=planningSnapshot({
  projects:db.records('project'),
  tasks:db.records('task'),
  journals:db.records('journal'),
  events:db.records('event'),
  words:db.records('word'),
  settings:db.records('settings')[0]||{},
  today:dayKey()
 });
 const {faculty,work,english,weekly,today}=snapshot;
 const overview=`<section class="panel planning-overview"><div class="section-title"><div><h2>Facultad, Trabajo e Inglés</h2><p>Cada cosa en su lugar, pero conectada con tu calendario y tus pendientes.</p></div>${btn('Organizar mi semana','plan-week','','button outline')}</div><div class="stat-grid"><article><h3>Facultad</h3><strong>${faculty.subjects.length}</strong><p>${faculty.subjects.length===1?'materia registrada':'materias registradas'} · ${faculty.tasks.length} pendientes</p></article><article><h3>Trabajo</h3><strong>${work.tasks.length}</strong><p>pendientes laborales · ${work.events.length} eventos próximos</p></article><article><h3>Inglés</h3><strong>${english.minutes}<small> min</small></strong><p>${english.percent}% de tu meta semanal · ${english.words.length} palabras</p></article></div></section>`;
 const facultySection=`<section class="panel" id="planning-facultad"><div class="section-title"><div><p class="eyebrow">FACULTAD</p><h2>Materias, evaluaciones y horario</h2><p>Lo académico queda separado de proyectos personales y del trabajo.</p></div><div class="button-row">${area==='facultad'?'':btn('Ver área Facultad','area','data-id="facultad"','button outline')}${btn('Agregar materia','plan-subject','','button primary')}</div></div><div class="planning-columns"><div><h3>Mis materias</h3>${faculty.subjects.map(p=>{const grades=(p.grades||[]).filter(g=>Number.isFinite(Number(g.value))),average=grades.length?grades.reduce((n,g)=>n+Number(g.value),0)/grades.length:null;return `<article class="planning-card"><h3>${esc(p.name)}</h3><p>${esc(p.semester||'Semestre sin definir')}${p.room?' · Aula '+esc(p.room):''}</p><p>${average===null?'Sin notas registradas':`Promedio simple: ${average.toFixed(2)}`}</p><div class="button-row">${btn('Editar materia y notas','plan-subject',`data-id="${esc(p.id)}"`,'text-button')}${btn('Agregar examen o entrega','plan-assignment',`data-id="${esc(p.id)}"`,'text-button')}</div></article>`;}).join('')||'<p class="muted">Todavía no registraste materias.</p>'}</div><div><h3>Próximas entregas y exámenes</h3>${taskRows(faculty.tasks,today,{esc,btn},'No tenés entregas ni exámenes pendientes.')}</div></div><div class="section-title"><h3>Agenda de Facultad</h3>${btn('Agregar bloque semanal','plan-schedule','data-area="facultad"','text-button')}</div>${eventRows(faculty.events,{esc,btn},'No hay clases ni eventos de Facultad próximos.')}</section>`;
 const workSection=`<section class="panel" id="planning-trabajo"><div class="section-title"><div><p class="eyebrow">TRABAJO</p><h2>Pendientes laborales y agenda</h2><p>Las tareas del trabajo ya no se mezclan con Facultad ni con tus proyectos personales.</p></div><div class="button-row">${area==='trabajo'?'':btn('Ver área Trabajo','area','data-id="trabajo"','button outline')}${btn('Nueva tarea laboral','plan-work-task','','button primary')}</div></div><div class="planning-columns"><div><h3>Pendientes de Trabajo</h3>${taskRows(work.tasks,today,{esc,btn},'No tenés pendientes laborales activos.')}</div><div><div class="section-title"><h3>Reuniones y bloques próximos</h3>${btn('Crear horario semanal','plan-schedule','data-area="trabajo"','text-button')}</div>${eventRows(work.events,{esc,btn},'No hay reuniones ni bloques de Trabajo próximos.')}</div></div></section>`;
 const englishSection=`<section class="panel" id="planning-ingles"><div class="section-title"><div><p class="eyebrow">INGLÉS</p><h2>Práctica, vocabulario y meta semanal</h2><p>Medí tiempo real de práctica sin convertir Inglés en una lista de tareas.</p></div><div class="button-row">${area==='ingles'?'':btn('Ver área Inglés','area','data-id="ingles"','button outline')}${btn('Registrar práctica','plan-english','','button primary')}</div></div><div class="stat-grid english-skills">${Object.entries(SKILLS).map(([skill,label])=>`<article><h3>${label}</h3><strong>${english.skillMinutes[skill]||0}<small> min</small></strong><p>esta semana</p></article>`).join('')}</div><div class="planning-columns"><div><h3>Meta semanal</h3><p><strong>${english.minutes} / ${english.goal} min</strong> · ${english.percent}% completado</p><progress max="${english.goal}" value="${Math.min(english.minutes,english.goal)}"></progress>${btn('Cambiar meta','plan-english-goal','','text-button')}<h3>Vocabulario</h3><p>${english.words.length} ${english.words.length===1?'palabra guardada':'palabras guardadas'}.</p><div class="button-row">${btn('Nueva palabra','new-word','','button outline')}${area==='ingles'?'':btn('Abrir vocabulario','area','data-id="ingles"','text-button')}</div></div><div><h3>Próximos bloques de Inglés</h3>${eventRows(english.events,{esc,btn},'No tenés clases o bloques de Inglés próximos.')}${btn('Agregar bloque semanal','plan-schedule','data-area="ingles"','text-button')}</div></div></section>`;
 const weekSection=`<section class="panel" id="planning-semana"><div class="section-title"><div><p class="eyebrow">PLANIFICACIÓN SEMANAL</p><h2>Una sola semana para los tres contextos</h2><p>Los bloques se guardan en el mismo calendario, con su área correcta.</p></div>${btn('Crear horario semanal','plan-schedule','','button primary')}</div>${weeklyRows(weekly.blocks,{esc})}<div class="button-row">${btn('Elegir mis tipos de día','plan-week','','button outline')}${btn('Ver calendario','nav','data-view="calendar"','button outline')}</div></section>`;
 if(area==='facultad')return facultySection;
 if(area==='trabajo')return workSection;
 if(area==='ingles')return englishSection;
 if(area==='week')return weekSection;
 return overview+facultySection+workSection+englishSection+weekSection;
}

export async function planningAction(a,el,{showModal,input,textarea,select,modal,toast,confirmEventConflict}){
 if(!a.startsWith('plan-'))return false;
 const projects=db.records('project'),settings=db.records('settings')[0]||{};
 const save=(kind,v,id)=>{db.put(kind,v,id);modal.close();toast('Guardado.');};
 if(a==='plan-subject'){const p=projects.find(p=>p.id===el.dataset.id)||{};showModal('Materia',`<form>${input('Materia','name',p.name,'text','required')}${input('Semestre','semester',p.semester)}${input('Aula','room',p.room)}${textarea('Notas numéricas, separadas por coma','grades',(p.grades||[]).map(g=>g.value).join(', '))}<p class="muted small">Usá la misma escala para todas las notas. El promedio es simple, sin ponderaciones.</p><button class="button primary" type="submit">Guardar</button></form>`,f=>{const values=String(f.get('grades')).trim();const grades=values?values.split(',').map(x=>({value:Number(x.trim())})):[];if(grades.some(g=>!Number.isFinite(g.value)||g.value<0))throw new Error('Revisá las notas.');save('project',{...p,...Object.fromEntries(f),category:'subject',area:'facultad',grades},p.id);});}
 if(a==='plan-assignment')showModal('Examen o entrega',`<form>${select('Tipo','category',[['exam','Examen'],['assignment','Entrega']],'exam')}${input('Título','name','','text','required')}${input('Fecha','due',dayKey(),'date','required')}${textarea('Temas y detalles','note')}<button class="button primary" type="submit">Guardar</button></form>`,f=>save('task',{...Object.fromEntries(f),projectId:el.dataset.id,area:'facultad',done:false,priority:'alta'}));
 if(a==='plan-work-task')showModal('Tarea de Trabajo',`<form>${input('Tarea','name','','text','required')}${input('Fecha límite (opcional)','due','','date')}${select('Prioridad','priority',[['alta','Alta'],['media','Media'],['baja','Baja']],'media')}${textarea('Notas','note')}<button class="button primary" type="submit">Guardar</button></form>`,f=>save('task',{...Object.fromEntries(f),area:'trabajo',done:false}));
 if(a==='plan-schedule'){const defaultArea=['trabajo','facultad','ingles'].includes(el.dataset.area)?el.dataset.area:'trabajo';showModal('Horario semanal',`<form>${input('Nombre','name','','text','required')}${select('Área','area',[['trabajo','Trabajo'],['facultad','Facultad'],['ingles','Inglés']],defaultArea)}${input('Primera fecha','date',dayKey(),'date','required')}${input('Hora inicial','time','08:00','time','required')}${input('Hora final','end','09:00','time','required')}${input('Hasta (fin de semestre, opcional)','until','','date')}${input('Aula o lugar','location')}<button class="button primary" type="submit">Guardar</button></form>`,f=>{const event={...Object.fromEntries(f),repeat:'weekly'};const decision=authorizeEventSave(event,db.records('event'),{days:180,confirmConflict:confirmEventConflict});if(!decision.allowed)return;save('event',event);});}
 if(a==='plan-english')showModal('Práctica de inglés',`<form>${select('Habilidad','skill',Object.entries(SKILLS),'listening')}${input('Fecha','date',dayKey(),'date','required')}${input('Minutos','minutes',15,'number','required min="1" max="1440"')}${textarea('Qué practicaste','text')}<button class="button primary" type="submit">Guardar</button></form>`,f=>save('journal',{...Object.fromEntries(f),englishPractice:true,minutes:Number(f.get('minutes')),at:new Date().toISOString()}));
 if(a==='plan-english-goal')showModal('Meta semanal de inglés',`<form>${input('Minutos por semana','englishWeeklyGoal',Number(settings.englishWeeklyGoal)||120,'number','required min="15" max="10080" step="15"')}<p class="muted small">La meta mide práctica real registrada. No crea tareas ni penaliza rachas.</p><button class="button primary" type="submit">Guardar meta</button></form>`,f=>save('settings',{...settings,englishWeeklyGoal:Number(f.get('englishWeeklyGoal'))},'settings'));
 if(a==='plan-week')showModal('Tu semana',`<form>${['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((day,i)=>select(day,'day'+i,[['habitual','Habitual'],['trabajo','Día de trabajo'],['facultad','Día de facu'],['finDeSemana','Fin de semana'],['tranquilo','Tranquilo'],['descanso','Descanso']],settings.weekModes?.[i]||'habitual')).join('')}<button class="button primary" type="submit">Guardar</button></form>`,f=>save('settings',{...settings,weekModes:Object.fromEntries(Array.from({length:7},(_,i)=>[i,f.get('day'+i)])),dayModeDate:null},'settings'));
 return true;
}
