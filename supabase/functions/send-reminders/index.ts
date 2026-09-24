import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:CORS});

function local(now:Date,zone:string){
 let use=zone||'America/Asuncion';
 try{new Intl.DateTimeFormat('en-CA',{timeZone:use}).format(now);}catch{use='America/Asuncion';}
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:use,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
 return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};
}
function dow(date:string){return new Date(date+'T12:00:00Z').getUTCDay();}
function occurs(e:any,date:string){if(e.exceptions?.[date]?.cancelled||date<e.date||(e.until&&date>e.until))return false;return e.repeat==='daily'||(e.repeat==='weekly'&&dow(e.date)===dow(date))||(e.repeat==='monthly'&&e.date.slice(8)===date.slice(8))||(e.repeat==='yearly'&&e.date.slice(5)===date.slice(5))||e.date===date;}
function allowedEndpoint(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&(url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.services.mozilla.com')||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.notify.windows.com'));}catch{return false;}}
function weekKeys(date:string){const d=new Date(date+'T12:00:00Z'),delta=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-delta);return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setUTCDate(d.getUTCDate()+i);return x.toISOString().slice(0,10);});}
function weeklyComplete(entries:any[],habitId:string,e:any,date:string){if(e.frequencyMode!=='weekly'||!Number(e.weeklyTarget))return false;const keys=new Set(weekKeys(date)),done=entries.filter(l=>l.kind==='log'&&l.data.habitId===habitId&&keys.has(l.data.date)&&l.data.status==='done').length;return done>=Number(e.weeklyTarget);}
function effectiveDayMode(settings:any,date:string){const override=settings.dayModeOverrides?.[date];if(override)return override;if(settings.dayModeDate===date)return settings.dayMode||'habitual';return settings.weekModes?.[dow(date)]||settings.dayMode||'habitual';}
function dayModeAllowsHabit(h:any,mode:string){if(mode==='descanso')return false;if(mode==='tranquilo')return !!h.essential;if(mode==='finDeSemana')return h.area!=='trabajo'||!!h.essential;return true;}

async function readVapid(){const {data,error}=await supabase.rpc('notification_vapid_get');if(error)throw error;const row=Array.isArray(data)?data[0]:data;return row?.public_key&&row?.private_key?{publicKey:String(row.public_key),privateKey:String(row.private_key),subject:String(row.subject||Deno.env.get('SUPABASE_URL'))}:null;}
async function vapid(){
 const envPublic=Deno.env.get('VAPID_PUBLIC_KEY'),envPrivate=Deno.env.get('VAPID_PRIVATE_KEY'),envSubject=Deno.env.get('VAPID_SUBJECT');
 if(envPublic&&envPrivate)return {publicKey:envPublic,privateKey:envPrivate,subject:envSubject||Deno.env.get('SUPABASE_URL')!};
 const saved=await readVapid();if(saved)return saved;
 const generated=webpush.generateVAPIDKeys(),subject=envSubject||Deno.env.get('SUPABASE_URL')!;
 const {data:claimed,error}=await supabase.rpc('notification_vapid_initialize',{p_public:generated.publicKey,p_private:generated.privateKey,p_subject:subject});if(error)throw error;
 if(claimed)return {publicKey:generated.publicKey,privateKey:generated.privateKey,subject};
 const winner=await readVapid();if(!winner)throw new Error('Could not initialize VAPID keys');return winner;
}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:CORS});
 try{
  const keys=await vapid();
  if(req.method==='GET')return json({publicKey:keys.publicKey,ready:true});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  const secret=req.headers.get('x-cron-secret')||'';const auth=await supabase.rpc('notification_cron_valid',{p_secret:secret});
  if(auth.error||auth.data!==true)return json({error:'Unauthorized'},401);
  webpush.setVapidDetails(keys.subject,keys.publicKey,keys.privateKey);
  let sent=0,lastId='';
  while(true){
   let q=supabase.from('push_subscriptions').select('*').order('id').limit(100);if(lastId)q=q.gt('id',lastId);
   const {data:subscriptions,error}=await q;if(error)throw error;if(!subscriptions?.length)break;lastId=subscriptions.at(-1).id;
   for(const sub of subscriptions){
    if(!allowedEndpoint(sub.endpoint)){await supabase.from('push_subscriptions').delete().eq('id',sub.id);continue;}
    const entries:any[]=[];for(let page=0;;page+=1000){const result=await supabase.from('entries').select('id,kind,data').eq('user_id',sub.user_id).eq('deleted',false).in('kind',['settings','habit','event','log','eventLog']).order('id').range(page,page+999);if(result.error)throw result.error;entries.push(...result.data);if(result.data.length<1000)break;}
    const settings=entries.find(e=>e.kind==='settings')?.data||{},zone=sub.timezone||'America/Asuncion',now=new Date(),current=local(now,zone);
    const working=entries.some(e=>e.kind==='event'&&e.data.area==='trabajo'&&occurs(e.data,current.date)&&e.data.time<=current.time&&e.data.end>current.time);
    for(const entry of entries.filter(e=>['habit','event'].includes(e.kind))){
     const e=entry.data,minutes=Number(e.reminderMinutes);if(e.reminderMinutes===undefined||e.reminderMinutes===null||e.reminderMinutes===''||!Number.isFinite(minutes)||minutes<0||minutes>10080||e.archived)continue;if(settings.quietWork&&working&&e.area!=='trabajo')continue;
     for(let lag=0;lag<5;lag++){
      const target=local(new Date(now.getTime()+(minutes-lag)*60000),zone),date=target.date,override=e.exceptions?.[date]||{},time=override.time||e.time||e.suggestedTime;if(!time||time!==target.time)continue;
      if(entry.kind==='event'&&!occurs(e,date))continue;
      if(entry.kind==='habit'){
       if((e.startDate&&date<e.startDate)||!(e.days||[0,1,2,3,4,5,6]).includes(dow(date)))continue;
       if(!dayModeAllowsHabit(e,effectiveDayMode(settings,date))||weeklyComplete(entries,entry.id,e,date))continue;
      }
      if(entries.some(l=>l.data.date===date&&((l.kind==='log'&&l.data.habitId===entry.id&&['done','skip'].includes(l.data.status))||(l.kind==='eventLog'&&l.data.eventId===entry.id))))continue;
      const occurrence=`${entry.id}:${date}:${time}`;const claim=await supabase.rpc('claim_push',{p_subscription:sub.id,p_occurrence:occurrence});if(claim.error)throw claim.error;if(!claim.data)continue;
      const name=override.name||e.name||'Tenés una actividad',body=entry.kind==='event'?`${time} · ${name}`:name;
      try{await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},JSON.stringify({title:entry.kind==='event'?'Tu agenda te espera':'Un momento para vos',body,date,view:entry.kind==='event'?'calendar':'today',tag:occurrence}),{TTL:300,urgency:'normal'});await supabase.from('push_deliveries').update({sent_at:new Date().toISOString()}).eq('subscription_id',sub.id).eq('occurrence',occurrence);sent++;}
      catch(error:any){if([404,410].includes(error?.statusCode))await supabase.from('push_subscriptions').delete().eq('id',sub.id);}
     }
    }
   }
   if(subscriptions.length<100)break;
  }
  return json({sent});
 }catch(error){console.error('Reminder dispatch failed',error);return json({error:'Reminder dispatch failed'},500);}
});
