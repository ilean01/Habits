import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.app-layout')).toBeVisible();
}

const box=locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height};});
const css=(locator,prop)=>locator.evaluate((el,p)=>getComputedStyle(el).getPropertyValue(p),prop);

test('notebook usa densidad compacta sin perder legibilidad',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await enterDemo(page);
 const sidebar=page.locator('.sidebar');
 const topbar=page.locator('.topbar');
 const create=page.locator('[data-action="create"]').first();
 const panel=page.locator('.panel').first();
 expect((await box(sidebar)).width).toBeLessThanOrEqual(212);
 expect((await box(topbar)).height).toBeLessThanOrEqual(66);
 const createBox=await box(create);
 expect(createBox.height).toBeGreaterThanOrEqual(35);
 expect(createBox.height).toBeLessThanOrEqual(40);
 expect(parseFloat(await css(panel,'padding-top'))).toBeLessThanOrEqual(16);
 expect(parseFloat(await css(page.locator('.content'),'padding-left'))).toBeLessThanOrEqual(30);
});

test('modo letra grande conserva controles amplios en notebook',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='notebook','Escenario de notebook');
 await enterDemo(page);
 await page.evaluate(()=>document.documentElement.classList.add('large'));
 const createBox=await box(page.locator('[data-action="create"]').first());
 expect(createBox.height).toBeGreaterThanOrEqual(44);
});

test('iPhone conserva superficies tactiles de al menos 44px',async({page},testInfo)=>{
 test.skip(testInfo.project.name!=='mobile','Escenario móvil');
 await enterDemo(page);
 const profile=await box(page.locator('.profile-button'));
 const primary=await box(page.locator('[data-action="create"]').first());
 const navButton=await box(page.locator('.mobile-nav button').first());
 expect(profile.height).toBeGreaterThanOrEqual(44);
 expect(profile.width).toBeGreaterThanOrEqual(44);
 expect(primary.height).toBeGreaterThanOrEqual(44);
 expect(navButton.height).toBeGreaterThanOrEqual(52);
});
