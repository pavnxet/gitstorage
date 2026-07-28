const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN;

if (!OWNER || !REPO || !TOKEN) {
  console.error("Missing env: GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN");
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

function apiUrl(path='') {
  const clean = path.replace(/^\/+/, '');
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${clean}?ref=${BRANCH}`;
}

export async function listFiles(path='') {
  const res = await fetch(apiUrl(path), { headers, cache: 'no-store' });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GitHub list ${res.status}: ${txt}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [data];
  return data.map(f=>({ name:f.name, path:f.path, type:f.type, size:f.size, sha:f.sha, download_url:f.download_url }));
}

export async function getFileRawInfo(path) {
  const res = await fetch(apiUrl(path), { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`File not found ${path}`);
  return await res.json();
}

export async function saveFile(path, base64Content) {
  const clean = path.replace(/^\/+/, '');
  let sha;
  try {
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${clean}?ref=${BRANCH}`, { headers });
    if (r.ok) { const j = await r.json(); sha = j.sha; }
  } catch {}
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${clean}`, {
    method: 'PUT', headers,
    body: JSON.stringify({ message: `upload: ${clean}`, content: base64Content, branch: BRANCH, sha }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub save failed ${res.status}: ${t}`);
  }
  return await res.json();
}

export async function deleteFile(path) {
  const clean = path.replace(/^\/+/, '');
  const r = await fetch(apiUrl(clean), { headers });
  if (!r.ok) throw new Error('File not found');
  const j = await r.json();
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${clean}`, {
    method: 'DELETE', headers,
    body: JSON.stringify({ message: `delete: ${clean}`, sha: j.sha, branch: BRANCH }),
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}
