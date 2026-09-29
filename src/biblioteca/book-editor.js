import {esc,unique,deweyNumber,cleanIsbn,lookupIsbn,internetOptions} from './utils.js';
const input=(name,label,value='',extra='')=>`<label class="lib-field ${['titulo','autor'].includes(name)?'wide':''}">${label}<input class="lib-input" name="${name}" value="${esc(value??'')}" ${extra}></label>`;
const text=(name,label,value='')=>`<label class="lib-field">${label}<textarea class="lib-input" name="${name}" rows="4">${esc(value??'')}</textarea></label>`;
const check=(name,label,b)=>`<label class="lib-check"><input type="checkbox" name="${name}" ${b[name]?'checked':''}>${label}</label>`;
const action=(name,label)=>`<button type="button" class="lib-button secondary small" data-editor="${name}">${label}</button>`;
export function bookEditorHtml(b={},books=[]){
 const suggestions=(key,defaults=[])=>`<datalist id="book-${key}">${unique([...defaults,...books.filter(x=>!x.eliminado).map(x=>x[key])]).map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`;
 return `<div class="book-editor"><p class="lib-muted">Completá los datos que conozcas. Solo el título es obligatorio.</p>
 <div class="lib-form-grid">${input('titulo','Título *',b.titulo,'required maxlength="500"')}${input('autor','Autor',b.autor)}${input('isbn','ISBN',b.isbn)}<div class="lib-actions">${action('isbn','Completar por ISBN')}<button type="button" class="lib-button secondary small" data-action="scan-isbn">Escanear ISBN</button></div></div>
 <div class="lib-actions">${action('info','Buscar datos por título y autor')}${action('synopsis','Buscar sinopsis')}${action('covers','Buscar portadas')}</div><p data-editor-status role="status" aria-live="polite"></p><div data-editor-results class="book-editor-results"></div>
 <details><summary>Manejar portada e imágenes</summary><div class="book-editor-cover"><img data-cover-preview alt="Vista previa de la portada" hidden><div>${input('coverUrl','Enlace de imagen',b.portada_url||(/^https?:/.test(b.portada||'')?b.portada:''),'type="url" placeholder="https://…"')}<label class="lib-field">Subir foto o imagen<input type="file" data-cover-file accept="image/jpeg,image/png,image/webp"></label><p class="lib-muted lib-small">También podés pegar una imagen o arrastrarla aquí. La carga por QR está disponible en la ficha del libro guardado.</p>${action('remove-cover','Quitar portada elegida')}</div></div></details>
 ${text('descripcion','Descripción / sinopsis',b.descripcion)}
 <details open><summary>Datos del libro</summary><div class="lib-form-grid">${input('editorial','Editorial',b.editorial)}${input('paginas','Total de páginas',b.paginas,'type="number" min="1" step="1"')}${input('idioma','Idioma',b.idioma||'Español','list="book-idioma"')}${input('genero','Género',b.genero,'list="book-genero"')}${input('dewey','Dewey',b.dewey,'placeholder="Ej.: 989.2"')}${input('subdivision','Subdivisión',b.subdivision)}</div>${suggestions('idioma',['Español','Inglés','Portugués','Guaraní','Latín','Francés'])}${suggestions('genero')}<p class="lib-muted lib-small">Podés elegir un género existente o escribir uno nuevo. Dewey se carga manualmente.</p></details>
 <details open><summary>Propietario y ubicación</summary><div class="lib-form-grid">${input('codigo_p','Código del propietario',b.codigo_p,'list="book-codigo_p" maxlength="12" placeholder="Ej.: LR"')}${input('assignedNumber','Número del ejemplar',b.item?`Nº ${b.item}`:'Automático al entrar al catálogo','readonly')}</div>${suggestions('codigo_p')}<p class="lib-muted lib-small">El número se asigna automáticamente por propietario. El código identifica al dueño del ejemplar; no cambia quién tiene acceso a la biblioteca.</p><label class="lib-field">¿A dónde va?<select class="lib-select" name="lista"><option value="catalogo">Biblioteca · ya lo tengo</option><option value="deseos" ${b.lista==='deseos'?'selected':''}>Deseos · quiero comprarlo</option></select></label></details>
 <div class="lib-actions">${check('autografiado','Autografiado',b)}${check('favorito','Favorito',b)}${check('proxima_lectura','Quiero leer después',b)}</div>
 ${input('rating','Mi puntuación (1 a 10, opcional)',b.rating||'','type="number" min="1" max="10" step="1"')}${text('dedicatoria','Dedicatoria / historia especial',b.dedicatoria)}${text('observaciones','Observaciones',b.observaciones)}${text('relacionados','Libros relacionados',b.relacionados)}
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
export function bindBookEditor(form,{book={},cover='',lookup=lookupIsbn,search=internetOptions}={}){
 const el=name=>form.elements.namedItem(name),status=form.querySelector('[data-editor-status]'),results=form.querySelector('[data-editor-results]'),preview=form.querySelector('[data-cover-preview]');
 let file=null,url=book.portada_url||book.portada||null,changed=!!book.portada_url,objectUrl='',sequence=0;
 const show=(src)=>{preview.hidden=!src;if(src)preview.src=src;else preview.removeAttribute('src');};show(cover||book.portada_url||(/^https?:/.test(url||'')?url:''));
 const chooseFile=f=>{if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024){status.textContent='Elegí una imagen JPG, PNG o WebP de hasta 10 MB.';return;}if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(f);file=f;changed=true;show(objectUrl);status.textContent='Portada preparada. Se guardará junto con el libro.';};
 const chooseUrl=value=>{if(value&&!/^https?:\/\//i.test(value))throw new Error('La portada debe usar un enlace http o https.');file=null;url=value||null;changed=true;el('coverUrl').value=value||'';show(value);};
 const fill=option=>{for(const k of ['titulo','autor','editorial','paginas','isbn','idioma','descripcion'])if(option[k]&&el(k)&&!el(k).value.trim())el(k).value=option[k];status.textContent='Completé solo los campos vacíos. Revisá los datos antes de guardar.';};
 form.querySelector('[data-cover-file]').onchange=e=>chooseFile(e.target.files[0]);el('coverUrl').onchange=e=>{try{chooseUrl(e.target.value.trim());}catch(err){status.textContent=err.message;}};
 form.addEventListener('paste',e=>{const f=[...(e.clipboardData?.files||[])].find(x=>x.type.startsWith('image/'));if(f){e.preventDefault();chooseFile(f);}});
 const drop=form.querySelector('.book-editor-cover');drop.ondragover=e=>e.preventDefault();drop.ondrop=e=>{e.preventDefault();chooseFile(e.dataTransfer.files[0]);};
 form.querySelectorAll('[data-editor]').forEach(btn=>btn.onclick=async()=>{
  const mode=btn.dataset.editor;if(mode==='remove-cover'){chooseUrl('');form.querySelector('[data-cover-file]').value='';return;}
  const token=++sequence;btn.disabled=true;status.textContent='Buscando…';results.replaceChildren();
  try{
   if(mode!=='isbn'&&!el('titulo').value.trim())throw new Error('Escribí primero el título.');
   const options=mode==='isbn'?[await lookup(el('isbn').value)]:await search(el('titulo').value,el('autor').value);
   if(token!==sequence||!form.isConnected)return;
   const list=options.filter(o=>mode==='covers'?o.portada_url:mode==='synopsis'?o.descripcion:true);
   status.textContent=list.length?'Elegí qué querés usar. Tus datos no cambian hasta que lo elijas.':'No encontré resultados. Podés completar los datos manualmente.';
   for(const o of list){const card=document.createElement('section');card.className='lib-panel';const title=document.createElement('h3');title.textContent=o.titulo||'Resultado';card.append(title);const meta=document.createElement('p');meta.textContent=[o.autor,o.editorial,o.fuente].filter(Boolean).join(' · ');card.append(meta);
    const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.className='lib-button secondary small';b.textContent=label;b.onclick=fn;card.append(b);};
    if(mode==='info'||mode==='isbn')add('Completar campos vacíos',()=>fill(o));
    if(o.descripcion&&mode!=='covers'){const p=document.createElement('p');p.textContent=o.descripcion;card.append(p);add('Usar esta sinopsis',()=>{el('descripcion').value=o.descripcion;status.textContent='Sinopsis elegida. Se guardará con el libro.';});}
    if(o.portada_url){const img=document.createElement('img');img.src=o.portada_url;img.alt='Portada propuesta';img.loading='lazy';card.append(img);add('Usar esta portada',()=>chooseUrl(o.portada_url));}results.append(card);
   }
  }catch(err){if(token===sequence)status.textContent=err.message;}finally{btn.disabled=false;}
 });
 return {cover:()=>{const typed=el('coverUrl').value.trim();if(!file&&typed&&typed!==url)chooseUrl(typed);return {file,url,changed};},dispose:()=>{sequence++;if(objectUrl)URL.revokeObjectURL(objectUrl);}};
}
