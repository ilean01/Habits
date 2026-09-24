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
.context-focus{border:1px solid #d9e3eb;background:#f2f6f8;border-radius:11px;padding:12px 15px;margin-bottom:14px;font-size:13px;color:#557080}.context-priority-card{order:-10}.install-banner{border:1px solid #dce3d4;background:#f1f5ed;border-radius:13px;padding:17px;margin-bottom:20px}.install-banner h3{font-family:var(--serif);font-size:20px;margin-bottom:8px}.install-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.install-step{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:11px;text-align:center;font-size:12px}.install-step b{display:block;font-size:22px;margin-bottom:5px}.install-close{float:right;min-width:44px;min-height:44px}.install-help.enhanced-install .install-steps{margin:12px 0}.holiday-today{border-left:3px solid #b79254;padding-left:10px}
.water-progress-detail{overflow:hidden}.water-progress-detail .water-days{display:grid;grid-template-columns:repeat(7,minmax(58px,1fr));gap:12px;align-items:end;margin-top:22px;padding:6px 2px 2px}.water-progress-detail .water-day{display:grid;grid-template-rows:auto 128px auto;justify-items:center;align-items:end;gap:8px;min-width:0;text-align:center}.water-progress-detail .water-day b{font-size:14px;font-weight:650;line-height:1.2;white-space:nowrap;color:var(--text)}.water-progress-detail .water-day small{display:block;line-height:1.2;text-transform:capitalize}.water-column-track{width:36px;height:128px;border-radius:999px;background:color-mix(in srgb,var(--green) 8%,var(--soft));border:1px solid var(--line);padding:4px;display:flex;align-items:flex-end;overflow:hidden}.water-column-fill{display:block;width:100%;height:var(--water-level,3%);min-height:4px;border-radius:999px;background:linear-gradient(180deg,#9bcce5,#73afcf);transition:height .25s ease}.water-day:last-child .water-column-track{outline:2px solid color-mix(in srgb,#73afcf 22%,transparent);outline-offset:2px}
@media(max-width:650px){.install-steps{grid-template-columns:1fr}.install-banner{padding:14px}.water-progress-detail{padding-left:14px;padding-right:14px}.water-progress-detail .water-days{grid-template-columns:repeat(7,minmax(38px,1fr));gap:4px;margin-top:18px}.water-progress-detail .water-day{grid-template-rows:auto 92px auto;gap:6px}.water-column-track{width:28px;height:92px;padding:3px}.water-progress-detail .water-day b{font-size:13px}.water-progress-detail .water-day small{font-size:11px!important}}
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

function enhanceWaterHistory(){
 const wrap=document.querySelector('.water-progress-detail .water-days');if(!wrap)return;const days=[...wrap.querySelectorAll('.water-day')];if(!days.length)return;
 const values=days.map(day=>{const raw=day.querySelector('b')?.textContent||'';const found=raw.replace(',','.').match(/\d+(?:\.\d+)?/);return found?Number(found[0]):0;}),scale=Math.max(2,...values);
 days.forEach((day,i)=>{let track=day.querySelector('.water-column-track');if(!track){track=document.createElement('span');track.className='water-column-track';track.setAttribute('aria-hidden','true');track.innerHTML='<i class="water-column-fill"></i>';const label=day.querySelector('small');if(label)label.before(track);else day.append(track);}const level=values[i]===0?3:Math.max(8,Math.min(100,(values[i]/scale)*100));track.style.setProperty('--water-level',`${level}%`);day.dataset.liters=String(values[i]);const label=day.querySelector('small')?.textContent?.trim()||'día';day.title=`${label}: ${values[i].toLocaleString('es-PY')} L`;});
 wrap.dataset.enhanced='true';
}

function run(){queued=false;observer.disconnect();try{installStyles();prioritizeContext();installGuide();enrichSettingsInstall();decorateHolidayToday();enhanceWaterHistory();}finally{observer.takeRecords();observe();}}
const nextFrame=globalThis.requestAnimationFrame?cb=>requestAnimationFrame(cb):cb=>setTimeout(cb,16);
function schedule(){if(queued)return;queued=true;nextFrame(run);}

document.addEventListener('click',e=>{const own=e.target.closest('[data-enh-action]');if(own?.dataset.enhAction==='dismiss-install'){e.preventDefault();sessionStorage.setItem('habits-install-dismissed','1');own.closest('.install-banner')?.remove();}},true);
const observer=new MutationObserver(schedule);function observe(){observer.observe(document.body,{childList:true,subtree:true});}observe();setInterval(schedule,60000);schedule();
