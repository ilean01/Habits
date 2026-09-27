export function createSnapshotCache(loader,{ttl=120000,now=()=>Date.now()}={}){
 if(typeof loader!=='function')throw new Error('La caché necesita una función de carga.');
 let value=null,loadedAt=0,pending=null,generation=0;
 const load=async({force=false}={})=>{
  const current=now();
  if(!force&&value&&current-loadedAt<ttl)return value;
  if(pending)return pending;
  const version=generation;
  const request=Promise.resolve().then(loader).then(next=>{if(version===generation){value=next;loadedAt=now();}return next;}).finally(()=>{if(pending===request)pending=null;});
  pending=request;
  return pending;
 };
 load.invalidate=()=>{generation++;value=null;loadedAt=0;pending=null;};
 load.peek=()=>value;
 return load;
}
