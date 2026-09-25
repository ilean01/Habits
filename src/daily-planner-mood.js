import './daily-planner-mood.css';
import * as db from './store.js';
import {dayKey} from './domain.js';

const moods=[['😔','Difícil'],['😐','Más o menos'],['🙂','Bien'],['😊','Muy bien'],['🤩','Con mucha energía']];
let queued=false;

function moodForDate(date){
 return db.records('journal').find(j=>j.date===date&&!j.achievement&&!j.workoutPhoto&&!j.englishPractice&&Number(j.mood));
}

function moodSection(date){
 const selected=Number(moodForDate(date)?.mood)||0;
 return `<section class="planner-section planner-mood-section" aria-labelledby="planner-mood-title">
  <div class="planner-section-title"><h3 id="planner-mood-title">¿Cómo te sentís hoy?</h3><small>elegí un emoji</small></div>
  <div class="planner-moods" role="radiogroup" aria-label="Cómo te sentís hoy">
   ${moods.map(([emoji,label],i)=>{const value=i+1,chosen=selected===value;return `<button type="button" class="planner-mood ${chosen?'chosen':''}" data-action="mood" data-mood="${value}" role="radio" aria-checked="${chosen}" aria-label="${label}: ${value} de 5"><span aria-hidden="true">${emoji}</span><small>${label}</small></button>`;}).join('')}
  </div>
  <p class="planner-mood-note">Tu respuesta se guarda en el mismo registro de ánimo de Mi día y Mi diario.</p>
 </section>`;
}

function mountMood(){
 const planner=document.querySelector('.daily-planner'),side=planner?.querySelector('.planner-side');
 if(!planner||!side)return;
 const date=planner.dataset.plannerDate||dayKey();
 const existing=side.querySelector('.planner-mood-section');
 const html=moodSection(date);
 if(existing)existing.outerHTML=html;
 else side.querySelector('.planner-habit-section')?.insertAdjacentHTML('afterend',html);
}

const observer=new MutationObserver(()=>{
 if(queued)return;
 queued=true;
 queueMicrotask(()=>{
  queued=false;
  observer.disconnect();
  try{mountMood();}finally{observer.observe(document.body,{childList:true,subtree:true});}
 });
});
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('pageshow',mountMood);
document.addEventListener('habits:rerender',mountMood);
mountMood();
