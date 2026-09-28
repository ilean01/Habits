import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('respaldo v2 conserva fotos y exportación v3 agrega Biblioteca completa',async()=>{
 const [media,complete,extras,main]=await Promise.all([read('src/media-backup.js'),read('src/complete-backup.js'),read('src/extras.js'),read('src/main.js')]);
 assert.match(media,/createFullBackup/);
 assert.match(media,/blobToBase64/);
 assert.match(media,/storage\.from\(photo\.bucket/);
 assert.match(media,/version:2,media/);
 assert.match(media,/restoreBackupMedia/);
 assert.match(complete,/version:3/);
 assert.match(complete,/biblioteca-portadas/);
 assert.match(extras,/\[1,2,3\]\.includes\(value\.version\)/);
 assert.match(extras,/restoreBackupMedia\(payload,records\)/);
 assert.match(main,/downloadCompleteBackup/);
 assert.doesNotMatch(main,/JSON\.stringify\(db\.exportData\(\)/);
});

test('gym y alimentación usan el guardado común que admite offline',async()=>{
 const [gym,nutrition]=await Promise.all([read('src/gym.js'),read('src/nutrition.js')]);
 assert.match(gym,/saveDayPhoto\(prepared/);
 assert.match(nutrition,/saveDayPhoto\(prepared/);
 assert.doesNotMatch(gym,/uploadDayPhoto\(prepared\.blob/);
 assert.doesNotMatch(nutrition,/uploadDayPhoto\(prepared\.blob/);
});
