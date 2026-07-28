import { getFileRawInfo } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';
export async function GET(req) {
  if (!checkAuthFromRequest(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) return Response.json({ error: 'path required' }, { status: 400 });
  try {
    const file = await getFileRawInfo(path);
    // Return download url and content type
    return Response.json({ ...file, download_url: file.download_url });
  } catch (e) { return Response.json({ error: e.message }, { status: 404 }); }
}
