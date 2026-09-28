import * as db from './store.js';
import {dayKey,weekKeys} from './domain.js';

const n=value=>Math.max(0,Number(value)||0);
const pct=(value,target)=>target>0?Math.min(100,Math.round(value/target*100)):0;
const monthPrefix=date=>String(date||dayKey()).slice(0,7);

export function goalSnapshot({date=dayKey(),records=db.records,settings=(records('settings')[0]||{})}={}){
 const goals=settings.goals||{};
 const week=new Set(weekKeys(date)),month=monthPrefix(date);
 const logs=records('log').filter(row=>row.status==='done');
 const readings=records('reading');
 const weeklyHabits=logs.filter(row=>week.has(row.date)).length;
 const monthlyHabits=logs.filter(row=>String(row.date||'').startsWith(month)).length;
 const weeklyReading=readings.filter(row=>week.has(row.date)).reduce((sum,row)=>sum+n(row.minutes),0);
 const monthlyReading=readings.filter(row=>String(row.date||'').startsWith(month)).reduce((sum,row)=>sum+n(row.minutes),0);
 return {
  goals:{weeklyHabits:n(goals.weeklyHabits),weeklyReading:n(goals.weeklyReading),monthlyHabits:n(goals.monthlyHabits),monthlyReading:n(goals.monthlyReading)},
  actual:{weeklyHabits,weeklyReading,monthlyHabits,monthlyReading}
 };
}

const item=(label,value,target,unit='')=>{
 if(!target)return '';
 const progress=pct(value,target);
 return `<div class="goal-row"><div><strong>${label}</strong><small>${value}${unit} de ${target}${unit}</small></div><progress max="100" value="${progress}"></progress><b>${progress}%</b></div>`;
};

export function goalsView({btn,date=dayKey()}={}){
 const snap=goalSnapshot({date}),g=snap.goals,a=snap.actual,configured=Object.values(g).some(Boolean);
 return `<section class="panel goals-panel"><div class="section-title"><div><h2>Mis objetivos</h2><p>Metas simples para esta semana y este mes.</p></div>${btn('Editar objetivos','goals-edit','','button outline')}</div>${configured?`<div class="goals-grid"><div><h3>Esta semana</h3>${item('Hábitos completados',a.weeklyHabits,g.weeklyHabits)}${item('Lectura',a.weeklyReading,g.weeklyReading,' min')}</div><div><h3>Este mes</h3>${item('Hábitos completados',a.monthlyHabits,g.monthlyHabits)}${item('Lectura',a.monthlyReading,g.monthlyReading,' min')}</div></div>`:'<div class="personal-empty"><strong>Elegí una meta que te motive</strong><p>Podés usar hábitos completados, minutos de lectura o ambos.</p></div>'}</section>`;
}

export async function goalsAction(action,{showModal,input,modal,toast}={}){
 if(action!=='goals-edit')return false;
 const settings=db.records('settings')[0]||{},goals=settings.goals||{};
 showModal('Tus objetivos',`<form><p class="muted">Dejá en 0 cualquier meta que no quieras usar.</p><div class="form-grid">${input('Hábitos por semana','weeklyHabits',n(goals.weeklyHabits),'number','min="0" max="500"')}${input('Minutos de lectura por semana','weeklyReading',n(goals.weeklyReading),'number','min="0" max="10080"')}</div><div class="form-grid">${input('Hábitos por mes','monthlyHabits',n(goals.monthlyHabits),'number','min="0" max="2500"')}${input('Minutos de lectura por mes','monthlyReading',n(goals.monthlyReading),'number','min="0" max="44640"')}</div><button class="button primary wide" type="submit">Guardar objetivos</button></form>`,form=>{
  db.put('settings',{...settings,goals:{weeklyHabits:n(form.get('weeklyHabits')),weeklyReading:n(form.get('weeklyReading')),monthlyHabits:n(form.get('monthlyHabits')),monthlyReading:n(form.get('monthlyReading'))}},'settings');
  modal.close();toast('Objetivos actualizados.');
 });
 return true;
}
