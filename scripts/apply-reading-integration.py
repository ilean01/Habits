from pathlib import Path

path = Path('src/main.js')
source = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperaba 1 coincidencia y encontré {count}')
    source = source.replace(old, new, 1)


def replace_line(prefix, new, label):
    global source
    lines = source.splitlines()
    indexes = [i for i, line in enumerate(lines) if line.startswith(prefix)]
    if len(indexes) != 1:
        raise SystemExit(f'{label}: esperaba 1 línea y encontré {len(indexes)}')
    lines[indexes[0]:indexes[0]+1] = new.splitlines()
    source = '\n'.join(lines) + ('\n' if source.endswith('\n') else '')


replace_once(
"import { daySummary, dayWelcome } from './daily.js';",
"import { daySummary, dayWelcome } from './daily.js';\nimport { initCatalog, closeCatalog, catalog, catalogBook, isCatalogId, recordProgress, refreshCatalog } from './library-bridge.js';",
'import de Biblioteca'
)

replace_line(
'function greeting(){',
"""function greeting(){return dayWelcome().greeting;}
const readingTitle=r=>catalogBook(r.bookId)?.titulo||r.bookTitle||get('book',r.bookId)?.title||'Lectura libre';""",
'saludo y título de lectura'
)

replace_line(
'async function enter(u){',
"""async function enter(u){if(user?.id===u.id&&ready)return;db.closeStore();closeCatalog();user=u;ready=true;await db.openStore(u.id,render);initCatalog(u.id,render);if(!settings().name&&u.user_metadata?.name)db.put('settings',{...settings(),name:u.user_metadata.name},'settings');render();}""",
'inicialización del catálogo'
)

replace_once(
"journals:rec('journal')},today)",
"journals:rec('journal'),finishedBooks:catalog().finishedToday},today)",
'libros terminados en resumen'
)

replace_once(
"detail:`${r.minutes} min · ${get('book',r.bookId)?.title||'Lectura libre'}`",
"detail:`${r.minutes} min · ${readingTitle(r)}`",
'título de lectura en línea de tiempo'
)

replace_line(
'function readingWidget(){',
"""function currentReading(){const c=catalog();if(c.allowed){const b=c.reading[0];return b?{id:'lib:'+b.id,title:b.titulo,author:b.autor,page:b.pagina_actual||0,pages:b.paginas,more:c.reading.length-1}:null;}const b=rec('book').find(b=>b.status==='reading');return b?{id:b.id,title:b.title,author:b.author,page:b.page||0,pages:b.pages,more:0}:null;}
function readingWidget(){const c=catalog(),book=currentReading(),timer=get('timer','reading-timer');const link=c.allowed?`<a class="text-button reading-link" href="./biblioteca.html">Ir a mi biblioteca ${icon('ArrowRight')}</a>`:`<button class="text-button reading-link" data-action="library">Ir a mi biblioteca ${icon('ArrowRight')}</button>`;return `<h3>${book?esc(book.title):'Una página, un nuevo mundo.'}</h3><p>${book?esc(book.author||'Tu lectura actual'):c.allowed?'Cuando empieces un libro en tu biblioteca, va a aparecer acá.':'Guardá tus libros y disfrutá de un ratito de lectura.'}</p>${book?`<div class="book-progress"><span>Página ${book.page} de ${book.pages||'—'}${book.more>0?` · y ${book.more} ${book.more===1?'libro más':'libros más'}`:''}</span><progress value="${book.page}" max="${book.pages||100}"></progress></div>`:''}${timer?`<div class="timer-display" data-timer>${fmtDuration(elapsed(timer))}</div><div class="button-row">${btn(icon(timer.running?'Pause':'Play')+(timer.running?'Pausar':'Seguir'),'timer-toggle','','button outline')}${btn(icon('Square')+'Terminar','timer-stop','','button primary')}</div>`:btn(icon('Play')+'Mi momento de lectura','timer-start','','button outline wide')}${link}`;}""",
'rincón de lectura'
)

old_space = "tab==='biblioteca'?`<section class=\"panel\"><h2>Biblioteca privada compartida</h2><p>El catálogo completo está disponible únicamente para las cuentas autorizadas.</p><a class=\"button outline\" href=\"./biblioteca.html\">Abrir biblioteca privada</a></section>${libraryView()}`:tab==='progreso'"
new_space = "tab==='biblioteca'?libraryView():tab==='progreso'"
replace_once(old_space, new_space, 'pestaña Biblioteca')

