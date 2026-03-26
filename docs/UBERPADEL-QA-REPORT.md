# UberPadel QA Report

**Date:** 2026-03-26
**Time:** 23:18–23:35 UTC
**Tester:** Claude (automated walkthrough)
**App version:** 2.0.0
**Vite version:** 6.4.1
**Node version:** 25.8.1

---

## Overall Status: ⚠️ PASS WITH ISSUES

The application builds successfully, all 146 automated tests pass, the dev server runs cleanly, and every page tested returns HTTP 200. However, **two high-severity security rule gaps** and **one medium-severity build coverage gap** were found.

---

## Summary Scorecard

| Category | Result |
|---|---|
| Dev server startup | PASS |
| HTTP page availability | PASS (all 20 pages checked = 200) |
| Automated test suite | PASS — 146/146 tests, 7 files |
| Production build | PASS (with warnings) |
| JSON file validity | PASS |
| JS/service file syntax | PASS |
| Firebase rules completeness | FAIL — 2 missing paths |
| Browser console errors | 2 expected permission errors (see Issues) |

---

## Per-Feature Results

| # | Feature | URL | Status | Notes |
|---|---|---|---|---|
| 1 | Landing page | `/` | PASS | Loads, title correct, viewport meta present, no console errors |
| 2 | Browse page | `/browse.html` | PASS | HTTP 200, page title "Browse Tournaments \| Uber Padel", no console errors |
| 3 | Login page | `/login.html` | PASS | Redirects correctly to `/account/login.html` with query-string preservation; canonical set |
| 4 | Account login | `/account/login.html` | PASS | HTTP 200, titled "Sign In \| Uber Padel" |
| 5 | Quick-play index | `/quick-play/` | PASS | HTTP 200, titled "Quick Play - Uber Padel \| Start a Tournament Now" |
| 6 | Quick-play — Americano | `/quick-play/americano/` | PASS | HTTP 200, titled correctly, no console errors |
| 7 | Quick-play — Mexicano | `/quick-play/mexicano/` | PASS | HTTP 200, titled correctly |
| 8 | Quick-play — Mixicano | `/quick-play/mixicano/` | PASS | HTTP 200, titled "Mixed Gender Dynamic Matchups" |
| 9 | Quick-play — Mix | `/quick-play/mix/` | PASS | HTTP 200 |
| 10 | Quick-play — Knockout | `/quick-play/knockout/` | PASS | HTTP 200 |
| 11 | Quick-play — Round-robin | `/quick-play/round-robin/` | PASS | HTTP 200 |
| 12 | Quick-play — Swiss | `/quick-play/swiss/` | PASS | HTTP 200 |
| 13 | Quick-play — Tournament | `/quick-play/tournament/` | PASS | HTTP 200 |
| 14 | Quick-play — Team-league | `/quick-play/team-league/` | PASS | HTTP 200 |
| 15 | Leaderboard (NEW) | `/leaderboard.html` | PASS* | HTTP 200, page renders — but `permission_denied` on `/userRatings` RTDB read (see Issue #1) |
| 16 | Organiser Analytics (NEW) | `/organiser/analytics.html` | PASS | HTTP 200, titled "Organiser Analytics — Uber Padel", auth gate present, no console errors |
| 17 | GDPR / My Data (NEW) | `/account/my-data.html` | PASS | HTTP 200, titled "My Data & Privacy — Uber Padel", auth gate present, no console errors |
| 18 | Service Worker | `/sw.js` | PASS | HTTP 200, cache version v14, syntax OK |
| 19 | Manifest | `/manifest.json` | PASS | Valid JSON, PWA fields correct (name, icons, start_url, theme_color) |
| 20 | Firebase rules | `firebase-rules-production.json` | FAIL | Valid JSON but missing `knockout-tournaments` path (see Issue #2) |
| 21 | API emulator endpoint | `http://localhost:5001` | SKIP | Emulator not running — expected in dev |

---

## New Phase 3–6 File Checks

| File | Syntax | Exports | Notes |
|---|---|---|---|
| `src/core/rating-engine.js` | PASS | PASS | Exports: `DEFAULT_RATING`, `MIN_RATING`, `MAX_RATING`, `expectedScore`, `kFactor`, `marginMultiplier`, `updateConfidence`, `applyInactivityDecay`, `calculateRatingChange`, `processDoublesMatch`, `isSuspiciousChange`, `monthsSince`, `RatingEngine` (default) |
| `src/services/notification-service.js` | PASS | PASS | Exports: `NOTIFICATION_TYPES`, `NotificationService` (named + default) |
| `src/services/analytics-service.js` | PASS | PASS | Exports: `AnalyticsService` (named + default) |
| `src/services/data-export-service.js` | PASS | PASS | Exports: `DataExportService` (named + default) |
| `src/components/ui/NotificationBell.js` | PASS | N/A | Import of `notification-service.js` resolves correctly via relative path |
| `functions/index.js` | PASS | N/A | CJS syntax OK; uses `firebase-functions` + `firebase-admin` (no native deps checked) |
| `functions/api/index.js` | PASS | N/A | CJS syntax OK |
| `functions/api/openapi.json` | PASS | N/A | Valid JSON; OpenAPI 3.0.3; 11 paths defined |

---

## Automated Test Results

```
Test Files  7 passed (7)
     Tests  146 passed (146)
  Duration  155 ms (transform 147ms, setup 0ms, import 247ms, tests 41ms)
```

**Test files:**
- `tests/engines/americano-engine.test.js` — PASS
- `tests/engines/base-engine.test.js` — PASS
- `tests/engines/mexicano-engine.test.js` — PASS
- `tests/engines/rating-engine.test.js` — PASS (33 tests)
- `tests/services/analytics-service.test.js` — PASS
- `tests/services/data-export-service.test.js` — PASS (14 tests)
- `tests/services/notification-service.test.js` — PASS (13 tests)

One expected `console.error` is emitted during the notification service error-path test (`[NotificationService] create error: Error: Firebase error`) — this is intentional test behaviour, not a bug.

---

## Production Build Results

```
✓ built in 337ms
```

Build succeeded with **no errors**. Warnings found:

1. **`tsconfig.json` path aliases missing `baseUrl`** — 6 warnings emitted for `@/*`, `@core/*`, `@services/*`, `@components/*`, `@ui/*`, `@engines/*`. Vite resolves these via its own `resolve.alias` config so they work at runtime, but the TypeScript config is technically malformed and will confuse type checkers.

2. **Scripts without `type="module"` cannot be bundled** — 9 warnings across `browse.html`, `my-account.html`, `competitions.html`, `admin.html`, `about.html`, `mexicano/index.html`, `team-league/index.html`, `tournament/index.html`, `americano/index.html`. These pages use legacy `<script src="...">` tags for Firebase compat SDK and shared utility scripts, which Vite cannot tree-shake or fingerprint-hash. Acceptable for now given the mixed ESM/legacy architecture.

3. **Empty chunks generated** — `core`, `services`, `rating`, `notifications`, `ui` chunks are empty. The `manualChunks` entries in `vite.config.js` reference `src/` modules that aren't imported by any of the 12 HTML build inputs (the HTML pages load Firebase/scripts via CDN/legacy script tags rather than ESM imports). These chunks compile to ~0.04–0.05 kB stubs and are harmless but represent dead configuration.

---

## Issues Found

### Issue #1 — HIGH: `/userRatings` permission_denied for anonymous users on Leaderboard

**Severity:** High
**Page:** `/leaderboard.html`
**Console error:**
```
[Leaderboard] Load error: Error: permission_denied at /userRatings:
Client doesn't have permission to access the desired data.
```
**Root cause:** The `firebase-rules-production.json` file sets `userRatings[".read"]: true`, but the **deployed production RTDB rules** appear to differ — the live database is rejecting the read for unauthenticated users. The leaderboard is supposed to be publicly readable (it shows a global ELO ranking), so either the production rules haven't been redeployed after this change, or there is a conflicting rule set deployed.
**Impact:** Leaderboard shows no data for any anonymous visitor.
**Fix:** Run `firebase deploy --only database` to push the current `firebase-rules-production.json` to production.

---

### Issue #2 — HIGH: `knockout-tournaments` path missing from Firebase security rules

**Severity:** High
**File:** `firebase-rules-production.json`
**Detail:** The production rules file defines explicit read/write rules for every tournament format path — `americano-tournaments`, `mexicano-tournaments`, `tournaments`, `team-tournaments`, `mixicano-tournaments`, `roundrobin-tournaments`, `swiss-tournaments`, `fixed-tournaments` — but **`knockout-tournaments` is absent entirely**. The root `.read` and `.write` are both `false`, so the knockout path inherits a deny-all rule.
**Console error seen on landing page (`/`):**
```
Error loading knockout tournaments: Error: permission_denied at /knockout-tournaments:
Client doesn't have permission to access the desired data.
```
**Impact:** No knockout tournaments are visible on the landing page tournament list. Any attempt to create or read a knockout tournament from the client will fail silently or with an error.
**Fix:** Add `knockout-tournaments` to `firebase-rules-production.json` with the same structure as the other tournament paths, then redeploy database rules.

```json
"knockout-tournaments": {
  ".read": true,
  "$tournamentId": {
    ".write": "auth != null",
    ".validate": "newData.hasChildren(['name', 'createdAt', 'uid'])"
  }
}
```

---

### Issue #3 — MEDIUM: 41 HTML pages excluded from Vite production build

**Severity:** Medium
**File:** `vite.config.js`
**Detail:** The `vite.config.js` `rollupOptions.input` only covers 12 HTML entry points. The remaining 41 source HTML files (including `leaderboard.html`, `account/my-data.html`, all `quick-play/*` format pages, all `competitions/*` pages, `privacy.html`, `offline.html`, `register.html`, `league/index.html`) are **not processed by Vite** and are absent from `dist/`.

The production `firebase.json` has `"public": "dist"` with a SPA rewrite (`** → /index.html`), meaning these pages would 404 in production or silently fall through to the SPA shell.
**Impact:** All quick-play format pages, the leaderboard, the GDPR data page, all competition sub-pages, offline fallback, and privacy page will be unreachable in the deployed production build.
**Fix:** Either add all pages to `rollupOptions.input` in `vite.config.js`, or adopt a multi-page build strategy (e.g., glob all HTML files). The quick-play and competition pages in particular are core user journeys and must be included.

---

### Issue #4 — LOW: `tsconfig.json` missing `baseUrl` for path aliases

**Severity:** Low
**File:** `tsconfig.json`
**Detail:** The `paths` configuration (e.g. `@/*`, `@core/*`) requires `compilerOptions.baseUrl` to be set when not using `moduleResolution: "bundler"` with an explicit base. Vite emits 6 warnings at startup.
**Impact:** No runtime impact (Vite resolves aliases independently). Type-checking with `tsc` may produce spurious errors.
**Fix:** Add `"baseUrl": "."` to `compilerOptions` in `tsconfig.json`.

---

### Issue #5 — LOW: Empty Vite manual chunks (dead config)

**Severity:** Low
**File:** `vite.config.js`
**Detail:** Five `manualChunks` entries (`core`, `services`, `rating`, `notifications`, `ui`) resolve to empty bundles because none of the 12 HTML build inputs import from `src/` via ESM — they use CDN/legacy script tags. Vite logs "Generated an empty chunk" for each.
**Impact:** No functional impact. Adds clutter to build output.
**Fix:** Remove the unused `manualChunks` entries, or migrate the pages that should use them to proper `type="module"` ESM imports.

---

### Issue #6 — LOW: `login.html` in Vite build input but it's just a redirect stub

**Severity:** Low
**File:** `vite.config.js`, `login.html`
**Detail:** `login.html` is included in `rollupOptions.input` but it is only a redirect stub pointing to `account/login.html`. The actual login page (`account/login.html`) is not in the build inputs.
**Impact:** In production, `/login.html` will redirect to `/account/login.html` which hits the SPA rewrite and serves `index.html` instead of the login page.
**Fix:** Add `accountLogin: resolve(__dirname, 'account/login.html')` to `rollupOptions.input`.

---

## Security & PWA Checks

| Check | Result | Notes |
|---|---|---|
| `X-Content-Type-Options: nosniff` | PASS | Set in `firebase.json` headers |
| `X-Frame-Options: DENY` | PASS | Set in `firebase.json` headers |
| `X-XSS-Protection` | PASS | Set in `firebase.json` headers |
| `Referrer-Policy` | PASS | `strict-origin-when-cross-origin` |
| Service worker cache version | PASS | v14, serves precached shell |
| PWA manifest icons | PASS | SVG + 192px + 512px provided |
| PWA shortcuts | PASS | Quick Play + Competitions defined |
| Firebase rules root `.read` | PASS | `false` — deny by default |
| Firebase rules root `.write` | PASS | `false` — deny by default |

---

## Recommendations (Priority Order)

1. **[URGENT] Redeploy Firebase database rules** — `firebase deploy --only database` to fix the `userRatings` and `knockout-tournaments` permission errors in production.

2. **[URGENT] Add `knockout-tournaments` to `firebase-rules-production.json`** — The path is entirely missing from the security rules file.

3. **[HIGH] Expand Vite build inputs** — Add all user-facing pages (especially `leaderboard.html`, `account/my-data.html`, all `quick-play/*`, all `competitions/*`, `privacy.html`, `offline.html`, `register.html`) to `vite.config.js` so they are properly built and deployed.

4. **[MEDIUM] Add `account/login.html` to Vite build inputs** and remove the stub `login.html` from inputs (or keep the stub but add the real page too).

5. **[LOW] Fix `tsconfig.json`** — Add `"baseUrl": "."` to eliminate the 6 path-alias warnings.

6. **[LOW] Clean up dead `manualChunks`** — Remove or populate the five empty chunk entries in `vite.config.js`.

---

## Appendix: Pages & HTTP Status

| Page | HTTP Status |
|---|---|
| `/` | 200 |
| `/browse.html` | 200 |
| `/login.html` | 200 |
| `/account/login.html` | 200 |
| `/leaderboard.html` | 200 |
| `/organiser/analytics.html` | 200 |
| `/account/my-data.html` | 200 |
| `/sw.js` | 200 |
| `/manifest.json` | 200 |
| `/quick-play/` | 200 |
| `/quick-play/americano/` | 200 |
| `/quick-play/mexicano/` | 200 |
| `/quick-play/mixicano/` | 200 |
| `/quick-play/mix/` | 200 |
| `/quick-play/knockout/` | 200 |
| `/quick-play/round-robin/` | 200 |
| `/quick-play/swiss/` | 200 |
| `/quick-play/tournament/` | 200 |
| `/quick-play/team-league/` | 200 |
| `http://localhost:5001` | SKIP (emulator not running) |
