/**
 * functions/invite-tokens.js — Private tournament invite tokens (Phase D)
 *
 * Private open-registration tournaments are unlisted; discovery is
 * organiser-only. Organisers mint a token with a configurable TTL and
 * max uses; players redeem the token to be forwarded to the detail page.
 *
 * Tokens are stored hashed at invite_tokens/{sha256(token)} — only the
 * URL carries the raw token.
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const crypto    = require('crypto');

const db = admin.database();

const DEFAULT_TTL_HOURS = 7 * 24;
const MAX_USES_DEFAULT  = 50;

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function randomToken(bytes = 24) { return crypto.randomBytes(bytes).toString('base64url'); }

// ---------------------------------------------------------------------------
// mintInviteToken — organiser only
// ---------------------------------------------------------------------------

exports.mintInviteToken = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        const { tournamentId, ttlHours, maxUses } = data || {};
        if (!tournamentId) throw new functions.https.HttpsError('invalid-argument', 'tournamentId required');

        const tSnap = await db.ref(`tournaments/${tournamentId}`).once('value');
        const tournament = tSnap.val();
        if (!tournament) throw new functions.https.HttpsError('not-found', 'Tournament not found');
        if (tournament.meta?.organizerUid !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied',
                'Only the organiser can mint invite links.');
        }

        const token     = randomToken();
        const tokenHash = sha256(token);
        const now       = new Date();
        const expiresAt = new Date(now.getTime() + (Math.max(1, ttlHours || DEFAULT_TTL_HOURS)) * 60 * 60 * 1000);
        const uses      = Math.min(1000, Math.max(1, Number(maxUses) || MAX_USES_DEFAULT));

        await db.ref(`invite_tokens/${tokenHash}`).set({
            tournamentId,
            createdBy:       context.auth.uid,
            maxUses:         uses,
            usesRemaining:   uses,
            expiresAt:       expiresAt.toISOString(),
            createdAt:       now.toISOString(),
            revoked:         false
        });

        return { token, expiresAt: expiresAt.toISOString(), maxUses: uses };
    });

// ---------------------------------------------------------------------------
// validateInviteToken — anyone
// ---------------------------------------------------------------------------

exports.validateInviteToken = functions
    .region('europe-west1')
    .https.onCall(async (data /*, context */) => {
        const { token } = data || {};
        if (!token) throw new functions.https.HttpsError('invalid-argument', 'token required');
        const tokenHash = sha256(String(token));
        const snap = await db.ref(`invite_tokens/${tokenHash}`).once('value');
        const inv = snap.val();
        if (!inv) return { valid: false, reason: 'not_found' };
        if (inv.revoked) return { valid: false, reason: 'revoked' };
        if (inv.usesRemaining <= 0) return { valid: false, reason: 'exhausted' };
        if (new Date(inv.expiresAt).getTime() < Date.now()) return { valid: false, reason: 'expired' };

        // Include tournament preview (name/format/venue) so the landing page
        // can render a nice "You were invited to X" before redeem.
        const tSnap = await db.ref(`tournaments/${inv.tournamentId}/meta`).once('value');
        const meta  = tSnap.val() || {};
        return {
            valid: true,
            tournamentId: inv.tournamentId,
            tournament: {
                name: meta.name,
                format: meta.format,
                venue: meta.location?.venue || null,
                postcode: meta.location?.postcode || null,
                startDate: meta.startDate || null,
                ratingLimit: meta.ratingLimit || null,
                entryFeeGBP: meta.entryFeeGBP || 0
            }
        };
    });

// ---------------------------------------------------------------------------
// redeemInviteToken — atomically decrement usesRemaining
// ---------------------------------------------------------------------------

exports.redeemInviteToken = functions
    .region('europe-west1')
    .https.onCall(async (data /*, context */) => {
        const { token } = data || {};
        if (!token) throw new functions.https.HttpsError('invalid-argument', 'token required');
        const ref = db.ref(`invite_tokens/${sha256(String(token))}`);
        let tournamentId = null;
        const tx = await ref.transaction(curr => {
            if (!curr) return;
            if (curr.revoked) return;
            if (curr.usesRemaining <= 0) return;
            if (new Date(curr.expiresAt).getTime() < Date.now()) return;
            tournamentId = curr.tournamentId;
            return { ...curr, usesRemaining: curr.usesRemaining - 1 };
        });
        if (!tx.committed || !tournamentId) {
            throw new functions.https.HttpsError('failed-precondition',
                'Invite link is no longer valid.');
        }
        return { tournamentId };
    });

// ---------------------------------------------------------------------------
// revokeInviteToken — organiser only
// ---------------------------------------------------------------------------

exports.revokeInviteToken = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        const { token } = data || {};
        if (!token) throw new functions.https.HttpsError('invalid-argument', 'token required');
        const ref = db.ref(`invite_tokens/${sha256(String(token))}`);
        const snap = await ref.once('value');
        const inv = snap.val();
        if (!inv) throw new functions.https.HttpsError('not-found', 'Token not found');
        if (inv.createdBy !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied',
                'Only the creator can revoke this link.');
        }
        await ref.update({ revoked: true });
        return { ok: true };
    });

exports._internal = { sha256 };
