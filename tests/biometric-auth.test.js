import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('biometric helper uses WebAuthn platform verification and never stores a password',async()=>{
 const source=await read('../src/biometric-auth.js');
 assert.match(source,/navigator\.credentials\.create/);
 assert.match(source,/navigator\.credentials\.get/);
 assert.match(source,/authenticatorAttachment:'platform'/);
 assert.match(source,/userVerification:'required'/);
 assert.doesNotMatch(source,/password\s*:/i);
});

test('Habits gates an existing session with biometrics and keeps email-password fallback',async()=>{
 const source=await read('../src/main.js');
 assert.match(source,/event==='INITIAL_SESSION'/);
 assert.match(source,/hasBiometricCredential\(session\.user\.id\)/);
 assert.match(source,/biometric-unlock/);
 assert.match(source,/biometric-fallback/);
 assert.match(source,/Usar correo y contraseña/);
 assert.match(source,/offerBiometricSetup/);
});

test('Supabase session persistence is explicit so normal reopen does not require login again',async()=>{
 const source=await read('../src/store.js');
 assert.match(source,/persistSession:true/);
 assert.match(source,/autoRefreshToken:true/);
});
