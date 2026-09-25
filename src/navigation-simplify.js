import {planningView} from './planning.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(text,action,extra='',cls='button')=>`<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
let queued=false;

function renameMoreNavigation(){
 document.querySelectorAll('[data-action="nav"][data-view="space"]').forEach(button=>{
  const label=[...button.querySelectorAll('span')].find(span=>span.textContent.trim()==='Más');
  if(label)label.textContent='Tareas';
  button.setAttribute('aria-label','Tareas');
 });
 const breadcrumb=document.querySelector('.breadcrumb strong');
 if(breadcrumb?.textContent.trim()==='Más')breadcrumb.textContent='Tareas';
}

function simplifyTasksScreen(){
 const tabs=document.querySelector('.space-tabs');
 if(!tabs)return;
 const heading=document.querySelector('.content .page-heading');
 const title=heading?.querySelector('h1');
 const subtitle=heading?.querySelector('.muted');
 if(title?.textContent.trim()==='Más')title.textContent='Tareas';
 if(subtitle)subtitle.textContent='Pendientes, para después y proyectos personales, sin mezclar tus áreas.';
 heading?.querySelector('.eyebrow')?.replaceChildren(document.createTextNode('ORGANIZÁ LO QUE TENÉS QUE HACER'));
 document.querySelector('.mobile-more-shortcuts')?.remove();
 const planningTab=tabs.querySelector('[data-action="space-tab"][data-tab="planning"]');
 if(planningTab?.classList.contains('selected')){
  tabs.querySelector('[data-action="space-tab"][data-tab="tareas"]')?.click();
  return;
 }
 planningTab?.remove();
}

function selectedArea(){
 return document.querySelector('.area-filters [data-action="area"].selected')?.dataset.id||'';
}

function mountAreaPlanning(){
 const areaId=selectedArea();
 const content=document.querySelector('.content');
 const existing=content?.querySelector('.area-domain-planning');
 if(!['facultad','trabajo','ingles'].includes(areaId)){
  existing?.remove();
  return;
 }
 if(existing?.dataset.area===areaId)return;
 existing?.remove();
 const tools=content?.querySelector('.area-tools');
 if(!tools)return;
 const wrap=document.createElement('div');
 wrap.className='area-domain-planning';
 wrap.dataset.area=areaId;
 wrap.innerHTML=planningView({esc,btn,area:areaId});
 tools.insertAdjacentElement('afterend',wrap);
}

function addCalendarWeekAction(){
 const heading=document.querySelector('.content .page-heading');
 if(heading?.querySelector('h1')?.textContent.trim()!=='Tu calendario')return;
 const actions=heading.querySelector('.heading-actions');
 if(!actions||actions.querySelector('[data-action="plan-week"]'))return;
 actions.insertAdjacentHTML('afterbegin',btn('Organizar semana','plan-week','','button outline'));
}

function apply(){
 renameMoreNavigation();
 simplifyTasksScreen();
 mountAreaPlanning();
 addCalendarWeekAction();
}

const observer=new MutationObserver(()=>{
 if(queued)return;
 queued=true;
 queueMicrotask(()=>{
  queued=false;
  observer.disconnect();
  try{apply();}finally{observer.observe(document.body,{childList:true,subtree:true});}
 });
});

observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('pageshow',apply);
document.addEventListener('habits:rerender',apply);
apply();
