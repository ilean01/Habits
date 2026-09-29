import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const main=read('src/main.js');
const store=read('src/store.js');
const extras=read('src/extras.js');
const goals=read('src/goals.js');
const reliability=read('src/reliability-center.js');
const recovery=read('src/global-recovery.js');
const completeBackup=read('src/complete-backup.js');
const migrations=read('src/data-migrations.js');

test('objetivos semanales y mensuales están integrados en Progreso',()=>{
 assert.match(main,/goalsView\(\{btn,date:today\}\)/);
 assert.match(main,/goalsAction/);
 for(const key of ['weeklyHabits','weeklyReading','monthlyHabits','monthlyReading'])assert.match(goals,new RegExp(key));
 assert.match(goals,/Editar objetivos/);
});

test('diagnóstico de sincronización y dispositivos usan la cuenta real sin exponer nombres técnicos',()=>{
 assert.match(main,/reliabilitySettingsView/);
 assert.match(reliability,/Comprobar conexión/);
 assert.match(reliability,/Mis dispositivos/);
 assert.match(reliability,/signOut\(\{scope:'others'\}\)/);
 assert.match(reliability,/session_id/);
 assert.doesNotMatch(reliability,/Supabase/);
 assert.match(store,/SYSTEM_KINDS=new Set\(\['settings','timer','activity','notice','device'\]\)/);
});

test('exportación completa reúne datos de Habits, fotos, Biblioteca y portadas',()=>{
 assert.match(main,/downloadCompleteBackup/);
 assert.match(completeBackup,/createFullBackup/);
 assert.match(completeBackup,/loadAll\(\{force:true\}\)/);
 assert.match(completeBackup,/biblioteca-portadas/);
 assert.match(completeBackup,/version:3/);
 assert.match(extras,/\[1,2,3\]/);
 assert.match(extras,/'device'/);
});

test('migraciones de datos reemplazan el retiro legado ejecutado desde main',()=>{
 assert.match(main,/runDataMigrations\(db\)/);
 assert.doesNotMatch(main,/legacy-book-retirement/);
 assert.match(migrations,/CURRENT_DATA_VERSION=2/);
 assert.match(migrations,/migrationPlan/);
 assert.match(migrations,/legacyBookArchive/);
});

test('historial de migraciones de Supabase queda reconciliado y versionado',()=>{
 const dir=new URL('../supabase/migrations/',import.meta.url);
 const names=fs.readdirSync(dir).filter(name=>name.endsWith('.sql')).sort();
 const versions=names.map(name=>name.split('_')[0]);
 assert.equal(new Set(versions).size,versions.length,'cada migración debe tener versión única');
 assert.ok(names.includes('20260928014950_library_original_book_fields.sql'));
 assert.ok(names.includes('20260928024844_allow_device_entries.sql'));
 const device=read('supabase/migrations/20260928024844_allow_device_entries.sql');
 assert.match(device,/'device'/);
});

test('manejo global de errores ofrece recuperación y respaldo sin perder datos locales',()=>{
 assert.match(main,/habits:error/);
 assert.match(recovery,/unhandledrejection/);
 assert.match(recovery,/Reintentar/);
 assert.match(recovery,/Guardar respaldo/);
 assert.match(recovery,/downloadCompleteBackup/);
});
