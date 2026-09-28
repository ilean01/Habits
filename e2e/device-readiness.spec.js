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
 for(const label of ['Calendario','Mis áreas','Tareas','Progreso','Mi diario','Biblioteca']){
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
 await page.evaluate(()=>{
  document.documentElement.dataset.keyboardOpen='true';
  document.documentElement.style.setProperty('--visual-viewport-height','500px');
  document.documentElement.style.setProperty('--keyboard-offset','330px');
 });
 await expect(page.locator('.mobile-nav')).toBeHidden();
 await page.locator('.topbar .profile-button').click();
 const dialog=page.locator('#modal');
 await expect(dialog).toHaveAttribute('open','');
 const maxHeight=await dialog.evaluate(el=>getComputedStyle(el).maxHeight);
 expect(parseFloat(maxHeight)).toBeLessThanOrEqual(500);
 await page.evaluate(()=>{document.documentElement.dataset.keyboardOpen='false';});
 await expect(page.locator('.mobile-nav')).toBeVisible();
});
