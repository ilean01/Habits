import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
}

test('el calendario resume el día con ánimo y completados',async({page})=>{
 await enterDemo(page);

 await page.locator('.moods button').nth(3).click();
 const modal=page.locator('#modal');
 await expect(modal).toBeVisible();
 await modal.locator('select[name="mood"]').selectOption('4');
 await modal.locator('form').evaluate(form=>form.requestSubmit());
 await expect(modal).not.toBeVisible();

 await page.locator('[data-planner-action="mode"][data-mode="planner"]').click();
 const planner=page.locator('.daily-planner');
 const quick=planner.locator('[data-planner-form="task"]');
 await quick.locator('input[name="name"]').fill('Indicador calendario');
 await quick.getByRole('button',{name:'Agregar'}).click();
 const row=planner.locator('.planner-task-row').filter({hasText:'Indicador calendario'});
 await expect(row).toBeVisible();
 await row.locator('[data-action="task-done"]').click();

 await page.locator('[data-action="nav"][data-view="calendar"]:visible').first().click();
 const today=page.locator('.calendar-cell.current');
 await expect(today).toBeVisible();
 await expect(today.locator('.calendar-signal.mood')).toHaveAttribute('aria-label','Ánimo: Muy bien');
 await expect(today.locator('.calendar-signal.done')).toBeVisible();
});
