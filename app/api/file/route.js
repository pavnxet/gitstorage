import { getFileRawInfo } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';

export async function GET(req) {
  if (!checkAuthFromRequest(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return Response.json({ error: 'path is required' }, { status: 400 });
  }

  try {
    const file = await getFileRawInfo(path);
    const fileName = file.name || 'file';

    const res = Response.json({ ...file, download_url: file.download_url });
    res.headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
  } catch (e) {
    console.error('File route error:', e);
    return Response.json({ error: e.message || 'File not found' }, { status: 404 });
  }
}
