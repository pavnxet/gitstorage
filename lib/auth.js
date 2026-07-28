import { cookies } from 'next/headers';
export function isAuthenticated(req) {
  // Check cookie for session
  const cookieStore = cookies();
  const session = cookieStore.get('site_auth')?.value;
  return session === process.env.SITE_PASSWORD;
}
export function checkAuthFromRequest(req) {
  // For API routes, check Authorization header or cookie
  const authHeader = req.headers.get('authorization');
  const cookieHeader = req.headers.get('cookie') || '';
  const pass = process.env.SITE_PASSWORD;
  if (authHeader === `Bearer ${pass}`) return true;
  if (cookieHeader.includes(`site_auth=${pass}`)) return true;
  return false;
}
