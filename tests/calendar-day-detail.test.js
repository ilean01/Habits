import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Calendario usa una ficha del día única y limpia',async()=>{
 const [main,css]=await Promise.all([read('src/main.js'),read('src/native-ui.css')]);
 assert.match(main,/function dayDetailView\(d\)/);
 assert.match(main,/dayDetailData/);
 assert.match(main,/day-detail-glance/);
 assert.match(main,/Prioridades/);
 assert.match(main,/Lectura/);
 assert.match(main,/Gym, cuerpo y fotos/);
 assert.match(main,/data-day-detail/);
 assert.match(main,/Ficha del día/);
 assert.match(main,/dayDetailView\(date\)/);
 assert.doesNotMatch(main,/class=\"panel day-history\"/);
 assert.match(css,/\.day-detail-card/);
 assert.match(css,/scroll-margin-top/);
});
