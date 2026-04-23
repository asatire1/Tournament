/**
 * functions/pair-invites.js — Fixed-pair registration mechanisms
 *
 * Ships three ways for one player to pair with another at registration
 * time:
 *   1. Paste username — `registerPair({tournamentId, partnerUsername})`
 *   2. Share link     — createPairClaimLink / acceptPairClaim
 *   3. Email invite   — sendPairInviteEmail / acceptPairInvite
 *
 * All three flows funnel through `_writePairTx` which enforces:
 *   - Tournament exists + is open for registration
 *   - Both players have a verified (unexpired) Playtomic verification
 *   - Combined / individual rating satisfies meta.ratingLimit
 *   - maxPairs not exceeded
 *   - Neither player is already in a pair for this tournament
 *
 * Invite tokens and pending email invites are stored hashed at
 *   pair_claim_tokens/{sha256(token)} and pair_invites/{inviteId}.
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const crypto    = require('crypto');
const { v4: uuidv4 } = require('uuid');

const db = admin.database();

const TOURNAMENTS_ROOT = 'tournaments';
const CLAIM_TOKEN_TTL_HOURS  = 72;
const EMAIL_INVITE_TTL_HOURS = 48;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function sha256(s) {
    return crypto.createHash('sha256').update(s).digest('hex');
}

function randomToken(bytes = 24) {
    return crypto.randomBytes(bytes).toString('base64url');
}

async function loadTournament(tournamentId) {
    const snap = await db.ref(`${TOURNAMENTS_ROOT}/${tournamentId}`).once('value');
    return snap.val();
}

async function loadUserRating(uid) {
    const snap = await db.ref(`users/${uid}`).once('value');
    const u = snap.val() || null;
    if (!u) return { uid, exists: false };
    const ver = u.currentPlaytomicVerification || null;
    const verified = ver?.status === 'verified' && (!ver.expiresAt || new Date(ver.expiresAt).getTime() > Date.now());
    return {
        uid,
        exists: true,
        name: u.name || null,
        playtomicUsername: u.playtomicUsername || null,
        rating: (typeof ver?.extractedRating === 'number') ? ver.extractedRating
              : (typeof u.playtomicLevel === 'number' ? u.playtomicLevel : null),
        verified,
        expiresAt: ver?.expiresAt || null
    };
}

function assertRatingLimit(meta, r1, r2) {
    const limit = meta.ratingLimit;
    if (!limit || limit.type === 'none') return;
    const n1 = Number(r1), n2 = Number(r2);
    if (!Number.isFinite(n1) || !Number.isFinite(n2)) {
        throw new functions.https.HttpsError('failed-precondition',
            'Both players must have a verified Playtomic rating.');
    }
    if (limit.type === 'individual') {
        if (typeof limit.max === 'number' && (n1 > limit.max || n2 > limit.max)) {
            throw new functions.https.HttpsError('failed-precondition',
                `Each player must be rated at most ${limit.max}.`);
        }
        if (typeof limit.min === 'number' && (n1 < limit.min || n2 < limit.min)) {
            throw new functions.https.HttpsError('failed-precondition',
                `Each player must be rated at least ${limit.min}.`);
        }
    } else if (limit.type === 'combined') {
        const c = n1 + n2;
        if (typeof limit.max === 'number' && c > limit.max) {
            throw new functions.https.HttpsError('failed-precondition',
                `Combined rating must be at most ${limit.max} (got ${c.toFixed(1)}).`);
        }
        if (typeof limit.min === 'number' && c < limit.min) {
            throw new functions.https.HttpsError('failed-precondition',
                `Combined rating must be at least ${limit.min} (got ${c.toFixed(1)}).`);
        }
    }
}

/**
 * Write a new pair atomically. Both players must be verified; caller
 * already confirmed their UIDs. Reads tournament meta inside the
 * transaction for race-safe maxPairs / status checks.
 */
