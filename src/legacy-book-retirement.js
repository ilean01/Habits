const withoutId=record=>{const {id,...data}=record||{};return data;};

export function legacyBookRetirementPlan({books=[],archives=[],readings=[],quotes=[],timers=[],settings={}}={}){
 const legacy=new Map(books.map(book=>[book.id,book]));
 const snapshot=(record,book)=>({...withoutId(record),bookId:'',bookTitle:record.bookTitle||book.title||'',bookAuthor:record.bookAuthor||book.author||'',legacyBookId:record.legacyBookId||book.id});
 const readingUpdates=readings.filter(record=>legacy.has(record.bookId)).map(record=>({id:record.id,data:snapshot(record,legacy.get(record.bookId))}));
 const quoteUpdates=quotes.filter(record=>legacy.has(record.bookId)).map(record=>({id:record.id,data:snapshot(record,legacy.get(record.bookId))}));
 const timerUpdates=timers.filter(record=>legacy.has(record.bookId)).map(record=>({id:record.id,data:{...snapshot(record,legacy.get(record.bookId)),legacyBookTitle:record.legacyBookTitle||legacy.get(record.bookId)?.title||''}}));
 const archiveById=new Map(archives.map(book=>[book.id,book]));
 books.forEach(book=>archiveById.set(book.id,book));
 const archived=[...archiveById.values()];
 const finished=archived.filter(book=>book.status==='finished').length;
 const nextSettings={...withoutId(settings),legacyBookArchiveCount:archived.length,legacyFinishedBooks:finished,legacyBooksRetiredAt:settings.legacyBooksRetiredAt||new Date().toISOString()};
 const bookArchives=books.map(book=>({id:book.id,data:{...withoutId(book),legacyRetired:true,legacyRetiredAt:book.legacyRetiredAt||nextSettings.legacyBooksRetiredAt}}));
 return {readingUpdates,quoteUpdates,timerUpdates,bookArchives,settings:nextSettings,retired:books.length};
}

let retiring=false;
export function retireLegacyBooks(db){
 if(retiring)return 0;
 const books=db.records('book');
 if(!books.length)return 0;
 retiring=true;
 try{
  const settings=db.records('settings')[0]||{id:'settings'};
  const plan=legacyBookRetirementPlan({books,archives:db.records('legacyBookArchive'),readings:db.records('reading'),quotes:db.records('quote'),timers:db.records('timer'),settings});
  plan.readingUpdates.forEach(({id,data})=>db.put('reading',data,id));
  plan.quoteUpdates.forEach(({id,data})=>db.put('quote',data,id));
  plan.timerUpdates.forEach(({id,data})=>db.put('timer',data,id));
  plan.bookArchives.forEach(({id,data})=>db.put('legacyBookArchive',data,id));
  db.put('settings',plan.settings,settings.id||'settings');
  return plan.retired;
 }finally{retiring=false;}
}
