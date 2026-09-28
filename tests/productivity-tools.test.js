import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';

async function searchModule(){
 const result=await build({entryPoints:['src/global-search.js'],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'mock-library-client',setup(b){b.onResolve({filter:/biblioteca\/client\.js$/},()=>({path:'library-client',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`export const supabase={from(){throw new Error('not used')}};export async function sessionAndAccess(){return {allowed:false}};export let libraryOwner=null;`,loader:'js'}));}}]});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}

test('búsqueda avanzada combina texto, tipo, área, estado y rango de fecha',async()=>{
 const {searchLocalSpace}=await searchModule(),data={
  task:[{id:'t1',name:'Preparar informe',area:'trabajo',due:'2026-09-27',priority:'alta',done:false},{id:'t2',name:'Preparar informe final',area:'facultad',due:'2026-10-02',done:false},{id:'t3',name:'Informe entregado',area:'trabajo',due:'2026-09-20',done:true}],
  habit:[],event:[],project:[],quote:[],journal:[],word:[],area:[]
 };
 const records=kind=>data[kind]||[];
 const result=searchLocalSpace('informe',{records,today:'2026-09-27',filters:{kinds:['task'],area:'trabajo',status:'pending',dateFrom:'2026-09-25',dateTo:'2026-09-30'}});
 assert.equal(result.length,1);assert.equal(result[0].id,'t1');assert.equal(result[0].state,'pending');
});

test('filtros avanzados pueden encontrar contenido sin escribir una consulta',async()=>{
 const {searchLocalSpace}=await searchModule(),data={task:[{id:'future',name:'Reserva futura',area:'personal',due:'2026-10-05',done:false}],habit:[],event:[],project:[],quote:[],journal:[],word:[],area:[]};
 const result=searchLocalSpace('',{records:kind=>data[kind]||[],today:'2026-09-27',filters:{kinds:['task'],status:'scheduled'}});
 assert.equal(result.length,1);assert.equal(result[0].id,'future');
});

test('orden de búsqueda soporta relevancia, fecha próxima y A-Z',async()=>{
 const {sortSearchResults}=await searchModule(),rows=[{title:'Zeta',score:3,date:'2026-10-03'},{title:'Alfa',score:8,date:'2026-09-29'}];
 assert.equal(sortSearchResults(rows,'relevance')[0].title,'Alfa');
 assert.equal(sortSearchResults(rows,'upcoming')[0].title,'Alfa');
 assert.equal(sortSearchResults(rows,'az')[0].title,'Alfa');
});

test('herramientas productivas reutilizan acciones nativas y son descubribles por teclado',async()=>{
 const [tools,main,notifications,css]=await Promise.all([readFile(new URL('../src/productivity-tools.js',import.meta.url),'utf8'),readFile(new URL('../src/main.js',import.meta.url),'utf8'),readFile(new URL('../src/notifications.js',import.meta.url),'utf8'),readFile(new URL('../src/productivity-tools.css',import.meta.url),'utf8')]);
 assert.match(main,/import '\.\/productivity-tools\.js'/);assert.doesNotMatch(notifications,/import '\.\/productivity-tools\.js'/);
 for(const action of ['new-task','new-event','new-habit','journal','achievement','water-add','water-custom','food-photo','manual-reading','new-project','new-word','new-quote','library'])assert.match(tools,new RegExp(`data-action=\\"${action}\\"`));
 assert.match(tools,/habits-focus-v1:/);assert.match(tools,/localStorage/);assert.match(tools,/focus-complete/);
 assert.match(tools,/key==='k'/);assert.match(tools,/event\.key==='Enter'/);assert.match(tools,/event\.shiftKey&&key==='f'/);assert.match(tools,/event\.altKey&&\['1','2','3','4'\]/);
 assert.match(tools,/Atajos de teclado/);assert.match(css,/universal-add-button/);assert.match(css,/safe-area-inset-bottom/);
});
