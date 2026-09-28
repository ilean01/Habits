import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.topbar')).toBeVisible();
}

test('Centro personal abre Avisos, Actividad y Papelera en notebook y móvil',async({page})=>{
 await enterDemo(page);
 const bell=page.getByRole('button',{name:'Abrir centro de avisos'});
 await expect(bell).toBeVisible();
 await bell.click();
 const dialog=page.locator('#personal-center');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('button',{name:/Avisos/})).toBeVisible();
 await dialog.getByRole('button',{name:'Actividad'}).click();
 await expect(dialog.getByText('Todavía no hay actividad')).toBeVisible();
 await dialog.getByRole('button',{name:/Papelera/}).click();
 await expect(dialog.getByText('La papelera está vacía')).toBeVisible();
 await dialog.getByRole('button',{name:'Cerrar'}).click();

 await page.setViewportSize({width:390,height:844});
 await expect(bell).toBeVisible();
 await bell.click();
 await expect(dialog).toBeVisible();
 await expect(dialog).toHaveCSS('max-height','742.72px');
});
