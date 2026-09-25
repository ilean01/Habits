import './daily-planner.css';
import * as db from './store.js';
import {dayKey,parseDay,effectiveHabitsForDate,habitStatus} from './domain.js';
import {effectiveDayMode} from './day-modes.js';
import {authorizeEventSave} from './event-service.js';
import {plannerRecordId,planForDate,plannerTasks,plannerEvents,eventsByHour,nextHour,normalizeDailyPlan,DAILY_PLAN_KIND} from './daily-planner-domain.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const weekdays=['L','M','X','J','V','S','D'];
const hours=Array.from({length:16},(_,i)=>String(i+6).padStart(2,'0'));
let queued=false;

const settings=()=>db.records('settings')[0]||{};
const areaName=id=>db.records('area').find(a=>a.id===id)?.name||'Personal';
const plannerMode=()=>settings().todayLayout==='planner'?'planner':'dashboard';
const prettyDate=date=>parseDay(date).toLocaleDateString('es-PY',{day:'numeric',month:'long',year:'numeric'});
const weekdayName=date=>parseDay(date).toLocaleDateString('es-PY',{weekday:'long'});

function isTodayScreen(){
 const crumb=document.querySelector('.breadcrumb strong')?.textContent?.trim();
 return crumb==='Mi día'&&!!document.querySelector('.day-hero')&&!!document.querySelector('.dashboard-grid');
}

function currentPlan(date){return planForDate(db.records(DAILY_PLAN_KIND),date);}
function savePlan(date,mutate){
 const base=currentPlan(date),draft={...base,priorities:[...base.priorities]};
 const next=normalizeDailyPlan(mutate(draft)||draft,date);
 db.put(DAILY_PLAN_KIND,next,plannerRecordId(date));
}

function weekStrip(date){
 const active=(parseDay(date).getDay()+6)%7;
 return `<div class="planner-week-strip" aria-label="Día de la semana">${weekdays.map((d,i)=>`<span class="${i===active?'active':''}" aria-current="${i===active?'date':'false'}">${d}</span>`).join('')}</div>`;
}

function eventButton(event,date){
 const time=event.time?`${event.time}${event.end?`–${event.end}`:''}`:'Todo el día';
 return `<button class="planner-event" data-action="event-options" data-id="${esc(event.id)}" data-date="${esc(date)}" title="Abrir ${esc(event.name)}"><span>${esc(time)}</span><strong>${esc(event.name)}</strong></button>`;
}

function scheduleHtml(events,date){
 const {grouped,allDay}=eventsByHour(events);
 return `<div class="planner-schedule">
  ${allDay.length?`<div class="planner-all-day"><small>Todo el día</small><div class="planner-hour-content">${allDay.map(e=>eventButton(e,date)).join('')}</div></div>`:''}
  ${hours.map(hour=>{const rows=grouped.get(hour)||[];return `<div class="planner-hour"><span class="planner-hour-label">${hour}</span><div class="planner-hour-content">${rows.length?rows.map(e=>eventButton(e,date)).join(''):`<span class="planner-empty-slot">&nbsp;</span>`}</div><button class="planner-hour-add" data-planner-action="event-at" data-time="${hour}:00" aria-label="Agregar evento a las ${hour}:00">+</button></div>`;}).join('')}
 </div>`;
}

function habitsHtml(date){
 const s=settings(),mode=effectiveDayMode(s,date),logs=db.records('log');
 const habits=effectiveHabitsForDate(db.records('habit').sort((a,b)=>(a.order||0)-(b.order||0)),date,mode);
 if(mode==='descanso')return '<p class="planner-empty-note">Día de descanso: hoy no hay hábitos obligatorios y las rachas quedan protegidas.</p>';
 if(!habits.length)return '<p class="planner-empty-note">No hay hábitos programados para hoy.</p>';
 return `<div class="planner-habits">${habits.map(h=>{
  const state=habitStatus(h,logs,date),action=state.hydration?'water-custom':'habit-action';
  const extra=state.hydration?'':`data-id="${esc(h.id)}" data-date="${esc(date)}"`;
  const detail=state.hydration?`${(state.value/1000).toLocaleString('es-PY')} / ${(state.target/1000).toLocaleString('es-PY')} L`:state.weekly?`${state.weekly.done}/${state.weekly.target} esta semana`:h.type==='check'?(state.skip?'Pausa de hoy':areaName(h.area)):`${state.value||0} / ${h.target} ${esc(h.unit||'')}`;
  return `<div class="planner-habit-row"><button class="planner-check-button ${state.done?'done':state.skip?'paused':''}" data-action="${action}" ${extra} aria-label="${state.done?'Revisar':state.hydration?'Registrar agua':'Registrar'} ${esc(h.name)}">${state.done?'✓':state.skip?'–':'✓'}</button><button class="planner-row-main" data-action="edit-habit" data-id="${esc(h.id)}"><strong>${esc(h.name)}</strong><small>${detail}</small></button></div>`;
 }).join('')}</div>`;
}

