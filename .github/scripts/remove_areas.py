from pathlib import Path
import re


def require(text, needle, label):
    if needle not in text:
        raise SystemExit(f"Missing expected pattern: {label}")


# Navigation: remove the Areas destination entirely.
p = Path("src/app-navigation.js")
s = p.read_text()
require(s, " ['areas','Layers','Mis áreas'],", "app navigation areas entry")
s = s.replace(" ['areas','Layers','Mis áreas'],\n", "")
s = s.replace(
    "export const MOBILE_MORE_IDS=new Set(['areas','progress','diary']);",
    "export const MOBILE_MORE_IDS=new Set(['progress','diary']);",
)
p.write_text(s)

# Router: old /areas URLs become unknown routes and canonicalize to Mi día.
p = Path("src/router.js")
s = p.read_text()
s = s.replace(
    "const SEGMENT_TO_VIEW={today:'today',calendar:'calendar',areas:'areas',progress:'progress',diary:'diary',library:'library',tasks:'space'};",
    "const SEGMENT_TO_VIEW={today:'today',calendar:'calendar',progress:'progress',diary:'diary',library:'library',tasks:'space'};",
)
s = s.replace(
    "const VIEW_TO_SEGMENT={today:'today',calendar:'calendar',areas:'areas',progress:'progress',diary:'diary',library:'library',space:'tasks'};",
    "const VIEW_TO_SEGMENT={today:'today',calendar:'calendar',progress:'progress',diary:'diary',library:'library',space:'tasks'};",
)
s = s.replace(
    " const route={view,areaId:'',date:'',bookId:'',hash:''};\n if(view==='areas')route.areaId=parts[1]||'';",
    " const route={view,date:'',bookId:'',hash:''};",
)
s = s.replace(
    "export function routeHash({view='today',areaId='',date='',bookId=''}={}){",
    "export function routeHash({view='today',date='',bookId=''}={}){",
)
s = s.replace(" if(view==='areas'&&areaId)return `#/areas/${encodeURIComponent(areaId)}`;\n", "")
p.write_text(s)

# Main shell: remove Areas page, management, route action and visible area selector.
p = Path("src/main.js")
s = p.read_text()
s = s.replace(",Layers,", ",")
s = s.replace(
    "let user=null,view=initialRoute.view,areaFilter=initialRoute.areaId||'',date=",
    "let user=null,view=initialRoute.view,date=",
)
s = s.replace(
    "view==='today'?todayView():view==='calendar'?calendarView():view==='areas'?areasView():view==='progress'?progressView():",
    "view==='today'?todayView():view==='calendar'?calendarView():view==='progress'?progressView():",
)
s = s.replace(
    "onRouteChange(route=>{view=route.view;areaFilter=route.view==='areas'?(route.areaId||''):'';",
    "onRouteChange(route=>{view=route.view;",
)
s2 = re.sub(
    r"\nfunction upcomingForArea\([\s\S]*?\nfunction spaceView\(\)\{",
    "\nfunction spaceView(){",
    s,
    count=1,
)
if s2 == s:
    raise SystemExit("Could not remove Areas view block")
s = s2
s = s.replace(
    "const areaSelect=v=>select('Área','area',areas().map(a=>[a.id,a.name]),v||areaFilter||'personal');",
    "const areaField=v=>`<input type=\"hidden\" name=\"area\" value=\"${esc(v||'personal')}\">`;",
)
s = s.replace("areaSelect(", "areaField(")
s = re.sub(r"\n if\(kind==='area'\)fields=`[^`]*`;", "", s, count=1)
s = s.replace("\n if(kind==='area'&&id)data.id=id;", "")
s = s.replace("if(a==='area'){navigateRoute({view:'areas',areaId:id||''});return;}", "")
s = s.replace(
    "if(a==='delete'){if(el.dataset.kind==='area'&&['habit','event','task','project'].some(k=>rec(k).some(r=>r.area===id)))return toast('Primero mové a otra área las actividades que la usan.');if(el.dataset.kind==='project')",
    "if(a==='delete'){if(el.dataset.kind==='project')",
)
s = s.replace(
    "<small>${esc(area(t.area).name)} ${t.projectId?' · '+esc(get('project',t.projectId)?.name||''):''}${t.due?",
    "<small>${t.projectId?esc(get('project',t.projectId)?.name||'')+' · ':''}${t.due?",
)
s = s.replace(
    "import {planningView,planningAction,effectiveDayMode} from './planning.js';",
    "import {planningAction,effectiveDayMode} from './planning.js';",
)
for forbidden in [
    "areaFilter",
    "function areasView(",
    "new-area",
    "edit-area",
    "view==='areas'",
    "a==='area'",
]:
    if forbidden in s:
        raise SystemExit(f"Remaining Areas UI reference in main.js: {forbidden}")
