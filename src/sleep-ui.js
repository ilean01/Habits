import './sleep-rating.css';
import * as db from './store.js';
import {dayKey} from './domain.js';
import {diaryEntries} from './selectors.js';
import {normalizeSleep,sleepLabel,sleepStars} from './sleep-rating.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const diaryFor=date=>diaryEntries(db.records('journal')).filter(row=>row.date===date).sort((a,b)=>String(a.at||'').localeCompare(String(b.at||''))).at(-1)||null;
const sleepFor=date=>normalizeSleep(diaryFor(date)?.sleep);

function starsHtml(value,date=dayKey()){
 const current=normalizeSleep(value);
 return `<div class="sleep-stars" role="radiogroup" aria-label="Calidad del sueño">${[1,2,3,4,5].map(n=>`<button type="button" class="sleep-star ${n<=current?'filled':''} ${n===current?'chosen':''}" data-sleep-rating="${n}" data-sleep-date="${esc(date)}" role="radio" aria-checked="${n===current}" aria-label="${esc(sleepLabel(n))}: ${n} de 5 estrellas">★</button>`).join('')}</div>`;
}

function renderDashboard(){
 const card=document.querySelector('.reflection-card');if(!card||card.querySelector('[data-sleep-checkin]'))return;
 const date=dayKey(),value=sleepFor(date),wrap=document.createElement('div');wrap.className='sleep-checkin';wrap.dataset.sleepCheckin='';
 wrap.innerHTML=`<h4>¿Cómo dormiste?</h4><p>Marcá cómo sentiste tu descanso de anoche.</p>${starsHtml(value,date)}<small class="sleep-rating-caption">${value?`${sleepStars(value)} · ${sleepLabel(value)}`:'Tocá de 1 a 5 estrellas'}</small>`;
 card.append(wrap);
}

function renderCalendar(){
 document.querySelectorAll('.calendar-cell[data-date]').forEach(cell=>{
  const date=cell.dataset.date,value=sleepFor(date);cell.querySelector('[data-sleep-calendar]')?.remove();if(!value)return;
  let indicators=cell.querySelector('.calendar-indicators');if(!indicators){indicators=document.createElement('div');indicators.className='calendar-indicators';cell.append(indicators);}
  const item=document.createElement('span');item.className='calendar-signal sleep';item.dataset.sleepCalendar='';item.title=`Sueño: ${sleepLabel(value)} (${value}/5)`;item.setAttribute('aria-label',`Sueño: ${sleepLabel(value)}, ${value} de 5 estrellas`);item.innerHTML=`★<span>${value}</span>`;indicators.prepend(item);
 });
}

function renderDayDetail(){
 const detail=document.querySelector('[data-day-detail]');if(!detail)return;const date=detail.dataset.dayDetail,value=sleepFor(date),glance=detail.querySelector('.day-detail-glance');if(!glance||glance.querySelector('[data-sleep-detail]'))return;
 const item=document.createElement('div');item.dataset.sleepDetail='';item.innerHTML=`<strong class="day-detail-sleep-stars">${sleepStars(value)}</strong><span>${value?`sueño · ${esc(sleepLabel(value))}`:'sueño sin registrar'}</span>`;glance.children[0]?.after(item);
}

function renderJournal(){
 const entries=diaryEntries(db.records('journal')).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 document.querySelectorAll('.journal-card').forEach((card,index)=>{card.querySelector('[data-journal-sleep]')?.remove();const value=normalizeSleep(entries[index]?.sleep);if(!value)return;const row=document.createElement('span');row.className='journal-sleep';row.dataset.journalSleep='';row.textContent=`${sleepStars(value)} · ${sleepLabel(value)}`;card.querySelector('h3')?.after(row);});
}

function injectJournalEditor(){
 const modal=document.querySelector('#modal'),form=modal?.querySelector('form');if(!form||!form.querySelector('select[name="mood"]')||form.querySelector('[data-sleep-editor]'))return;
 const date=form.querySelector('[name="date"]')?.value||dayKey(),value=sleepFor(date),field=document.createElement('fieldset');field.className='sleep-rating-field';field.dataset.sleepEditor='';
 field.innerHTML=`<legend>¿Cómo dormiste?</legend>${starsHtml(value,date).replaceAll('data-sleep-rating','data-sleep-editor-rating')}<small class="sleep-rating-caption">${value?`${sleepStars(value)} · ${sleepLabel(value)}`:'Opcional · 1 estrella es muy mal, 5 es excelente'}</small><input type="hidden" name="sleep" value="${value||''}">`;
 form.querySelector('label:has(select[name="mood"])')?.after(field);
}

function refresh(){renderDashboard();renderCalendar();renderDayDetail();renderJournal();injectJournalEditor();}

function saveSleep(date,rating){
 const existing=diaryFor(date),value=normalizeSleep(rating);if(!value)return;const {id,...rest}=existing||{};db.put('journal',{...rest,date,sleep:value,at:existing?.at||new Date().toISOString()},id||undefined);
}

document.addEventListener('click',event=>{
 const quick=event.target.closest('[data-sleep-rating]');if(quick){event.preventDefault();saveSleep(quick.dataset.sleepDate||dayKey(),quick.dataset.sleepRating);return;}
 const editor=event.target.closest('[data-sleep-editor-rating]');if(editor){event.preventDefault();const field=editor.closest('[data-sleep-editor]'),value=normalizeSleep(editor.dataset.sleepEditorRating);field?.querySelector('[name="sleep"]')?.setAttribute('value',String(value));field?.querySelectorAll('[data-sleep-editor-rating]').forEach(button=>{const n=Number(button.dataset.sleepEditorRating);button.classList.toggle('filled',n<=value);button.classList.toggle('chosen',n===value);button.setAttribute('aria-checked',String(n===value));});const caption=field?.querySelector('.sleep-rating-caption');if(caption)caption.textContent=`${sleepStars(value)} · ${sleepLabel(value)}`;}
});

document.addEventListener('habits:rerender',()=>queueMicrotask(refresh));
const modal=document.querySelector('#modal');if(modal)new MutationObserver(()=>injectJournalEditor()).observe(modal,{childList:true,subtree:true});
queueMicrotask(refresh);
