import { verifyFirebasePatientRequest, patientPhoneFromFirebase } from '@/lib/firebase-server';

export type AdminIdentity={uid:string;phone:string;role:'ADMIN'};

function allowedAdminPhones(){
 return (process.env.ADMIN_PHONE_NUMBERS||'').split(',').map(patientPhoneFromFirebase).filter(Boolean);
}

export async function verifyAdminRequest(request:Request):Promise<AdminIdentity>{
 const identity=await verifyFirebasePatientRequest(request);
 const phone=patientPhoneFromFirebase(identity.phone);
 const allowed=allowedAdminPhones();
 if(!allowed.length) throw new Error('ADMIN_NOT_CONFIGURED');
 if(!allowed.includes(phone)) throw new Error('ADMIN_FORBIDDEN');
 return {uid:identity.uid,phone,role:'ADMIN'};
}

export function adminAuthError(error:unknown){
 const message=error instanceof Error?error.message:'UNAUTHENTICATED';
 if(message.includes('ADMIN_NOT_CONFIGURED')) return {status:503,error:'Admin access is not configured.'};
 if(message.includes('ADMIN_FORBIDDEN')) return {status:403,error:'You are not authorized to access the TG Labs admin system.'};
 return {status:401,error:'Admin authentication required.'};
}
