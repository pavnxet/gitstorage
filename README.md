# Secure GitHub Storage - Vercel

Fix for 403 Resource not accessible:

## Why 403?
Fine-grained PAT needs:
- Repository access: Select your storage repo (e.g. pavnxet/my-storage) - NOT all repos
- Permissions:
  - Contents: Read and Write
  - Metadata: Read (auto)
- If repo is in org, admin must approve token

OR use Classic Token:
- github.com > Settings > Developer settings > Personal access tokens > Tokens (classic)
- Generate new token (classic)
- Scope: repo (full control of private repos)
- Works 100% but less secure

## Env Vars on Vercel
GITHUB_TOKEN=ghp_... or github_pat_...
GITHUB_OWNER=pavnxet
GITHUB_REPO=my-storage (storage repo name)
GITHUB_BRANCH=main
SITE_PASSWORD=yourSecret123

## Features
- Password protected (middleware + cookie)
- Only upload & download, no create-file textarea
- Auto deploy on push
