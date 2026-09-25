import {test,expect} from '@playwright/test';

async function enterDemo(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Explorar la demo/i}).click();
 await expect(page.locator('.day-hero')).toBeVisible();
}

test('Agenda del día comparte hábitos, tareas y eventos con Habits y recuerda la vista',async({page})=>{
 await enterDemo(page);
 await page.locator('[data-planner-action="mode"][data-mode="planner"]').click();
 const planner=page.locator('.daily-planner');
 await expect(planner).toBeVisible();
 await expect(planner.getByRole('heading',{name:'Prioridades de hoy'})).toBeVisible();
 await expect(planner.getByRole('heading',{name:'Tracker de hábitos'})).toBeVisible();
 await expect(planner.getByRole('heading',{name:'Checklist'})).toBeVisible();

 const priority=planner.locator('[data-plan-field="priority"]').first();
 await priority.fill('Una prioridad importante');
 await priority.press('Tab');
 await expect(planner.locator('[data-plan-field="priority"]').first()).toHaveValue('Una prioridad importante');

 const quickTask=planner.locator('[data-planner-form="task"]');
 await quickTask.locator('input[name="name"]').fill('Llamar a mamá');
 await quickTask.getByRole('button',{name:'Agregar'}).click();
 await expect(planner.getByText('Llamar a mamá',{exact:true})).toBeVisible();

 await planner.locator('[data-planner-action="event-at"]').first().click();
 const dialog=page.locator('#planner-quick-dialog');
 await expect(dialog).toBeVisible();
 await dialog.locator('input[name="name"]').fill('Médico');
 await dialog.getByRole('button',{name:'Guardar'}).click();
 await expect(planner.getByText('Médico',{exact:true})).toBeVisible();

 await page.locator('[data-planner-action="mode"][data-mode="dashboard"]').click();
 await expect(page.locator('.day-hero')).toBeVisible();
 await expect(page.locator('.daily-planner')).toHaveCount(0);
 await page.locator('[data-planner-action="mode"][data-mode="planner"]').click();
 const restored=page.locator('.daily-planner');
 await expect(restored.locator('[data-plan-field="priority"]').first()).toHaveValue('Una prioridad importante');
 await expect(restored.getByText('Llamar a mamá',{exact:true})).toBeVisible();
});