function tasksHtml(date){
 const tasks=plannerTasks(db.records('task'),date);
 return `<div class="planner-checklist">${tasks.map(task=>`<div class="planner-task-row ${task.done?'completed':''} ${!task.done&&task.due<date?'overdue':''}"><button class="planner-check-button ${task.done?'done':''}" data-action="task-done" data-id="${esc(task.id)}" aria-label="${task.done?'Reabrir':'Completar'} ${esc(task.name)}">${task.done?'✓':'✓'}</button><button class="planner-row-main" data-action="edit-task" data-id="${esc(task.id)}"><strong>${esc(task.name)}</strong><small>${!task.done&&task.due<date?`Vencida · ${esc(task.due)}`:esc(areaName(task.area))}${task.priority==='alta'?' · prioridad alta':''}</small></button></div>`).join('')||'<p class="planner-empty-note">Tu lista de hoy está libre.</p>'}</div><form class="planner-quick-task" data-planner-form="task"><input name="name" maxlength="150" placeholder="Agregar a la lista de hoy…" aria-label="Nueva tarea para hoy"><button type="submit">Agregar</button></form>`;
}

function plannerHtml(date){
 const plan=currentPlan(date),events=plannerEvents(db.records('event'),date);
 return `<section class="daily-planner" data-planner-date="${date}"><div class="planner-paper">
  <header class="planner-paper-header"><div><p class="planner-kicker">Mi día</p><h2>${esc(weekdayName(date))}</h2><p class="planner-date-detail">${esc(prettyDate(date))}</p></div><div class="planner-header-side">${weekStrip(date)}<button class="planner-print" data-planner-action="print">Imprimir mi día</button></div></header>
  <div class="planner-grid">
   <main class="planner-main">
    <section class="planner-section planner-priorities"><div class="planner-section-title"><h3>Prioridades de hoy</h3><small>máximo 3</small></div><div class="planner-priority-list">${plan.priorities.map((value,i)=>`<label class="planner-priority"><span class="planner-priority-dot" aria-hidden="true"></span><input class="planner-line-input" data-plan-field="priority" data-index="${i}" maxlength="180" value="${esc(value)}" placeholder="Prioridad ${i+1}"></label>`).join('')}</div></section>
    <section class="planner-section planner-gratitude"><div class="planner-section-title"><h3>Gratitud</h3></div><textarea class="planner-lined-textarea" data-plan-field="gratitude" maxlength="4000" placeholder="Hoy agradezco…">${esc(plan.gratitude)}</textarea></section>
    <section class="planner-section planner-schedule-section"><div class="planner-section-title"><h3>Agenda</h3><small>06:00–21:00</small></div>${scheduleHtml(events,date)}</section>
   </main>
   <aside class="planner-side">
    <section class="planner-section planner-habit-section"><div class="planner-section-title"><h3>Tracker de hábitos</h3><small>mismos hábitos de Habits</small></div>${habitsHtml(date)}</section>
    <section class="planner-section planner-task-section"><div class="planner-section-title"><h3>Checklist</h3><small>tareas de hoy</small></div>${tasksHtml(date)}</section>
   </aside>
   <section class="planner-section planner-notes"><div class="planner-section-title"><h3>Notas / cosas que no quiero olvidar</h3></div><textarea class="planner-lined-textarea" data-plan-field="notes" maxlength="10000" placeholder="Escribí libremente…">${esc(plan.notes)}</textarea><small class="planner-save-hint">Se guarda automáticamente al salir del campo.</small></section>
  </div>
 </div></section>`;
}

function switchHtml(mode){return `<div class="planner-mode-switch" role="region" aria-label="Vista de Mi día"><span>Elegí cómo querés ver tu día. La app recuerda esta opción en tu cuenta.</span><div class="segmented" role="group" aria-label="Vista"><button data-planner-action="mode" data-mode="dashboard" class="${mode==='dashboard'?'active':''}" aria-pressed="${mode==='dashboard'}">Dashboard</button><button data-planner-action="mode" data-mode="planner" class="${mode==='planner'?'active':''}" aria-pressed="${mode==='planner'}">Agenda del día</button></div></div>`;}

