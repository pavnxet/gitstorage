# Prashn-Kosh (प्रश्न कोश) Master Full-Stack Quality & Security Bug Report

**Author**: Bug Hunter 5 — Master Audit Synthesizer & Compiler  
**Specialist Reports Synthesized**:
1. Frontend UI & Mobile Responsiveness: `hunter_r1_frontend/report.md` (20 Bugs)
2. Backend API Security & Error Resiliency: `hunter_r2_backend/report.md` (19 Bugs)
3. Question Ingestion & Multi-Topic Pipeline: `hunter_r3_ingestion/report.md` (14 Bugs)
4. Quiz Engine & Scoring Integrity: `hunter_r4_quiz/report.md` (23 Bugs)  
**Date**: 2026-09-26  
**Status**: Authoritative Master Audit Synthesis — 100% Bug Coverage (76 Specialist Findings Harmonized into 70 Unique Master Entries)

---

## 1. Executive Summary & Audit Scorecard

### 1.1 Context & Purpose
Prashn-Kosh (प्रश्न कोश) is a specialized Hindi-medium Previous Year Question (PYQ) repository, multi-topic question ingestion engine, and Computer-Based Testing (CBT) quiz platform engineered for Rajasthan state competitive examinations (including RAS, REET, CET, Patwar, Police Constable, Vanpal/Vandrakshak, Teacher Grade II & III, and College Lecturer).

An exhaustive, multi-agent code audit was executed across the entire full-stack architecture: all 9 client HTML views, 11 frontend JavaScript controllers, global stylesheets, backend HTTP server, REST API route handlers, Turso libSQL database operations, bulk question ingestion pipelines, fuzzy smart search algorithms, and the interactive quiz evaluation engine.

### 1.2 Master Severity Scorecard

Across the 4 specialized audit domains, **76 total defects and security vulnerabilities** were identified. Through cross-cutting analysis, **6 duplicate cross-subsystem defects** were deduplicated and harmonized into unified master findings, resulting in **70 authoritative master bug entries**:

| Severity | Frontend UI | Backend API | Ingestion Pipeline | Quiz Engine | Deduplicated Master Total | Primary Impact Summary |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **Critical** | 1 | 4 | 3 | 4 | **12** | Complete score spoofing, auth bypass via cookie mismatch, DoS via unindexed Levenshtein search, server crash on unhandled URL exceptions, cross-subject topic collision, non-transactional batch corruption, duplicate question mark inflation, RPSC Option E penalization & negative mark inversions. |
| **High** | 6 | 4 | 3 | 7 | **18** | SQL OR filter topic bypass, zero deduplication mechanics, unstyled UI tabs, mobile grid layout crushing, modal z-index inversion, uncaught DOM null exceptions, insecure localStorage crash in private browsing, unhandled URLErrors, timer background stalling, 1/3 negative marking rounding drift. |
| **Medium** | 8 | 7 | 5 | 8 | **26** | Sub-44px touch targets, modal background scroll chaining, option highlight class mismatch, search highlight entity corruption, information leakage in 500 errors, silent 200 OK deletes, missing vocab cache invalidation, biased option shuffling, untracked quiz attempt modes, search quiz question drops. |
| **Low** | 5 | 3 | 3 | 4 | **14** | Undefined CSS custom properties, floating toast overflow, trailing slash routing 404s, SQLite foreign key enforcement omission, SQL wildcard search injection, ghost import batches, 4-option keyboard shortcut limit, retry button stale timestamp leak. |
| **Total** | **20** | **19** | **14** | **23** | **70** | **100% of discovered bugs accounted for with reproduction steps and code patches.** |

---

### 1.3 Subsystem Breakdown & Architectural Risk Assessment

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRASHN-KOSH ARCHITECTURE                        │
├────────────────────────────────┬───────────────────────────────────────┤
│ Frontend UI & Mobile (20 bugs) │ Backend Security & Routing (19 bugs)  │
│ - Results keydown leak (Crit)  │ - Admin auth bypass / cookie mis. (Cr)│
│ - Unstyled tabs & mobile crush │ - DoS Levenshtein search loop (Crit)  │
│ - Modal z-index & scroll locks │ - URL/Host server crash (Crit)        │
│ - Safari private mode crash    │ - Unhandled TypeErrors on non-strings │
├────────────────────────────────┼───────────────────────────────────────┤
│ Ingestion Pipeline (14 bugs)   │ Quiz Engine & Scoring (23 bugs)       │
│ - Cross-subject topic collision│ - Score spoofing via shuffled_options │
│ - Non-atomic batch chunks (Cr) │ - Duplicate question ID inflation (Cr)│
│ - Zero deduplication checks    │ - Negative penalty inversion (Crit)   │
│ - Option normalization bypass  │ - RPSC Option E & blank rules violated│
└────────────────────────────────┴───────────────────────────────────────┘
```

#### 1. Security & Authentication Architecture: CRITICAL RISK
- **Cookie Name Disconnect**: `auth-login.js` sets `prashn_admin_token`, but `auth.js` checks `cookies.vanpal_admin_token`. As a result, standard browser cookie authentication never works; the application relies on returning plaintext `ADMIN_PASSWORD` in JSON response bodies stored in browser `localStorage`.
- **Arbitrary Score Spoofing**: `POST /api/quiz/submit` blindly trusts client-provided `shuffled_options` mappings, client-provided `started_at` timestamps, and arbitrary `marks_per_question` and `negative_mark` parameters (including negative numbers).

#### 2. System Availability & Denial of Service: CRITICAL RISK
- **Synchronous CPU Exhaustion**: Smart search queries execute a full table scan (`SELECT * FROM questions`) without a `LIMIT`, tokenizes hundreds of thousands of words, and executes synchronous $O(N \times M)$ quadratic Levenshtein distance computations on the single-threaded Node.js event loop whenever an exact match is missing.
- **Uncaught Process-Level Crashes**: Unhandled `new URL()` exceptions on malformed Host headers or URL percent-encoding, unhandled file stream read errors, and unhandled `URIError` exceptions in cookie parsing terminate the Node.js process.

#### 3. Data Ingestion & Database Integrity: CRITICAL RISK
- **Global Numeric Topic Collisions**: `topicsByNumber` is keyed by raw chapter number (`1`, `2`, `3`) without subject namespacing. Later subjects in the database row set overwrite earlier subjects, systematically routing science or history questions to psychology topics.
- **Non-Atomic Batch Chunks & Duplicate Bloat**: Batch operations slice statements into independent 100-statement `db.batch()` calls without a wrapping transaction. If chunk 2 fails, chunk 1 remains committed, and user retries produce duplicate rows. There is zero deduplication logic or uniqueness constraints.

#### 4. Examination & CBT Scoring Standards: CRITICAL RISK
- **RPSC / RSMSSB 5th Option Violation**: Rajasthan competitive exams mandate 5 options with Option E ("अनुत्तरित प्रश्न / Not Attempted"). Blank questions must incur a 1/3 penalty, and >10% blanks cause automatic disqualification. Prashn-Kosh only supports 4 options, applies zero penalty to blanks, and penalizes candidates with negative marks if they choose Option E.

---

### 1.4 Cross-Cutting Harmonization & Deduplication Matrix

Six significant vulnerabilities were discovered concurrently by multiple specialists. They have been unified in the master catalog as follows:

| Unified Master Entry | Specialist IDs | Affected File(s) | Harmonized Severity | Resolution / Unified Scope |
|---|---|---|:---:|---|
| **BUG-CRIT-06** | `BUG-BE-05` / `BUG-ING-02` | `questions-bulk.js:267-272`, `import-commit.js:90-95` | **Critical** | Unified non-transactional `db.batch()` chunking leading to partial commits, data corruption, and duplicate bloat upon retry. |
| **BUG-CRIT-10** | `BUG-QZ-18` / `BUG-ING-07` | `quiz-submit.js:76-87`, `questions-bulk.js:21-25` | **Critical** | Unified RPSC Option E ("अनुत्तरित प्रश्न") handling: prevents negative marking on Option E, enforces blank penalties, and manages 5-option ingestion. |
| **BUG-CRIT-11** | `BUG-QZ-19` / `BUG-BE-06` | `quiz-submit.js:20-23, 102-109, 116-130` | **Critical** | Unified client-controlled scoring manipulation: prevents negative `negative_mark` inputs from awarding positive bonus marks. |
| **BUG-MED-12** | `BUG-BE-12` / `BUG-ING-14` | `import-commit.js:90-108`, `question-id.js:54-129` | **Medium** | Unified missing vocabulary cache invalidation across batch commits, question updates, and question deletions. |
| **BUG-MED-15** | `BUG-BE-15` / `BUG-ING-11` | `lib/http-utils.js:18-20`, `server.js:179-183` | **Medium** | Unified streaming payload abort: ensures `req.pause()`, `req.destroy()`, and returning HTTP 413 instead of HTTP 500 on >5MB bodies. |
| **BUG-MED-19** | `BUG-QZ-02` / `BUG-BE-16` | `lib/handlers/quiz-generate.js:98-99` | **Medium** | Unified pseudo-random option shuffling: replaces biased `Math.random() - 0.5` with Fisher-Yates shuffle. |

---

## 2. Comprehensive Bug Catalog

The bug catalog is strictly ordered from **Critical** to **Low**. Every entry contains its Master ID, Subsystem, Affected Files, Exact Lines, Root Cause Analysis, Steps to Reproduce, and Suggested Code Patch.

---

### Tier 1: Critical Severity Vulnerabilities (12 Bugs)

---

#### BUG-CRIT-01: Critical Event Listener Leak on Results Page Allowing Duplicate Submissions and Background State Mutation
- **Specialist Ref**: `BUG-FE-01`
- **Subsystem**: Frontend UI / Quiz Runner
- **Affected File & Line Number(s)**: `public/js/quiz-runner.js`, lines 391–454, 526–537
- **Root Cause Analysis**:
  In `quiz-runner.js`, `setupKeyboardShortcuts()` binds a global `keydown` event listener to `window`. When a quiz finishes and `showResults()` hides `#view-active-quiz` and displays `#view-results`, this window listener remains permanently attached. 
  When a candidate reviews solutions on the results screen and presses `Enter`, line 398 detects `e.key === 'Enter'` and executes `submitQuiz()`. This triggers a confirmation dialog or resubmits the quiz over the network (`api.post('/api/quiz/submit')`), generating duplicate attempts in the database. Furthermore, pressing `c` deletes submitted answers and re-renders hidden question cards while on the results screen.
- **Steps to Reproduce**:
  1. Complete and submit any quiz on `/quiz-runner.html`.
  2. On the scorecard view (`#view-results`), press the `Enter` key.
  3. **Observed**: A confirmation prompt pops up asking to submit the quiz again, or network traffic shows a duplicate `POST /api/quiz/submit`.
- **Suggested Fix / Code Patch**:
  ```javascript
  // public/js/quiz-runner.js
  let keydownHandler = null;
  function setupKeyboardShortcuts() {
    removeKeyboardShortcuts();
    keydownHandler = (e) => {
      if (viewResults && viewResults.style.display !== 'none') return;
      const activeTag = document.activeElement ? document.activeElement.tagName.toUpperCase() : '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        if (currentIndex < questions.length - 1) {
          currentIndex++;
          renderCurrentQuestion();
        } else {
          submitQuiz();
        }
      }
    };
    window.addEventListener('keydown', keydownHandler);
  }
  function removeKeyboardShortcuts() {
    if (keydownHandler) {
      window.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
  }
  // In showResults():
  function showResults(data) {
    removeKeyboardShortcuts();
    stopTimer();
    // ...
  }
  ```

---

