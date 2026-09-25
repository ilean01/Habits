import fs from 'node:fs';

const mainPath='src/main.js';
let main=fs.readFileSync(mainPath,'utf8');

if(main.includes('function dayDetailView('))throw new Error('dayDetailView ya existe');
const calendarMarker='function calendarView(){';
const calendarStart=main.indexOf(calendarMarker);
if(calendarStart<0)throw new Error('No se encontró calendarView');

const helper=`function dayDetailView(d){
 const events=rec('event').filter(e=>occurs(e,d)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
 const mode=effectiveDayMode(settings(),d),habits=effectiveHabitsForDate(rec('habit'),d,mode);
 const rows=habits.map(h=>({h,status:habitStatus(h,rec('log'),d)})),done=rows.filter(({status})=>status.done).length;
 const modeLabel=({habitual:'Habitual',tranquilo:'Tranquilo',descanso:'Descanso',trabajo:'Trabajo',facultad:'Facultad',finDeSemana:'Fin de semana'})[mode]||mode;
 const holiday=holidayOn(d),today=d===dayKey();
 const habitRows=rows.map(({h,status})=>{const label=status.done?'Hecho':status.skip?'Pausa':status.partial?(status.hydration?\`${'${'}Math.round(status.value/10)/100} / ${'${'}Math.round(status.target/10)/100} L\`:'En progreso'):'Pendiente';return \`<button class="day-detail-habit ${'${'}status.done?'done':status.skip?'paused':''}" data-action="habit-action" data-id="${'${'}h.id}" data-date="${'${'}d}">${'${'}icon(status.done?'CheckCircle2':h.icon)}<span><strong>${'${'}esc(h.name)}</strong><small>${'${'}label}</small></span></button>\`;}).join('');
 return \`<aside class="day-detail-wrap" data-day-detail="${'${'}d}"><section class="panel day-detail-card" aria-labelledby="day-detail-title">
  <header class="day-detail-head"><div><p class="day-detail-kicker">Ficha del día</p><h2 id="day-detail-title">${'${'}prettyDate(d,{day:'numeric',month:'long'})}</h2><p>${'${'}prettyDate(d,{weekday:'long',year:'numeric'})}</p></div>${'${'}today?'<span class="day-detail-today">Hoy</span>':''}</header>
  ${'${'}holiday?\`<div class="day-detail-holiday">Feriado · ${'${'}esc(holiday.name)}</div>\`:''}
  <div class="day-detail-summary" aria-label="Resumen del día"><div><strong>${'${'}events.length}</strong><span>${'${'}events.length===1?'evento':'eventos'}</span></div><div><strong>${'${'}done}<small>/${'${'}habits.length}</small></strong><span>hábitos</span></div><div><strong class="day-detail-mode">${'${'}esc(modeLabel)}</strong><span>modo del día</span></div></div>
  <section class="day-detail-section"><div class="day-detail-section-head"><div><p class="day-detail-label">Agenda</p><h3>Lo que tenés previsto</h3></div>${'${'}btn(icon('Plus'),'new-event','aria-label="Agregar evento"','icon-button')}</div><div class="day-detail-events">${'${'}events.map(e=>eventCard(e,d)).join('')||'<p class="day-detail-empty">Sin eventos para este día.</p>'}</div></section>
  <section class="day-detail-section"><div class="day-detail-section-head"><div><p class="day-detail-label">Hábitos</p><h3>Tu ritmo de este día</h3></div><span class="day-detail-count">${'${'}done} de ${'${'}habits.length}</span></div><div class="day-detail-habits">${'${'}habitRows||'<p class="day-detail-empty">No hay hábitos programados.</p>'}</div></section>
 </section></aside>\`;
}
`;
main=main.slice(0,calendarStart)+helper+main.slice(calendarStart);

const newCalendarStart=main.indexOf(calendarMarker);
const calendarEnd=main.indexOf('\nfunction upcomingForArea',newCalendarStart);
if(calendarEnd<0)throw new Error('No se encontró el final de calendarView');
let calendarBlock=main.slice(newCalendarStart,calendarEnd);
const asideStart=calendarBlock.indexOf('<aside><section class="panel"><p class="eyebrow">');
const asideClose=calendarBlock.lastIndexOf('</aside>');
if(asideStart<0||asideClose<0||asideClose<=asideStart)throw new Error('No se encontró el panel lateral viejo del Calendario');
calendarBlock=calendarBlock.slice(0,asideStart)+'${dayDetailView(date)}'+calendarBlock.slice(asideClose+'</aside>'.length);
main=main.slice(0,newCalendarStart)+calendarBlock+main.slice(calendarEnd);

const oldDateAction="if(a==='date'){date=d;month=d.slice(0,7);view='calendar';render();return;}";
const newDateAction="if(a==='date'){const fromCalendar=view==='calendar';date=d;month=d.slice(0,7);view='calendar';render();if(fromCalendar&&window.matchMedia('(max-width:900px)').matches)requestAnimationFrame(()=>document.querySelector('[data-day-detail]')?.scrollIntoView({behavior:'smooth',block:'start'}));return;}";
if(!main.includes(oldDateAction))throw new Error('No se encontró la acción de fecha');
main=main.replace(oldDateAction,newDateAction);
fs.writeFileSync(mainPath,main);

