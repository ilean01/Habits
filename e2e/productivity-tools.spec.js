import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.topbar')).toBeVisible();
}
async function closeMainModal(page){const modal=page.locator('#modal');if(await modal.isVisible())await modal.locator('[data-action="close"]').first().click();}

test('búsqueda avanzada, registro rápido, concentración y atajos funcionan en notebook y móvil',async({page})=>{
 await enterDemo(page);

 const quick=page.getByRole('button',{name:'Registro rápido'}).first();
 await expect(quick).toBeVisible();
 await quick.click();
 await expect(page.locator('#modal')).toContainText('Registro rápido');
 for(const label of ['Tarea','Evento','Hábito','Diario','Agua · 0,25 L','Comida','Lectura','Proyecto'])await expect(page.locator('#modal').getByRole('button',{name:new RegExp(label)})).toBeVisible();
 await closeMainModal(page);

 await page.getByRole('button',{name:'Buscar'}).click();
 const search=page.locator('#modal [data-advanced-search-root]');
 await expect(search).toBeVisible();
 for(const label of ['Tipo','Área','Estado','Desde','Hasta','Orden'])await expect(search.getByLabel(label)).toBeVisible();
 await search.locator('#advanced-search').fill('lectura');
 await expect(search.locator('[data-search-index="0"]')).toBeVisible();
 await expect(search.locator('#advanced-search-meta')).toContainText(/coincidencia/);
 await closeMainModal(page);

 await page.getByRole('button',{name:'Modo concentración'}).click();
 const focus=page.locator('#focus-mode-dialog');
 await expect(focus).toBeVisible();
 await focus.getByRole('button',{name:'Empezar una sesión libre'}).click();
 await expect(focus.locator('[data-focus-timer]')).toHaveText(/^(25:00|24:5\d)$/);
 await focus.getByRole('button',{name:'Pausar'}).click();
 await expect(focus.getByRole('button',{name:'Continuar'})).toBeVisible();
 await focus.getByRole('button',{name:'Cerrar'}).click();
 await expect(page.getByRole('button',{name:'Modo concentración'})).toHaveClass(/is-active/);

 await page.keyboard.press('Control+K');
 await expect(page.locator('#modal [data-advanced-search-root]')).toBeVisible();
 await closeMainModal(page);
 await page.keyboard.press('Control+Enter');
 await expect(page.locator('#modal')).toContainText('Registro rápido');
 await closeMainModal(page);
 await page.keyboard.press('Control+Shift+F');
 await expect(focus).toBeVisible();
 await expect(focus).toContainText('Sesión libre');
 await focus.getByRole('button',{name:'Terminar sesión'}).click();

 await page.keyboard.type('?');
 await expect(page.locator('#modal')).toContainText('Atajos de teclado');
 await expect(page.locator('#modal')).toContainText('Búsqueda global');
 await closeMainModal(page);

 await page.setViewportSize({width:390,height:844});
 const floating=page.locator('.universal-add-button');
 await expect(floating).toBeVisible();
 await floating.click();
 await expect(page.locator('#modal')).toContainText('Registro rápido');
});
