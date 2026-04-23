/**
 * functions/index.js — Firebase Cloud Functions
 *
 * Server-side triggers for UberPadel.
 * Deployed with: firebase deploy --only functions
 *
 * Functions:
 *   1. onScoreWritten        — triggers when a score is saved; notifies all players in the match
 *   2. onTournamentStatusChanged — triggers when tournament status changes to 'active' or 'completed'
 *   3. onCompetitionRegistration — triggers when a player registers for a competition
 *   4. processRatingUpdate   — HTTPS callable: calculates and persists ELO changes after a match
 *   5. applyInactivityDecay  — scheduled weekly: decays confidence for inactive players
 *
 * Required env vars (set via `firebase functions:config:set` or Secret Manager):
 *   None currently — all data comes from RTDB.
 *
 * @module functions
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

admin.initializeApp();

const db = admin.database();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Write a notification document into users/{uid}/notifications.
 * @param {string} uid
 * @param {{ type: string, title: string, body: string, tournamentId?: string }} data
 */
async function pushNotification(uid, { type, title, body, tournamentId = null }) {
    const ref = db.ref(`users/${uid}/notifications`).push();
    await ref.set({
        type,
        title,
        body,
        tournamentId,
        read: false,
        createdAt: new Date().toISOString(),
    });

    // Prune: keep at most 50 per user
    const snapshot = await db.ref(`users/${uid}/notifications`)
        .orderByChild('createdAt')
        .once('value');

    const total = snapshot.numChildren();
    if (total > 50) {
        let toDelete = total - 50;
        const deletions = [];
        snapshot.forEach(child => {
            if (toDelete-- > 0) {
                deletions.push(db.ref(`users/${uid}/notifications/${child.key}`).remove());
            }
        });
        await Promise.all(deletions);
    }
}

/**
 * Look up the auth UID for a player registered in a tournament.
 * Players have a `registeredUid` field set at registration time.
 *
 * @param {object} playerData  - player snapshot value from RTDB
 * @returns {string|null}
 */
function getPlayerUid(playerData) {
    return playerData?.registeredUid ?? null;
}

// ---------------------------------------------------------------------------
// 1. onScoreWritten
//    Path: {format}-tournaments/{tournamentId}/scores/{scoreKey}
//    Notifies both teams that a result has been posted.
// ---------------------------------------------------------------------------

const TOURNAMENT_FORMATS = [
    'americano', 'mexicano', 'mix', 'mixicano',
    'team-league', 'knockout', 'round-robin', 'swiss',
];

// Register a trigger for each format
TOURNAMENT_FORMATS.forEach(format => {
    exports[`onScoreWritten_${format.replace('-', '_')}`] = functions
        .region('europe-west1')
        .database.ref(`${format}-tournaments/{tournamentId}/scores/{scoreKey}`)
        .onWrite(async (change, context) => {
            // Only act on new or updated scores, not deletions
            if (!change.after.exists()) return null;

            const { tournamentId, scoreKey } = context.params;
            const score = change.after.val();

            // Ignore sentinel -1 (unset)
            if (score.team1 === -1 || score.team2 === -1) return null;

            // Fetch tournament meta + players
            const snap = await db.ref(`${format}-tournaments/${tournamentId}`).once('value');
            const tournament = snap.val();
            if (!tournament) return null;

            const name = tournament.meta?.name ?? 'Your tournament';
            const scoreText = `${score.team1} – ${score.team2}`;

            // Notify all players in the tournament who have a registered UID
            const players = Object.values(tournament.players ?? {});
            const notifications = players
                .map(p => getPlayerUid(p))
                .filter(Boolean)
                .map(uid => pushNotification(uid, {
                    type: 'result_posted',
                    title: '📊 Result Posted',
                    body: `Score ${scoreText} has been recorded in "${name}".`,
                    tournamentId,
                }));

            await Promise.all(notifications);
            return null;
        });
});

// ---------------------------------------------------------------------------
// 2. onTournamentStatusChanged
//    Path: {format}-tournaments/{tournamentId}/meta/status
//    Notifies all players when a tournament starts or completes.
// ---------------------------------------------------------------------------

