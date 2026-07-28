export async function POST(req) {
  const { password } = await req.json();
  if (password === process.env.SITE_PASSWORD) {
    const res = Response.json({ success: true });
    res.headers.set('Set-Cookie', `site_auth=${password}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    return res;
  }
  return Response.json({ success: false, error: 'Invalid password' }, { status: 401 });
}
export async function DELETE() {
  const res = Response.json({ success: true });
  res.headers.set('Set-Cookie', `site_auth=; Path=/; Max-Age=0`);
  return res;
}
