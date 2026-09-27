import fs from 'node:fs';
const mainPath='src/main.js';
let main=fs.readFileSync(mainPath,'utf8');
const replaceOnce=(from,to,label)=>{const n=main.split(from).length-1;if(n!==1)throw new Error(`${label}: ${n} coincidencias`);main=main.replace(from,to);};
replaceOnce('<a class="day-detail-back" href="#calendar-month" aria-label="Volver al calendario">${icon(\'ChevronLeft\')}<span>Calendario</span></a>','<button type="button" class="day-detail-back" data-action="calendar-top" aria-label="Volver al calendario">${icon(\'ChevronLeft\')}<span>Calendario</span></button>','botón regreso ficha');
replaceOnce("if(a==='nav'){modal.dataset.dirty='false';modal.close();navigateRoute({view:el.dataset.view});window.scrollTo(0,0);return;}","if(a==='calendar-top'){document.querySelector('#calendar-month')?.scrollIntoView({block:'start'});return;}if(a==='nav'){modal.dataset.dirty='false';modal.close();navigateRoute({view:el.dataset.view});window.scrollTo(0,0);return;}",'acción regreso ficha');
fs.writeFileSync(mainPath,main);

const cssPath='src/day-detail-responsive.css';
let css=fs.readFileSync(cssPath,'utf8');
css=css.replace('.day-detail-back{display:none}', '.day-detail-back{display:none;border:0;background:transparent;padding:0;font:inherit;cursor:pointer;text-decoration:none}');
fs.writeFileSync(cssPath,css);
