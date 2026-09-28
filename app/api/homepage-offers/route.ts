import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic='force-dynamic';
export async function GET(){try{const offers=await prisma.homepageOffer.findMany({where:{active:true},orderBy:[{sortOrder:'asc'},{createdAt:'asc'}],take:10,select:{id:true,title:true,subtitle:true,imageUrl:true,imageAlt:true,searchQuery:true}});return NextResponse.json({offers});}catch{return NextResponse.json({offers:[]});}}
