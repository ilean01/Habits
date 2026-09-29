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
 const mode=body.mode==='images'?'images':'synopsis',url=mode==='images'?`https://www.bing.com/images/search?q=${encodeURIComponent(q)}&first=1`:`https://www.bing.com/search?format=rss&q=${encodeURIComponent(q+' sinopsis')}`;
 const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0','Accept-Language':'es-ES,es;q=0.9'}});if(!r.ok)throw new Error('El buscador no está disponible. Usá el enlace de búsqueda manual.');
 const html=(await r.text()).slice(0,2000000),results:any[]=[];
 if(mode==='images'){
 const decoded=html.replace(/&quot;/g,'"').replace(/&amp;/g,'&');const seen=new Set();for(const m of decoded.matchAll(/"murl"\s*:\s*"([^"<>]+)"/g)){const image=m[1].replace(/\\\//g,'/');if(!/^https:\/\//i.test(image)||seen.has(image))continue;seen.add(image);results.push({titulo:q,portada_url:image,fuente:'Buscador de imágenes'});if(results.length===20)break;}
 }else for(const m of html.matchAll(/<item>([\s\S]*?)<\/item>/g)){const get=(tag:string)=>text(m[1].match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]||'');results.push({titulo:get('title'),descripcion:get('description'),source_url:get('link'),fuente:'Extracto de búsqueda web; revisar antes de guardar'});if(results.length===10)break;}
 return json({results});
 }catch(error){return json({error:error instanceof Error?error.message:'No se pudo buscar'},502);}
});
