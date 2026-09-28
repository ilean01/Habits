from pathlib import Path
import re


def replace_once(source, old, new, label):
    if old not in source:
        raise SystemExit(f'Missing expected source: {label}')
    return source.replace(old, new, 1)

main_path=Path('src/main.js')
main=main_path.read_text(encoding='utf-8')
main=replace_once(main,"import './hci-simplification.css';\nimport './reliability.css';","import './app-shell.css';",'consolidated css import')
main=main.replace("import {searchLocalSpace,searchLibraryCatalog} from './global-search.js';\n",'')
main=main.replace("<div class=\"sidebar-quote\">${icon('Flower2')}<p>No hace falta hacerlo todo.<br><em>Hacé lugar para lo que importa.</em></p></div>",'')
main=main.replace("<footer class=\"page-footer\">A tu ritmo, un día a la vez. <span>Hecho para tus pequeños grandes logros ${icon('Leaf')}</span></footer>",'')
main=main.replace("<span class=\"journal-flower\">${icon('Flower2')}</span>",'')
main=main.replace("El registro estará disponible cuando conectemos Supabase. Mientras tanto, podés explorar la app en este dispositivo.","El registro todavía no está disponible. Mientras tanto, podés explorar la app en este dispositivo.")
main=main.replace("syncing:'Sincronizando…'","syncing:'Actualizando…'").replace("synced:'Todo sincronizado'","synced:'Todo al día'")
main=main.replace('title=\"Reintentar sincronización\"','title=\"Actualizar ahora\"')
main=main.replace("'Tus compromisos y tus momentos, en equilibrio.'","''")
main=main.replace("'Un lugar para cada parte de vos.'","''")
main=main.replace("'Pendientes, programadas, para después y proyectos personales, sin mezclar tus áreas.'","''")
main=main.replace("'Catálogo, lecturas, préstamos y tu bibliotecaria.'","''")
main=main.replace('<p>Tu semana, tus constancias y tus logros.</p>','')
main=main.replace('<p>Un pensamiento, una alegría, algo que aprendiste.</p>','')
main=main.replace('<p class=\"muted small\">Los eventos aparecen en tu agenda. Los avisos necesitan activación en Ajustes y configuración del servidor.</p>','<p class=\"muted small\">Los eventos aparecen en tu agenda. Podés activar avisos desde Ajustes.</p>')

