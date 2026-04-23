/**
 * functions/organiser-ledger.js — Phase G organiser revenue ledger
 *
 * getOrganiserLedger({from?, to?}) — authenticated organiser only.
 * Returns every `payments/*` row where organiserUid === auth.uid (plus
 * all statuses so the UI can show paid + refunded + failed) within the
 * optional ISO date range, newest first, with totals.
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

const db = admin.database();

exports.getOrganiserLedger = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        }
        const uid = context.auth.uid;
        const fromIso = data?.from || null;
        const toIso   = data?.to   || null;

        const snap = await db.ref('payments')
            .orderByChild('organiserUid')
            .equalTo(uid)
            .once('value');

        const rows = [];
        let totalGrossPence = 0, totalFeePence = 0, totalRefundedPence = 0;

        snap.forEach(c => {
            const p = c.val();
            if (!p) return;
            if (fromIso && p.createdAt && p.createdAt < fromIso) return;
            if (toIso   && p.createdAt && p.createdAt > toIso) return;
            rows.push({
                paymentId: c.key,
                tournamentId: p.tournamentId,
                playerUid: p.playerUid,
                partnerUid: p.partnerUid || null,
                unit: p.unit,
                amountPence: p.amountPence || 0,
                applicationFeePence: p.applicationFeePence || 0,
                currency: p.currency || 'GBP',
                status: p.status,
                stripeSessionId: p.stripeSessionId || null,
                stripePaymentIntentId: p.stripePaymentIntentId || null,
                createdAt: p.createdAt,
                paidAt: p.paidAt || null,
                refundedAt: p.refundedAt || null
            });
            if (p.status === 'paid') {
                totalGrossPence   += p.amountPence || 0;
                totalFeePence     += p.applicationFeePence || 0;
            }
            if (p.status === 'refunded') {
                totalRefundedPence += p.amountPence || 0;
            }
        });

        rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        // Look up tournament names in a second batch (RTDB won't join for us).
        const ids = [...new Set(rows.map(r => r.tournamentId))];
        const names = {};
        await Promise.all(ids.map(async id => {
            const n = await db.ref(`tournaments/${id}/meta/name`).once('value');
            names[id] = n.val() || null;
        }));
        for (const r of rows) r.tournamentName = names[r.tournamentId];

        return {
            rows,
            totals: {
                grossPence:      totalGrossPence,
                platformFeePence: totalFeePence,
                netPence:        totalGrossPence - totalFeePence,
                refundedPence:   totalRefundedPence,
                payments:        rows.filter(r => r.status === 'paid').length,
                refunds:         rows.filter(r => r.status === 'refunded').length
            }
        };
    });
