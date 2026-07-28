import { deleteFile } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';

export async function DELETE(req) {
  if (!checkAuthFromRequest(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return Response.json({ error: 'path parameter is required' }, { status: 400 });
  }

  try {
    await deleteFile(path);
    return Response.json({ success: true });
  } catch (e) {
    console.error('Delete API route error:', e);
    return Response.json({ error: e.message || 'Delete failed' }, { status: 500 });
  }
}
