import './personal-center.css';
import * as db from './store.js';
import {navigateRoute} from './router.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const KIND_LABELS={area:'Área',habit:'Hábito',event:'Evento',task:'Tarea',project:'Proyecto',reading:'Lectura',quote:'Cita',journal:'Diario',word:'Palabra',dailyPlan:'Plan del día',log:'Actividad',eventLog:'Evento',photo:'Foto',meal:'Comida'};
const ACTION_LABELS={created:'Creaste',updated:'Actualizaste',deleted:'Moviste a la papelera',restored:'Restauraste',purged:'Eliminaste definitivamente',undo:'Deshiciste',redo:'Rehiciste'};
let currentTab='notices';

function notices(){return db.records('notice').sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));}
function unreadCount(){return notices().filter(n=>!n.readAt).length;}
function activity(){return db.activity().slice(0,150);}
function trash(){return db.trash();}
function formatDate(value){if(!value)return'';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleString('es-PY',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
function ensureBell(){
 const topbar=document.querySelector('.topbar');if(!topbar)return;
 let button=topbar.querySelector('[data-personal-center-button]');
 if(!button){button=document.createElement('button');button.type='button';button.className='icon-button personal-center-button';button.dataset.personalCenterButton='true';button.dataset.personalAction='open';button.setAttribute('aria-label','Abrir centro de avisos');button.title='Avisos, actividad y papelera';const search=topbar.querySelector('[data-action="search"]');topbar.insertBefore(button,search||topbar.lastElementChild);}
 const count=unreadCount();button.innerHTML=`<span aria-hidden="true">🔔</span>${count?`<span class="personal-badge" aria-label="${count} avisos sin leer">${count>99?'99+':count}</span>`:''}`;
}
function ensureDialog(){let dialog=document.querySelector('#personal-center');if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='personal-center';dialog.className='personal-center';document.body.append(dialog);return dialog;}
function emptyState(title,text){return `<div class="personal-empty"><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;}
function noticeRows(){const rows=notices();if(!rows.length)return emptyState('Todo tranquilo','Cuando Habits te recuerde algo, también quedará acá.');return `<div class="personal-list">${rows.map(n=>`<article class="personal-row notice-row ${n.readAt?'':'is-unread'}"><button type="button" class="personal-row-main" data-personal-action="notice-open" data-id="${esc(n.id)}"><span class="personal-dot" aria-hidden="true"></span><span><strong>${esc(n.title||'Aviso')}</strong><small>${esc(n.body||'')}</small><time>${esc(formatDate(n.at))}</time></span></button>${n.readAt?'':`<button type="button" class="text-button" data-personal-action="notice-read" data-id="${esc(n.id)}">Marcar leído</button>`}</article>`).join('')}</div>`;}
function activityRows(){const rows=activity();if(!rows.length)return emptyState('Todavía no hay actividad','Tus próximos cambios importantes aparecerán en este historial.');return `<div class="personal-list">${rows.map(item=>`<article class="personal-row activity-row"><span class="activity-mark" aria-hidden="true">•</span><span><strong>${esc(ACTION_LABELS[item.action]||'Cambiaste')} ${esc(item.label||KIND_LABELS[item.targetKind]||'un elemento')}</strong><small>${esc(KIND_LABELS[item.targetKind]||'Habits')}</small><time>${esc(formatDate(item.at))}</time></span></article>`).join('')}</div>`;}
function trashRows(){const rows=trash();if(!rows.length)return emptyState('La papelera está vacía','Lo que elimines de Habits aparecerá acá hasta que lo restaures o lo borres definitivamente.');return `<div class="personal-list">${rows.map(r=>`<article class="personal-row trash-item"><span><strong>${esc(r.data?.name||r.data?.title||r.data?.text||KIND_LABELS[r.kind]||'Elemento')}</strong><small>${esc(KIND_LABELS[r.kind]||r.kind)}</small></span><div class="personal-row-actions"><button type="button" class="button outline" data-personal-action="trash-restore" data-id="${esc(r.id)}">Restaurar</button><button type="button" class="text-button danger-text" data-personal-action="trash-purge" data-id="${esc(r.id)}">Eliminar definitivamente</button></div></article>`).join('')}</div>`;}
function renderDialog(){
 const dialog=ensureDialog(),history=db.historyInfo(),unread=unreadCount(),trashCount=trash().length;
 const body=currentTab==='notices'?noticeRows():currentTab==='activity'?activityRows():trashRows();
 dialog.innerHTML=`<div class="personal-center-shell"><header><div><p class="eyebrow">TU ESPACIO</p><h2>Centro personal</h2><p>Avisos, cambios recientes y elementos eliminados.</p></div><button type="button" class="icon-button" data-personal-action="close" aria-label="Cerrar">×</button></header><nav class="personal-tabs" aria-label="Secciones del centro personal"><button type="button" data-personal-action="tab" data-tab="notices" class="${currentTab==='notices'?'active':''}">Avisos${unread?` <span>${unread}</span>`:''}</button><button type="button" data-personal-action="tab" data-tab="activity" class="${currentTab==='activity'?'active':''}">Actividad</button><button type="button" data-personal-action="tab" data-tab="trash" class="${currentTab==='trash'?'active':''}">Papelera${trashCount?` <span>${trashCount}</span>`:''}</button></nav><div class="personal-toolbar">${currentTab==='notices'&&unread?'<button type="button" class="text-button" data-personal-action="notice-read-all">Marcar todo como leído</button>':''}${currentTab==='activity'?`<div class="history-actions"><button type="button" class="button outline" data-personal-action="undo" ${history.undo?'':'disabled'}>↶ Deshacer${history.lastUndo?` · ${esc(history.lastUndo)}`:''}</button><button type="button" class="button outline" data-personal-action="redo" ${history.redo?'':'disabled'}>↷ Rehacer${history.lastRedo?` · ${esc(history.lastRedo)}`:''}</button></div>`:''}${currentTab==='trash'&&trashCount?'<button type="button" class="text-button danger-text" data-personal-action="trash-empty">Vaciar papelera</button>':''}<p class="personal-feedback" aria-live="polite"></p></div><div class="personal-center-body">${body}</div></div>`;
 ensureBell();return dialog;
}
function open(tab=currentTab){currentTab=['notices','activity','trash'].includes(tab)?tab:'notices';const dialog=renderDialog();if(!dialog.open)dialog.showModal();}
function close(){document.querySelector('#personal-center')?.close();}
function feedback(message){const el=document.querySelector('#personal-center .personal-feedback');if(el)el.textContent=message;}
function readNotice(id,openTarget=false){const n=db.records('notice').find(x=>x.id===id);if(!n)return;if(!n.readAt)db.put('notice',{...n,readAt:new Date().toISOString()},id);if(openTarget){close();const target=n.view==='calendar'&&/^\d{4}-\d{2}-\d{2}$/.test(n.date||'')?{view:'calendar',date:n.date}:{view:n.view||'today'};navigateRoute(target);}else renderDialog();}
function safeHistory(action){try{const result=action==='undo'?db.undo():db.redo();feedback(result?(action==='undo'?'Cambio deshecho.':'Cambio rehecho.'):'No hay cambios para '+(action==='undo'?'deshacer.':'rehacer.'));renderDialog();}catch(error){feedback(error.message||'No se pudo completar la acción.');}}

if(typeof document!=='undefined'){
 document.addEventListener('click',event=>{
  const legacyTrash=event.target.closest('[data-action="trash"]');if(legacyTrash){event.preventDefault();event.stopImmediatePropagation();open('trash');return;}
 },true);
 document.addEventListener('click',event=>{
  const control=event.target.closest('[data-personal-action]');if(!control)return;event.preventDefault();const action=control.dataset.personalAction;
  if(action==='open'){open('notices');return;}if(action==='close'){close();return;}if(action==='tab'){currentTab=control.dataset.tab;renderDialog();return;}
  if(action==='notice-open'){readNotice(control.dataset.id,true);return;}if(action==='notice-read'){readNotice(control.dataset.id,false);return;}
  if(action==='notice-read-all'){for(const n of notices().filter(x=>!x.readAt))db.put('notice',{...n,readAt:new Date().toISOString()},n.id);renderDialog();return;}
  if(action==='undo'||action==='redo'){safeHistory(action);return;}
  if(action==='trash-restore'){db.restore(control.dataset.id);feedback('Elemento restaurado.');renderDialog();return;}
  if(action==='trash-purge'){if(confirm('Este elemento ya no se podrá recuperar. ¿Eliminar definitivamente?')){db.purge(control.dataset.id);renderDialog();}return;}
  if(action==='trash-empty'){if(confirm('La papelera se vaciará y estos elementos ya no se podrán recuperar. ¿Continuar?')){const count=db.emptyTrash();renderDialog();feedback(`${count} elemento${count===1?'':'s'} eliminado${count===1?'':'s'} definitivamente.`);}return;}
 });
 document.addEventListener('keydown',event=>{
  const target=event.target,typing=target?.matches?.('input,textarea,select,[contenteditable="true"]');if(typing||!(event.ctrlKey||event.metaKey)||event.altKey)return;
  const key=event.key.toLowerCase();if(key==='z'&&!event.shiftKey){event.preventDefault();safeHistory('undo');}else if((key==='z'&&event.shiftKey)||(key==='y'&&event.ctrlKey)){event.preventDefault();safeHistory('redo');}
 });
 const app=document.querySelector('#app');if(app)new MutationObserver(()=>ensureBell()).observe(app,{childList:true,subtree:true});queueMicrotask(ensureBell);
}
