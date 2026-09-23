import {supabase,sessionAndAccess} from './biblioteca/client.js';
import * as libraryData from './biblioteca/data.js';

const STOPWORDS=new Set(['que','qué','como','cómo','para','por','una','uno','unos','unas','del','las','los','con','sin','tengo','tenes','tenés','hay','quiero','libro','libros','biblioteca','mi','mis','me','de','la','el','y','o','a','en','un']);
let cache=null;
let cacheAt=0;

const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const tokens=value=>normalize(value).split(/[^a-z0-9]+/).filter(x=>x.length>1&&!STOPWORDS.has(x));
const bookText=b=>normalize([b.titulo,b.autor,b.genero,b.subdivision,b.editorial,b.dewey,b.codigo_p,b.isbn,b.descripcion,b.observaciones].filter(Boolean).join(' '));
const bookLabel=b=>`${b.titulo||'Sin título'}${b.autor?` — ${b.autor}`:''}`;

async function loadSnapshot(force=false){
  if(!force&&cache&&Date.now()-cacheAt<20000)return cache;
  const session=await sessionAndAccess();
  if(!session.allowed)throw new Error('Iniciá sesión para usar la Bibliotecaria.');
  const [data,libraries]=await Promise.all([
    libraryData.loadAll(),
    supabase.rpc('biblioteca_disponibles').then(r=>r.error?[]:r.data||[]),
  ]);
  cache={...data,library:(libraries||[]).find(x=>x.activa)||null};
  cacheAt=Date.now();
  return cache;
}

