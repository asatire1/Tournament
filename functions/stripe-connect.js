/**
 * functions/stripe-connect.js — Stripe Connect Express onboarding
 *
 * Organisers link a Stripe Connect Express account so Phase E can run
 * direct charges on their behalf (with a 5% platform application fee).
 *
 * Callables (europe-west1):
 *   - createConnectOnboardingLink({ returnUrl, refreshUrl })
 *       Creates the Express account on first call, then returns a hosted
 *       Account Link URL.
 *   - getConnectAccountStatus()
 *       Reads the denormalised row at stripe_accounts/{uid}; triggers a
 *       fresh Stripe lookup if lastWebhookAt is more than 24h old.
 *
 * The account status is kept in sync by functions/stripe-webhook.js
 * listening for `account.updated` events.
 *
 * Secrets: STRIPE_SECRET_KEY (required), PUBLIC_SITE_URL (default
 *   https://uberpadel.com used as the return/refresh fallback).
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

// Admin SDK is initialised in functions/index.js.
const db = admin.database();

let _stripe = null;
function getStripe() {
    if (_stripe) return _stripe;
    const Stripe = require('stripe');
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
    return _stripe;
}

const DEFAULT_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://uberpadel.com';

function safeReturnUrl(raw, fallbackPath = '/organiser/payouts.html?return=success') {
    try {
        const url = raw ? new URL(raw) : null;
        if (url && /uberpadel\.com$|pages\.dev$|localhost$|127\.0\.0\.1$/.test(url.hostname)) {
            return url.toString();
        }
    } catch (_) {}
    return `${DEFAULT_SITE_URL}${fallbackPath}`;
}

async function upsertStripeAccountRow(uid, account) {
    const now = new Date().toISOString();
    const rowRef = db.ref(`stripe_accounts/${uid}`);
    const snap = await rowRef.once('value');
    const existing = snap.val() || {};
    const payload = {
        stripeAccountId:        account.id,
        chargesEnabled:         !!account.charges_enabled,
        payoutsEnabled:         !!account.payouts_enabled,
        detailsSubmitted:       !!account.details_submitted,
        requirementsCurrentlyDue: (account.requirements?.currently_due || []),
        requirementsDisabledReason: account.requirements?.disabled_reason || null,
        country:                account.country || null,
        defaultCurrency:        account.default_currency || null,
        createdAt:              existing.createdAt || now,
        updatedAt:              now,
        lastWebhookAt:          existing.lastWebhookAt || null
    };
    await rowRef.set(payload);
    return payload;
}

// ---------------------------------------------------------------------------
// Callable: createConnectOnboardingLink
// ---------------------------------------------------------------------------

exports.createConnectOnboardingLink = functions
    .region('europe-west1')
    .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        }
        const uid = context.auth.uid;
        const stripe = getStripe();

        const returnUrl  = safeReturnUrl(data?.returnUrl, '/organiser/payouts.html?return=success');
        const refreshUrl = safeReturnUrl(data?.refreshUrl, '/organiser/payouts.html?return=refresh');

        // Find / create the account
        const rowSnap = await db.ref(`stripe_accounts/${uid}`).once('value');
        const row = rowSnap.val() || null;
        let accountId = row?.stripeAccountId || null;

        if (!accountId) {
            const user = await admin.auth().getUser(uid).catch(() => null);
            const account = await stripe.accounts.create({
                type: 'express',
                capabilities: {
                    card_payments: { requested: true },
                    transfers:     { requested: true }
                },
                business_type: 'individual',
                email: user?.email || undefined,
                metadata: { uberpadel_uid: uid }
            });
            accountId = account.id;
            await upsertStripeAccountRow(uid, account);
        }

        // Mint a hosted onboarding link
        const link = await stripe.accountLinks.create({
            account: accountId,
            return_url: returnUrl,
            refresh_url: refreshUrl,
            type: 'account_onboarding'
        });

        return { url: link.url, accountId, expiresAt: new Date(link.expires_at * 1000).toISOString() };
    });

// ---------------------------------------------------------------------------
// Callable: getConnectAccountStatus
// ---------------------------------------------------------------------------

exports.getConnectAccountStatus = functions
    .region('europe-west1')
    .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
    .https.onCall(async (_data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        }
        const uid = context.auth.uid;
        const row = (await db.ref(`stripe_accounts/${uid}`).once('value')).val();
        if (!row?.stripeAccountId) {
            return { connected: false };
        }

        // Freshness: if webhook hasn't updated in >24h, poll Stripe
        const lastWebhookAtMs = row.lastWebhookAt ? Date.parse(row.lastWebhookAt) : 0;
        const staleThresholdMs = Date.now() - 24 * 60 * 60 * 1000;
        let latest = row;
        if (!lastWebhookAtMs || lastWebhookAtMs < staleThresholdMs) {
            try {
                const stripe = getStripe();
                const account = await stripe.accounts.retrieve(row.stripeAccountId);
                latest = await upsertStripeAccountRow(uid, account);
            } catch (err) {
                console.warn('Stripe retrieve failed, returning cached row:', err.message);
            }
        }
        return {
            connected: true,
            stripeAccountId: latest.stripeAccountId,
            chargesEnabled:  !!latest.chargesEnabled,
            payoutsEnabled:  !!latest.payoutsEnabled,
            detailsSubmitted:!!latest.detailsSubmitted,
            requirementsCurrentlyDue: latest.requirementsCurrentlyDue || [],
            requirementsDisabledReason: latest.requirementsDisabledReason || null
        };
    });

// Export helper for webhook + tests
exports._internal = { upsertStripeAccountRow };