TOURNAMENT_FORMATS.forEach(format => {
    exports[`onTournamentStatus_${format.replace('-', '_')}`] = functions
        .region('europe-west1')
        .database.ref(`${format}-tournaments/{tournamentId}/meta/status`)
        .onUpdate(async (change, context) => {
            const newStatus = change.after.val();
            if (newStatus !== 'active' && newStatus !== 'completed') return null;

            const { tournamentId } = context.params;

            const snap = await db.ref(`${format}-tournaments/${tournamentId}`).once('value');
            const tournament = snap.val();
            if (!tournament) return null;

            const name = tournament.meta?.name ?? 'Your tournament';
            const players = Object.values(tournament.players ?? {});

            let notifyFn;
            if (newStatus === 'active') {
                notifyFn = uid => pushNotification(uid, {
                    type: 'tournament_start',
                    title: '🏆 Tournament Started',
                    body: `"${name}" has started. Good luck!`,
                    tournamentId,
                });
            } else {
                notifyFn = uid => pushNotification(uid, {
                    type: 'tournament_complete',
                    title: '🎉 Tournament Complete',
                    body: `"${name}" has finished. Check the final standings!`,
                    tournamentId,
                });
            }

            const notifications = players
                .map(p => getPlayerUid(p))
                .filter(Boolean)
                .map(notifyFn);

            await Promise.all(notifications);
            return null;
        });
});

// ---------------------------------------------------------------------------
// 3. onCompetitionRegistration
//    Path: competitions/{competitionId}/registeredPlayers/{uid}
//    Confirms registration to the new player.
// ---------------------------------------------------------------------------

exports.onCompetitionRegistration = functions
    .region('europe-west1')
    .database.ref('competitions/{competitionId}/registeredPlayers/{uid}')
    .onCreate(async (snapshot, context) => {
        const { competitionId, uid } = context.params;

        const compSnap = await db.ref(`competitions/${competitionId}/meta`).once('value');
        const meta = compSnap.val();
        if (!meta) return null;

        await pushNotification(uid, {
            type: 'registration_confirmed',
            title: '✅ Registration Confirmed',
            body: `You're registered for "${meta.name}". We'll notify you when it starts.`,
            tournamentId: competitionId,
        });

        return null;
    });

// ---------------------------------------------------------------------------
// 4. processRatingUpdate (HTTPS Callable)
//    Client calls this after a doubles match is confirmed.
//    Reads current ratings, calculates ELO changes, persists, returns results.
// ---------------------------------------------------------------------------

exports.processRatingUpdate = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        // Must be authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
        }

        const { matchId, tournamentId, team1, team2 } = data;

        // Validate shape
        if (!team1?.players?.length || !team2?.players?.length) {
            throw new functions.https.HttpsError('invalid-argument', 'teams must have players');
        }

        // Import rating engine (pure JS — no Firebase deps)
        const { processDoublesMatch, isSuspiciousChange } = require('../src/core/rating-engine.js');

        // Fetch current ratings for each player
        async function fetchPlayerRating(uid) {
            const snap = await db.ref(`userRatings/${uid}`).once('value');
            if (snap.exists()) return snap.val();
            // Default for new player
            return {
                uid,
                rating: 1000,
                confidence: 0,
                gamesPlayed: 0,
                lastPlayedAt: new Date().toISOString(),
            };
        }

        const [p1, p2, p3, p4] = await Promise.all([
            fetchPlayerRating(team1.players[0].uid),
            fetchPlayerRating(team1.players[1].uid),
            fetchPlayerRating(team2.players[0].uid),
            fetchPlayerRating(team2.players[1].uid),
        ]);

        // Build match object
        const match = {
            team1: {
                score: team1.score,
                players: [
                    { uid: p1.uid, rating: p1.rating, confidence: p1.confidence },
                    { uid: p2.uid, rating: p2.rating, confidence: p2.confidence },
                ],
            },
            team2: {
                score: team2.score,
                players: [
                    { uid: p3.uid, rating: p3.rating, confidence: p3.confidence },
                    { uid: p4.uid, rating: p4.rating, confidence: p4.confidence },
                ],
            },
        };

        const results = processDoublesMatch(match);

        // Persist results + log rating change history
        const allPlayers = { [p1.uid]: p1, [p2.uid]: p2, [p3.uid]: p3, [p4.uid]: p4 };
        const now = new Date().toISOString();
        const updates = {};
        const changeLog = [];

        results.forEach(r => {
            const prev = allPlayers[r.uid];
            const suspicious = isSuspiciousChange({
                before: r.before,
                after: r.after,
                gamesPlayed: prev.gamesPlayed,
            });

            updates[`userRatings/${r.uid}`] = {
                uid: r.uid,
                rating: r.after,
                confidence: r.newConfidence,
                gamesPlayed: (prev.gamesPlayed || 0) + 1,
                lastPlayedAt: now,
                updatedAt: now,
            };

            const changeDoc = {
                matchId,
                tournamentId,
                before: r.before,
                after: r.after,
                delta: r.delta,
                suspicious,
                timestamp: now,
            };

            updates[`userRatings/${r.uid}/history/${matchId}`] = changeDoc;
            changeLog.push({ uid: r.uid, ...changeDoc });
        });

        await db.ref().update(updates);

        return { success: true, changes: changeLog };
    });

