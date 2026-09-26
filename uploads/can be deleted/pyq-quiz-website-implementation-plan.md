# Implementation Plan: PYQ Database & Quiz Website
### (Subject → Topic → Previous Year Questions, with Bulk Exam Import, Manual Triage, and Custom Quiz Generator)

---

## 1. Project Summary

You are building a personal exam-prep web application for the **Vanpal (वनपाल) Bharti Pariksha 2026** and similar competitive exams. The core idea is a **living database of Previous Year Questions (PYQs)**, organized hierarchically, that doubles as a **quiz engine**.

### Core requirements (restated precisely, so nothing is lost)

1. **Home page** → large cards for top-level **Subjects** (Art & Culture, Maths, History, Geography, Hindi, English, etc.)
2. Click a Subject → opens its **Topics** (e.g., under History: "18th Century Revolutions", "Mughal Administration", etc.)
3. Click a Topic → shows all **PYQs** tagged to that topic.
4. **Search**: keyword search inside a topic (and ideally global search across everything).
5. **Manual question entry**: paste/add a new question directly into a specific topic.
6. **CRUD**: every question can be **Added, Edited, Deleted**.
7. **Structured storage**: every question is stored as a well-defined **JSON object**, persisted in a real database (not just localStorage — this is the point of moving to Turso).
8. **Custom Quiz Builder**: pick any combination of subjects/topics → generate an on-the-fly quiz → practice immediately, get scored.
9. **Bulk Exam Import**: when a *new real exam* happens (e.g., 100 mixed questions across Hindi/English/Math/History/Geography), you should be able to:
   - Upload one JSON file containing all 100 raw questions.
   - Go through them **one by one (or in batch)** and manually assign each to the correct Subject → Topic.
   - Once assigned, they merge permanently into the main PYQ database, appearing in that topic's list from then on.