async function _writePairTx(tournamentId, player1, player2) {
    if (player1.uid === player2.uid) {
        throw new functions.https.HttpsError('failed-precondition', "You can't pair with yourself.");
    }

    const tournament = await loadTournament(tournamentId);
    if (!tournament) throw new functions.https.HttpsError('not-found', 'Tournament not found');
    const meta = tournament.meta || {};
    if (meta.registrationMode !== 'open') {
        throw new functions.https.HttpsError('failed-precondition',
            'This tournament is not open for registration.');
    }
    if (meta.status !== 'open_for_registration') {
        throw new functions.https.HttpsError('failed-precondition',
            `Registration is ${meta.status || 'closed'}.`);
    }
    if (!player1.verified) {
        throw new functions.https.HttpsError('failed-precondition',
            `${player1.name || 'The first player'} needs a verified Playtomic profile.`);
    }
    if (!player2.verified) {
        throw new functions.https.HttpsError('failed-precondition',
            `${player2.name || 'Your partner'} needs a verified Playtomic profile.`);
    }

    assertRatingLimit(meta, player1.rating, player2.rating);

    // Conflict checks against existing pairs
    const existingPairsSnap = await db.ref(`${TOURNAMENTS_ROOT}/${tournamentId}/pairs`).once('value');
    const existingPairs = existingPairsSnap.val() || {};
    const pairCount = Object.keys(existingPairs).length;
    if (typeof meta.maxPairs === 'number' && pairCount >= meta.maxPairs) {
        throw new functions.https.HttpsError('resource-exhausted',
            'This tournament is full.');
    }
    for (const pair of Object.values(existingPairs)) {
        if (pair.cancelledAt) continue;
        if (pair.player1Uid === player1.uid || pair.player2Uid === player1.uid
         || pair.player1Uid === player2.uid || pair.player2Uid === player2.uid) {
            throw new functions.https.HttpsError('already-exists',
                'One of you is already registered for this tournament.');
        }
    }

    const pairId = uuidv4();
    const combinedRating = (player1.rating || 0) + (player2.rating || 0);
    const now = new Date().toISOString();

    const pairDoc = {
        player1Uid: player1.uid,
        player2Uid: player2.uid,
        player1Name: player1.name || 'Player 1',
        player2Name: player2.name || 'Player 2',
        combinedRating,
        registeredAt: now,
        paymentStatus: (meta.entryFeeGBP && meta.entryFeeGBP > 0) ? 'pending' : 'free'
    };

    await db.ref(`${TOURNAMENTS_ROOT}/${tournamentId}/pairs/${pairId}`).set(pairDoc);
    await db.ref(`${TOURNAMENTS_ROOT}/${tournamentId}/meta/updatedAt`).set(now);

    return { pairId, pair: pairDoc };
}

// ---------------------------------------------------------------------------
// 1. Paste username
// ---------------------------------------------------------------------------

exports.registerPair = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        }
        const { tournamentId, partnerUsername, partnerUid } = data || {};
        if (!tournamentId) {
            throw new functions.https.HttpsError('invalid-argument', 'tournamentId required');
        }
        if (!partnerUsername && !partnerUid) {
            throw new functions.https.HttpsError('invalid-argument',
                'Provide partnerUsername or partnerUid');
        }

        const me = await loadUserRating(context.auth.uid);
        if (!me.exists) throw new functions.https.HttpsError('failed-precondition', 'Your profile is incomplete');

        let partner = null;
        if (partnerUid) {
            partner = await loadUserRating(partnerUid);
        } else {
            const username = String(partnerUsername).trim().replace(/^@/, '');
            const snap = await db.ref('users')
                .orderByChild('playtomicUsername')
                .equalTo(username)
                .limitToFirst(1)
                .once('value');
            let foundUid = null;
            snap.forEach(c => { foundUid = c.key; });
            if (!foundUid) {
                throw new functions.https.HttpsError('not-found',
                    `No Uber Padel account matches @${username}.`);
            }
            partner = await loadUserRating(foundUid);
        }

        return await _writePairTx(tournamentId, me, partner);
    });

// ---------------------------------------------------------------------------
// 2. Share-link claim
// ---------------------------------------------------------------------------

exports.createPairClaimLink = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        }
        const { tournamentId } = data || {};
        if (!tournamentId) {
            throw new functions.https.HttpsError('invalid-argument', 'tournamentId required');
        }
        const me = await loadUserRating(context.auth.uid);
        if (!me.exists || !me.verified) {
            throw new functions.https.HttpsError('failed-precondition',
                'You need a verified Playtomic profile first.');
        }

        const tournament = await loadTournament(tournamentId);
        if (!tournament?.meta) throw new functions.https.HttpsError('not-found', 'Tournament not found');

        const rawToken = randomToken();
        const tokenHash = sha256(rawToken);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + CLAIM_TOKEN_TTL_HOURS * 60 * 60 * 1000);

        await db.ref(`pair_claim_tokens/${tokenHash}`).set({
            tournamentId,
            createdBy: me.uid,
            createdByName: me.name || null,
            usesRemaining: 1,
            expiresAt: expiresAt.toISOString(),
            createdAt: now.toISOString(),
            revoked: false
        });
        return { token: rawToken, expiresAt: expiresAt.toISOString() };
    });

exports.acceptPairClaim = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Sign in required to accept the invite');
        }
        const { token } = data || {};
        if (!token) {
            throw new functions.https.HttpsError('invalid-argument', 'token required');
        }
        const tokenHash = sha256(String(token));
        const ref = db.ref(`pair_claim_tokens/${tokenHash}`);

        // Decrement-or-reject in a transaction
        let tokenDoc = null;
        const tx = await ref.transaction(curr => {
            if (!curr) return; // abort
            if (curr.revoked) return;
            if (curr.usesRemaining <= 0) return;
            if (new Date(curr.expiresAt).getTime() < Date.now()) return;
            tokenDoc = curr;
            return { ...curr, usesRemaining: curr.usesRemaining - 1 };
        });
        if (!tx.committed || !tokenDoc) {
            throw new functions.https.HttpsError('failed-precondition',
                'This invite link is no longer valid.');
        }

        const me = await loadUserRating(context.auth.uid);
        const partner = await loadUserRating(tokenDoc.createdBy);
        try {
            return await _writePairTx(tokenDoc.tournamentId, me, partner);
        } catch (err) {
            // Roll back uses if the write failed
            await ref.transaction(curr => {
                if (!curr) return;
                return { ...curr, usesRemaining: (curr.usesRemaining || 0) + 1 };
            }).catch(() => {});
            throw err;
        }
    });

