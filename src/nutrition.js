import * as db from './store.js';
import {dayKey} from './domain.js';

export function normalizeFoodAnalysis(value){
 const foods=Array.isArray(value?.foods)?value.foods.slice(0,12).map((food,i)=>({
  name:String(food?.name||('Alimento '+(i+1))).slice(0,100),
  portion:String(food?.portion||'porción estimada').slice(0,100),
  grams:Math.max(0,Math.round(Number(food?.grams)||0)),
  calories:Math.max(0,Math.round(Number(food?.calories)||0)),
  protein:Math.max(0,Math.round((Number(food?.protein)||0)*10)/10),
  carbs:Math.max(0,Math.round((Number(food?.carbs)||0)*10)/10),
  fat:Math.max(0,Math.round((Number(food?.fat)||0)*10)/10),
  confidence:['low','medium','high'].includes(food?.confidence)?food.confidence:'medium'
 })): [];
 const totals=foods.reduce((t,f)=>({calories:t.calories+f.calories,protein:t.protein+f.protein,carbs:t.carbs+f.carbs,fat:t.fat+f.fat}),{calories:0,protein:0,carbs:0,fat:0});
 return {foods,totals:{calories:Math.round(totals.calories),protein:Math.round(totals.protein*10)/10,carbs:Math.round(totals.carbs*10)/10,fat:Math.round(totals.fat*10)/10},notes:String(value?.notes||'').slice(0,500)};
}
function imageDataUrl(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const img=new Image();img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No se pudo abrir la foto. Probá con otra imagen.'));};img.onload=()=>{try{const max=1600;const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const out=canvas.toDataURL('image/jpeg',0.86);URL.revokeObjectURL(url);resolve(out);}catch(e){URL.revokeObjectURL(url);reject(e);}};img.src=url;});}
function validate(file){if(!file||!file.size)throw new Error('Elegí una foto.');if(file.size>6*1024*1024)throw new Error('La foto supera 6 MB.');if(file.type&&!file.type.startsWith('image/'))throw new Error('Elegí un archivo de imagen.');}
export function nutritionView({esc,btn}){
 const meals=db.records('meal').filter(m=>m.date===dayKey()).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 const total=meals.reduce((n,m)=>n+(Number(m.totals?.calories)||0),0);
 return `<section class="panel nutrition-panel"><div class="section-title"><div><h2>Alimentación</h2><p>${meals.length?`Hoy llevás <strong>≈ ${Math.round(total)} kcal</strong> registradas.`:'Analizá una comida con una foto.'}</p></div></div>${btn('📷 Analizar comida','food-photo','','button primary wide')}${meals.slice(0,4).map(m=>`<div class="food-entry"><div><strong>${esc(m.label||'Comida')}</strong><small>≈ ${Math.round(Number(m.totals?.calories)||0)} kcal · P ${Number(m.totals?.protein)||0} g · C ${Number(m.totals?.carbs)||0} g · G ${Number(m.totals?.fat)||0} g</small></div>${btn('Ver','food-view',`data-id="${esc(m.id)}"`,'text-button')}</div>`).join('')}<p class="muted small">Estimaciones visuales: revisá las cantidades antes de guardar.</p></section>`;
}
function review(result,esc){
 return `<form><div class="notice"><strong>Estimación por IA.</strong> Revisá porciones, aceite, salsas e ingredientes antes de guardar.</div><label>Nombre de la comida<input name="label" value="Comida" maxlength="80"></label>${result.foods.map((f,i)=>`<fieldset class="food-review-item"><legend>${esc(f.name)}</legend><label>Alimento<input name="name_${i}" value="${esc(f.name)}"></label><div class="food-grid"><label>Porción<input name="portion_${i}" value="${esc(f.portion)}"></label><label>Gramos<input name="grams_${i}" type="number" min="0" value="${f.grams}"></label><label>kcal<input name="calories_${i}" type="number" min="0" value="${f.calories}"></label><label>Proteína g<input name="protein_${i}" type="number" min="0" step="0.1" value="${f.protein}"></label><label>Carbohidratos g<input name="carbs_${i}" type="number" min="0" step="0.1" value="${f.carbs}"></label><label>Grasas g<input name="fat_${i}" type="number" min="0" step="0.1" value="${f.fat}"></label></div></fieldset>`).join('')}<input type="hidden" name="count" value="${result.foods.length}"><button class="button primary wide" type="submit">Guardar comida</button></form>`;
}
export async function nutritionAction(a,el,{showModal,input,esc,toast,modal}){
 if(!a.startsWith('food-'))return false;
 if(a==='food-photo'){
  if(db.info().demo){toast('El análisis con IA necesita una cuenta conectada.');return true;}
  showModal('Analizar comida',`<form><p>Tomá una foto clara del plato o elegí una de tu galería.</p>${input('Foto','photo','','file','accept="image/*" capture="environment" required')}<button class="button primary wide" type="submit">Analizar con Groq</button><p class="muted small">La foto se usa para el análisis y no se guarda con el registro.</p></form>`,async f=>{
   const file=f.get('photo');validate(file);const b=modal.querySelector('button[type=submit]');b.disabled=true;b.textContent='Analizando…';
   try{
    const image=await imageDataUrl(file);const {data,error}=await db.supabase.functions.invoke('food-ai',{body:{image}});if(error){let message=error.message;try{const body=await error.context?.json();message=body?.error||message;}catch{}throw new Error(message);}if(data?.error)throw new Error(data.error);
    const result=normalizeFoodAnalysis(data);if(!result.foods.length)throw new Error('No pude identificar alimentos.');
    showModal('Revisar análisis',review(result,esc),form=>{
     const foods=[];for(let i=0;i<Number(form.get('count'));i++)foods.push({name:form.get('name_'+i),portion:form.get('portion_'+i),grams:Number(form.get('grams_'+i)),calories:Number(form.get('calories_'+i)),protein:Number(form.get('protein_'+i)),carbs:Number(form.get('carbs_'+i)),fat:Number(form.get('fat_'+i))});
     const clean=normalizeFoodAnalysis({foods,notes:result.notes});db.put('meal',{date:dayKey(),at:new Date().toISOString(),label:String(form.get('label')||'Comida').slice(0,80),foods:clean.foods,totals:clean.totals,estimated:true,source:'groq-photo'});modal.dataset.dirty='false';modal.close();toast('Comida guardada · ≈ '+clean.totals.calories+' kcal');
    });
   }catch(e){toast('No se pudo analizar: '+(e?.message||'error'));b.disabled=false;b.textContent='Analizar con Groq';}
  });return true;
 }
 if(a==='food-view'){const m=db.records('meal').find(x=>x.id===el.dataset.id);if(m)showModal(esc(m.label||'Comida'),`<p><strong>≈ ${m.totals?.calories||0} kcal</strong> · P ${m.totals?.protein||0} g · C ${m.totals?.carbs||0} g · G ${m.totals?.fat||0} g</p>${(m.foods||[]).map(f=>`<p><strong>${esc(f.name)}</strong><br><small>${esc(f.portion||'')} · ${f.grams||0} g · ≈ ${f.calories||0} kcal</small></p>`).join('')}<p class="muted small">Estimación visual revisada antes de guardar.</p>`);return true;}
 return true;
}
