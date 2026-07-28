import { NextResponse } from 'next/server';

export function middleware(req) {
  const pass = process.env.SITE_PASSWORD;
  if (!pass || !pass.trim()) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.includes('favicon')
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get('site_auth')?.value;
  const authHeader = req.headers.get('authorization');

  if (cookie === pass || authHeader === `Bearer ${pass}`) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)']
};
