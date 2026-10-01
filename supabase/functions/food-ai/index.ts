import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Content-Type":"application/json",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const key=()=>Deno.env.get("GROQ_API_KEY")||"";
const model=()=>Deno.env.get("FOOD_GROQ_MODEL")||"qwen/qwen3.8-27b";
const clean=(value:unknown,max=120)=>String(value??"").trim().slice(0,max);
const number=(value:unknown,min=0,max=100000)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):0;};
const allowedUnit=new Set(["unit","g","kg","ml","l","cup","tbsp","pack","can","dozen"]);
const allowedMealType=new Set(["breakfast","morning","lunch","snack","dinner","other"]);
const validDate=(value:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||""))?String(value):"";

function pantryItems(raw:unknown){
 if(!Array.isArray(raw))return [];
 return raw.slice(0,100).map((item:any)=>({
  name:clean(item?.name,80),quantity:number(item?.quantity,0,100000),unit:allowedUnit.has(item?.unit)?item.unit:"unit",
  expiresAt:validDate(item?.expiresAt),status:["available","low","out"].includes(item?.status)?item.status:"available"
 })).filter(item=>item.name&&item.status!=="out");
}
function preferences(raw:any){
 const list=(value:unknown)=>Array.isArray(value)?value.slice(0,40).map(v=>clean(v,70)).filter(Boolean):[];
 return {
  mealType:allowedMealType.has(raw?.mealType)?raw.mealType:"any",
  maxMinutes:[15,30,60].includes(Number(raw?.maxMinutes))?Number(raw.maxMinutes):null,
  goal:["use-pantry","low-calorie","high-protein","budget","quick","use-soon"].includes(raw?.goal)?raw.goal:"use-pantry",
  dislikes:list(raw?.dislikes??raw?.disliked),avoid:list(raw?.avoid??raw?.excluded),notes:clean(raw?.notes,300)
 };
}
function existingPlans(raw:unknown){
 if(!Array.isArray(raw))return [];
 return raw.slice(0,30).map((item:any)=>({date:validDate(item?.date),mealType:allowedMealType.has(item?.mealType)?item.mealType:"",title:clean(item?.title,100)})).filter(x=>x.date&&x.mealType&&x.title);
}
function ingredientShape(value:any){return {
 name:clean(value?.name,90),quantity:number(value?.quantity,0,100000),unit:allowedUnit.has(value?.unit)?value.unit:"unit"
};}
function recipeShape(value:any){
 const ingredients=Array.isArray(value?.ingredients)?value.ingredients.slice(0,30).map(ingredientShape).filter(x=>x.name):[];
 const totals=value?.totals||{};
 return {
  name:clean(value?.name,100)||"Comida sugerida",description:clean(value?.description,240),servings:Math.max(1,Math.min(20,Math.round(number(value?.servings,1,20)||2))),
  minutes:Math.max(0,Math.min(300,Math.round(number(value?.minutes,0,300)))),ingredients,instructions:clean(value?.instructions,2000),
  tags:Array.isArray(value?.tags)?value.tags.slice(0,10).map((x:unknown)=>clean(x,40)).filter(Boolean):[],
  totals:{calories:Math.round(number(totals?.calories,0,10000)),protein:Math.round(number(totals?.protein,0,1000)*10)/10,carbs:Math.round(number(totals?.carbs,0,2000)*10)/10,fat:Math.round(number(totals?.fat,0,1000)*10)/10}
 };
}

async function groqJson(prompt:string,image=""){
 const apiKey=key();if(!apiKey)throw new Error("Groq no está configurado.");
 const content=image?[{type:"text",text:prompt},{type:"image_url",image_url:{url:image}}]:prompt;
 const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{
  method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
  body:JSON.stringify({model:model(),messages:[{role:"user",content}],response_format:{type:"json_object"},reasoning_effort:"none",temperature:0.3,max_completion_tokens:image?1200:2600})
 });
 const payload=await response.json();if(!response.ok)throw new Error(payload?.error?.message||"Groq no pudo completar la consulta.");
 const raw=String(payload?.choices?.[0]?.message?.content||"").trim();try{return JSON.parse(raw);}catch{throw new Error("Groq devolvió un formato inesperado.");}
}

async function photoMode(body:any){
 const image=String(body?.image||"");
 if(!image.startsWith("data:image/")||!image.includes(";base64,"))return json({error:"La foto no tiene un formato válido."},400);
 if(image.length>8500000)return json({error:"La foto es demasiado grande. Usá una imagen de hasta 6 MB."},413);
 const prompt="Analizá esta fotografía para un diario personal de alimentación. Identificá los alimentos visibles y estimá porción, gramos, calorías, proteína, carbohidratos y grasas por alimento. Una fotografía NO permite medir exactamente cantidades, aceite, salsas ni ingredientes ocultos: reflejá esa incertidumbre. No hagas afirmaciones médicas. Respondé solo JSON válido con esta estructura: {foods:[{name:string,portion:string,grams:number,calories:number,protein:number,carbs:number,fat:number,confidence:low|medium|high}],notes:string}. Máximo 12 alimentos.";
 try{return json(await groqJson(prompt,image));}catch(error){return json({error:error instanceof Error?error.message:"No se pudo consultar Groq."},502);}
}

