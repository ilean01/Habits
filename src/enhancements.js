import './dark-theme.css';
import * as db from './store.js';
import {dayKey,addDays,weeklyProgress,flexibleWeekly} from './domain.js';
import {waterStats} from './wellbeing.js';
import {holidayOn,holidaysBetween,holidayStatusText} from './paraguay-holidays.js';
import {activeWorkBlock} from './work-context.js';

const modal=document.querySelector('#modal');
let currentHabitId='';
let queued=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rec=k=>db.records(k);

function installStyles(){if(document.querySelector('#habits-enhancement-styles'))return;const style=document.createElement('style');style.id='habits-enhancement-styles';style.textContent=`
.weekly-frequency{grid-column:1/-1;border:1px solid var(--line);border-radius:10px;padding:14px;margin:8px 0}.weekly-frequency legend{font-size:12px;font-weight:650}.weekly-frequency-grid{display:grid;grid-template-columns:1fr 150px;gap:10px}.weekly-help{font-size:11px;color:var(--muted);margin:8px 0 0}.weekly-goal{font-size:10px;color:var(--muted);margin:-7px 0 10px}.weekly-goal progress{margin:5px 0}.weekly-complete{box-shadow:inset 0 0 0 1px #9db38f}.work-focus{border:1px solid #d9e3eb;background:#f2f6f8;border-radius:11px;padding:12px 15px;margin-bottom:14px;font-size:12px;color:#557080}.later-link{margin-top:5px}.progress-link svg{width:18px;height:18px}.holiday-dot{display:block!important;color:#9b7b42!important;font-size:7px!important;white-space:normal!important;line-height:1.2!important;margin-top:3px}.holiday-legend{margin:10px 0 16px;padding:12px 14px;background:#faf6ed;border:1px solid #eee1c8;border-radius:10px;font-size:11px}.holiday-legend p{margin:3px 0}.install-banner{border:1px solid #dce3d4;background:#f1f5ed;border-radius:13px;padding:17px;margin-bottom:20px}.install-banner h3{font-family:var(--serif);font-size:20px;margin-bottom:8px}.install-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.install-step{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:11px;text-align:center;font-size:10px}.install-step b{display:block;font-size:22px;margin-bottom:5px}.install-close{float:right}.install-help.enhanced-install .install-steps{margin:12px 0}.later-list{display:grid;gap:8px}.later-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px;border:1px solid var(--line);border-radius:9px}.later-row button{text-align:left;flex:1}.holiday-today{border-left:3px solid #b79254;padding-left:10px}.work-priority-card{order:-10}.water-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:12px 0 15px}.water-summary span{display:flex;flex-direction:column;gap:2px;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--bg)}.water-summary b{font-family:var(--serif);font-size:16px;font-weight:500;color:var(--green)}.water-summary small{font-size:8px;color:var(--muted);line-height:1.35}.stat-grid.with-water{grid-template-columns:repeat(4,minmax(0,1fr))}.water-progress-stat strong{font-size:39px}.water-progress-detail{margin-top:20px}.water-progress-detail h2{margin-bottom:5px}.water-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-top:15px}.water-day{padding:10px 5px;text-align:center;border:1px solid var(--line);border-radius:8px;background:var(--bg)}.water-day b{display:block;font-size:12px;color:var(--green)}.water-day small{font-size:8px;color:var(--muted);text-transform:capitalize}.english-skills h3{font-size:13px}.english-skills p{font-size:11px;color:var(--muted)}@media(max-width:900px){.stat-grid.with-water{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.weekly-frequency-grid,.install-steps{grid-template-columns:1fr}.install-banner{padding:14px}.water-summary{grid-template-columns:1fr}.stat-grid.with-water{grid-template-columns:1fr}.water-days{gap:4px}.water-day{padding:8px 2px}.water-day b{font-size:10px}.water-day small{font-size:7px}}
`;document.head.append(style);}

function enhanceHabitEditor(){
 const form=modal?.querySelector('form');if(!form||form.dataset.weeklyEnhanced||!form.querySelector('[name="days"]')||!form.querySelector('[name="essential"]'))return;
 form.dataset.weeklyEnhanced='1';const habit=currentHabitId?rec('habit').find(h=>h.id===currentHabitId):null;
 const mode=habit?.frequencyMode||'days',target=Number(habit?.weeklyTarget)||3;
 const box=document.createElement('fieldset');box.className='weekly-frequency';box.innerHTML=`<legend>Frecuencia</legend><div class="weekly-frequency-grid"><label>Cómo querés cumplirlo<select name="frequencyMode"><option value="days" ${mode==='days'?'selected':''}>En los días elegidos</option><option value="weekly" ${mode==='weekly'?'selected':''}>X veces por semana</option></select></label><label data-weekly-target ${mode!=='weekly'?'hidden':''}>Veces por semana<input name="weeklyTarget" type="number" min="1" max="7" value="${target}"></label></div><p class="weekly-help">Con “X veces por semana”, los días de abajo son los días en los que te gustaría poder hacerlo; la racha se mide por semanas cumplidas, no por faltar un día concreto.</p>`;
 const days=form.querySelector('fieldset:not(.icon-picker)');days?.before(box);
 box.querySelector('[name="frequencyMode"]').addEventListener('change',e=>{const weekly=e.target.value==='weekly';box.querySelector('[data-weekly-target]').hidden=!weekly;if(weekly&&!currentHabitId)form.querySelectorAll('[name="days"]').forEach(x=>x.checked=true);});
}

