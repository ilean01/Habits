import {test,expect} from '@playwright/test';

test('formulario original: flujo de página, campos legibles y bibliotecaria flotante',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await page.evaluate(async()=>{
  await import('/src/biblioteca.css');
  await import('/src/library-native.css');
  const {bookEditorHtml}=await import('/src/biblioteca/book-editor.js');
  const fixture=document.createElement('section');fixture.className='library-native-shell';
  fixture.innerHTML=`<div id="library-app"><main>Catálogo</main><div data-assistant-host><button>Bibliotecaria</button></div></div><dialog id="library-modal" class="library-native-modal library-book-page"><div class="library-modal-heading"><h2>Agregar libro</h2><button>Cerrar</button></div><form>${bookEditorHtml({titulo:'Un libro de prueba',autor:'Autora de prueba'})}<button>Guardar</button></form></dialog>`;
  document.querySelector('main')?.replaceChildren(fixture);
  fixture.querySelector('dialog').show();
 });
 const dialog=page.locator('#library-modal');
 await expect(dialog.getByRole('heading',{name:'Agregar libro'})).toBeVisible();
 await expect(dialog.locator('[name=titulo]')).toBeVisible();
 expect(await dialog.evaluate(e=>getComputedStyle(e).overflowY)).toBe('visible');
 expect(await dialog.evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await expect(page.locator('[data-assistant-host]')).toBeInViewport();
 expect(await page.locator('[data-assistant-host]').evaluate(e=>getComputedStyle(e).position)).toBe('fixed');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/library-form.png',fullPage:true});
});
