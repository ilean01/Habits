import {supabase,sessionAndAccess,libraryOwner} from './biblioteca/client.js';

const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
export const SEARCH_KIND_OPTIONS=[
 ['','Todo'],['task','Tareas'],['habit','Hábitos'],['event','Eventos'],['project','Proyectos'],['journal','Diario'],['quote','Citas'],['word','Vocabulario'],['area','Áreas'],['library-book','Libros']
];
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

const cleanKinds=value=>Array.isArray(value)?value.filter(Boolean):value?[value]:[];
const rowDate=(kind,row)=>String(kind==='event'?row.date:kind==='task'||kind==='project'?row.due:kind==='journal'?row.date:'').slice(0,10);
function rowState(kind,row,today){
 if(kind==='task')return row.done?'completed':row.due&&row.due>today?'scheduled':'pending';
 if(kind==='event')return row.date&&row.date>today?'scheduled':'pending';
 if(kind==='project')return row.done?'completed':row.due&&row.due>today?'scheduled':'pending';
 if(kind==='habit')return row.archived?'completed':'active';
 return '';
}
const activeFilters=filters=>!!(cleanKinds(filters?.kinds).length||filters?.area||filters?.status||filters?.dateFrom||filters?.dateTo);

export function searchLocalSpace(query,{records,isDiaryEntry=()=>true,limit=60,filters={},today=new Date().toISOString().slice(0,10)}={}){
 const needle=fold(query).trim(),tokens=needle.split(/\s+/).filter(Boolean),kinds=cleanKinds(filters.kinds);
 if((!needle&&!activeFilters(filters))||typeof records!=='function')return [];
 const out=[];
 for(const [kind,meta] of Object.entries(LOCAL_KINDS)){
  if(kinds.length&&!kinds.includes(kind))continue;
  for(const row of records(kind)||[]){
   if(kind==='project'&&row.category==='subject')continue;
   if(kind==='journal'&&!isDiaryEntry(row)&&!row.achievement)continue;
   if(filters.area&&row.area!==filters.area)continue;
   const date=rowDate(kind,row),state=rowState(kind,row,today);
   if(filters.status&&state!==filters.status)continue;
   if(filters.dateFrom&&(!date||date<filters.dateFrom))continue;
   if(filters.dateTo&&(!date||date>filters.dateTo))continue;
   const title=row.name||row.title||row.text?.slice(0,110)||meta.label;
   const hay=fold([title,...meta.fields.map(field=>row[field])].join(' '));
   if(tokens.length&&!tokens.every(token=>hay.includes(token)))continue;
   const foldedTitle=fold(title),score=!needle?0:foldedTitle===needle?100:foldedTitle.startsWith(needle)?70:foldedTitle.includes(needle)?50:tokens.reduce((n,t)=>n+(foldedTitle.includes(t)?12:4),0);
   const subtitle=kind==='journal'?(row.achievement?'Logro':row.date||'Diario'):kind==='quote'?(row.author||row.bookTitle||'Cita guardada'):row.note||row.location||row.translation||row.due||'';
   out.push({kind,id:row.id,title,subtitle,label:meta.label,date,state,area:row.area||'',score});
  }
 }
 return sortSearchResults(out,filters.sort||'relevance').slice(0,Math.max(1,Number(limit)||60));
}

export function sortSearchResults(rows,sort='relevance'){
 const list=[...(rows||[])];
 if(sort==='az')return list.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'es',{sensitivity:'base'}));
 if(sort==='recent')return list.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||Number(b.score||0)-Number(a.score||0));
 if(sort==='upcoming')return list.sort((a,b)=>String(a.date||'9999-99-99').localeCompare(String(b.date||'9999-99-99'))||Number(b.score||0)-Number(a.score||0));
 return list.sort((a,b)=>Number(b.score||0)-Number(a.score||0)||String(a.title||'').localeCompare(String(b.title||''),'es',{sensitivity:'base'}));
}

function safeTerm(query){return String(query||'').trim().replace(/[^\p{L}\p{N}\s.'-]/gu,' ').replace(/\s+/g,' ').slice(0,120);}

export async function searchLibraryCatalog(query,{limit=20}={}){
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
   .limit(Math.max(1,Math.min(40,Number(limit)||20)));
  if(error)throw error;
  return (data||[]).map(book=>({kind:'library-book',id:String(book.id),title:book.titulo||'Libro',subtitle:[book.autor,book.dewey,book.codigo_p&&book.item?`${book.codigo_p}-${book.item}`:book.codigo_p].filter(Boolean).join(' · '),label:'Libro',date:'',state:'',area:'',score:10}));
 }catch(error){
  console.warn('No se pudo buscar en Biblioteca:',error?.message||error);
  return [];
 }
}
