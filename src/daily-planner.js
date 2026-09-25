import './daily-planner.css';
import * as db from './store.js';
import {dayKey,parseDay,effectiveHabitsForDate,habitStatus} from './domain.js';
import {effectiveDayMode} from './day-modes.js';
import {authorizeEventSave} from './event-service.js';
import {plannerRecordId,planForDate,plannerTasks,plannerEvents,eventsByHour,nextHour,normalizeDailyPlan,DAILY_PLAN_KIND} from './daily-planner-domain.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const weekdays=['L','M','X','J','V','S','D'];
const hours=Array.from({length:16},(_,i)=>String(i+6).padStart(2,'0'));

const settings=()=>db.records('settings')[0]||{};
const areaName=id=>db.records('area').find(a=>a.id===id)?.name||'Personal';
export const plannerMode=()=>settings().todayLayout==='planner'?'planner':'dashboard';
const prettyDate=date=>parseDay(date).toLocaleDateString('es-PY',{day:'numeric',month:'long',year:'numeric'});
const weekdayName=date=>parseDay(date).toLocaleDateString('es-PY',{weekday:'long'});

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
 const byHour=eventsByHour(events);
 return `<div class="planner-schedule" aria-label="Agenda horaria">${hours.map(hour=>`<div class="planner-hour-row"><time>${hour}:00</time><div class="planner-hour-content">${(byHour.get(hour)||[]).map(event=>eventButton(event,date)).join('')}<button class="planner-hour-add" data-planner-action="event-at" data-time="${hour}:00" aria-label="Agregar evento a las ${hour}:00">+</button></div></div>`).join('')}</div>`;
}

function checklistHtml(tasks){
 return tasks.length?`<div class="planner-task-list">${tasks.map(task=>`<label class="planner-task ${task.done?'done':''}"><input type="checkbox" data-planner-action="task" data-id="${esc(task.id)}" ${task.done?'checked':''}><span><strong>${esc(task.name)}</strong><small>${esc(areaName(task.area))}${task.due?` · ${esc(task.due)}`:''}</small></span></label>`).join('')}</div>`:'<p class="planner-empty">No hay tareas pendientes para hoy.</p>';
}

function habitsHtml(habits,logs,date){
 return habits.length?`<div class="planner-habit-list">${habits.map(h=>{const status=habitStatus(h,logs,date);return `<button class="planner-habit ${status.done?'done':''}" data-action="habit-action" data-id="${esc(h.id)}" data-date="${esc(date)}"><span>${status.done?'✓':'○'}</span><div><strong>${esc(h.name)}</strong><small>${esc(areaName(h.area))}</small></div></button>`;}).join('')}</div>`:'<p class="planner-empty">No hay hábitos programados.</p>';
}

function plannerHtml(date){
 const plan=currentPlan(date),tasks=plannerTasks(db.records('task'),date),events=plannerEvents(db.records('event'),date),dayMode=effectiveDayMode(settings(),date),habits=effectiveHabitsForDate(db.records('habit'),date,dayMode),logs=db.records('log');
 return `<section class="daily-planner" data-planner-date="${esc(date)}">
  <header class="planner-hero"><div><p class="planner-eyebrow">AGENDA DEL DÍA</p><h1>${esc(weekdayName(date))}</h1><p>${esc(prettyDate(date))}</p></div><div class="planner-actions"><button class="button outline" data-planner-action="print">Imprimir A4</button></div></header>
  ${weekStrip(date)}
  <div class="planner-paper">
   <div class="planner-left">
    <section class="planner-section planner-priorities"><div class="planner-section-title"><h3>Mis 3 prioridades</h3><small>lo importante primero</small></div>${plan.priorities.map((value,i)=>`<label><span>${i+1}</span><input data-plan-field="priority" data-index="${i}" value="${esc(value)}" maxlength="180" placeholder="Prioridad ${i+1}"></label>`).join('')}</section>
    <section class="planner-section"><div class="planner-section-title"><h3>Tareas</h3><small>hoy y vencidas</small></div>${checklistHtml(tasks)}</section>
    <section class="planner-section"><div class="planner-section-title"><h3>Hábitos</h3><small>tu rutina real</small></div>${habitsHtml(habits,logs,date)}</section>
    <section class="planner-section planner-gratitude"><div class="planner-section-title"><h3>Hoy agradezco…</h3></div><textarea data-plan-field="gratitude" maxlength="1000" placeholder="Algo pequeño también cuenta…">${esc(plan.gratitude)}</textarea></section>
   </div>
   <div class="planner-right">
    <section class="planner-section planner-agenda"><div class="planner-section-title"><h3>Mi agenda</h3><small>06:00 – 21:00</small></div>${scheduleHtml(events,date)}</section>
    <section class="planner-section planner-notes"><div class="planner-section-title"><h3>Notas / cosas que no quiero olvidar</h3></div><textarea class="planner-lined-textarea" data-plan-field="notes" maxlength="10000" placeholder="Escribí libremente…">${esc(plan.notes)}</textarea><small class="planner-save-hint">Se guarda automáticamente al salir del campo.</small></section>
   </div>
  </div></section>`;
}

export function plannerSwitchHtml(mode=plannerMode()){
 return `<div class="planner-mode-switch" role="region" aria-label="Vista de Mi día"><span>Elegí cómo querés ver tu día. La app recuerda esta opción en tu cuenta.</span><div class="segmented" role="group" aria-label="Vista"><button data-planner-action="mode" data-mode="dashboard" class="${mode==='dashboard'?'active':''}" aria-pressed="${mode==='dashboard'}">Dashboard</button><button data-planner-action="mode" data-mode="planner" class="${mode==='planner'?'active':''}" aria-pressed="${mode==='planner'}">Agenda del día</button></div></div>`;
}

export function dailyPlannerLayout(dashboardHtml,date=dayKey(),summaryHtml=''){
 const mode=plannerMode();
 return `${plannerSwitchHtml(mode)}${summaryHtml}${mode==='planner'?plannerHtml(date):dashboardHtml}`;
}

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
 if(form.dataset.plannerForm==='event'){
  const fd=new FormData(form),date=dayKey(),data={name:String(fd.get('name')||'').trim(),date,time:fd.get('time'),end:fd.get('end'),area:fd.get('area')||'personal',repeat:'none'};
  const verdict=authorizeEventSave(db.records('event'),data);
  if(!verdict.ok&&!confirm(verdict.message+' ¿Querés guardar igualmente?'))return;
  db.put('event',data);form.closest('dialog')?.close();
 }
});
