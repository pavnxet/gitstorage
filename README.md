# Secure GitHub Storage — Vercel Explorer v3

A fast, secure, password-protected file explorer that uses a **private GitHub repository as storage** and runs 100% on **Vercel Serverless**. No database, no S3 — just GitHub Contents API.

Live demo structure: `yourdomain.com` → password → browse / upload / preview / manage files stored in `pavnxet/my-storage`.

---

## ✨ Features

### Core Explorer
- 📁 **Browse** any path, breadcrumbs navigation
- ⬆️ **Upload** drag & drop or click — folder-aware path
- 📄 **Preview** — images, PDFs, videos, audio, text, markdown, code
- 🔍 **Search** instant filter by name
- ↕️ **Sort** by name / size / type, dirs first
- 🔲 **Grid / List view** toggle with thumbnails
- ⭐ **Favorites** + **Recent** (localStorage)
- ℹ️ **Details panel** — size, SHA, path, download

### File Operations
- **New Folder** (creates `.gitkeep`)
- **Rename** — safe, no `/` allowed
- **Copy / Move** — between any paths
- **Delete** → **Trash** (soft delete to `trash/`), not permanent
- **Bulk Select** — select all, clear, bulk trash
- **ZIP Download** — select multiple files → client-side zip via `jszip`
- **Download** via secure proxy `/api/file?download=1`

### Power Features
- **Version History** — GitHub commits per file (`/api/history`)
- **Storage Stats** — repo size, last update
- **3MB Upload Limit** — enforced client + server to avoid Vercel 4.5MB body limit
- **Responsive** — mobile friendly, dark / light theme
- **Trash view** — browse `trash/` folder

---

## 🔒 Security Hardening (v3)

| Issue in v2 | Fix in v3 |
|---|---|
| `middleware.js` returned `next()` if `SITE_PASSWORD` missing → auth bypass | **Fail-closed**: returns 500 for API, redirects login with `?error=misconfigured` |
| `lib/auth.js` returned `true` if password missing + used `includes()` (substring bypass) | Returns `false`, proper cookie parsing with exact match |
| `sanitizePath()` bypass via `%252e%252e` double-encoding | Triple `decodeURIComponent` + blocks `..`, `.`, `.git`, `.github` (allows `.gitkeep`) |
| `localStorage site_pw` leaked password to XSS | Removed — uses HttpOnly cookie only |
| `download_url` direct to GitHub CDN bypassed security headers | All downloads proxied via `/api/file` with `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` |
| HTML preview `allow-scripts` | Safe mode default `sandbox=""`, unsafe toggle with confirm |
| 4MB limit > Vercel 4.5MB after base64 bloat | **3MB** limit both sides |

Cookies: `HttpOnly; SameSite=Lax; Path=/; Max-Age=86400; Secure in production`

---

## 🛠 Tech Stack

- **Next.js 14.2.5** (App Router)
- **React 18**
- **GitHub Contents API** — `PUT /repos/{owner}/{repo}/contents/{path}` for upload, `GET` for list, `DELETE` for delete
- **jszip 3.10.1** — client-side zip creation
- **Vercel Edge Middleware** for auth

---

## 🚀 Quick Start

```bash
git clone https://github.com/pavnxet/gitstorage
cd gitstorage
npm install
```

Create `.env.local`:

```
GITHUB_TOKEN=ghp_xxx or github_pat_xxx
GITHUB_OWNER=pavnxet
GITHUB_REPO=my-storage   # storage repo, NOT this code repo
GITHUB_BRANCH=main
SITE_PASSWORD=super_strong_password
```

```bash
npm run dev
# open http://localhost:3000 -> /login
```

### Fix 403 Resource not accessible

**Fine-grained PAT (recommended):**
1. GitHub → Settings → Developer Settings → Personal access tokens → Fine-grained
2. Repository access → **Only select repos** → select your storage repo (e.g. `pavnxet/my-storage`)
3. Permissions → Contents: **Read and Write**, Metadata: **Read**
4. If org repo → ask admin to approve

**Classic token (works 100%):**
GitHub → Settings → Developer Settings → Tokens (classic) → Generate → Scope: `repo`

---

## ⚙️ Env Vars (Vercel Dashboard)

| Var | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | PAT for storage repo |
| `GITHUB_OWNER` | Yes | e.g. `pavnxet` |
| `GITHUB_REPO` | Yes | e.g. `my-storage` |
| `GITHUB_BRANCH` | No | Default `main` |
| `SITE_PASSWORD` | Yes | Login password — if missing, app fails closed |

Add in Vercel → Project → Settings → Environment Variables.

---

## 📡 API Routes

All require auth (cookie `site_auth` or `Authorization: Bearer <SITE_PASSWORD>`).

| Route | Method | Params | Description |
|---|---|---|---|
| `/api/auth` | POST/DELETE | `{password}` | Login/logout, sets HttpOnly cookie |
| `/api/files` | GET | `?path=` | List files in path |
| `/api/file` | GET | `?path=&download=1` | Proxy file content with secure headers |
| `/api/upload` | POST | `{path, content: base64, isBase64}` | Upload file, 3MB limit, 409 retry |
| `/api/delete` | DELETE | `?path=&trash=1` | Delete or move to trash |
| `/api/copy` | POST | `{from, to}` | Copy file |
| `/api/move` | POST | `{from, to}` | Move file |
| `/api/rename` | POST | `{from, newName}` | Rename |
| `/api/folder` | POST | `{name, path}` | Create folder via `.gitkeep` |
| `/api/history` | GET | `?path=` | Last 20 commits for file |
| `/api/stats` | GET | - | Repo size, updated_at |

---

## 📂 Project Structure

```
middleware.js          # Auth gate, fail-closed
lib/
  auth.js              # Safe cookie parsing
  github.js            # getEnv, sanitizePath, saveFile with retry, history, stats
app/
  page.js              # Full explorer UI v3
  login/page.js
  layout.js
  api/
    auth/route.js
    files/route.js
    file/route.js      # proxy download
    upload/route.js
    delete/route.js
    copy/route.js
    move/route.js
    rename/route.js
    folder/route.js
    history/route.js
    stats/route.js
```

---

## ⚠️ Limitations

- GitHub Contents API: single file ≤100MB, but Vercel body ≤4.5MB → we limit to **3MB** for reliability. For bigger files, use Git LFS or direct git push.
- `saveFile` does GET SHA → PUT → can 409 on concurrent uploads → we retry 3× (TOCTOU fix).
- `trash/` is just a folder — not auto-purged. Add cron to clean.

---

## 🗺 Roadmap

- [ ] Monaco editor for in-browser edit + save
- [ ] Shareable expiring links
- [ ] Auto-clean trash after 30 days
- [ ] Repo quota warning (80% of 1GB)
- [ ] PWA offline cache for recent files

---

## 📄 License

MIT — feel free to fork.

Built by [@pavnxet](https://github.com/pavnxet) — Explorer v3 hardened.
