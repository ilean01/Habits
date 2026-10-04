// Desbloqueo biométrico local para una sesión de Supabase ya válida.
// WebAuthn confirma presencia/verificación del usuario en este dispositivo.
// No sustituye la autenticación del servidor ni guarda correo/contraseña.
const PREFIX='habits:biometric:v1:';

const bytesToBase64Url=bytes=>{
  let binary='';
  for(const b of new Uint8Array(bytes))binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const base64UrlToBytes=value=>{
  const padded=String(value).replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((String(value).length+3)%4);
  const binary=atob(padded);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
};
const challenge=()=>crypto.getRandomValues(new Uint8Array(32));

export function biometricSupported(){
  return typeof window!=='undefined'&&window.isSecureContext!==false&&
    typeof PublicKeyCredential!=='undefined'&&
    typeof navigator!=='undefined'&&!!navigator.credentials?.create&&!!navigator.credentials?.get;
}

export async function platformBiometricAvailable(){
  if(!biometricSupported())return false;
  if(typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable!=='function')return true;
  try{return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();}catch{return false;}
}

export function biometricDeviceLabel(){
  const ua=typeof navigator!=='undefined'?navigator.userAgent:'';
  if(/iPhone|iPad|iPod|Macintosh/i.test(ua))return 'Face ID / Touch ID';
  if(/Windows/i.test(ua))return 'Windows Hello';
  return 'biometría del dispositivo';
}

export function biometricProfile(userId){
  if(!userId||typeof localStorage==='undefined')return null;
  try{
    const value=JSON.parse(localStorage.getItem(PREFIX+userId));
    return value?.credentialId&&value?.userId===userId?value:null;
  }catch{return null;}
}

export function hasBiometricCredential(userId){
  return !!biometricProfile(userId);
}

export function removeBiometricCredential(userId){
  if(userId&&typeof localStorage!=='undefined')localStorage.removeItem(PREFIX+userId);
}

export async function registerBiometricCredential(user){
  if(!user?.id)throw new Error('No hay una cuenta activa.');
  if(!await platformBiometricAvailable())throw new Error('Este dispositivo no ofrece biometría compatible para Habits.');
  const existing=biometricProfile(user.id);
  const publicKey={
    challenge:challenge(),
    rp:{name:'Habits'},
    user:{
      id:new TextEncoder().encode(user.id),
      name:user.email||user.id,
      displayName:user.user_metadata?.name||'Habits'
    },
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
    authenticatorSelection:{
      authenticatorAttachment:'platform',
      residentKey:'preferred',
      requireResidentKey:false,
      userVerification:'required'
    },
    timeout:60000,
    attestation:'none'
  };
  if(existing?.credentialId){
    publicKey.excludeCredentials=[{type:'public-key',id:base64UrlToBytes(existing.credentialId),transports:['internal']}];
  }
  const credential=await navigator.credentials.create({publicKey});
  if(!credential?.rawId)throw new Error('No se pudo registrar la biometría.');
  const profile={
    userId:user.id,
    credentialId:bytesToBase64Url(credential.rawId),
    createdAt:new Date().toISOString()
  };
  localStorage.setItem(PREFIX+user.id,JSON.stringify(profile));
  return profile;
}

export async function unlockWithBiometric(userId){
  const profile=biometricProfile(userId);
  if(!profile)throw new Error('La biometría no está configurada en este dispositivo.');
  if(!await platformBiometricAvailable())throw new Error('La biometría no está disponible en este dispositivo.');
  const credential=await navigator.credentials.get({publicKey:{
    challenge:challenge(),
    allowCredentials:[{type:'public-key',id:base64UrlToBytes(profile.credentialId),transports:['internal']}],
    userVerification:'required',
    timeout:60000
  }});
  if(!credential?.rawId)throw new Error('No se pudo verificar la biometría.');
  if(bytesToBase64Url(credential.rawId)!==profile.credentialId)throw new Error('La credencial biométrica no coincide con este dispositivo.');
  return true;
}
