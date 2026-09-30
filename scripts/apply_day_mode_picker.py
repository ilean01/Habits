from pathlib import Path

path=Path('src/main.js')
source=path.read_text(encoding='utf-8')
old="""<select id=\"day-mode\" aria-label=\"Tipo de día\"><option value=\"habitual\" ${dayMode==='habitual'?'selected':''}>Día habitual</option><option value=\"tranquilo\" ${dayMode==='tranquilo'?'selected':''}>Día tranquilo</option>${[[\"trabajo\",\"Día de trabajo\"],[\"facultad\",\"Día de facu\"],[\"finDeSemana\",\"Fin de semana\"]].map(([k,n])=>`<option value=\"${k}\" ${dayMode===k?'selected':''}>${n}</option>`).join('')}<option value=\"descanso\" ${dayMode==='descanso'?'selected':''}>Día de descanso</option></select>"""
new="""<div class=\"day-mode-picker\" role=\"radiogroup\" aria-label=\"Tipo de día\">${[['habitual','☀️','Habitual'],['tranquilo','🌿','Tranquilo'],['trabajo','💼','Trabajo'],['facultad','🎓','Facu'],['finDeSemana','🏡','Finde'],['descanso','🌙','Descanso']].map(([k,mark,label])=>btn(`<span aria-hidden=\"true\">${mark}</span><span>${label}</span>`,'day-mode',`data-mode=\"${k}\" role=\"radio\" aria-checked=\"${dayMode===k}\"`,dayMode===k?'day-mode-option selected':'day-mode-option')).join('')}</div>"""
if old not in source: raise SystemExit('Expected day mode select not found')
source=source.replace(old,new,1)
needle="""if(a==='period'){window.periodFilter=el.dataset.period;render();return;}if(a==='mobile-more'){"""
replace="""if(a==='period'){window.periodFilter=el.dataset.period;render();return;}if(a==='day-mode'){const mode=el.dataset.mode||'habitual',s=settings(),today=dayKey();db.put('settings',{...s,dayModeOverrides:{...(s.dayModeOverrides||{}),[today]:mode},dayModeDate:null},'settings');return;}if(a==='mobile-more'){"""
if needle not in source: raise SystemExit('Expected period action not found')
source=source.replace(needle,replace,1)
path.write_text(source,encoding='utf-8')
