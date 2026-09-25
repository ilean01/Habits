export const MEAL_TYPES={
 breakfast:'Desayuno',
 lunch:'Almuerzo',
 snack:'Merienda',
 dinner:'Cena',
 other:'Otro'
};

const round1=value=>Math.round((Number(value)||0)*10)/10;
const clean=value=>String(value??'').trim();

export function mealTypeLabel(type){return MEAL_TYPES[type]||MEAL_TYPES.other;}

export function defaultMealType(date=new Date()){
 const hour=date.getHours();
 if(hour<10)return 'breakfast';
 if(hour<15)return 'lunch';
 if(hour<19)return 'snack';
 return 'dinner';
}

export function inferMealType(meal={}){
 if(Object.hasOwn(MEAL_TYPES,meal.mealType))return meal.mealType;
 const label=clean(meal.label).toLocaleLowerCase('es');
 if(label.includes('desay'))return 'breakfast';
 if(label.includes('almuer'))return 'lunch';
 if(label.includes('meriend'))return 'snack';
 if(label.includes('cena'))return 'dinner';
 const at=meal.at?new Date(meal.at):null;
 return at&&!Number.isNaN(at.getTime())?defaultMealType(at):'other';
}

export function nutritionForDate(meals=[],date=''){
 const rows=meals.filter(m=>m?.date===date).map(m=>{const mealType=inferMealType(m);return {...m,mealType,mealTypeLabel:mealTypeLabel(mealType)};}).sort((a,b)=>String(a.at||'').localeCompare(String(b.at||'')));
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
