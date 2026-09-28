import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
 await expect(page.locator('.dashboard-widget-grid')).toBeVisible();
}

test('Mi día permite elegir, ocultar y reordenar widgets y recuerda el diseño',async({page})=>{
 await enterDemo(page);
 const customize=page.getByRole('button',{name:'Personalizar widgets de Mi día'});
 await expect(customize).toBeVisible();
 await customize.click();
 const dialog=page.locator('#dashboard-customizer');
 await expect(dialog).toBeVisible();

 const water=dialog.getByRole('checkbox',{name:'Agua'});
 await expect(water).toBeChecked();
 await water.uncheck();
 await dialog.getByLabel('Distribución').selectOption('one');
 await dialog.getByRole('button',{name:'Mover Lectura arriba'}).click();
 await dialog.getByRole('button',{name:'Listo'}).click();

 await expect(page.locator('.dashboard-widget-grid')).toHaveAttribute('data-columns','one');
 await expect(page.locator('[data-dashboard-widget="water"]')).toBeHidden();
 const order=await page.locator('[data-dashboard-widget]').evaluateAll(nodes=>nodes.map(node=>node.dataset.dashboardWidget));
 expect(order.indexOf('reading')).toBeLessThan(order.indexOf('nutrition'));

 await page.locator('[data-planner-action="mode"][data-mode="planner"]').click();
 await expect(page.locator('.daily-planner')).toBeVisible();
 await page.locator('[data-planner-action="mode"][data-mode="dashboard"]').click();
 await expect(page.locator('.dashboard-widget-grid')).toHaveAttribute('data-columns','one');
 await expect(page.locator('[data-dashboard-widget="water"]')).toBeHidden();

 await page.getByRole('button',{name:'Personalizar widgets de Mi día'}).click();
 await page.locator('#dashboard-customizer').getByRole('button',{name:'Restaurar diseño original'}).click();
 await page.locator('#dashboard-customizer').getByRole('button',{name:'Listo'}).click();
 await expect(page.locator('[data-dashboard-widget="water"]')).toBeVisible();
 await expect(page.locator('.dashboard-widget-grid')).toHaveAttribute('data-columns','auto');
});