#### BUG-CRIT-02: Admin Authentication Bypass & Cookie Name Mismatch Between `auth-login.js` and `auth.js`
- **Specialist Ref**: `BUG-BE-01`
- **Subsystem**: Backend API / Security & Auth
- **Affected File & Line Number(s)**: `lib/auth.js:34`, `lib/handlers/auth-login.js:23-25, 30`
- **Root Cause Analysis**:
  Upon successful login, `auth-login.js` sets an HTTP-only cookie named `prashn_admin_token`:
  ```javascript
  res.setHeader('Set-Cookie', [`prashn_admin_token=${encodeURIComponent(ADMIN_PASSWORD)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`]);
  ```
  However, `verifyAdmin()` in `lib/auth.js` verifies admin cookies using a legacy name `cookies.vanpal_admin_token`:
  ```javascript
  const cookies = parseCookies(req);
  if (cookies.vanpal_admin_token && safeCompare(cookies.vanpal_admin_token, ADMIN_PASSWORD)) return true;
  ```
  Because the cookie names do not match, standard cookie-based authentication fails on every request. The frontend works around this by having `auth-login.js` leak the plaintext `ADMIN_PASSWORD` in the JSON response body (`token: ADMIN_PASSWORD`), which the frontend stores in browser `localStorage`, exposing master admin credentials to any XSS exploit.
- **Steps to Reproduce**:
  1. Send `POST /api/auth/login` with body `{"password": "admin"}`.
  2. Inspect response: `Set-Cookie: prashn_admin_token=admin...` is received.
  3. Send `POST /api/subjects` with header `Cookie: prashn_admin_token=admin` without authorization headers.
  4. Notice the request fails with `401 Unauthorized: Admin authentication required.`
- **Suggested Fix / Code Patch**:
  ```diff
  --- a/lib/auth.js
  +++ b/lib/auth.js
  @@ -33,4 +33,4 @@ function verifyAdmin(req) {
     const cookies = parseCookies(req);
  -  if (cookies.vanpal_admin_token && safeCompare(cookies.vanpal_admin_token, ADMIN_PASSWORD)) {
  +  const cookieToken = cookies.prashn_admin_token || cookies.vanpal_admin_token;
  +  if (cookieToken && safeCompare(cookieToken, ADMIN_PASSWORD)) {
       return true;
     }
  ```

---

#### BUG-CRIT-03: Denial of Service via Synchronous Unbounded Levenshtein & In-Memory Table Scan in Smart Search
- **Specialist Ref**: `BUG-BE-02`
- **Subsystem**: Backend API / Smart Search
- **Affected File & Line Number(s)**: `lib/smart-search.js:37-67, 155-168`, `lib/handlers/questions.js:97-107`
- **Root Cause Analysis**:
  In `questions.js`, when a search query returns 0 exact results (`result.rows.length === 0 && activeQuery.length >= 3`), it invokes `findFuzzyCorrection(activeQuery, db)`.
  In `lib/smart-search.js`:
  1. `getOrBuildVocabulary(db)` executes: `SELECT question_text, explanation, options_json, exam_source FROM questions` fetching the entire database into Node.js memory without a `LIMIT`.
  2. It tokenizes every string into words.
  3. `findFuzzyCorrection` iterates through every word and executes `levenshtein(token, vocabWord)` synchronously.
  For a vocabulary of 25,000 words and a 4-token query, this executes 100,000 quadratic matrix calculations on the Node.js event loop, freezing the single-threaded web server for seconds. Any client can send `GET /api/questions?q=nonexistent123` to cause 100% CPU denial-of-service.
- **Steps to Reproduce**:
  1. Send `GET /api/questions?q=zzzzzzzzzz`.
  2. Observe full database read and 100% CPU lockup while Node.js blocks all incoming HTTP requests.
- **Suggested Fix / Code Patch**:
  Limit vocabulary collection to indexed tags and topics rather than scanning full text dumps:
  ```diff
  --- a/lib/smart-search.js
  +++ b/lib/smart-search.js
  @@ -37,4 +37,4 @@ async function getOrBuildVocabulary(db) {
  -    const res = await db.execute(`SELECT question_text, explanation, options_json, exam_source FROM questions`);
  +    const res = await db.execute(`SELECT name as term FROM topics UNION SELECT tags_json FROM questions LIMIT 2000`);
  ```

---

#### BUG-CRIT-04: Server Crash via Unhandled URL/Host Exception and Missing Stream Error Handlers
- **Specialist Ref**: `BUG-BE-03`
- **Subsystem**: Backend Server / Server Architecture
- **Affected File & Line Number(s)**: `server.js:153, 168`
- **Root Cause Analysis**:
  1. `const parsedUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));` is executed outside any `try/catch` block. If a request provides an invalid `Host` header (e.g. `Host: bad host:3000`) or a malformed `req.url` with invalid percent-encoding, `new URL()` throws an unhandled `TypeError: Invalid URL` inside the HTTP request listener, crashing the entire Node.js server.
  2. `fs.createReadStream(filePath).pipe(res);` attaches no `'error'` event listener. If a file stream fails, Node.js emits an unhandled stream error, immediately terminating the server process.
- **Steps to Reproduce**:
  1. Send: `curl -H "Host: bad host:3000" http://localhost:3000/`.
  2. The Node process crashes with `TypeError: Invalid URL`.
- **Suggested Fix / Code Patch**:
  ```diff
  --- a/server.js
  +++ b/server.js
  @@ -151,3 +151,7 @@ function serveStaticFile(req, res, pathname) {
       res.statusCode = 200;
       res.setHeader('Content-Type', contentType);
  -    fs.createReadStream(filePath).pipe(res);
  +    const stream = fs.createReadStream(filePath);
  +    stream.on('error', (err) => {
  +      if (!res.headersSent) { res.statusCode = 500; res.end('Internal Server Error'); }
  +    });
  +    stream.pipe(res);
  @@ -167,4 +171,9 @@ const server = http.createServer(async (req, res) => {
  -  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  +  let parsedUrl;
  +  try {
  +    const hostHeader = (req.headers.host || 'localhost').replace(/[^a-zA-Z0-9.:\-_\[\]]/g, '');
  +    parsedUrl = new URL(req.url, `http://${hostHeader}`);
  +  } catch (err) {
  +    res.statusCode = 400;
  +    return res.end(JSON.stringify({ error: 'Invalid URL or Host header' }));
  +  }
  ```

---

#### BUG-CRIT-05: Unhandled TypeErrors in Handlers Causing 500 Crashes on Non-String Inputs
- **Specialist Ref**: `BUG-BE-04`
- **Subsystem**: Backend API / Input Validation
- **Affected File & Line Number(s)**: `lib/handlers/subjects.js:43`, `lib/handlers/topics.js:57`, `lib/handlers/questions-bulk.js:168, 175, 208, 233`, `lib/handlers/import-upload.js:56`, `lib/auth.js:26`
- **Root Cause Analysis**:
  Multiple handlers invoke string methods (`.trim()`, `.toLowerCase()`, `.startsWith()`) on client payload properties without verifying `typeof === 'string'`. For example, `subjects.js` executes `[id.trim(), name.trim()]`, and `questions-bulk.js` executes `q.topic_id.trim()`. If non-string values (such as `{ "id": 12345, "name": 67890 }`) are provided, Node.js throws `TypeError: ...trim is not a function`, crashing with HTTP 500 instead of returning a clean HTTP 400 validation error.
- **Steps to Reproduce**:
  1. Send `POST /api/subjects` with admin authorization and payload: `{"id": 12345, "name": 67890}`.
  2. Server responds with `500 Internal Server Error` and exposes `id.trim is not a function`.
- **Suggested Fix / Code Patch**:
  ```javascript
  const idStr = typeof id === 'string' ? id.trim() : String(id || '').trim();
  const nameStr = typeof name === 'string' ? name.trim() : String(name || '').trim();
  if (!idStr || !nameStr) {
    return sendError(res, 400, 'Subject id and name must be non-empty strings.');
  }
  ```

---

#### BUG-CRIT-06: Non-Transactional Batch Ingestion Leading to Partial Commits and Database Corruption
- **Specialist Ref**: `BUG-BE-05` / `BUG-ING-02`
- **Subsystem**: Question Ingestion / Database Transactions
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:267-272`, `lib/handlers/import-commit.js:90-95`, `lib/handlers/import-upload.js:67-71`
- **Root Cause Analysis**:
  Bulk question insertions partition SQL statements into chunks of 100 and execute each chunk via independent HTTP calls (`await db.batch(chunk, 'write')`). Each chunk commits its own independent sub-transaction. If a payload contains 250 questions and an error or network drop occurs during chunk 2 or 3, chunk 1 (the first 100 questions) remains permanently committed in the database. The user receives HTTP 500, retries the upload, and re-inserts chunk 1 questions, causing massive question duplication and orphaned staging rows.
- **Steps to Reproduce**:
  1. POST 150 questions to `/api/questions/bulk` where question 105 has an invalid schema.
  2. The request fails with 500, but questions 1–100 have already been written to the `questions` table without rollback.
- **Suggested Fix / Code Patch**:
  Execute the entire batch in a single atomic transaction or apply compensating rollbacks:
  ```diff
  --- a/lib/handlers/questions-bulk.js
  +++ b/lib/handlers/questions-bulk.js
  @@ -268,5 +268,2 @@
  -    const CHUNK_SIZE = 100;
  -    for (let i = 0; i < batchStatements.length; i += CHUNK_SIZE) {
  -      const chunk = batchStatements.slice(i, i + CHUNK_SIZE);
  -      await db.batch(chunk, 'write');
  -    }
  +    // Execute all statements atomically in a single write batch transaction
  +    await db.batch(batchStatements, 'write');
  ```

---

#### BUG-CRIT-07: Multi-Topic Number Routing Collision Across Subjects
- **Specialist Ref**: `BUG-ING-01`
- **Subsystem**: Question Ingestion / Routing Engine
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:157-164, 186-190`
- **Root Cause Analysis**:
  `topicsByNumber` is maintained as a single global Map keyed solely by numeric string (`1`, `2`, `3`). Every Rajasthan subject (Science `sci_001`–`sci_026`, Psychology `psy_001`–`psy_017`, History `hist_001`–`hist_013`) has topics ordered 1, 2, 3, etc. As rows iterate, subsequent subjects overwrite earlier subjects in `topicsByNumber`. When resolving a question with `topic: "1. दैनिक विज्ञान"` or `topic: "01"`, `topicsByNumber.get("1")` returns whichever subject was queried last in SQLite (e.g. Educational Psychology `psy_001`), routing science questions to the wrong subject.
- **Steps to Reproduce**:
  1. POST to `/api/questions/bulk` with `subject_id: 'auto'`, `topic_id: 'auto'`, and question topic `"1. दैनिक विज्ञान का आधारभूत ज्ञान"`.
  2. Inspect inserted record: routed to `psy_001_educational_psychology` instead of `sci_001_basics_everyday_science`.
- **Suggested Fix / Code Patch**:
  Key numeric matches by subject (`${subject_id}:${num}`) and scope matching to the user's selected subject:
  ```javascript
  const topicsByNumberAndSubject = new Map();
  // ...
  if (t.sort_order) topicsByNumberAndSubject.set(`${t.subject_id}:${t.sort_order}`, t);
  const idNumMatch = t.id.match(/\d+/);
  if (idNumMatch) topicsByNumberAndSubject.set(`${t.subject_id}:${parseInt(idNumMatch[0], 10)}`, t);
  ```

---

#### BUG-CRIT-08: Unhandled Non-Object/Null Elements and Unexpected Types Crash Ingestion with 500
- **Specialist Ref**: `BUG-ING-03`
- **Subsystem**: Question Ingestion / Input Validation
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:207-210, 233`, `lib/handlers/import-upload.js:40-43, 56`
- **Root Cause Analysis**:
  In `questions-bulk.js`:
  ```javascript
  for (const q of questions) {
    const rawText = (q.question_text || q.hi || q.question || '').trim();
    const explanation = (q.explanation || '').trim();
  ```
  If `questions` contains a null element (e.g. `[null]`), `q.question_text` throws `TypeError: Cannot read properties of null`. If `q.question_text` is numeric (e.g. `1857`), `(1857).trim()` throws `TypeError: trim is not a function`. The handler catches this and returns 500 instead of skipping or validating.
