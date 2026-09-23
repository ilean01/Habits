from pathlib import Path

main = Path("src/biblioteca-main.js")
t = main.read_text()

old_reload = "async function reload(){s.data=await data.loadAll();s.covers=await data.signedCoverMap(s.data.books);s.config=u.configObject(s.data.config);s.perPage=s.config.por_pagina==='todos'?Math.max(1,s.data.books.length):Math.max(1,Number(s.config.por_pagina)||200);s.filterOptions={generos:u.unique(s.data.books.map(b=>b.genero)),codigos:u.unique(s.data.books.map(b=>b.codigo_p)),idiomas:u.unique(s.data.books.map(b=>b.idioma))};u.applyConfig(s.config);render();}"
if "async function loadSharing()" not in t:
    assert old_reload in t, "No se encontró reload() de Biblioteca"
    load = "async function loadSharing(){const l=await supabase.rpc('biblioteca_disponibles');s.libraries=l.error?[]:l.data||[];const manage=await supabase.rpc('biblioteca_can_manage');s.canManage=manage.error?false:manage.data===true;if(s.canManage){const m=await supabase.rpc('biblioteca_miembros');s.members=m.error?[]:m.data||[];}else s.members=[];}\n"
    new_reload = old_reload.replace("async function reload(){", "async function reload(){await loadSharing().catch(()=>{});", 1)
    t = t.replace(old_reload, load + new_reload, 1)

config_needle = "const config=root.querySelector('#config-form');"
if "const share=root.querySelector('#share-form')" not in t:
    assert config_needle in t, "No se encontró el formulario de configuración"
    share_handler = "const share=root.querySelector('#share-form');if(share)share.onsubmit=async e=>{e.preventDefault();const f=new FormData(share);const r=await supabase.rpc('biblioteca_invitar',{p_email:String(f.get('email')||''),p_rol:String(f.get('rol')||'reader')});if(r.error){toast(r.error.message);return;}await loadSharing();render();toast('Acceso actualizado. Los datos siguen perteneciendo a esta biblioteca.');};"
    t = t.replace(config_needle, share_handler + config_needle, 1)

action_needle = "async function action(a,el){const id=Number(el.dataset.id),b=s.book(id);if(a==='close'){modal.close();return;}"
if "if(a==='lib-own')" not in t:
    assert action_needle in t, "No se encontró action() de Biblioteca"
    sharing_actions = (
        "if(a==='lib-own'){const r=await supabase.rpc('biblioteca_elegir',{p_owner:s.user.id});if(r.error)throw r.error;location.reload();return;}"
        "if(a==='share-leave'){if(!confirm('¿Salir de esta biblioteca compartida? Tu biblioteca personal no cambia.'))return;const r=await supabase.rpc('biblioteca_salir',{p_owner:el.dataset.owner});if(r.error)throw r.error;location.reload();return;}"
        "if(a==='share-remove'){if(!confirm(`¿Quitarle el acceso a ${el.dataset.email}? Sus datos personales no se modifican.`))return;const r=await supabase.rpc('biblioteca_quitar_miembro',{p_user:el.dataset.user});if(r.error)throw r.error;await loadSharing();render();toast('Acceso quitado.');return;}"
    )
    t = t.replace(action_needle, action_needle + sharing_actions, 1)

if "[data-lib-switch]" not in t:
    t += "\n// Cambiar de biblioteca cambia el contexto activo: nunca copia ni mezcla datos.\ndocument.addEventListener('change',async e=>{const sel=e.target.closest?.('[data-lib-switch]');if(!sel)return;sel.disabled=true;const r=await supabase.rpc('biblioteca_elegir',{p_owner:sel.value});if(r.error){toast(r.error.message);sel.disabled=false;return;}location.reload();});\n"
main.write_text(t)

views = Path("src/biblioteca/views.js")
v = views.read_text()

