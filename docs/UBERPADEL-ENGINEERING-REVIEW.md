# UberPadel — Engineering Review
**Reviewer:** Head of Engineering (Playtomic perspective)
**Date:** March 2026
**Version Reviewed:** 2.0.0 (last commit February 19, 2026)
**Verdict:** Prototype-quality code in a production-shaped container. Impressive breadth, significant depth problems.

---

## Executive Summary

UberPadel is a padel tournament management web app with genuine ambition: 8 tournament formats, real-time multi-user sync, player profiles, competition management, PWA support. The feature surface is broader than most competitors. The engineering underneath does not match that ambition.

The codebase reads as an iterative prototype that was never refactored into production-quality software. The architecture has good bones — modular engines, service layer, shared components — but the implementation has critical security vulnerabilities, zero test coverage, duplicated code across formats, missing error handling, and structural decisions that will become increasingly painful at scale.

This is not a knock on the solo/small-team effort that built it. What exists is impressive for what it is. But before a real launch, significant work is needed.

**Scores:**
| Area | Score | Summary |
|------|-------|---------|
| Architecture & Code Quality | 5/10 | Good structure ideas, poor execution |
| UX & Design | 6/10 | Mobile-first, clean — but rough edges everywhere |
| Performance & Scalability | 5/10 | Firebase well-used, but will hit walls at scale |
| Security | 3/10 | Multiple critical vulnerabilities |
| Feature Completeness | 7/10 | Broadest format support in the market, missing depth |
| DevOps & Reliability | 2/10 | No CI/CD, no monitoring, no error tracking |
| **Overall** | **5/10** | **Ship-able for small audiences, not for scale** |

---

## 1. Architecture & Code Quality — 5/10

### What's Good
The architectural intent is correct. There is a real separation of concerns: `engines/` handle tournament logic, `services/` handle data persistence, `components/ui/` handle rendering, `core/` handles infrastructure. The ES module system is used properly. Vite configuration with manual code chunking is thoughtful.

### What's Broken

**The Dual-Layer Problem (High)**
There are two parallel JavaScript worlds: the modern `src/` tree (Vite-built, modular) and the legacy `quick-play/*/js/` directories where each tournament format has its own copy of `firebase-config.js`, `state.js`, `auth.js`, `handlers.js`, and `router.js`. These are not shared — they are literal copies. This means:
- Bugs fixed in one place are not fixed in others
- Feature additions must be made 8 times
- No single source of truth for firebase config, auth logic, or state management

This is the single most damaging structural problem in the codebase.

**Duplicate Engine Directories (Medium)**
`src/engines/` (legacy, PascalCase) and `src/core/engines/` (modern, kebab-case) coexist with overlapping implementations. It is unclear which is authoritative for which formats.

**Global State via `window` (Medium)**
`src/main.js` assigns ~10 internal modules directly to `window`:
```javascript
window.Firebase = Firebase;
window.Auth = Auth;
window.TournamentService = TournamentService;
// ... etc
```
This bypasses the ES module system entirely, creates namespace pollution, and makes testing impossible. It exists to bridge the legacy quick-play pages that weren't refactored to use imports.

**No Tests — Zero Coverage (Critical)**
There is no test directory, no test runner configured, no `.test.js` or `.spec.js` files anywhere in the project. The tournament engines — which contain complex algorithms for fixture generation, standings calculation, tiebreakers, and pairing logic — have zero automated verification. A bug in `calculateStandings()` in `americano-engine.js` (a 65-line function) could silently display wrong results to players in a live tournament. For a platform where final standings determine competition outcomes, this is unacceptable.

**Error Handling is Inconsistent (High)**
Async operations throughout the codebase lack try/catch. Firebase calls fail silently. The main `init()` function in `main.js` has no error boundary — if Core.init() throws, the entire app crashes with no user feedback. Service methods return `{ success: false, error: '...' }` in some places and throw exceptions in others, with no consistent contract.

**Score Storage Inconsistency (Medium)**
`null` scores are stored as `-1` in Firebase (since Firebase drops null fields). This sentinel value is normalised back in `base-engine.js`, but the normalisation is not applied consistently — it is scattered across `base-engine.js`, `americano-engine.js`, and `base-tournament.js`. A missed normalisation causes incorrect standings.

