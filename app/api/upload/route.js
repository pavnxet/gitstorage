import { saveFile } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';

export async function POST(req) {
  if (!checkAuthFromRequest(req)) {
    return Response.json({ error: 'Unauthorized. Check SITE_PASSWORD or login.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { path, content, isBase64 } = body || {};

    if (!path) {
      return Response.json({ error: 'File path is required' }, { status: 400 });
    }
    if (content === undefined || content === null) {
      return Response.json({ error: 'File content is required' }, { status: 400 });
    }

    const base64 = isBase64 ? content : Buffer.from(content).toString('base64');
    const result = await saveFile(path, base64);
    return Response.json({ success: true, result });
  } catch (e) {
    console.error('Upload API route error:', e);
    return Response.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}
