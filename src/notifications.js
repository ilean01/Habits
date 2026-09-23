import * as db from './store.js';
const key=import.meta.env.VITE_VAPID_PUBLIC_KEY||'';
function bytes(value){const base64=value.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length/4)*4,'=')),c=>c.charCodeAt(0));}
export function notificationsView({btn}){return `<section class="install-help"><h3>Recordatorios</h3><p>${key?'Activá avisos en este dispositivo.':'Los avisos necesitan terminar la configuración del servidor.'}</p>${btn('Activar notificaciones','push-enable','','button outline')}${btn('Desactivar en este dispositivo','push-disable','','button outline')}<p>En iPhone: Safari → Compartir → Agregar a pantalla de inicio. Abrí la app instalada y tocá Activar notificaciones.</p></section>`;}
export async function notificationsAction(a,{toast}){
 if(!['push-enable','push-disable'].includes(a))return false;
 if(db.info().demo)throw new Error('Iniciá sesión para activar recordatorios.');
 if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('Este navegador no permite avisos. En iPhone abrí la app instalada en la pantalla de inicio.');
 if(a==='push-enable'&&!key)throw new Error('Falta configurar la clave pública VAPID y el envío en Supabase.');
 const permission=a==='push-enable'?await Notification.requestPermission():Notification.permission;
 if(a==='push-enable'&&permission!=='granted')throw new Error('No se autorizó el permiso. Podés cambiarlo en los ajustes del dispositivo.');
 await navigator.serviceWorker.register('./sw.js');const registration=await navigator.serviceWorker.ready;let subscription=await registration.pushManager.getSubscription();
 if(a==='push-disable'){if(subscription){const {error}=await db.supabase.from('push_subscriptions').delete().eq('endpoint',subscription.endpoint);if(error)throw error;await subscription.unsubscribe();}toast('Avisos desactivados en este dispositivo.');return true;}
 const {data:{user}}=await db.supabase.auth.getUser();if(!user)throw new Error('Iniciá sesión otra vez.');
 subscription=subscription||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(key)});
 const json=subscription.toJSON();const {error}=await db.supabase.from('push_subscriptions').upsert({user_id:user.id,endpoint:json.endpoint,keys:json.keys,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone},{onConflict:'user_id,endpoint'});if(error){await subscription.unsubscribe();throw error;}toast('Este dispositivo quedó registrado para recibir avisos.');return true;
}
