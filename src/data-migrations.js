export const CURRENT_DATA_VERSION=2;

const withoutId=record=>{const {id,...data}=record||{};return data;};

function retireLegacyBooks(db,settings){
 const books=db.records('book');if(!books.length)return settings;
 const byId=new Map(books.map(book=>[book.id,book]));
 for(const reading of db.records('reading'))if(byId.has(reading.bookId)){const book=byId.get(reading.bookId);db.put('reading',{...withoutId(reading),bookId:'',bookTitle:reading.bookTitle||book.title||'',bookAuthor:reading.bookAuthor||book.author||'',legacyBookId:book.id},reading.id);}
 for(const quote of db.records('quote'))if(byId.has(quote.bookId)){const book=byId.get(quote.bookId);db.put('quote',{...withoutId(quote),bookId:'',bookTitle:quote.bookTitle||book.title||'',bookAuthor:quote.bookAuthor||book.author||'',legacyBookId:book.id},quote.id);}
 for(const timer of db.records('timer'))if(byId.has(timer.bookId)){const book=byId.get(timer.bookId);db.put('timer',{...withoutId(timer),bookId:'',bookTitle:timer.bookTitle||book.title||'',bookAuthor:timer.bookAuthor||book.author||'',legacyBookId:book.id,legacyBookTitle:timer.legacyBookTitle||book.title||''},timer.id);}
 const archived=[...(Array.isArray(settings.legacyBookArchive)?settings.legacyBookArchive:[]),...books.map(book=>({...withoutId(book),legacyRetired:true}))];
 for(const book of books)db.remove(book.id);
 return {...settings,legacyBookArchive:archived.slice(-500),legacyBookArchiveCount:archived.length,legacyFinishedBooks:archived.filter(book=>book.status==='finished').length,legacyBooksRetiredAt:settings.legacyBooksRetiredAt||new Date().toISOString()};
}

export function migrationPlan(fromVersion=0){
 const from=Math.max(0,Number(fromVersion)||0),steps=[];
 if(from<1)steps.push(1);
 if(from<2)steps.push(2);
 return steps;
}

export function runDataMigrations(db){
 let settings=db.records('settings')[0]||{},version=Math.max(0,Number(settings.dataVersion)||0),changed=false;
 for(const step of migrationPlan(version)){
  if(step===1){settings={...settings,dashboard:settings.dashboard||undefined};}
  if(step===2){settings=retireLegacyBooks(db,settings);}
  version=step;changed=true;
 }
 if(changed||Number(settings.dataVersion)!==CURRENT_DATA_VERSION)db.put('settings',{...withoutId(settings),dataVersion:CURRENT_DATA_VERSION,dataMigratedAt:new Date().toISOString()},settings.id||'settings');
 return {from:Number(settings.dataVersion)||0,to:CURRENT_DATA_VERSION,steps:migrationPlan(Number(settings.dataVersion)||0)};
}
