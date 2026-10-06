import {searchProviders} from './providers.js';
import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const text=(v:string)=>v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return json({error:'Método no permitido'},405);
 const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return json({error:'Iniciá sesión'},401);
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
 const user=await client.auth.getUser();if(user.error||!user.data.user)return json({error:'Sesión inválida'},401);
 const access=await client.rpc('has_biblioteca_access');if(access.error||!access.data)return json({error:'Sin acceso a Biblioteca'},403);
 try{
 const body=await req.json();const q=String(body.query||'').trim().slice(0,240);if(!q)return json({error:'Escribí qué querés buscar'},400);
 const mode=body.mode==='images'?'images':'synopsis';
 return json(await searchProviders({query:q,title:String(body.title||'').trim().slice(0,240),author:String(body.author||'').trim().slice(0,240),mode}));
 }catch(error){return json({error:error instanceof Error?error.message:'No se pudo buscar'},502);}
});