// ---------------------------------------------------------------------------
// 5. applyInactivityDecay (Scheduled)
//    Runs every Sunday at 02:00 UTC.
//    Reduces confidence for players who haven't played in the last 30+ days.
// ---------------------------------------------------------------------------

exports.applyInactivityDecay = functions
    .region('europe-west1')
    .pubsub.schedule('every sunday 02:00')
    .timeZone('UTC')
    .onRun(async () => {
        const { applyInactivityDecay, monthsSince } = require('../src/core/rating-engine.js');

        const snapshot = await db.ref('userRatings').once('value');
        if (!snapshot.exists()) return null;

        const updates = {};
        const now = new Date().toISOString();

        snapshot.forEach(child => {
            const player = child.val();
            if (!player.lastPlayedAt) return;

            const months = monthsSince(player.lastPlayedAt);
            if (months < 1) return; // Active recently — no decay

            const newConfidence = applyInactivityDecay(player.confidence ?? 0, Math.floor(months));
            if (Math.abs(newConfidence - (player.confidence ?? 0)) < 0.001) return; // No change

            updates[`${child.key}/confidence`] = newConfidence;
            updates[`${child.key}/updatedAt`] = now;
        });

        const count = Object.keys(updates).length / 2;
        if (count > 0) {
            await db.ref('userRatings').update(updates);
            console.log(`[applyInactivityDecay] Decayed ${count} players`);
        }

        return null;
    });

// ---------------------------------------------------------------------------
// REST API (Express app)
// ---------------------------------------------------------------------------

const { api } = require('./api/index.js');
exports.api = api;

// ---------------------------------------------------------------------------
// Unified /tournaments/ shell — supporting Cloud Functions
// ---------------------------------------------------------------------------

// Postcode lookup proxy + 24-h cache (browse-by-postcode in the new shell)
const postcodeProxy = require('./postcode-proxy.js');
exports.lookupPostcode = postcodeProxy.lookupPostcode;

// Phase A — Playtomic screenshot verification via Claude Vision
const playtomicVerify = require('./playtomic-verify.js');
exports.verifyPlaytomicScreenshot    = playtomicVerify.verifyPlaytomicScreenshot;
exports.expireStalePlaytomicVerifications = playtomicVerify.expireStalePlaytomicVerifications;

// Phase B — Stripe Connect onboarding for organisers
const stripeConnect = require('./stripe-connect.js');
exports.createConnectOnboardingLink = stripeConnect.createConnectOnboardingLink;
exports.getConnectAccountStatus     = stripeConnect.getConnectAccountStatus;
const stripeWebhook = require('./stripe-webhook.js');
exports.stripeWebhook = stripeWebhook.stripeWebhook;

// Phase C — fixed-pair registration (three partner-invite mechanisms)
const pairInvites = require('./pair-invites.js');
exports.registerPair         = pairInvites.registerPair;
exports.createPairClaimLink  = pairInvites.createPairClaimLink;
exports.acceptPairClaim      = pairInvites.acceptPairClaim;
exports.sendPairInviteEmail  = pairInvites.sendPairInviteEmail;
exports.acceptPairInvite     = pairInvites.acceptPairInvite;

// Phase D — private-tournament invite tokens
const inviteTokens = require('./invite-tokens.js');
exports.mintInviteToken     = inviteTokens.mintInviteToken;
exports.validateInviteToken = inviteTokens.validateInviteToken;
exports.redeemInviteToken   = inviteTokens.redeemInviteToken;
exports.revokeInviteToken   = inviteTokens.revokeInviteToken;

// Phase E — paid entry via Stripe Checkout
const stripeCheckout = require('./stripe-checkout.js');
exports.createCheckoutSessionForRegistration = stripeCheckout.createCheckoutSessionForRegistration;
exports.createRefund                         = stripeCheckout.createRefund;

// Phase F — admin override + verification queue
const adminVerification = require('./admin-verification.js');
exports.overrideVerification    = adminVerification.overrideVerification;
exports.adminVerificationQueue  = adminVerification.adminVerificationQueue;

// Phase G — organiser revenue ledger
const organiserLedger = require('./organiser-ledger.js');
exports.getOrganiserLedger = organiserLedger.getOrganiserLedger;
