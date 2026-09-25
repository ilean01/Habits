import fs from 'node:fs';

function replaceOnce(source,oldText,newText,label){
 const count=source.split(oldText).length-1;
 if(count!==1)throw new Error(`${label}: se esperaba 1 coincidencia y se encontraron ${count}`);
 return source.replace(oldText,newText);
}

const mainPath='src/main.js';
let main=fs.readFileSync(mainPath,'utf8');
if(!main.includes("import {dailyPlannerLayout} from './daily-planner.js';")){
 main=replaceOnce(main,"import {retireLegacyBooks} from './legacy-book-retirement.js';","import {retireLegacyBooks} from './legacy-book-retirement.js';\nimport {dailyPlannerLayout} from './daily-planner.js';",'import Agenda');
}
main=replaceOnce(main,'function todayView(){','function todayDashboardView(){','renombrar todayView');
main=replaceOnce(main,'\nfunction habitCard(','\nfunction todayView(){return dailyPlannerLayout(todayDashboardView(),dayKey());}\nfunction habitCard(','componer Mi día');
fs.writeFileSync(mainPath,main);

const indexPath='index.html';
let index=fs.readFileSync(indexPath,'utf8');
index=replaceOnce(index,'<script type="module" src="/src/daily-planner.js"></script>','','script planner independiente');
fs.writeFileSync(indexPath,index);

const testPath='tests/daily-planner.test.js';
let test=fs.readFileSync(testPath,'utf8');
test=test.replace("const [ui,css,index,extras,migration]=await Promise.all([\n  read('src/daily-planner.js'),read('src/daily-planner.css'),read('index.html'),read('src/extras.js'),read('supabase/migrations/20260924221500_daily_planner.sql')\n ]);\n assert.match(index,/daily-planner\\.js/);",
"const [ui,css,index,main,extras,migration]=await Promise.all([\n  read('src/daily-planner.js'),read('src/daily-planner.css'),read('index.html'),read('src/main.js'),read('src/extras.js'),read('supabase/migrations/20260924221500_daily_planner.sql')\n ]);\n assert.doesNotMatch(index,/src\\/daily-planner\\.js/);\n assert.match(main,/import \\{dailyPlannerLayout\\} from '\\.\\/daily-planner\\.js'/);\n assert.match(main,/function todayView\\(\\)\\{return dailyPlannerLayout\\(todayDashboardView\\(\\),dayKey\\(\\)\\);\\}/);\n assert.doesNotMatch(ui,/MutationObserver/);");
fs.writeFileSync(testPath,test);

const nativeTest=`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {readFile} from 'node:fs/promises';\n\nconst read=path=>readFile(new URL(\`../\${path}\`,import.meta.url),'utf8');\n\ntest('Agenda del día se renderiza nativamente desde main sin observador de DOM',async()=>{\n const [main,index,planner]=await Promise.all([read('src/main.js'),read('index.html'),read('src/daily-planner.js')]);\n assert.match(main,/dailyPlannerLayout/);\n assert.match(main,/todayDashboardView/);\n assert.doesNotMatch(index,/src\\/daily-planner\\.js/);\n assert.doesNotMatch(planner,/MutationObserver/);\n assert.doesNotMatch(planner,/isTodayScreen/);\n assert.match(planner,/export function dailyPlannerLayout/);\n assert.match(planner,/data-planner-action=\\"mode\\"/);\n});\n`;
fs.writeFileSync('tests/native-daily-planner.test.js',nativeTest);

console.log('Agenda del día integrada nativamente.');
