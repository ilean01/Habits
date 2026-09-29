from pathlib import Path

p=Path('src/productivity-tools.js')
s=p.read_text()

# Remove helpers/default state used only to expose Areas in global tools.
s=s.replace("const areas=()=>db.records('area');\n",'')
s=s.replace("const areaName=id=>areas().find(a=>a.id===id)?.name||'';\n",'')
s=s.replace("area:'',",'')

out=[]
for line in s.splitlines(keepends=True):
    if line.startswith('function filterValues(root){'):
        out.append("function filterValues(root){return {query:root.querySelector('#advanced-search')?.value.trim()||'',kind:root.querySelector('[name=\"search-kind\"]')?.value||'',status:root.querySelector('[name=\"search-status\"]')?.value||'',dateFrom:root.querySelector('[name=\"search-from\"]')?.value||'',dateTo:root.querySelector('[name=\"search-to\"]')?.value||'',sort:root.querySelector('[name=\"search-sort\"]')?.value||'relevance'};}\n")
        continue
    if line.startswith('function searchMeta(row){'):
        out.append("function searchMeta(row){const bits=[row.label];if(row.date)bits.push(row.date);if(row.state==='completed')bits.push('Completada');if(row.state==='pending')bits.push('Pendiente');if(row.state==='scheduled')bits.push('Programada');if(row.subtitle)bits.push(row.subtitle);return bits.filter(Boolean).join(' · ');}\n")
        continue
    if line.startswith(' const prefs=readSearchPrefs(),kindOptions='):
        out.append(" const prefs=readSearchPrefs(),kindOptions=SEARCH_KIND_OPTIONS.map(([value,label])=>`<option value=\"${esc(value)}\" ${prefs.kind===value?'selected':''}>${esc(label)}</option>`).join('');\n")
        continue
    if "const modal=modalOpen('Búsqueda global'" in line:
        line=line.replace('||prefs.area','')
        start=line.find('<label>Área')
        if start>=0:
            end=line.find('</label>',start)
            if end<0:
                raise SystemExit('Could not close Area filter label')
            line=line[:start]+line[end+len('</label>'):]
    if "action==='search-reset'" in line and 'search-area' in line:
        pos=line.find('search-area')
        start=line.rfind('root.querySelector(',0,pos)
        end=line.find(';',pos)
        if start<0 or end<0:
            raise SystemExit('Could not remove Area reset selector')
        line=line[:start]+line[end+1:]
    out.append(line)
s=''.join(out)

# Remove Area from search behavior and focus-mode descriptions.
s=s.replace(',area:prefs.area','')
s=s.replace('&&!prefs.area','')
s=s.replace('||prefs.area','')
s=s.replace("[areaName(task.area),task.due?`vence ${task.due}`:'sin fecha',task.priority==='alta'?'prioridad alta':'']","[task.due?`vence ${task.due}`:'sin fecha',task.priority==='alta'?'prioridad alta':'']")
s=s.replace("[event.time||'Todo el día',areaName(event.area)]","[event.time||'Todo el día']")
s=s.replace("detail:areaName(habit.area)||'Hábito de hoy'","detail:'Hábito de hoy'")
s=s.replace("detail:areaName(project.area)||'Proyecto'","detail:'Proyecto'")

remaining=[token for token in ['search-area','Todas las áreas','areaName(','prefs.area','areaOptions','<label>Área'] if token in s]
if remaining:
    raise SystemExit('Remaining productivity Areas UI references: '+', '.join(remaining))
p.write_text(s)
