export const MEAL_TYPES={
 breakfast:'Desayuno',
 morning:'Media mañana',
 lunch:'Almuerzo',
 snack:'Merienda',
 dinner:'Cena',
 other:'Otro'
};

const round1=value=>Math.round((Number(value)||0)*10)/10;
const clean=value=>String(value??'').trim();
const parseDateKey=value=>{const [y,m,d]=String(value||'').split('-').map(Number);return new Date(y,m-1,d);};
const formatDateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const shiftDate=(key,delta)=>{const d=parseDateKey(key);d.setDate(d.getDate()+delta);return formatDateKey(d);};

export function mealTypeLabel(type){return MEAL_TYPES[type]||MEAL_TYPES.other;}

export function defaultMealType(date=new Date()){
 const hour=date.getHours();
 if(hour<10)return 'breakfast';
 if(hour<12)return 'morning';
 if(hour<15)return 'lunch';
 if(hour<19)return 'snack';
 return 'dinner';
}

export function inferMealType(meal={}){
 if(Object.hasOwn(MEAL_TYPES,meal.mealType))return meal.mealType;
 const label=clean(meal.label).toLocaleLowerCase('es');
 if(label.includes('desay'))return 'breakfast';
 if(label.includes('media mañana')||label.includes('media manana'))return 'morning';
 if(label.includes('almuer'))return 'lunch';
 if(label.includes('meriend'))return 'snack';
 if(label.includes('cena'))return 'dinner';
 const at=meal.at?new Date(meal.at):null;
 return at&&!Number.isNaN(at.getTime())?defaultMealType(at):'other';
}

export function mealTime(meal={}){
 if(/^\d{2}:\d{2}$/.test(clean(meal.time)))return clean(meal.time);
 const source=String(meal.at||'');
 const recorded=source.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})(?::[\d.]+)?[+-]\d{2}:\d{2}$/);
 if(recorded)return recorded[1];
 const at=meal.at?new Date(meal.at):null;
 if(!at||Number.isNaN(at.getTime()))return '';
 return `${String(at.getHours()).padStart(2,'0')}:${String(at.getMinutes()).padStart(2,'0')}`;
}

export function normalizeNutritionGoals(value={}){
 const number=key=>{const n=Number(value?.[key]);return Number.isFinite(n)&&n>0?round1(n):null;};
 return {calories:number('calories'),protein:number('protein'),carbs:number('carbs'),fat:number('fat')};
}

export function nutritionForDate(meals=[],date=''){
 const rows=meals.filter(m=>m?.date===date).map(m=>{const mealType=inferMealType(m);return {...m,mealType,mealTypeLabel:mealTypeLabel(mealType),time:mealTime(m)};}).sort((a,b)=>String(a.time||a.at||'').localeCompare(String(b.time||b.at||'')));
 const totals=rows.reduce((sum,m)=>({
  calories:sum.calories+(Number(m.totals?.calories)||0),
  protein:sum.protein+(Number(m.totals?.protein)||0),
  carbs:sum.carbs+(Number(m.totals?.carbs)||0),
  fat:sum.fat+(Number(m.totals?.fat)||0)
 }),{calories:0,protein:0,carbs:0,fat:0});
 const types=[...new Set(rows.map(m=>m.mealType))];
 return {
  date,
  meals:rows,
  count:rows.length,
  totals:{calories:Math.round(totals.calories),protein:round1(totals.protein),carbs:round1(totals.carbs),fat:round1(totals.fat)},
  types,
  typeLabels:types.map(mealTypeLabel),
  hasData:rows.length>0
 };
}

export function nutritionRangeStats(meals=[],endDate='',days=30){
 const range=[7,30,90].includes(Number(days))?Number(days):30;
 const keys=Array.from({length:range},(_,i)=>shiftDate(endDate,i-range+1));
 const byDay=keys.map(date=>nutritionForDate(meals,date));
 const recorded=byDay.filter(day=>day.hasData);
 const daysWithData=recorded.length;
 const totals=recorded.reduce((sum,day)=>({
  calories:sum.calories+day.totals.calories,
  protein:sum.protein+day.totals.protein,
  carbs:sum.carbs+day.totals.carbs,
  fat:sum.fat+day.totals.fat,
  meals:sum.meals+day.count
 }),{calories:0,protein:0,carbs:0,fat:0,meals:0});
 const divisor=daysWithData||1;
 const averages={
  calories:daysWithData?Math.round(totals.calories/divisor):0,
  protein:daysWithData?round1(totals.protein/divisor):0,
  carbs:daysWithData?round1(totals.carbs/divisor):0,
  fat:daysWithData?round1(totals.fat/divisor):0,
  meals:daysWithData?round1(totals.meals/divisor):0
 };
 const macroCalories={protein:totals.protein*4,carbs:totals.carbs*4,fat:totals.fat*9};
 const macroTotal=macroCalories.protein+macroCalories.carbs+macroCalories.fat;
 const proteinPct=macroTotal?Math.round(macroCalories.protein/macroTotal*100):0;
 const carbsPct=macroTotal?Math.round(macroCalories.carbs/macroTotal*100):0;
 const macroDistribution={protein:proteinPct,carbs:carbsPct,fat:macroTotal?Math.max(0,100-proteinPct-carbsPct):0};
 const maxCalories=Math.max(1,...recorded.map(day=>day.totals.calories));
 const maxProtein=Math.max(1,...recorded.map(day=>day.totals.protein));
 return {
  days:range,
  startDate:keys[0],
  endDate,
  daysWithData,
  mealsRecorded:totals.meals,
  coverage:Math.round((daysWithData/range)*100),
  totals:{calories:Math.round(totals.calories),protein:round1(totals.protein),carbs:round1(totals.carbs),fat:round1(totals.fat)},
  averages,
  macroDistribution,
  byDay:byDay.map(day=>({...day,
   caloriePercent:day.hasData?Math.max(3,Math.round((day.totals.calories/maxCalories)*100)):0,
   proteinPercent:day.hasData?Math.max(3,Math.round((day.totals.protein/maxProtein)*100)):0
  }))
 };
}

export function nutritionGoalProgress(averages={},value={}){
 const goals=normalizeNutritionGoals(value);
 const percent=(current,target)=>target?Math.max(0,Math.round((Number(current)||0)/target*100)):null;
 return {
  goals,
  configured:Object.values(goals).some(v=>v!==null),
  calories:percent(averages.calories,goals.calories),
  protein:percent(averages.protein,goals.protein),
  carbs:percent(averages.carbs,goals.carbs),
  fat:percent(averages.fat,goals.fat)
 };
}
