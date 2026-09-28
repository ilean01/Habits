import './dashboard-customization.css';
import * as db from './store.js';
import {DASHBOARD_WIDGETS,normalizeDashboardPreferences,moveDashboardWidget,setDashboardWidgetVisible,setDashboardColumns,resetDashboardPreferences} from './dashboard-preferences.js';

const selectorById={
 hero:'.day-hero',
 habits:'.habit-grid',
 agenda:'.agenda-panel',
 water:'.water-panel',
 nutrition:'.nutrition-panel',
 reading:'.reading-panel',
 mood:'.reflection-card',
 timeline:'.timeline-section',
 extras:'.utility-panel'
};
const widgetLabel=new Map(DASHBOARD_WIDGETS.map(widget=>[widget.id,widget.label]));
let applyQueued=false;

function currentSettings(){return db.records('settings')[0]||{};}
function currentPreferences(){return normalizeDashboardPreferences(currentSettings().dashboardWidgets||{});}
function savePreferences(prefs){
 const current=currentSettings(),{id:ignored,...data}=current;
 db.put('settings',{...data,dashboardWidgets:normalizeDashboardPreferences(prefs)},'settings');
}
function widgetNode(root,id){
 const selector=selectorById[id],found=selector?root.querySelector(selector):null;
 if(id==='habits')return found?.closest('section')||null;
 return found;
}
function ensureCustomizeButton(root){
 const actions=root.querySelector('.page-heading .heading-actions');
 if(!actions||actions.querySelector('[data-dashboard-action="open"]'))return;
 const button=document.createElement('button');
 button.type='button';button.className='button outline dashboard-customize-button';
 button.dataset.dashboardAction='open';button.textContent='Personalizar';
 button.setAttribute('aria-label','Personalizar widgets de Mi día');
 actions.prepend(button);
}
function emptyDashboard(grid){
 if(grid.querySelector('.dashboard-all-hidden'))return;
 const box=document.createElement('section');box.className='dashboard-all-hidden empty';
 box.innerHTML='<strong>Tu dashboard está vacío</strong><p>Elegí qué querés volver a mostrar en Mi día.</p><button type="button" class="button outline" data-dashboard-action="open">Personalizar widgets</button>';
 grid.append(box);
}

export function applyDashboardCustomization(doc=document){
 const content=doc.querySelector('.content');if(!content||content.dataset.dashboardEnhanced==='true')return false;
 const legacyGrid=content.querySelector('.dashboard-grid');if(!legacyGrid)return false;
 const prefs=currentPreferences(),nodes=new Map();
 for(const {id} of DASHBOARD_WIDGETS){const node=widgetNode(content,id);if(node)nodes.set(id,node);}
 if(!nodes.size)return false;
 content.dataset.dashboardEnhanced='true';ensureCustomizeButton(content);
 const first=nodes.get('hero')||legacyGrid;
 const grid=doc.createElement('div');grid.className='dashboard-widget-grid';grid.dataset.columns=prefs.columns;grid.setAttribute('aria-label','Widgets de Mi día');
 first.parentNode.insertBefore(grid,first);
 for(const id of prefs.order){
  const node=nodes.get(id);if(!node)continue;
  node.dataset.dashboardWidget=id;node.classList.add('dashboard-widget');node.hidden=prefs.hidden.includes(id);node.setAttribute('data-widget-label',widgetLabel.get(id)||id);grid.append(node);
 }
 legacyGrid.remove();
 if(!prefs.order.some(id=>nodes.has(id)&&!prefs.hidden.includes(id)))emptyDashboard(grid);
 return true;
}

function ensureDialog(){
 let dialog=document.querySelector('#dashboard-customizer');if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='dashboard-customizer';dialog.className='dashboard-customizer';document.body.append(dialog);return dialog;
}
function renderDialog(prefs=currentPreferences()){
 const dialog=ensureDialog(),normalized=normalizeDashboardPreferences(prefs),hidden=new Set(normalized.hidden);
 dialog.innerHTML=`<form method="dialog" class="dashboard-customizer-shell"><header><div><p class="eyebrow">MI DÍA, A TU MANERA</p><h2>Personalizar dashboard</h2><p>Elegí qué widgets querés ver y en qué orden.</p></div><button type="button" class="icon-button" data-dashboard-action="close" aria-label="Cerrar">×</button></header><label class="dashboard-columns">Distribución<select data-dashboard-columns><option value="auto" ${normalized.columns==='auto'?'selected':''}>Automática</option><option value="one" ${normalized.columns==='one'?'selected':''}>Una columna</option><option value="two" ${normalized.columns==='two'?'selected':''}>Dos columnas</option></select></label><div class="dashboard-widget-settings">${normalized.order.map((id,index)=>`<div class="dashboard-widget-setting" data-dashboard-setting="${id}"><label><input type="checkbox" data-dashboard-widget-toggle="${id}" ${hidden.has(id)?'':'checked'}><span>${widgetLabel.get(id)||id}</span></label><div><button type="button" class="icon-button" data-dashboard-action="move" data-id="${id}" data-dir="-1" aria-label="Mover ${widgetLabel.get(id)||id} arriba" ${index===0?'disabled':''}>↑</button><button type="button" class="icon-button" data-dashboard-action="move" data-id="${id}" data-dir="1" aria-label="Mover ${widgetLabel.get(id)||id} abajo" ${index===normalized.order.length-1?'disabled':''}>↓</button></div></div>`).join('')}</div><footer><button type="button" class="button outline" data-dashboard-action="reset">Restaurar diseño original</button><button type="button" class="button primary" data-dashboard-action="close">Listo</button></footer></form>`;
 return dialog;
}
function openDialog(){const dialog=renderDialog();if(!dialog.open)dialog.showModal();}
function closeDialog(){document.querySelector('#dashboard-customizer')?.close();}

function scheduleApply(){if(applyQueued)return;applyQueued=true;queueMicrotask(()=>{applyQueued=false;applyDashboardCustomization();});}

if(typeof document!=='undefined'){
 document.addEventListener('click',event=>{
  const control=event.target.closest('[data-dashboard-action]');if(!control)return;
  const action=control.dataset.dashboardAction;if(!action)return;
  event.preventDefault();
  if(action==='open'){openDialog();return;}
  if(action==='close'){closeDialog();return;}
  if(action==='reset'){const prefs=resetDashboardPreferences();savePreferences(prefs);renderDialog(prefs);return;}
  if(action==='move'){
   const prefs=moveDashboardWidget(currentPreferences(),control.dataset.id,Number(control.dataset.dir));savePreferences(prefs);renderDialog(prefs);return;
  }
 });
 document.addEventListener('change',event=>{
  const toggle=event.target.closest('[data-dashboard-widget-toggle]');
  if(toggle){const prefs=setDashboardWidgetVisible(currentPreferences(),toggle.dataset.dashboardWidgetToggle,toggle.checked);savePreferences(prefs);renderDialog(prefs);return;}
  const columns=event.target.closest('[data-dashboard-columns]');
  if(columns){const prefs=setDashboardColumns(currentPreferences(),columns.value);savePreferences(prefs);renderDialog(prefs);}
 });
 const app=document.querySelector('#app');
 if(app){new MutationObserver(scheduleApply).observe(app,{childList:true,subtree:true});scheduleApply();}
}