async function suggestMode(body:any){
 const pantry=pantryItems(body?.ingredients),prefs=preferences(body?.preferences||{});
 if(!pantry.length)return json({error:"Agregá al menos un ingrediente disponible en tu despensa."},400);
 const prompt=`Sos el asistente de planificación de comidas de Habits. Proponé exactamente 5 comidas realistas usando principalmente la despensa indicada. Priorizá ingredientes próximos a vencer si tienen fecha. No inventes que el usuario tiene ingredientes que no aparecen: podés indicar faltantes dentro de ingredients. Respetá restricciones y preferencias. Las calorías y macros son estimaciones orientativas, no consejo médico.\n\nDESPENSA JSON:\n${JSON.stringify(pantry)}\n\nPREFERENCIAS JSON:\n${JSON.stringify(prefs)}\n\nRespondé SOLO JSON válido con: {"ideas":[{"name":string,"description":string,"servings":number,"minutes":number,"ingredients":[{"name":string,"quantity":number,"unit":"unit|g|kg|ml|l|cup|tbsp|pack|can|dozen"}],"instructions":string,"tags":[string],"totals":{"calories":number,"protein":number,"carbs":number,"fat":number}}]}. Cada idea debe incluir TODOS los ingredientes que realmente requiere, incluso los que falten, para que Habits pueda comparar contra la despensa. Máximo 30 ingredientes por receta.`;
 try{
  const parsed=await groqJson(prompt);const ideas=Array.isArray(parsed?.ideas)?parsed.ideas.slice(0,5).map(recipeShape):[];
  return json({ideas});
 }catch(error){return json({error:error instanceof Error?error.message:"No se pudo consultar Groq."},502);}
}

async function planWeekMode(body:any){
 const pantry=pantryItems(body?.ingredients),prefs=preferences(body?.preferences||{}),existing=existingPlans(body?.existingPlans),weekStart=validDate(body?.weekStart);
 const dates=Array.isArray(body?.dates)?body.dates.slice(0,7).map(validDate).filter(Boolean):[];
 if(!weekStart||dates.length!==7)return json({error:"La semana indicada no es válida."},400);
 const prompt=`Sos el planificador semanal de comidas de Habits. Armá una PROPUESTA que el usuario revisará antes de guardar. Generá almuerzo y cena para los 7 días (14 comidas) excepto espacios que ya estén ocupados en EXISTING_PLANS. Usá principalmente la despensa, variá los platos, evitá repeticiones innecesarias y respetá preferencias/restricciones. Priorizá lo próximo a vencer. Si faltan ingredientes, igual incluilos en la receta para que Habits pueda agregarlos al súper. No afirmes beneficios médicos. Nutrición = estimación orientativa.\n\nSEMANA:${weekStart}\nFECHAS:${JSON.stringify(dates)}\nDESPENSA:${JSON.stringify(pantry)}\nPREFERENCIAS:${JSON.stringify(prefs)}\nEXISTING_PLANS:${JSON.stringify(existing)}\n\nRespondé SOLO JSON válido con {"plan":[{"date":"YYYY-MM-DD","mealType":"lunch|dinner","name":string,"description":string,"servings":number,"minutes":number,"ingredients":[{"name":string,"quantity":number,"unit":"unit|g|kg|ml|l|cup|tbsp|pack|can|dozen"}],"instructions":string,"tags":[string],"totals":{"calories":number,"protein":number,"carbs":number,"fat":number}}]}. No uses fechas fuera de FECHAS y no reemplaces espacios ya ocupados.`;
 try{
  const parsed=await groqJson(prompt);const occupied=new Set(existing.map(x=>`${x.date}|${x.mealType}`));
  const plan=(Array.isArray(parsed?.plan)?parsed.plan:[]).slice(0,14).map((raw:any)=>({date:validDate(raw?.date),mealType:allowedMealType.has(raw?.mealType)?raw.mealType:"",...recipeShape(raw)})).filter((item:any)=>dates.includes(item.date)&&["lunch","dinner"].includes(item.mealType)&&!occupied.has(`${item.date}|${item.mealType}`));
  return json({plan});
 }catch(error){return json({error:error instanceof Error?error.message:"No se pudo consultar Groq."},502);}
}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Método no permitido"},405);
 let body:any;try{body=await req.json();}catch{return json({error:"Solicitud inválida"},400);}
 const mode=clean(body?.mode,30)||"photo";
 if(mode==="suggest")return suggestMode(body);
 if(mode==="plan-week")return planWeekMode(body);
 if(mode!=="photo")return json({error:"Modo no soportado."},400);
 return photoMode(body);
});