p.write_text(s)

# Daily planner: no visible area names or area chooser.
p = Path("src/daily-planner.js")
s = p.read_text()
s = s.replace("const areaName=id=>db.records('area').find(a=>a.id===id)?.name||'Personal';\n", "")
s = s.replace(
    "state.weekly?`${state.weekly.done}/${state.weekly.target} esta semana`:h.type==='check'?(state.skip?'Pausa de hoy':areaName(h.area)):",
    "state.weekly?`${state.weekly.done}/${state.weekly.target} esta semana`:h.type==='check'?(state.skip?'Pausa de hoy':'Hábito de hoy'):",
)
s = s.replace(
    "${!task.done&&task.due<date?`Vencida · ${esc(task.due)}`:esc(areaName(task.area))}${task.priority==='alta'?",
    "${!task.done&&task.due<date?`Vencida · ${esc(task.due)}`:'Para hoy'}${task.priority==='alta'?",
)
s = s.replace(
    " const date=dayKey(),dialog=ensureDialog(),areas=db.records('area'),end=nextHour(time);",
    " const date=dayKey(),dialog=ensureDialog(),end=nextHour(time);",
)
s = re.sub(
    r"<label>Área<select name=\"area\">\$\{areas\.map\(a=>`<option[\s\S]*?</select></label>",
    "",
    s,
    count=1,
)
s = s.replace(
    "const candidate={name,area:String(data.get('area')||'personal'),date:dayKey()",
    "const candidate={name,area:'personal',date:dayKey()",
)
if "areaName(" in s or "<label>Área" in s:
    raise SystemExit("Remaining visible area reference in daily planner")
p.write_text(s)

# Advanced search/focus: remove Area filter and area labels from user-facing metadata.
p = Path("src/productivity-tools.js")
s = p.read_text()
s = s.replace("const areas=()=>db.records('area');\nconst areaName=id=>areas().find(a=>a.id===id)?.name||'';\n", "")
s = s.replace(
    "{query:'',kind:'',area:'',status:'',dateFrom:'',dateTo:'',sort:'relevance'}",
    "{query:'',kind:'',status:'',dateFrom:'',dateTo:'',sort:'relevance'}",
)
s = s.replace(
    "function filterValues(root){return {query:root.querySelector('#advanced-search')?.value.trim()||'',kind:root.querySelector('[name=\"search-kind\"]')?.value||'',area:root.querySelector('[name=\"search-area\"]')?.value||'',status:",
    "function filterValues(root){return {query:root.querySelector('#advanced-search')?.value.trim()||'',kind:root.querySelector('[name=\"search-kind\"]')?.value||'',status:",
)
s = s.replace(
    "function searchMeta(row){const bits=[row.label];if(row.area)bits.push(areaName(row.area));if(row.date)",
    "function searchMeta(row){const bits=[row.label];if(row.date)",
)
s = s.replace(
    "const filters={kinds:prefs.kind?[prefs.kind]:[],area:prefs.area,status:prefs.status,dateFrom:prefs.dateFrom,dateTo:prefs.dateTo,sort:prefs.sort};",
    "const filters={kinds:prefs.kind?[prefs.kind]:[],status:prefs.status,dateFrom:prefs.dateFrom,dateTo:prefs.dateTo,sort:prefs.sort};",
)
s = s.replace("&&!prefs.area&&!prefs.status", "&&!prefs.status")
s = re.sub(
    r",areaOptions=\[\['','Todas las áreas'\],[\s\S]*?\.join\(''\);\n const modal=",
    ";\n const modal=",
    s,
    count=1,
)
s = s.replace("||prefs.area", "")
s = re.sub(r"<label>Área<select name=\"search-area\">\$\{areaOptions\}</select></label>", "", s)
s = s.replace(
    "[areaName(task.area),task.due?`vence ${task.due}`:'sin fecha',task.priority==='alta'?'prioridad alta':'']",
    "[task.due?`vence ${task.due}`:'sin fecha',task.priority==='alta'?'prioridad alta':'']",
)
s = s.replace("[event.time||'Todo el día',areaName(event.area)]", "[event.time||'Todo el día']")
s = s.replace("detail:areaName(habit.area)||'Hábito de hoy'", "detail:'Hábito de hoy'")
s = s.replace("detail:areaName(project.area)||'Proyecto'", "detail:'Proyecto'")
for forbidden in ["search-area", "Todas las áreas", "areaName(", "<label>Área"]:
    if forbidden in s:
        raise SystemExit(f"Remaining visible area reference in productivity-tools.js: {forbidden}")
