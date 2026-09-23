import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerLocally,relevantBooks} from '../src/library-assistant-domain.js';
const data={library:{nombre:'Biblioteca de mamá'},books:[{id:1,titulo:'Matar a un ruiseñor',autor:'Harper Lee',lista:'catalogo',descripcion:'Una niña observa las injusticias de su pueblo.',estado_lectura:'no_leido'},{id:2,titulo:'La casa de los espíritus',autor:'Isabel Allende',lista:'catalogo',estado_lectura:'leyendo',pagina_actual:32,paginas:400}],loans:[]};
test('la pregunta de la captura recupera la sinopsis del título correcto',()=>{const answer=answerLocally('de que se trata matar a un ruiseñor',data);assert.match(answer,/Una niña observa/);assert.match(answer,/sinopsis guardada/);assert.doesNotMatch(answer,/0 libros|conectemos una API/);});
test('no inventa sinopsis cuando la ficha no tiene descripción',()=>{assert.match(answerLocally('de qué se trata La casa de los espíritus',data),/todavía no tiene sinopsis/);});
test('búsqueda por autora funciona sin prefijos de consulta',()=>{assert.equal(relevantBooks('buscá Isabel Allende',data)[0]?.id,2);});
test('no confunde biblioteca vacía con un error de IA',()=>{assert.match(answerLocally('matar a un ruiseñor',{books:[],loans:[],library:{nombre:'Personal'}}),/Personal no tiene libros/);});
test('consulta puntual de préstamos no devuelve préstamos ajenos al pedido',()=>{const snapshot={...data,loans:[{activo:true,libro_id:2,persona:'Laura'}]};assert.match(answerLocally('quién tiene Matar a un ruiseñor',snapshot),/No encontré préstamos/);assert.match(answerLocally('qué presté',snapshot),/Laura/);});
