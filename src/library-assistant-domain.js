const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const ignore=new Set('de que se trata trata sobre dame decime explicame resumen sinopsis argumento por favor un una el la los las a y en del libro libros busca buscar buscame busco tenes tienes tengo hay quien autor autora autores recomendame recomenda recomendar algo leer quiero me mi mis para con por esta este cuantos cuantas cantidad total biblioteca catalogo catálogo corto corta breve paginas páginas menos mas más preste prestamo prestamos prestado prestada tiene activo activos'.split(' '));
const tokens=value=>normalize(value).split(/[^a-z0-9]+/).filter(x=>x.length>1&&!ignore.has(x));
const label=b=>`${b.titulo||'Sin título'}${b.autor?` — ${b.autor}`:''}`;
const list=(values,limit=10)=>values.slice(0,limit).map(v=>`• ${v}`).join('\n');
const indexCache=new WeakMap();

export function createLibraryIndex(books=[]){
 const entries=(books||[]).filter(b=>!b.eliminado).map(book=>{
  const title=normalize(book.titulo),author=normalize(book.autor),genre=normalize(book.genero),description=normalize(book.descripcion),notes=normalize(book.observaciones),meta=normalize([book.editorial,book.isbn,book.idioma,book.codigo_p,book.dewey,book.subdivision].join(' '));
  return {book,title,author,genre,description,notes,meta,all:[title,author,genre,description,notes,meta].filter(Boolean).join(' ')};
 });
 return {entries,byId:new Map(entries.map(entry=>[entry.book.id,entry]))};
}

function indexFor(data){
 const books=data?.books||[];
 if(!Array.isArray(books))return createLibraryIndex([]);
 let index=indexCache.get(books);
 if(!index){index=createLibraryIndex(books);indexCache.set(books,index);}
 return index;
}

export function relevantBooks(message,data,limit=10){
 const q=normalize(message),words=tokens(message);if(!q)return[];
 return indexFor(data).entries.map(entry=>{
  const exactTitle=entry.title.length>2&&q.includes(entry.title),exactAuthor=entry.author.length>2&&q.includes(entry.author);
  let hits=0,score=exactTitle?1000:exactAuthor?500:0;
  for(const word of words){
   if(!entry.all.includes(word))continue;
   hits++;
   if(entry.title.includes(word))score+=18;
   else if(entry.author.includes(word))score+=11;
   else if(entry.genre.includes(word))score+=7;
   else if(entry.meta.includes(word))score+=4;
   else score+=1;
  }
  if(words.length>1&&entry.title.includes(words.join(' ')))score+=120;
  if(words.length>1&&entry.author.includes(words.join(' ')))score+=80;
  const required=words.length<=1?1:Math.ceil(words.length*.55);
  return {book:entry.book,hits,score,keep:exactTitle||exactAuthor||hits>=required};
 }).filter(row=>row.keep).sort((a,b)=>b.score-a.score||String(a.book.titulo||'').localeCompare(String(b.book.titulo||''),'es')).slice(0,limit).map(row=>row.book);
}

function recommendationCandidates(message,books,loans,data){
 let candidates=books.filter(b=>!b.estado_lectura||b.estado_lectura==='no_leido').filter(b=>!loans.some(l=>l.libro_id===b.id));
 const q=normalize(message),maxPages=Number(q.match(/(?:menos de|hasta)\s+(\d{2,4})\s+paginas?/)?.[1]||0);
 if(/\bcort[oa]s?\b|\bbreve\b/.test(q))candidates=candidates.filter(b=>Number(b.paginas||99999)<=280);
 if(maxPages)candidates=candidates.filter(b=>Number(b.paginas||99999)<=maxPages);
 const wanted=tokens(message);
 if(wanted.length){const ids=new Set(relevantBooks(message,{...data,books:candidates},Math.max(50,candidates.length)).map(b=>b.id));if(ids.size)candidates=candidates.filter(b=>ids.has(b.id));}
 candidates.sort((a,b)=>Number(b.proxima_lectura)-Number(a.proxima_lectura)||Number(b.favorito)-Number(a.favorito)||Number(b.rating||0)-Number(a.rating||0)||(a.paginas||99999)-(b.paginas||99999));
 return candidates;
}