- **Steps to Reproduce**:
  1. POST to `/api/questions/bulk` with `"questions": [null, {"question_text": 1857, "options": ["A","B"]}]`.
  2. Server returns HTTP 500: `Cannot read properties of null (reading 'question_text')`.
- **Suggested Fix / Code Patch**:
  ```javascript
  for (const q of questions) {
    if (!q || typeof q !== 'object') continue;
    const rawCandidate = q.question_text ?? q.hi ?? q.question ?? '';
    const rawText = typeof rawCandidate === 'string' ? rawCandidate.trim() : String(rawCandidate).trim();
    if (!rawText) continue;
    const expVal = q.explanation ?? '';
    const explanation = typeof expVal === 'string' ? expVal.trim() : String(expVal).trim();
  ```

---

#### BUG-CRIT-09: Untrusted Client `shuffled_options` Allows 100% Score Spoofing
- **Specialist Ref**: `BUG-QZ-05`
- **Subsystem**: Quiz Engine / Scoring Integrity
- **Affected File & Line Number(s)**: `lib/handlers/quiz-submit.js:67-74`
- **Root Cause Analysis**:
  In `quiz-submit.js`, option evaluation relies entirely on client-submitted `shuffled_options`:
  ```javascript
  if (shuffled_options && Array.isArray(shuffled_options[qId]) && shuffled_options[qId].length > 0) {
    const clientOpts = shuffled_options[qId];
    const matched = clientOpts.find(o => o.orig_key && String(o.orig_key).toUpperCase() === String(q.correct_option).toUpperCase());
    if (matched) finalCorrectOption = matched.key;
  }
  ```
  The server does not verify that `clientOpts` is a legitimate permutation of options stored in the database. An attacker can send a forged mapping where every option's `orig_key` points to their selected key (e.g. mapping `orig_key: "A"`, `"B"`, `"C"`, `"D"` all to `key: "A"`). `finalCorrectOption` will always evaluate to `"A"`, awarding 100% marks without knowing any answers.
- **Steps to Reproduce**:
  1. Take any question where `correct_option` is `'B'`.
  2. Submit answer `'A'` with `shuffled_options: { [qId]: [{key: 'A', orig_key: 'B'}, {key: 'B', orig_key: 'A'}] }`.
  3. Server marks `is_correct: true`, awarding full marks.
- **Suggested Fix / Code Patch**:
  Verify `clientOpts` against `q.options_json` in the database, or sign the shuffled option mapping with an HMAC token generated during `/api/quiz/generate`.

---

#### BUG-CRIT-10: Total Non-Compliance with RPSC/RSMSSB 5th Option Rule & Disqualification
- **Specialist Ref**: `BUG-QZ-18` / `BUG-ING-07`
- **Subsystem**: Quiz Engine / Ingestion / Exam Standards
- **Affected File & Line Number(s)**: `lib/handlers/quiz-submit.js:76-87, 102-110`, `lib/handlers/quiz-generate.js:84-111`, `lib/handlers/questions-bulk.js:21-25`
- **Root Cause Analysis**:
  Under official RPSC and RSMSSB regulations:
  1. Every question must present 5 options (A, B, C, D, and E - "अनुत्तरित प्रश्न / Question Unattempted").
  2. Blank questions (no option marked) must incur a negative penalty of 1/3 of the question's marks.
  3. Selecting Option E confirms intentional non-attempt (0 marks, 0 penalty).
  4. Leaving >10% of total questions blank (without Option E) causes automatic **DISQUALIFICATION**.
  In Prashn-Kosh:
  - Blank questions incur 0 penalty.
  - If Option E is selected, `quiz-submit.js` executes `incorrectCount++`, penalizing the candidate with negative marks!
  - No 10% blank disqualification threshold exists.
- **Steps to Reproduce**:
  1. Submit a quiz with 5-option questions, selecting Option 'E' ("अनुत्तरित प्रश्न") with `negative_mark: 0.67`.
  2. Scorecard shows `incorrectCount: 1`, deducting negative marks.
- **Suggested Fix / Code Patch**:
  ```javascript
  // lib/handlers/quiz-submit.js
  const isOptionE = String(userChoice).toUpperCase() === 'E' && finalOptions.length === 5;
  const isBlank = userChoice === null || userChoice === undefined || userChoice === '';
  const isCorrect = !isBlank && !isOptionE && String(userChoice).toUpperCase() === String(finalCorrectOption).toUpperCase();

  if (isOptionE) {
    unattemptedCount++;
  } else if (isBlank) {
    blankCount++;
    negativeMarksDeducted += (marksPerQ / 3);
  } else if (isCorrect) {
    correctCount++;
  } else {
    incorrectCount++;
    negativeMarksDeducted += negMarkPerWrong;
  }
  // Check 10% blank disqualification:
  const isDisqualified = (blankCount / totalQuestions) > 0.10;
  ```

---

#### BUG-CRIT-11: Unbounded & Negative Penalty Parameters Allow Arbitrary Score Inversion
- **Specialist Ref**: `BUG-QZ-19` / `BUG-BE-06`
- **Subsystem**: Quiz Engine / Backend API / Scoring Integrity
- **Affected File & Line Number(s)**: `lib/handlers/quiz-submit.js:20-23, 102-109, 116-130`
- **Root Cause Analysis**:
  `POST /api/quiz/submit` accepts `negative_mark` and `marks_per_question` directly from client JSON:
  ```javascript
  const marksPerQ = Number(marks_per_question) || 2;
  const negMarkPerWrong = Number(negative_mark) || 0;
  const negativeMarksDeducted = Number((incorrectCount * negMarkPerWrong).toFixed(2));
  const totalMarksObtained = Math.max(0, Number((positiveMarks - negativeMarksDeducted).toFixed(2)));
  ```
  If an attacker sends `negative_mark: -100`, `negativeMarksDeducted` becomes `-100`, and `positiveMarks - (-100)` adds 100 positive marks per wrong answer.
- **Steps to Reproduce**:
  1. Submit a quiz with 1 incorrect answer and `negative_mark: -100`.
  2. Server responds with `total_marks_obtained: 100`.
- **Suggested Fix / Code Patch**:
  Clamp penalty parameters to non-negative bounds:
  ```javascript
  const marksPerQ = Math.min(Math.max(Number(marks_per_question) || 2, 0.5), 10);
  const negMarkPerWrong = Math.min(Math.max(Number(negative_mark) || 0, 0), marksPerQ);
  ```

---

#### BUG-CRIT-12: Duplicate `question_ids` Multiplies Scores and Question Counts
- **Specialist Ref**: `BUG-QZ-22`
- **Subsystem**: Quiz Engine / Scoring Integrity
- **Affected File & Line Number(s)**: `lib/handlers/quiz-submit.js:59-100`
- **Root Cause Analysis**:
  In `quiz-submit.js`, the server iterates through `question_ids` without deduplicating:
  ```javascript
  for (const qId of question_ids) {
    const q = questionMap.get(qId);
    if (!q) continue;
    if (isCorrect) correctCount++;
    review.push(...);
  }
  ```
  If a client submits `question_ids: ['q1', 'q1', 'q1', 'q1', 'q1']` for a known question, `correctCount` increments 5 times, multiplying marks and recording an inflated 5-question test in `quiz_attempts`.
- **Steps to Reproduce**:
  1. Send `POST /api/quiz/submit` with 5 identical question IDs and the correct answer.
  2. Server returns `correct_count: 5`, `total_questions: 5`, `total_marks_obtained: 10`.
- **Suggested Fix / Code Patch**:
  Deduplicate `question_ids` immediately:
  ```javascript
  const uniqueQuestionIds = Array.from(new Set(Array.isArray(question_ids) ? question_ids : []));
  ```

---

### Tier 2: High Severity Vulnerabilities (18 Bugs)

---

#### BUG-HIGH-01: Missing CSS Style Definition for `.import-tab-btn` in `question-form.html` Causing Broken Unstyled Tabs
- **Specialist Ref**: `BUG-FE-02`
- **Subsystem**: Frontend UI / Styling
- **Affected File & Line Number(s)**: `public/question-form.html:56-63`, `public/import.html:11-26`, `public/css/style.css`
- **Root Cause Analysis**:
  In `question-form.html`, the mode switcher buttons use class `.import-tab-btn`. However, this CSS class is defined only inside an inline `<style>` block in `import.html`. Because `question-form.html` does not import `import.html`'s inline styles, the tab buttons render as default browser gray bevel buttons without padding, borders, or active indicator styling.
- **Steps to Reproduce**:
  1. Open `/question-form.html`.
  2. Inspect the "📝 एकल प्रश्न जोड़ें" and "🚀 टॉपिक में बल्क जोड़ें" buttons.
  3. **Observed**: Buttons render as unstyled system buttons with standard gray bevels.
- **Suggested Fix / Code Patch**:
  Move `.import-tab-btn` and `.import-tab-btn.active` rules into `public/css/style.css`.

---

#### BUG-HIGH-02: Responsive Layout Breakage on Mobile Viewports Due to Inline Multi-Column Grids in Forms and Triage
- **Specialist Ref**: `BUG-FE-03`
- **Subsystem**: Frontend UI / Mobile Responsiveness
- **Affected File & Line Number(s)**: `public/question-form.html:113, 195, 251, 267`, `public/import.js:364-377`, `public/import.html:96`
- **Root Cause Analysis**:
  In `question-form.html` and `import.js`, form rows use inline CSS styles such as `<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">`. Because these are hardcoded inline declarations, external media queries in `style.css` cannot override them. On 360px–414px mobile viewports, select inputs are crushed into ~74px columns, causing labels, dropdown arrows, and option texts to collide and overflow.
- **Steps to Reproduce**:
  1. Open DevTools at 360px viewport width on `/question-form.html`.
  2. Scroll to "विषय", "टॉपिक", and "प्रारूप" dropdowns.
  3. **Observed**: 3 dropdowns are squeezed side-by-side into 75px boxes with truncated text.
- **Suggested Fix / Code Patch**:
  Replace inline grid styles with responsive CSS classes (`.form-row-3col`, `.form-row-2col`) that collapse to `grid-template-columns: 1fr` on viewports `<= 768px`.

---

#### BUG-HIGH-03: Z-Index Stacking Inversion Between Admin Login Modal (z:200) and Practice Setup Modal (z:1000)
- **Specialist Ref**: `BUG-FE-06`
- **Subsystem**: Frontend UI / Modals
- **Affected File & Line Number(s)**: `public/css/style.css:629, 1252`
- **Root Cause Analysis**:
  In `style.css`, `.modal-overlay` (Admin login modal) has `z-index: 200`, while `.practice-modal-backdrop` (Practice modal) has `z-index: 1000`. If an action triggers the admin login dialog while the practice modal is active, the admin login modal appears underneath the practice backdrop, locking the interface and making password entry impossible.
- **Steps to Reproduce**:
  1. On `topic.html`, open "Practice Topic Quiz" (z-index 1000).
  2. Click the admin badge to open `#admin-login-modal` (z-index 200).
  3. **Observed**: The login dialog is trapped behind the dark practice modal backdrop.
- **Suggested Fix / Code Patch**:
  Set `.modal-overlay { z-index: 2000; }` in `public/css/style.css`.

---

#### BUG-HIGH-04: Sticky Header Overlaps Sticky Question Palette on Mobile/Tablet in Quiz Runner
- **Specialist Ref**: `BUG-FE-07`
- **Subsystem**: Frontend UI / Mobile Layout
- **Affected File & Line Number(s)**: `public/css/style.css:79, 894, 988-990`, `public/quiz-runner.html:67-83`
- **Root Cause Analysis**:
  On viewports `<= 768px`, `.header-inner` wraps, expanding header height to ~110px. However, `.palette-sidebar` is configured with `position: sticky; top: 75px;`. When scrolling through quiz questions on mobile, the palette sticks at 75px, sliding 35px behind the sticky header and obscuring the tray header and live counter badges.
