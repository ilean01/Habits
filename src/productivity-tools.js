import './productivity-tools.css';
import * as db from './store.js';
import {dayKey,scheduled,occurs} from './domain.js';
import {isDiaryEntry} from './selectors.js';
import {navigateRoute} from './router.js';
import {SEARCH_KIND_OPTIONS,searchLocalSpace,searchLibraryCatalog,sortSearchResults} from './global-search.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const SEARCH_KEY='habits-advanced-search-v1';
const FOCUS_PREFIX='habits-focus-v1:';
let searchTimer=0,searchSequence=0,focusTick=0;

const appModal=()=>document.querySelector('#modal');
const ownerKey=()=>FOCUS_PREFIX+(db.currentOwner?.()||'local');
const typeLabel=kind=>Object.fromEntries(SEARCH_KIND_OPTIONS)[kind]||kind;

function readSearchPrefs(){try{return {...{query:'',kind:'',status:'',dateFrom:'',dateTo:'',sort:'relevance'},...JSON.parse(sessionStorage.getItem(SEARCH_KEY)||'{}')};}catch{return {query:'',kind:'',status:'',dateFrom:'',dateTo:'',sort:'relevance'};}}
function saveSearchPrefs(value){try{sessionStorage.setItem(SEARCH_KEY,JSON.stringify(value));}catch{}}
function modalOpen(title,body){const modal=appModal();if(!modal)return null;modal.dataset.dirty='false';modal.innerHTML=`<div class="modal-heading"><h2>${esc(title)}</h2><button type="button" class="icon-button" data-action="close" aria-label="Cerrar">×</button></div>${body}`;if(!modal.open)modal.showModal();return modal;}

