import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

function normalizePhone(value:string){const d=String(value||'').replace(/\D/g,'');return d.length===12&&d.startsWith('91')?d.slice(2):d.slice(-10)}

export async function verifyFirebasePhoneIdToken(token:string){
 const projectId=process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||'';
 if(!projectId)throw new Error('FIREBASE_PROJECT_NOT_CONFIGURED');
 const {payload}=await jwtVerify(token,GOOGLE_JWKS,{algorithms:['RS256'],issuer:`https://securetoken.google.com/${projectId}`,audience:projectId});
 const phone=normalizePhone(String(payload.phone_number||''));
 if(!phone)throw new Error('PHONE_NOT_VERIFIED');
 return {phone,uid:String(payload.sub||'')};
}
