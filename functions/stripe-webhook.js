/**
 * functions/stripe-webhook.js — Stripe webhook handler (HTTP, raw body)
 *
 * Endpoint: https://europe-west1-stretford-padel-tournament.cloudfunctions.net/stripeWebhook
 *
 * Verifies the Stripe signature (STRIPE_WEBHOOK_SECRET) and is idempotent
 * via a per-event marker at stripe_events/{event.id}.
 *
 * Phase B handles:
 *   - account.updated  → refresh stripe_accounts/{uid} row
 *
 * Phase E adds:
 *   - checkout.session.completed  → write payments/{paymentId}, flip pair/player paymentStatus
 *   - charge.refunded             → update payments/{paymentId}, mark refunded
 *   - payment_intent.payment_failed → log + notify
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

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

async function markProcessed(eventId) {
    const ref = db.ref(`stripe_events/${eventId}`);
    const result = await ref.transaction(curr => {
        if (curr && curr.processedAt) return; // abort — already processed
        return { processedAt: new Date().toISOString() };
    });
    return result.committed;
}

async function handleAccountUpdated(account) {
    const uid = account.metadata?.uberpadel_uid;
    if (!uid) {
        // Search by stripeAccountId as fallback (expensive — RTDB doesn't
        // index on nested fields, so only do this when metadata is missing).
        console.warn('account.updated with no uberpadel_uid metadata, skipping', account.id);
        return;
    }
    const { _internal } = require('./stripe-connect.js');
    const row = await _internal.upsertStripeAccountRow(uid, account);
    await db.ref(`stripe_accounts/${uid}/lastWebhookAt`).set(new Date().toISOString());
    console.log(`[stripe.account.updated] uid=${uid} chargesEnabled=${row.chargesEnabled}`);
}

// Phase E handlers — stubs ready to extend
async function handleCheckoutSessionCompleted(session) {
    // Will be implemented in Phase E; stub for now so webhook doesn't 500.
    console.log('[stripe.checkout.session.completed] session=', session.id, '(no-op in Phase B)');
}
async function handleChargeRefunded(charge) {
    console.log('[stripe.charge.refunded] charge=', charge.id, '(no-op in Phase B)');
}
async function handlePaymentIntentFailed(pi) {
    console.log('[stripe.payment_intent.payment_failed] pi=', pi.id, '(no-op in Phase B)');
}

// ---------------------------------------------------------------------------
// HTTPS function (raw body is required for signature verification)
// ---------------------------------------------------------------------------

exports.stripeWebhook = functions
    .region('europe-west1')
    .runWith({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] })
    .https.onRequest(async (req, res) => {
        if (req.method !== 'POST') {
            res.set('Allow', 'POST');
            res.status(405).send('Method not allowed');
            return;
        }

        const signature = req.headers['stripe-signature'];
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            console.error('STRIPE_WEBHOOK_SECRET not configured');
            res.status(500).send('misconfigured');
            return;
        }

        let event;
        try {
            const stripe = getStripe();
            // Cloud Functions gives us req.rawBody automatically
            event = stripe.webhooks.constructEvent(req.rawBody, signature, secret);
        } catch (err) {
            console.error('Signature verification failed:', err.message);
            res.status(400).send(`invalid signature: ${err.message}`);
            return;
        }

        // Idempotency
        const firstTime = await markProcessed(event.id);
        if (!firstTime) {
            console.log(`[stripe.webhook] duplicate event ${event.id}, skipping`);
            res.status(200).send('duplicate');
            return;
        }

        try {
            switch (event.type) {
                case 'account.updated':
                    await handleAccountUpdated(event.data.object);
                    break;
                case 'checkout.session.completed':
                    await handleCheckoutSessionCompleted(event.data.object);
                    break;
                case 'charge.refunded':
                    await handleChargeRefunded(event.data.object);
                    break;
                case 'payment_intent.payment_failed':
                    await handlePaymentIntentFailed(event.data.object);
                    break;
                default:
                    console.log(`[stripe.webhook] unhandled type: ${event.type}`);
            }
            res.status(200).send('ok');
        } catch (err) {
            console.error('Handler error:', err);
            // Roll back the idempotency marker so Stripe retries.
            await db.ref(`stripe_events/${event.id}`).remove().catch(() => {});
            res.status(500).send('handler error');
        }
    });
