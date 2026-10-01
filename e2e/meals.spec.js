import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
}

test('Comidas abre desde el sidebar y muestra sus cinco espacios',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario notebook');
 await enterDemo(page);
 await page.locator('[data-action="nav"][data-view="meals"]:visible').first().click();
 await expect(page.getByRole('heading',{name:'Comidas',exact:true})).toBeVisible();
 const tabs=page.locator('.meals-tabs');
 await expect(tabs.getByRole('button',{name:'Hoy',exact:true})).toBeVisible();
 await expect(tabs.getByRole('button',{name:'Planificador',exact:true})).toBeVisible();
 await expect(tabs.getByRole('button',{name:'Despensa',exact:true})).toBeVisible();
 await expect(tabs.getByRole('button',{name:'Lista del súper',exact:true})).toBeVisible();
 await expect(tabs.getByRole('button',{name:'Recetas / Ideas',exact:true})).toBeVisible();
 await expect(page.locator('.meals-nutrition-card')).toBeVisible();
});

test('Despensa permite registrar un ingrediente y conservarlo al navegar',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario notebook');
 await enterDemo(page);
 await page.locator('[data-action="nav"][data-view="meals"]:visible').first().click();
 await page.locator('.meals-tabs').getByRole('button',{name:'Despensa',exact:true}).click();
 await page.getByRole('button',{name:/Agregar ingrediente/i}).first().click();
 const modal=page.locator('#modal');
 await modal.getByLabel('Ingrediente').fill('Tomate');
 await modal.getByLabel('Cantidad').fill('3');
 await modal.getByRole('button',{name:'Guardar',exact:true}).click();
 await expect(page.getByText('Tomate',{exact:true})).toBeVisible();
 await page.locator('.meals-tabs').getByRole('button',{name:'Hoy',exact:true}).click();
 await page.locator('.meals-tabs').getByRole('button',{name:'Despensa',exact:true}).click();
 await expect(page.getByText('Tomate',{exact:true})).toBeVisible();
});

test('Comidas es accesible desde Más en iPhone',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile','Escenario móvil');
 await enterDemo(page);
 await page.getByRole('button',{name:/Más secciones/i}).click();
 const more=page.locator('#modal');
 const comidas=more.getByRole('button',{name:'Comidas',exact:true});
 await expect(comidas).toBeVisible();
 await comidas.click();
 await expect(page.getByRole('heading',{name:'Comidas',exact:true})).toBeVisible();
 await expect(page.locator('.meals-tabs')).toBeVisible();
});
