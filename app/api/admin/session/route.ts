import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, adminAuthError, issueAdminSession, verifyAdminRequest, verifyAdminSessionToken } from '@/lib/admin-auth';

export const dynamic='force-dynamic';

export async function POST(request:Request){
 try{
  const identity=await verifyAdminRequest(request);
  const token=await issueAdminSession(identity);
  const response=NextResponse.json({ok:true,phone:identity.phone,role:identity.role});
  response.cookies.set(ADMIN_SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*8});
  return response;
 }catch(error){const e=adminAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}

export async function GET(request:Request){
 try{
  const token=request.headers.get('cookie')?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1]||'';
  if(!token)throw new Error('UNAUTHENTICATED');
  const identity=await verifyAdminSessionToken(decodeURIComponent(token));
  return NextResponse.json({ok:true,phone:identity.phone,role:identity.role});
 }catch(error){const e=adminAuthError(error);return NextResponse.json({error:e.error},{status:e.status})}
}

export async function DELETE(){
 const response=NextResponse.json({ok:true});
 response.cookies.set(ADMIN_SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
 return response;
}
