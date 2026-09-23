import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const secret=Deno.env.get('REMINDER_CRON_SECRET');
const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
function local(now:Date,zone:string){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};}
function occurs(e:any,date:string){if(e.exceptions?.[date]?.cancelled||date<e.date||(e.until&&date>e.until))return false;const dow=(s:string)=>new Date(s+'T12:00:00Z').getUTCDay();return e.repeat==='daily'||(e.repeat==='weekly'&&dow(e.date)===dow(date))||(e.repeat==='monthly'&&e.date.slice(8)===date.slice(8))||(e.repeat==='yearly'&&e.date.slice(5)===date.slice(5))||e.date===date;}
function allowedEndpoint(value:string){const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&(url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.services.mozilla.com')||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.notify.windows.com'));}
Deno.serve(async req=>{
 if(req.method!=='POST'||!secret||req.headers.get('x-cron-secret')!==secret)return new Response('Unauthorized',{status:401});
 const publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY'),subject=Deno.env.get('VAPID_SUBJECT');
 if(!publicKey||!privateKey||!subject)return new Response('Missing VAPID configuration',{status:503});
 webpush.setVapidDetails(subject,publicKey,privateKey);let sent=0;
 try{
 for(let offset=0;;offset+=100){const {data:subscriptions,error}=await supabase.from('push_subscriptions').select('*').order('id').range(offset,offset+99);if(error)throw error;if(!subscriptions?.length)break;
 for(const sub of subscriptions){if(!allowedEndpoint(sub.endpoint))continue;
 const entries:any[]=[];for(let page=0;;page+=1000){const result=await supabase.from('entries').select('id,kind,data').eq('user_id',sub.user_id).eq('deleted',false).in('kind',['settings','habit','event','log','eventLog']).order('id').range(page,page+999);if(result.error)throw result.error;entries.push(...result.data);if(result.data.length<1000)break;}
 const settings=entries.find(e=>e.kind==='settings')?.data||{},zone=sub.timezone||'America/Asuncion',now=new Date();
 const current=local(now,zone);const working=entries.some(e=>e.kind==='event'&&e.data.area==='trabajo'&&occurs(e.data,current.date)&&e.data.time<=current.time&&e.data.end>current.time);
 for(const entry of entries.filter(e=>['habit','event'].includes(e.kind))){const e=entry.data;if(e.reminderMinutes===undefined||e.reminderMinutes===null||e.reminderMinutes===''||e.archived)continue;if(settings.quietWork&&working&&e.area!=='trabajo')continue;
 for(let lag=0;lag<5;lag++){const target=local(new Date(now.getTime()+(Number(e.reminderMinutes)-lag)*60000),zone),date=target.date,override=e.exceptions?.[date]||{},time=override.time||e.time||e.suggestedTime;if(!time||time!==target.time)continue;
 if(entry.kind==='event'&&!occurs(e,date))continue;
 if(entry.kind==='habit'&&((e.startDate&&date<e.startDate)||!(e.days||[0,1,2,3,4,5,6]).includes(new Date(date+'T12:00:00Z').getUTCDay())))continue;
 if(entries.some(l=>l.data.date===date&&((l.kind==='log'&&l.data.habitId===entry.id&&['done','skip'].includes(l.data.status))||(l.kind==='eventLog'&&l.data.eventId===entry.id))))continue;
 const occurrence=`${entry.id}:${date}:${time}`;const claim=await supabase.rpc('claim_push',{p_subscription:sub.id,p_occurrence:occurrence});if(claim.error)throw claim.error;if(!claim.data)continue;
 try{await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},JSON.stringify({title:'Un momento para vos',body:override.name||e.name||'Tenés una actividad',date,tag:occurrence}),{TTL:300});await supabase.from('push_deliveries').update({sent_at:new Date().toISOString()}).eq('subscription_id',sub.id).eq('occurrence',occurrence);sent++;}
 catch(error:any){if([404,410].includes(error.statusCode))await supabase.from('push_subscriptions').delete().eq('id',sub.id);}
 }
 }
 }
 if(subscriptions.length<100)break;
 }
 return Response.json({sent});
 }catch{ return Response.json({error:'Reminder dispatch failed'},{status:500}); }
});
