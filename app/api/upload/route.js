import { saveFile } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';
export async function POST(req) {
  if (!checkAuthFromRequest(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { path, content, isBase64 } = await req.json();
    if (!path) return Response.json({ error: 'path required' }, { status: 400 });
    const base64 = isBase64 ? content : Buffer.from(content).toString('base64');
    // FIX 403: Ensure path is inside uploads/ or data/ to avoid root issues, but allow any
    const result = await saveFile(path, base64);
    return Response.json({ success: true, result });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
