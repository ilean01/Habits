import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {library} from './library-fixture.js';
const fixture=JSON.parse(await fs.readFile(new URL('../scripts/reference/fixture.json',import.meta.url),'utf8'));
// Reference HTML is rendered by unmodified Flask templates using fixture.json.
test('comparación de pantallas con original y datos equivalentes',async({page},info)=>{
 test.setTimeout(120000);
 const dir=`docs/library-comparison/${info.project.name}`;await fs.mkdir(dir,{recursive:true});
 const ref=await page.context().newPage();const reference=name=>ref.goto('/scripts/reference/rendered/'+name+'.html');await reference('catalogo');await library(page,{fixture});
 const shots=async name=>{await page.screenshot({path:`${dir}/${name}-habits.png`,fullPage:true});await ref.screenshot({path:`${dir}/${name}-original.png`,fullPage:true});};
 await shots('catalogo');
 await page.locator('[data-action=book][data-id="1"]').first().click();await reference('ficha');await shots('ficha');
 await page.getByRole('button',{name:'✏️ Editar',exact:true}).click();await reference('editar');await shots('editar');
 await page.locator('#library-modal [data-cover-open]').click();await ref.locator('button').filter({hasText:'Manejar portada e imágenes'}).click();await expect(page.locator('.lib-draft-qr img')).toBeVisible();await shots('portada');
 await page.locator('[data-cover-close]').click();await page.locator('#library-modal [data-action=close]').first().click();await page.locator('.lib-nav [data-action=new-book]').click();await reference('agregar');await shots('agregar');
 await page.locator('#library-modal [data-action=close]').first().click();
 for(const [name,path] of [['lecturas','/lecturas'],['prestamos','/prestamos'],['deseos','/?lista=deseos'],['proximas','/proximas'],['estadisticas','/estadisticas'],['revisar','/revisar'],['etiquetas','/etiquetas_lomo'],['papelera','/papelera'],['configuracion','/configuracion']]){await page.locator(`.lib-nav [data-view=${name}]`).click();await reference(name);await shots(name);}
});