**Magic Numbers with Conflicting Defaults (Medium)**
`format-config.js` defaults `pointsPerMatch` to `32`. `base-engine.js` defaults it to `24`. These silent inconsistencies cause format-specific bugs that are hard to trace.

**No TypeScript, No JSDoc (Medium)**
No type safety anywhere. Object shapes (Tournament, Player, Score, Competition) are inferred from usage. This makes refactoring dangerous and onboarding slow.

**Overly Long Functions (Low)**
`calculateStandings()` is 74 lines handling 5 distinct concerns. `generateTimeslots()` is 49 lines of undocumented algorithm. These should each be 3-5 focused functions.

---

## 2. UX & Design — 6/10

### What's Good
The product looks clean on mobile. Tailwind is used well — consistent spacing, readable typography, good use of colour for status states. The TV mode is a genuinely strong differentiator. The quick-play entry flow (pick format → enter players → start) is low-friction. PWA support means the app can be installed from a browser, which is meaningful for casual users.

### What's Rough

**No Optimistic Updates**
Every score save waits for a Firebase round-trip (200-500ms on a mobile connection) before the UI updates. In a live tournament with players entering scores simultaneously, this creates perceptible lag and the sensation that buttons aren't working. Players tap twice, creating duplicate submissions.

**Loading States are Incomplete**
Some pages show a spinner while data loads; others show a blank screen or a flash of empty content. There is no skeleton loading pattern.

**Error States are Missing**
When Firebase fails (network drop, rules violation, quota), most pages show nothing. There is no "something went wrong — tap to retry" pattern. Players lose entered scores with no warning.

**Navigation Between Modes is Confusing**
The relationship between "Quick Play" and "Competitions" is not clear from the main landing page. Users who want a structured competition with registration don't know where to look. The information architecture needs a rethink.

**Form Validation Feedback is Inconsistent**
Some forms validate on submit, some inline, some not at all. Player name inputs allow empty strings. Score inputs allow values outside any reasonable range on some formats.

**No Undo for Score Entry**
Once a score is submitted, there is no undo. The only fix is to re-enter the score, which is not obvious to first-time users.

**Accessibility (Low)**
No ARIA labels on interactive elements. Colour contrast in some areas (grey text on white) is borderline WCAG AA. Keyboard navigation has not been tested. Screen readers cannot meaningfully navigate the tournament views.

**iOS-Specific Issues**
The existing `CODE_REVIEW_AND_IOS_PLAN.md` acknowledges iOS-specific problems with scroll behaviour and input focus. These are known but unresolved.

---

## 3. Performance & Scalability — 5/10

### What's Good
Firebase Realtime Database is a solid choice for the real-time sync use case. The granular path-based updates (saving individual scores rather than full tournament documents) are correct and reduce unnecessary data transfer. Firebase rules include `.indexOn` directives for common query fields. The service worker cache strategy is well thought out — network-first for Firebase, cache-first for static assets.

### What's Problematic

**Firebase Listener Lifecycle (High)**
Listeners are attached with `ref.on('value', callback)` but cleanup is inconsistent. If a component remounts (user navigates away and back), duplicate listeners accumulate. Each listener fires on every data change, so with 10 duplicate listeners and 24 players all scoring simultaneously, you get 240 UI updates per score entry. This is the most likely cause of the "laggy on mobile" experience already reported.

**O(n²) Standings Calculation (Medium)**
`calculateStandings()` iterates all rounds × all matches × all players, performing a player-index lookup on every iteration. For a 24-player tournament with 8 rounds of 6 matches each, that is 1,152 iterations. Not catastrophic today, but not efficient either. The standings recalculate on every Firebase update — with 24 players all submitting scores, this function runs 24 times in quick succession.

**No Debouncing on Score Writes (Medium)**
Score inputs (particularly in fixed-points mode where players adjust scores with +/- buttons) write to Firebase on every button press. A player adjusting a score from 0 to 10 by pressing + ten times generates 10 Firebase writes. Debouncing to 500ms would reduce this by 90%.

**No Pagination in Competition Lists (Medium)**
`competition-service.js` fetches up to 50 competitions by default with no cursor-based pagination. At 1,000 competitions, this becomes a slow, expensive query. The current `limitToLast(50)` approach does not support true pagination.

