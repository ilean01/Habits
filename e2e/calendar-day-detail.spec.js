import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
}

test('tocar un día muestra una ficha única y limpia',async({page})=>{
 await enterDemo(page);
 await page.locator('[data-action="nav"][data-view="calendar"]:visible').first().click();
 await expect(page.locator('[data-day-detail]')).toBeVisible();
 await expect(page.getByText('Ficha del día',{exact:true})).toBeVisible();
 const cells=page.locator('.calendar-cell:visible');
 await cells.nth(15).click();
 await expect(page.locator('[data-day-detail]')).toBeVisible();
 await expect(page.locator('.day-detail-glance')).toBeVisible();
 expect(await page.locator('.day-detail-section').count()).toBeGreaterThanOrEqual(2);
 await expect(page.locator('.day-history')).toHaveCount(0);
});