replace_line(
'function libraryView(){',
"""function catalogReadingCards(){const c=catalog();return c.reading.map(b=>`<article class="book-card"><a class="book-cover" href="./biblioteca.html"><span>${icon('BookOpen')}</span><h3>${esc(b.titulo)}</h3><small>${esc(b.autor||'')}</small></a><div class="book-details"><span class="tag">${b.estado_lectura==='releyendo'?'Releyendo':'Leyendo'}</span><h3>${esc(b.titulo)}</h3><p>${esc(b.autor||'Sin autor registrado')}</p><progress max="${b.paginas||100}" value="${b.pagina_actual||0}"></progress><small>${b.pagina_actual||0} / ${b.paginas||'—'} páginas</small></div></article>`).join('')||empty('Cuando empieces un libro en tu biblioteca, va a aparecer acá.');}
function libraryView(){const c=catalog();return `<div class="section-title"><div><h2>Entre páginas</h2><p>${c.allowed?'Lo que estás leyendo ahora en tu biblioteca.':'Historias que te acompañan.'}</p></div>${c.allowed?'<a class="button primary" href="./biblioteca.html">Abrir mi biblioteca</a>':btn(icon('Plus')+'Agregar libro','new-book','','button primary')}</div><div class="library-layout"><div class="books-grid">${c.allowed?catalogReadingCards():rec('book').map(b=>`<article class="book-card"><button class="book-cover" style="--book:${safeColor(b.color)}" data-action="edit-book" data-id="${b.id}"><span>${icon('BookOpen')}</span><h3>${esc(b.title)}</h3><small>${esc(b.author)}</small></button><div class="book-details"><span class="tag">${({reading:'Leyendo',pending:'Por leer',finished:'Terminado',paused:'En pausa'})[b.status]}</span><h3>${esc(b.title)}</h3><p>${esc(b.author||'Sin autor registrado')}</p><progress max="${b.pages||100}" value="${b.page||0}"></progress><small>${b.page||0} / ${b.pages||'—'} páginas</small>${btn('Actualizar lectura '+icon('ArrowRight'),'edit-book',`data-id="${b.id}"`,'text-button')}</div></article>`).join('')||empty('Tu próximo libro favorito merece un lugar acá.','new-book','Agregar libro')}</div><aside class="panel reading-panel">${readingWidget()}<hr><h3>Sesiones recientes</h3>${rec('reading').sort((a,b)=>b.at.localeCompare(a.at)).slice(0,5).map(r=>`<p class="session-row"><span>${esc(readingTitle(r))}<small>${prettyDate(r.date,{day:'numeric',month:'short'})}</small></span><b>${r.minutes} min</b></p>`).join('')||'<p class="muted">Un momento de lectura también es un logro.</p>'}${btn('Registrar minutos manualmente','manual-reading','','text-button')}</aside></div><div class="section-title"><h2>Palabras para guardar</h2>${btn(icon('Plus')+'Guardar cita','new-quote','','text-button')}</div><div class="quotes-grid">${rec('quote').map(q=>`<button class="quote-card" data-action="edit-quote" data-id="${q.id}"><blockquote>“${esc(q.text)}”</blockquote><small>${esc(catalogBook(q.bookId)?.titulo||q.bookTitle||get('book',q.bookId)?.title||q.author||'Mi cita favorita')}${q.page?' · p. '+q.page:''}</small></button>`).join('')||'<p class="muted">Guardá acá las frases que te hacen detenerte un momento.</p>'}</div>`;}""",
'vista de Biblioteca'
)

replace_line(
" if(kind==='quote')fields=",
""" if(kind==='quote')fields=`${textarea('La frase que querés guardar','text',r.text)}${select('Libro','bookId',[['','Sin libro'],...(catalog().allowed?catalog().reading.map(b=>['lib:'+b.id,b.titulo]):rec('book').map(b=>[b.id,b.title]))],r.bookId)}${input('Página (opcional)','page',r.page,'number','min="1"')}${input('Autor (opcional)','author',r.author)}`;""",
'selector de libro en citas'
)

replace_line(
'function readingForm(',
"""function readingForm(minutes=0,timer=null){const c=catalog(),books=c.allowed?c.reading.map(b=>['lib:'+b.id,b.titulo]):rec('book').map(b=>[b.id,b.title]);const selected=timer?.bookId||currentReading()?.id||'';const progress=c.allowed&&c.canWrite&&c.reading.length?`<div class="form-grid">${input('¿En qué página quedaste? (opcional)','page','','number','min="0" max="100000"')}<label class="check-label" style="align-self:end"><input type="checkbox" name="finish">¡Terminé este libro!</label></div><p class="muted small">La página y el final se guardan también en tu biblioteca.</p>`:'';showModal('Tu momento de lectura',`<form>${select('¿Qué leíste?','bookId',[['','Lectura libre'],...books],selected)}<div class="form-grid">${input('Fecha','date',dayKey(),'date','required')}${input('Minutos de lectura','minutes',minutes||1,'number','required min="1" max="1440"')}</div>${progress}${textarea('Algo para recordar','note','')}${formFooter('reading','')}</form>`,f=>{const bookId=f.get('bookId')||'',lib=catalogBook(bookId),page=f.get('page'),finish=f.get('finish')==='on';if(lib&&page!==null&&page!==''&&lib.paginas&&Number(page)>lib.paginas)throw new Error(`Este libro tiene ${lib.paginas} páginas.`);db.put('reading',{bookId,bookTitle:lib?.titulo||'',date:f.get('date'),note:f.get('note')||'',minutes:Number(f.get('minutes')),at:new Date().toISOString()});if(timer)db.remove('reading-timer');modal.close();toast('Tu tiempo de lectura quedó guardado.');if(lib&&(finish||(page!==null&&page!=='')))recordProgress(bookId,{page:page===''||page===null?null:Number(page),finish,comment:f.get('note')||''}).then(()=>toast(finish?`¡Terminaste «${lib.titulo}»! Qué lindo logro.`:'Tu página quedó guardada en la biblioteca.')).catch(e=>toast('La lectura se guardó, pero no la página: '+e.message));});}""",
'formulario de lectura'
)

replace_once(
"db.closeStore();user=null;ready=false;modal.close();render();",
"db.closeStore();closeCatalog();user=null;ready=false;modal.close();render();",
'cierre de catálogo al salir'
)

replace_once(
"if(a==='timer-start'){const book=rec('book').find(b=>b.status==='reading');",
"if(a==='timer-start'){const book=currentReading();",
'libro del temporizador'
)

for marker in [
    "finishedBooks:catalog().finishedToday",
    "function currentReading()",
    "function catalogReadingCards()",
    "recordProgress(bookId",
    "closeCatalog();user=null"
]:
    if marker not in source:
        raise SystemExit(f'Falta marcador final: {marker}')

path.write_text(source, encoding='utf-8')
print('Integración de lectura aplicada correctamente.')
