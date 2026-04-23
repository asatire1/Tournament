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

// ---------------------------------------------------------------------------
// Phase E — payment completion + refunds
// ---------------------------------------------------------------------------

const { v4: uuidv4 } = require('uuid');
const { _internal: pairInternals } = require('./pair-invites.js');

async function loadUserRow(uid) {
    const snap = await db.ref(`users/${uid}`).once('value');
    return snap.val() || null;
}

async function handleCheckoutSessionCompleted(session) {
    const meta = session.metadata || {};
    const paymentId = meta.uberpadel_payment_id;
    if (!paymentId) {
        console.warn('checkout.session.completed missing uberpadel_payment_id', session.id);
        return;
    }

    const payRef = db.ref(`payments/${paymentId}`);
    const pay = (await payRef.once('value')).val();
    if (!pay) {
        console.warn('payments/%s not found for session %s', paymentId, session.id);
        return;
    }
    if (pay.status === 'paid') {
        console.log('Payment already paid, skipping:', paymentId);
        return;
    }

    const tournamentId = pay.tournamentId;
    const tournament = (await db.ref(`tournaments/${tournamentId}`).once('value')).val();
    if (!tournament) {
        await payRef.update({ status: 'failed', failureReason: 'tournament_not_found', updatedAt: new Date().toISOString() });
        return;
    }
    const tMeta = tournament.meta || {};
    const now = new Date().toISOString();

    // Re-check capacity (atomic-ish via existing-pair count).
    const pairsSnap = await db.ref(`tournaments/${tournamentId}/pairs`).once('value');
    const pairsCount = pairsSnap.numChildren();
    const playersSnap = await db.ref(`tournaments/${tournamentId}/players`).once('value');
    const playersCount = playersSnap.numChildren();

    if (pay.unit === 'pair') {
        if (tMeta.maxPairs && pairsCount >= tMeta.maxPairs) {
            await payRef.update({ status: 'failed', failureReason: 'capacity_exceeded', updatedAt: now });
            console.error('Capacity exceeded after payment, will need manual refund:', paymentId);
            return;
        }
    } else if (tMeta.maxPlayers && playersCount >= tMeta.maxPlayers) {
        await payRef.update({ status: 'failed', failureReason: 'capacity_exceeded', updatedAt: now });
        console.error('Capacity exceeded after payment:', paymentId);
        return;
    }

    // Fetch display info for the registration doc
    const me = await loadUserRow(pay.playerUid);
    const meRating = me?.currentPlaytomicVerification?.extractedRating ?? me?.playtomicLevel ?? null;
    const meName = me?.name || me?.currentPlaytomicVerification?.extractedName || 'Player';

    let pairId = null;
    if (pay.unit === 'pair') {
        const partner = pay.partnerUid ? await loadUserRow(pay.partnerUid) : null;
        const partnerRating = partner?.currentPlaytomicVerification?.extractedRating ?? partner?.playtomicLevel ?? null;
        const partnerName   = partner?.name || partner?.currentPlaytomicVerification?.extractedName || 'Partner';
        const combinedRating = (meRating || 0) + (partnerRating || 0);

        pairId = uuidv4();
        const pairDoc = {
            player1Uid: pay.playerUid,
            player2Uid: pay.partnerUid,
            player1Name: meName,
            player2Name: partnerName,
            combinedRating,
            registeredAt: now,
            paymentStatus: 'paid',
            stripeSessionId: session.id
        };
        await db.ref(`tournaments/${tournamentId}/pairs/${pairId}`).set(pairDoc);
    } else {
        await db.ref(`tournaments/${tournamentId}/players/${pay.playerUid}`).set({
            name: meName,
            rating: meRating,
            registeredAt: now,
            paymentStatus: 'paid',
            stripeSessionId: session.id
        });
    }

    await payRef.update({
        status: 'paid',
        stripePaymentIntentId: session.payment_intent || pay.stripePaymentIntentId || null,
        pairIdAtPayment: pairId || null,
        paidAt: now,
        updatedAt: now
    });

    // Best-effort notification
    await pushNotification(pay.playerUid, {
        type: 'registration_confirmed',
        title: '✅ You\'re registered',
        body: `"${tMeta.name || 'Your tournament'}" entry paid.`,
        tournamentId
    }).catch(() => {});
    if (pay.partnerUid) {
        await pushNotification(pay.partnerUid, {
            type: 'registration_confirmed',
            title: '✅ Pair registered',
            body: `${meName} paid your pair entry for "${tMeta.name || 'the tournament'}".`,
            tournamentId
        }).catch(() => {});
    }
}

async function handleChargeRefunded(charge) {
    const piId = charge.payment_intent;
    if (!piId) return;
    // Find the payment row by paymentIntent id — RTDB doesn't index this,
    // so scan linearly. Payment volume is small (per tournament).
    const snap = await db.ref('payments').orderByChild('stripePaymentIntentId').equalTo(piId).once('value');
    let paymentId = null, pay = null;
    snap.forEach(c => { paymentId = c.key; pay = c.val(); });
    if (!paymentId) {
        console.warn('charge.refunded for unknown PI', piId);
        return;
    }
    if (pay.status === 'refunded') return;
    const now = new Date().toISOString();
    await db.ref(`payments/${paymentId}`).update({
        status: 'refunded',
        refundedAt: now,
        updatedAt: now,
        stripeRefundId: charge.refunds?.data?.[0]?.id || pay.stripeRefundId || null
    });
    // Also reflect on the registration doc
    if (pay.unit === 'pair' && pay.pairIdAtPayment) {
        await db.ref(`tournaments/${pay.tournamentId}/pairs/${pay.pairIdAtPayment}`).update({
            paymentStatus: 'refunded',
            cancelledAt: now
        });
    } else if (pay.unit === 'individual' && pay.playerUid) {
        await db.ref(`tournaments/${pay.tournamentId}/players/${pay.playerUid}/paymentStatus`).set('refunded');
    }
}

async function handlePaymentIntentFailed(pi) {
    const meta = pi.metadata || {};
    const paymentId = meta.uberpadel_payment_id;
    if (!paymentId) return;
    const now = new Date().toISOString();
    await db.ref(`payments/${paymentId}`).update({
        status: 'failed',
        failureReason: pi.last_payment_error?.code || 'payment_failed',
        updatedAt: now
    }).catch(err => console.warn('payments update failed', err));
}

async function pushNotification(uid, { type, title, body, tournamentId = null }) {
    const ref = db.ref(`users/${uid}/notifications`).push();
    await ref.set({
        type, title, body, tournamentId,
        read: false,
        createdAt: new Date().toISOString()
    });
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