- **Steps to Reproduce**:
  1. Open `/quiz-runner.html` at 375px width.
  2. Scroll down past question 1 towards the Question Tray.
  3. **Observed**: Palette title and badges slide behind the sticky site header.
- **Suggested Fix / Code Patch**:
  Set `.palette-sidebar { position: static !important; }` for media queries `<= 960px`.

---

#### BUG-HIGH-05: Uncaught Client Runtime Exceptions on Missing Null-Checks in Dynamic API Controllers
- **Specialist Ref**: `BUG-FE-09`
- **Subsystem**: Frontend UI / Error Handling
- **Affected File & Line Number(s)**: `public/js/subject.js:21-27`, `public/js/topic.js:28-36`, `public/js/question-form.js:502-514`, `public/js/import.js:260-267`
- **Root Cause Analysis**:
  In `subject.js` and `topic.js`, controllers access `subject.name` or `currentTopic.subject_name` without verifying if the API returned a valid object. If an invalid or deleted ID is queried, the response is `{ error: 'Subject not found' }`, and `subject` is `undefined`. Accessing properties throws an unhandled `TypeError`, leaving the UI frozen in "Loading...".
- **Steps to Reproduce**:
  1. Navigate to `/subject.html?subject_id=invalid_id`.
  2. Console displays `TypeError: Cannot read properties of undefined (reading 'name')`, and page stays permanently on "Loading...".
- **Suggested Fix / Code Patch**:
  Add defensive optional chaining and error state UI rendering:
  ```javascript
  const subject = subjRes?.subject;
  if (!subject) {
    topicsGrid.innerHTML = `<h3>विषय नहीं मिला (Subject Not Found)</h3>`;
    return;
  }
  ```

---

#### BUG-HIGH-06: Insecure LocalStorage Access in `api.js` Crashes Application in Private/Incognito Browsing
- **Specialist Ref**: `BUG-FE-10`
- **Subsystem**: Frontend UI / Storage Security
- **Affected File & Line Number(s)**: `public/js/api.js:3-13`
- **Root Cause Analysis**:
  `api.getToken()` and `api.setToken()` access `window.localStorage` directly without a `try/catch` block. In iOS Safari Private Browsing mode or environments with strict storage quotas, accessing `localStorage` throws `SecurityError` or `QuotaExceededError`. Because `api.request()` calls `this.getToken()` before every request, every API call across the entire application throws synchronously and fails.
- **Steps to Reproduce**:
  1. Open iOS Safari in Private Browsing mode.
  2. Navigate to `/index.html`.
  3. **Observed**: `SecurityError` thrown on line 4 of `api.js`. Subject cards fail to load.
- **Suggested Fix / Code Patch**:
  Wrap all `localStorage` access in `try/catch` with an in-memory token fallback (`_memoryToken`).

---

#### BUG-HIGH-07: Unhandled URIError in Cookie Parsing Causing Uncaught Route Failures
- **Specialist Ref**: `BUG-BE-07`
- **Subsystem**: Backend API / Cookie Parser
- **Affected File & Line Number(s)**: `lib/auth.js:17`, `lib/handlers/auth-verify.js:5`
- **Root Cause Analysis**:
  In `lib/auth.js`, `parseCookies` decodes cookie values using `decodeURIComponent(value)`. If a request includes a malformed percent-encoded cookie (e.g. `Cookie: session=%FF`), `decodeURIComponent` throws `URIError: URI malformed`. Because `auth-verify.js` calls `verifyAdmin(req)` without a `try/catch` wrapper, any malformed cookie crashes the route handler with HTTP 500.
- **Steps to Reproduce**:
  1. Send `GET /api/auth/verify` with header `Cookie: test=%FF`.
  2. Server responds with 500 or crashes on uncaught URIError.
- **Suggested Fix / Code Patch**:
  Wrap `decodeURIComponent` in a safe fallback block:
  ```javascript
  try { list[name] = decodeURIComponent(value); } catch { list[name] = value; }
  ```

---

#### BUG-HIGH-08: Parameter Limit Overflow / SQL Error via Unbounded Array Placeholders in SQL `IN` Clauses
- **Specialist Ref**: `BUG-BE-08`
- **Subsystem**: Backend API / Database Driver
- **Affected File & Line Number(s)**: `lib/handlers/quiz-generate.js:51-64`, `lib/handlers/quiz-submit.js:31-38`
- **Root Cause Analysis**:
  In `quiz-generate.js` and `quiz-submit.js`, query placeholders are dynamically generated based on client array length: `WHERE id IN (${question_ids.map(()=>'?').join(',')})`. SQLite and Turso enforce host parameter limits (`SQLITE_MAX_VARIABLE_NUMBER = 999`). Supplying an array with >999 items causes Turso to abort query execution with `too many SQL variables`, resulting in unhandled 500 errors.
- **Steps to Reproduce**:
  1. Send `POST /api/quiz/submit` with `question_ids` containing 1,500 strings.
  2. Server returns HTTP 500 due to SQL variable limit overflow.
- **Suggested Fix / Code Patch**:
  Validate and cap input array lengths (`question_ids.length <= 200`) before constructing queries.

---

#### BUG-HIGH-09: Zero Deduplication Mechanics Leading to Duplicate Question Vault Bloat
- **Specialist Ref**: `BUG-ING-04`
- **Subsystem**: Question Ingestion / Data Deduplication
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:237-257`, `lib/handlers/import-commit.js:62-80`, `scripts/init_db.js:19-39`
- **Root Cause Analysis**:
  Neither `questions-bulk.js` nor `import-commit.js` checks if a question already exists before insertion. There is no normalized text hash column, no uniqueness constraint, and no deduplication logic. Every upload unconditionally generates a new ID and executes `INSERT INTO questions`. Retrying uploads or importing common past papers duplicates questions across the database.
- **Steps to Reproduce**:
  1. POST the same question payload to `/api/questions/bulk` 3 times.
  2. Query `GET /api/questions?q=...`.
  3. **Observed**: 3 duplicate records exist with identical question texts.
- **Suggested Fix / Code Patch**:
  Compute a SHA-256 normalized hash of `topic_id` and normalized question text (stripped of punctuation/whitespace) and check for existing records before inserting.

---

#### BUG-HIGH-10: Option Key Normalization Bypass on Object Inputs with Non-Standard Keys (`1-4`, `अ-द`)
- **Specialist Ref**: `BUG-ING-05`
- **Subsystem**: Question Ingestion / Normalization
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:15-18`, `lib/handlers/import-upload.js:44-58`, `lib/handlers/import-commit.js:72`
- **Root Cause Analysis**:
  In `questions-bulk.js`, `normalizeOptions()` checks:
  ```javascript
  if (typeof options[0] === 'object' && options[0] !== null && 'key' in options[0] && 'text' in options[0]) return options;
  ```
  If options are supplied as `[{key: '1', text: '...'}, {key: '2', text: '...'}]` or `[{key: 'अ', text: '...'}]`, the array is returned without converting keys to canonical `A, B, C, D`. In quiz mode, student submissions submit `'A'`, which is evaluated against `'1'`, marking correct answers wrong.
- **Steps to Reproduce**:
  1. Ingest a question with option keys `"1"` and `"2"`.
  2. Take the quiz and submit option 1 (which sends `'A'`).
  3. Scorecard marks answer incorrect (`user_choice: "A", correct_option: "1"`).
- **Suggested Fix / Code Patch**:
  Map all incoming option keys (`1-5`, `अ-य`) to uppercase letters `A, B, C, D, E`.

---

