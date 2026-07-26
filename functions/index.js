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
 * True for values safe to interpolate into an RTDB path. Rejects the
 * characters RTDB forbids in keys (. # $ [ ]) and, critically, "/" — which
 * would otherwise let a caller redirect a write to an arbitrary location.
 * @param {unknown} value
 * @returns {boolean}
 */
function isSafeKey(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

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

const { TRIGGER_FORMATS: TOURNAMENT_FORMATS, rootForFormat } = require('./lib/format-roots.js');

// Register a trigger for each format
TOURNAMENT_FORMATS.forEach(format => {
    const root = rootForFormat(format);
    exports[`onScoreWritten_${format.replace(/-/g, '_')}`] = functions
        .region('europe-west1')
        .database.ref(`${root}/{tournamentId}/scores/{scoreKey}`)
        .onWrite(async (change, context) => {
            // Only act on new or updated scores, not deletions
            if (!change.after.exists()) return null;

            const { tournamentId, scoreKey } = context.params;
            const score = change.after.val();

            // Ignore sentinel -1 (unset)
            if (score.team1 === -1 || score.team2 === -1) return null;

            // Fetch tournament meta + players
            const snap = await db.ref(`${root}/${tournamentId}`).once('value');
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
    const root = rootForFormat(format);
    exports[`onTournamentStatus_${format.replace(/-/g, '_')}`] = functions
        .region('europe-west1')
        .database.ref(`${root}/{tournamentId}/meta/status`)
        .onUpdate(async (change, context) => {
            const newStatus = change.after.val();
            if (newStatus !== 'active' && newStatus !== 'completed') return null;

            const { tournamentId } = context.params;

            const snap = await db.ref(`${root}/${tournamentId}`).once('value');
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

        // The path key is the target uid, so only notify when the registration
        // record genuinely belongs to that user and that user actually exists.
        // Without this, a forged registration under someone else's uid would
        // deliver notifications into their feed.
        const registration = snapshot.val();
        if (!registration || registration.id !== uid) return null;

        const userSnap = await db.ref(`users/${uid}`).once('value');
        if (!userSnap.exists()) return null;

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

        const { matchId, tournamentId, format, team1, team2 } = data;

        // Every value below is attacker-controlled, and this function writes
        // with admin credentials (database rules do not apply), so the payload
        // is only ever used to *locate* the match — never as the result itself.
        if (!isSafeKey(matchId) || !isSafeKey(tournamentId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid matchId or tournamentId');
        }

        const root = rootForFormat(format);
        if (!root) {
            throw new functions.https.HttpsError('invalid-argument', 'Unknown format');
        }

        if (team1?.players?.length !== 2 || team2?.players?.length !== 2) {
            throw new functions.https.HttpsError('invalid-argument', 'Each team must have exactly 2 players');
        }

        const uids = [...team1.players, ...team2.players].map(p => p?.uid);
        if (!uids.every(isSafeKey)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid player uid');
        }
        if (new Set(uids).size !== 4) {
            throw new functions.https.HttpsError('invalid-argument', 'Players must be distinct');
        }

        // Authorization: only someone who played the match or ran the
        // tournament may trigger a rating update for it.
        const tournamentSnap = await db.ref(`${root}/${tournamentId}`).once('value');
        if (!tournamentSnap.exists()) {
            throw new functions.https.HttpsError('not-found', 'Tournament not found');
        }
        const tournament = tournamentSnap.val();
        const organizerUid = tournament.meta?.organizerUid ?? null;
        if (!uids.includes(context.auth.uid) && context.auth.uid !== organizerUid) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only a player in this match or the organiser can submit it',
            );
        }

        // Use the score the database holds, not the one the caller sent.
        const storedScore = tournament.scores?.[matchId];
        if (!storedScore
            || typeof storedScore.team1 !== 'number'
            || typeof storedScore.team2 !== 'number'
            || storedScore.team1 < 0
            || storedScore.team2 < 0) {
            throw new functions.https.HttpsError('failed-precondition', 'No recorded score for this match');
        }

        // Idempotency: a matchId already in any player's history is done.
        const processedSnap = await db.ref(`userRatings/${uids[0]}/history/${matchId}`).once('value');
        if (processedSnap.exists()) {
            return { success: true, alreadyProcessed: true, changes: [] };
        }

        // Import rating engine (pure JS — no Firebase deps).
        // Vendored as CommonJS by scripts/vendor-rating-engine.js; ../src is
        // not part of the deployed functions package.
        const { processDoublesMatch, isSuspiciousChange } = require('./lib/rating-engine.js');

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

        const [p1, p2, p3, p4] = await Promise.all(uids.map(fetchPlayerRating));

        // Build match object
        const match = {
            team1: {
                score: storedScore.team1,
                players: [
                    { uid: p1.uid, rating: p1.rating, confidence: p1.confidence },
                    { uid: p2.uid, rating: p2.rating, confidence: p2.confidence },
                ],
            },
            team2: {
                score: storedScore.team2,
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

            // Leaf paths only: a merge that contains both userRatings/<uid>
            // and userRatings/<uid>/history/<matchId> is rejected by the SDK
            // (ancestor of another path), and writing the ancestor as a whole
            // object would wipe the player's existing history subtree.
            updates[`userRatings/${r.uid}/uid`] = r.uid;
            updates[`userRatings/${r.uid}/rating`] = r.after;
            updates[`userRatings/${r.uid}/confidence`] = r.newConfidence;
            updates[`userRatings/${r.uid}/gamesPlayed`] = (prev.gamesPlayed || 0) + 1;
            updates[`userRatings/${r.uid}/lastPlayedAt`] = now;
            updates[`userRatings/${r.uid}/updatedAt`] = now;

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
// 5. claimTournamentOwnership (HTTPS Callable)
//    Re-anchors meta/organizerUid to the caller when they can produce the
//    tournament's organiser key.
//
//    This replaces a database rule that let any client set organizerUid to
//    itself as long as it left meta/organiserKey unchanged — which a partial
//    write does automatically, so the rule granted takeover of every
//    tournament to anyone. Ownership transfer now happens here, where the key
//    is actually compared, and the rules only accept the recorded owner.
//
//    NOTE: meta/organiserKey still sits under a world-readable node, so this
//    check is only as strong as that key's secrecy. Moving the key (and
//    passcodeHash) to a non-readable node is what makes this genuinely
//    tamper-proof; this function is where that change lands when it happens.
// ---------------------------------------------------------------------------

exports.claimTournamentOwnership = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
        }

        const { format, tournamentId, organiserKey } = data || {};

        if (!isSafeKey(tournamentId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid tournamentId');
        }
        if (typeof organiserKey !== 'string' || organiserKey.length < 6 || organiserKey.length > 64) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid organiser key');
        }

        const root = rootForFormat(format);
        if (!root) {
            throw new functions.https.HttpsError('invalid-argument', 'Unknown format');
        }

        const metaSnap = await db.ref(`${root}/${tournamentId}/meta`).once('value');
        const meta = metaSnap.val();
        if (!meta) {
            throw new functions.https.HttpsError('not-found', 'Tournament not found');
        }

        const storedKey = meta.organiserKey;
        if (typeof storedKey !== 'string' || storedKey.length === 0) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'This tournament has no organiser key, so ownership cannot be transferred',
            );
        }

        if (storedKey !== organiserKey) {
            console.warn(`[claimTournamentOwnership] key mismatch for ${root}/${tournamentId}`);
            throw new functions.https.HttpsError('permission-denied', 'Incorrect organiser key');
        }

        await db.ref(`${root}/${tournamentId}/meta/organizerUid`).set(context.auth.uid);
        console.log(`[claimTournamentOwnership] ${root}/${tournamentId} -> ${context.auth.uid}`);

        return { success: true, organizerUid: context.auth.uid };
    });

// ---------------------------------------------------------------------------
// 6. applyInactivityDecay (Scheduled)
//    Runs every Sunday at 02:00 UTC.
//    Reduces confidence for players who haven't played in the last 30+ days.
// ---------------------------------------------------------------------------

exports.applyInactivityDecay = functions
    .region('europe-west1')
    .pubsub.schedule('every sunday 02:00')
    .timeZone('UTC')
    .onRun(async () => {
        const { applyInactivityDecay, monthsSince } = require('./lib/rating-engine.js');

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