function decorateWeeklyCards(){
 const logs=rec('log');for(const card of document.querySelectorAll('.habit-card[data-habit-id]')){
  const habit=rec('habit').find(h=>h.id===card.dataset.habitId);if(!habit||!flexibleWeekly(habit)){card.querySelector('.weekly-goal')?.remove();card.classList.remove('weekly-complete');continue;}
  const p=weeklyProgress(habit,logs,dayKey());let node=card.querySelector('.weekly-goal');if(!node){node=document.createElement('div');node.className='weekly-goal';const body=card.querySelector('p');body?.after(node);}node.innerHTML=`Meta semanal: <strong>${p.done}/${p.target}</strong><progress max="${p.target}" value="${Math.min(p.done,p.target)}"></progress>${p.complete?'✓ Semana cumplida':'Podés hacerlo cualquier día habilitado'}`;card.classList.toggle('weekly-complete',p.complete);
 }
}

function prioritizeWork(){
 const grid=document.querySelector('.dashboard-grid .habit-grid');if(!grid)return;const now=new Date(),date=dayKey(now),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,block=activeWorkBlock(rec('event'),date,time);
 document.querySelector('.work-focus')?.remove();grid.querySelectorAll('.work-priority-card').forEach(x=>x.classList.remove('work-priority-card'));
 if(!block)return;
 const section=grid.closest('section'),banner=document.createElement('div');banner.className='work-focus';banner.innerHTML=`💼 Estás dentro de <strong>${esc(block.name||'tu horario de trabajo')}</strong>${block.end?` hasta las ${esc(block.end)}`:''}. Primero te muestro lo laboral; lo personal sigue disponible y no se borra.`;section?.insertBefore(banner,grid);
 const habits=rec('habit');for(const card of grid.querySelectorAll('[data-habit-id]'))if(habits.find(h=>h.id===card.dataset.habitId)?.area==='trabajo')card.classList.add('work-priority-card');
}

