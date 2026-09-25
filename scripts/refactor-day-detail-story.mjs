import fs from 'node:fs';

const mainPath='src/main.js';
let main=fs.readFileSync(mainPath,'utf8');
const importNeedle="import {dailyPlannerLayout} from './daily-planner.js';";
if(!main.includes("import {dayDetailData} from './day-detail-data.js';")){
 if(!main.includes(importNeedle))throw new Error('No se encontró import de daily planner');
 main=main.replace(importNeedle,`${importNeedle}\nimport {dayDetailData} from './day-detail-data.js';`);
}

const start=main.indexOf('function dayDetailView(d){');
const end=main.indexOf('\nfunction calendarView(){',start);
if(start<0||end<0)throw new Error('No se encontró dayDetailView');
const fn=`function dayDetailView(d){
 const events=rec('event').filter(e=>occurs(e,d)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 const mode=effectiveDayMode(settings(),d),habits=effectiveHabitsForDate(rec('habit'),d,mode);
 const rows=habits.map(h=>({h,status:habitStatus(h,rec('log'),d)})),done=rows.filter(({status})=>status.done).length;
 const day=dayDetailData({date:d,journals:rec('journal'),dailyPlans:rec('dailyPlan'),tasks:rec('task'),readings:rec('reading'),logs:rec('log')});
 const modeLabel=({habitual:'Habitual',tranquilo:'Tranquilo',descanso:'Descanso',trabajo:'Trabajo',facultad:'Facultad',finDeSemana:'Fin de semana'})[mode]||mode;
 const moodEmoji=['','😔','😐','🙂','😊','🤩'][day.mood]||'—';
 const moodLabel=['Sin registro','Difícil','Más o menos','Bien','Muy bien','Con mucha energía'][day.mood]||'Sin registro';
 const holiday=holidayOn(d),today=d===dayKey();
 const habitRows=rows.map(({h,status})=>{const label=status.done?'Hecho':status.skip?'Pausa':status.partial?(status.hydration?\`${'${'}Math.round(status.value/10)/100} / ${'${'}Math.round(status.target/10)/100} L\`:'En progreso'):'Pendiente';return \`<button class="day-detail-habit ${'${'}status.done?'done':status.skip?'paused':''}" data-action="habit-action" data-id="${'${'}h.id}" data-date="${'${'}d}">${'${'}icon(status.done?'CheckCircle2':h.icon)}<span><strong>${'${'}esc(h.name)}</strong><small>${'${'}label}</small></span></button>\`;}).join('');
 const taskRows=day.tasks.map(t=>\`<button class="day-detail-item ${'${'}t.done?'done':''}" data-action="edit-task" data-id="${'${'}t.id}">${'${'}icon(t.done?'CheckCircle2':'Check')}<span><strong>${'${'}esc(t.name)}</strong><small>${'${'}t.done?'Completada':t.priority==='alta'?'Prioridad alta':'Pendiente'} · ${'${'}esc(area(t.area).name)}</small></span></button>\`).join('');
 const readingRows=day.readings.map(r=>\`<button class="day-detail-item" data-action="library">${'${'}icon('BookOpen')}<span><strong>${'${'}esc(readingTitle(r))}</strong><small>${'${'}Number(r.minutes)||0} min de lectura</small></span></button>\`).join('');
 const reflections=[day.gratitude?\`<div><small>Gratitud</small><p>${'${'}esc(day.gratitude)}</p></div>\`:'',day.notes?\`<div><small>Notas</small><p>${'${'}esc(day.notes)}</p></div>\`:'',day.diary?.text?\`<div><small>Diario</small><p>${'${'}esc(day.diary.text)}</p></div>\`:''].filter(Boolean).join('');
 const measures=day.bodyLog?[['weight','Peso','kg'],['waist','Cintura','cm'],['hips','Cadera','cm'],['chest','Pecho','cm'],['arm','Brazo','cm'],['fat','Grasa','%']].filter(([k])=>day.bodyLog[k]!==''&&day.bodyLog[k]!==null&&day.bodyLog[k]!==undefined).map(([k,label,unit])=>\`<span><small>${'${'}label}</small><strong>${'${'}esc(day.bodyLog[k])} ${'${'}unit}</strong></span>\`).join(''):'';
 const photos=day.workoutPhotos.map(p=>\`<figure class="day-detail-photo"><div class="gym-photo-img" data-gym-photo="${'${'}esc(p.path)}"><span>Cargando…</span></div>${'${'}p.text?\`<figcaption>${'${'}esc(p.text)}</figcaption>\`:''}</figure>\`).join('');
 const extras=[...day.achievements.map(r=>({icon:'Sparkles',label:r.text||r.name||r.note||'Logro registrado'})),...day.englishPractices.map(r=>({icon:'Languages',label:r.text||r.topic||r.note||'Práctica de inglés'}))];
 const extraRows=extras.map(x=>\`<div class="day-detail-note-row">${'${'}icon(x.icon)}<span>${'${'}esc(x.label)}</span></div>\`).join('');
 return \`<aside class="day-detail-wrap" data-day-detail="${'${'}d}"><section class="panel day-detail-card" aria-labelledby="day-detail-title">
  <header class="day-detail-head"><div><p class="day-detail-kicker">Ficha del día</p><h2 id="day-detail-title">${'${'}prettyDate(d,{day:'numeric',month:'long'})}</h2><p>${'${'}prettyDate(d,{weekday:'long',year:'numeric'})}</p></div><div class="day-detail-badges">${'${'}today?'<span class="day-detail-today">Hoy</span>':''}<span class="day-detail-mode-pill">${'${'}esc(modeLabel)}</span></div></header>
  ${'${'}holiday?\`<div class="day-detail-holiday">Feriado · ${'${'}esc(holiday.name)}</div>\`:''}
  <div class="day-detail-glance" aria-label="Resumen del día"><div><strong class="day-detail-mood">${'${'}moodEmoji}</strong><span>${'${'}esc(moodLabel)}</span></div><div><strong>${'${'}day.waterLiters.toLocaleString('es-PY')}<small> L</small></strong><span>agua</span></div><div><strong>${'${'}day.readingMinutes}<small> min</small></strong><span>lectura</span></div><div><strong>${'${'}day.tasksDone}<small>/${'${'}day.tasks.length}</small></strong><span>tareas</span></div></div>
  ${'${'}day.priorities.length?\`<section class="day-detail-section day-detail-priority-section"><div class="day-detail-section-head"><div><p class="day-detail-label">Prioridades</p><h3>Lo importante de este día</h3></div></div><ol class="day-detail-priorities">${'${'}day.priorities.map(p=>\`<li>${'${'}esc(p)}</li>\`).join('')}</ol></section>\`:''}
  <section class="day-detail-section"><div class="day-detail-section-head"><div><p class="day-detail-label">Agenda</p><h3>Lo que tenías previsto</h3></div>${'${'}btn(icon('Plus'),'new-event','aria-label="Agregar evento"','icon-button')}</div><div class="day-detail-events">${'${'}events.map(e=>eventCard(e,d)).join('')||'<p class="day-detail-empty">Sin eventos para este día.</p>'}</div></section>
  ${'${'}day.tasks.length?\`<section class="day-detail-section"><div class="day-detail-section-head"><div><p class="day-detail-label">Tareas</p><h3>Pendientes de esa fecha</h3></div><span class="day-detail-count">${'${'}day.tasksDone} de ${'${'}day.tasks.length}</span></div><div class="day-detail-list">${'${'}taskRows}</div></section>\`:''}
  <section class="day-detail-section"><div class="day-detail-section-head"><div><p class="day-detail-label">Hábitos</p><h3>Tu ritmo de este día</h3></div><span class="day-detail-count">${'${'}done} de ${'${'}habits.length}</span></div><div class="day-detail-habits">${'${'}habitRows||'<p class="day-detail-empty">No hay hábitos programados.</p>'}</div></section>
  ${'${'}day.readings.length?\`<section class="day-detail-section"><div class="day-detail-section-head"><div><p class="day-detail-label">Lectura</p><h3>Tu momento entre páginas</h3></div><span class="day-detail-count">${'${'}day.readingMinutes} min</span></div><div class="day-detail-list">${'${'}readingRows}</div></section>\`:''}
  ${'${'}day.hasReflection?\`<section class="day-detail-section"><div class="day-detail-section-head"><div><p class="day-detail-label">Tu espacio</p><h3>Lo que quisiste guardar</h3></div></div>${'${'}reflections?\`<div class="day-detail-reflections">${'${'}reflections}</div>\`:''}</section>\`:''}
  ${'${'}(measures||photos)?\`<section class="day-detail-section"><div class="day-detail-section-head"><div><p class="day-detail-label">Bienestar</p><h3>Gym, cuerpo y fotos</h3></div>${'${'}day.workoutPhotos.length?\`<span class="day-detail-count">${'${'}day.workoutPhotos.length} ${'${'}day.workoutPhotos.length===1?'foto':'fotos'}</span>\`:''}</div>${'${'}measures?\`<div class="day-detail-measures">${'${'}measures}</div>\`:''}${'${'}photos?\`<div class="day-detail-photos">${'${'}photos}</div>\`:''}</section>\`:''}
  ${'${'}extraRows?\`<section class="day-detail-section"><div class="day-detail-section-head"><div><p class="day-detail-label">También registraste</p><h3>Otros momentos del día</h3></div></div><div class="day-detail-notes">${'${'}extraRows}</div></section>\`:''}
 </section></aside>\`;
}`;
main=main.slice(0,start)+fn+main.slice(end);
fs.writeFileSync(mainPath,main);