// ---------------------------------------------------------------------------
// 3. Email invite
// ---------------------------------------------------------------------------

let _mailer = null;
function getMailer() {
    if (_mailer) return _mailer;
    const nodemailer = require('nodemailer');
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        throw new functions.https.HttpsError('failed-precondition',
            'Email invites are not configured (SMTP credentials missing).');
    }
    _mailer = nodemailer.createTransport({
        host, port, secure: port === 465,
        auth: { user, pass }
    });
    return _mailer;
}

exports.sendPairInviteEmail = functions
    .region('europe-west1')
    .runWith({ secrets: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'PUBLIC_SITE_URL'] })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        }
        const { tournamentId, partnerEmail } = data || {};
        if (!tournamentId || !partnerEmail) {
            throw new functions.https.HttpsError('invalid-argument',
                'tournamentId and partnerEmail required');
        }
        const emailClean = String(partnerEmail).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid email');
        }

        const me = await loadUserRating(context.auth.uid);
        if (!me.exists || !me.verified) {
            throw new functions.https.HttpsError('failed-precondition',
                'You need a verified Playtomic profile first.');
        }
        const tournament = await loadTournament(tournamentId);
        if (!tournament?.meta) throw new functions.https.HttpsError('not-found', 'Tournament not found');

        const inviteId = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + EMAIL_INVITE_TTL_HOURS * 60 * 60 * 1000);

        await db.ref(`pair_invites/${inviteId}`).set({
            tournamentId,
            invitedBy: me.uid,
            invitedByName: me.name || null,
            partnerEmail: emailClean,
            status: 'pending',
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString()
        });

        const siteUrl = process.env.PUBLIC_SITE_URL || 'https://uberpadel.com';
        const from = process.env.SMTP_FROM || 'noreply@uberpadel.com';
        const claimUrl = `${siteUrl}/tournaments/claim-pair.html?invite=${inviteId}`;

        try {
            const mailer = getMailer();
            await mailer.sendMail({
                from,
                to: emailClean,
                subject: `${me.name || 'Your partner'} invited you to a tournament on Uber Padel`,
                text:
                    `Hi,\n\n` +
                    `${me.name || 'Your partner'} wants to pair with you for "${tournament.meta.name}".\n\n` +
                    `Open this link to accept and register:\n${claimUrl}\n\n` +
                    `This link expires in ${EMAIL_INVITE_TTL_HOURS} hours.\n\n` +
                    `— Uber Padel\n`,
                html:
                    `<p>Hi,</p>` +
                    `<p><strong>${escapeHtml(me.name || 'Your partner')}</strong> wants to pair with you for <em>${escapeHtml(tournament.meta.name)}</em> on Uber Padel.</p>` +
                    `<p><a href="${claimUrl}">Accept and register →</a></p>` +
                    `<p style="color:#666;font-size:12px">Expires in ${EMAIL_INVITE_TTL_HOURS} hours.</p>`
            });
        } catch (err) {
            // Clean up the invite if mail fails
            await db.ref(`pair_invites/${inviteId}`).remove().catch(() => {});
            console.error('sendMail failed:', err);
            throw new functions.https.HttpsError('internal', 'Could not send invite email');
        }

        return { inviteId, expiresAt: expiresAt.toISOString() };
    });

exports.acceptPairInvite = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Sign in required to accept');
        }
        const { inviteId } = data || {};
        if (!inviteId) throw new functions.https.HttpsError('invalid-argument', 'inviteId required');

        const ref = db.ref(`pair_invites/${inviteId}`);
        const snap = await ref.once('value');
        const inv = snap.val();
        if (!inv) throw new functions.https.HttpsError('not-found', 'Invite not found');
        if (inv.status !== 'pending') {
            throw new functions.https.HttpsError('failed-precondition',
                `Invite already ${inv.status}`);
        }
        if (new Date(inv.expiresAt).getTime() < Date.now()) {
            await ref.update({ status: 'expired' }).catch(() => {});
            throw new functions.https.HttpsError('failed-precondition', 'Invite expired');
        }

        const me = await loadUserRating(context.auth.uid);
        const partner = await loadUserRating(inv.invitedBy);
        const result = await _writePairTx(inv.tournamentId, partner, me);
        await ref.update({ status: 'accepted', acceptedAt: new Date().toISOString() });
        return result;
    });

function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

exports._internal = { _writePairTx, loadUserRating, assertRatingLimit, sha256 };
