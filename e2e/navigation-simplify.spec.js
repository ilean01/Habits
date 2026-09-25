import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
}

test('Más desaparece y sus funciones quedan reubicadas',async({page})=>{
 await enterDemo(page);

 await page.locator('[data-action="nav"][data-view="space"]:visible').first().click();
 await expect(page.getByRole('heading',{name:'Tareas',exact:true})).toBeVisible();
 await expect(page.locator('.space-tabs [data-tab="planning"]')).toHaveCount(0);
 await expect(page.locator('.space-tabs [data-tab="tareas"]')).toBeVisible();
 await expect(page.locator('.space-tabs [data-tab="later"]')).toBeVisible();
 await expect(page.locator('.space-tabs [data-tab="proyectos"]')).toBeVisible();

 await page.locator('[data-action="nav"][data-view="areas"]:visible').first().click();
 await page.locator('.area-filters [data-action="area"][data-id="facultad"]').click();
 await expect(page.locator('.area-domain-planning[data-area="facultad"] #planning-facultad')).toBeVisible();
 await expect(page.locator('.area-domain-planning #planning-trabajo')).toHaveCount(0);
 await expect(page.locator('.area-domain-planning #planning-ingles')).toHaveCount(0);

 await page.locator('[data-action="nav"][data-view="calendar"]:visible').first().click();
 await expect(page.getByRole('button',{name:'Organizar semana'})).toBeVisible();
});
