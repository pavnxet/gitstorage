export async function POST(req) {
  const { password } = await req.json();
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    return Response.json({ error: 'SITE_PASSWORD environment variable is not configured.' }, { status: 500 });
  }

  if (password === sitePassword) {
    const res = Response.json({ success: true });
    const isProd = process.env.NODE_ENV === 'production';
    res.headers.set(
      'Set-Cookie',
      `site_auth=${password}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${isProd ? '; Secure' : ''}`
    );
    return res;
  }
  return Response.json({ success: false, error: 'Invalid password' }, { status: 401 });
}

export async function DELETE() {
  const res = Response.json({ success: true });
  res.headers.set('Set-Cookie', `site_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res;
}
