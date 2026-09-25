import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
}

test('Ficha del día se comporta como panel en notebook y ficha móvil en teléfono',async({page})=>{
 await enterDemo(page);
 await page.locator('[data-action="nav"][data-view="calendar"]:visible').first().click();
 await expect(page.locator('[data-day-detail]')).toBeVisible();
 const width=page.viewportSize()?.width||1200;
 const back=page.locator('.day-detail-back');
 if(width<=650){
  await expect(back).toBeVisible();
  await back.click();
  await expect(page.locator('#calendar-month')).toBeVisible();
  const box=await page.locator('#calendar-month').boundingBox();
  expect(box).not.toBeNull();
  expect(box.y).toBeLessThan(page.viewportSize().height);
 }else{
  await expect(back).toBeHidden();
  const position=await page.locator('[data-day-detail]').evaluate(el=>getComputedStyle(el).position);
  if(width>=1201)expect(position).toBe('sticky');
 }
});
