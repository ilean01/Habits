from pathlib import Path

path=Path('src/main.js')
source=path.read_text(encoding='utf-8')

def once(old,new,label):
    global source
    if old not in source:
        raise SystemExit(f'Missing expected source for {label}')
    source=source.replace(old,new,1)

once("import './app-shell.css';\n","import './app-shell.css';\nimport './sleep-rating.css';\n",'sleep CSS import')
once("import {calendarDayIndicators,compactLiters} from './calendar-day-indicators.js';\n","import {calendarDayIndicators,compactLiters} from './calendar-day-indicators.js';\nimport {sleepLabel,sleepStars,normalizeSleep} from './sleep-rating.js';\n",'sleep helper import')

once("visibleStats=day.stats;return `${heading(","visibleStats=day.stats,sleep=normalizeSleep(day.detail.sleep);return `${heading(",'today sleep state')

old_reflection="""<section class=\"reflection-card\"><span>${icon('Heart')}</span><h3>¿Cómo te sentís hoy?</h3><p>Tomate un momento para escucharte.</p><div class=\"moods\">${['😔','😐','🙂','😊','🤩'].map((m,i)=>btn(m,'mood',`data-mood=\"${i+1}\" aria-label=\"Ánimo ${i+1} de 5\"`,rec('journal').some(j=>j.date===today&&!j.achievement&&!j.workoutPhoto&&!j.englishPractice&&j.mood===i+1)?'chosen':'')).join('')}</div></section>"""
new_reflection="""<section class=\"reflection-card\"><span>${icon('Heart')}</span><h3>¿Cómo te sentís hoy?</h3><p>Tomate un momento para escucharte.</p><div class=\"moods\">${['😔','😐','🙂','😊','🤩'].map((m,i)=>btn(m,'mood',`data-mood=\"${i+1}\" aria-label=\"Ánimo ${i+1} de 5\"`,rec('journal').some(j=>j.date===today&&!j.achievement&&!j.workoutPhoto&&!j.englishPractice&&j.mood===i+1)?'chosen':'')).join('')}</div><div class=\"sleep-checkin\"><h4>¿Cómo dormiste?</h4><p>Marcá cómo sentiste tu descanso de anoche.</p><div class=\"sleep-stars\" role=\"group\" aria-label=\"Calidad del sueño\">${[1,2,3,4,5].map(n=>btn('★','sleep',`data-sleep=\"${n}\" aria-label=\"${sleepLabel(n)}: ${n} de 5 estrellas\"`,n<=sleep?'sleep-star filled'+(n===sleep?' chosen':''):'sleep-star')).join('')}</div><small class=\"sleep-rating-caption\">${sleep?`${sleepStars(sleep)} · ${sleepLabel(sleep)}`:'Tocá de 1 a 5 estrellas'}</small></div></section>"""
once(old_reflection,new_reflection,'today sleep check-in')

old_journal="""if(kind==='journal')fields=`${input('Fecha','date',r.date||dayKey(),'date','required')}${!r.achievement?select('¿Cómo te sentiste?','mood',[[1,'😔 Un día difícil'],[2,'😐 Más o menos'],[3,'🙂 Bien'],[4,'😊 Muy bien'],[5,'🤩 Con mucha energía']],r.mood||3):''}${textarea(r.achievement?'¿Qué lograste?':'¿Qué te gustaría recordar?','text',r.text)}`;"""
new_journal="""if(kind==='journal')fields=`${input('Fecha','date',r.date||dayKey(),'date','required')}${!r.achievement?select('¿Cómo te sentiste?','mood',[[1,'😔 Un día difícil'],[2,'😐 Más o menos'],[3,'🙂 Bien'],[4,'😊 Muy bien'],[5,'🤩 Con mucha energía']],r.mood||3):''}${!r.achievement?`<fieldset class=\"sleep-rating-field\"><legend>¿Cómo dormiste?</legend><div class=\"sleep-stars\">${[1,2,3,4,5].map(n=>`<label class=\"${n<=normalizeSleep(r.sleep)?'selected':''}\"><input type=\"radio\" name=\"sleep\" value=\"${n}\" ${normalizeSleep(r.sleep)===n?'checked':''} aria-label=\"${sleepLabel(n)}: ${n} de 5 estrellas\"><span aria-hidden=\"true\">★</span></label>`).join('')}</div><small class=\"sleep-rating-caption\">${normalizeSleep(r.sleep)?`${sleepStars(r.sleep)} · ${sleepLabel(r.sleep)}`:'Opcional · 1 estrella es muy mal, 5 es excelente'}</small></fieldset>`:''}${textarea(r.achievement?'¿Qué lograste?':'¿Qué te gustaría recordar?','text',r.text)}`;"""
once(old_journal,new_journal,'journal sleep field')
once("if(kind==='journal'){data.mood=Number(data.mood)||null;data.at=r.at||new Date().toISOString();}","if(kind==='journal'){data.mood=Number(data.mood)||null;data.sleep=normalizeSleep(data.sleep)||null;data.at=r.at||new Date().toISOString();}",'journal sleep save')

