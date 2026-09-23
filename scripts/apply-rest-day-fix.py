from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'{label} not found')
    p.write_text(s.replace(old, new, 1))

replace_once(
    'src/selectors.js',
    """export function dayModeAllowsHabit(h,mode){
 if(!h)return false;
 if(mode==='tranquilo'||mode==='descanso')return !!h.essential;
 // Trabajo y Facultad priorizan su área, pero no hacen desaparecer el resto del día.
 if(mode==='trabajo'||mode==='facultad')return true;
 if(mode==='finDeSemana')return h.area!=='trabajo'||!!h.essential;
 return true;
}
""",
    """export function dayModeAllowsHabit(h,mode){
 if(!h)return false;
 // Descanso es una pausa global: no exige hábitos y, por tanto, no rompe rachas.
 if(mode==='descanso')return false;
 // Tranquilo mantiene únicamente lo esencial.
 if(mode==='tranquilo')return !!h.essential;
 // Trabajo y Facultad priorizan su área, pero no hacen desaparecer el resto del día.
 if(mode==='trabajo'||mode==='facultad')return true;
 if(mode==='finDeSemana')return h.area!=='trabajo'||!!h.essential;
 return true;
}
""",
    'selectors block',
)

replace_once(
    'src/planning.js',
    "export function effectiveDayMode(settings,date=dayKey()) {return settings.dayModeDate===date?settings.dayMode:settings.weekModes?.[parseDay(date).getDay()]||settings.dayMode||'habitual';}",
    "export function effectiveDayMode(settings,date=dayKey()) {const override=settings.dayModeOverrides?.[date];if(override)return override;if(settings.dayModeDate===date)return settings.dayMode||'habitual';return settings.weekModes?.[parseDay(date).getDay()]||settings.dayMode||'habitual';}",
    'effectiveDayMode block',
)

replace_once(
    'src/daily.js',
    " return parts.length ? `Hoy hiciste espacio para: ${parts.join('; ')}. ¡Cada paso cuenta!` : 'Cada pequeño paso cuenta. Elegí por dónde querés empezar hoy.';",
    " if(mode==='descanso'&&!parts.length)return 'Hoy es un día de descanso. No tenés hábitos obligatorios y tus rachas quedan protegidas automáticamente.';\n return parts.length ? `Hoy hiciste espacio para: ${parts.join('; ')}. ¡Cada paso cuenta!` : 'Cada pequeño paso cuenta. Elegí por dónde querés empezar hoy.';",
    'daily summary block',
)

p = Path('src/main.js')
s = p.read_text()
old = """${dayMode==='descanso'?'<div class=\"notice\">Hoy podés ir más despacio. Usá “Hoy no” en los hábitos que quieras pausar.</div>':''}<div class=\"habit-grid\">${shown.filter(h=>!window.periodFilter||window.periodFilter==='Todos'||h.period===window.periodFilter).map(h=>habitCard(h,today)).join('')||empty('Tu rutina puede empezar con una pequeña acción.','new-habit','Crear un hábito')}</div>"""
new = """${dayMode==='descanso'?'<div class=\"notice rest-day-notice\"><strong>Día de descanso.</strong> Hoy no tenés hábitos obligatorios y tus rachas quedan protegidas automáticamente.</div>':dayMode==='tranquilo'?'<div class=\"notice calm-day-notice\"><strong>Día tranquilo.</strong> Hoy solo cuentan tus hábitos esenciales; el resto queda fuera del progreso y no rompe tus rachas.</div>':''}<div class=\"habit-grid\">${shown.filter(h=>!window.periodFilter||window.periodFilter==='Todos'||h.period===window.periodFilter).map(h=>habitCard(h,today)).join('')||(dayMode==='descanso'?'<div class=\"empty rest-day-empty\"><i data-lucide=\"moon\"></i><p>Tu rutina está en pausa por hoy. Descansar también cuenta.</p></div>':empty('Tu rutina puede empezar con una pequeña acción.','new-habit','Crear un hábito'))}</div>"""
if old not in s:
    raise SystemExit('rest notice block not found')
s = s.replace(old, new, 1)

old = """<div class=\"progress-ring\" style=\"--progress:${visibleStats.percent*3.6}deg\"><div><strong>${visibleStats.done}<small> / ${visibleStats.total}</small></strong><span>hábitos completos</span><b>${visibleStats.percent}% de tu día</b></div></div>"""
new = """<div class=\"progress-ring ${dayMode==='descanso'?'resting':''}\" style=\"--progress:${dayMode==='descanso'?360:visibleStats.percent*3.6}deg\"><div>${dayMode==='descanso'?`<strong>${icon('Moon')}</strong><span>Día de descanso</span><b>Rachas protegidas</b>`:`<strong>${visibleStats.done}<small> / ${visibleStats.total}</small></strong><span>hábitos completos</span><b>${visibleStats.percent}% de tu día</b>`}</div></div>"""
if old not in s:
    raise SystemExit('progress ring block not found')