function mount(){
 if(!isTodayScreen())return;
 const content=document.querySelector('.content'),heading=content?.querySelector('.page-heading'),hero=content?.querySelector('.day-hero'),dashboard=content?.querySelector('.dashboard-grid');
 if(!content||!heading||!hero||!dashboard)return;
 const mode=plannerMode();
 let toggle=content.querySelector('.planner-mode-switch');
 if(!toggle){heading.insertAdjacentHTML('afterend',switchHtml(mode));toggle=content.querySelector('.planner-mode-switch');}
 else toggle.outerHTML=switchHtml(mode);
 const old=content.querySelector('.daily-planner');
 if(mode==='dashboard'){
  hero.hidden=false;dashboard.hidden=false;old?.remove();return;
 }
 hero.hidden=true;dashboard.hidden=true;
 const html=plannerHtml(dayKey());
 if(old)old.outerHTML=html;else content.querySelector('.planner-mode-switch')?.insertAdjacentHTML('afterend',html);
}

const observer=new MutationObserver(scheduleMount);
function scheduleMount(){
 if(queued)return;queued=true;
 queueMicrotask(()=>{
  queued=false;observer.disconnect();
  try{mount();}finally{observer.observe(document.body,{childList:true,subtree:true});}
 });
}
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('pageshow',scheduleMount);
scheduleMount();

function ensureDialog(){
 let dialog=document.querySelector('#planner-quick-dialog');
 if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='planner-quick-dialog';dialog.className='planner-dialog';document.body.append(dialog);return dialog;
}

function openEventDialog(time){
 const date=dayKey(),dialog=ensureDialog(),areas=db.records('area'),end=nextHour(time);
 dialog.innerHTML=`<form data-planner-form="event"><h2>Agregar a la agenda</h2><p>${esc(weekdayName(date))} ${esc(prettyDate(date))}</p><label>¿Qué vas a hacer?<input name="name" required maxlength="150" autofocus placeholder="Ej.: Médico, reunión, almuerzo"></label><div class="planner-dialog-grid"><label>Hora<input name="time" type="time" value="${esc(time)}" required></label><label>Hasta<input name="end" type="time" value="${esc(end)}"></label></div><label>Área<select name="area">${areas.map(a=>`<option value="${esc(a.id)}" ${a.id==='personal'?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label><div class="planner-dialog-actions"><button type="button" class="planner-dialog-cancel" data-planner-action="close-dialog">Cancelar</button><button type="submit" class="planner-dialog-save">Guardar</button></div></form>`;
 dialog.showModal();
}

document.addEventListener('click',event=>{
 const el=event.target.closest('[data-planner-action]');if(!el)return;
 event.preventDefault();
 const action=el.dataset.plannerAction;
 if(action==='mode'){
  const s=settings(),next=el.dataset.mode==='planner'?'planner':'dashboard';
  db.put('settings',{...s,todayLayout:next},'settings');return;
 }
 if(action==='print'){window.print();return;}
 if(action==='event-at'){openEventDialog(el.dataset.time||'08:00');return;}
 if(action==='close-dialog'){el.closest('dialog')?.close();}
});

document.addEventListener('change',event=>{
 const field=event.target.closest('[data-plan-field]');if(!field)return;
 const date=field.closest('[data-planner-date]')?.dataset.plannerDate||dayKey();
 savePlan(date,plan=>{
  if(field.dataset.planField==='priority')plan.priorities[Number(field.dataset.index)||0]=field.value;
  if(field.dataset.planField==='gratitude')plan.gratitude=field.value;
  if(field.dataset.planField==='notes')plan.notes=field.value;
  return plan;
 });
});

document.addEventListener('submit',event=>{
 const form=event.target.closest('[data-planner-form]');if(!form)return;
 event.preventDefault();
 const data=new FormData(form),kind=form.dataset.plannerForm;
 if(kind==='task'){
  const name=String(data.get('name')||'').trim();if(!name)return;
  db.put('task',{name,area:'personal',due:dayKey(),priority:'media',projectId:'',note:'',done:false});
  return;
 }
 if(kind==='event'){
  const name=String(data.get('name')||'').trim();if(!name)return;
  const candidate={name,area:String(data.get('area')||'personal'),date:dayKey(),repeat:'none',time:String(data.get('time')||''),end:String(data.get('end')||''),until:'',reminderMinutes:'',location:'',note:''};
  const decision=authorizeEventSave(candidate,db.records('event'),{days:180,confirmConflict:message=>window.confirm(`${message} ¿Querés guardar igualmente?`)});
  if(!decision.allowed)return;
  db.put('event',candidate);form.closest('dialog')?.close();
 }
});