export function answerLocally(message,data){
 const q=normalize(message),name=data.library?.nombre||'esta biblioteca',all=(data.books||[]).filter(b=>!b.eliminado),books=all.filter(b=>b.lista!=='deseos'),loans=(data.loans||[]).filter(l=>l.activo),reading=books.filter(b=>['leyendo','releyendo'].includes(b.estado_lectura)),matches=relevantBooks(message,data,50),catalogMatches=matches.filter(b=>b.lista!=='deseos');
 if(/^(hola|buenas|hey)\b/.test(q))return `Hola. Estoy consultando ${name}: ${books.length} libros. Puedo buscar títulos y autores, leer sinopsis guardadas, contar coincidencias y consultar lecturas o préstamos.`;
 if(/de que (se )?trata|sinopsis|argumento|resum[ei].*\b(libro|obra)|resumen de (?!mi biblioteca)/.test(q)){
  if(!matches.length)return `No encontré ese título en ${name}. Probá con el título completo o el autor. No voy a inventar una sinopsis.`;
  if(matches.length>1&&!q.includes(normalize(matches[0].titulo)))return `Encontré varios títulos. ¿Cuál querés consultar?\n${list(matches.map(label),8)}`;
  const b=matches[0];return b.descripcion?.trim()?`${label(b)}\n\n${b.descripcion.trim()}\n\nFuente: sinopsis guardada en la ficha.`:`Encontré ${label(b)}, pero su ficha todavía no tiene sinopsis. Podés completarla desde “Buscar datos y portadas” en el libro.`;
 }
 if(/quien (escribio|escribió)|quien es (el |la )?autor|autor(a)? de/.test(q)&&matches.length){const b=matches[0];return b.autor?`${b.titulo} — ${b.autor}.`:`Encontré ${b.titulo}, pero su ficha no tiene autor registrado.`;}
 const countIntent=/\b(cuantos|cuantas|cantidad|total)\b/.test(q);
 if(countIntent&&tokens(message).length){return `Encontré ${catalogMatches.length} ${catalogMatches.length===1?'libro':'libros'} que coinciden con tu consulta${catalogMatches.length?`:\n${list(catalogMatches.map(label),8)}`:'.'}`;}
 if(/cuantos|cuantas|cantidad|total|resumen|estadistica|estadística/.test(q))return `${name}: ${books.length} libros, ${reading.length} en lectura, ${books.filter(b=>b.favorito).length} favoritos y ${loans.length} préstamos activos.`;
 if(/leyendo|lectura actual|pagina voy|página voy/.test(q))return reading.length?`Lecturas actuales:\n${list(reading.map(b=>`${label(b)} · página ${b.pagina_actual||0}${b.paginas?'/'+b.paginas:''}`),10)}`:'No hay libros marcados como lectura actual en esta biblioteca.';
 if(/prest|quien tiene|quién tiene/.test(q)){const requested=tokens(message),selected=requested.length?loans.filter(l=>matches.some(b=>b.id===l.libro_id)||requested.every(w=>normalize(l.persona).includes(w))):loans;return selected.length?`Préstamos activos:\n${list(selected.map(l=>`${books.find(b=>b.id===l.libro_id)?.titulo||'Libro no disponible'} → ${l.persona}${l.fecha_devolucion_prevista?' · devolución '+l.fecha_devolucion_prevista:''}`),10)}`:'No encontré préstamos activos para esa consulta en esta biblioteca.';}
 if(/favorit/.test(q)){const found=books.filter(b=>b.favorito);return found.length?`Favoritos:\n${list(found.map(label),10)}`:'No hay favoritos marcados.';}
 if(/deseo|comprar/.test(q)){const found=all.filter(b=>b.lista==='deseos');return found.length?`Lista de deseos:\n${list(found.map(label),10)}`:'La lista de deseos está vacía.';}
 if(/recomend|que leo|qué leo|proxima lectura|próxima lectura/.test(q)){const candidates=recommendationCandidates(message,books,loans,data);return candidates.length?`Podrías leer:\n${list(candidates.slice(0,5).map(label),5)}\n\nSon libros sin leer y no prestados. Priorizo tu lista de próximas lecturas, favoritos, valoración y el tipo de libro que pediste.`:'No encontré libros disponibles que coincidan con ese pedido. Podés probar con otro género, autor o rango de páginas.';}
 if(matches.length)return `Encontré ${matches.length===1?'esta coincidencia':'estas coincidencias'}:\n${list(matches.map(label),10)}\nPodés preguntar “¿de qué se trata?” seguido del título.`;
 return books.length?`No encontré una coincidencia en ${name}. Probá con el título, autor, género o ISBN, o preguntá por tus lecturas y préstamos.`:`${name} no tiene libros cargados en el catálogo visible. Si esperabas otra colección, revisá el selector de biblioteca de arriba.`;
}
