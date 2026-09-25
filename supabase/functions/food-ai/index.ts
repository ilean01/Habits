import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Content-Type":"application/json",
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Método no permitido"},405);
 let body:any;try{body=await req.json();}catch{return json({error:"Solicitud inválida"},400);}
 const image=String(body?.image||"");
 if(!image.startsWith("data:image/")||!image.includes(";base64,"))return json({error:"La foto no tiene un formato válido."},400);
 if(image.length>8500000)return json({error:"La foto es demasiado grande. Usá una imagen de hasta 6 MB."},413);
 const key=Deno.env.get("GROQ_API_KEY")||"";
 if(!key)return json({error:"Groq no está configurado.",code:"not_configured"},503);
 const model=Deno.env.get("FOOD_GROQ_MODEL")||"qwen/qwen3.8-27b";
 const prompt="Analizá esta fotografía para un diario personal de alimentación. Identificá los alimentos visibles y estimá porción, gramos, calorías, proteína, carbohidratos y grasas por alimento. Una fotografía NO permite medir exactamente cantidades, aceite, salsas ni ingredientes ocultos: reflejá esa incertidumbre. No hagas afirmaciones médicas. Respondé solo JSON válido con esta estructura: {foods:[{name:string,portion:string,grams:number,calories:number,protein:number,carbs:number,fat:number,confidence:low|medium|high}],notes:string}. Máximo 12 alimentos.";
 try{
  const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{
   method:"POST",
   headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
   body:JSON.stringify({
    model,
    messages:[{role:"user",content:[{type:"text",text:prompt},{type:"image_url",image_url:{url:image}}]}],
    response_format:{type:"json_object"},
    reasoning_effort:"none",
    temperature:0.3,
    max_completion_tokens:1200
   })
  });
  const payload=await response.json();
  if(!response.ok)return json({error:payload?.error?.message||"Groq no pudo analizar la foto."},502);
  const raw=String(payload?.choices?.[0]?.message?.content||"").trim();
  let parsed:any;try{parsed=JSON.parse(raw);}catch{return json({error:"Groq devolvió un formato inesperado."},502);}
  return json(parsed);
 }catch(error){return json({error:error instanceof Error?error.message:"No se pudo consultar Groq."},502);}
});