settings_fn="""function settingsModal(){const s=settings();showModal('A tu manera',`<form>${input('Tu nombre','name',s.name,'text','maxlength=\"60\"')}<div class=\"form-grid\">${select('Apariencia','theme',[['light','Clara'],['dark','Oscura']],s.theme||'light')}${select('Tipo de día predeterminado','dayMode',[['habitual','Día habitual'],['tranquilo','Día tranquilo'],['descanso','Descanso']],s.dayMode||'habitual')}</div><label class=\"check-label\"><input type=\"checkbox\" name=\"large\" ${s.large?'checked':''}>Texto más grande</label><label class=\"check-label\"><input type=\"checkbox\" name=\"quiet\" ${s.quiet?'checked':''}>Reducir animaciones</label><label class=\"check-label\"><input type=\"checkbox\" name=\"quietWork\" ${s.quietWork?'checked':''}>Pausar avisos personales durante mis bloques de trabajo</label><p class=\"muted\">${user.id==='demo'?'Estás explorando una demo local. Tus cambios quedan solo en este navegador.':esc(user.email||'Cuenta conectada')}</p>${formFooter('settings','')}</form><hr>${notificationsView({btn})}<details class=\"settings-advanced\"><summary>Datos y opciones avanzadas</summary><div class=\"settings-actions\">${btn('Importar respaldo','extra-import','','button outline')}${btn(icon('Download')+'Exportar mis datos','export','','button outline')}${btn(icon('RotateCcw')+'Hábitos pausados','archived','','button outline')}</div>${reliabilitySettingsView({btn})}${photoQueueStatusView({btn})}${installHelpHtml()}</details><div class=\"settings-actions settings-signout\">${btn(icon('LogOut')+(user.id==='demo'?'Salir de la demo':'Cerrar sesión'),'logout','','button outline')}</div>`,f=>{db.put('settings',{...s,name:f.get('name'),theme:f.get('theme'),dayMode:f.get('dayMode'),large:f.has('large'),quiet:f.has('quiet'),quietWork:f.has('quietWork')},'settings');modal.close();toast('Tu espacio, a tu gusto.');});}
"""
main, count = re.subn(r"function settingsModal\(\)\{.*?\nfunction confirmModal", settings_fn+"function confirmModal", main, count=1, flags=re.S)
if count != 1: raise SystemExit('Could not replace settingsModal')
main, count = re.subn(r"function searchModal\(\)\{.*?\n\}\nasync function action", "async function action", main, count=1, flags=re.S)
if count != 1: raise SystemExit('Could not remove legacy searchModal')
main, count = re.subn(r"\n if\(a==='create'\)\{.*?\n if\(a\.startsWith\('new-'\)\)", "\n if(a.startsWith('new-'))", main, count=1, flags=re.S)
if count != 1: raise SystemExit('Could not remove duplicate create modal')
old_delete="if(a==='delete'){if(el.dataset.kind==='area'&&['habit','event','task','project'].some(k=>rec(k).some(r=>r.area===id)))return toast('Primero mové a otra área las actividades que la usan.');confirmModal('¿Mover a la papelera?','Podés recuperarlo después desde Ajustes → Papelera.',()=>{if(el.dataset.kind==='project')for(const task of rec('task').filter(t=>t.projectId===id))db.put('task',{...task,projectId:'',archivedProjectId:id},task.id);db.remove(id);toast('Movido a la papelera.',()=>{restoreRecord(id);render();});});return;}"
new_delete="if(a==='delete'){if(el.dataset.kind==='area'&&['habit','event','task','project'].some(k=>rec(k).some(r=>r.area===id)))return toast('Primero mové a otra área las actividades que la usan.');if(el.dataset.kind==='project')for(const task of rec('task').filter(t=>t.projectId===id))db.put('task',{...task,projectId:'',archivedProjectId:id},task.id);db.remove(id);modal.close();toast('Movido a la papelera.',()=>{restoreRecord(id);render();});return;}"
main=replace_once(main,old_delete,new_delete,'undo-first delete')
main, count = re.subn(r"\n if\(a==='trash'\)\{.*?if\(a==='archived'\)", "\n if(a==='archived')", main, count=1, flags=re.S)
if count != 1: raise SystemExit('Could not remove duplicate trash modal')
main=main.replace("if(a==='export'){toast('Preparando respaldo completo…');", "if(a==='export'){toast('Preparando respaldo completo…');")
main=main.replace("if(a==='search'){searchModal();return;}","")
main_path.write_text(main,encoding='utf-8')

assistant_path=Path('src/library-assistant.js')
assistant=assistant_path.read_text(encoding='utf-8')
assistant=assistant.replace('Usar Groq · envía la pregunta, la conversación reciente y datos bibliográficos','Usar asistente en línea · comparte la pregunta, la conversación reciente y datos bibliográficos')
assistant=assistant.replace('Groq no respondió','El asistente en línea no respondió')
assistant_path.write_text(assistant,encoding='utf-8')

reliability_path=Path('src/reliability-center.js')
reliability=reliability_path.read_text(encoding='utf-8').replace('Comprobar sincronización','Comprobar conexión')
reliability_path.write_text(reliability,encoding='utf-8')

photos_path=Path('src/photo-gallery.js')
photos=photos_path.read_text(encoding='utf-8').replace("'Fotos sincronizadas'","'Fotos al día'")
photos_path.write_text(photos,encoding='utf-8')

# Consolidate late UI override files into one explicit final shell layer.
hci=Path('src/hci-simplification.css').read_text(encoding='utf-8').strip()
reliability_css=Path('src/reliability.css').read_text(encoding='utf-8').strip()
Path('src/app-shell.css').write_text('/* Final application shell: hierarchy, empty states, advanced settings and recovery. */\n'+hci+'\n\n/* Reliability and recovery surfaces. */\n'+reliability_css+'\n',encoding='utf-8')
Path('src/hci-simplification.css').unlink()
Path('src/reliability.css').unlink()

# Remove the old runtime retirement implementation; data-migrations.js is canonical now.
Path('src/legacy-book-retirement.js').unlink()