**Full Tournament Loaded on Every Subscription (Medium)**
The entire tournament object (meta + players + courts + rounds + scores) is loaded whenever any field changes. For a large tournament with 100+ matches, this means every score entry triggers a full tournament re-fetch. Firebase Realtime Database supports granular path subscriptions — scores should be subscribed separately from meta, players, and structure.

**At Scale — Realistic Ceiling**
With the current architecture:
- 10-20 simultaneous tournaments: fine
- 100 simultaneous tournaments: degraded performance from duplicate listeners and full-document subscriptions
- 1,000 users: Firebase free tier quota risk (50 simultaneous connections, 1GB download/day)
- 10,000 users: requires Firebase Blaze plan + architectural changes

---

## 4. Security — 3/10

This section is the most urgent. Multiple vulnerabilities require fixing before any public launch with real users.

### Critical

**Firebase Credentials Hardcoded in JavaScript (Critical)**
API keys, project IDs, database URLs, and app IDs are hardcoded in `src/core/firebase.js`, `competitions/competition-service.js`, and in every `quick-play/*/js/firebase-config.js`. These are included in the built JavaScript bundle, which is publicly downloadable.

This is a common misconception: Firebase client-side API keys are not secrets in the same way a server-side API key is — they are designed to be public. The security model relies entirely on Firebase Security Rules. *However*, the current rules (see below) are insufficient to prevent abuse.

**Immediate fixes required:**
1. Move to environment variables (`.env`) for all Firebase config
2. Enable Firebase App Check (verifies requests come from your actual app, not arbitrary scripts)
3. Lock down Security Rules (see below)

**Firebase Security Rules Allow Writes Without Ownership Verification (Critical)**
The production rules allow any request to write to any tournament:
```json
"$tournamentId": {
    ".write": true
}
```
Any person who reads the source code (trivial — it is client-side JavaScript) can write arbitrary data to any tournament ID. They could corrupt results, delete player lists, or flood the database. The organiser passcode system is a UI-level check that bypasses the database entirely.

**Fix:** Rules must verify that the `organizerUid` field on the tournament matches `auth.uid` for all write operations beyond score entry.

**Weak Passcode Hashing Fallback (Critical)**
`base-tournament.js` includes a fallback hash function for environments without Web Crypto:
```javascript
let hash = 0;
for (let i = 0; i < passcode.length; i++) {
    const char = passcode.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
}
```
This is a Java `String.hashCode()` clone — not a cryptographic hash. It produces collisions, is trivially reversible for short inputs, and is vulnerable to rainbow table attacks. A 4-digit PIN has only 10,000 possible hashes, all computable in milliseconds.

**Fix:** Remove the fallback. Web Crypto is available in all browsers that support ES modules. If Web Crypto is unavailable, refuse to create the tournament rather than falling back to weak hashing.

### High

**XSS via innerHTML in Modal and Toast Components (High)**
`Modal.js` renders `config.content` directly via template literals into `innerHTML`. `Toast.js` does the same with the `message` parameter. If any user-controlled data (player names, tournament names, error messages from Firebase) is passed to these components, it can inject arbitrary HTML and JavaScript.

Example attack: a player named `<img src=x onerror=alert(document.cookie)>` would execute JavaScript when their name appears in a modal.

**Fix:** Use `textContent` for all user-provided strings. Use `DOMPurify` if HTML rendering is genuinely required.

**Organiser Key Transmitted in URL (High)**
The organiser key appears in the URL hash as `?key=organiserKey`. This key is logged in browser history, visible in referrer headers when following links from the tournament page, and can be bookmarked and accidentally shared.

**Fix:** Store the key in `sessionStorage` after verification. Never transmit it as a URL parameter.

**Weak Random Number Generation for IDs (Medium)**
Tournament IDs and organiser keys use `Math.random()`. This is not cryptographically secure — the V8 implementation of `Math.random()` has known statistical weaknesses and is seeded from a predictable source. An attacker who observes several tournament IDs can predict future ones.

**Fix:** Use `crypto.getRandomValues()` (already imported via `shared/crypto.js` — apply it here).

