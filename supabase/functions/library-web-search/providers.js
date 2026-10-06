// Pure parsers shared by the Edge Function and tests; never execute provider HTML.
export function decodeEntities(value){let s=String(value);for(let i=0;i<3;i++)s=s.replace(/&quot;|&#34;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');return s;}
export const plainText=v=>decodeEntities(String(v).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ')).trim();
export function parseImageSearch(html,query){
 const decoded=decodeEntities(html),seen=new Set(),results=[];
 for(const m of decoded.matchAll(/"murl"\s*:\s*"([^"<>]+)"/g)){
  let url=m[1].replace(/\\\//g,'/').replace(/\\u0026/g,'&');
  if(!/^https?:\/\//i.test(url)||seen.has(url))continue;
  // Browsers cannot show mixed HTTP content inside the HTTPS application.
  url=url.replace(/^http:/i,'https:');seen.add(url);results.push({titulo:query,portada_url:url,fuente:'Buscador de imágenes'});if(results.length===36)break;
 }
 if(!results.length&&!/no (?:results|images|hay resultados)|did not match any|no se encontraron|no hemos encontrado/i.test(plainText(html)))throw new Error('Bing no entregó resultados utilizables (bloqueo o cambio de formato). No es una búsqueda sin coincidencias.');
 return results;
}
export function parseSynopsisSearch(html){if(!/<rss[\s>]/i.test(html))throw new Error('El buscador no entregó una respuesta RSS válida.');return [...html.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,10).map(m=>{const get=tag=>plainText(m[1].match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]||'');return {titulo:get('title'),descripcion:get('description'),source_url:get('link'),fuente:'Extracto de búsqueda web; revisar antes de guardar'};}).filter(x=>x.descripcion);}
export async function searchProviders({query,title='',author='',mode='images'},fetcher=fetch){
 const get=async(url,type)=>{const r=await fetcher(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 BibliotecaPersonal/4.0','Accept-Language':'es-ES,es;q=0.9,en;q=0.8'}});if(!r.ok)throw new Error(`Respuesta HTTP ${r.status}`);return type==='json'?r.json():(await r.text()).slice(0,2000000);};
 const jobs=[{name:'Bing',run:async()=>mode==='images'?parseImageSearch(await get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`),title||query):parseSynopsisSearch(await get(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query+' sinopsis')}`))},
 {name:'Google Books',run:async()=>{const d=await get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title?title+' '+author:query)}&maxResults=12&printType=books`,'json');return (d.items||[]).map(x=>{const b=x.volumeInfo||{};return {titulo:b.title,autor:(b.authors||[]).join(', '),editorial:b.publisher,portada_url:(b.imageLinks?.thumbnail||'').replace(/^http:/,'https:'),descripcion:plainText(b.description||''),fuente:'Google Books'};});}},
 {name:'Open Library',run:async()=>{const d=await get(`https://openlibrary.org/search.json?q=${encodeURIComponent(title?title+' '+author:query)}&limit=12&fields=title,author_name,cover_i`,'json');return (d.docs||[]).filter(x=>x.cover_i).map(x=>({titulo:x.title,autor:(x.author_name||[]).join(', '),portada_url:`https://covers.openlibrary.org/b/id/${x.cover_i}-L.jpg`,fuente:'Open Library'}));}}];
 const settled=await Promise.allSettled(jobs.map(x=>x.run())),warnings=[],results=[],seen=new Set();let successful=0;
 settled.forEach((r,i)=>{if(r.status==='rejected'){warnings.push(jobs[i].name+': '+(r.reason?.message||'No disponible'));return;}successful++;for(const row of r.value){const key=mode==='images'?row.portada_url:row.descripcion;if(key&&!seen.has(key)){seen.add(key);results.push(row);}}});
 if(!successful||(!results.length&&warnings.length))throw new Error('La búsqueda no se pudo completar. '+warnings.join(' '));
 return {results:results.slice(0,40),warnings};
}