function progressIcon(){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-7"/></svg>';}
function addProgressShortcut(){
 const nav=document.querySelector('.sidebar nav');if(!nav)return;let b=nav.querySelector('[data-progress-shortcut]');if(!b){b=document.createElement('button');b.className='nav-link progress-link';b.dataset.action='progress';b.dataset.progressShortcut='1';b.innerHTML=`${progressIcon()}<span>Progreso</span>`;nav.append(b);}
 const active=[...document.querySelectorAll('.space-tabs .chip.selected')].some(x=>x.textContent.trim()==='Mi progreso')||!!document.querySelector('.water-progress-stat');b.classList.toggle('active',active);if(active&&!b.querySelector('.nav-dot'))b.insertAdjacentHTML('beforeend','<span class="nav-dot"></span>');if(!active)b.querySelector('.nav-dot')?.remove();
}
function addLaterShortcut(){
 const nav=document.querySelector('.sidebar nav');if(!nav||nav.querySelector('[data-enh-action="later"]'))return;const b=document.createElement('button');b.className='nav-link later-link';b.dataset.enhAction='later';b.innerHTML='<span aria-hidden="true">🗂️</span><span>Para después</span>';nav.append(b);
}
function openLater(){const tasks=rec('task').filter(t=>!t.done&&!t.due);modal.innerHTML=`<div class="modal-heading"><div><p class="eyebrow">SIN FECHA, SIN PRESIÓN</p><h2>Para después</h2><p class="muted">Ideas y pendientes que querés guardar sin ponerles fecha todavía.</p></div><button class="icon-button" data-action="close" aria-label="Cerrar">×</button></div><div class="later-list">${tasks.map(t=>`<div class="later-row"><button data-action="edit-task" data-id="${esc(t.id)}"><strong>${esc(t.name)}</strong><br><small>${esc(t.note||'Sin notas')}</small></button></div>`).join('')||'<p class="muted">No guardaste nada para después todavía.</p>'}</div><div class="modal-footer"><button class="button primary" data-action="new-task">+ Guardar una idea</button></div>`;if(!modal.open)modal.showModal();}

function decorateWaterProgress(){
 const grid=[...document.querySelectorAll('.stat-grid')].find(x=>x.textContent.includes('ESTA SEMANA')&&x.textContent.includes('TIEMPO PARA LEER'));if(!grid)return;
 const stats=waterStats(rec('log').filter(r=>r.hydration),dayKey(),7);grid.classList.add('with-water');let card=grid.querySelector('.water-progress-stat');if(!card){card=document.createElement('article');card.className='panel water-progress-stat';grid.append(card);}card.innerHTML=`<span>💧 PROMEDIO DE AGUA</span><strong>${stats.average.toLocaleString('es-PY')}<small> L/día</small></strong><p>${stats.total.toLocaleString('es-PY')} L en 7 días · ${stats.daysWithWater}/7 días con registro</p>`;
 let detail=grid.parentElement.querySelector('.water-progress-detail');if(!detail){detail=document.createElement('section');detail.className='panel water-progress-detail';grid.after(detail);}detail.innerHTML=`<h2>Tu agua, día por día</h2><p class="muted">Promedio de los últimos 7 días, contando también los días sin registro.</p><div class="water-days">${stats.keys.map((d,i)=>`<div class="water-day"><b>${stats.liters[i].toLocaleString('es-PY')} L</b><small>${new Date(`${d}T12:00:00`).toLocaleDateString('es-PY',{weekday:'short'})}</small></div>`).join('')}</div>`;
}

function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function installed(){return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;}
function installGuide(){
 if(!isIOS()||installed()||sessionStorage.getItem('habits-install-dismissed')==='1')return;const content=document.querySelector('.content');if(!content||content.querySelector('.install-banner'))return;
 const box=document.createElement('section');box.className='install-banner';box.innerHTML=`<button class="install-close" data-enh-action="dismiss-install" aria-label="Cerrar">×</button><h3>Instalá Habits en tu iPhone</h3><p>Así funciona como una app y puede recibir recordatorios.</p><div class="install-steps"><div class="install-step"><b>①</b>Abrí Habits en <strong>Safari</strong></div><div class="install-step"><b>↗</b>Tocá <strong>Compartir</strong></div><div class="install-step"><b>＋</b>Elegí <strong>Agregar a pantalla de inicio</strong></div></div>`;content.prepend(box);
}
function enrichSettingsInstall(){const help=modal?.querySelector('.install-help:not(.enhanced-install)');if(!help||!isIOS())return;help.classList.add('enhanced-install');help.insertAdjacentHTML('beforeend','<div class="install-steps"><div class="install-step"><b>①</b>Safari</div><div class="install-step"><b>↗</b>Compartir</div><div class="install-step"><b>＋</b>Agregar a inicio</div></div>');}

function decorateHolidays(){
 const cells=[...document.querySelectorAll('.calendar-cell[data-date]')];if(!cells.length)return;let start=cells[0].dataset.date,end=cells[cells.length-1].dataset.date;
 for(const cell of cells){const h=holidayOn(cell.dataset.date);cell.classList.toggle('holiday-cell',!!h);cell.querySelector('.holiday-dot')?.remove();if(h){const tag=document.createElement('small');tag.className='holiday-dot';tag.textContent='Feriado';tag.title=holidayStatusText(h);cell.append(tag);}}
 const toolbar=document.querySelector('.calendar-toolbar');if(!toolbar||toolbar.parentElement.querySelector('.holiday-legend'))return;const hs=holidaysBetween(start,end);if(!hs.length)return;const legend=document.createElement('div');legend.className='holiday-legend';legend.innerHTML=`<strong>🇵🇾 Feriados en esta vista</strong>${hs.map(h=>`<p><b>${esc(h.date.slice(8))}/${esc(h.date.slice(5,7))}</b> · ${esc(holidayStatusText(h))}</p>`).join('')}`;toolbar.after(legend);
}
function decorateHolidayToday(){const h=holidayOn(dayKey());if(!h)return;const hero=document.querySelector('.day-hero');if(!hero||document.querySelector('.holiday-today'))return;const note=document.createElement('p');note.className='holiday-today';note.textContent=`🇵🇾 Hoy es feriado: ${holidayStatusText(h)}`;hero.querySelector('div')?.append(note);}

function run(){queued=false;observer.disconnect();try{installStyles();enhanceHabitEditor();decorateWeeklyCards();prioritizeWork();addProgressShortcut();addLaterShortcut();decorateWaterProgress();installGuide();enrichSettingsInstall();decorateHolidayToday();}finally{observer.takeRecords();observe();}}
// Los adornos modifican el DOM: mientras corren, el observador se desconecta para no volver a dispararse a sí mismo.
// Antes, cada adorno generaba una mutación que volvía a llamar a run() en un bucle infinito de microtareas y congelaba la página.
const nextFrame=globalThis.requestAnimationFrame?cb=>requestAnimationFrame(cb):cb=>setTimeout(cb,16);
function schedule(){if(queued)return;queued=true;nextFrame(run);}

document.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='new-habit')currentHabitId='';if(action==='edit-habit')currentHabitId=e.target.closest('[data-action]').dataset.id||'';const own=e.target.closest('[data-enh-action]');if(!own)return;if(own.dataset.enhAction==='later'){e.preventDefault();openLater();}if(own.dataset.enhAction==='dismiss-install'){e.preventDefault();sessionStorage.setItem('habits-install-dismissed','1');own.closest('.install-banner')?.remove();}},true);
const observer=new MutationObserver(schedule);
function observe(){observer.observe(document.body,{childList:true,subtree:true});}
observe();
setInterval(schedule,60000);
schedule();
