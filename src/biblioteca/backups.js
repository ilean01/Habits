import {supabase,currentUser,libraryOwner} from './client.js';
import {today} from './utils.js';

export async function createDailyBackup(snapshot){
  if(!currentUser)return;
  const name=`biblioteca-${today()}.json`;
  const {data:list,error:listError}=await supabase.storage.from('biblioteca-backups').list(libraryOwner,{limit:100,sortBy:{column:'name',order:'desc'}});
  if(listError)throw listError;
  if(!(list||[]).some(x=>x.name===name)){
    const blob=new Blob([JSON.stringify({version:18,createdAt:new Date().toISOString(),...snapshot},null,2)],{type:'application/json'});
    const {error}=await supabase.storage.from('biblioteca-backups').upload(`${libraryOwner}/${name}`,blob,{upsert:false,contentType:'application/json'});if(error)throw error;
  }
  const {data:fresh,error:freshError}=await supabase.storage.from('biblioteca-backups').list(libraryOwner,{limit:100,sortBy:{column:'name',order:'desc'}});
  if(freshError)throw freshError;
  const sorted=(fresh||[]).filter(x=>/^biblioteca-\d{4}-\d{2}-\d{2}\.json$/.test(x.name)).sort((a,b)=>b.name.localeCompare(a.name));
  if(sorted.length>10){const {error}=await supabase.storage.from('biblioteca-backups').remove(sorted.slice(10).map(x=>`${libraryOwner}/${x.name}`));if(error)throw error}
}

export async function latestBackup(){
  const {data,error}=await supabase.storage.from('biblioteca-backups').list(libraryOwner,{limit:20,sortBy:{column:'name',order:'desc'}});if(error)throw error;
  const file=(data||[]).find(x=>/^biblioteca-\d{4}-\d{2}-\d{2}\.json$/.test(x.name));if(!file)return null;
  const {data:blob,error:downloadError}=await supabase.storage.from('biblioteca-backups').download(`${libraryOwner}/${file.name}`);if(downloadError)throw downloadError;
  return {name:file.name,blob};
}