if "data-lib-switch" not in v:
    old = '<a class="lib-back" href="./">← Volver a Habits</a><div class="lib-header-spacer"></div>'
    new = '<a class="lib-back" href="./">← Volver a Habits</a>${(s.libraries||[]).length>1?`<select class="lib-select lib-switch" data-lib-switch aria-label="Elegir biblioteca">${s.libraries.map(l=>`<option value="${esc(l.owner_id)}" ${l.activa?\'selected\':\'\'}>${esc(l.propia?\'Mi biblioteca personal\':`${l.nombre} · ${l.email}`)}</option>`).join(\'\')}</select>`:\'\'}<div class="lib-header-spacer"></div>'
    assert old in v, "No se encontró cabecera de Biblioteca"
    v = v.replace(old, new, 1)

lines = v.splitlines()
for i, line in enumerate(lines):
    if line.startswith("export function configView(s){") and "${shareView(s)}" not in line:
        assert line.endswith("`}")
        lines[i] = line[:-2] + "${shareView(s)}`}"
v = "\n".join(lines) + ("\n" if v.endswith("\n") else "")

if "export function shareView(s)" not in v:
    share_func = r'''
// Cada biblioteca es un contexto independiente. Compartir otorga acceso; nunca copia datos.
export function shareView(s){const active=(s.libraries||[]).find(l=>l.activa),shared=active&&!active.propia;
 if(shared&&!s.canManage)return `<section class="lib-panel lib-share"><h2>👥 Biblioteca compartida</h2><p>Estás viendo <strong>${esc(active.nombre)}</strong> con permiso de ${active.rol==='editor'?'edición':'solo lectura'}. Tu biblioteca personal sigue separada y sin cambios.</p><div class="lib-actions">${button('Volver a mi biblioteca','lib-own','','lib-button')}${button('Salir de esta biblioteca','share-leave',`data-owner="${esc(active.owner_id)}"`,'lib-button secondary')}</div></section>`;
 const members=s.members||[];
 return `<section class="lib-panel lib-share"><h2>👥 ${shared?'Gestionar accesos de esta biblioteca':'Compartir mi biblioteca'}</h2>${shared?`<p>Estás administrando <strong>${esc(active.nombre)}</strong>. Compartir acceso no mezcla estos datos con la biblioteca personal de nadie.</p><div class="lib-actions">${button('Volver a mi biblioteca','lib-own','','lib-button secondary')}${button('Salir de esta biblioteca','share-leave',`data-owner="${esc(active.owner_id)}"`,'lib-button secondary')}</div>`:'<p class="lib-muted">Cada usuario tiene su biblioteca personal completa. Agregar a alguien acá solo le permite abrir esta biblioteca como un contexto separado.</p>'}<form id="share-form" class="lib-share-form"><input class="lib-input" type="email" name="email" required placeholder="correo de la persona"><select class="lib-select" name="rol"><option value="reader">Solo puede ver</option><option value="editor">Puede editar libros y lecturas</option><option value="manager">Puede editar y gestionar accesos</option></select><button type="submit" class="lib-button">Dar acceso</button></form>${members.length?`<div class="lib-table-wrap"><table class="lib-table"><thead><tr><th>Cuenta</th><th>Permiso</th><th></th></tr></thead><tbody>${members.map(m=>`<tr><td>${esc(m.email)}</td><td>${m.rol==='manager'?'Gestiona accesos':m.rol==='editor'?'Puede editar':'Solo puede ver'}</td><td>${button('Quitar acceso','share-remove',`data-user="${esc(m.user_id)}" data-email="${esc(m.email)}"`,'lib-button secondary small')}</td></tr>`).join('')}</tbody></table></div>`:'<p class="lib-muted">Todavía no hay otras cuentas con acceso.</p>'}<p class="lib-muted lib-small">La persona necesita una cuenta en Habits. Al abrir una biblioteca compartida, su biblioteca personal permanece intacta.</p></section>`;}
'''
    v += share_func
views.write_text(v)
