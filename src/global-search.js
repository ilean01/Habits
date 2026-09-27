import {supabase,sessionAndAccess,libraryOwner} from './biblioteca/client.js';

const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
const LOCAL_KINDS={
 area:{label:'Área',fields:['name']},
 habit:{label:'Hábito',fields:['name','note']},
 event:{label:'Evento',fields:['name','location','note','date']},
 task:{label:'Tarea',fields:['name','note','due']},
 project:{label:'Proyecto',fields:['name','note','due']},
 quote:{label:'Cita',fields:['text','author','bookTitle']},
 journal:{label:'Diario',fields:['text','date']},
 word:{label:'Vocabulario',fields:['name','translation','example']}
};

export function searchLocalSpace(query,{records,isDiaryEntry=()=>true,limit=24}={}){
 const needle=fold(query).trim();
 if(!needle||typeof records!=='function')return [];
 const out=[];
 for(const [kind,meta] of Object.entries(LOCAL_KINDS)){
  for(const row of records(kind)||[]){
   if(kind==='project'&&row.category==='subject')continue;
   if(kind==='journal'&&!isDiaryEntry(row)&&!row.achievement)continue;
   const hay=fold(meta.fields.map(field=>row[field]).join(' '));
   if(!hay.includes(needle))continue;
   const title=row.name||row.title||row.text?.slice(0,110)||meta.label;
   const subtitle=kind==='journal'?(row.achievement?'Logro':row.date||'Diario'):kind==='quote'?(row.author||row.bookTitle||'Cita guardada'):row.note||row.location||row.translation||row.due||'';
   out.push({kind,id:row.id,title,subtitle,label:meta.label});
   if(out.length>=limit)return out;
  }
 }
 return out;
}

function safeTerm(query){return String(query||'').trim().replace(/[^\p{L}\p{N}\s.'-]/gu,' ').replace(/\s+/g,' ').slice(0,120);}

export async function searchLibraryCatalog(query,{limit=10}={}){
 const term=safeTerm(query);
 if(term.length<2)return [];
 try{
  const access=await sessionAndAccess();
  if(!access.allowed||!libraryOwner)return [];
  const pattern=`%${term.replace(/[%_]/g,'')}%`;
  const {data,error}=await supabase.from('biblioteca_libros')
   .select('id,titulo,autor,dewey,isbn,codigo_p,item')
   .eq('owner_id',libraryOwner)
   .eq('eliminado',false)
   .or(`titulo.ilike.${pattern},autor.ilike.${pattern},dewey.ilike.${pattern},isbn.ilike.${pattern},codigo_p.ilike.${pattern}`)
   .limit(Math.max(1,Math.min(20,Number(limit)||10)));
  if(error)throw error;
  return (data||[]).map(book=>({kind:'library-book',id:String(book.id),title:book.titulo||'Libro',subtitle:[book.autor,book.dewey,book.codigo_p&&book.item?`${book.codigo_p}-${book.item}`:book.codigo_p].filter(Boolean).join(' · '),label:'Libro'}));
 }catch(error){
  console.warn('No se pudo buscar en Biblioteca:',error?.message||error);
  return [];
 }
}