#### BUG-HIGH-11: `resolveCorrectOption` Fails on Numeric (`1-4`) and Devanagari (`अ-द`) Answer Keys
- **Specialist Ref**: `BUG-ING-06`
- **Subsystem**: Question Ingestion / Answer Key Resolver
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:49-63`
- **Root Cause Analysis**:
  When an ingested question provides `correct_answer: "2"` (or `"ब"`), `resolveCorrectOption()` compares `"2"` against normalized option keys `A, B, C, D`. Because no key matches, it falls back to returning `"2"`. The question is saved with `correct_option = "2"`. During quiz submission, candidate responses (`B`) never match `"2"`, permanently scoring students incorrect.
- **Steps to Reproduce**:
  1. Ingest a question with `options: ["First", "Second", "Third", "Fourth"]` and `correct_answer: "2"`.
  2. Inspect database: `correct_option` is saved as `"2"` instead of `"B"`.
- **Suggested Fix / Code Patch**:
  Map numeric indices `1-5` and Devanagari letters `अ-य` to canonical keys `A-E` in `resolveCorrectOption()`.

---

#### BUG-HIGH-12: SQL `OR` Operator Bypasses Topic Filtering When Subject is Provided
- **Specialist Ref**: `BUG-QZ-01`
- **Subsystem**: Quiz Engine / Quiz Generation
- **Affected File & Line Number(s)**: `lib/handlers/quiz-generate.js:50-65`
- **Root Cause Analysis**:
  In `quiz-generate.js`, when both `subject_ids` and `topic_ids` are supplied, the query joins conditions using `OR`:
  ```javascript
  if (conditions.length > 0) sql += ` AND (${conditions.join(' OR ')}) `;
  ```
  This creates `WHERE 1=1 AND (q.subject_id IN (...) OR q.topic_id IN (...))`. If `q.subject_id IN (...)` matches, the topic condition is ignored. Questions from unrelated topics across the entire subject are returned, defeating topic isolation.
- **Steps to Reproduce**:
  1. Send `POST /api/quiz/generate` with `subject_ids: ["rajasthan_history"]` and `topic_ids: ["hist_001_puraatattvik_sthal"]`.
  2. Inspect returned questions: questions from `hist_004` and `hist_013` are returned.
- **Suggested Fix / Code Patch**:
  Join filter conditions with `AND`: `sql += ' AND ' + conditions.join(' AND ');`.

---

#### BUG-HIGH-13: `quiz_attempts` Schema Lacks `mode` Column Distinguishing Practice from Exam
- **Specialist Ref**: `BUG-QZ-07`
- **Subsystem**: Quiz Engine / Database Schema
- **Affected File & Line Number(s)**: `scripts/init_db.js:61-70`, `lib/handlers/quiz-submit.js:117-130`
- **Root Cause Analysis**:
  The `quiz_attempts` table schema lacks a `mode` column. An open practice session (where answers are immediately visible and modifyable) is stored identically to a timed, strict CBT Exam Mode test. Historical queries and leaderboards cannot distinguish authentic exam attempts from casual practice tests.
- **Steps to Reproduce**:
  1. Complete a test in Practice Mode and inspect the `quiz_attempts` table row.
  2. Complete a test in Exam Mode and inspect the `quiz_attempts` table row.
  3. Both records are structurally indistinguishable.
- **Suggested Fix / Code Patch**:
  Add `mode TEXT NOT NULL DEFAULT 'exam'` to `quiz_attempts` and record `body.mode` in `quiz-submit.js`.

---

#### BUG-HIGH-14: Whitespace & Case Insensitivity Omission in Key Comparison Leads to Unfair Penalties
- **Specialist Ref**: `BUG-QZ-09`
- **Subsystem**: Quiz Engine / Scoring Evaluation
- **Affected File & Line Number(s)**: `lib/handlers/quiz-submit.js:69, 78`, `lib/handlers/quiz-generate.js:102`
- **Root Cause Analysis**:
  In `quiz-submit.js`:
  ```javascript
  const isCorrect = !isUnattempted && String(userChoice).toUpperCase() === String(finalCorrectOption).toUpperCase();
  ```
  Neither string is trimmed. If OCR data contains trailing whitespace (e.g. `correct_option = "B "`), `String("B").toUpperCase() === String("B ").toUpperCase()` evaluates to `false`. The candidate's correct answer is marked wrong and docked negative marks.
- **Steps to Reproduce**:
  1. Insert a question with `correct_option = "A "`.
  2. Submit answer `"A"`.
  3. The server marks the answer incorrect and deducts negative marks.
- **Suggested Fix / Code Patch**:
  Apply `.trim()`: `clean = val => String(val || '').trim().toUpperCase();`.

---

#### BUG-HIGH-15: Shuffled Option Match Failure Falls Back to Unshuffled DB Key
- **Specialist Ref**: `BUG-QZ-10`
- **Subsystem**: Quiz Engine / Option Shuffling
- **Affected File & Line Number(s)**: `lib/handlers/quiz-submit.js:64, 70-74, 78`
- **Root Cause Analysis**:
  When evaluating options:
  ```javascript
  let finalCorrectOption = q.correct_option;
  if (shuffled_options && ...) {
    const matched = clientOpts.find(...);
    if (matched) finalCorrectOption = matched.key;
  }
  ```
  If `matched` is undefined (due to whitespace or casing differences), `finalCorrectOption` quietly remains `q.correct_option` (the unshuffled key). If Option A was shuffled to Option C and the student clicked C, the server compares C against A and marks it wrong.
- **Steps to Reproduce**:
  1. Shuffled option moves Option A to Option C.
  2. If matching fails, server compares selected C against DB key A.
  3. Candidate is penalized with negative marks.
- **Suggested Fix / Code Patch**:
  Enforce robust trimming on both `orig_key` and `correct_option`, and log a warning if matching fails.

---

#### BUG-HIGH-16: Background Tab Interval Throttling Stalls Countdown Timer (Exam Time Cheating)
- **Specialist Ref**: `BUG-QZ-12`
- **Subsystem**: Quiz Engine / Client Timer
- **Affected File & Line Number(s)**: `public/js/quiz-runner.js:135-155`
- **Root Cause Analysis**:
  The countdown timer decrements a variable `remainingSeconds--` inside `setInterval(tickCountdown, 1000)`. Modern browsers throttle background tab intervals to 1 execution per minute. If a candidate switches tabs to browse answers for 10 minutes, `remainingSeconds` only decrements by 10 seconds. An exam can be kept open indefinitely.
- **Steps to Reproduce**:
  1. Start a 1-minute countdown quiz.
  2. Switch to another tab for 3 minutes.
  3. Return to the quiz tab: timer has only decremented by ~3 seconds.
- **Suggested Fix / Code Patch**:
  Use wall-clock delta calculation:
  ```javascript
  const targetEndTime = Date.now() + (timerMinsParam * 60 * 1000);
  const remainingSeconds = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
  ```

---

#### BUG-HIGH-17: Synchronous Blocking `window.alert()` Prevents Reliable Auto-Submission
- **Specialist Ref**: `BUG-QZ-13`
- **Subsystem**: Quiz Engine / Auto-Submission
- **Affected File & Line Number(s)**: `public/js/quiz-runner.js:147-151`
- **Root Cause Analysis**:
  When the timer expires:
  ```javascript
  if (remainingSeconds <= 0) {
    clearInterval(timerInterval);
    alert('⏱️ समय समाप्त हो गया है! आपकी परीक्षा स्वतः सबमिट की जा रही है...');
    submitQuiz(true);
  }
  ```
  `window.alert()` pauses the browser thread. If the user is away or the browser is unattended, `submitQuiz(true)` is never reached. If the computer sleeps or tab closes, the submission is lost.
- **Steps to Reproduce**:
  1. Let a countdown timer expire; do not dismiss the alert popup.
  2. Check Network panel: no submission request is sent until the alert is clicked.
- **Suggested Fix / Code Patch**:
  Call `submitQuiz(true)` immediately and non-blockingly without `window.alert()`.

---

#### BUG-HIGH-18: Floating Point Rounding Drift in 1/3 Negative Marking Calculations
- **Specialist Ref**: `BUG-QZ-21`
- **Subsystem**: Quiz Engine / Scoring Integrity
- **Affected File & Line Number(s)**: `public/js/quiz-builder.js:227`, `public/js/topic.js:465`, `lib/handlers/quiz-submit.js:106`
- **Root Cause Analysis**:
  In frontend controllers, selecting 1/3 negative marking computes `(marksPerQ / 3).toFixed(2)`, sending `"0.67"` as a static float.
  In `quiz-submit.js`: `negativeMarksDeducted = Number((incorrectCount * negMarkPerWrong).toFixed(2))`.
  Under RPSC rules, 3 wrong questions with 1/3 penalty on a 2-mark question must deduct exactly `2.00` marks. But `3 * 0.67 = 2.01` marks. For 30 wrong questions, the candidate is docked `20.10` instead of `20.00` marks purely due to floating-point truncation.
- **Steps to Reproduce**:
  1. Submit a quiz with 1 correct (+2.00) and 3 incorrect (1/3 penalty).
  2. Total score should be `0.00`, but Prashn-Kosh computes `-0.01` (penalty of `2.01`).
- **Suggested Fix / Code Patch**:
  Perform exact fractional division server-side: `negativeMarksDeducted = Number(((incorrectCount * marksPerQ) / 3).toFixed(2));`.

---

### Tier 3: Medium Severity Defects (26 Bugs)

---

#### BUG-MED-01: Question Card Option Class Mismatch (`option-target-correct` vs `correct`) Prevents Correct Option Highlighting
- **Specialist Ref**: `BUG-FE-04`
- **Subsystem**: Frontend UI / Topic View
- **Affected File & Line Number(s)**: `public/js/topic.js:101`, `public/js/import.js:314`, `public/css/style.css:554-564`
- **Root Cause Analysis**:
  In `style.css`, correct option styling is defined on `.option-pill.correct`. However, `topic.js` and `import.js` inject class name `option-target-correct`. Because the class names do not match, answer pills never turn green when the user expands the solution accordion.
- **Steps to Reproduce**:
  1. Open `/topic.html?topic_id=art_014_durg` and click "💡 Show Answer & Explanation".
  2. **Observed**: Option pill remains plain gray instead of highlighting in green.
- **Suggested Fix / Code Patch**:
  Change injected class name in `topic.js` and `import.js` to `correct`.

---

#### BUG-MED-02: Missing Background Scroll Lock on Modal Open Causing Background Scroll Chaining
- **Specialist Ref**: `BUG-FE-05`
- **Subsystem**: Frontend UI / Modal UX
- **Affected File & Line Number(s)**: `public/js/auth.js:91-98`, `public/js/topic.js:348-375`
- **Root Cause Analysis**:
  Opening modals in `auth.js` and `topic.js` toggles modal visibility but fails to set `document.body.style.overflow = 'hidden'`. On mobile devices, swiping over modal backdrops scrolls the underlying page, causing rubber-banding and loss of scroll position.
- **Steps to Reproduce**:
  1. Open the Practice Setup Modal on mobile and drag your finger over the backdrop.
  2. **Observed**: The underlying topic question list scrolls behind the modal.
- **Suggested Fix / Code Patch**:
  Toggle `document.body.style.overflow = 'hidden'` on open and `''` on close.

---

#### BUG-MED-03: Sub-44px Touch Targets Violating WCAG 2.5.5 Across Mobile Navigation, Action Bars, and Quiz Palette
- **Specialist Ref**: `BUG-FE-08`
- **Subsystem**: Frontend UI / Mobile Accessibility
- **Affected File & Line Number(s)**: `public/css/style.css:160-174, 198, 472-475, 1097-1111, 1319-1329`
- **Root Cause Analysis**:
  Multiple interactive buttons have computed heights below 44px (`.nav-link`: 30.5px, `.admin-badge-btn`: 28px, `.palette-btn`: 38px, template buttons: 22px), causing mis-taps on touchscreen devices.
- **Steps to Reproduce**:
  1. Open Quiz Runner on a mobile device and rapidly tap question numbers in the palette.
  2. **Observed**: Buttons are too small for fingertip pads, causing frequent missed taps.
- **Suggested Fix / Code Patch**:
  Apply `min-height: 44px; min-width: 44px;` in media queries for pointer coarse devices.

---

#### BUG-MED-04: Search Keyword Highlighter (`highlightText`) Corrupts HTML Entities and Malforms Markup
- **Specialist Ref**: `BUG-FE-11`
- **Subsystem**: Frontend UI / Search View
- **Affected File & Line Number(s)**: `public/js/search.js:218-249`
- **Root Cause Analysis**:
  `highlightText` first converts characters to entities (`&quot;`, `&amp;`), then runs `escaped.replace(regex, '<mark...>$1</mark>')`. If the search term is `quot` or `amp`, the regex matches inside the entity string, generating corrupted markup like `&<mark>quot</mark>;`.
- **Steps to Reproduce**:
  1. In `/search.html`, search for `quot`.
  2. **Observed**: Raw entity string `&<mark class="search-highlight">quot</mark>;` appears in the rendered text.
- **Suggested Fix / Code Patch**:
  Split on the regex matches and escape only non-highlighted text segments.

---

#### BUG-MED-05: Destructive File Chip Removal Overwrites Manual Textarea Edits in Question Form Bulk Mode
- **Specialist Ref**: `BUG-FE-12`
- **Subsystem**: Frontend UI / Question Form
- **Affected File & Line Number(s)**: `public/js/question-form.js:764-774, 776-785`
- **Root Cause Analysis**:
  Clicking the "✕" button on any uploaded file chip executes `syncMergedQuestionsToInput()`, which unconditionally overwrites `#bulk-json-input` with the raw file array, wiping out any manual edits made in the textarea without confirmation.
- **Steps to Reproduce**:
  1. In bulk add mode, upload 2 JSON files and edit question 1 in the textarea.
  2. Click "✕" on file chip 2. Manual edits in the textarea are wiped out.
- **Suggested Fix / Code Patch**:
  Warn the user before resetting the textarea if manual edits were detected.

---

#### BUG-MED-06: Race Condition and Missing Click-Outside Dismiss in Homepage Global Live Search Dropdown
- **Specialist Ref**: `BUG-FE-13`
- **Subsystem**: Frontend UI / Search UX
- **Affected File & Line Number(s)**: `public/js/home.js:80-132`
- **Root Cause Analysis**:
  Rapid typing dispatches multiple asynchronous requests. If response 1 arrives after response 2, stale results overwrite current results. Furthermore, clicking outside the dropdown fails to dismiss the results overlay.
- **Steps to Reproduce**:
  1. Type "गोडावण" then quickly backspace and type "1857". Stale responses can overwrite current results.
  2. Click outside the dropdown: overlay remains visible.
- **Suggested Fix / Code Patch**:
  Add request sequence tracking to discard stale responses and attach a `document.addEventListener('click')` handler to close results on outside click.

---

#### BUG-MED-07: Horizontal Grid Item Squeeze and Clipping in Quiz Builder `.topic-list-group` on 360px Mobile
- **Specialist Ref**: `BUG-FE-14`
- **Subsystem**: Frontend UI / Quiz Builder
- **Affected File & Line Number(s)**: `public/quiz-builder.html:27-32, 60-80`
- **Root Cause Analysis**:
  On 360px viewports, container padding leaves 216px of available width. Because `.topic-list-group` defines `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`, columns overflow the container and badges are clipped off screen.
- **Steps to Reproduce**:
  1. Open `/quiz-builder.html` on a 360px mobile viewport.
  2. Expand any subject: question count badges on the right are clipped off.
- **Suggested Fix / Code Patch**:
  Add `@media (max-width: 600px) { .topic-list-group { grid-template-columns: 1fr; } }`.

---

#### BUG-MED-08: Sequential Serial HTTP Fetch Loops Block UI with Multi-Second Delays in Quiz Builder and Prompts
- **Specialist Ref**: `BUG-FE-17`
- **Subsystem**: Frontend UI / Client Performance
- **Affected File & Line Number(s)**: `public/js/quiz-builder.js:49-56`, `public/js/prompts.js:47-57`
- **Root Cause Analysis**:
  Fetching topics loops sequentially over all subjects (`for (const s of subjects) { await api.get(...) }`), executing 10+ roundtrips in series. On mobile 3G/4G networks, this causes multi-second blocking delays.
- **Steps to Reproduce**:
  1. Throttle DevTools network to Fast 3G and navigate to `/quiz-builder.html`.
  2. Notice 10 sequential `/api/topics` requests executing in a long waterfall.