**No Input Validation Client-Side Before Firebase Writes (Medium)**
Data is written to Firebase trusting that Firebase rules will reject invalid data. This is correct in principle (rules are the last line of defence), but without client-side validation, invalid submissions generate Firebase errors that are not shown to users, creating silent failures.

---

## 5. Feature Completeness — 7/10

### What UberPadel Has That Competitors Don't
- **8 tournament formats** in one platform: Americano, Mexicano, Mix, Mixicano, Knockout, Round Robin, Swiss, Team League. No competitor offers all of these in a single integrated product.
  - Playtomic: basic brackets only
  - PadelFast: 12 formats but no booking/community layer
  - PadelMix: Americano/Mexicano only, no persistence
- **TV/spectator mode** for court-side displays — no major platform does this in an integrated way
- **Zero install required** — works in browser, no app download friction
- **Quick-play sessions** with shareable link — low friction for casual organisers

### What's Missing vs. The Market

**No Payment Processing**
Every real tournament charges entry fees. Playtomic, PadelFast, and PLAYINGA all have integrated payment collection. UberPadel has no payment layer. This is not optional for commercial operators.

**No ELO/Rating System**
Playtomic, PadelFast, and World Padel Rating all maintain persistent player ratings that update after every match. UberPadel has player profiles and win rates but no algorithmic rating system. A credible rating system is a major platform-stickiness driver — players come back because their rating lives here.

**No Court Booking Integration**
The core platform doesn't know about courts as bookable physical resources. You can define courts for a tournament, but there is no integration with a calendar, availability system, or booking flow. Playtomic, Padel Mates, and Taykus are fundamentally booking platforms.

**No Native Mobile Apps**
Playtomic, PadelFast, PadelMix, and Padel Mates all have native iOS and Android apps. UberPadel is PWA-only. On iOS, PWAs cannot receive push notifications (critical for live tournament updates), have restricted background sync, and have lower home screen install rates. The `REACT_NATIVE_MIGRATION_PLAN.md` acknowledges this gap.

**No Push Notifications**
No mechanism to alert players when their next match is ready, when scores are posted, or when the tournament bracket updates. In a live tournament with 24 players across 4 courts, this means players must keep the app open and manually refresh.

**No Bracket Visualisation**
Knockout format generates a bracket, but there is no visual bracket tree component (the kind that makes March Madness brackets compelling). Players cannot see the full bracket at a glance.

**No Post-Match Analysis**
No match history, head-to-head records, performance trends, or statistics beyond the current tournament. PadelFast and Playtomic both offer historical stats.

**No Organiser Analytics**
No dashboard showing: player retention, format popularity, average tournament size, registration conversion rates. Playtomic's analytics dashboard is a key value driver for club operators.

**No White-Label / Branding**
Clubs cannot brand the platform as their own. Every tournament shows UberPadel branding. Padel Mates and PadelOS offer club-branded apps as a primary selling point — this is the core reason Rocket Padel (35 courts) left Playtomic.

**No Dispute/Appeals Process**
No mechanism for players to flag incorrect scores. No admin override trail. The only fix is knowing the organiser passcode.

**Competition System is Feature-Complete but Unpolished**
The competitions module has the right pages (create, register, manage, dashboard, results) but `competition-service.js` is 44KB of a single file with no obvious factoring. It is functionally complete but fragile and hard to extend.

---

## 6. DevOps & Reliability — 2/10

This is the weakest area by a significant margin.

**No CI/CD Pipeline**
There is no `.github/workflows/`, no Netlify config, no Vercel config. Deployment appears to be a manual `git push` to a branch that GitHub Pages serves. There is no automated build validation, no PR preview environments, no deployment gates. A broken commit goes directly to production.

**No Error Tracking**
No Sentry, no Datadog, no Firebase Crashlytics integration. When something breaks in production for a user, there is no record of it. The internal bug report button saves reports to Firebase and can be viewed from the admin page.

**No Application Monitoring**
No uptime monitoring, no performance monitoring, no alerting. If the Firebase database becomes unreachable or the domain DNS fails, no one is notified until a user complains.

**No Logging**
`console.error()` calls exist in the source but are not sent anywhere. Production errors are invisible.

**No Automated Testing in CI**
No tests to run, even if CI existed.

