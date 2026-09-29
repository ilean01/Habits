import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.getByRole('heading',{name:/Buen|Buenas|Mirá|Un nuevo|Todavía/}).first()).toBeVisible();
}

async function expectNoPageOverflow(page){
 const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth,inner:window.innerWidth}));
 expect(overflow.scroll).toBeLessThanOrEqual(overflow.client+1);
 expect(overflow.body).toBeLessThanOrEqual(overflow.inner+1);
}

test('notebook a 100% y 1366x768 mantiene navegación, contenido y Ajustes utilizables',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await page.setViewportSize({width:1366,height:768});
 await enterDemo(page);
 const scale=await page.evaluate(()=>window.visualViewport?.scale||1);
 expect(scale).toBe(1);
 await expectNoPageOverflow(page);
 await expect(page.locator('.topbar .profile-button')).toBeVisible();
 await page.locator('.topbar .profile-button').click();
 const dialog=page.locator('#modal');
 await expect(dialog).toHaveAttribute('open','');
 const box=await dialog.boundingBox();
 expect(box).not.toBeNull();
 expect(box.y).toBeGreaterThanOrEqual(0);
 expect(box.y+box.height).toBeLessThanOrEqual(768);
 await expect(dialog.getByText(/Exportar mis datos/i)).toBeAttached();
 await page.locator('[data-action="close"]').first().click();
 await expect(page.locator('.sidebar').getByRole('button',{name:/Mis áreas/i})).toHaveCount(0);
 for(const label of ['Calendario','Tareas','Progreso','Mi diario','Biblioteca']){
  await page.locator('.sidebar').getByRole('button',{name:new RegExp(label,'i')}).click();
  await expectNoPageOverflow(page);
 }
});

test('iPhone reserva safe areas y oculta navegación inferior cuando aparece teclado',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile','Escenario iPhone');
 await enterDemo(page);
 const html=page.locator('html');
 await expect(html).toHaveAttribute('data-keyboard-open','false');
 const vars=await page.evaluate(()=>{
  const s=getComputedStyle(document.documentElement);
  return {visual:s.getPropertyValue('--visual-viewport-height').trim(),keyboard:s.getPropertyValue('--keyboard-offset').trim()};
 });
 expect(vars.visual).toMatch(/px$/);
 expect(vars.keyboard).toMatch(/px$/);
 await page.locator('.topbar .profile-button').click();
 const dialog=page.locator('#modal');
 await expect(dialog).toHaveAttribute('open','');
 await expect(dialog.getByRole('button',{name:'Cerrar',exact:true})).toBeVisible();
 const keyboardState=await page.evaluate(async()=>{
  const {applyViewportInsets}=await import('/src/viewport-insets.js');
  const fakeHeight=Math.max(200,window.innerHeight-330);
  const state=applyViewportInsets(document.documentElement,{height:fakeHeight,offsetTop:0});
  const nav=document.querySelector('.mobile-nav');
  const modal=document.querySelector('#modal');
  return {
   open:state.open,
   keyboard:state.keyboard,
   navDisplay:nav?getComputedStyle(nav).display:'missing',
   modalOpen:!!modal?.open,
   closeVisible:!!modal?.querySelector('[aria-label="Cerrar"]')
  };
 });
 expect(keyboardState.open).toBe(true);
 expect(keyboardState.keyboard).toBeGreaterThan(80);
 expect(keyboardState.navDisplay).toBe('none');
 expect(keyboardState.modalOpen).toBe(true);
 expect(keyboardState.closeVisible).toBe(true);
 await page.evaluate(async()=>{
  const {applyViewportInsets}=await import('/src/viewport-insets.js');
  applyViewportInsets(document.documentElement,{height:window.innerHeight,offsetTop:0});
 });
 await expect(html).toHaveAttribute('data-keyboard-open','false');
 await expect(page.locator('.mobile-nav')).toBeVisible();
});
