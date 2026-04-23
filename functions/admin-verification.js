/**
 * functions/admin-verification.js — Phase F admin tooling
 *
 * - overrideVerification({uid, verificationId, decision, note})
 *     Admin-only callable (auth.token.admin == true).
 *     decision ∈ {'approve','reject'} — sets status + writes
 *     users/{uid}/currentPlaytomicVerification pointer when approving.
 *     Records reviewedBy + reviewedAt + note on the verification row.
 *
 * - adminVerificationQueue()
 *     Admin-only callable that returns the most recent rejected +
 *     low-confidence + expired verifications so the queue UI can show
 *     them without needing per-user reads.
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

const db = admin.database();

function requireAdmin(context) {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    if (!context.auth.token?.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin required');
    }
}

const VERIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

exports.overrideVerification = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        requireAdmin(context);
        const { uid, verificationId, decision, note, extractedRating } = data || {};
        if (!uid || !verificationId) {
            throw new functions.https.HttpsError('invalid-argument', 'uid + verificationId required');
        }
        if (!['approve', 'reject'].includes(decision)) {
            throw new functions.https.HttpsError('invalid-argument', 'decision must be approve|reject');
        }

        const ref = db.ref(`playtomic_verifications/${uid}/${verificationId}`);
        const snap = await ref.once('value');
        const v = snap.val();
        if (!v) throw new functions.https.HttpsError('not-found', 'Verification not found');

        const now = new Date();
        const nowIso = now.toISOString();

        if (decision === 'approve') {
            const rating = typeof extractedRating === 'number' ? extractedRating
                : (typeof v.extractedRating === 'number' ? v.extractedRating : null);
            if (typeof rating !== 'number' || rating < 0 || rating > 10) {
                throw new functions.https.HttpsError('invalid-argument',
                    'Rating is required to approve (0–10).');
            }
            const expiresAt = new Date(now.getTime() + VERIFICATION_TTL_MS).toISOString();
            await ref.update({
                status: 'verified',
                extractedRating: rating,
                verifiedAt: nowIso,
                expiresAt,
                reviewedBy: context.auth.uid,
                reviewedAt: nowIso,
                reviewNote: note || null
            });
            await db.ref(`users/${uid}/currentPlaytomicVerification`).set({
                verificationId,
                status: 'verified',
                extractedRating: rating,
                extractedName: v.extractedName || null,
                verifiedAt: nowIso,
                expiresAt
            });
            // Mirror rating onto the user row too
            const userSnap = await db.ref(`users/${uid}`).once('value');
            if (userSnap.exists()) {
                const up = { playtomicLevel: rating, status: 'verified', updatedAt: nowIso };
                if (v.extractedName)     up.name              = v.extractedName;
                if (v.extractedUsername) up.playtomicUsername = v.extractedUsername;
                await db.ref(`users/${uid}`).update(up);
            }
            return { ok: true, newStatus: 'verified' };
        }

        // Reject
        await ref.update({
            status: 'rejected',
            reviewedBy: context.auth.uid,
            reviewedAt: nowIso,
            reviewNote: note || null
        });
        // Clear pointer if this was the current verification
        const curSnap = await db.ref(`users/${uid}/currentPlaytomicVerification`).once('value');
        const cur = curSnap.val();
        if (cur?.verificationId === verificationId) {
            await db.ref(`users/${uid}/currentPlaytomicVerification`).update({ status: 'rejected' });
        }
        return { ok: true, newStatus: 'rejected' };
    });

exports.adminVerificationQueue = functions
    .region('europe-west1')
    .https.onCall(async (_data, context) => {
        requireAdmin(context);
        const users = await db.ref('playtomic_verifications').once('value');
        const rows = [];
        users.forEach(userNode => {
            const uid = userNode.key;
            userNode.forEach(v => {
                const val = v.val() || {};
                if (['rejected', 'pending'].includes(val.status)
                    || (val.status === 'verified' && typeof val.aiConfidence === 'number' && val.aiConfidence < 0.85)) {
                    rows.push({
                        uid,
                        verificationId: v.key,
                        status: val.status,
                        extractedRating: val.extractedRating,
                        extractedName: val.extractedName,
                        extractedUsername: val.extractedUsername,
                        aiConfidence: val.aiConfidence,
                        failureReason: val.failureReason,
                        storagePath: val.storagePath,
                        createdAt: val.createdAt,
                        reviewedBy: val.reviewedBy || null
                    });
                }
            });
        });
        rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        return { rows: rows.slice(0, 200) };
    });

/**
 * Helper for Phase A playtomic-verify to enforce a per-UID rate limit
 * (5 / hour). Writes a counter at rateLimits/{uid}/playtomic_verify/{hourKey}.
 */
exports.checkPlaytomicVerifyRate = async function (uid, limit = 5) {
    const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const ref = db.ref(`rateLimits/${uid}/playtomic_verify/${hourKey}`);
    const tx = await ref.transaction(curr => (curr || 0) + 1);
    if (!tx.committed) return { ok: false, count: null };
    return { ok: tx.snapshot.val() <= limit, count: tx.snapshot.val() };
};
