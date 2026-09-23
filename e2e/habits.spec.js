import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.getByRole('heading',{name:/Buen|Buenas|Mirá|Un nuevo|Todavía/}).first()).toBeVisible();
}

test('notebook: navegación principal, progreso, diario y más son coherentes',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await enterDemo(page);
 const sidebar=page.locator('.sidebar');
 await expect(sidebar.getByRole('button',{name:/Progreso/i})).toBeVisible();
 await expect(sidebar.getByRole('button',{name:/Mi diario/i})).toBeVisible();
 await expect(sidebar.getByRole('button',{name:/Más/i})).toBeVisible();
 await sidebar.getByRole('button',{name:/Progreso/i}).click();
 await expect(page.getByRole('heading',{name:'Mi progreso'})).toBeVisible();
 await expect(page.getByText(/PROMEDIO DE AGUA/i)).toBeVisible();
 await sidebar.getByRole('button',{name:/Mi diario/i}).click();
 await expect(page.getByText(/Qué te gustaría recordar de hoy/i)).toBeVisible();
 await sidebar.getByRole('button',{name:/Más/i}).click();
 await expect(page.getByRole('heading',{name:'Más'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Para después'})).toBeVisible();
});

test('móvil: cinco destinos estables y acceso a Para después',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile','Escenario móvil');
 await enterDemo(page);
 const nav=page.locator('.mobile-nav');
 for(const label of ['Mi día','Calendario','Mis áreas','Progreso','Más'])await expect(nav.getByRole('button',{name:new RegExp(label,'i')})).toBeVisible();
 await nav.getByRole('button',{name:/Progreso/i}).click();
 await expect(page.getByRole('heading',{name:'Mi progreso'})).toBeVisible();
 await nav.getByRole('button',{name:/Más/i}).click();
 await expect(page.getByRole('button',{name:'Para después'})).toBeVisible();
 await page.getByRole('button',{name:'Para después'}).click();
 await expect(page.getByText(/Ideas y pendientes sin fecha/i)).toBeVisible();
});

test('agenda avisa el choque antes de guardar el segundo evento',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await enterDemo(page);
 const addEvent=async(name,time,end)=>{
  await page.locator('[data-action="new-event"]').first().click();
  await page.locator('#modal [name="name"]').fill(name);
  await page.locator('#modal [name="date"]').fill('2026-09-24');
  await page.locator('#modal [name="time"]').fill(time);
  await page.locator('#modal [name="end"]').fill(end);
  await page.locator('#modal form').getByRole('button',{name:/Guardar/i}).click();
 };
 await addEvent('Inglés','18:00','19:30');
 await expect(page.locator('#modal')).not.toHaveAttribute('open','');
 await page.locator('[data-action="new-event"]').first().click();
 await page.locator('#modal [name="name"]').fill('Reunión');
 await page.locator('#modal [name="date"]').fill('2026-09-24');
 await page.locator('#modal [name="time"]').fill('19:00');
 await page.locator('#modal [name="end"]').fill('20:00');
 const dialogPromise=page.waitForEvent('dialog');
 await page.locator('#modal form').getByRole('button',{name:/Guardar/i}).click();
 const dialog=await dialogPromise;
 expect(dialog.message()).toContain('Coincide con');
 expect(dialog.message()).toContain('Inglés');
 await dialog.dismiss();
 await expect(page.locator('#modal')).toHaveAttribute('open','');
});
