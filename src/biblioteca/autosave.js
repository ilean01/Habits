// Serialize field writes; a failed write is retained until an explicit retry.
export function createAutosave(save,report=()=>{}){
 let queue=Promise.resolve(),failed=new Map(),pending=0;
 function enqueue(key,value){pending++;report('Guardando…',false);queue=queue.then(async()=>{try{await save(key,value);failed.delete(key);}catch(error){failed.set(key,{value,error});}finally{pending--;report(failed.size?'No se guardó: '+[...failed.values()][0].error.message:pending?'Guardando…':'Guardado ✓',failed.size>0);}});return queue;}
 return {enqueue,async flush(){await queue;if(failed.size)throw new Error('Hay cambios sin guardar. Tocá Reintentar antes de cerrar.');},async retry(){for(const [key,{value}] of [...failed])enqueue(key,value);await queue;},async discard(){await queue;failed.clear();report('Cambios no guardados descartados.',false);},get pending(){return pending>0||failed.size>0;}};
}
