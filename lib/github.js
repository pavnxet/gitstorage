function getEnv() {
  const owner = (process.env.GITHUB_OWNER || '').trim();
  const repo = (process.env.GITHUB_REPO || '').trim();
  const branch = (process.env.GITHUB_BRANCH || 'main').trim();
  const token = (process.env.GITHUB_TOKEN || '').trim();

  if (!owner || !repo || !token) {
    const missing = [];
    if (!owner) missing.push('GITHUB_OWNER');
    if (!repo) missing.push('GITHUB_REPO');
    if (!token) missing.push('GITHUB_TOKEN');
    throw new Error(`Server configuration error: Missing Vercel Environment Variables: ${missing.join(', ')}.`);
  }

  return { owner, repo, branch, token };
}

function getHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Vercel-GitHub-Storage-App'
  };
}

export function sanitizePath(rawPath = '') {
  if (typeof rawPath !== 'string') return '';
  let p = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = p.split('/').filter(Boolean);

  for (let part of parts) {
    if (part === '.' || part === '..' || part.includes('..')) {
      throw new Error('Invalid path: Path traversal sequences ("..", ".") are strictly forbidden.');
    }
    if (part.toLowerCase().startsWith('.git') || part.toLowerCase().startsWith('.github')) {
      throw new Error('Access denied: System and git configuration directories are restricted.');
    }
  }

  return parts.join('/');
}

export async function listFiles(rawPath = '') {
  const { owner, repo, branch, token } = getEnv();
  const clean = sanitizePath(rawPath);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${clean}?ref=${branch}`;
  const res = await fetch(url, { headers: getHeaders(token), cache: 'no-store' });

  if (!res.ok) {
    if (res.status === 404) return [];
    const txt = await res.text();
    throw new Error(`GitHub list failed (${res.status}): ${txt}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [data];
  return data.map(f => ({
    name: f.name,
    path: f.path,
    type: f.type,
    size: f.size,
    sha: f.sha,
    download_url: f.download_url
  }));
}

export async function getFileRawInfo(rawPath) {
  const { owner, repo, branch, token } = getEnv();
  const clean = sanitizePath(rawPath);
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${clean}?ref=${branch}`, {
    headers: getHeaders(token),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`File not found: ${clean}`);
  return await res.json();
}

export async function saveFile(rawPath, base64Content) {
  const { owner, repo, branch, token } = getEnv();
  const clean = sanitizePath(rawPath);
  const headers = getHeaders(token);

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    let sha;

    try {
      const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${clean}?ref=${branch}`, {
        headers,
        cache: 'no-store'
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing && existing.sha) {
          sha = existing.sha;
        }
      }
    } catch (err) {
      console.error('Error fetching file SHA check:', err);
    }

    const bodyData = {
      message: `upload: ${clean}`,
      content: base64Content,
      branch
    };
    if (sha) {
      bodyData.sha = sha;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${clean}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(bodyData)
    });

    if (res.ok) {
      return await res.json();
    }

    const errText = await res.text();
    if (res.status === 409 && attempt < maxRetries) {
      console.warn(`SHA conflict 409 on attempt ${attempt}. Retrying...`);
      await new Promise(r => setTimeout(r, 300 * attempt));
      continue;
    }

    console.error(`GitHub API PUT error (${res.status}):`, errText);
    let parsedMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      parsedMsg = parsed.message || errText;
    } catch {}
    throw new Error(`GitHub save failed (${res.status}): ${parsedMsg}`);
  }
}

export async function copyFile(fromRawPath, toRawPath) {
  const fromClean = sanitizePath(fromRawPath);
  const toClean = sanitizePath(toRawPath);

  const srcInfo = await getFileRawInfo(fromClean);
  let base64Content;

  if (srcInfo && srcInfo.content) {
    base64Content = srcInfo.content.replace(/\n/g, '');
  } else if (srcInfo && srcInfo.download_url) {
    const { token } = getEnv();
    const res = await fetch(srcInfo.download_url, { headers: getHeaders(token) });
    const arrayBuffer = await res.arrayBuffer();
    base64Content = Buffer.from(arrayBuffer).toString('base64');
  } else {
    throw new Error(`Cannot copy file contents of ${fromClean}`);
  }

  return await saveFile(toClean, base64Content);
}

export async function moveFile(fromRawPath, toRawPath) {
  const fromClean = sanitizePath(fromRawPath);
  const toClean = sanitizePath(toRawPath);

  await copyFile(fromClean, toClean);
  await deleteFile(fromClean);
  return true;
}

export async function deleteFile(rawPath) {
  const { owner, repo, branch, token } = getEnv();
  const clean = sanitizePath(rawPath);
  const headers = getHeaders(token);

  const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${clean}?ref=${branch}`, {
    headers,
    cache: 'no-store'
  });
  if (!checkRes.ok) throw new Error(`File not found: ${clean}`);
  const existing = await checkRes.json();

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${clean}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({
      message: `delete: ${clean}`,
      sha: existing.sha,
      branch
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub delete failed (${res.status}): ${txt}`);
  }
  return true;
}
