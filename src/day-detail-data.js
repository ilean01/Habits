import {waterTotal} from './hydration.js';
import {planForDate} from './daily-planner-domain.js';
import {diaryEntries,workoutPhotos,bodyMeasurements,achievements,englishPractices} from './selectors.js';

const byTime=(a,b)=>String(a.at||'').localeCompare(String(b.at||''));
const newest=rows=>rows.slice().sort(byTime).at(-1)||null;

export function dayDetailData({date,journals=[],dailyPlans=[],tasks=[],readings=[],logs=[]}={}){
 const plan=planForDate(dailyPlans,date);
 const diary=newest(diaryEntries(journals).filter(r=>r.date===date));
 const dayTasks=tasks.filter(t=>t?.due===date).slice().sort((a,b)=>Number(a.done)-Number(b.done)||({alta:0,media:1,baja:2}[a.priority]??1)-({alta:0,media:1,baja:2}[b.priority]??1)||(a.name||'').localeCompare(b.name||''));
 const dayReadings=readings.filter(r=>r?.date===date).slice().sort(byTime);
 const photos=workoutPhotos(journals).filter(r=>r.date===date&&r.path).slice().sort(byTime);
 const body=newest(bodyMeasurements(journals).filter(r=>r.date===date));
 const dayAchievements=achievements(journals).filter(r=>r.date===date).slice().sort(byTime);
 const practices=englishPractices(journals).filter(r=>r.date===date).slice().sort(byTime);
 const priorities=plan.priorities.map(v=>String(v||'').trim()).filter(Boolean);
 const readingMinutes=dayReadings.reduce((n,r)=>n+(Number(r.minutes)||0),0);
 const waterLiters=waterTotal(logs,date);
 return {
  plan,
  priorities,
  gratitude:String(plan.gratitude||'').trim(),
  notes:String(plan.notes||'').trim(),
  diary,
  mood:Number(diary?.mood)||0,
  tasks:dayTasks,
  tasksDone:dayTasks.filter(t=>t.done).length,
  readings:dayReadings,
  readingMinutes,
  waterLiters,
  workoutPhotos:photos,
  bodyLog:body,
  achievements:dayAchievements,
  englishPractices:practices,
  hasReflection:!!(priorities.length||plan.gratitude||plan.notes||diary?.text),
  hasWellbeing:!!(Number(diary?.mood)||waterLiters||body||photos.length)
 };
}
