import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
}

test('un deep link abre directamente la vista solicitada después de entrar',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await page.goto('/#/calendar');
 await enterDemo(page);
 await expect(page.getByRole('heading',{name:'Tu calendario'})).toBeVisible();
 await expect(page).toHaveURL(/#\/calendar$/);
});

test('navegación principal actualiza URL y atrás restaura la vista anterior',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await page.goto('/#/today');
 await enterDemo(page);
 const sidebar=page.locator('.sidebar');
 await sidebar.getByRole('button',{name:/Calendario/i}).click();
 await expect(page).toHaveURL(/#\/calendar$/);
 await expect(page.getByRole('heading',{name:'Tu calendario'})).toBeVisible();
 await sidebar.getByRole('button',{name:/Tareas/i}).click();
 await expect(page).toHaveURL(/#\/tasks$/);
 await expect(page.getByRole('heading',{name:'Tareas',exact:true})).toBeVisible();
 await page.goBack();
 await expect(page).toHaveURL(/#\/calendar$/);
 await expect(page.getByRole('heading',{name:'Tu calendario'})).toBeVisible();
});

test('una ruta de área conserva el área seleccionada',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await page.goto('/#/areas/ingles');
 await enterDemo(page);
 await expect(page).toHaveURL(/#\/areas\/ingles$/);
 await expect(page.getByRole('heading',{name:'Inglés'})).toBeVisible();
});
