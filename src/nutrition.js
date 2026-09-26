import * as db from './store.js';
import {dayKey} from './domain.js';
import {DAY_PHOTO_BUCKET,allDayPhotos,makePhotoData} from './day-photos.js';
import {compressPhoto,hydrateDayPhotos,removeDayPhotoFile,uploadDayPhoto} from './photo-storage.js';
import {MEAL_TYPES,defaultMealType,mealTypeLabel,normalizeNutritionGoals,nutritionForDate} from './nutrition-domain.js';

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
function dataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('No se pudo leer la foto.'));r.onload=()=>resolve(r.result);r.readAsDataURL(file);});}
const metric=(value,label,unit='')=>`<div class="nutrition-summary-metric"><strong>${value}${unit}</strong><span>${label}</span></div>`;
const localTime=()=>`${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
function mealAt(date,time){const [y,m,d]=String(date).split('-').map(Number),[hh,mm]=String(time||'12:00').split(':').map(Number),value=new Date(y,m-1,d,hh||0,mm||0);return Number.isNaN(value.getTime())?new Date().toISOString():value.toISOString();}
function mealPhoto(meal){return allDayPhotos(db.records('photo'),db.records('journal')).find(p=>p.id===meal?.photoId||p.mealId===meal?.id)||null;}

export function nutritionSummaryView({esc,btn,date=dayKey()}={}){
 const day=nutritionForDate(db.records('meal'),date);
 const title=day.hasData?`${day.count} ${day.count===1?'comida registrada':'comidas registradas'}`:'Todavía no registraste comidas';
 return `<section class="panel nutrition-day-summary" aria-label="Resumen de alimentación de hoy"><div class="nutrition-summary-title"><p class="eyebrow">ALIMENTACIÓN DE HOY</p><h3>${title}</h3><p class="muted">${day.hasData?'Estimaciones revisadas de tus registros del día.':'Podés analizar una comida con una foto.'}</p></div>${day.hasData?`${metric('≈ '+day.totals.calories,'kcal del día')}${metric(day.totals.protein,'proteína',' g')}${metric(day.totals.carbs,'carbohidratos',' g')}${metric(day.totals.fat,'grasas',' g')}<div class="nutrition-meal-types">${day.types.map(type=>`<span class="nutrition-meal-type">${esc(mealTypeLabel(type))}</span>`).join('')}${btn('Agregar comida','food-photo','','text-button')}</div>`:`<div class="nutrition-summary-empty">${btn('Analizar una comida','food-photo','','button primary')}</div>`}</section>`;
}

export function nutritionView({esc,btn}){
 const day=nutritionForDate(db.records('meal'),dayKey());
 return `<section class="panel nutrition-panel"><div class="section-title"><div><h2>Alimentación</h2><p>${day.hasData?`Hoy llevás <strong>≈ ${day.totals.calories} kcal</strong> registradas.`:'Analizá una comida con una foto.'}</p></div></div>${btn('📷 Analizar comida','food-photo','','button primary wide')}${day.meals.slice().reverse().slice(0,4).map(m=>`<div class="food-entry"><div><strong>${esc(m.label||mealTypeLabel(m.mealType))}</strong><small>${esc(mealTypeLabel(m.mealType))}${m.time?' · '+esc(m.time):''} · ≈ ${Math.round(Number(m.totals?.calories)||0)} kcal · P ${Number(m.totals?.protein)||0} g · C ${Number(m.totals?.carbs)||0} g · G ${Number(m.totals?.fat)||0} g</small></div>${btn('Ver','food-view',`data-id="${esc(m.id)}"`,'text-button')}</div>`).join('')}<p class="muted small">Estimaciones visuales: revisá las cantidades antes de guardar.</p></section>`;
}
function review(result,esc,{date=dayKey(),time=localTime()}={}){
 const suggested=defaultMealType();
 return `<form><div class="notice"><strong>Estimación por IA.</strong> Revisá porciones, aceite, salsas e ingredientes antes de guardar.</div><div class="form-grid"><label>Fecha<input name="date" type="date" required max="${dayKey()}" value="${esc(date)}"></label><label>Hora<input name="time" type="time" required value="${esc(time)}"></label><label>Tipo de comida<select name="mealType">${Object.entries(MEAL_TYPES).map(([value,label])=>`<option value="${value}" ${value===suggested?'selected':''}>${label}</option>`).join('')}</select></label><label>Nombre de la comida<input name="label" value="${mealTypeLabel(suggested)}" maxlength="80"></label></div><label>Comentario (opcional)<textarea name="comment" rows="2" maxlength="500" placeholder="Algo que quieras recordar de esta comida"></textarea></label>${result.foods.map((f,i)=>`<fieldset class="food-review-item"><legend>${esc(f.name)}</legend><label>Alimento<input name="name_${i}" value="${esc(f.name)}"></label><div class="food-grid"><label>Porción<input name="portion_${i}" value="${esc(f.portion)}"></label><label>Gramos<input name="grams_${i}" type="number" min="0" value="${f.grams}"></label><label>kcal<input name="calories_${i}" type="number" min="0" value="${f.calories}"></label><label>Proteína g<input name="protein_${i}" type="number" min="0" step="0.1" value="${f.protein}"></label><label>Carbohidratos g<input name="carbs_${i}" type="number" min="0" step="0.1" value="${f.carbs}"></label><label>Grasas g<input name="fat_${i}" type="number" min="0" step="0.1" value="${f.fat}"></label></div></fieldset>`).join('')}<input type="hidden" name="count" value="${result.foods.length}"><p class="muted small">La foto se guardará en tu espacio privado junto con este registro.</p><button class="button primary wide" type="submit">Guardar comida y foto</button></form>`;
}
export async function nutritionAction(a,el,{showModal,input,esc,toast,modal}){
 if(a==='nutrition-goals'){
  const settings=db.records('settings')[0]||{},goals=normalizeNutritionGoals(settings.nutritionGoals||{});
  showModal('Objetivos nutricionales',`<form><p class="muted">Son opcionales y sirven solo como referencia personal en Progreso. Dejá vacío lo que no quieras usar.</p><div class="form-grid">${input('kcal por día','calories',goals.calories??'','number','min="1" max="10000" step="1"')}${input('Proteína (g)','protein',goals.protein??'','number','min="1" max="1000" step="0.1"')}${input('Carbohidratos (g)','carbs',goals.carbs??'','number','min="1" max="2000" step="0.1"')}${input('Grasas (g)','fat',goals.fat??'','number','min="1" max="1000" step="0.1"')}</div><button class="button primary wide" type="submit">Guardar objetivos</button></form>`,f=>{const nutritionGoals=normalizeNutritionGoals({calories:f.get('calories'),protein:f.get('protein'),carbs:f.get('carbs'),fat:f.get('fat')});db.put('settings',{...settings,nutritionGoals},'settings');modal.close();toast('Objetivos de alimentación guardados.');});
  return true;
 }
 if(!a.startsWith('food-'))return false;
 if(a==='food-photo'){
  if(db.info().demo){toast('El análisis con IA necesita una cuenta conectada.');return true;}
  showModal('Analizar comida',`<form><p>Tomá una foto clara del plato o elegí una de tu galería.</p>${input('Foto','photo','','file','accept="image/*" capture="environment" required')}<button class="button primary wide" type="submit">Analizar con Groq</button><p class="muted small">La imagen se comprime antes de enviarla y, si confirmás el análisis, se guarda de forma privada con tu comida.</p></form>`,async f=>{
   const file=f.get('photo');const b=modal.querySelector('button[type=submit]');b.disabled=true;b.textContent='Preparando foto…';
   try{
    const prepared=await compressPhoto(file);b.textContent='Analizando…';
    const image=await dataUrl(prepared.blob);const {data,error}=await db.supabase.functions.invoke('food-ai',{body:{image}});if(error)throw error;if(data?.error)throw new Error(data.error);
    const result=normalizeFoodAnalysis(data);if(!result.foods.length)throw new Error('No pude identificar alimentos.');
    showModal('Revisar análisis',review(result,esc),async form=>{
     const foods=[];for(let i=0;i<Number(form.get('count'));i++)foods.push({name:form.get('name_'+i),portion:form.get('portion_'+i),grams:Number(form.get('grams_'+i)),calories:Number(form.get('calories_'+i)),protein:Number(form.get('protein_'+i)),carbs:Number(form.get('carbs_'+i)),fat:Number(form.get('fat_'+i))});
     const clean=normalizeFoodAnalysis({foods,notes:result.notes}),mealType=Object.hasOwn(MEAL_TYPES,String(form.get('mealType')))?String(form.get('mealType')):'other',date=String(form.get('date')||dayKey()),time=String(form.get('time')||localTime()),label=String(form.get('label')||mealTypeLabel(mealType)).slice(0,80),comment=String(form.get('comment')||'').slice(0,500),mealId=crypto.randomUUID(),photoId=crypto.randomUUID();
     let uploaded=null;
     try{
      uploaded=await uploadDayPhoto(prepared.blob,{bucket:DAY_PHOTO_BUCKET,extension:prepared.extension,contentType:prepared.contentType});
      db.put('photo',makePhotoData({date,path:uploaded.path,bucket:uploaded.bucket,category:'food',caption:label,mealId,width:prepared.width,height:prepared.height,size:prepared.size,originalSize:prepared.originalSize}),photoId);
      db.put('meal',{date,time,at:mealAt(date,time),mealType,label,comment,foods:clean.foods,totals:clean.totals,estimated:true,source:'groq-photo',photoId,photoPath:uploaded.path,photoBucket:uploaded.bucket},mealId);
     }catch(error){if(photoId)db.remove(photoId);if(uploaded)await removeDayPhotoFile(uploaded).catch(()=>{});throw error;}
     modal.dataset.dirty='false';modal.close();toast(`${mealTypeLabel(mealType)} guardado · ≈ ${clean.totals.calories} kcal`);
    });
   }catch(e){toast('No se pudo analizar: '+(e?.message||'error'));b.disabled=false;b.textContent='Analizar con Groq';}
  });return true;
 }
 if(a==='food-view'){
  const m=db.records('meal').find(x=>x.id===el.dataset.id);if(!m)return true;const photo=mealPhoto(m);
  showModal(esc(m.label||'Comida'),`${photo?`<div class="food-view-photo" data-day-photo="${esc(photo.path)}" data-photo-bucket="${esc(photo.bucket)}" data-photo-alt="${esc(m.label||'Foto de comida')}"><span>Cargando…</span></div>`:''}<p class="muted">${esc(mealTypeLabel(m.mealType))}${m.time?' · '+esc(m.time):''}${m.date?' · '+esc(m.date):''}</p><p><strong>≈ ${m.totals?.calories||0} kcal</strong> · P ${m.totals?.protein||0} g · C ${m.totals?.carbs||0} g · G ${m.totals?.fat||0} g</p>${m.comment?`<p>${esc(m.comment)}</p>`:''}${(m.foods||[]).map(f=>`<p><strong>${esc(f.name)}</strong><br><small>${esc(f.portion||'')} · ${f.grams||0} g · ≈ ${f.calories||0} kcal · P ${f.protein||0} · C ${f.carbs||0} · G ${f.fat||0}</small></p>`).join('')}<p class="muted small">Estimación visual revisada antes de guardar.</p>`);void hydrateDayPhotos(modal).catch(()=>{});return true;
 }
 return true;
}