- **Suggested Fix / Code Patch**:
  Parallelize requests using `Promise.all(subjects.map(...))`.

---

#### BUG-MED-09: Information Disclosure: Leaking Internal Database and System Details in 500 Responses
- **Specialist Ref**: `BUG-BE-09`
- **Subsystem**: Backend API / Security
- **Affected File & Line Number(s)**: `server.js:182`, `lib/handlers/*.js`
- **Root Cause Analysis**:
  Error handlers pass `err.message` directly into `sendError(res, 500, err.message)`. In Turso/SQLite, `err.message` leaks exact SQL table and column names (e.g. `UNIQUE constraint failed: subjects.id`) and database connection strings.
- **Steps to Reproduce**:
  1. Send `POST /api/subjects` with an existing subject ID.
  2. Response body exposes: `{"error": "UNIQUE constraint failed: subjects.id"}`.
- **Suggested Fix / Code Patch**:
  Log full errors on the server, but return generic messages (`'An unexpected server error occurred.'`) to clients in production.

---

#### BUG-MED-10: Silent Failures Returning `200 OK` on Non-Existent Resources (False Positive Updates & Deletes)
- **Specialist Ref**: `BUG-BE-10`
- **Subsystem**: Backend API / REST Consistency
- **Affected File & Line Number(s)**: `lib/handlers/subject-id.js:48, 71`, `lib/handlers/topic-id.js:58, 77`, `lib/handlers/question-id.js:109, 124`, `lib/handlers/import-discard.js:27`
- **Root Cause Analysis**:
  When performing `PUT` or `DELETE` on subjects, topics, or questions, handlers do not check `result.rowsAffected`. If a non-existent ID is deleted, 0 rows are affected, but the API responds with HTTP 200 OK claiming `"Question deleted successfully."`.
- **Steps to Reproduce**:
  1. Send `DELETE /api/questions/q_nonexistent_9999`.
  2. Server returns `200 OK` `{ "success": true, "message": "Question deleted successfully." }`.
- **Suggested Fix / Code Patch**:
  Check `if (result.rowsAffected === 0) return sendError(res, 404, 'Resource not found.');`.

---

#### BUG-MED-11: Multi-Statement Deletes Executed Sequentially Without Transaction
- **Specialist Ref**: `BUG-BE-11`
- **Subsystem**: Backend API / Database Consistency
- **Affected File & Line Number(s)**: `lib/handlers/subject-id.js:58-69`, `lib/handlers/topic-id.js:68-76`
- **Root Cause Analysis**:
  Deleting a subject deletes questions, topics, and subjects via 3 sequential `db.execute()` calls without a transaction. If a connection failure occurs on step 2, questions are deleted while topics and subjects remain orphaned.
- **Steps to Reproduce**:
  1. Delete a subject while simulating a connection interruption after step 1.
  2. Orphaned topics and subjects remain in the database.
- **Suggested Fix / Code Patch**:
  Wrap deletions in an atomic batch: `await db.batch([...deleteStatements], 'write');`.

---

#### BUG-MED-12: Missing Vocabulary Cache Invalidation on Question Update, Delete, and Batch Commit
- **Specialist Ref**: `BUG-BE-12` / `BUG-ING-14`
- **Subsystem**: Backend API / Ingestion / Cache Invalidation
- **Affected File & Line Number(s)**: `lib/handlers/import-commit.js:90-108`, `lib/handlers/question-id.js:54-129`
- **Root Cause Analysis**:
  `smart-search.js` caches vocabulary for 10 minutes. While `questions-bulk.js` calls `invalidateVocabCache()`, `import-commit.js` (bulk staging commit) and `question-id.js` (PUT/DELETE) omit it. Search results and fuzzy corrections remain stale for up to 10 minutes.
- **Steps to Reproduce**:
  1. Commit a staged batch containing new Hindi terms via `/api/import/commit`.
  2. Search for a typo of the newly committed term; fuzzy search fails to suggest the correction.
- **Suggested Fix / Code Patch**:
  Import and call `invalidateVocabCache()` in `import-commit.js` and `question-id.js`.

---

#### BUG-MED-13: Overly Permissive CORS and Hardcoded Secret Output to Console
- **Specialist Ref**: `BUG-BE-13`
- **Subsystem**: Backend API / Security Configuration
- **Affected File & Line Number(s)**: `server.js:159-161, 193`, `lib/auth.js:4-5`
- **Root Cause Analysis**:
  `server.js` sets `Access-Control-Allow-Origin: *` while accepting credentials, logs `🔑 Admin password: ...` to standard output on startup, and defaults `ADMIN_PASSWORD` to `'admin'`. In production, stdout is indexed in cloud logs.
- **Steps to Reproduce**:
  1. Start server with `node server.js`.
  2. Observe admin password printed to terminal output.
- **Suggested Fix / Code Patch**:
  Remove password console logging and restrict CORS origins to authorized frontends.

---

#### BUG-MED-14: Unbounded Question Pagination Limit Allowing Heavy Data Exfiltration
- **Specialist Ref**: `BUG-BE-14`
- **Subsystem**: Backend API / Data Governance
- **Affected File & Line Number(s)**: `lib/handlers/questions.js:44-45`
- **Root Cause Analysis**:
  `const limitNum = Math.min(Math.max(Number(limit) || 1000, 1), 2000);`. The default limit is 1,000 questions, and max is 2,000. An unauthenticated client can dump 2,000 questions in a single request, straining memory and bandwidth.
- **Steps to Reproduce**:
  1. Send `GET /api/questions`. Response returns 1,000 full records by default.
- **Suggested Fix / Code Patch**:
  Set reasonable pagination boundaries: `Number(limit) || 50` with max limit 100.

---

#### BUG-MED-15: Incomplete Payload Streaming Abort & Leak on Oversized Payloads
- **Specialist Ref**: `BUG-BE-15` / `BUG-ING-11`
- **Subsystem**: Backend API / HTTP Utils
- **Affected File & Line Number(s)**: `lib/http-utils.js:18-20`, `server.js:179-183`
- **Root Cause Analysis**:
  When `raw.length > 5 * 1024 * 1024`, `parseBody` rejects with an error, but never calls `req.pause()` or `req.destroy()`. The socket remains open and data continues buffering. In addition, `server.js` responds with HTTP 500 instead of HTTP 413 Payload Too Large.
- **Steps to Reproduce**:
  1. Stream a 10MB payload to `/api/questions/bulk`.
  2. Server responds with 500 while socket buffers data in memory.
- **Suggested Fix / Code Patch**:
  Call `req.pause(); req.destroy();` upon exceeding size and set `err.statusCode = 413`.

---

#### BUG-MED-16: Substring False-Positive Collisions & Priority Inversions in `topicsByName`
- **Specialist Ref**: `BUG-ING-08`
- **Subsystem**: Question Ingestion / Routing
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:181-185`
- **Root Cause Analysis**:
  `resolveTopic` checks `if (rawName.includes(nameKey) || nameKey.includes(rawName))`. Short topic names like `"दुर्ग"`, `"कला"`, or `"राजस्थान"` eagerly match any compound topic name based purely on SQLite iteration order.
- **Steps to Reproduce**:
  1. POST a question with `topic: "राजस्थान के प्रमुख किसान आंदोलन"`.
  2. Question matches whichever earlier topic contained `"राजस्थान"` or `"आंदोलन"`.
- **Suggested Fix / Code Patch**:
  Require exact match first, and for substring matches require minimum length >= 4 characters and pick the longest match.

---

#### BUG-MED-17: Rigid End-of-String Regex Anchor Misses Punctuation and Leading Tags
- **Specialist Ref**: `BUG-ING-09`
- **Subsystem**: Question Ingestion / Tag Extraction
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:77-80`
- **Root Cause Analysis**:
  Exam tag regexes `[\s\-_–—]*\[([^\]]+)\]\s*$` strictly anchor to the end of the string. If a question ends with punctuation (`[पटवार 2021] ।` or `[RAS 2018]?`) or has tags at the beginning (`[REET 2021] प्रश्न...`), tags are never extracted and remain in `question_text`.
- **Steps to Reproduce**:
  1. POST a question ending with `"मेहरानगढ़ दुर्ग कहाँ है? [पटवार-2021] ।"`.
  2. `exam_source` is null, and tag remains trapped in `question_text`.
- **Suggested Fix / Code Patch**:
  Allow trailing punctuation and support both leading and trailing bracket patterns.

---

