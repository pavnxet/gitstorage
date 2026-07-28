import { saveFile, sanitizePath } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';

export async function POST(req) {
  if (!checkAuthFromRequest(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, path } = await req.json();
    if (!name || !name.trim()) {
      return Response.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const cleanFolder = sanitizePath(name.trim());
    const parentPath = path ? sanitizePath(path) : '';
    const fullPath = parentPath ? `${parentPath}/${cleanFolder}/.gitkeep` : `${cleanFolder}/.gitkeep`;

    const result = await saveFile(fullPath, Buffer.from('').toString('base64'));
    return Response.json({ success: true, result });
  } catch (e) {
    console.error('Folder creation API error:', e);
    return Response.json({ error: e.message || 'Failed to create folder' }, { status: 500 });
  }
}
