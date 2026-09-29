from pathlib import Path

p=Path('src/productivity-tools.js')
s=p.read_text()

# Remove helpers used only to expose Areas in global search/focus UI.
s=s.replace("const areas=()=>db.records('area');\n",'')
s=s.replace("const areaName=id=>areas().find(a=>a.id===id)?.name||'';\n",'')
s=s.replace("area:'',",'')

# These selectors contain escaped double quotes in the JS source.
s=s.replace(",area:root.querySelector('[name=\\\"search-area\\\"]')?.value||''",'')
s=s.replace("if(row.area)bits.push(areaName(row.area));",'')
s=s.replace(",area:prefs.area",'')
s=s.replace("&&!prefs.area",'')
s=s.replace("||prefs.area",'')

# Remove the Area-options declaration from openAdvancedSearch.
start=s.find(',areaOptions=')
if start>=0:
    end=s.find(";\n const modal=",start)
    if end<0:
        raise SystemExit('Could not delimit areaOptions')
    s=s[:start]+s[end:]

s=s.replace('<label>Área<select name=\\\"search-area\\\">${areaOptions}</select></label>','')
s=s.replace("root.querySelector('[name=\\\"search-area\\\"]').value='';",'')

# Area names are no longer shown in focus-mode summaries.
s=s.replace("[areaName(task.area),task.due?`vence ${task.due}`:'sin fecha',task.priority==='alta'?'prioridad alta':'']","[task.due?`vence ${task.due}`:'sin fecha',task.priority==='alta'?'prioridad alta':'']")
s=s.replace("[event.time||'Todo el día',areaName(event.area)]","[event.time||'Todo el día']")
s=s.replace("detail:areaName(habit.area)||'Hábito de hoy'","detail:'Hábito de hoy'")
s=s.replace("detail:areaName(project.area)||'Proyecto'","detail:'Proyecto'")

remaining=[token for token in ['search-area','Todas las áreas','areaName(','prefs.area','areaOptions','<label>Área'] if token in s]
if remaining:
    raise SystemExit('Remaining productivity Areas UI references: '+', '.join(remaining))
p.write_text(s)
