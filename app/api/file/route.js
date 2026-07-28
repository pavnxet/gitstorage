import { getFileContent, sanitizePath } from '@/lib/github';
import { checkAuthFromRequest } from '@/lib/auth';

export async function GET(req) {
  if (!checkAuthFromRequest(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const download = searchParams.get('download') === '1';

  if (!path) {
    return Response.json({ error: 'Path parameter is required' }, { status: 400 });
  }

  try {
    const clean = sanitizePath(path);
    const file = await getFileContent(clean);
    const fileName = file.name || clean.split('/').pop() || 'file';
    const ext = fileName.split('.').pop().toLowerCase();

    let mime = 'application/octet-stream';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) mime = `image/${ext}`;
    else if (ext === 'svg') mime = 'image/svg+xml';
    else if (ext === 'pdf') mime = 'application/pdf';
    else if (['txt', 'md', 'json', 'js', 'css', 'html', 'xml', 'csv', 'log', 'yaml', 'yml'].includes(ext)) mime = 'text/plain; charset=utf-8';
    else if (['mp4', 'webm'].includes(ext)) mime = `video/${ext}`;
    else if (['mp3', 'wav', 'ogg'].includes(ext)) mime = `audio/${ext}`;

    const buf = file.decoded;
    const encoded = encodeURIComponent(fileName).replace(/'/g, '%27');
    const headers = {
      'Content-Type': mime,
      'Content-Length': buf.length.toString(),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=60',
      'Content-Disposition': download
        ? `attachment; filename="${fileName.replace(/"/g, '')}" ; filename*=UTF-8''${encoded}`
        : `inline; filename="${fileName.replace(/"/g, '')}"`
    };
    return new Response(buf, { status: 200, headers });
  } catch (e) {
    console.error('File proxy API error:', e);
    return Response.json({ error: e.message || 'File not found' }, { status: 404 });
  }
}
