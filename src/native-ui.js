import {dayKey} from './domain.js';
import {holidayOn,holidayStatusText} from './paraguay-holidays.js';
import {activeWorkBlock} from './work-context.js';
import {priorityAreaForDayMode} from './selectors.js';

const identity=value=>String(value??'');

function envNavigator(env={}){
 return env.navigator??globalThis.navigator??{};
}

function envMatchMedia(env={}){
 return env.matchMedia??globalThis.matchMedia;
}

export function isIOSDevice(env={}){
 const nav=envNavigator(env);
 return /iPad|iPhone|iPod/.test(nav.userAgent||'')||(nav.platform==='MacIntel'&&Number(nav.maxTouchPoints)>1);
}

export function isStandaloneApp(env={}){
 const nav=envNavigator(env),matchMedia=envMatchMedia(env);
 return matchMedia?.('(display-mode: standalone)')?.matches===true||nav.standalone===true;
}

export function shouldShowInstallBanner(env={}){
 const dismissed=env.dismissed??globalThis.sessionStorage?.getItem?.('habits-install-dismissed')==='1';
 return isIOSDevice(env)&&!isStandaloneApp(env)&&!dismissed;
}

export function installBannerHtml(env={}){
 if(!shouldShowInstallBanner(env))return'';
 return `<section class="install-banner" data-install-banner><button class="install-close" data-action="dismiss-install" aria-label="Cerrar guía de instalación">×</button><h3>Instalá Habits en tu iPhone</h3><p>Así funciona como una app y puede recibir recordatorios.</p><div class="install-steps"><div class="install-step"><b>①</b>Abrí Habits en <strong>Safari</strong></div><div class="install-step"><b>↗</b>Tocá <strong>Compartir</strong></div><div class="install-step"><b>＋</b>Elegí <strong>Agregar a pantalla de inicio</strong></div></div></section>`;
}

export function installHelpHtml(env={}){
 const iosSteps=isIOSDevice(env)?'<div class="install-steps"><div class="install-step"><b>①</b>Safari</div><div class="install-step"><b>↗</b>Compartir</div><div class="install-step"><b>＋</b>Agregar a inicio</div></div>':'';
 return `<div class="install-help${iosSteps?' enhanced-install':''}"><h3>Siempre a mano</h3><p><b>iPhone:</b> abrí Habits en Safari, tocá Compartir y “Agregar a pantalla de inicio”.</p><p><b>Windows:</b> usá la opción de instalar aplicación de Edge o Chrome.</p>${iosSteps}<p class="muted small">Las notificaciones se activan por dispositivo desde la sección de avisos de arriba.</p></div>`;
}

export function todayUiContext({events=[],habits=[],dayMode='habitual',now=new Date(),escape=identity}={}){
 const date=dayKey(now),time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
 const workBlock=activeWorkBlock(events,date,time);
 const priorityArea=workBlock?'trabajo':priorityAreaForDayMode(dayMode);
 const ordered=habits.slice();
 if(priorityArea)ordered.sort((a,b)=>Number(b.area===priorityArea)-Number(a.area===priorityArea));
 const labels={trabajo:'lo laboral',facultad:'Facultad'};
 const contextHtml=workBlock?`<div class="context-focus">💼 Estás dentro de <strong>${escape(workBlock.name||'tu horario de trabajo')}</strong>${workBlock.end?` hasta las ${escape(workBlock.end)}`:''}. Primero te muestro ${labels[priorityArea]||'lo prioritario'}; lo demás sigue disponible.</div>`:'';
 const holiday=holidayOn(date);
 const holidayHtml=holiday?`<p class="holiday-today">🇵🇾 Hoy es feriado: ${escape(holidayStatusText(holiday))}</p>`:'';
 return {habits:ordered,priorityArea,workBlock,holiday,contextHtml,holidayHtml};
}

export function waterDaysHtml(water,prettyDate){
 const keys=water?.keys||[],liters=water?.liters||[],scale=Math.max(2,...liters.map(Number));
 return `<div class="water-days">${keys.map((date,index)=>{
  const value=Number(liters[index]||0),level=value===0?3:Math.max(8,Math.min(100,(value/scale)*100)),label=prettyDate(date,{weekday:'short'}),shown=value.toLocaleString('es-PY');
  return `<div class="water-day" data-liters="${value}" title="${label}: ${shown} L" aria-label="${label}: ${shown} litros"><b>${shown} L</b><span class="water-column-track" aria-hidden="true"><i class="water-column-fill" style="--water-level:${level}%"></i></span><small>${label}</small></div>`;
 }).join('')}</div>`;
}
