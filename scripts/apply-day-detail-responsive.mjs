import fs from 'node:fs';
const path='src/main.js';
let main=fs.readFileSync(path,'utf8');
if(!main.includes("import './day-detail-responsive.css';")){
 const needle="import './native-ui.css';";
 if(!main.includes(needle))throw new Error('No se encontró native-ui.css');
 main=main.replace(needle,`${needle}\nimport './day-detail-responsive.css';`);
}
const headerNeedle='<header class="day-detail-head"><div>';
if(main.includes(headerNeedle)){
 main=main.replace(headerNeedle,'<header class="day-detail-head"><a class="day-detail-back" href="#calendar-month" aria-label="Volver al calendario">${icon(\'ChevronLeft\')}<span>Calendario</span></a><div>');
}
const calendarNeedle='<div class="calendar-layout"><section class="panel calendar-panel">${calendarToolbar(\'month\')}';
if(main.includes(calendarNeedle)){
 main=main.replace(calendarNeedle,'<div class="calendar-layout"><section class="panel calendar-panel" id="calendar-month">${calendarToolbar(\'month\')}');
}
if(!main.includes('class="day-detail-back" href="#calendar-month"'))throw new Error('No se insertó el regreso al calendario');
if(!main.includes('id="calendar-month"'))throw new Error('No se identificó el calendario mensual');
fs.writeFileSync(path,main);
