from pathlib import Path

main = Path('src/main.js')
s = main.read_text()

old_editor = """${select('Cómo lo registrás','type',[['check','Un toque: hecho'],['time','Tiempo en minutos'],['quantity','Cantidad']],r.type||'check')}<div data-target-fields ${(!r.type||r.type==='check')?'hidden':''}>${input('Meta diaria','target',r.target||1,'number','min=\"0.01\" step=\"0.01\" max=\"100000\" required')}${input('Unidad','unit',r.unit||'veces','text','required maxlength=\"30\"')}</div></div><fieldset><legend>Días de la semana</legend>"""
new_editor = """${select('Cómo lo registrás','type',[['check','Un toque: hecho'],['time','Tiempo en minutos'],['quantity','Cantidad']],r.type||'check')}<div data-target-fields ${(!r.type||r.type==='check')?'hidden':''}>${input('Meta diaria','target',r.target||1,'number','min=\"0.01\" step=\"0.01\" max=\"100000\" required')}${input('Unidad','unit',r.unit||'veces','text','required maxlength=\"30\"')}</div></div><fieldset class=\"weekly-frequency\"><legend>Frecuencia</legend><div class=\"weekly-frequency-grid\">${select('Cómo querés cumplirlo','frequencyMode',[['days','En los días elegidos'],['weekly','X veces por semana']],r.frequencyMode||'days')}<label data-weekly-target ${(r.frequencyMode||'days')!=='weekly'?'hidden':''}>Veces por semana<input name=\"weeklyTarget\" type=\"number\" min=\"1\" max=\"7\" value=\"${Number(r.weeklyTarget)||3}\"></label></div><p class=\"weekly-help\">Con “X veces por semana”, elegís en qué días podrías hacerlo; la racha se mide por semanas cumplidas.</p></fieldset><fieldset><legend>Días de la semana</legend>"""
if old_editor not in s:
    raise SystemExit('habit editor anchor not found')
s = s.replace(old_editor, new_editor, 1)

old_save = """if(kind==='habit'){data.days=f.getAll('days').map(Number);if(!data.days.length)throw new Error('Elegí al menos un día.');data.target=Number(data.target);data.order=Number(data.order);data.essential=f.has('essential');data.archived=f.has('archived');data.startDate=r.startDate||dayKey();if(data.type==='time')data.unit='minutos';}"""
new_save = """if(kind==='habit'){data.days=f.getAll('days').map(Number);if(!data.days.length)throw new Error('Elegí al menos un día.');data.frequencyMode=f.get('frequencyMode')==='weekly'?'weekly':'days';data.weeklyTarget=data.frequencyMode==='weekly'?Number(f.get('weeklyTarget')):null;if(data.frequencyMode==='weekly'&&(!Number.isInteger(data.weeklyTarget)||data.weeklyTarget<1||data.weeklyTarget>7))throw new Error('Elegí entre 1 y 7 veces por semana.');data.target=Number(data.target);data.order=Number(data.order);data.essential=f.has('essential');data.archived=f.has('archived');data.startDate=r.startDate||dayKey();if(data.type==='time')data.unit='minutos';}"""
if old_save not in s:
    raise SystemExit('habit save block not found')
s = s.replace(old_save, new_save, 1)

old_end = """modal.close();toast(warning||'Guardado. Un pequeño paso más.');});
}
function habitAction"""
new_end = """modal.close();toast(warning||'Guardado. Un pequeño paso más.');});
 if(kind==='habit'){const form=modal.querySelector('form'),mode=form?.querySelector('[name=\"frequencyMode\"]'),weeklyTarget=form?.querySelector('[data-weekly-target]');if(mode&&weeklyTarget){mode.addEventListener('change',()=>{const weekly=mode.value==='weekly';weeklyTarget.hidden=!weekly;if(weekly&&!id)form.querySelectorAll('[name=\"days\"]').forEach(x=>x.checked=true);});}}
}
function habitAction"""
if old_end not in s:
    raise SystemExit('editor closing anchor not found')
s = s.replace(old_end, new_end, 1)
main.write_text(s)

enh = Path('src/enhancements.js')
e = enh.read_text()
e = e.replace("let currentHabitId='',queued=false;", "let queued=false;", 1)
start = e.find('function enhanceHabitEditor(){')
if start < 0:
    raise SystemExit('enhanceHabitEditor not found')
finish = e.find('\nfunction prioritizeContext(){', start)
if finish < 0:
    raise SystemExit('prioritizeContext anchor not found')
e = e[:start] + e[finish+1:]
e = e.replace('installStyles();enhanceHabitEditor();prioritizeContext();', 'installStyles();prioritizeContext();', 1)
old_click = "document.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='new-habit')currentHabitId='';if(action==='edit-habit')currentHabitId=e.target.closest('[data-action]').dataset.id||'';const own=e.target.closest('[data-enh-action]');"
new_click = "document.addEventListener('click',e=>{const own=e.target.closest('[data-enh-action]');"
if old_click not in e:
    raise SystemExit('habit click tracker not found')
e = e.replace(old_click, new_click, 1)
weekly_css = " .weekly-frequency{grid-column:1/-1;border:1px solid var(--line);border-radius:10px;padding:14px;margin:8px 0}.weekly-frequency legend{font-size:13px;font-weight:650}.weekly-frequency-grid{display:grid;grid-template-columns:1fr 150px;gap:10px}.weekly-help{font-size:12px;color:var(--muted);margin:8px 0 0}"
if weekly_css not in e:
    raise SystemExit('weekly enhancement CSS not found')
e = e.replace(weekly_css, '', 1)
e = e.replace('@media(max-width:650px){.weekly-frequency-grid,.install-steps{grid-template-columns:1fr}', '@media(max-width:650px){.install-steps{grid-template-columns:1fr}', 1)
enh.write_text(e)

css = Path('src/style.css')
c = css.read_text()
marker = '/* native weekly frequency */'
if marker not in c:
    c += """\n\n/* native weekly frequency */\n.weekly-frequency{grid-column:1/-1;border:1px solid var(--line);border-radius:10px;padding:14px;margin:8px 0}.weekly-frequency legend{font-size:13px;font-weight:650}.weekly-frequency-grid{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:10px;align-items:end}.weekly-frequency [data-weekly-target][hidden]{display:none}.weekly-help{font-size:12px;color:var(--muted);margin:8px 0 0}@media(max-width:650px){.weekly-frequency-grid{grid-template-columns:1fr}}\n"""
css.write_text(c)

test = Path('tests/native-weekly-frequency.test.js')
test.write_text("""import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n\nconst main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');\nconst enhancements=fs.readFileSync(new URL('../src/enhancements.js',import.meta.url),'utf8');\nconst css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8');\n\ntest('el editor de hábitos renderiza frecuencia semanal de forma nativa',()=>{\n assert.match(main,/frequencyMode/);\n assert.match(main,/weeklyTarget/);\n assert.match(main,/X veces por semana/);\n assert.match(main,/Elegí entre 1 y 7 veces por semana/);\n});\n\ntest('enhancements ya no inyecta ni rastrea la frecuencia del hábito',()=>{\n assert.doesNotMatch(enhancements,/enhanceHabitEditor/);\n assert.doesNotMatch(enhancements,/currentHabitId/);\n assert.doesNotMatch(enhancements,/weekly-frequency-grid/);\n});\n\ntest('los estilos de frecuencia viven con la aplicación',()=>{\n assert.match(css,/native weekly frequency/);\n assert.match(css,/\\.weekly-frequency-grid/);\n});\n""")
