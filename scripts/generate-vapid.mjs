import {createECDH} from 'node:crypto';

const b64url=value=>Buffer.from(value).toString('base64url');
const ecdh=createECDH('prime256v1');
ecdh.generateKeys();
const publicKey=b64url(ecdh.getPublicKey(null,'uncompressed'));
const privateKey=b64url(ecdh.getPrivateKey());

console.log('VAPID_PUBLIC_KEY='+publicKey);
console.log('VAPID_PRIVATE_KEY='+privateKey);
console.log('\nGuardá la privada solo como secreto de Supabase.');
console.log('La pública puede ir en VITE_VAPID_PUBLIC_KEY.');
