import { renameFile } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';

export async function POST(req) {
  if (!checkAuthFromRequest(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { from, newName } = await req.json();
    if (!from || !newName) {
      return Response.json({ error: '"from" and "newName" are required' }, { status: 400 });
    }

    await renameFile(from, newName);
    return Response.json({ success: true });
  } catch (e) {
    console.error('Rename API error:', e);
    return Response.json({ error: e.message || 'Rename failed' }, { status: 500 });
  }
}
