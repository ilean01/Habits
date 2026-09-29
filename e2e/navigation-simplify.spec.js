import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
}

test('Más agrupa las funciones secundarias en móvil sin Mis áreas',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile','Escenario móvil');
 await enterDemo(page);

 await page.locator('[data-action="nav"][data-view="space"]:visible').first().click();
 await expect(page.getByRole('heading',{name:'Tareas',exact:true})).toBeVisible();
 await expect(page.locator('.space-tabs [data-tab="planning"]')).toHaveCount(0);
 await expect(page.locator('.space-tabs [data-tab="tareas"]')).toBeVisible();
 await expect(page.locator('.space-tabs [data-tab="later"]')).toBeVisible();
 await expect(page.locator('.space-tabs [data-tab="proyectos"]')).toBeVisible();

 await page.getByRole('button',{name:/Más secciones/i}).click();
 const more=page.locator('#modal');
 await expect(more.locator('[data-action="nav"][data-view="areas"]')).toHaveCount(0);
 await expect(more.getByRole('button',{name:'Progreso'})).toBeVisible();
 await expect(more.getByRole('button',{name:'Mi diario'})).toBeVisible();
 await more.getByRole('button',{name:'Progreso'}).click();
 await expect(page.getByRole('heading',{name:'Mi progreso'})).toBeVisible();

 await page.locator('[data-action="nav"][data-view="calendar"]:visible').first().click();
 await expect(page.getByRole('button',{name:'Organizar semana'})).toBeVisible();
});