p.write_text(s)

# Planning sections keep their domain data but cannot navigate to the deleted Areas page.
p = Path("src/planning.js")
s = p.read_text()
s = re.sub(
    r"\$\{area==='facultad'\?'':btn\('Ver área Facultad','area','data-id=\"facultad\"','button outline'\)\}",
    "",
    s,
)
s = re.sub(
    r"\$\{area==='trabajo'\?'':btn\('Ver área Trabajo','area','data-id=\"trabajo\"','button outline'\)\}",
    "",
    s,
)
s = re.sub(
    r"\$\{area==='ingles'\?'':btn\('Abrir vocabulario','area','data-id=\"ingles\"','text-button'\)\}",
    "",
    s,
)
if "'area','data-id=" in s or "Ver área " in s:
    raise SystemExit("Remaining navigation to deleted Areas page in planning.js")
p.write_text(s)

# Router contract: legacy Areas links now return safely to Mi día.
p = Path("tests/router.test.js")
s = p.read_text()
s = re.sub(
    r"test\('áreas admiten una ruta con identificador sin confundir la vista',[\s\S]*?\n\}\);",
    "test('una ruta antigua de áreas vuelve de forma segura a Mi día',()=>{\n const route=parseRoute('#/areas/ingles');assert.equal(route.view,'today');assert.equal(route.hash,'#/today');\n assert.equal(routeHash({view:'areas'}),'#/today');\n});",
    s,
    count=1,
)
p.write_text(s)

# Dedicated regression contract for the requested removal.
Path("tests/remove-areas-feature.test.js").write_text(
    """import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseRoute} from '../src/router.js';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('Mis áreas desaparece de navegación y rutas',async()=>{
 const [nav,router,main]=await Promise.all([read('src/app-navigation.js'),read('src/router.js'),read('src/main.js')]);
 assert.doesNotMatch(nav,/Mis áreas|['\"]areas['\"]/);
 assert.doesNotMatch(router,/areas:'areas'|view==='areas'|#\/areas/);
 assert.equal(parseRoute('#/areas/facultad').view,'today');
 assert.doesNotMatch(main,/areasView\(|new-area|edit-area|view==='areas'|a==='area'/);
});

test('la usuaria ya no gestiona ni filtra por áreas',async()=>{
 const [main,tools,planner,planning]=await Promise.all([read('src/main.js'),read('src/productivity-tools.js'),read('src/daily-planner.js'),read('src/planning.js')]);
 assert.doesNotMatch(main,/>Área<|areaSelect\(|Nueva área|Editar área/);
 assert.doesNotMatch(tools,/search-area|Todas las áreas|areaName\(|>Área</);
 assert.doesNotMatch(planner,/>Área<|areaName\(/);
 assert.doesNotMatch(planning,/Ver área |['\"]area['\"],['\"]data-id=/);
});
"""
)

# Temporary workflows/scripts are removed from the final commit.
for tmp in [
    ".github/workflows/inspect-areas-removal.yml",
    ".github/workflows/apply-remove-areas.yml",
    ".github/scripts/remove_areas.py",
]:
    Path(tmp).unlink(missing_ok=True)
