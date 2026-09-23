import {dayKey} from './domain.js';
import * as db from './store.js';
export const waterTotal=(records,date)=>Math.round(records.filter(r=>r.hydration&&r.date===date).reduce((n,r)=>n+(Number(r.milliliters)||0),0))/1000;
export function wellbeingView({esc,btn}) {
 const date=dayKey(),entries=db.records('log').filter(r=>r.hydration&&r.date===date);
 return `<section class="panel"><h2>Agua, de a poquito</h2><p><strong>${waterTotal(entries,date).toLocaleString('es-PY')} litros</strong> registrados hoy</p><div class="button-row">${[250,500,1000].map(n=>btn(`+ ${n/1000} L`,'water-add',`data-ml="${n}"`,'button outline')).join('')}${btn('Otra cantidad','water-custom','','button outline')}</div>${entries.map(r=>`<div class="button-row"><small>${esc(new Date(r.at).toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit'}))} · ${r.milliliters/1000} L</small>${btn('Quitar','water-remove',`data-id="${esc(r.id)}"`,'text-button')}</div>`).join('')}<p class="muted small">Cada toma se guarda por separado. Podés corregirla sin borrar las demás.</p></section><section class="panel"><h2>Mi entrenamiento</h2><p>Guardá una foto y una nota para recordar cómo te sentiste.</p>${btn('Fotos del entrenamiento','workout-photos','','button outline')}</section>`;
}
export async function wellbeingAction(a,el,{showModal,input,textarea,btn,esc,toast,modal,render}) {
 if(!a.startsWith('water-')&&!a.startsWith('workout-'))return false;
 const add=ml=>{if(!Number.isFinite(ml)||ml<=0||ml>10000)throw new Error('Ingresá una cantidad mayor que cero y hasta 10 litros.');db.put('log',{hydration:true,milliliters:Math.round(ml),date:dayKey(),at:new Date().toISOString()});toast('Agua registrada.');};
 if(a==='water-add')add(Number(el.dataset.ml));
 if(a==='water-remove')db.remove(el.dataset.id);
 if(a==='water-custom')showModal('Agregar agua',`<form>${input('Litros que acabás de tomar','liters',0.25,'number','required min="0.001" max="10" step="0.001"')}<button class="button primary" type="submit">Sumar a hoy</button></form>`,f=>{add(Number(f.get('liters'))*1000);modal.close();});
 if(a==='workout-photos'){
  const photos=db.records('journal').filter(r=>r.workoutPhoto).sort((a,b)=>b.date.localeCompare(a.date));
  showModal('Fotos del entrenamiento',`<p>Solo tu cuenta puede acceder a estas fotos.</p><form>${input('Fecha','date',dayKey(),'date','required')}<label>Tomar o elegir una foto<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required></label>${textarea('Cómo te sentiste','text','')}<p class="muted small">En el iPhone podés elegir la cámara. Hasta 10 MB. Para subir fotos necesitás conexión.</p><button class="button primary" type="submit">Guardar foto</button></form><div id="workout-gallery">${photos.map(p=>`<article class="panel"><p>${esc(p.date)} · ${esc(p.text)}</p><div data-photo="${esc(p.id)}"></div>${btn('Eliminar foto','workout-delete',`data-id="${esc(p.id)}"`,'text-button danger')}</article>`).join('')}</div>`,async f=>{
   if(db.info().demo)throw new Error('Iniciá sesión para guardar fotos privadas.');
   const file=f.get('photo');if(!file?.size||file.size>10485760||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Elegí una imagen JPG, PNG o WebP de hasta 10 MB.');
   const {data:{user}}=await db.supabase.auth.getUser();if(!user)throw new Error('Iniciá sesión de nuevo.');
   const path=`${user.id}/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
   const {error}=await db.supabase.storage.from('workout-photos').upload(path,file,{contentType:file.type});if(error)throw new Error('No se pudo subir la foto. Revisá la conexión y que esté aplicada la migración de fotos.');
   db.put('journal',{workoutPhoto:true,path,text:String(f.get('text')||''),date:f.get('date'),at:new Date().toISOString()});modal.close();toast('Foto guardada.');
  });
  if(!db.info().demo)for(const p of photos){const {data,error}=await db.supabase.storage.from('workout-photos').createSignedUrl(p.path,300);if(error)continue;const slot=[...modal.querySelectorAll('[data-photo]')].find(e=>e.dataset.photo===p.id);if(slot){const img=document.createElement('img');img.src=data.signedUrl;img.alt='Foto de tu entrenamiento';img.style='max-width:100%;border-radius:12px';slot.append(img);}}
 }
 if(a==='workout-delete'){
  const p=db.records('journal').find(r=>r.id===el.dataset.id&&r.workoutPhoto);if(!p)return true;
  showModal('Eliminar foto',`<p>Se eliminará la imagen del almacenamiento privado. Esta acción no se puede deshacer.</p><form><button type="submit" class="button primary">Eliminar esta foto</button></form>`,async()=>{const {error}=await db.supabase.storage.from('workout-photos').remove([p.path]);if(error)throw error;db.remove(p.id);modal.close();toast('Foto eliminada.');});
 }
 return true;
}
