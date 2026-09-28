import {createFullBackup} from './media-backup.js';
import {loadAll} from './biblioteca/data.js';
import {supabase as librarySupabase,currentUser,libraryOwner} from './biblioteca/client.js';

const blobToBase64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('No se pudo leer un archivo de Biblioteca.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.readAsDataURL(blob);});
const storedCover=path=>path&&!/^https?:\/\//i.test(path);

async function libraryBackup(){
 if(!currentUser||!libraryOwner)return null;
 const snapshot=await loadAll({force:true});
 const coverPaths=[...new Set((snapshot.books||[]).map(book=>String(book.portada||'').trim()).filter(storedCover))];
 const covers=[];
 for(const path of coverPaths){
  const {data,error}=await librarySupabase.storage.from('biblioteca-portadas').download(path);
  if(error||!data)continue;
  covers.push({path,contentType:data.type||'image/jpeg',size:data.size,data:await blobToBase64(data)});
 }
 return {version:1,ownerId:libraryOwner,exportedAt:new Date().toISOString(),snapshot,covers};
}

export async function createCompleteBackup(){
 const habits=await createFullBackup();
 let library=null,libraryError='';
 try{library=await libraryBackup();}catch(error){libraryError=String(error?.message||error);}
 return {...habits,version:3,completeExport:true,library,libraryError:libraryError||undefined};
}

export async function downloadCompleteBackup(filename){
 const payload=await createCompleteBackup();
 const blob=new Blob([JSON.stringify(payload)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
 return {photos:payload.media?.length||0,libraryBooks:payload.library?.snapshot?.books?.length||0,libraryCovers:payload.library?.covers?.length||0,size:blob.size,libraryIncluded:!!payload.library};
}
