import {test,expect} from '@playwright/test';
const owner='00000000-0000-4000-8000-000000000001';
async function library(page,{writer=true}={}){
 const state={books:[{id:1,owner_id:owner,titulo:'Libro de prueba',autor:'Autora',lista:'catalogo',estado_lectura:'no_leido',paginas:120,pagina_actual:0,codigo_p:'TEST',item:1}],drafts:[],transitions:[]};
 await page.addInitScript(({owner})=>{const payload=btoa(JSON.stringify({sub:owner,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}));localStorage.setItem('sb-hlpaaemnjjixigkhnqdq-auth-token',JSON.stringify({access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.test',refresh_token:'test',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:owner,email:'test@example.invalid'}}));},{owner});
 await page.route('https://hlpaaemnjjixigkhnqdq.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method(),body=req.headers()['content-type']?.includes('application/json')?(req.postDataJSON()||{}):{};
  const send=x=>route.fulfill({contentType:'application/json',body:JSON.stringify(x)});
  if(path.includes('/auth/v1/user'))return send({id:owner,email:'test@example.invalid'});
  if(path.includes('/rpc/')){const fn=path.split('/').at(-1);if(fn==='has_biblioteca_access')return send(true);if(fn==='biblioteca_owner')return send(owner);if(fn==='biblioteca_can_write'||fn==='biblioteca_can_manage')return send(writer);if(fn==='biblioteca_disponibles')return send([{owner_id:owner,nombre:'Biblioteca de prueba',activa:true,propia:true,rol:writer?'owner':'reader'}]);if(fn==='biblioteca_transition'){state.transitions.push(body);return send(null);}return send(fn==='biblioteca_miembros'?[]:null);}
  if(path.includes('/rest/v1/')){
   const table=path.split('/').at(-1);let rows=table==='biblioteca_libros'?state.books:table==='biblioteca_cover_drafts'?state.drafts:[];
   if(method==='POST'){const row={...body,id:table==='biblioteca_libros'?state.books.length+1:crypto.randomUUID(),expires_at:new Date(Date.now()+3600000).toISOString()};rows.push(row);return send(row);}
   const id=url.searchParams.get('id')?.replace('eq.','');const filtered=rows.filter(r=>!id||String(r.id)===id);
   if(method==='PATCH'){filtered.forEach(r=>Object.assign(r,body));return send(filtered[0]);}
   if(method==='DELETE'){if(table==='biblioteca_cover_drafts')state.drafts=rows.filter(r=>r.id!==id);return send(null);}
   return send(req.headers().accept?.includes('vnd.pgrst.object')?filtered[0]:filtered);
  }
  if(path.includes('/storage/v1/object/sign/'))return send(body.paths?body.paths.map(path=>({path,signedURL:'/object/sign/biblioteca-portadas/test?token=fixture',error:null})):{signedURL:'/object/sign/biblioteca-portadas/test?token=fixture'});
  if(path.includes('/storage/v1/object/list/'))return send([]);
  if(path.includes('/functions/v1/library-web-search'))return send({results:[{titulo:'Resultado',descripcion:'Sinopsis de prueba',fuente:'Fuente de prueba'}]});
  return send({});
 });
 await page.goto('/biblioteca.html');await expect(page.getByRole('heading',{name:'Catálogo',exact:true})).toBeVisible();return state;
}
test('crear con QR temporal, recibir portada y editar con autoguardado',async({page})=>{
 const state=await library(page);await page.getByRole('button',{name:'+ Agregar libro',exact:true}).click();
 const modal=page.locator('#library-modal');await modal.locator('[name=titulo]').fill('Libro nuevo');await modal.locator('[name=autor]').fill('Nombre original');await modal.getByText('Manejar portada e imágenes',{exact:true}).click();await modal.getByRole('button',{name:'Subir portada desde otro celular (QR)'}).click();await expect(modal.locator('.lib-draft-qr img')).toBeVisible();
 state.drafts[0].uploaded_at=new Date().toISOString();await expect(modal.getByText('Portada recibida. Guardá el libro para conservarla.')).toBeVisible({timeout:12000});
 await modal.getByRole('button',{name:'Agregar libro',exact:true}).click();await expect(modal.getByRole('heading',{name:'Libro nuevo',exact:true})).toBeVisible();expect(state.books).toHaveLength(2);expect(state.books[1].portada).toContain('/books/draft-');expect(state.drafts).toHaveLength(0);
 const editor=modal.locator('.library-inline-editor');await editor.locator('[name=autor]').fill('Nombre corregido');await editor.locator('[name=titulo]').click();await expect(editor.locator('.lib-autosave-status')).toHaveText('Guardado ✓');expect(state.books[1].autor).toBe('Nombre corregido');
 await editor.getByRole('button',{name:'Buscar sinopsis en la web',exact:true}).click();await editor.getByRole('button',{name:'Usar esta sinopsis'}).click();await expect(editor.locator('.lib-autosave-status')).toHaveText('Guardado ✓');expect(state.books[1].descripcion).toBe('Sinopsis de prueba');
});
test('lectura permite fechas anteriores y puntuación',async({page})=>{
 const state=await library(page);await page.getByRole('button',{name:'Ver ficha →'}).first().click();const modal=page.locator('#library-modal');await modal.getByRole('button',{name:'Concluir lectura',exact:true}).click();await modal.locator('[name=start]').fill('2020-01-01');await modal.locator('[name=end]').fill('2020-01-03');await modal.locator('[name=rating]').fill('9');await modal.getByRole('button',{name:'Guardar',exact:true}).click();expect(state.transitions[0].p_data).toMatchObject({start:'2020-01-01',end:'2020-01-03',rating:'9'});
});
test('lector no recibe editor ni botón para crear',async({page})=>{await library(page,{writer:false});await expect(page.getByRole('button',{name:'+ Agregar libro',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Ver ficha →'}).first().click();await expect(page.locator('.library-inline-editor')).toHaveCount(0);});
