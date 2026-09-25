import {supabase} from './biblioteca/client.js';
import {answerLocally,relevantBooks} from './library-assistant-domain.js';
import {createSnapshotCache} from './library-assistant-cache.js';
export {answerLocally} from './library-assistant-domain.js';

const titleForLoan=(loan,data)=>data.books.find(b=>b.id===loan.libro_id)?.titulo||'Libro no disponible';
const clip=(value,max)=>String(value??'').trim().slice(0,max);

export function compactContext(message,data){
  const books=data.books.filter(b=>!b.eliminado&&b.lista==='catalogo');
  const reading=books.filter(b=>['leyendo','releyendo'].includes(b.estado_lectura));
  const loans=data.loans.filter(l=>l.activo);
  const relevant=relevantBooks(message,data,16);
  const recommendations=books.filter(b=>(!b.estado_lectura||b.estado_lectura==='no_leido')&&!loans.some(l=>l.libro_id===b.id)).sort((a,b)=>Number(b.proxima_lectura)-Number(a.proxima_lectura)||Number(b.favorito)-Number(a.favorito)||Number(b.rating||0)-Number(a.rating||0)||(a.paginas||99999)-(b.paginas||99999)).slice(0,12);
  const bookShape=b=>({title:clip(b.titulo,180),author:clip(b.autor,120),genre:clip(b.genero,80),dewey:clip(b.dewey,40),pages:b.paginas,state:b.estado_lectura,favorite:!!b.favorito,next:!!b.proxima_lectura,rating:Number(b.rating||0),description:clip(b.descripcion,650),notes:clip(b.observaciones,280)});
  return {
    library_name:data.library?.nombre||'Mi biblioteca',
    stats:{catalog:books.length,wishlist:data.books.filter(b=>!b.eliminado&&b.lista==='deseos').length,reading:reading.length,favorites:books.filter(b=>b.favorito).length,active_loans:loans.length},
    current_reading:reading.slice(0,12).map(b=>({title:clip(b.titulo,180),author:clip(b.autor,120),page:b.pagina_actual,pages:b.paginas,state:b.estado_lectura})),
    active_loans:loans.slice(0,20).map(l=>({title:clip(titleForLoan(l,data),180),person:clip(l.persona,120),loaned:l.fecha_prestamo,due:l.fecha_devolucion_prevista})),
    relevant_books:relevant.map(bookShape),
    recommendation_pool:relevant.length?[]:recommendations.map(bookShape)
  };
}