**No Database Backups**
Firebase Realtime Database does not automatically back up data. If data is corrupted or accidentally deleted (which the current security rules allow any authenticated user to do), there is no recovery path. Firebase offers database export as a paid feature — it must be configured and scheduled.

**GitHub Pages Limitations**
GitHub Pages serves static files. There is no server-side rendering, no API layer, no edge functions. All Firebase calls are client-side. This means:
- No server-side rate limiting
- No request validation outside Firebase rules
- Firebase credentials visible in all served JavaScript
- Cannot implement server-side auth flows

**SSL/CDN**
GitHub Pages provides SSL via Let's Encrypt — this is fine. No additional CDN configuration exists. For global audiences, a CDN (Cloudflare, Fastly) in front of GitHub Pages would improve latency.

**Service Worker Version Management**
The service worker is manually versioned (`CACHE_VERSION = 'v14'`). There is no automated cache-busting tied to build hashes. Stale cached assets are a known source of "my app isn't updating" complaints.

---

## Competitive Context: Where UberPadel Sits

| Dimension | Playtomic | PadelFast | PadelMix | UberPadel |
|-----------|-----------|-----------|----------|-----------|
| Tournament formats | 1 (basic bracket) | 12 | 2 | **8** |
| Live scoring | Basic | Yes | Yes | **Yes** |
| TV/spectator mode | No | No | No | **Yes** |
| Court booking | Yes | No | No | No |
| Payment processing | Yes | Yes | No | No |
| ELO/rating system | Yes (gameable) | Yes | No | No |
| Native mobile app | Yes | Yes | Yes | No (PWA) |
| Push notifications | Yes | Yes | Yes | No |
| Data owned by clubs | **No** | Yes | Yes | **Yes** |
| Open registration | Yes | Yes | No | Yes |
| Analytics dashboard | Yes | Basic | No | No |
| White-label | No | No | No | No |
| Zero-install | No | No | No | **Yes** |
| Free to use | No | Freemium | Free | **Free** |

**UberPadel's genuine advantages:** format depth, TV mode, zero-install, free, data ownership (no vendor lock-in).
**UberPadel's critical gaps:** payments, ELO, native app, push notifications, analytics.

