import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {answerLocally,relevantBooks,createLibraryIndex} from '../src/library-assistant-domain.js';
const data={library:{nombre:'Biblioteca de mamá'},books:[{id:1,titulo:'Matar a un ruiseñor',autor:'Harper Lee',lista:'catalogo',descripcion:'Una niña observa las injusticias de su pueblo.',estado_lectura:'no_leido'},{id:2,titulo:'La casa de los espíritus',autor:'Isabel Allende',lista:'catalogo',estado_lectura:'leyendo',pagina_actual:32,paginas:400}],loans:[]};
test('la pregunta de la captura recupera la sinopsis del título correcto',()=>{const answer=answerLocally('de que se trata matar a un ruiseñor',data);assert.match(answer,/Una niña observa/);assert.match(answer,/sinopsis guardada/);assert.doesNotMatch(answer,/0 libros|conectemos una API/);});
test('no inventa sinopsis cuando la ficha no tiene descripción',()=>{assert.match(answerLocally('de qué se trata La casa de los espíritus',data),/todavía no tiene sinopsis/);});
test('búsqueda por autora funciona sin prefijos de consulta',()=>{assert.equal(relevantBooks('buscá Isabel Allende',data)[0]?.id,2);});
test('no confunde biblioteca vacía con un error de IA',()=>{assert.match(answerLocally('matar a un ruiseñor',{books:[],loans:[],library:{nombre:'Personal'}}),/Personal no tiene libros/);});
test('consulta puntual de préstamos no devuelve préstamos ajenos al pedido',()=>{const snapshot={...data,loans:[{activo:true,libro_id:2,persona:'Laura'}]};assert.match(answerLocally('quién tiene Matar a un ruiseñor',snapshot),/No encontré préstamos/);assert.match(answerLocally('qué presté',snapshot),/Laura/);});

test('indexa y busca correctamente un catálogo de 1470 libros',()=>{
 const books=Array.from({length:1470},(_,i)=>({id:i+1,titulo:`Libro de prueba ${i+1}`,autor:`Autor ${i%80}`,genero:i%2?'Historia':'Novela',lista:'catalogo',estado_lectura:'no_leido',descripcion:`Descripción controlada ${i+1}`}));
 books[1234]={...books[1234],titulo:'El jardín de los senderos que se bifurcan',autor:'Jorge Luis Borges',descripcion:'Relatos sobre tiempo, decisiones y laberintos.'};
 const big={books,loans:[],library:{nombre:'Biblioteca grande'}};
 const index=createLibraryIndex(books);
 assert.equal(index.entries.length,1470);
 assert.equal(relevantBooks('¿tenés El jardín de los senderos que se bifurcan?',big,5)[0]?.id,1235);
 assert.match(answerLocally('de qué se trata El jardín de los senderos que se bifurcan',big),/tiempo, decisiones y laberintos/i);
});

test('cuenta coincidencias específicas en lugar de devolver el total del catálogo',()=>{
 const books=Array.from({length:1470},(_,i)=>({id:i+1,titulo:`Título ${i+1}`,autor:i<4?'Isabel Allende':`Autor ${i}`,lista:'catalogo',estado_lectura:'no_leido'}));
 const answer=answerLocally('¿cuántos libros de Isabel Allende tengo?',{books,loans:[],library:{nombre:'Mamá'}});
 assert.match(answer,/Encontré 4 libros/);
 assert.doesNotMatch(answer,/1470 libros/);
});

test('recomendación corta filtra por cantidad de páginas',()=>{
 const books=[{id:1,titulo:'Breve',autor:'A',lista:'catalogo',estado_lectura:'no_leido',paginas:180},{id:2,titulo:'Largo',autor:'B',lista:'catalogo',estado_lectura:'no_leido',paginas:700}];
 const answer=answerLocally('recomendame algo corto',{books,loans:[],library:{nombre:'Mamá'}});
 assert.match(answer,/Breve/);assert.doesNotMatch(answer,/Largo/);
});

test('el contexto de IA externa queda acotado aunque haya 1470 libros',async()=>{
 const source=await readFile(new URL('../src/library-assistant.js',import.meta.url),'utf8');
 assert.match(source,/relevantBooks\(message,data,16\)/);
 assert.match(source,/clip\(b\.descripcion,650\)/);
 assert.match(source,/recommendation_pool/);
 assert.match(source,/createSnapshotCache/);
});
