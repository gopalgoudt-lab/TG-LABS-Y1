import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin-auth';

export async function middleware(request:NextRequest){
 const {pathname,search}=request.nextUrl;
 if(pathname==='/admin/login'||pathname==='/api/admin/session')return NextResponse.next();
 const protectedPath=pathname==='/manual'||pathname.startsWith('/manual/')||pathname==='/admin'||pathname.startsWith('/admin/')||pathname.startsWith('/api/admin/');
 if(!protectedPath)return NextResponse.next();
 try{
  const token=request.cookies.get(ADMIN_SESSION_COOKIE)?.value||'';
  if(!token)throw new Error('UNAUTHENTICATED');
  await verifyAdminSessionToken(token);
  return NextResponse.next();
 }catch{
  if(pathname.startsWith('/api/'))return NextResponse.json({error:'Admin authentication required.'},{status:401});
  const login=new URL('/admin/login',request.url);
  login.searchParams.set('next',`${pathname}${search}`);
  return NextResponse.redirect(login);
 }
}

export const config={matcher:['/admin/:path*','/manual/:path*','/api/admin/:path*']};
