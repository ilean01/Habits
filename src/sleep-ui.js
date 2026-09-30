import * as db from './store.js';
import {dayKey} from './domain.js';
import {diaryEntries} from './selectors.js';
import {normalizeSleep,sleepLabel,sleepStars} from './sleep-rating.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const diaryFor=date=>diaryEntries(db.records('journal')).filter(row=>row.date===date).sort((a,b)=>String(a.at||'').localeCompare(String(b.at||''))).at(-1)||null;
const sleepFor=date=>normalizeSleep(diaryFor(date)?.sleep);

function ensureStyles(){
 if(document.querySelector('#sleep-ui-styles'))return;
 const style=document.createElement('style');style.id='sleep-ui-styles';style.textContent=`
 .sleep-checkin{margin-top:18px;padding-top:16px;border-top:1px solid var(--line,#e7e4dc)}
 .sleep-checkin h4{margin:0 0 4px;font-size:1rem;color:var(--text,#344237)}.sleep-checkin p{margin:0 0 10px;color:var(--muted,#7c827a);font-size:.9rem}
 .sleep-stars{display:flex;align-items:center;gap:4px;flex-wrap:wrap}.sleep-star{appearance:none;border:0;background:transparent;padding:4px;min-width:36px;min-height:36px;border-radius:10px;font-size:1.7rem;line-height:1;color:#c8c8bf;cursor:pointer;transition:.15s}
 .sleep-star:hover,.sleep-star:focus-visible{transform:translateY(-1px);background:rgba(115,141,112,.09);outline:2px solid rgba(115,141,112,.28);outline-offset:1px}.sleep-star.chosen,.sleep-star.filled{color:#c69b43}
 .sleep-rating-caption{display:block;margin-top:7px;color:var(--muted,#7c827a);font-size:.85rem}.sleep-rating-field{border:0;padding:0;margin:8px 0 18px}.sleep-rating-field legend{font-weight:600;margin-bottom:7px}.journal-sleep{display:block;margin-top:8px;color:#9a7435;font-size:.9rem;font-weight:600}.day-detail-sleep-stars{font-size:1rem;letter-spacing:.05em;color:#c69b43;white-space:nowrap}.calendar-signal.sleep{color:#a27a2c}.calendar-signal.sleep>span{font-weight:700}
 .planner-mode-switch.planner-mode-switch-compact{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:-8px 0 14px;padding:0;border:0;background:transparent;border-radius:0}.planner-mode-switch.planner-mode-switch-compact>span{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
 .planner-mode-switch.planner-mode-switch-compact .segmented{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--line);border-radius:10px;background:var(--soft)}.planner-mode-switch.planner-mode-switch-compact button{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:7px 11px;border-radius:7px;font-size:12px;font-weight:600;color:var(--muted);background:transparent}.planner-mode-switch.planner-mode-switch-compact button[data-mode="dashboard"]::before{content:'▦';font-size:14px}.planner-mode-switch.planner-mode-switch-compact button[data-mode="planner"]::before{content:'☷';font-size:15px}.planner-mode-switch.planner-mode-switch-compact button.active{background:var(--panel);color:var(--green);box-shadow:0 1px 4px #00000010}
 .nutrition-day-summary[hidden]{display:none!important}.dashboard-grid+.nutrition-day-summary{margin-top:22px;margin-bottom:8px}
 @media(max-width:650px){.sleep-star{min-width:44px;min-height:44px}.planner-mode-switch.planner-mode-switch-compact{justify-content:space-between;margin-top:-10px}.planner-mode-switch.planner-mode-switch-compact button{min-height:44px;padding-inline:12px}}
 `;document.head.append(style);
}

function starsHtml(value,date=dayKey()){
 const current=normalizeSleep(value);
 return `<div class="sleep-stars" role="radiogroup" aria-label="Calidad del sueño">${[1,2,3,4,5].map(n=>`<button type="button" class="sleep-star ${n<=current?'filled':''} ${n===current?'chosen':''}" data-sleep-rating="${n}" data-sleep-date="${esc(date)}" role="radio" aria-checked="${n===current}" aria-label="${esc(sleepLabel(n))}: ${n} de 5 estrellas">★</button>`).join('')}</div>`;
}

function renderDashboard(){
 const card=document.querySelector('.reflection-card');if(!card||card.querySelector('[data-sleep-checkin]'))return;
 const date=dayKey(),value=sleepFor(date),wrap=document.createElement('div');wrap.className='sleep-checkin';wrap.dataset.sleepCheckin='';
 wrap.innerHTML=`<h4>¿Cómo dormiste?</h4><p>Marcá cómo sentiste tu descanso de anoche.</p>${starsHtml(value,date)}<small class="sleep-rating-caption">${value?`${sleepStars(value)} · ${sleepLabel(value)}`:'Tocá de 1 a 5 estrellas'}</small>`;card.append(wrap);
}

