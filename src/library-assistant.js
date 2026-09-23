import {supabase} from './biblioteca/client.js';
import {answerLocally,relevantBooks} from './library-assistant-domain.js';
export {answerLocally} from './library-assistant-domain.js';
const titleForLoan=(loan,data)=>data.books.find(b=>b.id===loan.libro_id)?.titulo||'Libro no disponible';
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
  style.textContent+=`
.library-ai-launch{position:fixed;right:16px;bottom:16px;min-height:44px;font-size:14px;z-index:60}
.library-ai-panel{position:fixed;right:16px;bottom:72px;width:min(400px,calc(100vw - 32px));height:min(600px,calc(100dvh - 100px));max-height:calc(100dvh - 100px);grid-template-rows:auto minmax(0,1fr) auto auto;font:14px/1.5 system-ui,-apple-system,sans-serif;z-index:61;box-sizing:border-box}
.library-ai-panel *{box-sizing:border-box}.library-ai-body{display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden}.library-ai-messages{flex:1;min-height:0;min-width:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}.library-ai-message{min-width:0;max-width:100%;flex-shrink:0}.library-ai-bubble{font:14px/1.5 system-ui,-apple-system,sans-serif;max-width:100%;min-width:0;overflow-wrap:anywhere;word-break:normal}.library-ai-head strong{font-size:17px}.library-ai-head p{font-size:12px}.library-ai-message small{font-size:11px}.library-ai-suggestions{flex-shrink:0;flex-wrap:wrap;overflow:visible;max-width:100%}.library-ai-chip{font:12px/1.3 system-ui;min-height:40px;white-space:normal;text-align:left}.library-ai-form{min-width:0;grid-template-columns:minmax(0,1fr) auto}.library-ai-input{width:100%;min-width:0;font:16px/1.4 system-ui;min-height:44px}.library-ai-send{font:600 14px/1.3 system-ui;min-height:44px}.library-ai-close{min-width:44px;min-height:44px}.library-ai-mode{display:flex;align-items:center;gap:8px;padding:8px 12px;font:12px/1.4 system-ui}.library-ai-mode input{width:18px;height:18px;flex-shrink:0}
@media(max-width:700px){.library-ai-panel{inset:auto 8px 68px 8px;width:auto;height:min(600px,calc(100dvh - 88px));max-height:calc(100dvh - 88px)}.library-ai-launch{right:10px;bottom:12px}}
`;
  document.head.append(style);
}

export function mountLibraryAssistant(host,{getSnapshot}={}){
  if(!host||host.querySelector('[data-library-ai]'))return;
  if(typeof getSnapshot!=='function')throw new Error('La Bibliotecaria necesita el catálogo activo.');
  injectStyle();
  const launch=document.createElement('button');
  launch.type='button';launch.className='library-ai-launch';launch.dataset.libraryAi='launch';launch.textContent='✦ Bibliotecaria';
  const panel=document.createElement('aside');
  panel.className='library-ai-panel';panel.dataset.libraryAi='panel';panel.setAttribute('aria-label','Bibliotecaria');
  panel.innerHTML=`<div class="library-ai-head"><div><strong>✦ Bibliotecaria</strong><p>Pregunta por tu catálogo, lecturas y préstamos.</p></div><button type="button" class="library-ai-close" aria-label="Cerrar">×</button></div><div class="library-ai-body"><div class="library-ai-messages" role="log" aria-live="polite" aria-label="Conversación"></div><div class="library-ai-suggestions"><button type="button" class="library-ai-chip">¿Qué estoy leyendo?</button><button type="button" class="library-ai-chip">¿Qué presté?</button><button type="button" class="library-ai-chip">Recomendame algo</button><button type="button" class="library-ai-chip">Resumen de mi biblioteca</button></div></div><label class="library-ai-mode"><input type="checkbox" data-cloud-mode> Usar IA externa (comparte la pregunta y datos relevantes)</label><form class="library-ai-form"><input class="library-ai-input" maxlength="1600" placeholder="Preguntá algo…" aria-label="Pregunta a la Bibliotecaria"><button class="library-ai-send" type="submit">Enviar</button></form>`;
  host.append(launch,panel);
  const messages=panel.querySelector('.library-ai-messages');
  const input=panel.querySelector('.library-ai-input');
  const send=panel.querySelector('.library-ai-send');
  addMessage(messages,'assistant','Buscá un título o autor, preguntá de qué se trata un libro, o consultá tus lecturas y préstamos. Uso el mismo catálogo que ves en esta pantalla.','Consulta del catálogo');
  launch.setAttribute('aria-expanded','false');
  launch.onclick=()=>{panel.classList.toggle('open');launch.setAttribute('aria-expanded',String(panel.classList.contains('open')));if(panel.classList.contains('open'))input.focus();};
  const close=()=>{panel.classList.remove('open');launch.setAttribute('aria-expanded','false');launch.focus();};
  panel.querySelector('.library-ai-close').onclick=close;
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  panel.querySelectorAll('.library-ai-chip').forEach(btn=>btn.onclick=()=>{input.value=btn.textContent;input.focus();});
  panel.querySelector('form').onsubmit=async event=>{
    event.preventDefault();
    const message=input.value.trim();if(!message)return;
    input.value='';addMessage(messages,'user',message);send.disabled=true;
    try{
      const snapshot=await getSnapshot();
      if(!panel.querySelector('[data-cloud-mode]').checked){addMessage(messages,'assistant',answerLocally(message,snapshot),'Catálogo · '+(snapshot.library?.nombre||'Biblioteca activa'));return;}
      try{
        const cloud=await cloudAnswer(message,snapshot);
        addMessage(messages,'assistant',cloud.answer,cloud.provider);
      }catch{
        addMessage(messages,'assistant','La IA externa no está disponible. Esta respuesta usa solo el catálogo:\n\n'+answerLocally(message,snapshot),'Consulta local');
      }
    }catch(error){addMessage(messages,'assistant',error?.message||'No pude consultar la biblioteca.');}
    finally{send.disabled=false;if(panel.isConnected&&panel.classList.contains('open'))input.focus();}
  };
}
