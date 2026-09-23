import './dark-theme.css';
import * as db from './store.js';
import {dayKey} from './domain.js';
import {holidayOn,holidayStatusText} from './paraguay-holidays.js';
import {activeWorkBlock} from './work-context.js';

const modal=document.querySelector('#modal');
let currentHabitId='',queued=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rec=k=>db.records(k);

function installStyles(){
 if(document.querySelector('#habits-enhancement-styles'))return;
 const style=document.createElement('style');style.id='habits-enhancement-styles';style.textContent=`
 .weekly-frequency{grid-column:1/-1;border:1px solid var(--line);border-radius:10px;padding:14px;margin:8px 0}.weekly-frequency legend{font-size:13px;font-weight:650}.weekly-frequency-grid{display:grid;grid-template-columns:1fr 150px;gap:10px}.weekly-help{font-size:12px;color:var(--muted);margin:8px 0 0}.work-focus{border:1px solid #d9e3eb;background:#f2f6f8;border-radius:11px;padding:12px 15px;margin-bottom:14px;font-size:13px;color:#557080}.work-priority-card{order:-10}.install-banner{border:1px solid #dce3d4;background:#f1f5ed;border-radius:13px;padding:17px;margin-bottom:20px}.install-banner h3{font-family:var(--serif);font-size:20px;margin-bottom:8px}.install-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.install-step{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:11px;text-align:center;font-size:12px}.install-step b{display:block;font-size:22px;margin-bottom:5px}.install-close{float:right;min-width:44px;min-height:44px}.install-help.enhanced-install .install-steps{margin:12px 0}.holiday-today{border-left:3px solid #b79254;padding-left:10px}@media(max-width:650px){.weekly-frequency-grid,.install-steps{grid-template-columns:1fr}.install-banner{padding:14px}}
 `;document.head.append(style);
}

function enhanceHabitEditor(){
 const form=modal?.querySelector('form');if(!form||form.dataset.weeklyEnhanced||!form.querySelector('[name="days"]')||!form.querySelector('[name="essential"]'))return;
 form.dataset.weeklyEnhanced='1';const habit=currentHabitId?rec('habit').find(h=>h.id===currentHabitId):null,mode=habit?.frequencyMode||'days',target=Number(habit?.weeklyTarget)||3;
 const box=document.createElement('fieldset');box.className='weekly-frequency';box.innerHTML=`<legend>Frecuencia</legend><div class="weekly-frequency-grid"><label>Cómo querés cumplirlo<select name="frequencyMode"><option value="days" ${mode==='days'?'selected':''}>En los días elegidos</option><option value="weekly" ${mode==='weekly'?'selected':''}>X veces por semana</option></select></label><label data-weekly-target ${mode!=='weekly'?'hidden':''}>Veces por semana<input name="weeklyTarget" type="number" min="1" max="7" value="${target}"></label></div><p class="weekly-help">Con “X veces por semana”, elegís en qué días podrías hacerlo; la racha se mide por semanas cumplidas.</p>`;
 const days=form.querySelector('fieldset:not(.icon-picker)');days?.before(box);
 box.querySelector('[name="frequencyMode"]').addEventListener('change',e=>{const weekly=e.target.value==='weekly';box.querySelector('[data-weekly-target]').hidden=!weekly;if(weekly&&!currentHabitId)form.querySelectorAll('[name="days"]').forEach(x=>x.checked=true);});
}

function prioritizeWork(){
 const grid=document.querySelector('.dashboard-grid .habit-grid');if(!grid)return;const now=new Date(),date=dayKey(now),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,block=activeWorkBlock(rec('event'),date,time);
 document.querySelector('.work-focus')?.remove();grid.querySelectorAll('.work-priority-card').forEach(x=>x.classList.remove('work-priority-card'));if(!block)return;
 const section=grid.closest('section'),banner=document.createElement('div');banner.className='work-focus';banner.innerHTML=`💼 Estás dentro de <strong>${esc(block.name||'tu horario de trabajo')}</strong>${block.end?` hasta las ${esc(block.end)}`:''}. Primero te muestro lo laboral; lo personal sigue disponible.`;section?.insertBefore(banner,grid);
 const habits=rec('habit');for(const card of grid.querySelectorAll('[data-habit-id]'))if(habits.find(h=>h.id===card.dataset.habitId)?.area==='trabajo')card.classList.add('work-priority-card');
}

function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function installed(){return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;}
function installGuide(){
 if(!isIOS()||installed()||sessionStorage.getItem('habits-install-dismissed')==='1')return;const content=document.querySelector('.content');if(!content||content.querySelector('.install-banner'))return;
 const box=document.createElement('section');box.className='install-banner';box.innerHTML=`<button class="install-close" data-enh-action="dismiss-install" aria-label="Cerrar">×</button><h3>Instalá Habits en tu iPhone</h3><p>Así funciona como una app y puede recibir recordatorios.</p><div class="install-steps"><div class="install-step"><b>①</b>Abrí Habits en <strong>Safari</strong></div><div class="install-step"><b>↗</b>Tocá <strong>Compartir</strong></div><div class="install-step"><b>＋</b>Elegí <strong>Agregar a pantalla de inicio</strong></div></div>`;content.prepend(box);
}
function enrichSettingsInstall(){const help=modal?.querySelector('.install-help:not(.enhanced-install)');if(!help||!isIOS())return;help.classList.add('enhanced-install');help.insertAdjacentHTML('beforeend','<div class="install-steps"><div class="install-step"><b>①</b>Safari</div><div class="install-step"><b>↗</b>Compartir</div><div class="install-step"><b>＋</b>Agregar a inicio</div></div>');}
function decorateHolidayToday(){const h=holidayOn(dayKey());if(!h)return;const hero=document.querySelector('.day-hero');if(!hero||document.querySelector('.holiday-today'))return;const note=document.createElement('p');note.className='holiday-today';note.textContent=`🇵🇾 Hoy es feriado: ${holidayStatusText(h)}`;hero.querySelector('div')?.append(note);}

function run(){queued=false;observer.disconnect();try{installStyles();enhanceHabitEditor();prioritizeWork();installGuide();enrichSettingsInstall();decorateHolidayToday();}finally{observer.takeRecords();observe();}}
const nextFrame=globalThis.requestAnimationFrame?cb=>requestAnimationFrame(cb):cb=>setTimeout(cb,16);
function schedule(){if(queued)return;queued=true;nextFrame(run);}

document.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='new-habit')currentHabitId='';if(action==='edit-habit')currentHabitId=e.target.closest('[data-action]').dataset.id||'';const own=e.target.closest('[data-enh-action]');if(own?.dataset.enhAction==='dismiss-install'){e.preventDefault();sessionStorage.setItem('habits-install-dismissed','1');own.closest('.install-banner')?.remove();}},true);
const observer=new MutationObserver(schedule);function observe(){observer.observe(document.body,{childList:true,subtree:true});}observe();setInterval(schedule,60000);schedule();
