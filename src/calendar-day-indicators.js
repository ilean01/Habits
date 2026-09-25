import {dayDetailData} from './day-detail-data.js';

const MOODS={
 1:{emoji:'😔',label:'Difícil'},
 2:{emoji:'😐',label:'Más o menos'},
 3:{emoji:'🙂',label:'Bien'},
 4:{emoji:'😊',label:'Muy bien'},
 5:{emoji:'🤩',label:'Con mucha energía'}
};

export function calendarDayIndicators({date,journals=[],tasks=[],logs=[],eventLogs=[],habitDone=0}={}){
 const day=dayDetailData({date,journals,tasks,logs,dailyPlans:[],readings:[]});
 const mood=MOODS[day.mood]||null;
 const photos=day.workoutPhotos.length;
 const completedEvents=eventLogs.filter(row=>row?.date===date).length;
 const completed=Math.max(0,Number(habitDone)||0)+day.tasksDone+completedEvents;
 return {
  mood,
  waterLiters:day.waterLiters,
  photos,
  completed,
  hasAny:!!(mood||day.waterLiters||photos||completed)
 };
}

export function compactLiters(value){
 const n=Number(value)||0;
 if(!n)return '';
 return n.toLocaleString('es-PY',{minimumFractionDigits:n<1?1:0,maximumFractionDigits:1});
}