function filterValues(root){return {query:root.querySelector('#advanced-search')?.value.trim()||'',kind:root.querySelector('[name="search-kind"]')?.value||'',status:root.querySelector('[name="search-status"]')?.value||'',dateFrom:root.querySelector('[name="search-from"]')?.value||'',dateTo:root.querySelector('[name="search-to"]')?.value||'',sort:root.querySelector('[name="search-sort"]')?.value||'relevance'};}
function searchMeta(row){const bits=[row.label];if(row.date)bits.push(row.date);if(row.state==='completed')bits.push('Completada');if(row.state==='pending')bits.push('Pendiente');if(row.state==='scheduled')bits.push('Programada');if(row.subtitle)bits.push(row.subtitle);return bits.filter(Boolean).join(' · ');}
function renderSearchRows(root,rows,{loading=false}={}){
 const out=root.querySelector('#advanced-search-results'),meta=root.querySelector('#advanced-search-meta');if(!out||!meta)return;
 meta.textContent=loading?`${rows.length} coincidencia${rows.length===1?'':'s'} · buscando también en Biblioteca…`:`${rows.length} coincidencia${rows.length===1?'':'s'}`;
 out.innerHTML=rows.length?rows.map((row,index)=>`<button type="button" class="search-result advanced-search-result" data-action="${row.kind==='library-book'?'library-book':'search-result'}" data-kind="${esc(row.kind)}" data-id="${esc(row.id)}" data-search-index="${index}"><strong>${esc(row.title)}</strong><small>${esc(searchMeta(row))}</small></button>`).join(''):(loading?'<p class="muted">Buscando también en Biblioteca…</p>':'<div class="personal-empty"><strong>No encontramos coincidencias</strong><p>Probá otra palabra o quitá algún filtro.</p></div>');
}
async function runAdvancedSearch(root){
 const prefs=filterValues(root);saveSearchPrefs(prefs);const token=++searchSequence;clearTimeout(searchTimer);
 const filters={kinds:prefs.kind?[prefs.kind]:[],status:prefs.status,dateFrom:prefs.dateFrom,dateTo:prefs.dateTo,sort:prefs.sort};
 const local=searchLocalSpace(prefs.query,{records:db.records,isDiaryEntry,limit:80,filters});
 const bookEligible=(!prefs.kind||prefs.kind==='library-book')&&!prefs.status&&!prefs.dateFrom&&!prefs.dateTo&&prefs.query.length>=2;
 renderSearchRows(root,local,{loading:bookEligible});
 if(!bookEligible)return;
 searchTimer=setTimeout(async()=>{const books=await searchLibraryCatalog(prefs.query,{limit:30});if(token!==searchSequence||!root.isConnected)return;renderSearchRows(root,sortSearchResults([...local,...books],prefs.sort));},160);
}
export function openAdvancedSearch(){
 const prefs=readSearchPrefs(),kindOptions=SEARCH_KIND_OPTIONS.map(([value,label])=>`<option value="${esc(value)}" ${prefs.kind===value?'selected':''}>${esc(label)}</option>`).join('');
 const modal=modalOpen('Búsqueda global',`<section class="advanced-search" data-advanced-search-root><label class="advanced-search-box"><span>Buscar en todo Habits</span><input id="advanced-search" type="search" value="${esc(prefs.query)}" placeholder="Tarea, hábito, evento, libro, diario…" autofocus autocomplete="off"></label><details class="advanced-search-filters" ${prefs.kind||prefs.status||prefs.dateFrom||prefs.dateTo?'open':''}><summary>Filtros avanzados</summary><div class="advanced-filter-grid"><label>Tipo<select name="search-kind">${kindOptions}</select></label><label>Estado<select name="search-status"><option value="">Todos</option><option value="pending" ${prefs.status==='pending'?'selected':''}>Pendiente</option><option value="scheduled" ${prefs.status==='scheduled'?'selected':''}>Programado</option><option value="completed" ${prefs.status==='completed'?'selected':''}>Completado</option></select></label><label>Desde<input name="search-from" type="date" value="${esc(prefs.dateFrom)}"></label><label>Hasta<input name="search-to" type="date" value="${esc(prefs.dateTo)}"></label><label>Orden<select name="search-sort"><option value="relevance" ${prefs.sort==='relevance'?'selected':''}>Relevancia</option><option value="recent" ${prefs.sort==='recent'?'selected':''}>Más reciente</option><option value="upcoming" ${prefs.sort==='upcoming'?'selected':''}>Próxima fecha</option><option value="az" ${prefs.sort==='az'?'selected':''}>A–Z</option></select></label></div><button type="button" class="text-button" data-productivity-action="search-reset">Limpiar filtros</button></details><div class="advanced-search-summary"><span id="advanced-search-meta">0 coincidencias</span><small>↵ abre · ↓ recorre resultados</small></div><div id="advanced-search-results"></div></section>`);
 const root=modal?.querySelector('[data-advanced-search-root]');if(!root)return;
 const query=root.querySelector('#advanced-search');query.addEventListener('input',()=>void runAdvancedSearch(root));root.querySelectorAll('select,input[type="date"]').forEach(el=>el.addEventListener('change',()=>void runAdvancedSearch(root)));
 query.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();root.querySelector('[data-search-index="0"]')?.focus();}if(event.key==='Enter'){const first=root.querySelector('[data-search-index="0"]');if(first){event.preventDefault();first.click();}}});
 root.addEventListener('keydown',event=>{const current=event.target.closest?.('[data-search-index]');if(!current||!['ArrowDown','ArrowUp'].includes(event.key))return;event.preventDefault();const list=[...root.querySelectorAll('[data-search-index]')],index=list.indexOf(current),next=event.key==='ArrowDown'?Math.min(list.length-1,index+1):Math.max(0,index-1);list[next]?.focus();});
 void runAdvancedSearch(root);query.focus();
}

