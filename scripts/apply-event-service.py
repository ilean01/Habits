from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path)
    s=p.read_text()
    if old not in s:
        raise SystemExit(f'{label} not found')
    p.write_text(s.replace(old,new,1))

Path('src/event-service.js').write_text("""import {findEventConflicts,conflictMessage} from './schedule-conflicts.js';

export function validateEventTiming(candidate){
 if(!candidate)return candidate;
 if(candidate.end&&!candidate.time)throw new Error('Indicá una hora inicial.');
 if(candidate.end&&candidate.end<=candidate.time)throw new Error('La hora final debe ser posterior a la inicial.');
 if(candidate.until&&candidate.until<candidate.date)throw new Error('La fecha final no puede ser anterior al inicio.');
 return candidate;
}

export function assessEventConflicts(candidate,events,{ignoreId='',days=180,occurrenceDate=''}={}){
 validateEventTiming(candidate);
 const checked=occurrenceDate?{...candidate,date:occurrenceDate,repeat:'none',until:''}:candidate;
 const conflicts=findEventConflicts(checked,events,{ignoreId,days});
 return {candidate:checked,conflicts,message:conflictMessage(conflicts)};
}

export function authorizeEventSave(candidate,events,{ignoreId='',days=180,occurrenceDate='',confirmConflict}={}){
 const assessment=assessEventConflicts(candidate,events,{ignoreId,days,occurrenceDate});
 if(!assessment.conflicts.length)return {...assessment,allowed:true};
 const allowed=typeof confirmConflict==='function'&&!!confirmConflict(assessment.message,assessment.conflicts);
 return {...assessment,allowed};
}
""")

replace_once(
 'src/main.js',
 "import {findEventConflicts,conflictMessage} from './schedule-conflicts.js';",
 "import {authorizeEventSave} from './event-service.js';",
 'main conflict import'
)

replace_once(
 'src/main.js',
 "if(kind==='event'){if(data.end&&!data.time)throw new Error('Indicá una hora inicial.');if(data.end&&data.end<=data.time)throw new Error('La hora final debe ser posterior a la inicial.');if(data.until&&data.until<data.date)throw new Error('La fecha final no puede ser anterior al inicio.');const conflicts=findEventConflicts(data,rec('event'),{ignoreId:id,days:180});if(conflicts.length&&!confirm(conflictMessage(conflicts)+' ¿Querés guardar igualmente?'))return;}",
 "if(kind==='event'){const decision=authorizeEventSave(data,rec('event'),{ignoreId:id,days:180,occurrenceDate:r._occurrenceDate||'',confirmConflict:message=>confirm(message+' ¿Querés guardar igualmente?')});if(!decision.allowed)return;}",
 'main event guard'
)

replace_once(
 'src/main.js',
 "if(await planningAction(a,el,{showModal,input,textarea,select,modal,toast}))return;",
 "if(await planningAction(a,el,{showModal,input,textarea,select,modal,toast,confirmEventConflict:message=>confirm(message+' ¿Querés guardar igualmente?')}))return;",
 'planning action dependency'
)

replace_once(
 'src/planning.js',
 "import {effectiveDayMode} from './day-modes.js';",
 "import {effectiveDayMode} from './day-modes.js';\nimport {authorizeEventSave} from './event-service.js';",
 'planning import'
)

replace_once(
 'src/planning.js',
 "export async function planningAction(a,el,{showModal,input,textarea,select,modal,toast}){",
 "export async function planningAction(a,el,{showModal,input,textarea,select,modal,toast,confirmEventConflict}){",
 'planning signature'
)