The market is moving toward data ownership as the primary club-side selling point (Rocket Padel's defection from Playtomic made headlines). UberPadel is well-positioned here by default — but needs to lead with it explicitly.

---

## Options for Improvement

---

### Option 1: Minimum Viable Fixes — Ship Something Presentable

**Philosophy:** Fix the showstoppers. Don't rebuild anything. Make the existing product safe to put real users on.

**Effort:** 2-4 weeks, 1 engineer

**What changes:**

1. **Security hardening (Week 1)**
   - Move Firebase config to `.env` via Vite's `import.meta.env`
   - Enable Firebase App Check
   - Fix Firebase rules to require `organizerUid === auth.uid` for all tournament writes
   - Remove weak hash fallback — require Web Crypto only
   - Fix Modal/Toast innerHTML XSS — replace with textContent + DOMPurify
   - Store organiser key in sessionStorage, remove from URL

2. **Error handling baseline (Week 1-2)**
   - Wrap all Firebase calls in try/catch with user-facing Toast on failure
   - Add global `unhandledrejection` handler with error reporting
   - Add retry logic on network failure for score submission

3. **Quick-play consolidation (Week 2-3)**
   - The 8 quick-play formats each have their own copy of `firebase-config.js` and `auth.js`. Consolidate these to import from `src/core/firebase.js` and `src/core/auth.js`
   - This eliminates the most dangerous maintenance trap without a full rebuild

4. **Listener cleanup (Week 2-3)**
   - Audit all `ref.on()` calls and ensure matching `ref.off()` in cleanup functions
   - Fix the duplicate listener accumulation on navigation

5. **Basic CI/CD (Week 3-4)**
   - Add GitHub Actions workflow: build on PR, deploy `main` to GitHub Pages
   - Add basic Lighthouse CI check (prevents shipping obvious regressions)
   - Add Sentry for error tracking (free tier is sufficient to start)

6. **Score debouncing**
   - 500ms debounce on all Firebase score writes
   - Optimistic UI update before Firebase confirmation

**Impact on UX:** Error messages instead of silent failures. Snappier score entry. No data corruption from duplicate listeners.

**Prioritise first:** Security fixes (#1) — these are blockers, not improvements. Then listener cleanup (#4) — it is causing the performance problems users already experience.

**What this does NOT fix:** Architecture debt, zero tests, no payments, no ELO, no native app.

---

### Option 2: Industry-Standard Rebuild of the Weak Areas

**Philosophy:** Keep what works (Firebase, Tailwind, Vite, the tournament engines). Rebuild what doesn't (architecture duplication, state management, the component layer, the DevOps). Deliver a codebase that a new engineer can work in confidently.

**Effort:** 2-3 months, 1-2 engineers

**What changes:**

1. **Unify the codebase — eliminate the dual-layer**
   - Refactor all 8 quick-play formats to use `src/core/firebase.js`, `src/core/auth.js`, and `src/core/router.js`
   - Delete the per-format copies of firebase-config, auth, state, handlers
   - Result: one firebase config, one auth module, one router, referenced by all formats

2. **TypeScript migration**
   - Add TypeScript to the Vite config (`vite-plugin-checker`, `tsconfig.json`)
   - Define interfaces: `Tournament`, `Player`, `Score`, `Match`, `Round`, `Competition`
   - Migrate `src/core/` and `src/services/` first (highest-leverage)
   - Keep quick-play JS files as `.js` during migration — TypeScript is progressive

3. **Test suite with Vitest**
   - Unit tests for all tournament engines: fixture generation, standings calculation, tiebreakers
   - Integration tests for Firebase service layer (using Firebase Emulator)
   - Target 80% coverage on `src/core/engines/`
   - Add to CI: tests must pass before merge

4. **State management layer**
   - Replace `window.*` globals with a lightweight store (Zustand is 1KB and works with vanilla JS)
   - Each tournament format subscribes to shared state slices
   - Eliminates the current pattern where components read from Firebase directly and independently

5. **Component library cleanup**
   - Audit all `innerHTML` usage — replace with DOM APIs or DOMPurify
   - Standardise error/loading states across all pages (one Loading component, one Error component)
   - Add skeleton screens for initial loads
   - Add optimistic updates to score submission

6. **Proper DevOps stack**
   - Move from GitHub Pages to Cloudflare Pages (better edge caching, environment variables, preview deployments per PR, built-in analytics)
   - Sentry for error tracking with source maps
   - Uptime monitoring via BetterUptime or similar (free tier)
   - Firebase scheduled exports for backups (daily)
   - GitHub Actions: build + test + lint + deploy pipeline

7. **Basic ELO system**
   - Cross-tournament rating stored in `users/{uid}/rating`
   - Updates after every competitive match via Firebase Cloud Function
   - Simple K-factor model (can be tuned later)
   - Display on player profiles and leaderboard

**Impact on UX:** Substantially faster score entry (optimistic updates). No silent failures. Consistent loading/error states across the app. Ratings create return visits.

**Prioritise first:** The codebase unification (#1) unlocks everything else — you can't confidently test or type-check a codebase where each format is a copy of the others. Do that first, then tests (#3), then TypeScript (#2).

**What this does NOT fix:** Native app, payment processing, court booking, push notifications.

---

### Option 3: Playtomic-Quality — Genuine Competition

**Philosophy:** Build the platform that Playtomic's clubs are leaving Playtomic for. Lead with data ownership, format depth, and organiser intelligence. Add the missing commercial infrastructure. Make it the platform clubs want to build their brand on.

**Effort:** 6-12 months, 3-5 engineers

**The Strategic Narrative**
Playtomic owns player data and clubs are angry about it. Rocket Padel (35 courts) left. Others are looking. The platform that offers: deep tournament formats + club data ownership + a credible rating system + zero lock-in + white-label = the product the market wants and no one currently has.

**What changes:**

1. **Complete Option 2 first** — the foundation must be solid before adding features

2. **Payment processing**
   - Stripe integration for registration fees and entry payments
   - Configurable by organiser: free, flat fee, tiered by category
   - Automatic payout to organisers (Stripe Connect)
   - Receipt emails
   - Refund handling

3. **Credible rating system**
   - WPR-style dual rating: WPR (competitive) and WPR-s (social/practice)
   - ELO with confidence decay (inactivity reduces confidence, smoothing swings)
   - Manipulation resistance: device fingerprinting + account age requirements for competitive rating
   - Visible methodology (publish the algorithm — Playtomic's opaque algorithm is a complaint)
   - Firebase Cloud Functions to calculate ratings asynchronously after match completion

4. **Native mobile apps (React Native)**
   - The `REACT_NATIVE_MIGRATION_PLAN.md` exists — this was already planned
   - Shared business logic between web and native via the `src/core/` modules
   - iOS App Store + Google Play presence
   - Push notifications via Firebase Cloud Messaging: "Your next match is ready", "Results posted", "Tournament starting in 10 minutes"

5. **Organiser analytics dashboard**
   - Tournaments created, completion rate, average player count
   - Format popularity over time
   - Player retention: how many come back?
   - Registration funnel: views → registrations → completions
   - Export to CSV

6. **White-label / club branding**
   - Organiser settings: upload logo, set colour scheme
   - Custom subdomain: `myclubpadel.uberpadel.com` or full custom domain support
   - Branded result cards and social sharing images (the Cloudflare OG Worker is already architected for this — extend it)

7. **Court booking layer**
   - Define club resources (courts, timeslots, capacity)
   - Tournament creation auto-blocks courts in calendar
   - Optional: integrate with existing booking systems via webhook

8. **Social and discovery layer**
   - Player search and match history visible to others
   - "Open matches" — create a game, let others request to join
   - Post-match result sharing (pre-built share cards already exist in the codebase)
   - Player following

9. **Dispute resolution**
   - Organiser can correct any score with audit trail
   - Players can flag a score; organiser receives in-app notification
   - All corrections timestamped with user ID

10. **API for third-party integrations**
    - REST API for club management systems to push tournament results
    - Webhook support for score events
    - This is what Padel Mates offers that drove Rocket Padel's defection from Playtomic

**Impact on UX:** This is a fundamentally different product — not a tournament tool but a padel platform. Players have a persistent identity, a rating, a history, a community. Clubs have analytics, branding, and integration capability. Organisers get payments without leaving the platform.

**Prioritise first:** Payment processing (#2) unlocks commercial viability — you can charge for entry fees, which creates revenue and platform stickiness simultaneously. Then the rating system (#3) — ratings are the most powerful retention mechanism in sports apps. Then native (#4) — push notifications alone will dramatically improve the live tournament experience.

**The differentiating bet:** Lead explicitly on data ownership. Every onboarding email, every landing page, every pitch to a club operator should say: "Your player data is yours. We don't sell it. You can export it any time. We are not Playtomic." This is the opening in the market.

---

## Immediate Actions Before Any Launch

Regardless of which option is chosen, these are non-negotiable before putting real users on this platform:

1. Fix Firebase security rules — add ownership verification
2. Remove or fix the weak hash fallback in `base-tournament.js`
3. Fix XSS in Modal and Toast components
4. Add error handling and user-facing error states on all Firebase calls
5. Set up Sentry (or equivalent) for production error tracking
6. Configure Firebase database backups
7. Add a basic GitHub Actions CI pipeline

None of these are optional. Items 1-4 are security vulnerabilities that can be exploited by any user who opens the browser developer tools.

---

## Summary Judgement

UberPadel has something genuinely valuable: it is the only free, zero-install padel tournament management platform with 8 formats in one place. The TV mode is unique. The quick-play flow is low-friction. The Firebase real-time sync works.

What it is not: production-ready software. The security model has critical holes. The codebase has architectural debt that compounds with every new feature. There are zero tests on complex tournament logic that determines real competition outcomes. There is no operational infrastructure.

The gap between "this works for friends at the club" and "this handles 10,000 users across 500 simultaneous tournaments" is exactly the gap that the three options above are designed to close — at different cost, different timeline, and different strategic ambition.

The bones are good. The work is real. The path forward is clear.

---

*Review conducted March 2026. Codebase version 2.0.0. Competitive data sourced from Playtomic, PadelFast, PadelMix, PLAYINGA, Padel Mates, World Padel Rating, and industry analysis as of Q1 2026.*
