import { NextResponse } from 'next/server';
import { sessionCookie } from '../../../../lib/auth';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/auth', request.url));
  response.cookies.set(sessionCookie.name, '', { ...sessionCookie.options, maxAge: 0 });
  return response;
}
