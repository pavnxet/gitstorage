import { cookies } from 'next/headers';

export function isAuthenticated() {
  const pass = process.env.SITE_PASSWORD;
  if (!pass || !pass.trim()) return true;
  try {
    const cookieStore = cookies();
    const session = cookieStore.get('site_auth')?.value;
    return session === pass;
  } catch {
    return false;
  }
}

export function checkAuthFromRequest(req) {
  const pass = process.env.SITE_PASSWORD;
  if (!pass || !pass.trim()) return true;
  
  const authHeader = req.headers.get('authorization');
  const cookieHeader = req.headers.get('cookie') || '';
  
  if (authHeader && authHeader === `Bearer ${pass}`) return true;
  if (cookieHeader && cookieHeader.includes(`site_auth=${pass}`)) return true;
  
  return false;
}
