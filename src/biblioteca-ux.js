import './biblioteca-habits.css';
import {supabase} from './biblioteca/client.js';

const modal=document.querySelector('#library-modal');

async function syncHabitsAppearance(){
 try{
  const {data:{user}}=await supabase.auth.getUser();if(!user)return;
  const {data,error}=await supabase.from('entries').select('data').eq('user_id',user.id).eq('kind','settings').eq('deleted',false).limit(1).maybeSingle();
  if(error||!data?.data)return;
  const settings=data.data,theme=settings.theme||'light';
  document.documentElement.dataset.theme=theme;
  document.documentElement.classList.toggle('large',!!settings.large);
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'#171d18':'#6f7f64';
 }catch{}
}

function dirty(){return modal?.dataset.dirty==='1';}
function confirmDiscard(){return !dirty()||confirm('Tenés cambios sin guardar. ¿Descartarlos?');}

document.addEventListener('input',e=>{if(modal?.contains(e.target)&&e.target.closest('form'))modal.dataset.dirty='1';},true);
document.addEventListener('change',e=>{if(modal?.contains(e.target)&&e.target.closest('form'))modal.dataset.dirty='1';},true);
document.addEventListener('submit',e=>{if(modal?.contains(e.target))modal.dataset.submitting='1';},true);
document.addEventListener('click',e=>{
 const close=e.target.closest?.('#library-modal [data-action="close"]');if(!close)return;
 if(!confirmDiscard()){e.preventDefault();e.stopImmediatePropagation();return;}
 modal.dataset.dirty='0';
},true);
modal?.addEventListener('cancel',e=>{if(!confirmDiscard()){e.preventDefault();return;}modal.dataset.dirty='0';});
modal?.addEventListener('close',()=>{modal.dataset.dirty='0';modal.dataset.submitting='0';});

void syncHabitsAppearance();
supabase.auth.onAuthStateChange(()=>{void syncHabitsAppearance();});
