# UberPadel — Option 3: Playtomic Competitor Development Plan
**Strategy:** Build the platform Playtomic's clubs are leaving for
**Target:** Genuine competitor in the global padel tournament management market
**Status tracking:** Each phase has a checklist. Mark ✅ when complete.

---

## Strategic Positioning

**The market gap we exploit:**
1. Playtomic owns player data — clubs are angry and leaving
2. Playtomic's tournament tools are basic — no Americano/Mexicano support
3. No platform combines format depth + booking + community in one place
4. TV/spectator mode is unserved by major players
5. WPR rating system is US-focused — global gap exists

**Our differentiating promise to clubs:**
> "Your player data is yours. 8 tournament formats. Zero lock-in."

---

## Phase 1 — Security & Foundation
**Duration:** 2–4 weeks
**Goal:** Fix all showstoppers. No security vulnerabilities before any real launch.

### 1.1 Firebase Security Rules
- [ ] Fix users table: `$userId .write` requires `auth.uid == $userId`
- [ ] Fix tournament tables: creation requires auth, structure changes require organizerUid match
- [ ] Keep score writes open (players enter scores without admin account)
- [ ] Fix competitions table: ownership verification
- [ ] Fix community messages: rate limiting rules
- [ ] Deploy new rules to Firebase

### 1.2 Passcode Security
- [ ] Remove weak hash fallback from `base-tournament.js` (the Java hashCode clone)
- [ ] Remove weak hash fallback from `router.js`
- [ ] Legacy compatibility: keep verifyPasscode reading old hashes for migration (don't break existing tournaments)
- [ ] Replace `Math.random()` with `crypto.getRandomValues()` in all ID/key generation

### 1.3 XSS Prevention
- [ ] Add `escapeHtml()` utility to `src/core/utils.js`
- [ ] Fix `Modal.js`: escape title, subtitle, message content
- [ ] Fix `Toast.js`: escape message content
- [ ] Audit all other `innerHTML` usages across codebase

### 1.4 Organiser Key Security
- [ ] Remove organiser key from URL query string in `router.js`
- [ ] Store key in `sessionStorage` after verification
- [ ] Ensure key is never written to `localStorage` or URL history

### 1.5 Firebase Config — Environment Variables
- [ ] Move Firebase config to `.env` using `UBER_` prefix (already configured in vite.config.js)
- [ ] Add `.env.example` with placeholder values
- [ ] Add `.gitignore` to prevent `.env` from being committed
- [ ] Update `src/core/firebase.js` to use `import.meta.env`
- [ ] Document in README that `.env` must be created locally

### 1.6 Error Handling
- [ ] Add global `unhandledrejection` handler in `main.js`
- [ ] Add global `window.onerror` handler
- [ ] Wrap all Firebase calls in consistent try/catch with user-facing Toast on failure
- [ ] Add retry logic for network failures on score submission

### 1.7 Error Tracking — Sentry
- [ ] Create `src/core/error-tracking.js` with Sentry setup
- [ ] Initialize in `main.js` before other modules
- [ ] Configure source map upload in GitHub Actions
- [ ] Add Sentry DSN to `.env.example`

### 1.8 CI/CD — GitHub Actions
- [ ] Create `.github/workflows/ci.yml`: build on every push + PR
- [ ] Create `.github/workflows/deploy.yml`: deploy `main` branch to GitHub Pages
- [ ] Add Lighthouse CI check (performance regression guard)
- [ ] Configure secrets for Firebase env vars in GitHub Actions

### 1.9 Quick-Play Firebase Config Consolidation
- [ ] Create `shared/firebase-shared.js` — single source of truth for Firebase config
- [ ] Update all 9 `quick-play/*/js/firebase-config.js` to import from shared
- [ ] Verify each format still works after consolidation

### Testing Checklist — Phase 1
- [ ] Create a new tournament — confirm auth required
- [ ] Enter scores as player — confirm works without auth
- [ ] Try to modify another user's tournament — confirm rejected
- [ ] Verify organiser key never appears in URL
- [ ] Verify passcode hashing uses SHA-256
- [ ] CI pipeline runs and passes on GitHub

---

## Phase 2 — Architecture & Code Quality
**Duration:** 2–3 months
**Goal:** Codebase a new engineer can confidently work in.

### 2.1 Unified Architecture — Eliminate Dual-Layer
- [ ] Audit all 9 quick-play formats: list what each `main.js`, `state.js`, `handlers.js` does
- [ ] Create `src/core/quick-play-base.js` — shared base class for all formats
- [ ] Migrate americano format to use shared core
- [ ] Migrate mexicano format
- [ ] Migrate mix/mixicano formats
- [ ] Migrate knockout format
- [ ] Migrate round-robin format
- [ ] Migrate swiss format
- [ ] Migrate team-league format
- [ ] Delete per-format copies of: firebase-config, auth, state (replace with shared)
- [ ] Remove duplicate `src/engines/` (legacy) — keep only `src/core/engines/`

### 2.2 TypeScript Migration
- [ ] Install `typescript`, `@types/node`, configure `tsconfig.json`
- [ ] Add `vite-plugin-checker` for TS type checking in build
- [ ] Define interfaces: `Tournament`, `Player`, `Score`, `Match`, `Round`, `Competition`, `User`
- [ ] Migrate `src/core/` to TypeScript
- [ ] Migrate `src/services/` to TypeScript
- [ ] Migrate `src/components/ui/` to TypeScript
- [ ] Update Vite config for `.ts` inputs

### 2.3 Test Suite — Vitest
- [ ] Install Vitest, configure `vitest.config.ts`
- [ ] Unit tests: `americano-engine.js` — fixture generation, standings, tiebreakers
- [ ] Unit tests: `mexicano-engine.js` — dynamic pairings, standings
- [ ] Unit tests: `mix-engine.js`
- [ ] Unit tests: `team-league-engine.js`
- [ ] Unit tests: `base-tournament.js` — score storage, normalization
- [ ] Integration tests: tournament create → score → standings (using Firebase Emulator)
- [ ] CI: run tests on every push, fail build on test failure
- [ ] Target: 80% coverage on `src/core/engines/`

### 2.4 State Management
- [ ] Install Zustand (1KB, vanilla JS compatible)
- [ ] Create `src/core/store.ts` with slices: tournament, user, ui, error
- [ ] Replace `window.*` global exports with store subscriptions
- [ ] Each quick-play format subscribes to relevant store slices

### 2.5 Optimistic Updates
- [ ] Update score in local store before Firebase round-trip
- [ ] Show loading indicator on score card during save
- [ ] Rollback local state + show error toast on Firebase failure
- [ ] Debounce score writes: 400ms after last change

### 2.6 Component Quality
- [ ] Audit all `innerHTML` usages — migrate to DOM APIs or confirm safe
- [ ] Standardise loading states across all pages (use `Loading` component everywhere)
- [ ] Standardise error states: one `Error` component with retry button
- [ ] Add skeleton screens for tournament/player data loading
- [ ] Fix duplicate Firebase listener accumulation on navigation

### 2.7 Deploy — Cloudflare Pages
- [ ] Create Cloudflare Pages project
- [ ] Configure environment variables in Cloudflare dashboard
- [ ] Update GitHub Actions to deploy to Cloudflare Pages (not GitHub Pages)
- [ ] Configure custom domain `uberpadel.com` on Cloudflare Pages
- [ ] Enable Cloudflare Analytics
- [ ] Set up preview deployments for PRs

### 2.8 Monitoring
- [ ] Set up BetterUptime (free tier) for uptime monitoring
- [ ] Configure Sentry alerts for error rate spikes
- [ ] Set up Firebase scheduled database exports (daily backup)
- [ ] Add Cloudflare Web Analytics dashboard

### Testing Checklist — Phase 2
- [ ] All 8 formats create tournament, generate rounds, enter scores, show standings
- [ ] TypeScript build passes with zero errors
- [ ] All Vitest tests pass
- [ ] Standings are correct for Americano with 8, 12, 16, 24 players
- [ ] Optimistic updates: score appears immediately, syncs within 1s
- [ ] No duplicate listener warnings in console after navigating back/forward

---

## Phase 3 — Core Features
**Duration:** 2–3 months
**Goal:** The feature set that drives user retention.

### 3.1 ELO Rating System
- [ ] Design rating model: WPR-style dual rating (competitive + social)
- [ ] Implement `src/core/rating-engine.ts`:
  - K-factor based on confidence (more games = lower K)
  - Expected score formula: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
  - Rating update after each match
  - Inactivity decay: confidence drops 25%/month without play
- [ ] Manipulation resistance:
  - Account age minimum (7 days) for competitive rating to be affected
  - Flag accounts with >5 rating resets in 90 days
  - Admin review queue for suspicious rating movements
- [ ] Firebase Cloud Functions: `onScoreCreated` trigger to recalculate ratings
- [ ] Store in `users/{uid}/rating` and `users/{uid}/ratingHistory`
- [ ] Display on player profile and standings table
- [ ] Public methodology page: "How ratings work"

### 3.2 Player Profiles with Full Match History
- [ ] Expand `users/{uid}` schema: matchHistory, tournamentHistory, ratingHistory
- [ ] `my-account.html` redesign: profile card, rating graph, recent matches, achievements
- [ ] Player search: search by name across all registered users
- [ ] Public profile page: `/players/{uid}` — viewable by others
- [ ] Achievement badges: "First Win", "Tournament Winner", "100 Matches"
- [ ] Export personal data (JSON) — GDPR compliance foundation

### 3.3 Tournament Search & Discovery
- [ ] `browse.html` redesign: filter by format, status, date, location
- [ ] Full-text search on tournament names (Firebase indexes)
- [ ] Featured/promoted tournaments section
- [ ] "Nearby" filter (geolocation for clubs that add location)
- [ ] Tournament sharing: native share API with OG image

### 3.4 Notifications System
- [ ] In-app notification bell: stored in `users/{uid}/notifications`
- [ ] Firebase Cloud Functions trigger notifications:
  - Next match ready
  - Tournament starts in 15 minutes
  - Your match result posted
  - Tournament completed — view final standings
- [ ] Email notifications (Firebase Extensions: Trigger Email)
- [ ] Web Push notifications (via service worker + VAPID)
- [ ] Notification preferences page

### 3.5 Mobile UX Improvements
- [ ] Fix iOS-specific scroll issues (documented in CODE_REVIEW_AND_IOS_PLAN.md)
- [ ] Fix input focus behavior on iOS (keyboard pushing layout)
- [ ] Add haptic feedback on score entry (Vibration API)
- [ ] Swipe gestures for round navigation
- [ ] One-handed score entry mode for phones

### Testing Checklist — Phase 3
- [ ] Complete tournament → ratings update for all participants
- [ ] Rating change is mathematically correct (manual calculation spot check)
- [ ] Notifications delivered within 30 seconds of trigger event
- [ ] Player profile loads in <1 second for users with 100+ matches
- [ ] Tournament search returns correct results with all filter combinations

---

## Phase 4 — Monetisation & Growth
**Duration:** 2–3 months
**Goal:** Commercial viability.

### 4.1 Stripe Payment Integration
- [ ] Install Stripe JS SDK
- [ ] Firebase Cloud Functions: payment intent creation, webhook handling
- [ ] Tournament registration fees:
  - Organiser sets fee during competition creation
  - Player pays before registration confirmed
  - Automatic payout to organiser via Stripe Connect
- [ ] Refund handling: organiser can refund before tournament starts
- [ ] Receipt emails via Stripe
- [ ] Fee-free option (tournaments can remain free)
- [ ] UberPadel platform fee: 2% of transaction (configurable)

### 4.2 Organiser Analytics Dashboard
- [ ] `organiser-analytics.html` — accessible to competition organizers
- [ ] Metrics:
  - Total registrations vs capacity (funnel)
  - Registration conversion rate (viewed → registered)
  - Player retention (returning vs new players)
  - Format popularity over time
  - Revenue breakdown (fees collected, payouts, platform fee)
  - Peak activity hours
- [ ] Export to CSV
- [ ] Email weekly summary to organizer

### 4.3 White-Label / Club Branding
- [ ] Club profile creation: name, logo, colours, social links
- [ ] All tournament pages show club branding if organizer has a club
- [ ] Custom subdomain: `[club-slug].uberpadel.com`
- [ ] Branded result cards (use existing Cloudflare OG Worker infrastructure)
- [ ] Branded email notifications
- [ ] "Remove UberPadel branding" as a premium feature

### 4.4 REST API for Third-Party Integration
- [ ] Firebase Cloud Functions as HTTP endpoints
- [ ] API spec (OpenAPI 3.0):
  - `GET /api/v1/tournaments` — list tournaments with filters
  - `GET /api/v1/tournaments/{id}` — get tournament detail
  - `GET /api/v1/players/{id}` — get player profile
  - `GET /api/v1/players/{id}/stats` — get player statistics
  - `POST /api/v1/tournaments` — create tournament (authenticated)
  - `POST /api/v1/tournaments/{id}/scores` — submit score
- [ ] API key management in organiser settings
- [ ] Rate limiting: 100 requests/minute per API key
- [ ] Webhook support: `score.created`, `round.completed`, `tournament.completed`
- [ ] Developer documentation at `docs.uberpadel.com`

### Testing Checklist — Phase 4
- [ ] End-to-end payment flow: register for paid tournament → pay → confirmed
- [ ] Refund flow: organiser refunds player → Stripe refund processed
- [ ] Analytics dashboard shows correct data for test tournament
- [ ] API returns correct tournament data via authenticated request
- [ ] Webhook fires within 5 seconds of score submission

---

## Phase 5 — Mobile & Scale
**Duration:** 3–4 months
**Goal:** Native apps and performance under real load.

### 5.1 React Native App
- [ ] Set up React Native (Expo) project
- [ ] Shared business logic: `src/core/` modules work in both web and native
- [ ] Authentication: Firebase Auth in React Native
- [ ] Core screens: Home, Quick Play, Competitions, My Profile
- [ ] Tournament management: create, manage, live scoring
- [ ] Push notifications via Firebase Cloud Messaging
- [ ] Offline support: local SQLite cache, sync when online
- [ ] App Store submission (iOS)
- [ ] Google Play submission (Android)

### 5.2 Performance at Scale
- [ ] Firebase listener audit: confirm no duplicate listeners
- [ ] Separate Firebase subscriptions by data type (scores vs meta vs players)
- [ ] Add Firebase connection state monitoring with offline indicator
- [ ] Pagination for tournament lists (cursor-based)
- [ ] Lazy load standings calculation (not on every update)
- [ ] Consider Firebase Firestore migration for better query support at scale

### 5.3 CDN & Caching
- [ ] Move to Cloudflare Pages with full CDN (already planned in Phase 2)
- [ ] Configure Cloudflare Cache Rules for static assets (1 year)
- [ ] Edge functions for API responses (Cloudflare Workers)
- [ ] Image optimization via Cloudflare Images
- [ ] Service worker: background sync for offline score submission

### Testing Checklist — Phase 5
- [ ] 24 simultaneous users on same tournament — no performance degradation
- [ ] 100 tournaments running simultaneously — Firebase usage within budget
- [ ] App loads in <3 seconds on 3G connection
- [ ] Offline mode: enter scores, sync on reconnect
- [ ] iOS and Android apps pass TestFlight/Internal Testing review

---

## Phase 6 — Market Differentiators
**Duration:** 2–3 months
**Goal:** Features that make UberPadel genuinely hard to leave.

### 6.1 Data Ownership & Portability (The #1 Anti-Playtomic Feature)
- [ ] Full data export: players can download all their match history, ratings, achievements (JSON + CSV)
- [ ] Clubs can export all their tournament data, player lists, results
- [ ] Import from other platforms: CSV import for player lists
- [ ] Data deletion: GDPR right to erasure — one-click full account deletion
- [ ] Data portability landing page: "Your data is yours, forever"
- [ ] Club API: clubs own their player database, can integrate with CRM

### 6.2 GDPR Compliance
- [ ] Privacy policy and cookie consent banner
- [ ] Data processing agreement template for club operators
- [ ] Right to access: automated data export within 24 hours of request
- [ ] Right to erasure: full deletion including Firebase + backups
- [ ] Data retention policies: auto-delete inactive guest data after 90 days
- [ ] GDPR compliance documentation for EU club operators

### 6.3 Social Features
- [ ] Player following: follow friends, see their activity feed
- [ ] Activity feed: recent tournaments, match results, rating changes
- [ ] Post-match result cards: auto-generated, one-tap share to Instagram/WhatsApp
- [ ] Tournament discussion: threaded comments per tournament
- [ ] Open match finding: create an open match, let others join
- [ ] Club community pages: club-specific feed and announcements

### 6.4 Live Streaming Integration
- [ ] "Go Live" button for organizers: streams tournament data to external display
- [ ] Integration with WeScore/similar: send live scores to court-side displays
- [ ] OBS overlay: WebSocket endpoint that streaming software can connect to
- [ ] YouTube/Twitch integration: show tournament bracket during stream
- [ ] TV mode improvements: auto-rotate through courts, match animations

### Testing Checklist — Phase 6
- [ ] Full data export contains all matches, ratings, and profile data
- [ ] Data deletion removes all Firebase records within 60 seconds
- [ ] Social feed loads in <500ms with 50 recent activities
- [ ] Live score overlay visible on OBS within 2 seconds of score entry
- [ ] GDPR consent flow: cookie banner → preference saved → respected

---

## Technical Architecture Overview

### Stack (Final State)
```
Frontend (Web):     TypeScript + Vite + Tailwind CSS
Mobile:             React Native (Expo) + TypeScript
Backend:            Firebase Realtime Database + Firestore (future)
Auth:               Firebase Auth (anonymous, email, Google)
Functions:          Firebase Cloud Functions (Node.js)
Payments:           Stripe + Stripe Connect
Error Tracking:     Sentry
Deployment:         Cloudflare Pages (web) + App Store / Play Store (mobile)
CDN:                Cloudflare
Email:              Firebase Extensions (Trigger Email) + Mailgun
OG Images:          Cloudflare Workers (already built — extend it)
Monitoring:         Cloudflare Analytics + BetterUptime + Sentry
CI/CD:              GitHub Actions
```

### Database Architecture (Firebase RTDB)
```
users/{uid}
  → profile, rating, ratingHistory, matchHistory, notifications, preferences

[format]-tournaments/{tournamentId}
  → meta (name, status, organizerUid, passcodeHash)
  → players, courts, rounds, scores
  → currentRound

competitions/{id}
  → meta (name, format, status, organizerUid, pricing)
  → registeredPlayers, brackets, results

clubs/{id}
  → profile, branding, players (owned by club)

community/
  → messages, rateLimit

ratings/
  → current, history, leaderboard
```

### Firebase Security Model
```
users/{uid}:  read=public, write=auth.uid==uid
tournaments:  read=public, write-meta=organizerUid, write-scores=anyone
competitions: read=public, write=organizerUid
clubs:        read=public, write=auth+clubAdmin
```

---

## Competitive Positioning Matrix

| Feature | Playtomic | PadelFast | UberPadel Target |
|---------|-----------|-----------|-----------------|
| Tournament formats | 1 | 12 | **8 (best UX)** |
| Data ownership | No | Yes | **Yes + export** |
| Court booking | Yes | No | Phase 5+ |
| Payments | Yes | Yes | **Phase 4** |
| ELO ratings | Yes (gameable) | Yes | **Phase 3 (integrity)** |
| Native app | Yes | Yes | **Phase 5** |
| TV/spectator mode | No | No | **Already built** |
| White-label | No | No | **Phase 4** |
| REST API | Read-only | No | **Phase 4 (full)** |
| Price | Paid | Freemium | **Free + % of fees** |
| GDPR/data portability | Weak | N/A | **Phase 6 (strong)** |

---

## Revenue Model

**Free tier:** All basic tournament features, free forever
**Club tier (£49/month):** White-label, analytics dashboard, priority support
**Platform fee:** 2% of tournament registration fees processed through Stripe
**Enterprise:** Custom pricing for chains (Rocket Padel-size operators)

---

*Plan created March 2026. Implementation starts immediately with Phase 1.*
