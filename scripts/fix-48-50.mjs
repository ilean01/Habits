import fs from 'node:fs';
const path='src/main.js';
let source=fs.readFileSync(path,'utf8');
const replaceOnce=(from,to,label)=>{const n=source.split(from).length-1;if(n!==1)throw new Error(`${label}: ${n} coincidencias`);source=source.replace(from,to);};
replaceOnce('${done} de ${habits.length}','${done} de ${rows.length}','contador de hábitos de ficha');
replaceOnce("st=dayStats(rec('habit'),rec('log'),d,effectiveDayMode(settings(),d))","st=daySnapshot({date:d,records:rec,settings:settings()}).stats",'stats de celda calendario');
fs.writeFileSync(path,source);