export function openQuickAdd(){
 modalOpen('Registro rápido',`<section class="quick-add" data-quick-add-root><p class="muted">Agregá o registrá algo desde cualquier pantalla.</p><div class="quick-add-grid"><button class="create-option" data-action="new-task"><span aria-hidden="true">✓</span><div><strong>Tarea</strong><small>Un pendiente para resolver</small></div></button><button class="create-option" data-action="new-event"><span aria-hidden="true">▣</span><div><strong>Evento</strong><small>Un plan con fecha</small></div></button><button class="create-option" data-action="new-habit"><span aria-hidden="true">☀</span><div><strong>Hábito</strong><small>Algo que querés repetir</small></div></button><button class="create-option" data-action="journal"><span aria-hidden="true">✎</span><div><strong>Diario</strong><small>Guardar cómo estuvo tu día</small></div></button><button class="create-option" data-action="achievement"><span aria-hidden="true">✦</span><div><strong>Logro</strong><small>Algo que también cuenta</small></div></button><button class="create-option" data-action="water-add" data-ml="250"><span aria-hidden="true">💧</span><div><strong>Agua · 0,25 L</strong><small>Registrar en un toque</small></div></button><button class="create-option" data-action="water-custom"><span aria-hidden="true">＋</span><div><strong>Otra cantidad de agua</strong><small>Elegir cuántos litros</small></div></button><button class="create-option" data-action="food-photo"><span aria-hidden="true">📷</span><div><strong>Comida</strong><small>Analizar una foto</small></div></button><button class="create-option" data-action="manual-reading"><span aria-hidden="true">📖</span><div><strong>Lectura</strong><small>Registrar minutos</small></div></button><button class="create-option" data-action="new-project"><span aria-hidden="true">⚑</span><div><strong>Proyecto</strong><small>Algo grande, paso a paso</small></div></button><button class="create-option" data-action="new-word"><span aria-hidden="true">A</span><div><strong>Palabra en inglés</strong><small>Guardar vocabulario</small></div></button><button class="create-option" data-action="new-quote"><span aria-hidden="true">“</span><div><strong>Cita</strong><small>Una frase para recordar</small></div></button><button class="create-option" data-action="library"><span aria-hidden="true">▤</span><div><strong>Biblioteca</strong><small>Abrir catálogo y libros</small></div></button></div><p class="quick-add-hint"><kbd>Ctrl/Cmd</kbd> + <kbd>Enter</kbd> abre este menú desde cualquier lugar.</p></section>`);
}

