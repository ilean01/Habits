import {supabase,libraryOwner,canWrite} from './client.js';
const bucket=()=>supabase.storage.from('biblioteca-portadas');
export const draftPath=(owner,id)=>`${owner}/books/draft-${id}.image`;
export async function createDraft(){if(!canWrite)throw new Error('Necesitás permiso de edición.');const {data,error}=await supabase.from('biblioteca_cover_drafts').insert({owner_id:libraryOwner}).select().single();if(error)throw error;return data;}
export async function readDraft(id){const {data,error}=await supabase.from('biblioteca_cover_drafts').select('*').eq('id',id).eq('owner_id',libraryOwner).single();if(error)throw new Error('El enlace venció o no tenés permiso en esta biblioteca.');return data;}
export async function uploadDraft(id,file){const row=await readDraft(id);if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Elegí una imagen JPG, PNG o WebP de hasta 10 MB.');const path=draftPath(row.owner_id,id);const uploaded=await bucket().upload(path,file,{upsert:true,contentType:file.type});if(uploaded.error)throw uploaded.error;const {error}=await supabase.from('biblioteca_cover_drafts').update({uploaded_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;}
export async function draftPreview(row){const {data,error}=await bucket().createSignedUrl(draftPath(row.owner_id,row.id),300);if(error)throw error;return data.signedUrl;}
export async function consumeDraft(id){const {error}=await supabase.from('biblioteca_cover_drafts').delete().eq('id',id);if(error)throw error;}