function relevantBooks(message,data,limit=30){
  const ts=tokens(message);
  const active=data.books.filter(b=>!b.eliminado);
  if(!ts.length)return active.slice(0,limit);
  return active.map(b=>({b,score:ts.reduce((n,t)=>n+(bookText(b).includes(t)?1:0),0)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||String(a.b.titulo||'').localeCompare(String(b.b.titulo||''),'es'))
    .slice(0,limit).map(x=>x.b);
}

function titleForLoan(loan,data){return data.books.find(b=>b.id===loan.libro_id)?.titulo||'Libro eliminado';}
function list(items,max=8){return items.slice(0,max).map(x=>`• ${x}`).join('\n');}

export function answerLocally(message,data){
  const q=normalize(message);
  const books=data.books.filter(b=>!b.eliminado&&b.lista==='catalogo');
  const wishlist=data.books.filter(b=>!b.eliminado&&b.lista==='deseos');
  const reading=books.filter(b=>['leyendo','releyendo'].includes(b.estado_lectura));
  const loans=data.loans.filter(l=>l.activo);
  const favorites=books.filter(b=>b.favorito);
  const unread=books.filter(b=>['no_leido',null,''].includes(b.estado_lectura));

  if(/^(hola|buenas|hey|holi)\b/.test(q))return `Hola 🌿 Estoy mirando ${data.library?.nombre||'esta biblioteca'}. Podés preguntarme por libros, autores, préstamos, lecturas, favoritos o pedir una recomendación.`;

  if(/cuantos|cuantas|cantidad|total|resumen|estadistica/.test(q)){
    return `Ahora mismo hay ${books.length} libros en catálogo, ${reading.length} en lectura, ${favorites.length} favoritos, ${wishlist.length} en deseos y ${loans.length} préstamo${loans.length===1?'':'s'} activo${loans.length===1?'':'s'}.`;
  }

  if(/prest|quien tiene|quién tiene/.test(q)){
    if(!loans.length)return 'No hay préstamos activos en este momento.';
    const matches=relevantBooks(message,{...data,books},12);
    const ids=new Set(matches.map(b=>b.id));
    const filtered=matches.length?loans.filter(l=>ids.has(l.libro_id)):loans;
    const target=filtered.length?filtered:loans;
    return `Préstamos activos:\n${list(target.map(l=>`${titleForLoan(l,data)} → ${l.persona}${l.fecha_devolucion_prevista?` · previsto ${l.fecha_devolucion_prevista}`:''}`),10)}`;
  }

  if(/leyendo|lectura actual|estoy leyendo|pagina voy|página voy/.test(q)){
    if(!reading.length)return 'No hay ningún libro marcado como lectura actual.';
    return `Lecturas actuales:\n${list(reading.map(b=>`${bookLabel(b)}${b.pagina_actual!=null?` · pág. ${b.pagina_actual}${b.paginas?`/${b.paginas}`:''}`:''}`),10)}`;
  }

  if(/favorit/.test(q)){
    if(!favorites.length)return 'Todavía no hay favoritos marcados.';
    return `Favoritos:\n${list(favorites.map(bookLabel),10)}`;
  }

  if(/deseo|comprar|wishlist/.test(q)){
    if(!wishlist.length)return 'La lista de deseos está vacía.';
    return `En deseos hay ${wishlist.length}:\n${list(wishlist.map(bookLabel),10)}`;
  }

  if(/recomend|que leo|qué leo|proxima lectura|próxima lectura/.test(q)){
    const loaned=new Set(loans.map(l=>l.libro_id));
    const candidates=unread.filter(b=>!loaned.has(b.id)).sort((a,b)=>Number(b.proxima_lectura)-Number(a.proxima_lectura)||Number(b.favorito)-Number(a.favorito)||Number(b.rating||0)-Number(a.rating||0)||Number(a.paginas||99999)-Number(b.paginas||99999));
    if(!candidates.length)return 'No encuentro ahora un libro disponible marcado como no leído.';
    return `Podrías empezar por:\n${list(candidates.slice(0,5).map(b=>`${bookLabel(b)}${b.paginas?` · ${b.paginas} págs.`:''}`),5)}\n\nPriorizo “leer después”, favoritos, valoración y disponibilidad.`;
  }

  const matches=relevantBooks(message,data,10);
  if(matches.length){
    return `Encontré ${matches.length}${matches.length===10?' o más':''} coincidencia${matches.length===1?'':'s'}:\n${list(matches.map(b=>`${bookLabel(b)}${b.estado_lectura?` · ${b.estado_lectura.replaceAll('_',' ')}`:''}`),10)}`;
  }

  return `Puedo consultar la biblioteca real: ${books.length} libros, lecturas, préstamos, deseos y favoritos. Probá con “¿qué estoy leyendo?”, “¿qué presté?”, “buscá Isabel Allende” o “recomendame algo”. Para preguntas abiertas sobre autores u obras, puedo usar una IA externa cuando conectemos una API.`;
}

function compactContext(message,data){
  const books=data.books.filter(b=>!b.eliminado&&b.lista==='catalogo');
  const reading=books.filter(b=>['leyendo','releyendo'].includes(b.estado_lectura));
  const loans=data.loans.filter(l=>l.activo);
  const relevant=relevantBooks(message,data,35);
  return {
    library_name:data.library?.nombre||'Mi biblioteca',
    stats:{catalog:books.length,wishlist:data.books.filter(b=>!b.eliminado&&b.lista==='deseos').length,reading:reading.length,favorites:books.filter(b=>b.favorito).length,active_loans:loans.length},
    current_reading:reading.slice(0,20).map(b=>({title:b.titulo,author:b.autor,page:b.pagina_actual,pages:b.paginas,state:b.estado_lectura})),
    active_loans:loans.slice(0,30).map(l=>({title:titleForLoan(l,data),person:l.persona,loaned:l.fecha_prestamo,due:l.fecha_devolucion_prevista})),
    relevant_books:relevant.map(b=>({title:b.titulo,author:b.autor,genre:b.genero,dewey:b.dewey,pages:b.paginas,state:b.estado_lectura,favorite:b.favorito,next:b.proxima_lectura,rating:b.rating,description:b.descripcion,notes:b.observaciones})),
  };
}

async function cloudAnswer(message,data){
  const {data:response,error}=await supabase.functions.invoke('biblioteca-ai',{body:{message,context:compactContext(message,data)}});
  if(error)throw error;
  if(!response?.answer)throw new Error(response?.error||'La IA externa no está configurada.');
  return {answer:String(response.answer),provider:response.provider||'IA'};
}

function addMessage(container,role,text,meta=''){
  const row=document.createElement('div');
  row.className=`library-ai-message ${role}`;
  const bubble=document.createElement('div');
  bubble.className='library-ai-bubble';
  bubble.textContent=text;
  row.append(bubble);
  if(meta){const small=document.createElement('small');small.textContent=meta;row.append(small);}
  container.append(row);
  container.scrollTop=container.scrollHeight;
}

function injectStyle(){
  if(document.getElementById('library-ai-style'))return;
  const style=document.createElement('style');
  style.id='library-ai-style';
  style.textContent=`
.library-ai-launch{position:absolute;right:18px;bottom:18px;z-index:8;border:0;border-radius:999px;padding:13px 17px;background:#48634d;color:#fff;font:600 15px/1 system-ui;box-shadow:0 10px 30px rgba(31,50,36,.22);cursor:pointer}
.library-ai-panel{position:absolute;right:18px;bottom:72px;z-index:9;width:min(390px,calc(100% - 28px));height:min(620px,calc(100dvh - 210px));display:none;grid-template-rows:auto 1fr auto;background:#fffdf8;border:1px solid #ded6ca;border-radius:20px;box-shadow:0 22px 60px rgba(35,42,34,.2);overflow:hidden;color:#292823}
.library-ai-panel.open{display:grid}.library-ai-head{display:flex;gap:12px;align-items:flex-start;padding:16px 16px 12px;border-bottom:1px solid #ebe5dc;background:#f7f2e9}.library-ai-head strong{display:block;font-family:Georgia,serif;font-size:18px}.library-ai-head p{margin:3px 0 0;color:#756b5f;font-size:12px}.library-ai-close{margin-left:auto;border:0;background:transparent;font-size:24px;cursor:pointer;color:inherit}.library-ai-messages{overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}.library-ai-message{display:flex;flex-direction:column;align-items:flex-start;gap:3px}.library-ai-message.user{align-items:flex-end}.library-ai-bubble{max-width:90%;white-space:pre-wrap;border-radius:16px;padding:10px 12px;background:#f2ede4;line-height:1.42}.library-ai-message.user .library-ai-bubble{background:#48634d;color:white}.library-ai-message small{color:#8d8174;font-size:10px}.library-ai-suggestions{display:flex;gap:6px;overflow:auto;padding:0 12px 10px}.library-ai-chip{white-space:nowrap;border:1px solid #d9cfbf;border-radius:999px;background:#fffdf8;padding:7px 9px;cursor:pointer;font-size:11px}.library-ai-form{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px;border-top:1px solid #ebe5dc;background:#fffdf8}.library-ai-input{min-width:0;border:1px solid #cec4b5;border-radius:13px;padding:11px 12px;font:inherit;background:white;color:inherit}.library-ai-send{border:0;border-radius:13px;padding:0 14px;background:#48634d;color:white;font-weight:700;cursor:pointer}.library-ai-send:disabled{opacity:.5}.habits-library-embed{position:relative}
@media(max-width:700px){.library-ai-launch{right:10px;bottom:10px}.library-ai-panel{position:fixed;inset:auto 8px calc(env(safe-area-inset-bottom) + 8px) 8px;width:auto;height:min(72dvh,640px);z-index:50}}
`;
  document.head.append(style);
}

export function mountLibraryAssistant(host){
  if(!host||host.querySelector('[data-library-ai]'))return;
  injectStyle();
  const launch=document.createElement('button');
  launch.type='button';launch.className='library-ai-launch';launch.dataset.libraryAi='launch';launch.textContent='✦ Bibliotecaria';
  const panel=document.createElement('aside');
  panel.className='library-ai-panel';panel.dataset.libraryAi='panel';panel.setAttribute('aria-label','Bibliotecaria');
  panel.innerHTML=`<div class="library-ai-head"><div><strong>✦ Bibliotecaria</strong><p>Pregunta por tu catálogo, lecturas y préstamos.</p></div><button type="button" class="library-ai-close" aria-label="Cerrar">×</button></div><div><div class="library-ai-messages"></div><div class="library-ai-suggestions"><button type="button" class="library-ai-chip">¿Qué estoy leyendo?</button><button type="button" class="library-ai-chip">¿Qué presté?</button><button type="button" class="library-ai-chip">Recomendame algo</button><button type="button" class="library-ai-chip">Resumen de mi biblioteca</button></div></div><form class="library-ai-form"><input class="library-ai-input" maxlength="1600" placeholder="Preguntá algo…" aria-label="Pregunta a la Bibliotecaria"><button class="library-ai-send" type="submit">Enviar</button></form>`;
  host.append(launch,panel);
  const messages=panel.querySelector('.library-ai-messages');
  const input=panel.querySelector('.library-ai-input');
  const send=panel.querySelector('.library-ai-send');
  addMessage(messages,'assistant','Hola 🌿 Puedo ayudarte con la biblioteca que tengas activa. Si hay una API configurada, también puedo conversar con IA; si no, respondo directamente con tus datos.','Biblioteca');
  launch.onclick=()=>{panel.classList.toggle('open');if(panel.classList.contains('open'))setTimeout(()=>input.focus(),0);};
  panel.querySelector('.library-ai-close').onclick=()=>panel.classList.remove('open');
  panel.querySelectorAll('.library-ai-chip').forEach(btn=>btn.onclick=()=>{input.value=btn.textContent;input.focus();});
  panel.querySelector('form').onsubmit=async event=>{
    event.preventDefault();
    const message=input.value.trim();if(!message)return;
    input.value='';addMessage(messages,'user',message);send.disabled=true;
    try{
      const snapshot=await loadSnapshot();
      try{
        const cloud=await cloudAnswer(message,snapshot);
        addMessage(messages,'assistant',cloud.answer,cloud.provider);
      }catch{
        addMessage(messages,'assistant',answerLocally(message,snapshot),'Modo local · datos de tu biblioteca');
      }
    }catch(error){addMessage(messages,'assistant',error?.message||'No pude consultar la biblioteca.');}
    finally{send.disabled=false;input.focus();}
  };
}
