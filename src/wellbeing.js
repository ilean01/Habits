import {dayKey} from './domain.js';
import {waterTotal,waterStats} from './hydration.js';
import * as db from './store.js';
export {waterTotal,waterStats} from './hydration.js';

export function wellbeingView({esc,btn}) {
 const date=dayKey(),entries=db.records('log').filter(r=>r.hydration&&r.date===date),total=waterTotal(entries,date);
 return `<section class="panel water-panel"><div class="section-title"><div><h2>Agua, de a poquito</h2><p><strong>${total.toLocaleString('es-PY')} litros</strong> registrados hoy.</p></div>${btn('Ver progreso','progress','','text-button')}</div><div class="button-row">${[250,500,1000].map(n=>btn(`+ ${n/1000} L`,'water-add',`data-ml="${n}"`,'button outline')).join('')}${btn('Otra cantidad','water-custom','','button outline')}</div>${entries.slice().sort((a,b)=>String(b.at).localeCompare(String(a.at))).map(r=>`<div class="button-row"><small>${esc(new Date(r.at).toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'}))} · ${(r.milliliters/1000).toLocaleString('es-PY')} L</small>${btn('Quitar','water-remove',`data-id="${esc(r.id)}"`,'text-button')}</div>`).join('')}<p class="muted small">El promedio y el detalle de la semana están en Progreso.</p></section>`;
}

export async function wellbeingAction(a,el,{showModal,input,toast,modal}) {
 if(!a.startsWith('water-'))return false;
 const add=ml=>{if(!Number.isFinite(ml)||ml<=0||ml>10000)throw new Error('Ingresá una cantidad mayor que cero y hasta 10 litros.');db.put('log',{hydration:true,milliliters:Math.round(ml),date:dayKey(),at:new Date().toISOString()});toast('Agua registrada.');};
 if(a==='water-add')add(Number(el.dataset.ml));
 if(a==='water-remove'){const id=el.dataset.id;const previous=db.raw(id);db.remove(id);toast('Toma eliminada.',()=>{if(previous)db.put(previous.kind,previous.data,previous.id,previous.deleted);});}
 if(a==='water-custom')showModal('Agregar agua',`<form>${input('Litros que acabás de tomar','liters',0.25,'number','required min="0.001" max="10" step="0.001"')}<button class="button primary" type="submit">Sumar a hoy</button></form>`,f=>{add(Number(f.get('liters'))*1000);modal.dataset.dirty='false';modal.close();});
 return true;
}