old_glance="""<div class=\"day-detail-glance\" aria-label=\"Resumen del día\"><div><strong class=\"day-detail-mood\">${moodEmoji}</strong><span>${esc(moodLabel)}</span></div><div><strong>${day.waterLiters.toLocaleString('es-PY')}<small> L</small></strong><span>agua</span></div><div><strong>${day.readingMinutes}<small> min</small></strong><span>lectura</span></div><div><strong>${day.tasksDone}<small>/${day.tasks.length}</small></strong><span>tareas</span></div></div>"""
new_glance="""<div class=\"day-detail-glance\" aria-label=\"Resumen del día\"><div><strong class=\"day-detail-mood\">${moodEmoji}</strong><span>${esc(moodLabel)}</span></div><div><strong class=\"day-detail-sleep-stars\">${sleepStars(day.sleep)}</strong><span>${day.sleep?`sueño · ${esc(sleepLabel(day.sleep))}`:'sueño sin registrar'}</span></div><div><strong>${day.waterLiters.toLocaleString('es-PY')}<small> L</small></strong><span>agua</span></div><div><strong>${day.readingMinutes}<small> min</small></strong><span>lectura</span></div><div><strong>${day.tasksDone}<small>/${day.tasks.length}</small></strong><span>tareas</span></div></div>"""
once(old_glance,new_glance,'day detail sleep glance')

once("const mood=info.mood?`<span class=\"calendar-signal mood\" title=\"Ánimo: ${esc(info.mood.label)}\" aria-label=\"Ánimo: ${esc(info.mood.label)}\">${info.mood.emoji}</span>`:'';","const mood=info.mood?`<span class=\"calendar-signal mood\" title=\"Ánimo: ${esc(info.mood.label)}\" aria-label=\"Ánimo: ${esc(info.mood.label)}\">${info.mood.emoji}</span>`:'';\n const sleep=info.sleep?`<span class=\"calendar-signal sleep\" title=\"Sueño: ${esc(info.sleep.label)} (${info.sleep.value}/5)\" aria-label=\"Sueño: ${esc(info.sleep.label)}, ${info.sleep.value} de 5 estrellas\">★<span>${info.sleep.value}</span></span>`:'';",'calendar sleep signal')
once("return `<div class=\"calendar-indicators\">${mood}${water}${photos}${done}</div>`;","return `<div class=\"calendar-indicators\">${mood}${sleep}${water}${photos}${done}</div>`;",'calendar sleep output')

old_journal_view="""<h3>${['','😔','😐','🙂','😊','🤩'][j.mood||0]||'Mi día'}</h3><p>${esc(j.text||'Hoy me tomé un momento para registrar cómo me sentía.')}</p>"""
new_journal_view="""<h3>${['','😔','😐','🙂','😊','🤩'][j.mood||0]||'Mi día'}</h3>${normalizeSleep(j.sleep)?`<span class=\"journal-sleep\">${sleepStars(j.sleep)} · ${sleepLabel(j.sleep)}</span>`:''}<p>${esc(j.text||'Hoy me tomé un momento para registrar cómo me sentía.')}</p>"""
once(old_journal_view,new_journal_view,'journal card sleep summary')

old_action="""if(a==='mood'){const existing=diaryEntries(rec('journal')).find(j=>j.date===dayKey());editor('journal',existing?.id||'',{date:dayKey(),mood:Number(el.dataset.mood)});return;}if(a==='journal'){"""
new_action="""if(a==='mood'){const existing=diaryEntries(rec('journal')).find(j=>j.date===dayKey());editor('journal',existing?.id||'',{date:dayKey(),mood:Number(el.dataset.mood)});return;}if(a==='sleep'){const value=normalizeSleep(el.dataset.sleep);if(!value)return;const existing=diaryEntries(rec('journal')).find(j=>j.date===dayKey());const data={...(existing||{}),date:dayKey(),sleep:value,at:existing?.at||new Date().toISOString()};delete data.id;db.put('journal',data,existing?.id||undefined);toast(`Sueño guardado · ${sleepStars(value)} ${sleepLabel(value)}`);return;}if(a==='journal'){"""
once(old_action,new_action,'quick sleep action')

path.write_text(source,encoding='utf-8')
