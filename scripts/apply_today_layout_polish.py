from pathlib import Path

path=Path('src/daily-planner.js')
source=path.read_text(encoding='utf-8')
old="""export function plannerSwitchHtml(mode=plannerMode()){
 return `<div class=\"planner-mode-switch\" role=\"region\" aria-label=\"Vista de Mi día\"><span>Elegí cómo querés ver tu día. La app recuerda esta opción en tu cuenta.</span><div class=\"segmented\" role=\"group\" aria-label=\"Vista\"><button data-planner-action=\"mode\" data-mode=\"dashboard\" class=\"${mode==='dashboard'?'active':''}\" aria-pressed=\"${mode==='dashboard'}\">Dashboard</button><button data-planner-action=\"mode\" data-mode=\"planner\" class=\"${mode==='planner'?'active':''}\" aria-pressed=\"${mode==='planner'}\">Agenda del día</button></div></div>`;
}

export function dailyPlannerLayout(dashboardHtml,date=dayKey(),summaryHtml=''){
 const mode=plannerMode();
 return `${plannerSwitchHtml(mode)}${summaryHtml}${mode==='planner'?plannerHtml(date):dashboardHtml}`;
}
"""
new="""export function plannerSwitchHtml(mode=plannerMode()){
 return `<div class=\"planner-mode-switch planner-mode-switch-compact\" role=\"region\" aria-label=\"Vista de Mi día\"><span>Vista</span><div class=\"segmented\" role=\"group\" aria-label=\"Elegir vista\"><button data-planner-action=\"mode\" data-mode=\"dashboard\" class=\"${mode==='dashboard'?'active':''}\" aria-pressed=\"${mode==='dashboard'}\" aria-label=\"Ver Dashboard\">Dashboard</button><button data-planner-action=\"mode\" data-mode=\"planner\" class=\"${mode==='planner'?'active':''}\" aria-pressed=\"${mode==='planner'}\" aria-label=\"Ver Agenda del día\">Agenda del día</button></div></div>`;
}

export function dailyPlannerLayout(dashboardHtml,date=dayKey(),summaryHtml=''){
 const mode=plannerMode();
 return `${plannerSwitchHtml(mode)}${mode==='planner'?plannerHtml(date):`${dashboardHtml}${summaryHtml}`}`;
}
"""
if old not in source: raise SystemExit('Expected planner switch block not found')
path.write_text(source.replace(old,new,1),encoding='utf-8')