const cssPath='src/native-ui.css';
let css=fs.readFileSync(cssPath,'utf8');
if(css.includes('.day-detail-card'))throw new Error('Los estilos de ficha diaria ya existen');
css+=`\n/* Ficha limpia del día en Calendario */\n.day-detail-wrap{min-width:0}.day-detail-card{padding:0;overflow:hidden}.day-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 22px 18px;border-bottom:1px solid var(--line)}.day-detail-kicker,.day-detail-label{margin:0 0 6px;font-size:9px;font-weight:700;letter-spacing:1.35px;text-transform:uppercase;color:var(--muted)}.day-detail-head h2{margin:0 0 4px;font-size:26px}.day-detail-head p:last-child{margin:0;color:var(--muted);font-size:12px;text-transform:capitalize}.day-detail-today{display:inline-flex;align-items:center;min-height:28px;padding:5px 9px;border-radius:999px;background:var(--soft);color:var(--green);font-size:10px;font-weight:700}.day-detail-holiday{margin:14px 22px 0;padding:10px 12px;border-radius:9px;background:color-mix(in srgb,var(--accent) 10%,var(--panel));color:#806847;font-size:11px}.day-detail-summary{display:grid;grid-template-columns:.8fr .9fr 1.3fr;margin:0 22px;border-bottom:1px solid var(--line)}.day-detail-summary>div{padding:18px 10px 16px 0;display:flex;flex-direction:column;gap:3px}.day-detail-summary strong{font-family:var(--serif);font-size:25px;font-weight:500;color:var(--text);line-height:1}.day-detail-summary strong small{font-family:'DM Sans',sans-serif;font-size:12px;color:var(--muted)}.day-detail-summary span{font-size:9px;color:var(--muted)}.day-detail-summary .day-detail-mode{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:650;line-height:1.2;padding-top:3px}.day-detail-section{padding:20px 22px;border-bottom:1px solid var(--line)}.day-detail-section:last-child{border-bottom:0}.day-detail-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.day-detail-section-head h3{margin:0;font-family:var(--serif);font-size:18px;font-weight:500}.day-detail-section-head .day-detail-label{margin-bottom:3px}.day-detail-count{font-size:10px;color:var(--muted)}.day-detail-events .event-card:last-child{margin-bottom:0}.day-detail-empty{margin:0;padding:7px 0;color:var(--muted);font-size:11px}.day-detail-habits{display:grid;gap:5px}.day-detail-habit{width:100%;display:flex;align-items:center;gap:10px;text-align:left;padding:9px 8px;border-radius:9px;min-height:46px}.day-detail-habit:hover{background:var(--soft)}.day-detail-habit>svg{width:17px;height:17px;color:var(--muted)}.day-detail-habit.done>svg{color:var(--green)}.day-detail-habit.paused{opacity:.65}.day-detail-habit span{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;flex:1}.day-detail-habit strong{font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.day-detail-habit small{font-size:9px;color:var(--muted);white-space:nowrap}@media(min-width:901px){.day-detail-wrap{position:sticky;top:96px;align-self:start}}@media(max-width:900px){.day-detail-wrap{margin-top:18px;scroll-margin-top:92px}.day-detail-head{padding:20px 18px 16px}.day-detail-summary{margin:0 18px}.day-detail-section{padding:18px}.day-detail-head h2{font-size:24px}}\n`;
fs.writeFileSync(cssPath,css);

const unit=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {readFile} from 'node:fs/promises';\nconst read=path=>readFile(new URL(\`../\${path}\`,import.meta.url),'utf8');\n\ntest('Calendario usa una ficha del día única y limpia',async()=>{\n const [main,css]=await Promise.all([read('src/main.js'),read('src/native-ui.css')]);\n assert.match(main,/function dayDetailView\\(d\\)/);\n assert.match(main,/data-day-detail/);\n assert.match(main,/Ficha del día/);\n assert.match(main,/dayDetailView\\(date\\)/);\n assert.doesNotMatch(main,/class=\\"panel day-history\\"/);\n assert.match(css,/\\.day-detail-card/);\n assert.match(css,/scroll-margin-top/);\n});\n`;
fs.writeFileSync('tests/calendar-day-detail.test.js',unit);

const e2e=`import {test,expect} from '@playwright/test';\n\nasync function enterDemo(page){\n await page.goto('/');\n await page.getByRole('button',{name:/Explorar la demo/i}).click();\n await expect(page.locator('.day-hero')).toBeVisible();\n}\n\ntest('tocar un día muestra una ficha única y limpia',async({page})=>{\n await enterDemo(page);\n await page.locator('[data-action=\"nav\"][data-view=\"calendar\"]:visible').first().click();\n await expect(page.locator('[data-day-detail]')).toBeVisible();\n await expect(page.getByText('Ficha del día',{exact:true})).toBeVisible();\n const cells=page.locator('.calendar-cell:visible');\n await cells.nth(15).click();\n await expect(page.locator('[data-day-detail]')).toBeVisible();\n await expect(page.locator('.day-detail-summary')).toBeVisible();\n await expect(page.locator('.day-detail-section')).toHaveCount(2);\n await expect(page.locator('.day-history')).toHaveCount(0);\n});\n`;
fs.writeFileSync('e2e/calendar-day-detail.spec.js',e2e);

console.log('Ficha del día integrada al Calendario.');
