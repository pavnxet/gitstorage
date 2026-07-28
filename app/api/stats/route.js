import { getRepoStats } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';

export async function GET(req) {
  if (!checkAuthFromRequest(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getRepoStats();
    return Response.json(stats);
  } catch (e) {
    console.error('Stats API error:', e);
    return Response.json({ error: e.message || 'Failed to fetch repository stats' }, { status: 500 });
  }
}
