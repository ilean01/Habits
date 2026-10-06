import {esc,unique,deweyNumber,cleanIsbn,lookupIsbn,internetOptions,ESTADOS} from './utils.js';
const input=(name,label,value='',extra='')=>`<label class="lib-field ${['titulo','autor'].includes(name)?'wide':''}">${label}<input class="lib-input" name="${name}" value="${esc(value??'')}" ${extra}></label>`;
const text=(name,label,value='')=>`<label class="lib-field">${label}<textarea class="lib-input" name="${name}" rows="4">${esc(value??'')}</textarea></label>`;
const check=(name,label,b)=>`<label class="lib-check"><input type="checkbox" name="${name}" ${b[name]?'checked':''}>${label}</label>`;
const action=(name,label)=>`<button type="button" class="lib-button secondary small" data-editor="${name}">${label}</button>`;
export const coverEditorHtml=b=>`<button type="button" class="lib-button secondary" data-cover-open>🖼 Manejar portada e imágenes</button><p class="nota mini-nota">La portada se maneja en una ventana aparte: buscar imágenes, usar QR o quitar la elegida.</p><img data-cover-preview class="cover-selected-preview" alt="Portada elegida" hidden>
 <dialog class="library-cover-window" aria-label="Manejo de portada" data-cover-window>
 <div class="modal-portada-header"><h3>🖼 Manejo de portada</h3><button type="button" class="mini secundario" data-cover-close aria-label="Cerrar portada">Cerrar</button></div>
 <p class="nota mini-nota">Elegí una portada sin mezclarla con la sinopsis. Esta ventana no se cierra sola.</p>
 <div class="botones-internet">${action('covers','Buscar portadas automáticas')}${action('remove-cover','Quitar portada elegida')}</div>
 <div class="url-portada-box"><input class="lib-input" name="imageQuery" aria-label="Buscar otra imagen" placeholder="Buscar imagen desde la app, ej: título + autor + portada">${action('web-images','Buscar imagen')}</div>
 <div data-qr-slot></div>
 <details class="cover-other-sources"><summary>Subir archivo, pegar imagen o usar un enlace</summary><div class="book-editor-cover"><img data-cover-preview alt="Vista previa de la portada" hidden><div>${input('coverUrl','Enlace de imagen',b.portada_url||(/^https?:/.test(b.portada||'')?b.portada:''),'type="url" placeholder="https://…"')}<label class="lib-field">Subir foto o imagen<input type="file" data-cover-file accept="image/jpeg,image/png,image/webp"></label><p class="nota mini-nota">Podés pegar una imagen o arrastrarla aquí.</p>${action('open-images','Abrir buscador de imágenes')}</div></div></details>
 <p data-cover-status role="status" aria-live="polite"></p><div class="opciones-cabecera" data-cover-results-heading hidden><strong>Resultados</strong>${action('clear-covers','Limpiar resultados')}</div><div data-cover-results class="book-editor-results opciones-portadas"></div>
 </dialog>`;
