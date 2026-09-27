export function staleOrphanCoverPaths(objects,referencedPaths,{prefix='',now=Date.now(),minAgeMs=24*60*60*1000}={}){
 const refs=referencedPaths instanceof Set?referencedPaths:new Set(referencedPaths||[]);
 const base=prefix?`${String(prefix).replace(/\/$/,'')}/`:'';
 const result=[];
 for(const object of objects||[]){
  const name=String(object?.name||'').trim();
  if(!name)continue;
  const path=base+name;
  if(refs.has(path))continue;
  const stamp=Date.parse(object?.created_at||object?.updated_at||'');
  if(!Number.isFinite(stamp)||now-stamp<minAgeMs)continue;
  result.push(path);
 }
 return result;
}
