export const DASHBOARD_WIDGETS=[
 {id:'hero',label:'Resumen del día'},
 {id:'habits',label:'Mis hábitos de hoy'},
 {id:'agenda',label:'En tu agenda'},
 {id:'water',label:'Agua'},
 {id:'nutrition',label:'Alimentación'},
 {id:'reading',label:'Lectura'},
 {id:'mood',label:'Cómo me siento'},
 {id:'timeline',label:'Así va tu día'},
 {id:'extras',label:'Más opciones para hoy'}
];

export const DEFAULT_DASHBOARD_ORDER=DASHBOARD_WIDGETS.map(widget=>widget.id);
const VALID_COLUMNS=new Set(['auto','one','two']);
const VALID_IDS=new Set(DEFAULT_DASHBOARD_ORDER);

export function normalizeDashboardPreferences(value={}){
 const requested=Array.isArray(value?.order)?value.order:[];
 const seen=new Set();
 const order=[];
 for(const id of requested){if(VALID_IDS.has(id)&&!seen.has(id)){seen.add(id);order.push(id);}}
 for(const id of DEFAULT_DASHBOARD_ORDER)if(!seen.has(id))order.push(id);
 const hidden=[...new Set(Array.isArray(value?.hidden)?value.hidden.filter(id=>VALID_IDS.has(id)):[])];
 const columns=VALID_COLUMNS.has(value?.columns)?value.columns:'auto';
 return {order,hidden,columns};
}

export function moveDashboardWidget(value,id,direction){
 const prefs=normalizeDashboardPreferences(value),index=prefs.order.indexOf(id),next=index+Math.sign(Number(direction)||0);
 if(index<0||next<0||next>=prefs.order.length)return prefs;
 const order=[...prefs.order];[order[index],order[next]]=[order[next],order[index]];
 return {...prefs,order};
}

export function setDashboardWidgetVisible(value,id,visible){
 const prefs=normalizeDashboardPreferences(value);if(!VALID_IDS.has(id))return prefs;
 const hidden=new Set(prefs.hidden);if(visible)hidden.delete(id);else hidden.add(id);
 return {...prefs,hidden:[...hidden]};
}

export function setDashboardColumns(value,columns){
 const prefs=normalizeDashboardPreferences(value);
 return {...prefs,columns:VALID_COLUMNS.has(columns)?columns:'auto'};
}

export function resetDashboardPreferences(){return normalizeDashboardPreferences({});}
