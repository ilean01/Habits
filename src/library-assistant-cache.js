export function createSnapshotCache(loader,{ttl=120000,now=()=>Date.now()}={}){
 if(typeof loader!=='function')throw new Error('La caché necesita una función de carga.');
 let value=null,loadedAt=0,pending=null;
 const load=async({force=false}={})=>{
  const current=now();
  if(!force&&value&&current-loadedAt<ttl)return value;
  if(pending)return pending;
  pending=Promise.resolve().then(loader).then(next=>{value=next;loadedAt=now();return value;}).finally(()=>{pending=null;});
  return pending;
 };
 load.invalidate=()=>{value=null;loadedAt=0;};
 load.peek=()=>value;
 return load;
}
