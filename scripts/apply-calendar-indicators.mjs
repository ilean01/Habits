import fs from 'node:fs';

const path='src/main.js';
let main=fs.readFileSync(path,'utf8');

if(!main.includes("import './calendar-indicators.css';")){
 const needle="import './day-detail-responsive.css';";
 if(!main.includes(needle))throw new Error('No se encontró import responsive');
 main=main.replace(needle,`${needle}\nimport './calendar-indicators.css';`);
}

if(!main.includes("import {calendarDayIndicators,compactLiters} from './calendar-day-indicators.js';")){
 const needle="import {dayDetailData} from './day-detail-data.js';";
 if(!main.includes(needle))throw new Error('No se encontró dayDetailData');
 main=main.replace(needle,`${needle}\nimport {calendarDayIndicators,compactLiters} from './calendar-day-indicators.js';`);
}

main=main.replace('Menu,Sparkles} from \'lucide\';','Menu,Sparkles,Camera} from \'lucide\';');
main=main.replace('Menu,Sparkles};','Menu,Sparkles,Camera};');
if(!main.includes('Camera} from \'lucide\';')||!main.includes('Menu,Sparkles,Camera};'))throw new Error('No se pudo registrar Camera');

if(!main.includes('function calendarSignals(d,habitDone){')){
 const needle='function calendarView(){';
 const helper=`function calendarSignals(d,habitDone){\n const info=calendarDayIndicators({date:d,journals:rec('journal'),tasks:rec('task'),logs:rec('log'),eventLogs:rec('eventLog'),habitDone});\n if(!info.hasAny)return '';\n const mood=info.mood?\`<span class="calendar-signal mood" title="Ánimo: ${'${'}esc(info.mood.label)}" aria-label="Ánimo: ${'${'}esc(info.mood.label)}">${'${'}info.mood.emoji}</span>\`:'';\n const water=info.waterLiters?\`<span class="calendar-signal water" title="Agua: ${'${'}compactLiters(info.waterLiters)} litros" aria-label="Agua: ${'${'}compactLiters(info.waterLiters)} litros">${'${'}icon('Droplets')}<span>${'${'}compactLiters(info.waterLiters)}<span class="calendar-signal-unit"> L</span></span></span>\`:'';\n const photos=info.photos?\`<span class="calendar-signal photos" title="${'${'}info.photos} ${'${'}info.photos===1?'foto':'fotos'}" aria-label="${'${'}info.photos} ${'${'}info.photos===1?'foto':'fotos'}">${'${'}icon('Camera')}<span>${'${'}info.photos}</span></span>\`:'';\n const done=info.completed?\`<span class="calendar-signal done" title="${'${'}info.completed} completado${'${'}info.completed===1?'':'s'}" aria-label="${'${'}info.completed} completado${'${'}info.completed===1?'':'s'}">${'${'}icon('Check')}<span>${'${'}info.completed}</span></span>\`:'';\n return \`<div class="calendar-indicators">${'${'}mood}${'${'}water}${'${'}photos}${'${'}done}</div>\`;\n}\n`;
 if(!main.includes(needle))throw new Error('No se encontró calendarView');
 main=main.replace(needle,helper+needle);
}

const old='${st.done?`<b class="calendar-progress">${st.done} ✓</b>`:\'\'}';
if(main.includes(old))main=main.replace(old,'${calendarSignals(d,st.done)}');
if(!main.includes('${calendarSignals(d,st.done)}'))throw new Error('No se integraron señales en las celdas');

fs.writeFileSync(path,main);
