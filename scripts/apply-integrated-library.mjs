import fs from 'node:fs';

function replaceOnce(source,needle,replacement,label){
  if(!source.includes(needle))throw new Error(`No encontré el marcador: ${label}`);
  const first=source.indexOf(needle),second=source.indexOf(needle,first+needle.length);
  if(second!==-1)throw new Error(`Marcador duplicado: ${label}`);
  return source.slice(0,first)+replacement+source.slice(first+needle.length);
}

// Biblioteca: cuando está embebida, hereda tema/escala de Habits y comunica altura/contexto.
{
  const path='src/biblioteca-main.js';
  let src=fs.readFileSync(path,'utf8');
  const oldRoot="const root=document.querySelector('#library-app'),modal=document.querySelector('#library-modal'),initialQuery=new URL(location.href).searchParams.get('q')?.trim()||'';";
  const newRoot="const params=new URL(location.href).searchParams,embedded=params.get('embedded')==='1';\nconst root=document.querySelector('#library-app'),modal=document.querySelector('#library-modal'),initialQuery=params.get('q')?.trim()||'';";
  src=replaceOnce(src,oldRoot,newRoot,'root/embedded');
  src=replaceOnce(src,'const s={user:null,','const s={user:null,embedded,libraries:[],members:[],canManage:false,','estado embedded');
  const marker="s.labelFilteredBooks=()=>s.data.books.filter(b=>!b.eliminado&&b.lista==='catalogo'&&u.matchesSearch(b,s.labelFilters.q)&&(!s.labelFilters.codigo_p||b.codigo_p===s.labelFilters.codigo_p)&&(!s.labelFilters.genero||b.genero===s.labelFilters.genero)&&String(b.dewey||'').startsWith(s.labelFilters.dewey||''));";
  const integration=`${marker}\nfunction postHost(payload){if(!embedded||window.parent===window)return;window.parent.postMessage({source:'habits-library',...payload},location.origin);}\nfunction activeLibrary(){return s.libraries?.find(l=>l.activa)||null;}\nfunction notifyHostContext(){const active=activeLibrary();postHost({type:'context',name:active?.nombre||s.config?.nombre_biblioteca||'Mi biblioteca',role:active?.rol||'',own:!!active?.propia,canWrite:!!s.canWrite});}\nfunction applyHostAppearance(message){if(!embedded||message?.source!=='habits-shell'||message.type!=='appearance')return;document.documentElement.dataset.habitsTheme=message.theme==='dark'?'dark':'light';document.documentElement.classList.toggle('habits-large',!!message.large);document.documentElement.classList.toggle('habits-quiet',!!message.quiet);}\nif(embedded){window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===window.parent)applyHostAppearance(event.data);});const report=()=>requestAnimationFrame(()=>postHost({type:'resize',height:Math.ceil(root.scrollHeight+12)}));new ResizeObserver(report).observe(root);window.addEventListener('load',()=>{postHost({type:'ready'});report();},{once:true});}`;
  src=replaceOnce(src,marker,integration,'integración con shell');
  const sharing=/async function loadSharing\(\)\{[\s\S]*?\}\nasync function reload/;
  if(!sharing.test(src))throw new Error('No encontré loadSharing');
  src=src.replace(sharing,"async function loadSharing(){const l=await supabase.rpc('biblioteca_disponibles');s.libraries=l.error?[]:l.data||[];const manage=await supabase.rpc('biblioteca_can_manage');s.canManage=manage.error?false:manage.data===true;if(s.canManage){const m=await supabase.rpc('biblioteca_miembros');s.members=m.error?[]:m.data||[];}else s.members=[];notifyHostContext();}\nasync function reload");
  fs.writeFileSync(path,src);
}

// Biblioteca: en modo embebido quita la segunda marca/volver, pero conserva toda la subnavegación.
{
  const path='src/biblioteca/views.js';
  let src=fs.readFileSync(path,'utf8');
  const pattern=/export function headerView\(s\)\{[\s\S]*?\n\}\n\nexport function catalogView/;
  if(!pattern.test(src))throw new Error('No encontré headerView');
  const replacement=[
    "export function headerView(s){",
    "  const overdueCount=s.data.loans.filter(overdue).length;",
    "  const readingCount=s.data.books.filter(b=>!b.eliminado&&['leyendo','releyendo'].includes(b.estado_lectura)).length;",
    "  const nav=[['catalogo','Catálogo'],['lecturas',`📖 Estoy leyendo${readingCount?` (${readingCount})`:''}`],['prestamos',`📚 Préstamos${overdueCount?` ⚠${overdueCount}`:''}`],['deseos','🛒 Deseos'],['proximas','📌 Leer después'],['revisar','🔎 Revisar'],['estadisticas','Estadísticas'],['etiquetas','🏷 Etiquetas'],['papelera','♻ Papelera'],['configuracion','⚙ Configuración']];",
    "  const active=(s.libraries||[]).find(l=>l.activa);",
    "  const switcher=(s.libraries||[]).length>1?`<select class=\"lib-select lib-switch\" data-lib-switch aria-label=\"Elegir biblioteca\">${s.libraries.map(l=>`<option value=\"${esc(l.owner_id)}\" ${l.activa?'selected':''}>${esc(l.propia?'Mi biblioteca personal':`${l.nombre} · ${l.email}`)}</option>`).join('')}</select>`:'';",
    "  const navigation=`<nav class=\"lib-nav\">${nav.map(([id,label])=>button(label,'view',`data-view=\"${id}\"`,s.view===id?'active':'')).join('')}${button('+ Agregar','new-book','','lib-button')}</nav>`;",
    "  if(s.embedded)return `<header class=\"lib-header lib-header-embedded\"><div class=\"lib-integrated-context\"><div class=\"lib-integrated-context-copy\"><small>Biblioteca activa</small><strong>${esc(active?.propia?'Mi biblioteca':active?.nombre||s.config.nombre_biblioteca||'Mi biblioteca')}</strong></div>${switcher}</div>${navigation}</header>`;",
    "  return `<header class=\"lib-header\"><div class=\"lib-header-top\"><a class=\"lib-brand\" href=\"./\"><span class=\"lib-brand-mark\">📚</span><span>${esc(s.config.nombre_biblioteca||'Mi biblioteca')}</span></a><a class=\"lib-back\" href=\"./\">← Volver a Habits</a>${switcher}<div class=\"lib-header-spacer\"></div><span class=\"lib-user\">${esc(s.user?.email||'')}</span></div>${navigation}</header>`;",
    "}",
    "",
    "export function catalogView"
  ].join('\n');
  src=src.replace(pattern,replacement);
  fs.writeFileSync(path,src);
}

console.log('Integración visual de Biblioteca aplicada.');
