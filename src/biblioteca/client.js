import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../config.js';

const url=import.meta.env.VITE_SUPABASE_URL||SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||SUPABASE_PUBLISHABLE_KEY;
export const supabase=createClient(url,key);
export let currentUser=null;
export let libraryOwner=null;
export let canWrite=false;

export async function sessionAndAccess(){
  const {data:{session},error}=await supabase.auth.getSession();
  if(error)throw error;
  if(!session?.user){currentUser=null;libraryOwner=null;canWrite=false;return {user:null,allowed:false};}
  currentUser=session.user;libraryOwner=null;canWrite=false;
  const {data,error:accessError}=await supabase.rpc('has_biblioteca_access');
  if(accessError)throw accessError;
  if(data){const owner=await supabase.rpc('biblioteca_owner');if(owner.error)throw owner.error;libraryOwner=owner.data;const permission=await supabase.rpc('biblioteca_can_write');if(permission.error)throw permission.error;canWrite=permission.data===true;}
  return {user:currentUser,allowed:!!data,owner:libraryOwner,canWrite};
}

export async function ensureConfig(){
  const {error}=await supabase.rpc('biblioteca_asegurar_config');
  if(error)throw error;
}