function loadFocus(){
 try{const state=JSON.parse(localStorage.getItem(ownerKey())||'null');if(!state||state.version!==1)return null;if(state.running&&focusRemaining(state)<=0){state.elapsedMs=state.durationMin*60000;state.running=false;state.startedAt=0;saveFocus(state);}return state;}catch{return null;}
}
function saveFocus(state){try{localStorage.setItem(ownerKey(),JSON.stringify(state));}catch{}ensureControls();}
function clearFocus(){try{localStorage.removeItem(ownerKey());}catch{}ensureControls();}
function focusElapsed(state){return Math.max(0,Number(state.elapsedMs)||0)+(state.running&&state.startedAt?Math.max(0,Date.now()-Number(state.startedAt)):0);}
function focusRemaining(state){return Math.max(0,Number(state.durationMin||25)*60000-focusElapsed(state));}
function fmtMs(ms){const total=Math.ceil(Math.max(0,ms)/1000),minutes=Math.floor(total/60),seconds=total%60;return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;}
function focusTargets(){
 const today=dayKey(),logs=db.records('log'),eventLogs=db.records('eventLog'),rows=[];
 for(const task of db.records('task').filter(t=>!t.done))rows.push({kind:'task',id:task.id,label:task.name||'Tarea',detail:[task.due?`vence ${task.due}`:'sin fecha',task.priority==='alta'?'prioridad alta':''].filter(Boolean).join(' · '),date:today,rank:task.priority==='alta'?0:1});
 for(const event of db.records('event').filter(e=>occurs(e,today)&&!eventLogs.some(l=>l.eventId===e.id&&l.date===today)))rows.push({kind:'event',id:event.id,label:event.name||'Evento',detail:[event.time||'Todo el día'].filter(Boolean).join(' · '),date:today,rank:2});
 for(const habit of db.records('habit').filter(h=>scheduled(h,today)&&!h.archived&&!h.hydration&&!logs.some(l=>l.habitId===h.id&&l.date===today&&l.status==='done')))rows.push({kind:'habit',id:habit.id,label:habit.name||'Hábito',detail:'Hábito de hoy',date:today,rank:3});
 for(const project of db.records('project').filter(p=>p.category!=='subject'))rows.push({kind:'project',id:project.id,label:project.name||'Proyecto',detail:'Proyecto',date:today,rank:4});
 return rows.sort((a,b)=>a.rank-b.rank||String(a.label).localeCompare(String(b.label),'es',{sensitivity:'base'})).slice(0,50);
}
function focusDialog(){let dialog=document.querySelector('#focus-mode-dialog');if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='focus-mode-dialog';dialog.className='focus-mode-dialog';dialog.addEventListener('close',()=>document.documentElement.classList.remove('focus-immersive'));document.body.append(dialog);return dialog;}
function renderFocusPicker(dialog){
 const targets=focusTargets();dialog.innerHTML=`<div class="focus-shell"><header><div><p class="eyebrow">MODO CONCENTRACIÓN</p><h2>Una sola cosa a la vez</h2><p>Elegí qué querés hacer y Habits aparta el resto por un rato.</p></div><button class="icon-button" data-productivity-action="focus-close" aria-label="Cerrar">×</button></header><div class="focus-duration"><label>Duración<select id="focus-duration"><option value="25">25 min</option><option value="50">50 min</option><option value="90">90 min</option></select></label><label>Personalizada<input id="focus-custom-minutes" type="number" min="5" max="240" step="5" placeholder="min"></label></div><button class="focus-free button outline" data-productivity-action="focus-start" data-kind="free" data-id="" data-label="Sesión libre">Empezar una sesión libre</button><div class="focus-target-list">${targets.map(target=>`<button type="button" class="focus-target" data-productivity-action="focus-start" data-kind="${esc(target.kind)}" data-id="${esc(target.id)}" data-label="${esc(target.label)}" data-date="${esc(target.date)}"><span><strong>${esc(target.label)}</strong><small>${esc(typeLabel(target.kind))} · ${esc(target.detail)}</small></span><b>Concentrarme</b></button>`).join('')||'<div class="personal-empty"><strong>No hay pendientes para elegir</strong><p>Podés iniciar una sesión libre.</p></div>'}</div><p class="focus-shortcut-hint"><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd></p></div>`;
}
function renderFocusActive(dialog,state){
 const remaining=focusRemaining(state),done=remaining<=0,actionable=['task','habit','event'].includes(state.targetKind);
 dialog.innerHTML=`<div class="focus-shell focus-active-view"><header><div><p class="eyebrow">${done?'SESIÓN COMPLETA':'EN CONCENTRACIÓN'}</p><h2>${esc(state.label||'Sesión libre')}</h2><p>${done?'Terminaste el tiempo que te propusiste.':'Todo lo demás puede esperar un ratito.'}</p></div><button class="icon-button" data-productivity-action="focus-close" aria-label="Cerrar">×</button></header><div class="focus-timer" data-focus-timer>${fmtMs(remaining)}</div><div class="focus-progress"><span style="--focus-progress:${Math.min(100,Math.round(focusElapsed(state)/(state.durationMin*60000)*100))}%"></span></div><div class="focus-actions">${done?'':`<button class="button outline" data-productivity-action="focus-toggle">${state.running?'Pausar':'Continuar'}</button>`}<button class="button outline" data-productivity-action="focus-finish">Terminar sesión</button>${actionable?`<button class="button primary" data-productivity-action="focus-complete">${done?'Marcar como hecho':'Completar y cerrar'}</button>`:''}</div><p class="muted small">Podés cerrar esta pantalla: el temporizador sigue guardado en este dispositivo.</p></div>`;
}
export function openFocusMode(){const dialog=focusDialog(),state=loadFocus();if(state)renderFocusActive(dialog,state);else renderFocusPicker(dialog);if(!dialog.open)dialog.showModal();document.documentElement.classList.add('focus-immersive');}
function startFocus(control){const dialog=focusDialog(),durationSelect=dialog.querySelector('#focus-duration'),custom=Number(dialog.querySelector('#focus-custom-minutes')?.value),duration=Number.isFinite(custom)&&custom>=5&&custom<=240?custom:Number(durationSelect?.value)||25;const state={version:1,targetKind:control.dataset.kind||'free',targetId:control.dataset.id||'',label:control.dataset.label||'Sesión libre',date:control.dataset.date||dayKey(),durationMin:duration,elapsedMs:0,startedAt:Date.now(),running:true};saveFocus(state);renderFocusActive(dialog,state);}
function toggleFocus(){const state=loadFocus();if(!state)return;state.elapsedMs=focusElapsed(state);state.running=!state.running;state.startedAt=state.running?Date.now():0;saveFocus(state);renderFocusActive(focusDialog(),state);}
function closeFocus(){focusDialog().close();document.documentElement.classList.remove('focus-immersive');}
function finishFocus(){clearFocus();closeFocus();}
function completeFocus(){const state=loadFocus();if(!state)return;const today=state.date||dayKey();if(state.targetKind==='task'){const task=db.records('task').find(t=>t.id===state.targetId);if(task&&!task.done)db.put('task',{...task,done:true},task.id);}if(state.targetKind==='habit'){const habit=db.records('habit').find(h=>h.id===state.targetId);if(habit)db.put('log',{habitId:habit.id,date:today,status:'done',value:habit.type==='check'?1:Number(habit.target)||1,at:new Date().toISOString()},`log:${habit.id}:${today}`);}if(state.targetKind==='event'){const event=db.records('event').find(e=>e.id===state.targetId);if(event)db.put('eventLog',{eventId:event.id,date:today,at:new Date().toISOString()},`event:${event.id}:${today}`);}finishFocus();}

