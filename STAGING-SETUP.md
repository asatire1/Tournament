# test.uberpadel.com — staging setup

A 15-minute setup to get the `feat/tournaments-unified-shell` branch
deployed to `test.uberpadel.com` so you can test before merging to `main`.

## Architecture (option A — shared backend)

```
feat/tournaments-unified-shell
     push
      ↓
GitHub Actions (deploy-test.yml)
      ↓
Cloudflare Pages project "uberpadel-test"
      ↓
test.uberpadel.com
      ↓
Firebase (stretford-padel-tournament)
  ├─ RTDB
  ├─ Storage
  └─ Cloud Functions  ← deploy these before first test
```

Data lives in the same Firebase project as prod. The new code writes to
NEW RTDB roots (`tournaments/*`, `venues/*`, `payments/*`, etc), so
legacy pages keep working on their old roots — no collision. A yellow
banner is auto-injected on every `test.*` page so testers know they're
not on prod.

## One-time setup (you do this in dashboards)

### 1. Create the Cloudflare Pages project

- Go to **Cloudflare dashboard → Workers & Pages → Create application → Pages → Direct Upload**.
- Project name: `uberpadel-test`.
- Create. Don't upload yet — the GitHub Action will push the first build.

### 2. Add the custom domain

- In the `uberpadel-test` project → **Custom domains → Set up a custom domain**.
- Enter `test.uberpadel.com`.
- Follow the DNS prompts. If `uberpadel.com` is already on Cloudflare DNS (it is — your prod project uses it), Cloudflare creates the CNAME automatically and TLS provisions in a few minutes.

### 3. Confirm GitHub repo secrets

You already have these from the prod deploy — the test workflow reuses them:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `UBER_FIREBASE_*` (all the firebase build-time vars)

No new GitHub secrets needed.

### 4. Trigger the first deploy

Any push to `feat/**` or `staging` branches auto-deploys.

- Easiest: make a trivial commit on `feat/tournaments-unified-shell` and
  push — or click **Actions → Deploy to test.uberpadel.com → Run workflow**
  in GitHub and pick the branch.

### 5. Deploy Firebase Functions + rules (once, before first real test)

Cloud Functions + RTDB rules live in the prod Firebase project and are
shared with test. They need to be deployed:

```
cd functions && npm install
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set ANTHROPIC_MODEL       # claude-sonnet-4-20250514
firebase functions:secrets:set STRIPE_SECRET_KEY     # use sk_test_... for staging
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET # from Stripe dashboard
firebase functions:secrets:set STRIPE_PLATFORM_FEE_PERCENT  # 5
firebase functions:secrets:set PUBLIC_SITE_URL       # https://test.uberpadel.com
firebase functions:secrets:set SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM
firebase functions:secrets:set GOOGLE_PLACES_API_KEY # only if you want the Google seed

firebase deploy --only functions,database,storage
```

**Important:** use **Stripe test mode** keys for staging, not live keys.
When you're ready for real prod, re-set these secrets to live keys and
redeploy.

**Stripe webhook URL** (set in Stripe dashboard):
```
https://europe-west1-stretford-padel-tournament.cloudfunctions.net/stripeWebhook
```
Enable events: `account.updated`, `checkout.session.completed`,
`charge.refunded`, `payment_intent.payment_failed`.

### 6. Grant yourself admin claim

Cloud Functions admin callables require `auth.token.admin == true` on
your user. One-off in the Firebase Admin SDK shell:

```js
// Run once in `firebase functions:shell` or an ops script:
const admin = require('firebase-admin');
admin.initializeApp();
admin.auth().setCustomUserClaims('YOUR_UID', { admin: true });
```

Then sign out + back in on test.uberpadel.com to pick up the claim.

## After setup — how testing works

- Every push to `feat/tournaments-unified-shell` rebuilds
  `test.uberpadel.com` via GitHub Actions (~2 min).
- Create test tournaments with `[TEST]` in the name so you remember
  they're not real.
- When happy with what you see on `test.uberpadel.com`, merge
  `feat/tournaments-unified-shell` into `main` — prod deploy runs
  automatically, `uberpadel.com` updates.

## Gotchas

- **Shared data.** Test tournaments are real RTDB writes. They'll show
  in prod's browse too, for now. If this becomes a pain, we graduate
  to Option B (separate Firebase project) — ~2 hours of work.
- **Stripe.** Keep the prod project on live keys and swap to test when
  staging; or stand up a *second* set of Stripe Connect accounts on
  the same prod Firebase and use the `uberpadel_test` metadata tag to
  segment. Cleanest long-term: separate Firebase project.
- **Verification costs.** Each screenshot verification hits Anthropic
  (~£0.01). If testers verify 100 times in a day, that's £1. Not zero
  but trivial.
- **Service worker.** The existing PWA `sw.js` caches aggressively.
  Testers should hard-reload (Cmd-Shift-R) or clear site data if they
  see stale bundles.

## Sanity check

Before you invite testers, visit:
- https://test.uberpadel.com/ — yellow banner, hero, search bar
- https://test.uberpadel.com/tournaments/create.html — wizard loads
- https://test.uberpadel.com/account/login.html — signup screenshot step
- https://test.uberpadel.com/admin/venue-queue.html — admin page
  (needs your admin claim)
- https://test.uberpadel.com/organiser/payouts.html — Stripe onboarding
