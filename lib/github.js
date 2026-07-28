function getEnv() {
  const owner = (process.env.GITHUB_OWNER || '').trim();
  const repo = (process.env.GITHUB_REPO || '').trim();
  const branch = (process.env.GITHUB_BRANCH || 'main').trim();
  const token = (process.env.GITHUB_TOKEN || '').trim();
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

export async function listFiles(path = '') {
  const { owner, repo, branch, token } = getEnv();
  if (!owner || !repo || !token) {
    const missing = [];
    if (!owner) missing.push('GITHUB_OWNER');
    if (!repo) missing.push('GITHUB_REPO');
    if (!token) missing.push('GITHUB_TOKEN');
    throw new Error(`Server configuration error. Missing Vercel Environment Variables: ${missing.join(', ')}`);
  }

  const clean = path.replace(/^\/+/, '');
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

export async function getFileRawInfo(path) {
  const { owner, repo, branch, token } = getEnv();
  const clean = path.replace(/^\/+/, '');
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${clean}?ref=${branch}`, {
    headers: getHeaders(token),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`File not found: ${path}`);
  return await res.json();
}

export async function saveFile(path, base64Content) {
  const { owner, repo, branch, token } = getEnv();
  if (!owner || !repo || !token) {
    const missing = [];
    if (!owner) missing.push('GITHUB_OWNER');
    if (!repo) missing.push('GITHUB_REPO');
    if (!token) missing.push('GITHUB_TOKEN');
    throw new Error(`Server configuration error. Missing Vercel Environment Variables: ${missing.join(', ')}`);
  }

  const clean = path.replace(/^\/+/, '');
  const headers = getHeaders(token);

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
    console.error('Error checking existing file SHA:', err);
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

  if (!res.ok) {
    const errText = await res.text();
    console.error(`GitHub API PUT error (${res.status}):`, errText);
    let parsedMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      parsedMsg = parsed.message || errText;
    } catch {}
    throw new Error(`GitHub save failed (${res.status}): ${parsedMsg}`);
  }

  return await res.json();
}

export async function deleteFile(path) {
  const { owner, repo, branch, token } = getEnv();
  if (!owner || !repo || !token) {
    throw new Error('Server configuration error: Missing GITHUB_OWNER, GITHUB_REPO, or GITHUB_TOKEN.');
  }

  const clean = path.replace(/^\/+/, '');
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
