import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.getByRole('heading',{name:/Buen|Buenas|Mirá|Un nuevo|Todavía/}).first()).toBeVisible();
}

test('notebook: navegación principal, progreso, diario y tareas son coherentes',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await enterDemo(page);
 const sidebar=page.locator('.sidebar');
 await expect(sidebar.getByRole('button',{name:/Progreso/i})).toBeVisible();
 await expect(sidebar.getByRole('button',{name:/Mi diario/i})).toBeVisible();
 await expect(sidebar.getByRole('button',{name:/Biblioteca/i})).toBeVisible();
 await expect(sidebar.getByRole('button',{name:/Tareas/i})).toBeVisible();
 await sidebar.getByRole('button',{name:/Progreso/i}).click();
 await expect(page.getByRole('heading',{name:'Mi progreso'})).toBeVisible();
 await expect(page.getByText(/PROMEDIO DE AGUA/i)).toBeVisible();
 await sidebar.getByRole('button',{name:/Mi diario/i}).click();
 await expect(page.getByText(/Qué te gustaría recordar de hoy/i)).toBeVisible();
 await sidebar.getByRole('button',{name:/Tareas/i}).click();
 await expect(page.getByRole('heading',{name:'Tareas',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Para después'})).toBeVisible();
});

test('móvil: Biblioteca es destino directo y Tareas conserva áreas, progreso, diario y Para después',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile','Escenario móvil');
 await enterDemo(page);
 const nav=page.locator('.mobile-nav');
 for(const label of ['Mi día','Calendario','Biblioteca','Tareas'])await expect(nav.getByRole('button',{name:new RegExp(label,'i')})).toBeVisible();
 await expect(nav.getByRole('button',{name:/Mis áreas/i})).toHaveCount(0);
 await expect(nav.getByRole('button',{name:/Progreso/i})).toHaveCount(0);
 await nav.getByRole('button',{name:/Tareas/i}).click();
 await expect(page.getByRole('button',{name:'Mis áreas'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Progreso'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Mi diario'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Para después'})).toBeVisible();
 await page.getByRole('button',{name:'Progreso'}).click();
 await expect(page.getByRole('heading',{name:'Mi progreso'})).toBeVisible();
 await nav.getByRole('button',{name:/Tareas/i}).click();
 await page.getByRole('button',{name:'Para después'}).click();
 await expect(page.getByText(/Tareas activas sin fecha, guardadas sin presión/i)).toBeVisible();
});

test('Biblioteca usa un solo catálogo y deja las sesiones/citas como complemento',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await enterDemo(page);
 await page.locator('.sidebar').getByRole('button',{name:/Biblioteca/i}).click();
 await expect(page.locator('[data-action="new-book"]')).toHaveCount(0);
 await expect(page.locator('[data-action="edit-book"]')).toHaveCount(0);
 await expect(page.getByText('Sesiones y citas de lectura')).toBeVisible();
 await expect(page.locator('.habits-library-embed + .reading-companion')).toHaveCount(1);
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
 let dialogMessage='';
 page.once('dialog',async dialog=>{dialogMessage=dialog.message();await dialog.dismiss();});
 await page.locator('#modal form').getByRole('button',{name:/Guardar/i}).click();
 await expect.poll(()=>dialogMessage).toContain('Coincide con');
 expect(dialogMessage).toContain('Inglés');
 await expect(page.locator('#modal')).toHaveAttribute('open','');
});

test('editor de hábito maneja la frecuencia semanal sin parche de DOM',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await enterDemo(page);
 await page.locator('[data-action="new-habit"]').first().click();
 const modal=page.locator('#modal');
 const mode=modal.locator('[name="frequencyMode"]');
 const weekly=modal.locator('[data-weekly-target]');
 await expect(mode).toBeVisible();
 await expect(weekly).toBeHidden();
 await mode.selectOption('weekly');
 await expect(weekly).toBeVisible();
 await expect(modal.locator('[name="weeklyTarget"]')).toHaveValue('3');
 await modal.locator('[name="weeklyTarget"]').fill('4');
 await mode.selectOption('days');
 await expect(weekly).toBeHidden();
 await mode.selectOption('weekly');
 await expect(weekly).toBeVisible();
 await expect(modal.locator('[name="weeklyTarget"]')).toHaveValue('4');
});
