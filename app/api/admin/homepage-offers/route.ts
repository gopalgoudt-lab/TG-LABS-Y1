import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_COOKIE, adminAuthError, verifyAdminSessionToken } from '@/lib/admin-auth';

export const dynamic='force-dynamic';
const MAX_ACTIVE=10;
function ip(r:Request){return (r.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'unknown'}
async function admin(request:Request){const token=request.headers.get('cookie')?.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`))?.[1]||'';if(!token)throw new Error('UNAUTHENTICATED');return verifyAdminSessionToken(decodeURIComponent(token));}
function clean(body:any){return {title:String(body.title||'').trim().slice(0,100),subtitle:String(body.subtitle||'').trim().slice(0,240),imageUrl:String(body.imageUrl||'').trim().slice(0,2000),imageAlt:String(body.imageAlt||'').trim().slice(0,160),searchQuery:String(body.searchQuery||'').trim().slice(0,100),active:Boolean(body.active),sortOrder:Number.isFinite(Number(body.sortOrder))?Math.max(0,Math.min(999,Math.trunc(Number(body.sortOrder)))):0};}
function valid(x:ReturnType<typeof clean>){try{const u=new URL(x.imageUrl);return !!x.title&&!!x.subtitle&&!!x.imageAlt&&!!x.searchQuery&&(u.protocol==='https:');}catch{return false}}
async function audit(request:Request,phone:string,action:string,id:string,summary:string){await prisma.adminAuditLog.create({data:{adminPhone:phone,action,entityType:'HOMEPAGE_OFFER',entityId:id,summary,ipAddress:ip(request),userAgent:request.headers.get('user-agent')||null}})}
export async function GET(request:Request){try{await admin(request);const offers=await prisma.homepageOffer.findMany({orderBy:[{sortOrder:'asc'},{createdAt:'asc'}]});return NextResponse.json({offers,maxActive:MAX_ACTIVE});}catch(e){const a=adminAuthError(e);return NextResponse.json({error:a.error},{status:a.status})}}
export async function POST(request:Request){try{const who=await admin(request);const data=clean(await request.json());if(!valid(data))return NextResponse.json({error:'Title, description, HTTPS image, image alt text and Book Now search target are required.'},{status:400});if(data.active&&await prisma.homepageOffer.count({where:{active:true}})>=MAX_ACTIVE)return NextResponse.json({error:'Maximum 10 active homepage offers allowed.'},{status:409});const offer=await prisma.homepageOffer.create({data});await audit(request,who.phone,'HOMEPAGE_OFFER_CREATED',offer.id,`Created homepage offer: ${offer.title}`);return NextResponse.json({offer},{status:201});}catch(e){const a=adminAuthError(e);return NextResponse.json({error:a.error},{status:a.status})}}
