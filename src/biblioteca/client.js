import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';

const url=import.meta.env.VITE_SUPABASE_URL||SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||SUPABASE_PUBLISHABLE_KEY;
export const supabase=createClient(url,key);
export let currentUser=null;

export async function sessionAndAccess(){
  const {data:{session},error}=await supabase.auth.getSession();
  if(error)throw error;
  if(!session?.user)return {user:null,allowed:false};
  currentUser=session.user;
  const {data,error:accessError}=await supabase.rpc('has_biblioteca_access');
  if(accessError)throw accessError;
  return {user:currentUser,allowed:!!data};
}

export async function ensureConfig(){
  const {error}=await supabase.rpc('biblioteca_asegurar_config');
  if(error)throw error;
}
