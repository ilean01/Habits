import {dayKey} from './domain.js';
import {waterTotal,waterStats,hydrationHabit,normalizeHydrationHabit,hydrationHabitValue} from './hydration.js';
import {hydrationLogs} from './selectors.js';
import * as db from './store.js';
export {waterTotal,waterStats} from './hydration.js';

function isLegacyWaterHabit(h){return !!(h&&h.hydration!==true&&h.name==='Tomar agua'&&h.icon==='Droplets'&&h.area==='salud'&&h.type==='quantity'&&Number(h.target)===8&&String(h.unit||'').toLowerCase()==='vasos');}
export function ensureHydrationHabit(){
 const before=hydrationHabit(db.records('habit'));if(!before)return null;
 const legacy=isLegacyWaterHabit(before),after=normalizeHydrationHabit(before);
 if(legacy){
  for(const l of db.records('log').filter(x=>x.habitId===before.id&&!x.hydrationDerived&&Number(x.value)>0)){
   const milliliters=Math.max(0,Math.round(Number(l.value)*250)),liters=Math.round(milliliters/10)/100;
   const intakeId=`hydration:migrated:${before.id}:${l.date}`;
   if(milliliters&&!db.raw(intakeId))db.put('log',{hydration:true,milliliters,date:l.date,at:l.at||new Date().toISOString(),migratedFromGlasses:true},intakeId);
   db.put('log',{habitId:before.id,date:l.date,status:liters>=2?'done':'partial',value:liters,unit:'litros',hydrationDerived:true,note:l.note||'',at:l.at||new Date().toISOString()},l.id);
  }
 }
 if(JSON.stringify(before)!==JSON.stringify(after))db.put('habit',after,before.id);
 return after;
}
export function syncHydrationHabit(date=dayKey()){
 const h=ensureHydrationHabit();if(!h)return;
 const liters=waterTotal(hydrationLogs(db.records('log')),date),state=hydrationHabitValue(h,liters),id=`log:${h.id}:${date}`,existing=db.raw(id)?.data;
 if(!state.status){if(existing?.hydrationDerived)db.remove(id);return;}
 db.put('log',{habitId:h.id,date,status:state.status,value:state.value,unit:'litros',hydrationDerived:true,note:existing?.note||'',at:new Date().toISOString()},id);
}
export function wellbeingView({esc,btn}) {
 const date=dayKey(),logs=hydrationLogs(db.records('log')),entries=logs.filter(r=>r.date===date),habit=hydrationHabit(db.records('habit')),target=Math.max(.1,Number(habit?.target)||2),total=waterTotal(logs,date),pct=Math.min(100,Math.round(total/target*100));
 return `<section class="panel water-panel"><div class="section-title"><div><h2>Agua, de a poquito</h2><p><strong>${total.toLocaleString('es-PY')} L</strong> de ${target.toLocaleString('es-PY')} L hoy</p></div><span class="water-percent">${pct}%</span></div><progress max="${target}" value="${Math.min(total,target)}"></progress><div class="button-row">${[250,500,1000].map(n=>btn(`+ ${n/1000} L`,'water-add',`data-ml="${n}" data-date="${date}"`,'button outline')).join('')}${btn('Otra cantidad','water-custom',`data-date="${date}"`,'button outline')}</div>${entries.map(r=>`<div class="button-row water-entry"><small>${esc(new Date(r.at).toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'}))} · ${(r.milliliters/1000).toLocaleString('es-PY')} L${r.migratedFromGlasses?' · migrado':''}</small>${btn('Quitar','water-remove',`data-id="${esc(r.id)}"`,'text-button')}</div>`).join('')}<p class="muted small">Cada toma suma automáticamente a tu hábito de agua. El promedio semanal está en Progreso.</p></section>`;
}
export async function wellbeingAction(a,el,{showModal,input,toast,modal}) {
 if(!a.startsWith('water-'))return false;
 const targetDate=el?.dataset?.date||dayKey();
 const add=(ml,date=targetDate)=>{if(!Number.isFinite(ml)||ml<=0||ml>10000)throw new Error('Ingresá una cantidad mayor que cero y hasta 10 litros.');db.put('log',{hydration:true,milliliters:Math.round(ml),date,at:new Date().toISOString()});syncHydrationHabit(date);toast('Agua registrada.');};
 if(a==='water-add'){add(Number(el.dataset.ml));return true;}
 if(a==='water-remove'){const old=db.raw(el.dataset.id)?.data;db.remove(el.dataset.id);if(old?.date)syncHydrationHabit(old.date);return true;}
 if(a==='water-custom')showModal('Agregar agua',`<form>${input('Fecha','date',targetDate,'date',`required max="${dayKey()}"`)}${input('Litros que tomaste','liters',0.25,'number','required min="0.001" max="10" step="0.001"')}<button class="button primary" type="submit">Sumar agua</button></form>`,f=>{const d=String(f.get('date')||targetDate);add(Number(f.get('liters'))*1000,d);modal.close();});
 return true;
}