async function cloudAnswer(message,data,history=[]){
  const contextQuery=[...history.filter(x=>x.role==='user').map(x=>x.content),message].slice(-3).join('\n');
  const {data:response,error}=await supabase.functions.invoke('biblioteca-ai',{body:{message,history:history.slice(-8),context:compactContext(contextQuery,data)}});
  if(error){
    let detail=error.message||'La IA externa no está disponible.';
    try{const payload=await error.context?.json();detail=payload?.error||detail;}catch{}
    throw new Error(detail);
  }
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
[data-assistant-host]{box-sizing:border-box}
.library-ai-panel{display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;background:#fffdf8;border:1px solid #ded6ca;border-radius:20px;box-shadow:0 18px 45px rgba(35,42,34,.14);overflow:hidden;color:#292823;font:14px/1.5 system-ui,-apple-system,sans-serif;box-sizing:border-box}
.library-ai-panel *{box-sizing:border-box}
.library-ai-head{display:flex;gap:12px;align-items:flex-start;padding:18px 18px 14px;border-bottom:1px solid #ebe5dc;background:#f7f2e9}
.library-ai-head strong{display:block;font-family:Georgia,serif;font-size:21px}.library-ai-head p{margin:4px 0 0;color:#756b5f;font-size:12px}
.library-ai-body{display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden}
.library-ai-messages{flex:1;min-height:0;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}
.library-ai-message{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0;max-width:100%}.library-ai-message.user{align-items:flex-end}
.library-ai-bubble{max-width:100%;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;border-radius:16px;padding:10px 12px;background:#f2ede4;line-height:1.48}.library-ai-message.user .library-ai-bubble{background:#48634d;color:white}.library-ai-message small{color:#8d8174;font-size:11px}
.library-ai-suggestions{display:flex;gap:7px;flex-wrap:wrap;padding:0 14px 12px}.library-ai-chip{border:1px solid #d9cfbf;border-radius:999px;background:#fffdf8;padding:8px 10px;cursor:pointer;font:12px/1.3 system-ui;min-height:38px;color:inherit}
.library-ai-mode{display:flex;align-items:center;gap:8px;padding:9px 14px;border-top:1px solid #ebe5dc;font:12px/1.4 system-ui;color:#756b5f}.library-ai-mode input{width:18px;height:18px;flex-shrink:0}
.library-ai-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:12px 14px 14px;background:#fffdf8}.library-ai-input{width:100%;min-width:0;border:1px solid #cec4b5;border-radius:13px;padding:11px 12px;font:16px/1.4 system-ui;background:white;color:inherit;min-height:44px}.library-ai-send{border:0;border-radius:13px;padding:0 14px;background:#48634d;color:white;font:700 14px/1.3 system-ui;cursor:pointer;min-height:44px}.library-ai-send:disabled{opacity:.5}
@media(min-width:1050px){
  [data-assistant-host]{position:fixed;right:18px;top:126px;width:390px;z-index:20}
  .library-ai-panel{height:min(720px,calc(100dvh - 150px))}
  .lib-main{padding-right:430px}
}
@media(max-width:1049px){
  [data-assistant-host]{max-width:1500px;margin:0 auto;padding:0 24px 28px}
  .library-ai-panel{height:min(520px,65vh)}
}
@media(max-width:700px){
  [data-assistant-host]{padding:0 14px 24px}
  .library-ai-panel{height:min(500px,68vh);border-radius:16px}
  .library-ai-head{padding:14px}.library-ai-head strong{font-size:19px}
}
`;
  document.head.append(style);
}

export function mountLibraryAssistant(host,{getSnapshot}={}){
  if(!host||host.querySelector('[data-library-ai]'))return;
  if(typeof getSnapshot!=='function')throw new Error('La Bibliotecaria necesita el catálogo activo.');
  injectStyle();

  const loadSnapshot=createSnapshotCache(getSnapshot,{ttl:120000});
  const libraryRoot=document.querySelector('#library-app');
  if(libraryRoot)new MutationObserver(()=>loadSnapshot.invalidate()).observe(libraryRoot,{childList:true});
  window.addEventListener('focus',()=>loadSnapshot.invalidate());

  const panel=document.createElement('aside');
  panel.className='library-ai-panel';
  panel.dataset.libraryAi='panel';
  panel.setAttribute('aria-label','Bibliotecaria');
  panel.innerHTML=`<div class="library-ai-head"><div><strong>✦ Bibliotecaria</strong><p>Siempre disponible mientras recorrés tu biblioteca.</p></div></div><div class="library-ai-body"><div class="library-ai-messages" role="log" aria-live="polite" aria-label="Conversación"></div><div class="library-ai-suggestions"><button type="button" class="library-ai-chip">¿Qué estoy leyendo?</button><button type="button" class="library-ai-chip">¿Qué presté?</button><button type="button" class="library-ai-chip">Recomendame algo corto</button><button type="button" class="library-ai-chip">Resumen de mi biblioteca</button></div></div><label class="library-ai-mode"><input type="checkbox" data-cloud-mode checked> IA Groq activada · comparte solo la pregunta y datos relevantes</label><form class="library-ai-form"><input class="library-ai-input" maxlength="1600" placeholder="Preguntale a tu bibliotecaria…" aria-label="Pregunta a la Bibliotecaria"><button class="library-ai-send" type="submit">Enviar</button></form>`;
  host.append(panel);

  const messages=panel.querySelector('.library-ai-messages');
  const input=panel.querySelector('.library-ai-input');
  const send=panel.querySelector('.library-ai-send');
  const conversation=[];
  const remember=(role,content)=>{conversation.push({role,content:String(content).slice(0,1200)});if(conversation.length>10)conversation.splice(0,conversation.length-10);};

  addMessage(messages,'assistant','Puedo buscar en todo el catálogo, explicar de qué trata un libro, revisar préstamos y lecturas o recomendarte qué leer.','Bibliotecaria lista');
  panel.querySelectorAll('.library-ai-chip').forEach(btn=>btn.onclick=()=>{input.value=btn.textContent;input.focus();});

  panel.querySelector('form').onsubmit=async event=>{
    event.preventDefault();
    const message=input.value.trim();
    if(!message||send.disabled)return;
    input.value='';
    addMessage(messages,'user',message);
    const previous=conversation.slice();
    remember('user',message);
    send.disabled=true;
    panel.setAttribute('aria-busy','true');
    try{
      const snapshot=await loadSnapshot();
      const count=(snapshot.books||[]).filter(b=>!b.eliminado&&b.lista!=='deseos').length;
      if(!panel.querySelector('[data-cloud-mode]').checked){
        const local=answerLocally(message,snapshot);
        addMessage(messages,'assistant',local,`Índice local · ${count.toLocaleString('es-PY')} libros`);
        remember('assistant',local);
        return;
      }
      try{
        const cloud=await cloudAnswer(message,snapshot,previous);
        addMessage(messages,'assistant',cloud.answer,`${cloud.provider} · contexto acotado`);
        remember('assistant',cloud.answer);
      }catch(error){
        const local=answerLocally(message,snapshot);
        addMessage(messages,'assistant',`Groq no respondió (${error?.message||'error'}). Mientras tanto uso tu catálogo:\n\n${local}`,`Consulta local · ${count.toLocaleString('es-PY')} libros`);
        remember('assistant',local);
      }
    }catch(error){
      addMessage(messages,'assistant',error?.message||'No pude consultar la biblioteca.');
    }finally{
      send.disabled=false;
      panel.removeAttribute('aria-busy');
      if(panel.isConnected)input.focus();
    }
  };
}