export function openShortcutHelp(){modalOpen('Atajos de teclado',`<section class="shortcut-help"><p class="muted">Funcionan cuando no estás escribiendo dentro de un campo.</p><dl><div><dt><kbd>Ctrl/Cmd</kbd> + <kbd>K</kbd></dt><dd>Búsqueda global</dd></div><div><dt><kbd>Ctrl/Cmd</kbd> + <kbd>Enter</kbd></dt><dd>Registro rápido</dd></div><div><dt><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd></dt><dd>Modo concentración</dd></div><div><dt><kbd>Alt</kbd> + <kbd>1</kbd></dt><dd>Mi día</dd></div><div><dt><kbd>Alt</kbd> + <kbd>2</kbd></dt><dd>Calendario</dd></div><div><dt><kbd>Alt</kbd> + <kbd>3</kbd></dt><dd>Tareas</dd></div><div><dt><kbd>Alt</kbd> + <kbd>4</kbd></dt><dd>Biblioteca</dd></div><div><dt><kbd>?</kbd></dt><dd>Mostrar esta ayuda</dd></div><div><dt><kbd>Ctrl/Cmd</kbd> + <kbd>Z</kbd></dt><dd>Deshacer</dd></div><div><dt><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></dt><dd>Rehacer</dd></div></dl></section>`);}

function focusSignature(){const state=loadFocus();return state?`${state.running?'1':'0'}:${fmtMs(focusRemaining(state))}`:'none';}
function ensureControls(){
 const layout=document.querySelector('.app-layout'),topbar=document.querySelector('.topbar');
 if(!layout||!topbar){document.querySelector('.universal-add-button')?.remove();return;}
 const profile=topbar.querySelector('.profile-button');
 let focus=topbar.querySelector('[data-productivity-action="focus-open"]');if(!focus){focus=document.createElement('button');focus.type='button';focus.className='icon-button productivity-focus-button';focus.dataset.productivityAction='focus-open';focus.setAttribute('aria-label','Modo concentración');topbar.insertBefore(focus,profile||null);}
 const signature=focusSignature();if(focus.dataset.signature!==signature){focus.dataset.signature=signature;focus.innerHTML=signature==='none'?'<span aria-hidden="true">◎</span>':`<span aria-hidden="true">◉</span><span class="focus-mini-time">${signature.split(':').slice(1).join(':')}</span>`;focus.classList.toggle('is-active',signature!=='none');}
 if(!topbar.querySelector('[data-productivity-action="quick-add"]')){const quick=document.createElement('button');quick.type='button';quick.className='icon-button productivity-quick-button';quick.dataset.productivityAction='quick-add';quick.setAttribute('aria-label','Registro rápido');quick.innerHTML='<span aria-hidden="true">＋</span>';topbar.insertBefore(quick,profile||null);}
 if(!topbar.querySelector('[data-productivity-action="shortcuts"]')){const shortcuts=document.createElement('button');shortcuts.type='button';shortcuts.className='icon-button productivity-shortcuts-button';shortcuts.dataset.productivityAction='shortcuts';shortcuts.setAttribute('aria-label','Atajos de teclado');shortcuts.innerHTML='<span aria-hidden="true">⌨</span>';topbar.insertBefore(shortcuts,profile||null);}
 if(!layout.querySelector('.universal-add-button')){const floating=document.createElement('button');floating.type='button';floating.className='universal-add-button';floating.dataset.productivityAction='quick-add';floating.setAttribute('aria-label','Registro rápido');floating.innerHTML='<span aria-hidden="true">＋</span>';layout.append(floating);}
}

