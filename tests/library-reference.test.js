import test from 'node:test';
import assert from 'node:assert/strict';
import {originalStatistics} from '../src/biblioteca/original-statistics.js';
import {parseImageSearch,parseSynopsisSearch,searchProviders} from '../supabase/functions/library-web-search/providers.js';

test('estadísticas conservan grupos exactos, conjuntos y días del SQL original',()=>{
 const data={books:[{id:1,titulo:'A',lista:'catalogo',dewey:'101',genero:'Novela',estado_lectura:'leyendo',paginas:200,autor:'Uno',codigo_p:'A',fecha_inicio:'2026-01-01',fecha_fin:'2026-01-03'},{id:2,titulo:'B',lista:'catalogo',dewey:'110',genero:'Historia',estado_lectura:'leido',paginas:100,autor:'Dos',codigo_p:'A'},{id:3,titulo:'C',lista:'deseos',genero:'Novela',estado_lectura:'leido'},{id:4,titulo:'D',lista:'catalogo',eliminado:true,paginas:999}],readings:[{fecha:'2026-01-04',paginas_leidas:0},{fecha:'2026-01-03',paginas_leidas:10}],finished:[],loans:[{libro_id:1,persona:'Persona',fecha_prestamo:'2026-01-01',fecha_devuelto:'2026-01-03',estado:'devuelto'},{libro_id:2,persona:'Persona',fecha_prestamo:'2026-01-02',estado:'prestado'}]};
 const x=originalStatistics(data,'2026-01-04');assert.equal(x.total,3);assert.equal(x.catalog.length,2);assert.equal(x.pages,300);assert.equal(x.read,2);assert.equal(x.streak,2);assert.equal(x.average,2);assert.equal(x.active,1);assert.equal(x.returned,1);assert.equal(x.longest.days,2);assert.deepEqual(x.dewey,[['101',1],['110',1]]);assert.deepEqual(x.readGenres,[['Novela',2],['Historia',1]]);
});
test('portadas decodifican metadatos con doble escape y no confunden bloqueo con cero coincidencias',()=>{
 const html='<a m="{&amp;quot;murl&amp;quot;:&amp;quot;https://example.org/mar.jpg?a=1&amp;amp;b=2&amp;quot;}">';assert.equal(parseImageSearch(html,'mar')[0].portada_url,'https://example.org/mar.jpg?a=1&b=2');assert.throws(()=>parseImageSearch('<html>Verify you are human</html>','mar'),/bloqueo/);assert.deepEqual(parseImageSearch('<p>No results found</p>','q'),[]);assert.throws(()=>parseSynopsisSearch('<html>Blocked</html>'),/RSS/);
});
test('búsqueda informa fallo parcial y usa catálogos bibliográficos como original',async()=>{
 const fetcher=async url=>{if(url.includes('bing'))return {ok:false,status:429};if(url.includes('googleapis'))return {ok:true,json:async()=>({items:[{volumeInfo:{title:'Mar',imageLinks:{thumbnail:'https://example.org/mar.jpg'}}}]})};return {ok:true,json:async()=>({docs:[]})};};
 const r=await searchProviders({query:'mar'},fetcher);assert.equal(r.results.length,1);assert.equal(r.results[0].fuente,'Google Books');assert.match(r.warnings[0],/429/);
 await assert.rejects(searchProviders({query:'mar'},async()=>({ok:false,status:503})),/no se pudo completar/);
});
