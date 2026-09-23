import './dark-theme.css';
import * as db from './store.js';
import {dayKey} from './domain.js';
import {holidayOn,holidayStatusText} from './paraguay-holidays.js';
import {activeWorkBlock} from './work-context.js';
import {priorityAreaForDayMode} from './selectors.js';

const modal=document.querySelector('#modal');
let queued=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rec=k=>db.records(k);

function installStyles(){
 if(document.querySelector('#habits-enhancement-styles'))return;
 const style=document.createElement('style');style.id='habits-enhancement-styles';style.textContent=`
.context-focus{border:1px solid #d9e3eb;background:#f2f6f8;border-radius:11px;padding:12px 15px;margin-bottom:14px;font-size:13px;color:#557080}.context-priority-card{order:-10}.install-banner{border:1px solid #dce3d4;background:#f1f5ed;border-radius:13px;padding:17px;margin-bottom:20px}.install-banner h3{font-family:var(--serif);font-size:20px;margin-bottom:8px}.install-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.install-step{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:11px;text-align:center;font-size:12px}.install-step b{display:block;font-size:22px;margin-bottom:5px}.install-close{float:right;min-width:44px;min-height:44px}.install-help.enhanced-install .install-steps{margin:12px 0}.holiday-today{border-left:3px solid #b79254;padding-left:10px}@media(max-width:650px){.install-steps{grid-template-columns:1fr}.install-banner{padding:14px}}
 `;document.head.append(style);
}

function prioritizeContext(){
 const grid=document.querySelector('.dashboard-grid .habit-grid');if(!grid)return;const now=new Date(),date=dayKey(now),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,workBlock=activeWorkBlock(rec('event'),date,time),dayMode=document.querySelector('#day-mode')?.value||'habitual';
 document.querySelector('.context-focus')?.remove();grid.querySelectorAll('.context-priority-card').forEach(x=>x.classList.remove('context-priority-card'));
 const priorityArea=workBlock?'trabajo':priorityAreaForDayMode(dayMode);if(!priorityArea)return;
 const labels={trabajo:'lo laboral',facultad:'Facultad'},section=grid.closest('section');
 if(workBlock){const banner=document.createElement('div');banner.className='context-focus';banner.innerHTML=`💼 Estás dentro de <strong>${esc(workBlock.name||'tu horario de trabajo')}</strong>${workBlock.end?` hasta las ${esc(workBlock.end)}`:''}. Primero te muestro ${labels[priorityArea]}; lo demás sigue disponible.`;section?.insertBefore(banner,grid);}
 const habits=rec('habit');for(const card of grid.querySelectorAll('[data-habit-id]'))if(habits.find(h=>h.id===card.dataset.habitId)?.area===priorityArea)card.classList.add('context-priority-card');
}

function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function installed(){return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;}
function installGuide(){
 if(!isIOS()||installed()||sessionStorage.getItem('habits-install-dismissed')==='1')return;const content=document.querySelector('.content');if(!content||content.querySelector('.install-banner'))return;
 const box=document.createElement('section');box.className='install-banner';box.innerHTML=`<button class="install-close" data-enh-action="dismiss-install" aria-label="Cerrar">×</button><h3>Instalá Habits en tu iPhone</h3><p>Así funciona como una app y puede recibir recordatorios.</p><div class="install-steps"><div class="install-step"><b>①</b>Abrí Habits en <strong>Safari</strong></div><div class="install-step"><b>↗</b>Tocá <strong>Compartir</strong></div><div class="install-step"><b>＋</b>Elegí <strong>Agregar a pantalla de inicio</strong></div></div>`;content.prepend(box);
}
function enrichSettingsInstall(){const help=modal?.querySelector('.install-help:not(.enhanced-install)');if(!help||!isIOS())return;help.classList.add('enhanced-install');help.insertAdjacentHTML('beforeend','<div class="install-steps"><div class="install-step"><b>①</b>Safari</div><div class="install-step"><b>↗</b>Compartir</div><div class="install-step"><b>＋</b>Agregar a inicio</div></div>');}
function decorateHolidayToday(){const h=holidayOn(dayKey());if(!h)return;const hero=document.querySelector('.day-hero');if(!hero||document.querySelector('.holiday-today'))return;const note=document.createElement('p');note.className='holiday-today';note.textContent=`🇵🇾 Hoy es feriado: ${holidayStatusText(h)}`;hero.querySelector('div')?.append(note);}

function run(){queued=false;observer.disconnect();try{installStyles();prioritizeContext();installGuide();enrichSettingsInstall();decorateHolidayToday();}finally{observer.takeRecords();observe();}}
const nextFrame=globalThis.requestAnimationFrame?cb=>requestAnimationFrame(cb):cb=>setTimeout(cb,16);
function schedule(){if(queued)return;queued=true;nextFrame(run);}

document.addEventListener('click',e=>{const own=e.target.closest('[data-enh-action]');if(own?.dataset.enhAction==='dismiss-install'){e.preventDefault();sessionStorage.setItem('habits-install-dismissed','1');own.closest('.install-banner')?.remove();}},true);
const observer=new MutationObserver(schedule);function observe(){observer.observe(document.body,{childList:true,subtree:true});}observe();setInterval(schedule,60000);schedule();
