import { NextResponse } from 'next/server';
export function middleware(req) {
  const pass = process.env.SITE_PASSWORD;
  if (!pass) return NextResponse.next(); // no password set = open
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.includes('favicon')) {
    return NextResponse.next();
  }
  const cookie = req.cookies.get('site_auth')?.value;
  if (cookie === pass) return NextResponse.next();
  return NextResponse.redirect(new URL('/login', req.url));
}
export const config = { matcher: ['/((?!api/files|api/file|api/upload|api/delete).*)'] };
