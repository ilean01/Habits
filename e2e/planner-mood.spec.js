import {test,expect} from '@playwright/test';

async function enterPlanner(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
 await page.locator('[data-planner-action="mode"][data-mode="planner"]').click();
 await expect(page.locator('.daily-planner')).toBeVisible();
}

test('Agenda del día permite calificar cómo me siento con los mismos emojis de Mi día',async({page})=>{
 await enterPlanner(page);
 const mood=page.locator('.planner-mood-section');
 await expect(mood.getByRole('heading',{name:'¿Cómo te sentís hoy?'})).toBeVisible();
 await expect(mood.getByRole('radio')).toHaveCount(5);
 await mood.getByRole('radio',{name:/Muy bien: 4 de 5/}).click();
 const modal=page.locator('#modal');
 await expect(modal.getByRole('heading',{name:/Mi momento del día/})).toBeVisible();
 await expect(modal.locator('select[name="mood"]')).toHaveValue('4');
});
