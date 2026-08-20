import { SignJWT, jwtVerify } from 'jose';
import { verifyFirebasePatientRequest, patientPhoneFromFirebase } from '@/lib/firebase-server';

export type AdminIdentity={uid:string;phone:string;role:'ADMIN'};
export const ADMIN_SESSION_COOKIE='tg_admin_session';

function allowedAdminPhones(){
 return (process.env.ADMIN_PHONE_NUMBERS||'').split(',').map(patientPhoneFromFirebase).filter(Boolean);
}
function sessionSecret(){
 const value=process.env.ADMIN_SESSION_SECRET||'';
 if(value.length<32) throw new Error('ADMIN_SESSION_NOT_CONFIGURED');
 return new TextEncoder().encode(value);
}

export async function verifyAdminRequest(request:Request):Promise<AdminIdentity>{
 const identity=await verifyFirebasePatientRequest(request);
 const phone=patientPhoneFromFirebase(identity.phone);
 const allowed=allowedAdminPhones();
 if(!allowed.length) throw new Error('ADMIN_NOT_CONFIGURED');
 if(!allowed.includes(phone)) throw new Error('ADMIN_FORBIDDEN');
 return {uid:identity.uid,phone,role:'ADMIN'};
}

export async function issueAdminSession(identity:AdminIdentity){
 return new SignJWT({phone:identity.phone,role:'ADMIN'})
  .setProtectedHeader({alg:'HS256'})
  .setSubject(identity.uid)
  .setIssuer('tg-labs-admin')
  .setAudience('tg-labs-admin-web')
  .setIssuedAt()
  .setExpirationTime('8h')
  .sign(sessionSecret());
}

export async function verifyAdminSessionToken(token:string):Promise<AdminIdentity>{
 const {payload}=await jwtVerify(token,sessionSecret(),{algorithms:['HS256'],issuer:'tg-labs-admin',audience:'tg-labs-admin-web'});
 const uid=typeof payload.sub==='string'?payload.sub:'';
 const phone=typeof payload.phone==='string'?patientPhoneFromFirebase(payload.phone):'';
 if(!uid||!phone||payload.role!=='ADMIN') throw new Error('ADMIN_SESSION_INVALID');
 const allowed=allowedAdminPhones();
 if(!allowed.length) throw new Error('ADMIN_NOT_CONFIGURED');
 if(!allowed.includes(phone)) throw new Error('ADMIN_FORBIDDEN');
 return {uid,phone,role:'ADMIN'};
}

export function adminAuthError(error:unknown){
 const message=error instanceof Error?error.message:'UNAUTHENTICATED';
 if(message.includes('ADMIN_NOT_CONFIGURED')||message.includes('ADMIN_SESSION_NOT_CONFIGURED')) return {status:503,error:'Admin access is not configured.'};
 if(message.includes('ADMIN_FORBIDDEN')) return {status:403,error:'You are not authorized to access the TG Labs admin system.'};
 return {status:401,error:'Admin authentication required.'};
}
