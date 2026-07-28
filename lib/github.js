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

export function sanitizePath(rawPath) {
  if (typeof rawPath !== 'string') rawPath = '';
  rawPath = rawPath.trim();
  rawPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
  if (!rawPath) return '';

  const parts = rawPath.split('/').filter(Boolean);
  for (const part of parts) {
    if (part === '.' || part === '..' || part.includes('..')) {
      throw new Error('Invalid path: Path traversal sequences ("..", ".") are strictly forbidden.');
    }
    const lower = part.toLowerCase();
    // Allow .gitkeep and .gitignore files, but block .git and .github system folders
    if (lower === '.git' || lower === '.github' || lower.startsWith('.git/') || lower.startsWith('.github/')) {
      throw new Error('Access denied: System and git configuration directories are restricted.');
    }
  }
  return parts.join('/');
}

function mapFile(f) {
  return {
    name: f.name,
    path: f.path,
    type: f.type,
    size: f.size,
    sha: f.sha,
    download_url: f.download_url
  };
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
  if (!Array.isArray(data)) return [mapFile(data)];
  return data.map(mapFile);
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

export async function getFileContent(rawPath) {
  const info = await getFileRawInfo(rawPath);
  const { token } = getEnv();
  if (info.content) {
    return { ...info, decoded: Buffer.from(info.content, 'base64') };
  }
  if (info.download_url) {
    const res = await fetch(info.download_url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to fetch raw file content');
    const buf = Buffer.from(await res.arrayBuffer());
    return { ...info, decoded: buf };
  }
  throw new Error('Cannot retrieve file content');
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

export async function renameFile(fromRawPath, newName) {
  const fromClean = sanitizePath(fromRawPath);
  const cleanName = newName.trim().replace(/\//g, '');
  if (!cleanName || cleanName.includes('/') || cleanName === '.' || cleanName === '..') {
    throw new Error('Invalid new file name');
  }
  const parts = fromClean.split('/');
  parts.pop();
  const toClean = parts.length ? `${parts.join('/')}/${cleanName}` : cleanName;
  return await moveFile(fromClean, toClean);
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

export async function getFileHistory(rawPath) {
  const { owner, repo, branch, token } = getEnv();
  const clean = sanitizePath(rawPath);
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(clean)}&sha=${branch}&per_page=20`;
  const res = await fetch(url, { headers: getHeaders(token), cache: 'no-store' });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`History failed (${res.status}): ${txt}`);
  }

  const data = await res.json();
  return data.map(c => ({
    sha: c.sha,
    message: c.commit.message,
    date: c.commit.committer ? c.commit.committer.date : (c.commit.author ? c.commit.author.date : ''),
    author: c.commit.author ? c.commit.author.name : 'Unknown',
    url: c.html_url
  }));
}

export async function getRepoStats() {
  const { owner, repo, token } = getEnv();
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: getHeaders(token),
    cache: 'no-store'
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Stats failed (${res.status}): ${txt}`);
  }

  const data = await res.json();
  return {
    sizeKB: data.size,
    updatedAt: data.updated_at,
    defaultBranch: data.default_branch,
    private: data.private
  };
}
