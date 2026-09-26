import fs from 'node:fs';
const path='e2e/habits.spec.js';
let source=fs.readFileSync(path,'utf8');
const from=" await expect(page.locator('.habits-library-embed + .reading-companion')).toHaveCount(1);";
const to=" await expect(page.locator('[data-library-native-host]')).toBeVisible();\n await expect(page.locator('[data-library-native-root]')).toHaveCount(1);\n await expect(page.locator('[data-library-native-root] iframe')).toHaveCount(0);\n await expect(page.locator('.habits-library-native + .reading-companion')).toHaveCount(1);";
const count=source.split(from).length-1;if(count!==1)throw new Error(`E2E Biblioteca: ${count} coincidencias`);
source=source.replace(from,to);
fs.writeFileSync(path,source);