const cssPath='src/native-ui.css';
let css=fs.readFileSync(cssPath,'utf8');
if(!css.includes('/* Historia completa de la ficha diaria */')){
 css+=`\n/* Historia completa de la ficha diaria */\n.day-detail-badges{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap}.day-detail-mode-pill{display:inline-flex;align-items:center;min-height:28px;padding:5px 9px;border-radius:999px;border:1px solid var(--line);color:var(--muted);font-size:10px;font-weight:650}.day-detail-glance{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:0 22px;border-bottom:1px solid var(--line)}.day-detail-glance>div{padding:17px 8px 15px 0;min-width:0;display:flex;flex-direction:column;gap:4px}.day-detail-glance strong{font-family:var(--serif);font-size:22px;font-weight:500;line-height:1.1;white-space:nowrap}.day-detail-glance strong small{font-family:'DM Sans',sans-serif;font-size:10px;color:var(--muted)}.day-detail-glance span{font-size:9px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.day-detail-glance .day-detail-mood{font-family:'DM Sans',sans-serif;font-size:24px}.day-detail-priorities{margin:0;padding:0;list-style:none;display:grid;gap:7px;counter-reset:prioridad}.day-detail-priorities li{counter-increment:prioridad;display:grid;grid-template-columns:25px 1fr;align-items:center;gap:8px;font-size:11px;line-height:1.45}.day-detail-priorities li:before{content:counter(prioridad);width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:var(--soft);color:var(--green);font-size:9px;font-weight:700}.day-detail-list{display:grid;gap:4px}.day-detail-item{width:100%;display:flex;align-items:center;gap:10px;text-align:left;padding:9px 8px;border-radius:9px;min-height:46px}.day-detail-item:hover{background:var(--soft)}.day-detail-item>svg{width:17px;height:17px;color:var(--muted)}.day-detail-item.done>svg{color:var(--green)}.day-detail-item span{display:flex;flex-direction:column;gap:2px;min-width:0}.day-detail-item strong{font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.day-detail-item small{font-size:9px;color:var(--muted)}.day-detail-reflections{display:grid;gap:10px}.day-detail-reflections>div{padding:11px 12px;border-radius:10px;background:color-mix(in srgb,var(--soft) 65%,transparent)}.day-detail-reflections small{display:block;margin-bottom:4px;font-size:9px;font-weight:650;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)}.day-detail-reflections p{margin:0;font-size:11px;line-height:1.55;white-space:pre-wrap}.day-detail-measures{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.day-detail-measures>span{display:flex;flex-direction:column;gap:2px;padding:8px 10px;border:1px solid var(--line);border-radius:9px}.day-detail-measures small{font-size:8px;color:var(--muted)}.day-detail-measures strong{font-size:10px;font-weight:650}.day-detail-photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.day-detail-photo{margin:0;min-width:0}.day-detail-photo .gym-photo-img{aspect-ratio:4/5;border-radius:10px;overflow:hidden;background:var(--soft)}.day-detail-photo .gym-photo-img img{width:100%;height:100%;object-fit:cover}.day-detail-photo figcaption{font-size:9px;color:var(--muted);margin-top:5px;line-height:1.4}.day-detail-notes{display:grid;gap:7px}.day-detail-note-row{display:flex;align-items:flex-start;gap:9px;padding:8px 0;font-size:11px}.day-detail-note-row svg{width:15px;height:15px;color:var(--green);margin-top:1px}@media(max-width:900px){.day-detail-glance{margin:0 18px}}@media(max-width:520px){.day-detail-glance{grid-template-columns:repeat(2,minmax(0,1fr))}.day-detail-glance>div{padding:13px 8px 12px 0}.day-detail-photos{grid-template-columns:repeat(2,minmax(0,1fr))}.day-detail-badges{justify-content:flex-start}.day-detail-head{flex-direction:column}}\n`;
 fs.writeFileSync(cssPath,css);
}

const e2ePath='e2e/calendar-day-detail.spec.js';
let e2e=fs.readFileSync(e2ePath,'utf8');
e2e=e2e.replace(" await expect(page.locator('.day-detail-summary')).toBeVisible();\n await expect(page.locator('.day-detail-section')).toHaveCount(2);"," await expect(page.locator('.day-detail-glance')).toBeVisible();\n expect(await page.locator('.day-detail-section').count()).toBeGreaterThanOrEqual(2);");
fs.writeFileSync(e2ePath,e2e);

const testPath='tests/calendar-day-detail.test.js';
let test=fs.readFileSync(testPath,'utf8');
if(!test.includes('dayDetailData')){
 test=test.replace("assert.match(main,/function dayDetailView\\(d\\)/);","assert.match(main,/function dayDetailView\\(d\\)/);\n assert.match(main,/dayDetailData/);\n assert.match(main,/day-detail-glance/);\n assert.match(main,/Prioridades/);\n assert.match(main,/Lectura/);\n assert.match(main,/Gym, cuerpo y fotos/);");
}
fs.writeFileSync(testPath,test);

console.log('Ficha diaria enriquecida con la historia del día.');
