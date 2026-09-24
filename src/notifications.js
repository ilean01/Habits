import * as db from './store.js';
import {SUPABASE_URL} from './config.js';

const buildKey=import.meta.env.VITE_VAPID_PUBLIC_KEY||'';
const functionsBase=(import.meta.env.VITE_SUPABASE_URL||SUPABASE_URL).replace(/\/$/,'');
let cachedPublicKey='';

function supported(){return typeof window!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
function bytes(value){const base64=String(value||'').replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length/4)*4,'=')),c=>c.charCodeAt(0));}
function sameKey(subscription,expected){const actual=subscription?.options?.applicationServerKey;if(!actual)return true;const a=new Uint8Array(actual),b=bytes(expected);return a.length===b.length&&a.every((v,i)=>v===b[i]);}
function stateText(){if(!supported())return 'Este navegador no permite notificaciones push.';if(Notification.permission==='denied')return 'Los avisos están bloqueados por el dispositivo.';if(Notification.permission==='granted')return 'Permiso concedido en este dispositivo.';return 'Todavía no autorizaste avisos en este dispositivo.';}

async function publicKey(){
 if(cachedPublicKey)return cachedPublicKey;
 try{
  const response=await fetch(`${functionsBase}/functions/v1/send-reminders`,{method:'GET',cache:'no-store'});
  if(response.ok){const data=await response.json();if(data?.publicKey)cachedPublicKey=String(data.publicKey);}
 }catch{}
 return cachedPublicKey||buildKey;
}
async function registration(){await navigator.serviceWorker.register('./sw.js');return navigator.serviceWorker.ready;}
async function signedUser(){const {data:{user},error}=await db.supabase.auth.getUser();if(error)throw error;if(!user)throw new Error('Iniciá sesión otra vez.');return user;}
async function deleteRemote(endpoint,userId){const {error}=await db.supabase.from('push_subscriptions').delete().eq('user_id',userId).eq('endpoint',endpoint);if(error)throw error;}

export function notificationsView({btn}){
 const note=supported()&&Notification.permission==='granted'?'Podés enviar un aviso de prueba para comprobar este dispositivo.':'Al activar, el navegador te va a pedir permiso.';
 return `<section class="install-help"><h3>Recordatorios</h3><p><strong>${stateText()}</strong></p><p>${note}</p><div class="settings-actions">${btn('Activar / actualizar','push-enable','','button outline')}${btn('Probar aviso ahora','push-test','','button outline')}${btn('Desactivar en este dispositivo','push-disable','','button outline')}</div><p class="muted small">Los recordatorios respetan la hora del hábito o evento, el aviso configurado, las actividades ya completadas y tus días tranquilos o de descanso.</p><p>En iPhone: Safari → Compartir → Agregar a pantalla de inicio. Abrí la app instalada y tocá “Activar / actualizar”.</p></section>`;
}

export async function notificationsAction(a,{toast}){
 if(!['push-enable','push-disable','push-test'].includes(a))return false;
 if(db.info().demo)throw new Error('Iniciá sesión para usar recordatorios.');
 if(!supported())throw new Error('Este navegador no permite avisos. En iPhone abrí Habits desde el ícono agregado a la pantalla de inicio.');

 if(a==='push-test'){
  if(Notification.permission!=='granted')throw new Error('Primero activá las notificaciones en este dispositivo.');
  const reg=await registration();
  await reg.showNotification('Habits · aviso de prueba',{body:'Perfecto: este dispositivo puede mostrar tus recordatorios.',icon:'./icon-192.png',badge:'./icon-192.png',tag:'habits-test',data:{view:'today'}});
  toast('Aviso de prueba enviado.');return true;
 }

 const reg=await registration();
 let subscription=await reg.pushManager.getSubscription();
 const user=await signedUser();

 if(a==='push-disable'){
  if(subscription){await deleteRemote(subscription.endpoint,user.id);await subscription.unsubscribe();}
  toast('Avisos desactivados en este dispositivo.');return true;
 }

 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw new Error('No se autorizó el permiso. Podés cambiarlo en los ajustes del dispositivo.');
 const key=await publicKey();
 if(!key)throw new Error('El servidor todavía no pudo preparar la clave de notificaciones. Probá de nuevo en unos segundos.');
 if(subscription&&!sameKey(subscription,key)){await deleteRemote(subscription.endpoint,user.id);await subscription.unsubscribe();subscription=null;}
 subscription=subscription||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(key)});
 const json=subscription.toJSON();if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw new Error('El navegador no devolvió una suscripción push válida.');
 const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Asuncion';
 const {error}=await db.supabase.from('push_subscriptions').upsert({user_id:user.id,endpoint:json.endpoint,keys:json.keys,timezone},{onConflict:'user_id,endpoint'});
 if(error){await subscription.unsubscribe();throw error;}
 toast('Recordatorios activados en este dispositivo. Probá “Probar aviso ahora”.');return true;
}
