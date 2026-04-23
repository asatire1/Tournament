/**
 * functions/stripe-checkout.js — Paid entry via Stripe Checkout (Phase E)
 *
 * Direct-charge model: Checkout Session is created on the organiser's
 * connected account; `application_fee_amount` = 5% of entry fee goes to
 * the platform. Rationale vs destination charges: money lives on the
 * organiser's balance; 1099/tax follows the connected account; refunds
 * + disputes are owned by the organiser; platform only pockets its fee.
 *
 * Callables (europe-west1):
 *   createCheckoutSessionForRegistration({tournamentId, partnerUid?, partnerUsername?})
 *     → { sessionUrl, paymentId } — player redirects to sessionUrl
 *   createRefund({ paymentId }) → { refundId } — organiser-only
 *
 * On successful payment the Stripe webhook (stripe-webhook.js,
 * `checkout.session.completed`) writes the pair/player doc + marks the
 * payments row 'paid' — this keeps the write atomic with Stripe's
 * confirmation. Pre-registration happens via PENDING docs so capacity
 * is held during the ~minute-long Checkout flow.
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

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

const DEFAULT_PLATFORM_FEE = 5;
const DEFAULT_SITE_URL = () => process.env.PUBLIC_SITE_URL || 'https://uberpadel.com';

// Reuse invite/pair helpers for validation
const { _internal: pairInternals } = require('./pair-invites.js');
const { loadUserRating, assertRatingLimit } = pairInternals;

async function loadTournament(tournamentId) {
    const snap = await db.ref(`tournaments/${tournamentId}`).once('value');
    return snap.val();
}

// ---------------------------------------------------------------------------
// createCheckoutSessionForRegistration
// ---------------------------------------------------------------------------

exports.createCheckoutSessionForRegistration = functions
    .region('europe-west1')
    .runWith({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_PLATFORM_FEE_PERCENT', 'PUBLIC_SITE_URL'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        const uid = context.auth.uid;

        const { tournamentId, partnerUid, partnerUsername } = data || {};
        if (!tournamentId) {
            throw new functions.https.HttpsError('invalid-argument', 'tournamentId required');
        }

        const tournament = await loadTournament(tournamentId);
        if (!tournament) throw new functions.https.HttpsError('not-found', 'Tournament not found');
        const meta = tournament.meta || {};
        if (meta.registrationMode !== 'open' || meta.status !== 'open_for_registration') {
            throw new functions.https.HttpsError('failed-precondition',
                'Tournament is not open for registration');
        }
        const entryFeeGBP = Number(meta.entryFeeGBP || 0);
        if (entryFeeGBP <= 0) {
            throw new functions.https.HttpsError('failed-precondition',
                'This tournament is free — no payment required');
        }

        // Organiser's Stripe account must be ready
        const organiserUid = meta.organizerUid;
        const stripeRow = (await db.ref(`stripe_accounts/${organiserUid}`).once('value')).val();
        if (!stripeRow?.stripeAccountId || !stripeRow.chargesEnabled) {
            throw new functions.https.HttpsError('failed-precondition',
                "Organiser's Stripe account is not ready — paid entry temporarily unavailable.");
        }

        // Rating-limit re-check + partner lookup (for pair-unit formats)
        const me = await loadUserRating(uid);
        if (!me.exists || !me.verified) {
            throw new functions.https.HttpsError('failed-precondition',
                'You need a verified Playtomic profile to register.');
        }

        let partner = null;
        const unit = meta.registrationUnit || 'individual';
        if (unit === 'pair') {
            if (!partnerUid && !partnerUsername) {
                throw new functions.https.HttpsError('invalid-argument',
                    'Pair tournaments require a partner');
            }
            if (partnerUid) {
                partner = await loadUserRating(partnerUid);
            } else {
                const username = String(partnerUsername).trim().replace(/^@/, '');
                const s = await db.ref('users').orderByChild('playtomicUsername').equalTo(username).limitToFirst(1).once('value');
                let foundUid = null; s.forEach(c => foundUid = c.key);
                if (!foundUid) throw new functions.https.HttpsError('not-found', `No Uber Padel account for @${username}`);
                partner = await loadUserRating(foundUid);
            }
            if (!partner?.exists || !partner.verified) {
                throw new functions.https.HttpsError('failed-precondition',
                    'Your partner needs a verified Playtomic profile.');
            }
            assertRatingLimit(meta, me.rating, partner.rating);
        } else {
            assertRatingLimit(meta, me.rating, me.rating);
        }

        // Capacity check (best-effort — webhook enforces on commit)
        const pairsSnap = await db.ref(`tournaments/${tournamentId}/pairs`).once('value');
        const playersSnap = await db.ref(`tournaments/${tournamentId}/players`).once('value');
        const pairsCount = pairsSnap.numChildren();
        const playersCount = playersSnap.numChildren();
        if (unit === 'pair' && meta.maxPairs && pairsCount >= meta.maxPairs) {
            throw new functions.https.HttpsError('resource-exhausted', 'Tournament is full');
        }
        if (unit === 'individual' && meta.maxPlayers && playersCount >= meta.maxPlayers) {
            throw new functions.https.HttpsError('resource-exhausted', 'Tournament is full');
        }

        const paymentId = uuidv4();
        const amountPence = Math.round(entryFeeGBP * 100);
        const feePct = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT || DEFAULT_PLATFORM_FEE);
        const applicationFeePence = Math.max(0, Math.round(amountPence * feePct / 100));

        const site = DEFAULT_SITE_URL();
        const successUrl = `${site}/tournaments/detail.html?id=${encodeURIComponent(tournamentId)}&payment=success&pid=${paymentId}`;
        const cancelUrl  = `${site}/tournaments/detail.html?id=${encodeURIComponent(tournamentId)}&payment=cancel`;

        const stripe = getStripe();
        let session;
        try {
            session = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: (meta.currency || 'GBP').toLowerCase(),
                        unit_amount: amountPence,
                        product_data: {
                            name: `Entry: ${meta.name || 'Tournament'}`,
                            description: unit === 'pair'
                                ? `Pair registration — ${me.name || 'You'} + ${partner.name || 'Partner'}`
                                : `Registration — ${me.name || 'You'}`
                        }
                    },
                    quantity: 1
                }],
                payment_intent_data: {
                    application_fee_amount: applicationFeePence,
                    metadata: {
                        uberpadel_payment_id: paymentId,
                        uberpadel_tournament_id: tournamentId,
                        uberpadel_player_uid: uid,
                        uberpadel_unit: unit,
                        uberpadel_partner_uid: partner?.uid || ''
                    }
                },
                metadata: {
                    uberpadel_payment_id: paymentId,
                    uberpadel_tournament_id: tournamentId,
                    uberpadel_player_uid: uid,
                    uberpadel_unit: unit,
                    uberpadel_partner_uid: partner?.uid || ''
                },
                customer_email: context.auth.token?.email || undefined,
                success_url: successUrl,
                cancel_url: cancelUrl
            }, { stripeAccount: stripeRow.stripeAccountId });
        } catch (err) {
            console.error('Stripe create session failed:', err);
            throw new functions.https.HttpsError('internal', err.message || 'Stripe error');
        }

        // Persist payment doc in 'created' state
        const now = new Date().toISOString();
        await db.ref(`payments/${paymentId}`).set({
            playerUid: uid,
            partnerUid: partner?.uid || null,
            tournamentId,
            organiserUid,
            unit,
            amountPence,
            applicationFeePence,
            currency: (meta.currency || 'GBP').toUpperCase(),
            stripeAccountId: stripeRow.stripeAccountId,
            stripeSessionId: session.id,
            stripePaymentIntentId: null,
            status: 'created',
            createdAt: now
        });

        return { sessionUrl: session.url, paymentId };
    });

// ---------------------------------------------------------------------------
// createRefund — organiser only, pre-start only
// ---------------------------------------------------------------------------

exports.createRefund = functions
    .region('europe-west1')
    .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        const { paymentId } = data || {};
        if (!paymentId) throw new functions.https.HttpsError('invalid-argument', 'paymentId required');

        const pay = (await db.ref(`payments/${paymentId}`).once('value')).val();
        if (!pay) throw new functions.https.HttpsError('not-found', 'Payment not found');
        if (pay.organiserUid !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied',
                'Only the tournament organiser can issue a refund.');
        }
        if (pay.status !== 'paid') {
            throw new functions.https.HttpsError('failed-precondition',
                `Payment status is ${pay.status}, cannot refund.`);
        }

        const t = await loadTournament(pay.tournamentId);
        if (['active', 'completed'].includes(t?.meta?.status)) {
            throw new functions.https.HttpsError('failed-precondition',
                'Refunds are only available before the tournament starts.');
        }

        const stripe = getStripe();
        let refund;
        try {
            refund = await stripe.refunds.create({
                payment_intent: pay.stripePaymentIntentId,
                refund_application_fee: true
            }, { stripeAccount: pay.stripeAccountId });
        } catch (err) {
            console.error('Stripe refund failed:', err);
            throw new functions.https.HttpsError('internal', err.message || 'Refund failed');
        }

        const now = new Date().toISOString();
        await db.ref(`payments/${paymentId}`).update({
            status: 'refunded',
            refundedAt: now,
            stripeRefundId: refund.id
        });
        // Mark the pair/player as refunded + cancelled so they free a slot.
        if (pay.unit === 'pair' && pay.pairIdAtPayment) {
            await db.ref(`tournaments/${pay.tournamentId}/pairs/${pay.pairIdAtPayment}`).update({
                paymentStatus: 'refunded',
                cancelledAt: now
            });
        } else if (pay.unit === 'individual' && pay.playerUid) {
            await db.ref(`tournaments/${pay.tournamentId}/players/${pay.playerUid}/paymentStatus`).set('refunded');
        }
        return { refundId: refund.id };
    });