function handleProductivityAction(control,event){
 const action=control.dataset.productivityAction;if(!action)return false;event?.preventDefault();event?.stopImmediatePropagation();
 if(action==='quick-add')openQuickAdd();
 if(action==='focus-open')openFocusMode();
 if(action==='shortcuts')openShortcutHelp();
 if(action==='search-reset'){const root=control.closest('[data-advanced-search-root]');if(root){root.querySelector('[name="search-kind"]').value='';root.querySelector('[name="search-status"]').value='';root.querySelector('[name="search-from"]').value='';root.querySelector('[name="search-to"]').value='';root.querySelector('[name="search-sort"]').value='relevance';void runAdvancedSearch(root);}}
 if(action==='focus-close')closeFocus();
 if(action==='focus-start')startFocus(control);
 if(action==='focus-toggle')toggleFocus();
 if(action==='focus-finish')finishFocus();
 if(action==='focus-complete')completeFocus();
 return true;
}

if(typeof document!=='undefined'){
 document.addEventListener('click',event=>{
  const custom=event.target.closest?.('[data-productivity-action]');if(custom){handleProductivityAction(custom,event);return;}
  const normal=event.target.closest?.('[data-action]');if(!normal)return;
  if(normal.dataset.action==='search'){event.preventDefault();event.stopImmediatePropagation();openAdvancedSearch();return;}
  if(normal.dataset.action==='create'){event.preventDefault();event.stopImmediatePropagation();openQuickAdd();return;}
  if(normal.dataset.action==='water-add'&&normal.closest('[data-quick-add-root]'))queueMicrotask(()=>{const modal=appModal();if(modal?.open)modal.close();});
 },true);
 document.addEventListener('keydown',event=>{
  const target=event.target,typing=target?.matches?.('input,textarea,select,[contenteditable="true"]');if(typing)return;
  const mod=event.ctrlKey||event.metaKey,key=String(event.key).toLowerCase();
  if(mod&&key==='k'){event.preventDefault();openAdvancedSearch();return;}
  if(mod&&event.key==='Enter'){event.preventDefault();openQuickAdd();return;}
  if(mod&&event.shiftKey&&key==='f'){event.preventDefault();openFocusMode();return;}
  if(event.altKey&&['1','2','3','4'].includes(event.key)){event.preventDefault();navigateRoute({view:({1:'today',2:'calendar',3:'space',4:'library'})[event.key]});return;}
  if(event.key==='?'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();openShortcutHelp();}
 });
 const app=document.querySelector('#app');if(app)new MutationObserver(()=>ensureControls()).observe(app,{childList:true,subtree:true});queueMicrotask(ensureControls);
 focusTick=setInterval(()=>{const state=loadFocus();if(state){if(state.running&&focusRemaining(state)<=0){state.elapsedMs=state.durationMin*60000;state.running=false;state.startedAt=0;saveFocus(state);const dialog=document.querySelector('#focus-mode-dialog');if(dialog?.open)renderFocusActive(dialog,state);}else{document.querySelectorAll('[data-focus-timer]').forEach(el=>el.textContent=fmtMs(focusRemaining(state)));ensureControls();}}},1000);focusTick?.unref?.();
}
