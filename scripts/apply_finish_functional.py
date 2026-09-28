from pathlib import Path


def replace_once(source, old, new, label):
    if old not in source:
        raise SystemExit(f'Missing expected source: {label}')
    return source.replace(old, new, 1)

main_path=Path('src/main.js')
main=main_path.read_text(encoding='utf-8')
main=replace_once(main,"import './hci-simplification.css';","import './hci-simplification.css';\nimport './reliability.css';\nimport './global-recovery.js';",'css/recovery imports')
main=replace_once(main,"import {downloadFullBackup} from './media-backup.js';","import {downloadCompleteBackup} from './complete-backup.js';",'backup import')
main=replace_once(main,"import {retireLegacyBooks} from './legacy-book-retirement.js';","import {runDataMigrations} from './data-migrations.js';\nimport {goalsView,goalsAction} from './goals.js';\nimport {reliabilitySettingsView,reliabilityAction,touchCurrentDevice} from './reliability-center.js';",'migration/goals imports')
old_enter="async function enter(u){if(user?.id===u.id&&ready)return;db.closeStore();closeCatalog();user=u;ready=true;await db.openStore(u.id,render);if(!settings().legacyBooksRetiredAt)retireLegacyBooks(db);initCatalog(u.id,render);if(!settings().name&&u.user_metadata?.name)db.put('settings',{...settings(),name:u.user_metadata.name},'settings');render();}"
new_enter="async function enter(u){if(user?.id===u.id&&ready)return;db.closeStore();closeCatalog();user=u;ready=true;await db.openStore(u.id,render);runDataMigrations(db);void touchCurrentDevice({force:true}).catch(()=>{});initCatalog(u.id,render);if(!settings().name&&u.user_metadata?.name)db.put('settings',{...settings(),name:u.user_metadata.name},'settings');render();}"
main=replace_once(main,old_enter,new_enter,'enter migrations')
# Insert goals after summary stats in progressView only.
start=main.find('function progressView()')
end=main.find('function showModal(',start)
if start<0 or end<0: raise SystemExit('Missing progressView')
chunk=main[start:end]
chunk=replace_once(chunk,"</div>${nutritionProgressView", "</div>${goalsView({btn,date:today})}${nutritionProgressView",'goals panel')
main=main[:start]+chunk+main[end:]
main=replace_once(main,"${photoQueueStatusView({btn})}${notificationsView({btn})}${installHelpHtml()}","${reliabilitySettingsView({btn})}${photoQueueStatusView({btn})}${notificationsView({btn})}${installHelpHtml()}",'settings reliability')
main=replace_once(main,"if(await notificationsAction(a,{toast}))return;if(await extrasAction", "if(await notificationsAction(a,{toast}))return;if(await goalsAction(a,{showModal,input,modal,toast}))return;if(await reliabilityAction(a,el,{showModal,input,btn,modal,toast}))return;if(await extrasAction",'delegated actions')
main=replace_once(main,"if(a==='export'){toast('Preparando respaldo completo…');const result=await downloadFullBackup(`habits-${dayKey()}.json`);toast(`Respaldo preparado · ${result.photos} fotos incluidas.`);return;}","if(a==='export'){toast('Preparando respaldo completo…');const result=await downloadCompleteBackup(`habits-completo-${dayKey()}.json`);toast(result.libraryIncluded?`Respaldo completo · ${result.photos} fotos y ${result.libraryBooks} libros incluidos.`:`Respaldo de Habits · ${result.photos} fotos incluidas.`);return;}",'complete export')
main=replace_once(main,"Promise.resolve(action(el.dataset.action,el)).catch(err=>{console.error(err);toast('No se pudo completar: '+err.message);});", "Promise.resolve(action(el.dataset.action,el)).catch(err=>{console.error(err);window.dispatchEvent(new CustomEvent('habits:error',{detail:err}));toast('No se pudo completar: '+err.message);});",'global action recovery')
main_path.write_text(main,encoding='utf-8')

extras_path=Path('src/extras.js')
extras=extras_path.read_text(encoding='utf-8')
extras=replace_once(extras,"![1,2].includes(value.version)","![1,2,3].includes(value.version)",'backup v3')
extras=replace_once(extras,"'activity','notice'","'activity','notice','device'",'device backup kind')
extras_path.write_text(extras,encoding='utf-8')

store_path=Path('src/store.js')
store=store_path.read_text(encoding='utf-8')
store=replace_once(store,"const SYSTEM_KINDS=new Set(['settings','timer','activity','notice']);","const SYSTEM_KINDS=new Set(['settings','timer','activity','notice','device']);",'device system kind')
store_path.write_text(store,encoding='utf-8')
