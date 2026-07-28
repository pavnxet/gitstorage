import { getFileHistory } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';

export async function GET(req) {
  if (!checkAuthFromRequest(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) {
    return Response.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  try {
    const history = await getFileHistory(path);
    return Response.json({ history, path });
  } catch (e) {
    console.error('History API error:', e);
    return Response.json({ error: e.message || 'Failed to fetch revision history' }, { status: 500 });
  }
}