export const starsHtml=(value=0,editable=false)=>`<div class="estrellas ${editable?'':'solo-lectura'}" ${editable?'role="group" aria-label="Puntuación de 1 a 10"':''}>${Array.from({length:10},(_,i)=>editable?`<button type="button" class="estrella ${i<value?'llena':''}" data-rating="${i+1}" aria-label="${i+1} de 10" aria-pressed="${Number(value)===i+1}">★</button>`:`<span class="estrella ${i<value?'llena':''}">★</span>`).join('')}<small data-rating-text>${value?value+'/10':'sin puntuar'}</small>${editable?`<input type="hidden" name="rating" value="${value||''}">`:''}</div>`;
export function bookEditorHtml(b={},books=[]){
 const datalist=key=>`<datalist id="book-${key}">${unique(books.map(x=>x[key])).map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`;
 return `<div class="book-editor original-edit-fields">
 <input class="original-title editable" aria-label="Título" name="titulo" value="${esc(b.titulo)}" required maxlength="500">
 <input class="original-author autor editable" aria-label="Autor" name="autor" value="${esc(b.autor||'')}">
 ${starsHtml(b.rating,true)}${check('autografiado','✍️ Libro autografiado',b)}
 <div class="fila-campos"><label class="lib-field">Estado de lectura<select name="estado_lectura">${Object.entries(ESTADOS).map(([k,v])=>`<option value="${k}" ${b.estado_lectura===k?'selected':''}>${v}</option>`).join('')}</select></label>${input('pagina_actual','Página actual',b.pagina_actual||0,`type="number" min="0" ${b.paginas?'max="'+b.paginas+'"':''}`)}${input('paginas','Total páginas',b.paginas,'type="number" min="1"')}</div>
 <div class="fila-campos">${input('dewey','Dewey',b.dewey,'placeholder="Ej: 248, 530, 989.2"')}${input('genero','Género',b.genero,'list="book-genero"')}${input('subdivision','Subdivisión',b.subdivision)}</div>${datalist('genero')}
 <div class="fila-campos">${input('editorial','Editorial',b.editorial)}<label class="lib-field">ISBN<span class="campo-con-boton"><input name="isbn" value="${esc(b.isbn||'')}">${action('isbn','Completar')}</span><small class="nota-inline">Solo por número de ISBN.</small></label>${input('idioma','Idioma',b.idioma||'Español')}</div>
 <details><summary>Editar propietario</summary><p class="nota">El código identifica al propietario. El número se calcula solo y no se edita a mano.</p><div class="fila-campos">${input('codigo_p','Código propietario',b.codigo_p,'list="book-codigo_p" maxlength="12"')}${input('assignedNumber','Número del ejemplar',b.item||'Automático','readonly')}</div>${datalist('codigo_p')}</details>
 ${text('descripcion','Descripción / sinopsis',b.descripcion)}${action('web-synopsis','🔎 Buscar sinopsis en Google')}<p class="nota mini-nota">La búsqueda usa título + autor + sinopsis y pega el texto acá para que lo puedas revisar antes de guardar.</p><p data-editor-status role="status"></p><div data-editor-results class="book-editor-results"></div>
 ${text('dedicatoria','💝 Dedicatoria / historia especial',b.dedicatoria)}${text('relacionados','Libros relacionados',b.relacionados)}${text('observaciones','Observaciones',b.observaciones)}
 <input type="hidden" name="lista" value="${esc(b.lista||'catalogo')}"><input type="checkbox" name="favorito" ${b.favorito?'checked':''} hidden><input type="checkbox" name="proxima_lectura" ${b.proxima_lectura?'checked':''} hidden>
 <details class="original-additional-tools"><summary>Más herramientas</summary><div class="lib-actions">${action('info','Buscar datos por título y autor')}${action('synopsis','Buscar sinopsis en catálogos')}${action('open-synopsis','Abrir Google y pegar sinopsis')}<button type="button" data-action="scan-isbn">Escanear ISBN</button></div></details>
 </div>`;
}
export function newBookEditorHtml(b={},books=[]){
 const codes=unique(books.filter(x=>!x.eliminado).map(x=>x.codigo_p));
 const suggestions=(key,defaults=[])=>`<datalist id="book-${key}">${unique([...defaults,...books.filter(x=>!x.eliminado).map(x=>x[key])]).map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`;
 return `<div class="book-editor" data-original-add>
 
 ${input('titulo','Título *',b.titulo,'required maxlength="500"')}${input('autor','Autor',b.autor)}
 ${coverEditorHtml(b)}
 ${text('descripcion','Descripción / sinopsis',b.descripcion)}
 <div class="lib-actions">${action('web-synopsis','🔎 Buscar sinopsis en Google')}</div>
 <p data-editor-status role="status" aria-live="polite"></p><div data-editor-results class="book-editor-results"></div>
 <div class="lib-form-grid">${input('editorial','Editorial',b.editorial)}${input('paginas','Páginas',b.paginas,'type="number" min="1" step="1"')}</div>
 <div class="lib-actions">${check('autografiado','Libro autografiado',b)}${check('proxima_lectura','Quiero leer después',b)}</div>
 <div class="lib-form-grid"><label class="lib-field">ISBN<span class="campo-con-boton"><input name="isbn" value="${esc(b.isbn||'')}" placeholder="Escribí el número de ISBN">${action('isbn','Completar')}</span><small class="nota-inline">Solo por número de ISBN.</small></label>${input('idioma','Idioma',b.idioma||'Español','list="book-idioma"')}</div>
 ${suggestions('idioma',['Español','Inglés','Portugués','Guaraní','Latín','Francés'])}
 <div class="lib-form-grid">${input('genero','Género',b.genero,'list="book-genero" placeholder="Elegí uno o escribí uno nuevo"')}${input('dewey','Dewey',b.dewey,'placeholder="Ej.: 248, 530, 989.2"')}</div>${suggestions('genero')}
 <p class="lib-muted lib-small">Si escribís un género nuevo, queda guardado para próximos libros.</p>
 <details open data-owner-details><summary>Datos del propietario</summary><p class="lib-muted">Ejemplo: LR Nº 340 significa que es el libro número 340 del propietario LR. Ese número ya no se escribe: la app calcula el siguiente.</p>
 <label class="lib-field">Código propietario<select class="lib-select" data-owner-select><option value="">— Sin código —</option>${unique([...codes,b.codigo_p]).map(c=>`<option value="${esc(c)}" ${c===b.codigo_p?'selected':''}>${esc(c)}</option>`).join('')}<option value="__nuevo__">+ Agregar nuevo código</option></select></label>
 <div data-new-owner hidden>${input('codigo_p_nuevo','Nuevo código','','maxlength="12" placeholder="Ej.: MR"')}</div><input type="hidden" name="codigo_p" value="${esc(b.codigo_p||'')}"></details>
 ${input('subdivision','Subdivisión',b.subdivision)}${text('dedicatoria','Dedicatoria / historia especial',b.dedicatoria)}${text('observaciones','Observaciones',b.observaciones)}
 <details class="lib-add-extra"><summary>Más herramientas</summary><button type="button" data-action="scan-isbn">Escanear ISBN</button>${check('favorito','Favorito',b)}${input('rating','Mi puntuación (1 a 10, opcional)',b.rating||'','type="number" min="1" max="10" step="1"')}${text('relacionados','Libros relacionados',b.relacionados)}<div class="lib-actions">${action('info','Buscar datos por título y autor')}${action('clear-results','Limpiar resultados')}</div></details>
 <label class="lib-field">¿A dónde va?<select class="lib-select" name="lista"><option value="catalogo">A la biblioteca (ya lo tengo)</option><option value="deseos" ${b.lista==='deseos'?'selected':''}>A la lista de deseos (lo quiero comprar)</option></select></label>
 </div>`;
}
export function bookEditorValues(form,b={}){
 const fields=['titulo','autor','isbn','editorial','idioma','genero','dewey','subdivision','codigo_p','descripcion','dedicatoria','observaciones','relacionados'];
 const v=Object.fromEntries(fields.map(k=>[k,String(form.get(k)||'').trim()||null]));
 if(!v.titulo)throw new Error('Escribí el título del libro.');
 v.codigo_p=v.codigo_p?.toUpperCase()||null;v.isbn=cleanIsbn(v.isbn)||null;
 v.lista=form.get('lista')==='deseos'?'deseos':'catalogo';
 for(const k of ['paginas','rating']){const raw=form.get(k);v[k]=raw===null||raw===''?null:Number(raw);if(v[k]!==null&&(!Number.isInteger(v[k])||v[k]<1||(k==='rating'&&v[k]>10)))throw new Error(k==='rating'?'La puntuación va de 1 a 10.':'Indicá una cantidad válida de páginas.');}
 if(v.paginas&&Number(b.pagina_actual)>v.paginas)throw new Error('El total de páginas no puede ser menor que la página de lectura actual.');
 for(const k of ['autografiado','favorito','proxima_lectura'])v[k]=form.has(k);
 v.dewey_orden=deweyNumber(v.dewey);return v;
}
export function bindBookEditor(form,{book={},cover='',lookup=lookupIsbn,search=internetOptions,webSearch=null}={}){
 const el=name=>form.elements.namedItem(name),status=form.querySelector('[data-editor-status]'),results=form.querySelector('[data-editor-results]'),previews=form.querySelectorAll('[data-cover-preview]'),coverWindow=form.querySelector('[data-cover-window]'),coverStatus=form.querySelector('[data-cover-status]');
 const opener=form.querySelector('[data-cover-open]');opener.onclick=()=>{if(coverWindow.showModal)coverWindow.showModal();else coverWindow.setAttribute('open','');form.dispatchEvent(new form.ownerDocument.defaultView.Event('cover-window-open'));};form.querySelector('[data-cover-close]').onclick=()=>{if(coverWindow.close)coverWindow.close();else coverWindow.removeAttribute('open');opener.focus();};
 coverWindow.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();if(e.target.name==='imageQuery')coverWindow.querySelector('[data-editor=web-images]').click();}});
 form.querySelectorAll('[data-rating]').forEach(btn=>btn.onclick=()=>{el('rating').value=btn.dataset.rating;form.querySelectorAll('[data-rating]').forEach(x=>{x.classList.toggle('llena',Number(x.dataset.rating)<=Number(btn.dataset.rating));x.setAttribute('aria-pressed',String(x===btn));});form.querySelector('[data-rating-text]').textContent=btn.dataset.rating+'/10';el('rating').dispatchEvent(new form.ownerDocument.defaultView.Event('change',{bubbles:true}));});
 const ownerSelect=form.querySelector('[data-owner-select]');
 if(ownerSelect){const extra=form.querySelector('[data-new-owner]'),value=el('codigo_p_nuevo');const update=()=>{extra.hidden=ownerSelect.value!=='__nuevo__';el('codigo_p').value=extra.hidden?ownerSelect.value:value.value;};ownerSelect.onchange=()=>{update();if(!extra.hidden)value.focus();};value.oninput=update;update();}
 let file=null,url=book.portada_url||book.portada||null,changed=!!book.portada_url,objectUrl='',sequence=0;
 const show=(src)=>{for(const preview of previews){preview.hidden=!src;if(src)preview.src=src;else preview.removeAttribute('src');}};show(cover||book.portada_url||(/^https?:/.test(url||'')?url:''));
 const chooseFile=f=>{if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024){coverStatus.textContent='Elegí una imagen JPG, PNG o WebP de hasta 10 MB.';return;}if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(f);file=f;changed=true;show(objectUrl);coverStatus.textContent='Portada preparada. Se guardará junto con el libro.';};
 const chooseUrl=value=>{if(value&&!/^https?:\/\//i.test(value))throw new Error('La portada debe usar un enlace http o https.');file=null;url=value||null;changed=true;el('coverUrl').value=value||'';show(value);};
 const notify=name=>el(name)?.dispatchEvent(new form.ownerDocument.defaultView.Event('change',{bubbles:true}));
 const coverChanged=()=>form.dispatchEvent(new form.ownerDocument.defaultView.Event('editor-cover-changed'));
 const fill=option=>{for(const k of ['titulo','autor','editorial','paginas','isbn','idioma','descripcion'])if(option[k]&&el(k)&&!el(k).value.trim()){el(k).value=option[k];notify(k);}status.textContent='Completé solo los campos vacíos. Revisá los datos antes de guardar.';};
 form.querySelector('[data-cover-file]').onchange=e=>{chooseFile(e.target.files[0]);coverChanged();};el('coverUrl').onchange=e=>{try{chooseUrl(e.target.value.trim());}catch(err){status.textContent=err.message;}};
 form.addEventListener('paste',e=>{const f=[...(e.clipboardData?.files||[])].find(x=>x.type.startsWith('image/'));if(f){e.preventDefault();chooseFile(f);coverChanged();}});
 const drop=form.querySelector('.book-editor-cover');drop.ondragover=e=>e.preventDefault();drop.ondrop=e=>{e.preventDefault();chooseFile(e.dataTransfer.files[0]);coverChanged();};
 form.querySelectorAll('[data-editor]').forEach(btn=>btn.onclick=async()=>{
  const mode=btn.dataset.editor;const isCover=['covers','web-images','clear-covers','remove-cover','open-images'].includes(mode);const results=form.querySelector(isCover?'[data-cover-results]':'[data-editor-results]'),status=isCover?coverStatus:form.querySelector('[data-editor-status]');if(mode==='clear-results'||mode==='clear-covers'){results.replaceChildren();if(isCover)form.querySelector('[data-cover-results-heading]').hidden=true;status.textContent='';return;}if(mode==='open-images'||mode==='open-synopsis'){const query=mode==='open-images'?(el('imageQuery').value.trim()||el('titulo').value+' '+el('autor').value+' portada'):el('titulo').value+' '+el('autor').value+' sinopsis';window.open('https://www.google.com/search?'+(mode==='open-images'?'tbm=isch&':'')+'q='+encodeURIComponent(query),'_blank','noopener,noreferrer');if(mode==='open-synopsis'){el('descripcion').focus();status.textContent='Pegá la sinopsis en el campo Descripción / sinopsis y revisala.';}return;}if(mode==='remove-cover'){chooseUrl('');coverChanged();form.querySelector('[data-cover-file]').value='';return;}
  const token=++sequence;btn.disabled=true;status.textContent='Buscando…';results.replaceChildren();
  try{
   if(mode!=='isbn'&&!(mode==='web-images'&&el('imageQuery').value.trim())&&!el('titulo').value.trim())throw new Error('Escribí primero el título.');
   let options,providerWarnings=[];if(mode==='covers'&&search!==internetOptions){options=await search(el('titulo').value,el('autor').value);}else if(mode.startsWith('web-')||mode==='covers'){const {supabase}=await import('./client.js');const r=await supabase.functions.invoke('library-web-search',{body:{mode:mode==='web-images'||mode==='covers'?'images':'synopsis',title:el('titulo').value,author:el('autor').value,query:mode==='web-images'||mode==='covers'?(el('imageQuery').value.trim()||el('titulo').value+' '+el('autor').value+' portada'):el('titulo').value+' '+el('autor').value}});if(r.error||r.data?.error){let detail=r.data?.error;try{detail??=(await r.error?.context?.json())?.error;}catch{}throw new Error(detail||'No se pudo consultar el buscador. Usá Abrir buscador para buscar y pegar el resultado.');}options=r.data.results||[];providerWarnings=r.data.warnings||[];}else options=mode==='isbn'?[await lookup(el('isbn').value)]:await search(el('titulo').value,el('autor').value);
   if(token!==sequence||!form.isConnected)return;
   if(isCover)form.querySelector('[data-cover-results-heading]').hidden=!options.length;
   const list=options.filter(o=>mode==='covers'?o.portada_url:mode==='synopsis'?o.descripcion:true);
   status.textContent=list.length?'Elegí qué querés usar. Tus datos no cambian hasta que lo elijas.':'No encontré coincidencias en los proveedores que respondieron.';if(providerWarnings.length)status.textContent+=' Búsqueda parcial: '+providerWarnings.join(' ');
   for(const o of list){const card=document.createElement('section');card.className=isCover?'opcion-portada opcion-solo-portada':'lib-panel';const title=document.createElement('h3');title.textContent=o.titulo||'Resultado';card.append(title);const meta=document.createElement('p');meta.textContent=[o.autor,o.editorial,o.fuente].filter(Boolean).join(' · ');card.append(meta);if(o.source_url&&/^https?:\/\//.test(o.source_url)){const a=document.createElement('a');a.href=o.source_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Leer fuente completa';card.append(a);}
    const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.className='lib-button secondary small';b.textContent=label;b.onclick=fn;card.append(b);};
    if(mode==='info'||mode==='isbn')add('Completar campos vacíos',()=>fill(o));
    if(o.descripcion&&!isCover){const p=document.createElement('p');p.textContent=o.descripcion;card.append(p);add('Usar esta sinopsis',()=>{el('descripcion').value=o.descripcion;notify('descripcion');status.textContent='Sinopsis elegida. Se guardará con el libro.';});}
    if(o.portada_url){const img=document.createElement('img');img.src=o.portada_url;img.alt='Portada propuesta';img.loading='lazy';card.prepend(img);add('Usar esta portada',()=>{chooseUrl(o.portada_url);coverChanged();});}results.append(card);
   }
  }catch(err){if(token===sequence)status.textContent=err.message;}finally{btn.disabled=false;}
 });
 return {chooseStoredCover:(path,previewUrl)=>{file=null;url=path;changed=true;el('coverUrl').value='';show(previewUrl);},cover:()=>{const typed=el('coverUrl').value.trim();if(!file&&typed&&typed!==url)chooseUrl(typed);return {file,url,changed};},dispose:()=>{sequence++;if(coverWindow.open)coverWindow.close?.();if(objectUrl)URL.revokeObjectURL(objectUrl);}};
}