#### BUG-MED-18: Silent Dropping of Orphan Questions Without User Notification
- **Specialist Ref**: `BUG-ING-10`
- **Subsystem**: Question Ingestion / Error Reporting
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:211-214, 285-290`
- **Root Cause Analysis**:
  If a question fails topic resolution or has missing text, the loop executes `continue;` silently. The API responds with `201 Created` with `inserted_count: 85`. It does not report `skipped_count` or list which items were dropped, leading to silent question loss.
- **Steps to Reproduce**:
  1. POST 5 questions where 2 have unresolvable topics.
  2. Response shows `inserted_count: 3`, with no mention of the 2 dropped questions.
- **Suggested Fix / Code Patch**:
  Collect skipped questions in an array and return `skipped_count` and `skipped: [...]` in the response.

---

#### BUG-MED-19: Pseudo-Random Option Shuffling Anti-Pattern via `Math.random() - 0.5`
- **Specialist Ref**: `BUG-QZ-02` / `BUG-BE-16`
- **Subsystem**: Quiz Engine / Backend API / Option Shuffling
- **Affected File & Line Number(s)**: `lib/handlers/quiz-generate.js:98-99`
- **Root Cause Analysis**:
  Option shuffling executes `[...options].sort(() => Math.random() - 0.5)`. This is not a Fisher-Yates shuffle. In V8's Timsort, non-transitive comparators produce non-uniform permutations where certain arrangements appear 2.5x more frequently than others.
- **Steps to Reproduce**:
  1. Run 100,000 iterations of 4-element sort with `Math.random() - 0.5`.
  2. Distribution deviates significantly from uniform 4.16% per permutation.
- **Suggested Fix / Code Patch**:
  Implement true Fisher-Yates (Knuth) shuffle algorithm.

---

#### BUG-MED-20: "Practice Quiz on Search Results" Discards Matched Questions
- **Specialist Ref**: `BUG-QZ-04`
- **Subsystem**: Quiz Engine / Search Integration
- **Affected File & Line Number(s)**: `public/js/search.js:292-301`
- **Root Cause Analysis**:
  Clicking "Practice Quiz on Search Results" extracts topic IDs and passes them to `/quiz-runner.html?topic_ids=...`. The specific matched question IDs are discarded. The runner queries `/api/quiz/generate`, picking random questions from those entire topics rather than the searched questions.
- **Steps to Reproduce**:
  1. Search for a specific keyword matching 2 questions in a topic with 100 questions.
  2. Click "Practice Quiz on Search Results": quiz loads 2 random questions that do not contain the searched keyword.
- **Suggested Fix / Code Patch**:
  Forward explicit `question_ids` in session storage or URL parameters.

---

#### BUG-MED-21: Practice Mode Allows Retrospective Answer Modification Before Submission
- **Specialist Ref**: `BUG-QZ-06`
- **Subsystem**: Quiz Engine / Practice Mode
- **Affected File & Line Number(s)**: `public/js/quiz-runner.js:301-304`
- **Root Cause Analysis**:
  In Practice Mode, clicking an option reveals correct/incorrect badges, but leaves option listeners active. A student can click an incorrect option, see which option turns green, and then click the green option to overwrite their answer, recording 100% marks.
- **Steps to Reproduce**:
  1. In Practice Mode, click a wrong option (turns red, correct turns green).
  2. Click the green option. Answer is updated and submitted as 100% correct.
- **Suggested Fix / Code Patch**:
  Lock pointer events once an option is selected: `optItem.style.pointerEvents = 'none';`.

---

#### BUG-MED-22: Quiz Runner Fails to Transmit `subject_ids` and `topic_ids` in Submission
- **Specialist Ref**: `BUG-QZ-08`
- **Subsystem**: Quiz Engine / Attempt Tracking
- **Affected File & Line Number(s)**: `public/js/quiz-runner.js:480-488`, `lib/handlers/quiz-submit.js:18-19, 124-125`
- **Root Cause Analysis**:
  In `quiz-runner.js`, `submitQuiz()` omits `subject_ids` and `topic_ids` in the payload. In `quiz-submit.js`, both default to `[]`. Consequently, 100% of recorded rows in `quiz_attempts` have `subject_ids_json = "[]"` and `topic_ids_json = "[]"`.
- **Steps to Reproduce**:
  1. Query `SELECT subject_ids_json, topic_ids_json FROM quiz_attempts`.
  2. 100% of rows contain empty arrays `[]`.
- **Suggested Fix / Code Patch**:
  Extract subject and topic IDs from `questions` array and include them in the submission payload.

---

#### BUG-MED-23: Lack of Server-Side Session Duration Validation & Clock Reconciliation
- **Specialist Ref**: `BUG-QZ-14`
- **Subsystem**: Quiz Engine / Anti-Tamper
- **Affected File & Line Number(s)**: `lib/handlers/quiz-submit.js:20, 117-130`
- **Root Cause Analysis**:
  The server accepts `started_at` directly from the client without verifying whether a quiz was generated at that time. A student can pause execution or send a submission hours later, and client system clock skew directly corrupts database timestamps in `quiz_attempts`.
- **Steps to Reproduce**:
  1. Send `POST /api/quiz/submit` with `started_at: "2020-01-01T00:00:00.000Z"`.
  2. Server accepts and records the date into `quiz_attempts` without validation.
- **Suggested Fix / Code Patch**:
  Generate an ephemeral signed server timestamp or session token in `/api/quiz/generate` and validate it in `/api/quiz/submit`.

---

#### BUG-MED-24: Missing In-Flight Submission Guard Permits Concurrent Duplicate Submissions
- **Specialist Ref**: `BUG-QZ-15`
- **Subsystem**: Quiz Engine / Submission Guard
- **Affected File & Line Number(s)**: `public/js/quiz-runner.js:457-495`
- **Root Cause Analysis**:
  `submitQuiz()` lacks an `isSubmitting` guard. Rapidly clicking the submit button or pressing Enter multiple times dispatches multiple asynchronous POST requests in parallel, writing multiple duplicate records to `quiz_attempts`.
- **Steps to Reproduce**:
  1. Throttle network to Slow 3G, click Submit, and rapidly click Confirm multiple times.
  2. Multiple POST requests are fired, creating duplicate rows in `quiz_attempts`.
- **Suggested Fix / Code Patch**:
  Add an `isSubmitting` flag and disable submit buttons during request processing.

---

#### BUG-MED-25: Negative Score Truncation (`Math.max(0, ...)`) Distorts Official Exam Metrics
- **Specialist Ref**: `BUG-QZ-20`
- **Subsystem**: Quiz Engine / Score Metrics
- **Affected File & Line Number(s)**: `lib/handlers/quiz-submit.js:107`
- **Root Cause Analysis**:
  Line 107 executes `const totalMarksObtained = Math.max(0, Number(...))`. In RPSC/RSMSSB exams, candidates who guess excessively receive negative overall scores (e.g. -1.34 marks). Truncating negative scores to 0 hides this diagnostic signal from candidates.
- **Steps to Reproduce**:
  1. Attempt 2 questions: 0 correct, 2 incorrect with `negative_mark: 0.67`.
  2. Real score is `-1.34`, but Prashn-Kosh reports `total_marks_obtained: 0`.
- **Suggested Fix / Code Patch**:
  Allow authentic negative scores: `const totalMarksObtained = Number((positiveMarks - negativeMarksDeducted).toFixed(2));`.

---

#### BUG-MED-26: Unhandled Null Payload Crashes Server with 500 on `submitted_answers`
- **Specialist Ref**: `BUG-QZ-23`
- **Subsystem**: Quiz Engine / Input Validation
- **Affected File & Line Number(s)**: `lib/handlers/quiz-submit.js:76`
- **Root Cause Analysis**:
  In `quiz-submit.js`, if a client passes `"submitted_answers": null`, default parameter destructuring is bypassed. Line 76 executes `submitted_answers[qId]`, throwing `TypeError: Cannot read properties of null`, crashing with HTTP 500 instead of returning HTTP 400.
- **Steps to Reproduce**:
  1. Send `POST /api/quiz/submit` with `{"question_ids": ["q1"], "submitted_answers": null}`.
  2. Server responds with HTTP 500: `Cannot read properties of null (reading 'q1')`.
- **Suggested Fix / Code Patch**:
  Sanitize: `const safeAnswers = (submitted_answers && typeof submitted_answers === 'object') ? submitted_answers : {};`.

---

### Tier 4: Low Severity Glitches & Polish Items (14 Bugs)

---

#### BUG-LOW-01: Floating Copy Toast Positioning and Width Overflow on Mobile in Prompts Library
- **Specialist Ref**: `BUG-FE-15`
- **Subsystem**: Frontend UI / Mobile Viewport
- **Affected File & Line Number(s)**: `public/prompts.html:46-59`, `public/js/prompts.js:13-20`
- **Root Cause Analysis**:
  The copy toast message is 55+ characters long. At `right: 2rem` on a 360px viewport, the toast extends past the left screen edge, causing horizontal layout clipping. In addition, rapid clicks cause the toast to flash and disappear prematurely.
- **Steps to Reproduce**:
  1. Open `/prompts.html` on a 360px viewport and tap "Copy Live Master Prompt".
  2. Toast overflows the left edge of the screen.
- **Suggested Fix / Code Patch**:
  Apply `left: 1rem; right: 1rem;` for mobile viewports and reset `toastTimeout`.

---

#### BUG-LOW-02: Undefined CSS Custom Property `--text-dark` Causes Browser Default Fallback in Match Tables
- **Specialist Ref**: `BUG-FE-16`
- **Subsystem**: Frontend UI / CSS Design Tokens
- **Affected File & Line Number(s)**: `public/css/style.css:734`
- **Root Cause Analysis**:
  In `.match-table th`, `color: var(--text-dark);` is specified. In `:root`, `--text-dark` was never declared. Browsers fall back to inherited color, creating inconsistent text contrast.
- **Steps to Reproduce**:
  1. View a Match question table on `/topic.html` and inspect `<th>` in DevTools.
  2. `var(--text-dark)` is flagged as unresolvable.
- **Suggested Fix / Code Patch**:
  Change to `color: var(--text-main);`.

---

#### BUG-LOW-03: Missing Subject Preselection Parameter in Custom Quiz Builder from Subject Detail Page
- **Specialist Ref**: `BUG-FE-18`
- **Subsystem**: Frontend UI / Navigation Context
- **Affected File & Line Number(s)**: `public/subject.html:69`, `public/js/quiz-builder.js:3-7, 37-106`
- **Root Cause Analysis**:
  In `subject.html`, the link `<a href="/quiz-builder.html">🎯 Practice Subject Quiz</a>` does not pass `?subject_id=...`. When a user reading Geography clicks Practice, the quiz builder opens with all subjects across the database pre-checked.
- **Steps to Reproduce**:
  1. Navigate to `/subject.html?subject_id=geography` and click "Practice Subject Quiz".
  2. Quiz builder loads with all topics from History, Art, and Science pre-checked.
- **Suggested Fix / Code Patch**:
  Append `?subject_id=${subjectId}` to the link and read the parameter in `quiz-builder.js`.

---

#### BUG-LOW-04: Hindi Devanagari ID Generator Flaw in Admin Subject and Topic Prompts
- **Specialist Ref**: `BUG-FE-19`
- **Subsystem**: Frontend UI / Localization
- **Affected File & Line Number(s)**: `public/js/home.js:140`, `public/js/subject.js:74`
- **Root Cause Analysis**:
  Default ID generation executes `name.toLowerCase().replace(/[^a-z0-9]/g, '_')`. When entering Hindi topic names (e.g. `राजस्थान के दुर्ग`), every Devanagari character becomes an underscore, producing invalid default IDs (`_______________`).
- **Steps to Reproduce**:
  1. Click "Add Topic" as Admin and type "राजस्थान के दुर्ग".
  2. Default suggested ID is `art_culture_______________`.
- **Suggested Fix / Code Patch**:
  Provide timestamp fallback or transliteration when non-ASCII text strips to empty underscores.

---

#### BUG-LOW-05: Missing `touch-action: manipulation` Introduces 300ms Double-Tap Delay on Quiz Interaction Elements
- **Specialist Ref**: `BUG-FE-20`
- **Subsystem**: Frontend UI / Touch Latency
- **Affected File & Line Number(s)**: `public/css/style.css:427-440, 1097-1111`, `public/quiz-runner.html:37-62`
- **Root Cause Analysis**:
  Interactive quiz option elements do not declare `touch-action: manipulation`. Mobile browsers enforce a 300ms delay between `touchstart` and `click` to detect double-tap zoom gestures, causing tactile sluggishness during fast exam answering.
- **Steps to Reproduce**:
  1. Tap options A, B, C rapidly on an iPhone or physical Android device.
  2. A noticeable 300ms latency occurs before option selection visual update.
- **Suggested Fix / Code Patch**:
  Add `touch-action: manipulation; -webkit-tap-highlight-color: transparent;` to quiz interactive controls.

---

#### BUG-LOW-06: Strict Trailing Slash Routing Failures
- **Specialist Ref**: `BUG-BE-17`
- **Subsystem**: Backend Server / Routing
- **Affected File & Line Number(s)**: `server.js:40-122`
- **Root Cause Analysis**:
  API routes in `server.js` use strict string equality (`if (pathname === '/api/questions')`). Requests containing a trailing slash (`/api/questions/` or `/api/subjects/`) return `404 API route not found`.
- **Steps to Reproduce**:
  1. Send `GET /api/subjects/`. Server returns 404 API route not found.
- **Suggested Fix / Code Patch**:
  Normalize `pathname` by stripping trailing slashes before route dispatching.

---

#### BUG-LOW-07: Ineffective SQLite Foreign Key Enforcement in Local Database Mode
- **Specialist Ref**: `BUG-BE-18`
- **Subsystem**: Backend Database / SQLite
- **Affected File & Line Number(s)**: `lib/db.js:5-18`, `scripts/init_db.js:77-79`
- **Root Cause Analysis**:
  In local file mode (`file:local.db`), SQLite disables foreign keys by default. Neither `init_db.js` nor `lib/db.js` executes `PRAGMA foreign_keys = ON;`. Foreign key violations succeed silently in development and fail when deployed to Turso.
- **Steps to Reproduce**:
  1. In local database mode, insert a question referencing a non-existent `topic_id`. SQLite permits the insertion.
- **Suggested Fix / Code Patch**:
  Execute `PRAGMA foreign_keys = ON;` upon initializing local SQLite clients.

---

#### BUG-LOW-08: SQL Wildcard Injection in Question Search LIKE Clauses
- **Specialist Ref**: `BUG-BE-19`
- **Subsystem**: Backend API / SQL Query Construction
- **Affected File & Line Number(s)**: `lib/handlers/questions.js:17-27`
- **Root Cause Analysis**:
  In `buildSearchConditions`, search strings are interpolated directly into SQL `LIKE` wildcard patterns without escaping `%` or `_`: `const sTerm = `%${v}%``. Literal searches for underscores act as wildcards, triggering broad matches.
- **Steps to Reproduce**:
  1. Send `GET /api/questions?q=____`. Query matches all rows with 4+ characters instead of literal underscores.
- **Suggested Fix / Code Patch**:
  Escape SQL wildcards: `const escaped = v.replace(/[%_\\]/g, '\\$&');` and declare `ESCAPE '\'`.

---

