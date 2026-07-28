import { listFiles } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';
export async function GET(req) {
  if (!checkAuthFromRequest(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path') || '';
  try {
    const files = await listFiles(path);
    return Response.json({ files, path });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