old="if(a==='plan-schedule')showModal('Horario semanal',`<form>${input('Nombre','name','','text','required')}${select('Área','area',[['trabajo','Trabajo'],['facultad','Facultad'],['ingles','Inglés']],'trabajo')}${input('Primera fecha','date',dayKey(),'date','required')}${input('Hora inicial','time','08:00','time','required')}${input('Hora final','end','09:00','time','required')}${input('Hasta (fin de semestre, opcional)','until','','date')}${input('Aula o lugar','location')}<button class=\"button primary\" type=\"submit\">Guardar</button></form>`,f=>{const v=Object.fromEntries(f);if(v.end<=v.time)throw new Error('La hora final debe ser posterior a la inicial.');if(v.until&&v.until<v.date)throw new Error('Revisá la fecha final.');save('event',{...v,repeat:'weekly'});});"
new="if(a==='plan-schedule')showModal('Horario semanal',`<form>${input('Nombre','name','','text','required')}${select('Área','area',[['trabajo','Trabajo'],['facultad','Facultad'],['ingles','Inglés']],'trabajo')}${input('Primera fecha','date',dayKey(),'date','required')}${input('Hora inicial','time','08:00','time','required')}${input('Hora final','end','09:00','time','required')}${input('Hasta (fin de semestre, opcional)','until','','date')}${input('Aula o lugar','location')}<button class=\"button primary\" type=\"submit\">Guardar</button></form>`,f=>{const event={...Object.fromEntries(f),repeat:'weekly'};const decision=authorizeEventSave(event,db.records('event'),{days:180,confirmConflict:confirmEventConflict});if(!decision.allowed)return;save('event',event);});"
replace_once('src/planning.js',old,new,'weekly schedule guard')

Path('tests/event-service.test.js').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {authorizeEventSave,assessEventConflicts,validateEventTiming} from '../src/event-service.js';

test('una sola política valida horarios inválidos en cualquier pantalla',()=>{
 assert.throws(()=>validateEventTiming({date:'2026-09-24',time:'19:00',end:'18:00'}),/hora final/);
 assert.throws(()=>validateEventTiming({date:'2026-09-24',time:'19:00',until:'2026-09-23'}),/fecha final/);
});

test('un conflicto bloquea por defecto y puede confirmarse explícitamente',()=>{
 const events=[{id:'a',name:'Facultad',date:'2026-09-24',repeat:'none',time:'18:00',end:'20:00'}];
 const candidate={name:'Inglés',date:'2026-09-24',repeat:'none',time:'19:00',end:'20:30'};
 assert.equal(authorizeEventSave(candidate,events).allowed,false);
 let asked='';
 const allowed=authorizeEventSave(candidate,events,{confirmConflict:message=>{asked=message;return true;}});
 assert.equal(allowed.allowed,true);
 assert.match(asked,/Facultad/);
});

test('horarios semanales detectan choques futuros con la misma política',()=>{
 const events=[{id:'a',name:'Trabajo',date:'2026-09-24',repeat:'weekly',time:'18:00',end:'20:00',until:'2026-12-20'}];
 const candidate={name:'Inglés',date:'2026-09-17',repeat:'weekly',time:'19:00',end:'20:30',until:'2026-12-20'};
 const result=assessEventConflicts(candidate,events,{days:120});
 assert.ok(result.conflicts.some(c=>c.date==='2026-09-24'));
});

test('editar una sola ocurrencia no proyecta ese cambio al resto de la serie',()=>{
 const events=[
  {id:'serie',name:'Clase',date:'2026-09-24',repeat:'weekly',time:'18:00',end:'19:00'},
  {id:'otro',name:'Reunión',date:'2026-10-01',repeat:'none',time:'20:00',end:'21:00'}
 ];
 const edited={id:'serie',name:'Clase',date:'2026-09-24',repeat:'weekly',time:'20:00',end:'21:00'};
 const result=assessEventConflicts(edited,events,{ignoreId:'serie',occurrenceDate:'2026-09-24'});
 assert.equal(result.conflicts.length,0);
});

test('Calendario y horario semanal usan el mismo guard central',()=>{
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const planning=fs.readFileSync(new URL('../src/planning.js',import.meta.url),'utf8');
 assert.match(main,/authorizeEventSave\(data,rec\('event'\)/);
 assert.match(planning,/authorizeEventSave\(event,db\.records\('event'\)/);
 assert.doesNotMatch(planning,/if\(v\.end<=v\.time\)/);
});
""")
