import './sleep-ui.js';
import {daySnapshot} from './day-service.js';
import {sleepLabel} from './sleep-rating.js';

const MOODS={
 1:{emoji:'😔',label:'Difícil'},
 2:{emoji:'😐',label:'Más o menos'},
 3:{emoji:'🙂',label:'Bien'},
 4:{emoji:'😊',label:'Muy bien'},
 5:{emoji:'🤩',label:'Con mucha energía'}
};

export function calendarDayIndicators({date,journals=[],photos=[],tasks=[],logs=[],eventLogs=[],habitDone=0}={}){
 const source={journal:journals,photo:photos,task:tasks,log:logs,eventLog:eventLogs};
 const day=daySnapshot({date,records:kind=>source[kind]||[],settings:{}});
 const mood=MOODS[day.detail.mood]||null;
 const sleep=day.detail.sleep?{value:day.detail.sleep,label:sleepLabel(day.detail.sleep)}:null;
 const photoCount=day.detail.dayPhotos.length;
 const completed=Math.max(0,Number(habitDone)||0)+day.detail.tasksDone+day.eventLogs.length;
 return {
  mood,
  sleep,
  waterLiters:day.detail.waterLiters,
  photos:photoCount,
  completed,
  hasAny:!!(mood||sleep||day.detail.waterLiters||photoCount||completed)
 };
}

export function compactLiters(value){
 const n=Number(value)||0;
 if(!n)return '';
 return n.toLocaleString('es-PY',{minimumFractionDigits:n<1?1:0,maximumFractionDigits:1});
}