10. Hosting: **Vercel**. Database: **Turso** (libSQL, SQLite-compatible, edge-friendly — a good fit for Vercel's serverless model).
11. Security must be considered throughout (this is a personal tool, but it will be public-facing on a URL, so it still needs basic hardening).

---

## 2. Why this stack

| Concern | Choice | Reasoning |
|---|---|---|
| Hosting | **Vercel** | Zero-config deploys from Git, free tier is generous, native support for serverless/edge functions, works perfectly with static HTML + API routes. |
| Database | **Turso** | SQLite-compatible (so you can also run/test locally with a plain `.db` file), globally replicated, has a generous free tier, official `@libsql/client` SDK works great in serverless functions. Much simpler than provisioning Postgres for a single-user app. |
| Frontend | **Plain HTML + CSS + Vanilla JS** (no framework) | You asked for "an HTML website." A framework (React/Next.js) is *optional* — see §9 for a note on when it's worth adding one. Vanilla JS keeps the mental model simple and matches your prior localStorage-based tracker app experience, just now talking to a real API instead of `localStorage`. |
| Backend | **Vercel Serverless Functions** (`/api/*.js`, Node.js runtime) | These functions call Turso directly. No separate backend server needed — Vercel deploys the frontend and the API together from one repo. |
| Auth | **Simple password-gated admin actions** (see §7) | You are the only writer; readers (quiz-takers) can be public or also gated, your choice. No need for a full user-accounts system unless you want multiple people using it. |

This is a **3-tier architecture**: Static frontend (HTML/CSS/JS) → Vercel serverless API → Turso database. No component of this requires a paid plan to get started.

---

## 3. Data Model

Everything the UI does is really just CRUD + querying over four entities:

```
Subject 1 ──< Topic 1 ──< Question
                              ^
                              |
                        (many-to-many via tags, optional)

ExamImportBatch 1 ──< StagedQuestion  (temporary, pre-triage holding area)

QuizAttempt (records of quizzes you've taken, for progress tracking)
```

### 3.1 Canonical Question JSON format (this is your "specific format")

This is the object that gets stored in the database (as a JSON blob column, **and** normalized into relational columns for fast querying — details in §4). Treat this schema as the single source of truth for both manual entry and bulk import.

```json
{
  "id": "q_00042",
  "subject_id": "history",
  "topic_id": "history_18th_century_revolutions",
  "question_text": "फ्रांसीसी क्रांति की शुरुआत किस वर्ष हुई थी?",
  "question_type": "mcq",
  "options": [
    { "key": "A", "text": "1776" },
    { "key": "B", "text": "1789" },
    { "key": "C", "text": "1804" },
    { "key": "D", "text": "1815" }
  ],
  "correct_option": "B",
  "explanation": "फ्रांसीसी क्रांति 1789 में शुरू हुई थी, जब बास्तील का पतन हुआ।",
  "exam_source": "Vanpal Bharti Pariksha 2024",
  "exam_year": 2024,
  "difficulty": "medium",
  "tags": ["revolution", "france", "18th-century"],
  "created_at": "2026-09-26T10:00:00Z",
  "updated_at": "2026-09-26T10:00:00Z"
}
```

Notes on each field:
- `id`: generated server-side (e.g., `q_` + a short unique id — `nanoid` is fine).
- `question_type`: `"mcq"` for now; keep this field so you can add `"true_false"` or `"fill_blank"` later without breaking old data.
- `options`: always an array of `{key, text}` even if you later support non-MCQ types (empty array in that case).
- `exam_source` / `exam_year`: this is what lets you trace every question back to *which real exam* it came from — critical for a PYQ archive.
- `tags`: free-form, useful for cross-cutting search independent of the subject/topic hierarchy.

### 3.2 Subject / Topic JSON format

```json
{
  "id": "history",
  "name": "History",
  "icon": "🏛️",
  "order": 3
}
```

```json
{
  "id": "history_18th_century_revolutions",
  "subject_id": "history",
  "name": "18th Century Revolutions",
  "description": "American, French, and related revolutions of the 1700s",
  "order": 1
}
```

Keeping Subjects and Topics as simple, editable records (not hardcoded in the frontend) means you can add a new topic ("Geography → Rajasthan Physical Features") purely through the admin UI, no code changes.

### 3.3 Bulk Exam Import JSON format (the "new exam happened" format)

This is intentionally **looser** than the canonical format — at import time you don't yet know which topic each question belongs to. That is exactly what the manual-triage step (§6.4) is for.

```json
{
  "exam_source": "Vanpal Bharti Pariksha 2026 - Mock Test 3",
  "exam_year": 2026,
  "questions": [
    {
      "question_text": "राजस्थान का सबसे ऊँचा शिखर कौन सा है?",
      "options": [
        { "key": "A", "text": "गुरु शिखर" },
        { "key": "B", "text": "आबू पर्वत" },
        { "key": "C", "text": "सज्जनगढ़" },
        { "key": "D", "text": "तारागढ़" }
      ],
      "correct_option": "A",
      "explanation": null,
      "suggested_subject": "Geography"
    }
  ]
}
```

`suggested_subject` is optional — if the exam's own source material grouped things loosely (e.g., "Section B: Geography"), you can carry that hint over so the triage screen can pre-filter/pre-sort, saving you time. It is *not* trusted as final — you still confirm the exact topic manually.

---

## 4. Database Schema (Turso / SQLite)

Turso speaks standard SQL. Recommended schema:

```sql
CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  topic_id TEXT NOT NULL REFERENCES topics(id),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  options_json TEXT NOT NULL,        -- serialized JSON array
  correct_option TEXT,
  explanation TEXT,
  exam_source TEXT,
  exam_year INTEGER,
  difficulty TEXT DEFAULT 'medium',
  tags_json TEXT DEFAULT '[]',       -- serialized JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_text ON questions(question_text); -- helps LIKE search

CREATE TABLE import_batches (
  id TEXT PRIMARY KEY,
  exam_source TEXT,
  exam_year INTEGER,
  uploaded_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending'      -- pending | in_progress | completed
);

CREATE TABLE staged_questions (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_option TEXT,
  explanation TEXT,
  suggested_subject TEXT,
  assigned_subject_id TEXT,          -- NULL until you triage it
  assigned_topic_id TEXT,            -- NULL until you triage it
  status TEXT DEFAULT 'unassigned'   -- unassigned | assigned | discarded
);

CREATE TABLE quiz_attempts (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  subject_ids_json TEXT,   -- which subjects/topics were selected
  topic_ids_json TEXT,
  question_count INTEGER,
  score INTEGER,
  answers_json TEXT        -- record of what was answered, for review
);
```

**Why `options_json` / `tags_json` as TEXT columns instead of a separate table?** For a personal MCQ-only app, storing the small nested arrays as JSON text inside the row is simpler and just as fast at this scale (hundreds to a few thousand questions). If this ever grows into thousands of questions with heavy analytics needs, normalize `options` into their own table — not necessary now.

**Why keep `staged_questions` separate from `questions`?** This is the mechanism that implements your "upload → manually divide → arrange → merge" workflow cleanly:
- Raw upload lands in `staged_questions` (nothing touches the real PYQ archive yet).
- You triage each row (assign subject_id + topic_id).
- A "Commit Batch" action copies all `assigned` rows from `staged_questions` into `questions`, then marks the batch `completed`.
- If you get interrupted halfway through triaging 100 questions, your progress is safely persisted in `staged_questions.status` — you can resume anytime.

---

## 5. Application Architecture

### 5.1 Folder structure (Vercel project)

```
pyq-quiz-app/
├── public/
│   ├── index.html              (Home: subject cards)
│   ├── subject.html            (Topic list for a subject)
│   ├── topic.html              (PYQ list + search, for one topic)
│   ├── question-form.html      (Add/Edit question)
│   ├── import.html             (Bulk JSON upload + triage screen)
│   ├── quiz-builder.html       (Select subjects/topics → generate quiz)
│   ├── quiz-runner.html        (Take the quiz)
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js              (fetch() wrapper for all API calls)
│       ├── home.js
│       ├── subject.js
│       ├── topic.js
│       ├── question-form.js
│       ├── import.js
│       ├── quiz-builder.js
│       └── quiz-runner.js
├── api/
│   ├── subjects.js             (GET, POST)
│   ├── subjects/[id].js        (PUT, DELETE)
│   ├── topics.js                (GET, POST)
│   ├── topics/[id].js          (PUT, DELETE)
│   ├── questions.js             (GET with filters/search, POST)
│   ├── questions/[id].js        (GET, PUT, DELETE)
│   ├── import/upload.js         (POST — parses JSON, inserts into staged_questions)
│   ├── import/[batchId]/staged.js   (GET staged rows for a batch)
│   ├── import/assign.js         (POST — assign one staged row to subject+topic)
│   ├── import/commit.js         (POST — moves assigned rows into `questions`)
│   ├── quiz/generate.js         (POST — random selection based on filters)
│   └── quiz/submit.js           (POST — score + save attempt)
├── lib/
│   ├── db.js                    (Turso client singleton)
│   └── auth.js                  (admin-check middleware, see §7)
├── package.json
└── vercel.json
```

This is deliberately **file-based routing under `/api`**, which is exactly how Vercel Serverless Functions work — each file becomes an endpoint automatically, no extra routing framework needed.

### 5.2 Request flow example: opening a Topic page

```
Browser (topic.html?topic_id=history_18th_century_revolutions)
   │
   ▼
topic.js runs on page load
   │  fetch(`/api/questions?topic_id=history_18th_century_revolutions`)
   ▼
Vercel Function api/questions.js
   │  db.execute("SELECT * FROM questions WHERE topic_id = ?", [topic_id])
   ▼
Turso (libSQL) returns rows
   │
   ▼
api/questions.js maps rows → JSON array of Question objects → sends response
   │
   ▼
topic.js renders each question as a card in the DOM
```

Search works the same way, just with an extra `?q=keyword` param that becomes a `WHERE question_text LIKE '%keyword%'` clause (parameterized, never string-concatenated — see §7.3).

---

## 6. Feature-by-Feature Logic

### 6.1 Home → Subject → Topic navigation
- `index.html` calls `GET /api/subjects` on load, renders one large clickable card per subject (icon + name), sorted by `sort_order`.
- Clicking a card navigates to `subject.html?subject_id=X`.
- `subject.html` calls `GET /api/topics?subject_id=X`, renders topic cards/list.
- Clicking a topic navigates to `topic.html?topic_id=Y`.
- `topic.html` calls `GET /api/questions?topic_id=Y`, renders the PYQ list.

### 6.2 Search
- A search box on `topic.html` calls `GET /api/questions?topic_id=Y&q=keyword` on keystroke (debounced ~300ms) or on Enter.
- For a **global** search box (optional, recommended), add it to the home page: `GET /api/questions?q=keyword` (no topic filter) — searches across the whole archive and shows results grouped by subject/topic so you can jump straight to any question regardless of where it lives.

### 6.3 Add / Edit / Delete a question
- "Add Question" button on `topic.html` opens `question-form.html?topic_id=Y` (topic pre-filled).
- Form fields map 1:1 to the canonical JSON schema (§3.1): question text, 4 options, correct option, explanation, exam source, exam year, difficulty, tags.
- Submit → `POST /api/questions` with the JSON body → server generates `id`, `created_at`, `updated_at`, inserts row.
- "Edit" on any question card opens the same form pre-filled → `PUT /api/questions/:id` on submit.
- "Delete" → confirm dialog → `DELETE /api/questions/:id`.

### 6.4 Bulk Exam Import + Manual Triage (the core "new exam" workflow)

This is the most involved feature, so here is the full step-by-step logic:

**Step 1 — Upload.** On `import.html`, you paste/upload a JSON file matching the "Bulk Exam Import" format (§3.3). Frontend sends it to `POST /api/import/upload`.

**Step 2 — Server-side staging.** The endpoint:
1. Validates the JSON shape (rejects malformed files with a clear error — see §7.3).
2. Creates one row in `import_batches` (`exam_source`, `exam_year`, `status = 'pending'`).
3. Inserts every question from the file into `staged_questions`, linked to that `batch_id`, `status = 'unassigned'`.
4. Returns the new `batch_id`.

**Step 3 — Triage UI.** The frontend redirects to `import.html?batch_id=Z`, which calls `GET /api/import/Z/staged` and shows a **one-question-at-a-time** (or a table, your choice) triage screen:
- Question text + options displayed for reference.
- Two dropdowns: **Subject** → **Topic** (topic dropdown populates based on chosen subject, exactly like a dependent-select).
- If `suggested_subject` was present in the upload, that dropdown is pre-selected as a starting guess — you just confirm or override it.
- "Assign" button → `POST /api/import/assign` with `{staged_id, subject_id, topic_id}` → sets `assigned_subject_id`, `assigned_topic_id`, `status = 'assigned'` on that row.
- A "Discard" option exists too, for duplicate/junk questions you don't want to keep (`status = 'discarded'`).
- A progress bar shows "42 / 100 triaged" so you can stop and resume across sessions — nothing is lost, since state lives in the DB, not in memory.

**Step 4 — Commit.** Once you're done (or even partway, if you want to commit incrementally), click "Commit Batch." This calls `POST /api/import/commit` with `{batch_id}`:
1. Selects all `staged_questions` where `batch_id = Z AND status = 'assigned'`.
2. For each, generates a canonical `questions` row (new `id`, `exam_source`/`exam_year` carried over from the batch, `created_at`/`updated_at` = now) and inserts it.
3. Marks those staged rows `status = 'committed'` (so they won't be re-committed if you click twice) or deletes them, your preference — **recommendation: keep them with a `committed` status, don't delete**, so `staged_questions` also serves as an audit trail of "which raw upload produced which final question."
4. Marks the `import_batches.status = 'completed'` once every row is either `committed` or `discarded`.

From this point on, those questions appear exactly like any manually-entered PYQ — same table, same search, same topic pages.

### 6.5 Custom Quiz Builder
- `quiz-builder.html` calls `GET /api/subjects` and `GET /api/topics` to render a **multi-select checklist**: pick any combination of subjects and/or specific topics (e.g., "all of Math" + "just one History topic").
- Also lets you pick: number of questions, and optionally difficulty filter.
- "Start Quiz" → `POST /api/quiz/generate` with `{subject_ids, topic_ids, count, difficulty}`.
- Server logic: `SELECT * FROM questions WHERE topic_id IN (...) OR subject_id IN (...) ORDER BY RANDOM() LIMIT :count` (parameterized), returns the question set **without the `correct_option` field** (strip it server-side before sending to the browser — see §7.4, this matters for security/integrity even in a single-user app, since it prevents accidentally reading the answer in the browser dev tools before answering).
- `quiz-runner.html` renders one question at a time (or all at once, your choice), collects your answers client-side.
- On finish, `POST /api/quiz/submit` with `{question_ids, submitted_answers}` → server re-fetches correct answers from DB, computes score, stores a `quiz_attempts` row, returns `{score, correct_answers, per_question_result}` so the results page can show a full review (what you got right/wrong, with explanations).

This "strip the answer server-side, re-check server-side on submit" pattern is a standard quiz-app security practice — it's cheap to implement and prevents any possibility of seeing answers early, even accidentally.

---

## 7. Security Plan

Even though this is a personal tool, once it's live on a public Vercel URL, anyone who finds the link can hit your API. Treat these as required, not optional:

### 7.1 Admin authentication for write actions
- All **write** endpoints (`POST/PUT/DELETE` on questions/topics/subjects, and all `/api/import/*` routes) must check a shared secret.
- Simplest robust approach: a single `ADMIN_PASSWORD` stored as a **Vercel Environment Variable** (never hardcoded, never committed to Git). Your admin pages (`question-form.html`, `import.html`) prompt for this password once, store it in a short-lived way (e.g., an httpOnly session cookie set by a `/api/login` endpoint after checking the password), and every write request is checked server-side via `lib/auth.js`.
- **Read-only** endpoints (viewing subjects/topics/questions, taking quizzes) can stay public — that's the "quiz website" experience, no login needed just to practice.
- Do not implement your own password hashing scheme from scratch if you can avoid it; for a single static admin password, a constant-time string comparison (`crypto.timingSafeEqual` in Node) against the env var is sufficient and avoids the complexity of a full user/password-hash system.

### 7.2 Environment variables (never hardcode secrets)
```
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=eyJ...
ADMIN_PASSWORD=<your chosen password>
SESSION_SECRET=<random 32+ char string, for signing the login cookie>
```
Set these in Vercel's Project Settings → Environment Variables, and in a local `.env.local` (added to `.gitignore`) for development. **Never** commit `.env.local` or paste real tokens into any file that goes to GitHub.

### 7.3 Input validation & injection prevention
- **SQL injection**: always use parameterized queries (`db.execute("... WHERE id = ?", [id])`), never string concatenation/template literals to build SQL. The `@libsql/client` SDK supports this natively.
- **JSON upload validation**: before inserting anything from an uploaded exam file, validate its structure (a small schema-validation function or a library like `zod`) — reject files missing `question_text`/`options`, cap the number of questions per upload (e.g., 500) to avoid abuse, and reject files above a reasonable size (e.g., 2 MB).
- **XSS**: when rendering question text/options into the DOM, never use `innerHTML` with raw user/DB content directly — use `textContent`, or if you need light formatting, sanitize with a library (e.g., DOMPurify) before any `innerHTML` use. This matters because question text is user-supplied (by you, but still — good habit, and matters more if you ever let others contribute).

### 7.4 Don't leak answers to the client
- As noted in §6.5, quiz-generation responses must strip `correct_option` and `explanation` server-side, only sending them back after `/api/quiz/submit` is called.

### 7.5 Rate limiting (basic)
- Vercel's free tier doesn't include built-in rate limiting, but a lightweight approach — a simple in-memory or Turso-backed counter per IP on write/login endpoints — prevents naive brute-forcing of `ADMIN_PASSWORD`. Given this is a low-traffic personal tool, even a basic "max 5 login attempts per 10 minutes" check is enough; don't over-engineer this.

### 7.6 HTTPS & CORS
- Vercel serves everything over HTTPS by default — nothing to configure.
- Since frontend and API live in the same Vercel project/domain, you generally don't need CORS headers at all (same-origin requests). Only add CORS headers if you later split the frontend to a different domain.

### 7.7 Backups
- Turso supports point-in-time recovery / branching on paid tiers, but on the free tier, **schedule your own backups**: a small script (run manually or via a GitHub Action on a cron schedule) that dumps all tables to a JSON file and commits it to a private repo or uploads it somewhere safe. Given this database *is* your exam prep work, treat backups as non-negotiable, not an afterthought.

---

## 8. API Endpoint Reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/subjects` | Public | List all subjects |
| POST | `/api/subjects` | Admin | Create a subject |
| PUT | `/api/subjects/:id` | Admin | Rename/reorder a subject |
| DELETE | `/api/subjects/:id` | Admin | Delete a subject (cascade to topics/questions — confirm before calling!) |
| GET | `/api/topics?subject_id=` | Public | List topics for a subject |
| POST | `/api/topics` | Admin | Create a topic |
| PUT / DELETE | `/api/topics/:id` | Admin | Edit / delete a topic |
| GET | `/api/questions?topic_id=&q=&subject_id=` | Public | List/search questions |
| POST | `/api/questions` | Admin | Add a question |
| GET / PUT / DELETE | `/api/questions/:id` | Public read / Admin write | Single question ops |
| POST | `/api/import/upload` | Admin | Upload raw exam JSON → creates a batch + staged rows |
| GET | `/api/import/:batchId/staged` | Admin | List staged (untriaged) questions for a batch |
| POST | `/api/import/assign` | Admin | Assign one staged question to subject+topic |
| POST | `/api/import/commit` | Admin | Move all assigned staged rows into the main `questions` table |
| POST | `/api/quiz/generate` | Public | Generate a quiz set (answers stripped) from chosen filters |
| POST | `/api/quiz/submit` | Public | Score a completed quiz, save attempt, return review |
| POST | `/api/login` | Public | Check admin password, set session cookie |

---

## 9. When (if ever) to add a frontend framework

You asked for "an HTML website," and the plan above delivers exactly that — plain HTML/CSS/JS, no build step, deployable to Vercel as-is. This is the right starting point.

Consider migrating to a framework (e.g., Next.js, still deployed on Vercel) **only if** you find yourself fighting one of these specific pains once the app is running:
- Manually keeping multiple HTML pages in sync (shared header/nav) becomes tedious → a framework's component reuse solves this.
- The triage screen (§6.4) needs more complex, fast-updating interactivity (e.g., keyboard-shortcut-driven rapid triage of 100 questions) → a framework's state management makes this easier than hand-rolled DOM updates.

Don't add this complexity preemptively — the vanilla approach is fully sufficient for the feature set described here.

---

## 10. Implementation Roadmap (suggested order)

1. **Turso setup**: create account, `turso db create pyq-quiz-db`, get URL + auth token, run the schema in §4 via `turso db shell`.
2. **Vercel project skeleton**: `vercel init` (or just a fresh Git repo + `vercel link`), confirm env vars are wired up, deploy a trivial "Hello World" `api/health.js` to confirm Turso connectivity end-to-end before building anything else.
3. **Subjects & Topics CRUD** (simplest slice, proves the DB + API + frontend loop works): home page, subject page, basic admin forms to add subjects/topics.
4. **Questions CRUD + Topic page + Search**: the heart of the "browse PYQs" experience.
5. **Admin login** (§7.1): gate the write endpoints before you go further, so the rest of the build happens against a properly secured API.
6. **Bulk Import + Triage** (§6.4): the most complex feature — build and test with a small (5-10 question) sample file first, before feeding it a real 100-question exam.
7. **Quiz Builder + Runner + Scoring** (§6.5): this is what turns the archive into a practice tool.
8. **Security pass**: input validation on all forms, rate limiting on login, backup script.
9. **Polish**: sorting, difficulty tagging, progress stats (e.g., "questions attempted this week"), dark mode, etc. — genuinely optional, add only what you'll actually use.

Each numbered stage is independently deployable and testable — you'll have a working (if incomplete) site on Vercel from step 3 onward, which makes debugging much easier than building everything locally before a first deploy.

---

## 11. Summary

- **Storage**: every question is a well-defined JSON object (§3.1), persisted in Turso across `subjects` / `topics` / `questions` tables (§4).
- **Browsing**: Home → Subject → Topic → PYQ list, each level a simple `GET` call.
- **Editing**: full CRUD via authenticated `POST/PUT/DELETE` endpoints.
- **New exam workflow**: upload → `staged_questions` (safe holding area) → manual triage (assign subject+topic per question, resumable) → commit → merges into the permanent archive.
- **Quizzing**: pick subjects/topics → server generates a randomized, answer-stripped question set → you answer → server scores and stores the attempt.
- **Security**: env-var secrets, admin-gated writes, parameterized SQL, validated uploads, answers never sent to the client early, basic rate limiting, and a real backup habit.

This plan gives you a complete, buildable path from an empty repo to a working, secure, personally-hosted PYQ archive and quiz engine.
