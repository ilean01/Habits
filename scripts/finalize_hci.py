from pathlib import Path

p=Path(__file__).resolve().parents[1]/'src/main.js'
s=p.read_text()

def once(old,new,label):
 global s
 if s.count(old)!=1: raise SystemExit(f'{label}: esperaba 1 coincidencia, encontré {s.count(old)}')
 s=s.replace(old,new,1)

once("logs=rec('log'),stats=dayStats(hs,logs,today),name=","logs=rec('log'),name=",'quitar stats anticipado')
once("const shown=habitsForDayMode(hs,logs,today,dayMode);const modeNote=dayModeNotice(dayMode);return","const shown=habitsForDayMode(hs,logs,today,dayMode);const stats=dayStats(shown,logs,today),modeNote=dayModeNotice(dayMode);return",'stats sobre visibles')
once("${btn(icon('Plus')+'Nuevo hábito','new-habit','','text-button')}</div><div class=\"filter-bar\">","<div class=\"button-row\">${btn('Reordenar','reorder-habits','','text-button')}${btn(icon('Plus')+'Nuevo hábito','new-habit','','text-button')}</div></div><div class=\"filter-bar\">",'botón reordenar')

marker="function habitAction(id,d=dayKey()){"
insert="""function reorderHabits(){const list=rec('habit').filter(h=>!h.archived).sort((a,b)=>(a.order||0)-(b.order||0));showModal('Reordenar hábitos',`<p class=\"muted\">Usá las flechas para cambiar el orden. En notebook también podés seguir arrastrando las fichas.</p><div class=\"reorder-list\">${list.map((h,i)=>`<div class=\"reorder-row\"><span>${icon(h.icon)}<strong>${esc(h.name)}</strong></span><div>${btn(icon('ChevronLeft'),'move-habit',`data-id=\"${h.id}\" data-direction=\"-1\" ${i===0?'disabled':''} aria-label=\"Subir ${esc(h.name)}\"`,'icon-button')}${btn(icon('ChevronRight'),'move-habit',`data-id=\"${h.id}\" data-direction=\"1\" ${i===list.length-1?'disabled':''} aria-label=\"Bajar ${esc(h.name)}\"`,'icon-button')}</div></div>`).join('')}</div>`);}
function moveHabit(id,direction){const list=rec('habit').filter(h=>!h.archived).sort((a,b)=>(a.order||0)-(b.order||0)),i=list.findIndex(h=>h.id===id),j=i+Number(direction);if(i<0||j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];list.forEach((h,order)=>{if(Number(h.order)!==order){const {id:recordId,...data}=h;db.put('habit',{...data,order},recordId);}});reorderHabits();}
"""
if s.count(marker)!=1: raise SystemExit('no encontré habitAction')
s=s.replace(marker,insert+marker,1)

once("const id=el.dataset.id,d=el.dataset.date||dayKey();if(a==='close')","const id=el.dataset.id,d=el.dataset.date||dayKey();if(a==='reorder-habits'){reorderHabits();return;}if(a==='move-habit'){moveHabit(id,el.dataset.direction);return;}if(a==='close')",'acciones reordenar')

old="db.put('settings',{...s,name:f.get('name'),theme:f.get('theme'),dayMode:f.get('dayMode'),large:f.has('large'),quiet:f.has('quiet'),quietWork:f.has('quietWork')},'settings');modal.close();toast('Tu espacio, a tu gusto.');"
new="const today=dayKey(),mode=f.get('dayMode');db.put('settings',{...s,name:f.get('name'),theme:f.get('theme'),dayMode:mode,dayModeDate:today,dayModes:{...(s.dayModes||{}),[today]:mode},large:f.has('large'),quiet:f.has('quiet'),quietWork:f.has('quietWork')},'settings');modal.close();toast('Tu espacio, a tu gusto.');"
once(old,new,'guardar tipo de día desde ajustes')

p.write_text(s)
print('Finalización HCI aplicada')
