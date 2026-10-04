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
  const headPosition=await page.locator('.day-detail-head').evaluate(el=>getComputedStyle(el).position);
  expect(headPosition).not.toBe('sticky');
  const glance=page.locator('.day-detail-glance');
  await expect(glance).toBeVisible();
  const cards=glance.locator(':scope > div');
  await expect(cards).toHaveCount(5);
  await expect(cards.nth(0).locator('strong')).toBeVisible();
  await expect(cards.nth(1)).toContainText(/sueño/i);
  await expect(cards.nth(2).locator('strong')).toBeVisible();
  await expect(cards.nth(2)).toContainText(/L/);
  await expect(cards.nth(3).locator('strong')).toBeVisible();
  await expect(cards.nth(4).locator('strong')).toBeVisible();
  await back.click();
  await expect(page.locator('#calendar-month')).toBeVisible();
  const box=await page.locator('#calendar-month').boundingBox();
  expect(box).not.toBeNull();
  expect(box.y).toBeLessThan(page.viewportSize().height);
 }else{
  await expect(back).toBeHidden();
  const position=await page.locator('[data-day-detail]').evaluate(el=>getComputedStyle(el).position);
  if(width>=1201)expect(position).toBe('static');
  const glance=page.locator('.day-detail-glance');
  const cards=glance.locator(':scope > div');
  await expect(cards).toHaveCount(5);
  const boxes=await cards.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,right:r.right,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};}));
  expect(new Set(boxes.map(b=>Math.round(b.y))).size).toBe(1);
  for(const box of boxes)expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth+1);
  for(let i=1;i<boxes.length;i++)expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i-1].right-1);
  await expect(page.locator('[data-day-detail]')).toHaveCSS('overflow-y','visible');
  await expect(page.locator('.sidebar')).toHaveCSS('overflow-y','visible');
 }
});
