import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
}

test('Mi día muestra sueño con estrellas y tipo de día con opciones visibles',async({page})=>{
 await enterDemo(page);
 const switcher=page.locator('.planner-mode-switch-compact');
 await expect(switcher).toBeVisible();
 await expect(switcher).toContainText('Vista');
 await expect(page.getByText('Elegí cómo querés ver tu día.')).toHaveCount(0);

 const picker=page.locator('.day-mode-picker');
 await expect(picker).toBeVisible();
 await expect(picker.getByRole('radio')).toHaveCount(6);
 await expect(page.locator('select#day-mode')).toHaveCount(0);
 await picker.getByRole('radio',{name:/Descanso/}).click();
 await expect(page.locator('.rest-day-notice')).toBeVisible();
 await picker.getByRole('radio',{name:/Habitual/}).click();

 const sleep=page.getByRole('group',{name:'Calidad del sueño'});
 await expect(sleep.getByRole('button')).toHaveCount(5);
 await sleep.getByRole('button',{name:/Bien: 4 de 5 estrellas/}).click();
 await expect(page.locator('.sleep-rating-caption')).toContainText('★★★★☆');

 await page.locator('[data-action="nav"][data-view="calendar"]').first().click();
 await expect(page.locator('.calendar-cell.current .calendar-signal.sleep')).toContainText('4');
});

test('alimentación queda al final del Dashboard y no aparece en Agenda del día',async({page})=>{
 await enterDemo(page);
 const dashboard=page.locator('.dashboard-grid');
 const nutrition=page.locator('.nutrition-day-summary');
 await expect(nutrition).toBeVisible();
 const followsDashboard=await page.evaluate(()=>{
  const dashboard=document.querySelector('.dashboard-grid');
  return dashboard?.nextElementSibling?.classList.contains('nutrition-day-summary')||false;
 });
 expect(followsDashboard).toBe(true);

 await page.getByRole('button',{name:'Ver Agenda del día'}).click();
 await expect(page.locator('.daily-planner')).toBeVisible();
 await expect(page.locator('.nutrition-day-summary')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Ver Dashboard'})).toBeVisible();
});
