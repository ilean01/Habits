import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

test('Agenda del día se renderiza nativamente desde main sin observador de DOM',async()=>{
 const [main,index,planner]=await Promise.all([read('src/main.js'),read('index.html'),read('src/daily-planner.js')]);
 assert.match(main,/dailyPlannerLayout/);
 assert.match(main,/todayDashboardView/);
 assert.doesNotMatch(index,/src\/daily-planner\.js/);
 assert.doesNotMatch(planner,/MutationObserver/);
 assert.doesNotMatch(planner,/isTodayScreen/);
 assert.match(planner,/export function dailyPlannerLayout/);
 assert.match(planner,/data-planner-action=\"mode\"/);
});
