import {openDB} from 'idb';

const DB_NAME='habits-cache-v2';
const DB_VERSION=1;
let dbPromise;

function database(){
 if(!dbPromise)dbPromise=openDB(DB_NAME,DB_VERSION,{upgrade(db){
  for(const name of ['records','pending','conflicts']){
   if(!db.objectStoreNames.contains(name)){
    const store=db.createObjectStore(name,{keyPath:['owner','id']});
    store.createIndex('by-owner','owner');
   }
  }
  if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'owner'});
 }});
 return dbPromise;
}

const cleanRows=rows=>Object.fromEntries(rows.map(row=>[row.id,row.value]));

export async function loadOwner(owner){
 const db=await database();
 const tx=db.transaction(['records','pending','conflicts','meta'],'readonly');
 const [records,pending,conflicts,meta]=await Promise.all([
  tx.objectStore('records').index('by-owner').getAll(owner),
  tx.objectStore('pending').index('by-owner').getAll(owner),
  tx.objectStore('conflicts').index('by-owner').getAll(owner),
  tx.objectStore('meta').get(owner)
 ]);
 await tx.done;
 return {records:cleanRows(records),pending:cleanRows(pending),conflicts:cleanRows(conflicts),meta:meta||{owner,lastSync:null}};
}

async function putValue(store,owner,id,value){const db=await database();await db.put(store,{owner,id,value});}
async function deleteValue(store,owner,id){const db=await database();await db.delete(store,[owner,id]);}

export const saveRecord=(owner,id,value)=>putValue('records',owner,id,value);
export const removeRecord=(owner,id)=>deleteValue('records',owner,id);
export const savePending=(owner,id,value)=>putValue('pending',owner,id,value);
export const saveConflict=(owner,id,value)=>putValue('conflicts',owner,id,value);
export const removePending=(owner,id)=>deleteValue('pending',owner,id);
export const removeConflict=(owner,id)=>deleteValue('conflicts',owner,id);

export async function saveMeta(owner,patch){
 const db=await database();const before=await db.get('meta',owner)||{owner,lastSync:null};
 const next={...before,...patch,owner};await db.put('meta',next);return next;
}

export async function clearOwner(owner){
 const db=await database();
 const tx=db.transaction(['records','pending','conflicts','meta'],'readwrite');
 for(const name of ['records','pending','conflicts']){
  const store=tx.objectStore(name),keys=await store.index('by-owner').getAllKeys(owner);
  for(const key of keys)await store.delete(key);
 }
 await tx.objectStore('meta').delete(owner);await tx.done;
}

export async function migrateLegacyLocalStorage(owner){
 if(typeof localStorage==='undefined')return false;
 const marker=`habits:v2:migrated:${owner}`;if(localStorage.getItem(marker)==='1')return false;
 const key=`habits:v1:${owner}`;let legacy=null;
 try{legacy=JSON.parse(localStorage.getItem(key)||'null');}catch{}
 if(!legacy){localStorage.setItem(marker,'1');return false;}
 const db=await database();const tx=db.transaction(['records','pending','conflicts'],'readwrite');
 for(const [id,value] of Object.entries(legacy.records||{}))await tx.objectStore('records').put({owner,id,value});
 for(const [id,value] of Object.entries(legacy.pending||{}))await tx.objectStore('pending').put({owner,id,value});
 for(const [id,value] of Object.entries(legacy.conflicts||{}))await tx.objectStore('conflicts').put({owner,id,value});
 await tx.done;localStorage.setItem(marker,'1');return true;
}

export async function resetLocalCacheForTests(){
 if(dbPromise){const db=await dbPromise;db.close();dbPromise=null;}
 await new Promise((resolve,reject)=>{const req=indexedDB.deleteDatabase(DB_NAME);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);req.onblocked=()=>resolve();});
}