#### BUG-LOW-09: False-Positive Type Classification in `detectQuestionType` for "सुमेलित नहीं है" MCQs
- **Specialist Ref**: `BUG-ING-12`
- **Subsystem**: Question Ingestion / Format Detection
- **Affected File & Line Number(s)**: `lib/handlers/questions-bulk.js:37-39`, `lib/handlers/import-commit.js:54-56`
- **Root Cause Analysis**:
  `detectQuestionType()` checks `if (text.includes('सुमेलित')) return 'match';`. Standard MCQs asking "निम्नलिखित में से कौन सा युग्म सुमेलित नहीं है?" are falsely classified as `match`, breaking card rendering.
- **Steps to Reproduce**:
  1. POST a question: `"निम्नलिखित में से कौन सा युग्म सुमेलित नहीं है?"`.
  2. Question is tagged as `'match'` instead of `'mcq'`.
- **Suggested Fix / Code Patch**:
  Disambiguate: if text contains 'सुमेलित नहीं' without 'सूची' or '|', keep as `'mcq'`.

---

#### BUG-LOW-10: Ghost Import Batch Created in `import-upload.js` When All Questions Are Invalid
- **Specialist Ref**: `BUG-ING-13`
- **Subsystem**: Question Ingestion / Staging
- **Affected File & Line Number(s)**: `lib/handlers/import-upload.js:32-37, 66-79`
- **Root Cause Analysis**:
  `import-upload.js` pushes `INSERT INTO import_batches` before inspecting questions. If all questions in the payload have missing question texts, an empty batch is permanently created with `total_staged: 0`.
- **Steps to Reproduce**:
  1. POST to `/api/import/upload` with questions missing `question_text`.
  2. Response shows `total_staged: 0`, and an orphan empty batch is created in `import_batches`.
- **Suggested Fix / Code Patch**:
  Verify that at least one valid question exists before creating the batch.

---

#### BUG-LOW-11: Inconsistent Question Sorting in Sequential Non-Shuffled Mode
- **Specialist Ref**: `BUG-QZ-03`
- **Subsystem**: Quiz Engine / Question Ordering
- **Affected File & Line Number(s)**: `lib/handlers/quiz-generate.js:73`
- **Root Cause Analysis**:
  Non-shuffled quizzes order by `created_at ASC`, forcing study sessions to practice oldest seed questions while hiding newly added past exam questions (which use `created_at DESC` elsewhere).
- **Steps to Reproduce**:
  1. Add new questions to a topic and launch a practice quiz with `shuffle: false`.
  2. First questions served are the oldest legacy seed questions.
- **Suggested Fix / Code Patch**:
  Order by `created_at DESC, q.rowid DESC`.

---

#### BUG-LOW-12: Keyboard Shortcut Only Supports Keys 1–4, Breaking 5-Option Exams
- **Specialist Ref**: `BUG-QZ-11`
- **Subsystem**: Quiz Engine / Keyboard Navigation
- **Affected File & Line Number(s)**: `public/js/quiz-runner.js:444-453`
- **Root Cause Analysis**:
  Shortcut listener checks `if (['1', '2', '3', '4'].includes(e.key))`. For 5-option RPSC exams, pressing '5' (for Option E) is ignored.
- **Steps to Reproduce**:
  1. On a question with 5 options, press key `5`. Option E is not selected.
- **Suggested Fix / Code Patch**:
  Update to include `'5'`: `['1', '2', '3', '4', '5'].includes(e.key)`.

---

#### BUG-LOW-13: Retry Quiz Button Reuses Stale `startTime`, Corrupting Session History
- **Specialist Ref**: `BUG-QZ-16`
- **Subsystem**: Quiz Engine / Session Lifecycle
- **Affected File & Line Number(s)**: `public/js/quiz-runner.js:540-552`
- **Root Cause Analysis**:
  Clicking "🔄 यही टेस्ट पुनः दें" resets answers and timer, but does not update `startTime`. If a user retries 30 minutes later, the submission reports the original session's `startTime`.
- **Steps to Reproduce**:
  1. Complete a quiz, wait 5 minutes, click Retry, and submit.
  2. Payload retains the initial session timestamp.
- **Suggested Fix / Code Patch**:
  Add `startTime = new Date().toISOString();` inside `btnRetrySame.onclick`.

---

#### BUG-LOW-14: Event Listener Accumulation Leak on Result Filter Pills Upon Retry
- **Specialist Ref**: `BUG-QZ-17`
- **Subsystem**: Quiz Engine / Event Listeners
- **Affected File & Line Number(s)**: `public/js/quiz-runner.js:527-537`
- **Root Cause Analysis**:
  Inside `showResults()`, `pillButtons.forEach(btn => btn.addEventListener('click', ...))` attaches another click listener every time a quiz is retried and submitted. After 3 retries, clicking a filter pill triggers `renderReviewCards()` 3 times.
- **Steps to Reproduce**:
  1. Complete a quiz, retry and complete it 3 times.
  2. Clicking a filter pill triggers review rendering 3 times.
- **Suggested Fix / Code Patch**:
  Attach filter pill listeners once during `DOMContentLoaded` outside `showResults()`.

---

## 3. Prioritized Remediation Roadmap

The remediation plan is organized into 3 sequential implementation phases to ensure operational safety and system stability:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PRIORITIZED REMEDIATION ROADMAP                      │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: Immediate Security & Scoring Hotfixes (Criticals)             │
│ - Admin auth cookie standardization (BUG-CRIT-02)                      │
│ - Smart search CPU exhaustion fix & table scan cap (BUG-CRIT-03)       │
│ - Server URL/Host exception safety & stream error handles (BUG-CRIT-04)│
│ - Eliminate client shuffled_options trust & scoring inversion (09, 11) │
│ - Deduplicate submitted question IDs (BUG-CRIT-12)                     │
│ - Results view keyboard listener detachment (BUG-CRIT-01)              │
│ - Multi-topic numeric routing namespace fix (BUG-CRIT-07)              │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Ingestion & Mobile Usability Hardening (Highs)                │
│ - Transactional batch ingestion & compensating rollback (BUG-CRIT-06)  │
│ - SHA-256 normalized question deduplication (BUG-HIGH-09)              │
│ - RPSC Option E & 1/3 negative marking compliance (BUG-CRIT-10, H-18)  │
│ - Option key canonical A-E normalization on ingest (BUG-HIGH-10, H-11) │
│ - Mobile form grid layout responsiveness (BUG-HIGH-02)                 │
│ - Quiz builder sticky palette overlap & modal z-index fixes (H-03, 04) │
│ - LocalStorage try/catch fallback for private browsing (BUG-HIGH-06)   │
│ - Wall-clock timer delta calculation for background tabs (BUG-HIGH-16) │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Edge Cases, UI Polish & Rajasthan Standards (Mediums & Lows)  │
│ - WCAG 44px touch targets on mobile controls (BUG-MED-03)              │
│ - Search keyword entity corruption prevention (BUG-MED-04)             │
│ - Smart search cache invalidation on batch commit/update (BUG-MED-12)  │
│ - True Fisher-Yates option shuffling (BUG-MED-19)                      │
│ - Exam tag extraction trailing punctuation relaxation (BUG-MED-17)     │
│ - Trailing slash route normalization (BUG-LOW-06)                      │
│ - 5-option keyboard shortcut support (BUG-LOW-12)                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Phase 1: Immediate Security & Scoring Hotfixes (Criticals)
- **Target**: Block active exploit vectors, eliminate server crashes, prevent score falsification, and restore admin access.
- **Key Actions**:
  1. Standardize admin cookie name in `lib/auth.js` to `prashn_admin_token` (`BUG-CRIT-02`).
  2. Prevent CPU lockup by bounding `getOrBuildVocabulary` in `lib/smart-search.js` to tags and topic terms (`BUG-CRIT-03`).
  3. Wrap `new URL()` in `server.js` with `try/catch` and attach error listeners to static file streams (`BUG-CRIT-04`).
  4. Validate `shuffled_options` against database options and clamp `negative_mark` / `marks_per_question` to valid non-negative ranges (`BUG-CRIT-09`, `BUG-CRIT-11`).
  5. Deduplicate `question_ids` in `quiz-submit.js` (`BUG-CRIT-12`).
  6. Remove global keydown shortcuts upon displaying quiz results (`BUG-CRIT-01`).
  7. Scope numeric topic resolution to the target `subject_id` (`BUG-CRIT-07`).

### 3.2 Phase 2: Ingestion & Mobile Usability Hardening (Highs)
- **Target**: Prevent database corruption, eliminate duplicate bloat, ensure mobile usability, and enforce CBT rules.
- **Key Actions**:
  1. Wrap bulk insertions in atomic write batches or add compensating rollbacks on partial failure (`BUG-CRIT-06`).
  2. Implement SHA-256 normalized hash check to prevent duplicate question imports (`BUG-HIGH-09`).
  3. Fully implement RPSC Option E rules: immunize Option E from negative penalties, deduct 1/3 on blanks, and flag >10% blank disqualification (`BUG-CRIT-10`, `BUG-HIGH-18`).
  4. Normalize all option keys (`1-5`, `अ-य`) to standard letters `A-E` on ingest (`BUG-HIGH-10`, `BUG-HIGH-11`).
  5. Convert hardcoded inline form grids to responsive CSS classes for mobile screens (`BUG-HIGH-02`).
  6. Elevate admin modal z-index to 2000 and unstick `.palette-sidebar` on mobile viewports (`BUG-HIGH-03`, `BUG-HIGH-04`).
  7. Safeguard `localStorage` access in `api.js` with in-memory fallbacks (`BUG-HIGH-06`).
  8. Calculate timer remaining seconds using `targetEndTime - Date.now()` to defeat background tab throttling (`BUG-HIGH-16`).

### 3.3 Phase 3: Edge Cases, UI Polish & Standards (Mediums & Lows)
- **Target**: Accessibility compliance, performance optimization, and localized UX polish.
- **Key Actions**:
  1. Expand mobile touch targets to >= 44px per WCAG 2.5.5 (`BUG-MED-03`).
  2. Escape only non-matched fragments during search keyword highlighting (`BUG-MED-04`).
  3. Invalidate smart search cache upon staging batch commit, question update, and delete (`BUG-MED-12`).
  4. Replace `Math.random() - 0.5` with genuine Fisher-Yates array shuffling (`BUG-MED-19`).
  5. Support trailing Devanagari danda and leading bracket tags in exam tag extraction (`BUG-MED-17`).
  6. Strip trailing slashes before route dispatching in `server.js` (`BUG-LOW-06`).
  7. Add key '5' to quiz runner keyboard shortcuts for 5-option examinations (`BUG-LOW-12`).

---

## 4. Verification & Testing Methodology

To independently verify all findings and validate patches:

1. **Automated Test Suite**:
   ```bash
   node --test tests/*.test.js
   ```
2. **Security & Auth Verification**:
   ```bash
   # Verify cookie auth works after patch:
   curl -i -X POST http://localhost:3000/api/subjects -H "Cookie: prashn_admin_token=admin" -H "Content-Type: application/json" -d '{"id":"test_subj","name":"Test Subject"}'
   ```
3. **Scoring Integrity & Anti-Tamper Verification**:
   ```bash
   # Verify negative penalty cannot award positive marks:
   curl -i -X POST http://localhost:3000/api/quiz/submit -H "Content-Type: application/json" -d '{"question_ids":["q_example"],"submitted_answers":{"q_example":"WRONG"},"negative_mark":-100}'
   # Verify duplicate question_ids cannot inflate score:
   curl -i -X POST http://localhost:3000/api/quiz/submit -H "Content-Type: application/json" -d '{"question_ids":["q_example","q_example","q_example"],"submitted_answers":{"q_example":"A"}}'
   ```
4. **Mobile Layout & Viewport Verification**:
   - Inspect `/question-form.html`, `/quiz-runner.html`, and `/quiz-builder.html` under Chrome DevTools Device Mode set to `360 x 640` and `375 x 667`.

---
*End of Prashn-Kosh Master Full-Stack Quality & Security Bug Report.*
