import fs from 'node:fs';
const path='src/main.js';
let source=fs.readFileSync(path,'utf8');
const from="nutritionProgressView({meals:rec('meal'),endDate:today,days:window.nutritionProgressDays||30,prettyDate,btn})";
const to="nutritionProgressView({meals:rec('meal'),endDate:today,days:window.nutritionProgressDays||30,prettyDate,btn,goals:settings().nutritionGoals||{}})";
const count=source.split(from).length-1;
if(count!==1)throw new Error(`objetivos en Progreso: se esperaba 1 coincidencia y hubo ${count}`);
source=source.replace(from,to);
fs.writeFileSync(path,source);
