import * as db from './store.js';

const DEVICE_KEY='habits-device-id-v1';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const deviceId=()=>{let id='';try{id=localStorage.getItem(DEVICE_KEY)||'';if(!id){id=crypto.randomUUID();localStorage.setItem(DEVICE_KEY,id);}}catch{id='browser';}return id;};
const decodeJwt=token=>{try{const part=String(token||'').split('.')[1]||'',base64=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');return JSON.parse(decodeURIComponent(Array.from(atob(base64),c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join('')));}catch{return {};}};
const platformLabel=()=>{const ua=navigator.userAgent||'';if(/iPhone/i.test(ua))return 'iPhone';if(/iPad/i.test(ua))return 'iPad';if(/Macintosh|Mac OS/i.test(ua))return 'Mac';if(/Windows/i.test(ua))return 'Windows';if(/Android/i.test(ua))return 'Android';return 'Navegador';};
const fmt=value=>value?new Date(value).toLocaleString('es-PY',{dateStyle:'medium',timeStyle:'short'}):'Todavía no';

export async function touchCurrentDevice({force=false}={}){
 if(!db.supabase||db.info().demo)return null;
 const id=deviceId(),existing=db.raw(`device:${id}`)?.data||{};
 if(!force&&existing.lastSeenAt&&Date.now()-new Date(existing.lastSeenAt).getTime()<5*60*1000)return existing;
 const {data:{session}}=await db.supabase.auth.getSession();if(!session)return null;
 const claims=decodeJwt(session.access_token),now=new Date().toISOString();
 const row={deviceId:id,sessionId:claims.session_id||'',label:existing.label||platformLabel(),platform:platformLabel(),firstSeenAt:existing.firstSeenAt||now,lastSeenAt:now,endedAt:null};
 db.put('device',row,`device:${id}`);return row;
}

export function reliabilitySettingsView({btn}){
 if(db.info().demo)return '';
 return `<section class="settings-group"><h3>Cuenta y dispositivos</h3><div class="settings-actions">${btn('Comprobar sincronización','sync-diagnostics','','button outline')}${btn('Mis dispositivos','devices','','button outline')}</div></section>`;
}

async function diagnosticSnapshot(){
 const before=db.info();let cloud=false,session=false,error='';
 try{
  const result=await db.supabase.auth.getSession();session=!!result.data.session;if(result.error)throw result.error;
  if(session){const {error:queryError}=await db.supabase.from('entries').select('id',{head:true,count:'exact'}).limit(1);if(queryError)throw queryError;cloud=true;}
  await db.sync();
 }catch(err){error=String(err?.message||err);}
 const after=db.info();
 return {online:navigator.onLine!==false,session,cloud,status:after.status,pending:after.pending,conflicts:after.conflicts.length,lastSync:after.lastSync,beforeStatus:before.status,error};
}
const okLabel=(value,yes,no)=>value?`✅ ${yes}`:`⚠️ ${no}`;
function diagnosticHtml(result,btn){
 const healthy=result.online&&result.session&&result.cloud&&!result.pending&&!result.conflicts&&['synced','demo'].includes(result.status);
 const support={status:result.status,pending:result.pending,conflicts:result.conflicts,lastSync:result.lastSync,online:result.online,session:result.session,cloud:result.cloud,error:result.error||undefined};
 return `<div class="diagnostic-summary ${healthy?'is-good':'needs-attention'}"><h3>${healthy?'Todo está al día':'Hay algo para revisar'}</h3><p>${okLabel(result.online,'Tenés conexión','No hay conexión a internet')}</p><p>${okLabel(result.session,'Tu cuenta está activa','Tu sesión necesita renovarse')}</p><p>${okLabel(result.cloud,'La nube responde','No se pudo comprobar la nube')}</p><p>${result.pending?`⏳ ${result.pending} cambio${result.pending===1?'':'s'} esperando envío`:'✅ No hay cambios pendientes'}</p><p>${result.conflicts?`⚠️ ${result.conflicts} conflicto${result.conflicts===1?'':'s'} para revisar`:'✅ No hay conflictos'}</p><p>Última actualización: <strong>${esc(fmt(result.lastSync))}</strong></p></div><div class="settings-actions">${btn('Comprobar de nuevo','sync-diagnostics-run','','button primary')}${result.conflicts?btn('Revisar conflictos','conflicts','','button outline'):''}</div><details class="support-details"><summary>Detalles para soporte</summary><pre>${esc(JSON.stringify(support,null,2))}</pre></details>`;
}

function devicesHtml(rows,current,btn){
 const active=rows.filter(row=>!row.endedAt).sort((a,b)=>String(b.lastSeenAt||'').localeCompare(String(a.lastSeenAt||'')));
 return `<div class="device-list">${active.map(row=>`<article class="device-row ${row.deviceId===current?'current':''}"><div><strong>${esc(row.label||row.platform||'Dispositivo')}</strong><small>${row.deviceId===current?'Este dispositivo · ':''}Visto ${esc(fmt(row.lastSeenAt))}</small></div>${row.deviceId===current?btn('Renombrar','device-rename','','text-button'):''}</article>`).join('')||'<div class="personal-empty"><strong>No hay otros dispositivos registrados</strong><p>Van a aparecer cuando uses tu cuenta en otro equipo.</p></div>'}</div>${active.some(row=>row.deviceId!==current)?`<hr><p class="muted">Si no reconocés un equipo, podés cerrar todas las demás sesiones y mantener esta abierta.</p>${btn('Cerrar sesión en los otros dispositivos','device-signout-others','','button outline')}`:''}`;
}

export async function reliabilityAction(action,el,{showModal,input,btn,modal,toast}={}){
 if(!['sync-diagnostics','sync-diagnostics-run','devices','device-rename','device-signout-others'].includes(action))return false;
 if(db.info().demo){toast('Esta opción está disponible cuando entrás con tu cuenta.');return true;}
 if(action==='sync-diagnostics'||action==='sync-diagnostics-run'){
  if(action==='sync-diagnostics')showModal('Estado de tu cuenta','<p>Comprobando conexión y cambios pendientes…</p>');
  const result=await diagnosticSnapshot();showModal('Estado de tu cuenta',diagnosticHtml(result,btn));return true;
 }
 await touchCurrentDevice({force:true});
 const current=deviceId();
 if(action==='devices'){showModal('Mis dispositivos',devicesHtml(db.records('device'),current,btn));return true;}
 if(action==='device-rename'){
  const row=db.records('device').find(item=>item.deviceId===current)||{};
  showModal('Nombre de este dispositivo',`<form>${input('Nombre','label',row.label||platformLabel(),'text','maxlength="40" required')}<button class="button primary wide" type="submit">Guardar</button></form>`,form=>{db.put('device',{...row,label:String(form.get('label')||platformLabel()).trim(),lastSeenAt:new Date().toISOString()},`device:${current}`);modal.close();toast('Nombre actualizado.');});return true;
 }
 if(action==='device-signout-others'){
  showModal('Cerrar otras sesiones',`<p>Este dispositivo seguirá conectado. Los demás dejarán de poder renovar su sesión.</p><form><button class="button primary wide" type="submit">Cerrar otras sesiones</button></form>`,async()=>{const {error}=await db.supabase.auth.signOut({scope:'others'});if(error)throw error;const now=new Date().toISOString();for(const row of db.records('device'))if(row.deviceId!==current&&!row.endedAt)db.put('device',{...row,endedAt:now},`device:${row.deviceId}`);modal.close();toast('Las otras sesiones fueron cerradas.');});return true;
 }
 return true;
}

if(typeof window!=='undefined'){
 window.addEventListener('focus',()=>void touchCurrentDevice().catch(()=>{}));
 setInterval(()=>void touchCurrentDevice().catch(()=>{}),5*60*1000);
}
