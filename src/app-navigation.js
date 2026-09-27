export const APP_NAV=[
 ['today','LayoutDashboard','Mi día'],
 ['calendar','CalendarDays','Calendario'],
 ['areas','Layers','Mis áreas'],
 ['progress','ChartNoAxesColumn','Progreso'],
 ['diary','NotebookPen','Mi diario'],
 ['library','LibraryBig','Biblioteca'],
 ['space','CheckCheck','Tareas']
];
export const MOBILE_NAV_IDS=new Set(['today','calendar','library','space']);
export const MOBILE_MORE_IDS=new Set(['areas','progress','diary']);
export const mobileNavigation=()=>APP_NAV.filter(([id])=>MOBILE_NAV_IDS.has(id));
export const mobileMoreNavigation=()=>APP_NAV.filter(([id])=>MOBILE_MORE_IDS.has(id));
export const viewLabel=view=>APP_NAV.find(([id])=>id===view)?.[2]||'Mi día';