function polishTodayLayout(){
 const switcher=document.querySelector('.planner-mode-switch');
 if(switcher){switcher.classList.add('planner-mode-switch-compact');const label=switcher.querySelector(':scope > span');if(label)label.textContent='Vista';switcher.querySelector('[data-mode="dashboard"]')?.setAttribute('aria-label','Ver Dashboard');switcher.querySelector('[data-mode="planner"]')?.setAttribute('aria-label','Ver Agenda del día');}
 const summary=document.querySelector('.nutrition-day-summary'),plannerView=document.querySelector('.daily-planner'),dashboardGrid=document.querySelector('.dashboard-grid');
 if(summary){summary.hidden=!!plannerView;if(!plannerView&&dashboardGrid&&summary.previousElementSibling!==dashboardGrid)dashboardGrid.after(summary);}
}

function renderCalendar(){
 document.querySelectorAll('.calendar-cell[data-date]').forEach(cell=>{const date=cell.dataset.date,value=sleepFor(date);cell.querySelector('[data-sleep-calendar]')?.remove();if(!value)return;let indicators=cell.querySelector('.calendar-indicators');if(!indicators){indicators=document.createElement('div');indicators.className='calendar-indicators';cell.append(indicators);}const item=document.createElement('span');item.className='calendar-signal sleep';item.dataset.sleepCalendar='';item.title=`Sueño: ${sleepLabel(value)} (${value}/5)`;item.setAttribute('aria-label',`Sueño: ${sleepLabel(value)}, ${value} de 5 estrellas`);item.innerHTML=`★<span>${value}</span>`;indicators.prepend(item);});
}
function renderDayDetail(){const detail=document.querySelector('[data-day-detail]');if(!detail)return;const date=detail.dataset.dayDetail,value=sleepFor(date),glance=detail.querySelector('.day-detail-glance');if(!glance||glance.querySelector('[data-sleep-detail]'))return;const item=document.createElement('div');item.dataset.sleepDetail='';item.innerHTML=`<strong class="day-detail-sleep-stars">${sleepStars(value)}</strong><span>${value?`sueño · ${esc(sleepLabel(value))}`:'sueño sin registrar'}</span>`;glance.children[0]?.after(item);}
function renderJournal(){const entries=diaryEntries(db.records('journal')).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));document.querySelectorAll('.journal-card').forEach((card,index)=>{card.querySelector('[data-journal-sleep]')?.remove();const value=normalizeSleep(entries[index]?.sleep);if(!value)return;const row=document.createElement('span');row.className='journal-sleep';row.dataset.journalSleep='';row.textContent=`${sleepStars(value)} · ${sleepLabel(value)}`;card.querySelector('h3')?.after(row);});}
function injectJournalEditor(){const modal=document.querySelector('#modal'),form=modal?.querySelector('form');if(!form||!form.querySelector('select[name="mood"]')||form.querySelector('[data-sleep-editor]'))return;const date=form.querySelector('[name="date"]')?.value||dayKey(),value=sleepFor(date),field=document.createElement('fieldset');field.className='sleep-rating-field';field.dataset.sleepEditor='';field.innerHTML=`<legend>¿Cómo dormiste?</legend>${starsHtml(value,date).replaceAll('data-sleep-rating','data-sleep-editor-rating')}<small class="sleep-rating-caption">${value?`${sleepStars(value)} · ${sleepLabel(value)}`:'Opcional · 1 estrella es muy mal, 5 es excelente'}</small><input type="hidden" name="sleep" value="${value||''}">`;form.querySelector('label:has(select[name="mood"])')?.after(field);}
function refresh(){ensureStyles();polishTodayLayout();renderDashboard();renderCalendar();renderDayDetail();renderJournal();injectJournalEditor();}
function saveSleep(date,rating){const existing=diaryFor(date),value=normalizeSleep(rating);if(!value)return;const {id,...rest}=existing||{};db.put('journal',{...rest,date,sleep:value,at:existing?.at||new Date().toISOString()},id||undefined);}

if(typeof document!=='undefined'){
 document.addEventListener('click',event=>{const quick=event.target.closest('[data-sleep-rating]');if(quick){event.preventDefault();saveSleep(quick.dataset.sleepDate||dayKey(),quick.dataset.sleepRating);return;}const editor=event.target.closest('[data-sleep-editor-rating]');if(editor){event.preventDefault();const field=editor.closest('[data-sleep-editor]'),value=normalizeSleep(editor.dataset.sleepEditorRating),hidden=field?.querySelector('[name="sleep"]');if(hidden)hidden.value=String(value);field?.querySelectorAll('[data-sleep-editor-rating]').forEach(button=>{const n=Number(button.dataset.sleepEditorRating);button.classList.toggle('filled',n<=value);button.classList.toggle('chosen',n===value);button.setAttribute('aria-checked',String(n===value));});const caption=field?.querySelector('.sleep-rating-caption');if(caption)caption.textContent=`${sleepStars(value)} · ${sleepLabel(value)}`;}});
 document.addEventListener('habits:rerender',()=>queueMicrotask(refresh));const modal=document.querySelector('#modal');if(modal)new MutationObserver(()=>injectJournalEditor()).observe(modal,{childList:true,subtree:true});queueMicrotask(refresh);
}
