export const MEAL_SLOTS=[
 ['breakfast','Desayuno'],
 ['morning','Media mañana'],
 ['lunch','Almuerzo'],
 ['snack','Merienda'],
 ['dinner','Cena'],
 ['other','Otros']
];
export const PLAN_SLOTS=MEAL_SLOTS.filter(([id])=>id!=='other');
export const PANTRY_LOCATIONS=[['fridge','Heladera'],['freezer','Freezer'],['pantry','Alacena'],['other','Otro']];
export const FOOD_CATEGORIES=[['produce','Verdulería'],['meat','Carnicería'],['dairy','Lácteos'],['bakery','Panadería'],['grocery','Almacén'],['frozen','Congelados'],['cleaning','Limpieza'],['hygiene','Higiene'],['home','Hogar'],['other','Otros']];
export const SHOPPING_STATUSES={pending:'Pendiente',cart:'En el carrito',stored:'Ya guardado'};

const aliases=new Map(Object.entries({
 'papas':'papa','patatas':'papa','tomates':'tomate','huevos':'huevo','cebollas':'cebolla','zanahorias':'zanahoria',
 'morrónes':'morrón','morrones':'morrón','lentejas':'lenteja','fideos':'fideo','chorizos':'chorizo','manzanas':'manzana',
 'bananas':'banana','plátanos':'plátano','naranjas':'naranja','limones':'limón','pechugas':'pechuga','milanesas':'milanesa'
}));
const clean=value=>String(value??'').trim().replace(/\s+/g,' ');
export const round1=value=>Math.round((Number(value)||0)*10)/10;
export function normalizeIngredientName(value){
 const original=clean(value).toLocaleLowerCase('es').replace(/[()]/g,' ');
 const normalized=original.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9ñ\s-]/g,' ').replace(/\s+/g,' ').trim();
 if(!normalized)return '';
 if(aliases.has(original))return aliases.get(original).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(aliases.has(normalized))return aliases.get(normalized).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(normalized.length>4&&normalized.endsWith('s')&&!normalized.endsWith('ss'))return normalized.slice(0,-1);
 return normalized;
}
export function normalizeUnit(value){
 const unit=clean(value).toLocaleLowerCase('es').replace(/\./g,'');
 const map={
  kg:'kg',kilo:'kg',kilos:'kg',kilogramo:'kg',kilogramos:'kg',
  g:'g',gr:'g',gramo:'g',gramos:'g',
  l:'l',lt:'l',litro:'l',litros:'l',
  ml:'ml',mililitro:'ml',mililitros:'ml',
  unidad:'unit',unidades:'unit',u:'unit',pieza:'unit',piezas:'unit',
  docena:'dozen',docenas:'dozen',
  paquete:'pack',paquetes:'pack',
  lata:'can',latas:'can',
  taza:'cup',tazas:'cup',
  cucharada:'tbsp',cucharadas:'tbsp',cda:'tbsp',
  cucharadita:'tsp',cucharaditas:'tsp',cdta:'tsp',
  planta:'plant',plantas:'plant'
 };
 return map[unit]||unit||'unit';
}
export function displayUnit(unit){return ({unit:'u',dozen:'docena',pack:'paquete',can:'lata',cup:'taza',tbsp:'cda',tsp:'cdta',plant:'planta'})[normalizeUnit(unit)]||normalizeUnit(unit);}
export function unitFamily(unit){
 const u=normalizeUnit(unit);
 if(['kg','g'].includes(u))return 'mass';
 if(['l','ml'].includes(u))return 'volume';
 if(['unit','dozen'].includes(u))return 'count';
 return `exact:${u}`;
}
export function toBaseQuantity(quantity,unit){
 const q=Number(quantity);if(!Number.isFinite(q))return null;
 const u=normalizeUnit(unit);
 if(u==='kg')return {quantity:q*1000,unit:'g',family:'mass'};
 if(u==='g')return {quantity:q,unit:'g',family:'mass'};
 if(u==='l')return {quantity:q*1000,unit:'ml',family:'volume'};
 if(u==='ml')return {quantity:q,unit:'ml',family:'volume'};
 if(u==='dozen')return {quantity:q*12,unit:'unit',family:'count'};
 if(u==='unit')return {quantity:q,unit:'unit',family:'count'};
 return {quantity:q,unit:u,family:`exact:${u}`};
}
export function fromBaseQuantity(quantity,family,preferredUnit=''){
 const q=Math.max(0,Number(quantity)||0),preferred=normalizeUnit(preferredUnit);
 if(family==='mass'){
  if(preferred==='kg'||q>=1000)return {quantity:round1(q/1000),unit:'kg'};
  return {quantity:round1(q),unit:'g'};
 }
 if(family==='volume'){
  if(preferred==='l'||q>=1000)return {quantity:round1(q/1000),unit:'l'};
  return {quantity:round1(q),unit:'ml'};
 }
 if(family==='count'){
  if(preferred==='dozen'&&q%12===0)return {quantity:round1(q/12),unit:'dozen'};
  return {quantity:round1(q),unit:'unit'};
 }
 return {quantity:round1(q),unit:preferred||String(family).replace(/^exact:/,'')||'unit'};
}
export function normalizeIngredient(value={}){
 const name=clean(value.name||value.ingredient||value.title);
 const quantityRaw=value.quantity??value.qty??value.amount;
 const quantity=quantityRaw===''||quantityRaw==null?null:Math.max(0,Number(quantityRaw)||0);
 const unit=normalizeUnit(value.unit||'unit');
 return {name,normalizedName:normalizeIngredientName(name),quantity,unit,category:value.category||guessCategory(name)};
}
export function guessCategory(name=''){
 const n=normalizeIngredientName(name);
 const lists={
  produce:['papa','tomate','cebolla','zanahoria','lechuga','morron','espinaca','zapallo','calabaza','pepino','limon','naranja','manzana','banana','ajo','perejil','cilantro','brocoli','coliflor'],
  meat:['pollo','carne','milanesa','pechuga','cerdo','pescado','chorizo','jamon'],
  dairy:['leche','queso','yogur','manteca','crema'],
  bakery:['pan','tortilla','tapa de empanada'],
  grocery:['arroz','fideo','lenteja','harina','aceite','sal','azucar','tomate en lata','atun'],
  frozen:['verdura congelada','helado']
 };
 for(const [category,items] of Object.entries(lists))if(items.some(item=>n===item||n.includes(item)))return category;
 return 'other';
}
export function mondayOf(dateKey){
 const [y,m,d]=String(dateKey||'').split('-').map(Number),date=new Date(y,m-1,d);
 if(Number.isNaN(date.getTime()))return '';
 const weekday=(date.getDay()+6)%7;date.setDate(date.getDate()-weekday);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function addDateDays(key,delta){
 const [y,m,d]=String(key||'').split('-').map(Number),date=new Date(y,m-1,d);date.setDate(date.getDate()+Number(delta||0));
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function weekDateKeys(start){return Array.from({length:7},(_,i)=>addDateDays(start,i));}
export function planItemsForWeek(items=[],weekStart=''){const keys=new Set(weekDateKeys(weekStart));return items.filter(item=>keys.has(item.date));}
export function pantryStatus(item={}){
 if(item.status==='out')return 'out';if(item.status==='low')return 'low';
 const q=Number(item.quantity);if(Number.isFinite(q)&&q<=0)return 'out';
 if(Number.isFinite(q)&&q>0&&unitFamily(item.unit)==='count'&&q<=2)return 'low';
 return 'available';
}
export function daysUntil(dateKey,todayKey){
 if(!dateKey||!todayKey)return null;
 const a=new Date(`${todayKey}T12:00:00`),b=new Date(`${dateKey}T12:00:00`);if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime()))return null;
 return Math.round((b-a)/86400000);
}
export function pantryAvailability(pantryItems=[],ingredient={}){
 const target=normalizeIngredient(ingredient);if(!target.normalizedName)return {covered:false,available:0,needed:target.quantity,unit:target.unit};
 const candidates=pantryItems.filter(item=>pantryStatus(item)!=='out'&&normalizeIngredientName(item.name)===target.normalizedName);
 if(!candidates.length)return {covered:false,available:0,needed:target.quantity,unit:target.unit};
 if(target.quantity==null)return {covered:true,available:null,needed:null,unit:target.unit};
 const baseNeed=toBaseQuantity(target.quantity,target.unit);if(!baseNeed)return {covered:true,available:null,needed:target.quantity,unit:target.unit};
 let available=0;
 for(const item of candidates){const base=toBaseQuantity(item.quantity,item.unit);if(base&&base.family===baseNeed.family)available+=base.quantity;}
 return {covered:available>=baseNeed.quantity,available,needed:baseNeed.quantity,unit:baseNeed.unit,family:baseNeed.family};
}
export function missingIngredients(ingredients=[],pantryItems=[]){
 return ingredients.map(normalizeIngredient).filter(x=>x.name).filter(ingredient=>!pantryAvailability(pantryItems,ingredient).covered);
}
export function ingredientMatchSummary(ingredients=[],pantryItems=[]){
 const list=ingredients.map(normalizeIngredient).filter(x=>x.name),missing=missingIngredients(list,pantryItems);return {total:list.length,available:list.length-missing.length,missing};
}
function neededGroups(planItems=[]){
 const groups=new Map();
 for(const plan of planItems){for(const raw of Array.isArray(plan.ingredients)?plan.ingredients:[]){
  const ingredient=normalizeIngredient(raw);if(!ingredient.normalizedName)continue;
  const base=ingredient.quantity==null?null:toBaseQuantity(ingredient.quantity,ingredient.unit),family=base?.family||unitFamily(ingredient.unit),key=`${ingredient.normalizedName}|${family}`;
  const current=groups.get(key)||{name:ingredient.name,normalizedName:ingredient.normalizedName,quantity:0,unknownQuantity:false,family,unit:ingredient.unit,category:ingredient.category,sourcePlanIds:[]};
  if(base)current.quantity+=base.quantity;else current.unknownQuantity=true;
  current.sourcePlanIds.push(plan.id);groups.set(key,current);
 }}
 return groups;
}
export function buildShoppingNeeds(planItems=[],pantryItems=[]){
 const groups=neededGroups(planItems),result=[];
 for(const group of groups.values()){
  let pantryBase=0,hasAny=false;
  for(const item of pantryItems){
   if(pantryStatus(item)==='out'||normalizeIngredientName(item.name)!==group.normalizedName)continue;
   hasAny=true;const base=toBaseQuantity(item.quantity,item.unit);if(base&&base.family===group.family)pantryBase+=base.quantity;
  }
  if(group.unknownQuantity){if(!hasAny)result.push({...group,quantity:null,unit:group.unit});continue;}
  const remaining=Math.max(0,group.quantity-pantryBase);if(remaining<=0)continue;
  const pretty=fromBaseQuantity(remaining,group.family,group.unit);
  result.push({...group,quantity:pretty.quantity,unit:pretty.unit});
 }
 return result.sort((a,b)=>String(a.category).localeCompare(String(b.category))||a.name.localeCompare(b.name,'es'));
}
export function formatQuantity(quantity,unit){
 if(quantity==null||quantity==='')return '';
 const q=Number(quantity);return `${Number.isInteger(q)?q:round1(q)} ${displayUnit(unit)}`.trim();
}
