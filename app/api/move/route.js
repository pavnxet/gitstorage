import { moveFile } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';

export async function POST(req) {
  if (!checkAuthFromRequest(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { from, to } = await req.json();
    if (!from || !to) {
      return Response.json({ error: '"from" and "to" paths are required' }, { status: 400 });
    }

    await moveFile(from, to);
    return Response.json({ success: true });
  } catch (e) {
    console.error('Move API route error:', e);
    return Response.json({ error: e.message || 'Move failed' }, { status: 500 });
  }
}