s = s.replace(old, new, 1)

old = "if(e.target.id==='day-mode')db.put('settings',{...settings(),dayMode:e.target.value,dayModeDate:dayKey()},'settings');"
new = "if(e.target.id==='day-mode'){const s=settings(),today=dayKey();db.put('settings',{...s,dayModeOverrides:{...(s.dayModeOverrides||{}),[today]:e.target.value},dayModeDate:null},'settings');}"
if old not in s:
    raise SystemExit('day mode change block not found')
s = s.replace(old, new, 1)

old = "${select('Cómo querés vivir hoy','dayMode',[['habitual','Día habitual'],['tranquilo','Día tranquilo'],['descanso','Descanso']],s.dayMode||'habitual')}"
new = "${select('Tipo de día predeterminado','dayMode',[['habitual','Día habitual'],['tranquilo','Día tranquilo'],['descanso','Descanso']],s.dayMode||'habitual')}"
if old not in s:
    raise SystemExit('settings day mode label not found')
s = s.replace(old, new, 1)
p.write_text(s)

p = Path('tests/selectors.test.js')
s = p.read_text()
old = "assert.equal(dayModeAllowsHabit(personal,'tranquilo'),false);\n assert.equal(dayModeAllowsHabit(essential,'descanso'),true);"
new = "assert.equal(dayModeAllowsHabit(personal,'tranquilo'),false);\n assert.equal(dayModeAllowsHabit(essential,'tranquilo'),true);\n assert.equal(dayModeAllowsHabit(personal,'descanso'),false);\n assert.equal(dayModeAllowsHabit(essential,'descanso'),false);"
if old not in s:
    raise SystemExit('selectors test block not found')
p.write_text(s.replace(old, new, 1))

p = Path('tests/domain.test.js')
s = p.read_text()
extra = """
test('Día tranquilo conserva esenciales y Descanso no exige hábitos',()=>{const habits=[{id:'normal',area:'personal',days:[2],essential:false},{id:'essential',area:'personal',days:[2],essential:true}];assert.deepEqual(effectiveHabitsForDate(habits,'2026-09-22','tranquilo').map(h=>h.id),['essential']);assert.deepEqual(effectiveHabitsForDate(habits,'2026-09-22','descanso'),[]);assert.deepEqual(dayStats(habits,[],'2026-09-22','descanso'),{total:0,done:0,skipped:0,percent:0});});
test('un Día de descanso excusa automáticamente la racha sin usar Hoy no',()=>{const h={id:'h',area:'personal',days:[0,1,2,3,4,5,6],essential:true,startDate:'2026-09-20'},logs=[{habitId:'h',date:'2026-09-21',status:'done'},{habitId:'h',date:'2026-09-23',status:'done'}];const mode=d=>d==='2026-09-22'?'descanso':'habitual';assert.equal(streak(h,logs,'2026-09-23',mode),2);});
"""
if "Día tranquilo conserva esenciales y Descanso no exige hábitos" not in s:
    p.write_text(s + extra)

Path('tests/day-modes.test.js').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {effectiveDayMode} from '../src/planning.js';
import {daySummary} from '../src/daily.js';

test('los overrides de tipo de día se conservan por fecha',()=>{
 const settings={dayMode:'habitual',weekModes:{2:'tranquilo'},dayModeOverrides:{'2026-09-22':'descanso'}};
 assert.equal(effectiveDayMode(settings,'2026-09-22'),'descanso');
 assert.equal(effectiveDayMode(settings,'2026-09-29'),'tranquilo');
});

test('el resumen de descanso explica que las rachas quedan protegidas',()=>{
 const text=daySummary({habits:[{id:'h',name:'Agua',area:'salud',days:[2],essential:true}],logs:[]},'2026-09-22','descanso');
 assert.match(text,/día de descanso/i);
 assert.match(text,/rachas quedan protegidas/i);
});

test('Mi día diferencia visualmente Tranquilo de Descanso y no pide usar Hoy no',()=>{
 const src=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(src,/Día de descanso.*no tenés hábitos obligatorios.*rachas quedan protegidas/s);
 assert.match(src,/Día tranquilo.*solo cuentan tus hábitos esenciales/s);
 assert.doesNotMatch(src,/Usá “Hoy no” en los hábitos que quieras pausar/);
 assert.match(src,/dayModeOverrides/);
});
""")
