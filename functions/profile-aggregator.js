/**
 * functions/profile-aggregator.js — Phase H player-profile aggregator
 *
 * Listens on tournaments/{id}/meta/status. When it transitions to
 * 'completed' we:
 *   1. Compute a final-standings list (best-effort: uses
 *      FixedPairEngine's shape for Fixed-Pair tournaments; falls back
 *      to a simple points-based ranking for the other formats).
 *   2. Write tournaments/{id}/finalStandings.
 *   3. For every player listed in pairs/* + players/*, append a history
 *      row at users/{uid}/tournamentHistory/{tournamentId} with
 *      position, isTrophy (1–3), trophyRank ('gold'/'silver'/'bronze'),
 *      prizeGBP (computed from meta.prizePoolGBP + meta.prizeSplit —
 *      both optional), playerPaidGBP (from the matching payments row).
 *   4. Bump users/{uid}/stats counters + users/{uid}/trophies/{id} for
 *      podium finishers.
 *
 * Idempotent via a `aggregatedAt` marker on tournaments/{id}/finalStandings.
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

const db = admin.database();

// Points per win for standings when the match uses fixedPoints (24 default).
// We keep the scoring comparator light here to avoid depending on engine.

async function loadTournament(id) {
    const snap = await db.ref(`tournaments/${id}`).once('value');
    return snap.val();
}

function isPodium(rank) { return rank === 1 || rank === 2 || rank === 3; }
function trophyRank(rank) { return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null; }

function computeStandings(tournament) {
    const scores = tournament.scores || {};
    const pairs = tournament.pairs || {};
    const players = tournament.players || {};
    const meta = tournament.meta || {};

    // Build per-entity stats from scores
    const statsByKey = {}; // key = pairId or uid

    function ensure(key, meta) {
        if (!statsByKey[key]) {
            statsByKey[key] = {
                key,
                unit: meta.unit,
                displayName: meta.displayName,
                uids: meta.uids,
                wins: 0, losses: 0, draws: 0,
                pointsFor: 0, pointsAgainst: 0, gamesPlayed: 0
            };
        }
        return statsByKey[key];
    }

    // Seed all registered pairs/players so unplayed entries still rank
    Object.entries(pairs).forEach(([pid, p]) => ensure(pid, {
        unit: 'pair',
        displayName: [p.player1Name, p.player2Name].filter(Boolean).join(' & '),
        uids: [p.player1Uid, p.player2Uid].filter(Boolean)
    }));
    Object.entries(players).forEach(([uid, p]) => ensure(uid, {
        unit: 'individual',
        displayName: p.name || 'Player',
        uids: [uid]
    }));

    // Walk scores — matchIds encode which entities played. For the unified
    // shell the match schedule lives on tournament.rounds / groupRounds /
    // knockoutBracket. We iterate those and attribute scores to entities.
    const schedule = tournament.schedule || tournament; // fixed-pair engine writes {format, rounds|groupRounds|knockoutBracket}
    const iterateMatches = function* () {
        if (schedule.rounds) for (const r of schedule.rounds) for (const m of (r.matches || [])) yield m;
        if (schedule.groupRounds) for (const letter of Object.keys(schedule.groupRounds)) for (const r of schedule.groupRounds[letter]) for (const m of (r.matches || [])) yield m;
        if (schedule.knockoutBracket?.rounds) for (const r of schedule.knockoutBracket.rounds) for (const m of (r.matches || [])) yield m;
    };

    for (const m of iterateMatches()) {
        const row = scores[m.matchId];
        if (!row) continue;
        const s1 = Number(row.team1), s2 = Number(row.team2);
        if (!Number.isFinite(s1) || !Number.isFinite(s2)) continue;
        const keyA = m.pair1 || m.player1;
        const keyB = m.pair2 || m.player2;
        if (!keyA || !keyB) continue;
        const a = statsByKey[keyA], b = statsByKey[keyB];
        if (!a || !b) continue;
        a.gamesPlayed++; b.gamesPlayed++;
        a.pointsFor += s1; a.pointsAgainst += s2;
        b.pointsFor += s2; b.pointsAgainst += s1;
        if (s1 > s2)      { a.wins++; b.losses++; }
        else if (s2 > s1) { b.wins++; a.losses++; }
        else              { a.draws++; b.draws++; }
    }

    const rows = Object.values(statsByKey).map(s => ({
        ...s,
        points: s.wins * 3 + s.draws,
        diff: s.pointsFor - s.pointsAgainst
    }));

    rows.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.diff !== a.diff) return b.diff - a.diff;
        if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
        return (a.displayName || '').localeCompare(b.displayName || '');
    });

    return rows.map((r, i) => ({
        rank: i + 1,
        unit: r.unit,
        key: r.key,
        uids: r.uids,
        displayName: r.displayName,
        points: r.points,
        gamesPlayed: r.gamesPlayed,
        pointsFor: r.pointsFor,
        pointsAgainst: r.pointsAgainst,
        diff: r.diff
    }));
}

/**
 * Compute prizeGBP for rank N from meta.prizePoolGBP + meta.prizeSplit.
 * Example split: [60, 25, 15] → 60% to 1st, 25% to 2nd, 15% to 3rd.
 */
function computePrize(rank, meta) {
    const pool = Number(meta?.prizePoolGBP);
    const split = meta?.prizeSplit;
    if (!pool || !Array.isArray(split)) return 0;
    const idx = rank - 1;
    if (idx < 0 || idx >= split.length) return 0;
    const pct = Number(split[idx]);
    if (!Number.isFinite(pct)) return 0;
    return Math.round((pool * pct / 100) * 100) / 100;
}

async function findPlayerPaidGBP(tournamentId, uid) {
    const snap = await db.ref('payments')
        .orderByChild('playerUid')
        .equalTo(uid)
        .once('value');
    let total = 0;
    snap.forEach(c => {
        const p = c.val();
        if (!p || p.tournamentId !== tournamentId) return;
        if (p.status !== 'paid') return;
        total += (p.amountPence || 0) / 100;
    });
    return total;
}

async function aggregate(tournamentId) {
    const tournament = await loadTournament(tournamentId);
    if (!tournament) return;
    const meta = tournament.meta || {};

    const finalRef = db.ref(`tournaments/${tournamentId}/finalStandings`);
    const existing = (await finalRef.once('value')).val();
    if (existing?.aggregatedAt) {
        console.log(`[aggregate] already aggregated: ${tournamentId}`);
        return;
    }

    const standings = computeStandings(tournament);
    const nowIso = new Date().toISOString();
    const totalEntities = standings.length;
    await finalRef.set({
        rows: standings,
        totalEntities,
        aggregatedAt: nowIso
    });

    // Per-uid history + stats
    const touched = new Set();
    for (const s of standings) {
        for (const uid of (s.uids || [])) {
            if (!uid) continue;
            const prize = computePrize(s.rank, meta);
            const paid = await findPlayerPaidGBP(tournamentId, uid);
            const historyRow = {
                tournamentId,
                tournamentName: meta.name || 'Untitled',
                format: meta.format,
                finishedAt: nowIso,
                registrationUnit: s.unit,
                partnerUid: (s.uids || []).find(u => u !== uid) || null,
                partnerName: null,          // optional — tournaments/{id}/pairs has this
                position: s.rank,
                totalCompetitors: totalEntities,
                isTrophy: isPodium(s.rank),
                trophyRank: trophyRank(s.rank),
                prizeGBP: prize,
                playerPaidGBP: paid
            };
            await db.ref(`users/${uid}/tournamentHistory/${tournamentId}`).set(historyRow);

            if (isPodium(s.rank)) {
                const tid = `${tournamentId}`;
                await db.ref(`users/${uid}/trophies/${tid}`).set({
                    tournamentId,
                    tournamentName: meta.name || 'Untitled',
                    format: meta.format,
                    rank: historyRow.trophyRank,
                    earnedAt: nowIso
                });
            }

            touched.add(uid);
        }
    }

    // Bump stats for each touched user
    const updates = {};
    for (const uid of touched) {
        const statsSnap = await db.ref(`users/${uid}/stats`).once('value');
        const st = statsSnap.val() || {
            totalTournaments: 0, wins: 0, runnerUps: 0, thirdPlaces: 0, podiums: 0,
            totalPrizeGBP: 0, totalEntryFeeGBP: 0,
            firstTournamentAt: null, lastTournamentAt: null
        };
        const history = (await db.ref(`users/${uid}/tournamentHistory/${tournamentId}`).once('value')).val() || {};
        st.totalTournaments += 1;
        if (history.position === 1) { st.wins++; st.podiums++; }
        else if (history.position === 2) { st.runnerUps++; st.podiums++; }
        else if (history.position === 3) { st.thirdPlaces++; st.podiums++; }
        st.totalPrizeGBP    = Math.round(((st.totalPrizeGBP || 0) + (history.prizeGBP || 0)) * 100) / 100;
        st.totalEntryFeeGBP = Math.round(((st.totalEntryFeeGBP || 0) + (history.playerPaidGBP || 0)) * 100) / 100;
        if (!st.firstTournamentAt) st.firstTournamentAt = nowIso;
        st.lastTournamentAt = nowIso;
        updates[`users/${uid}/stats`] = st;
    }
    if (Object.keys(updates).length) await db.ref().update(updates);

    console.log(`[aggregate] ${tournamentId}: ${touched.size} users, ${standings.length} standings rows`);
}

// ---------------------------------------------------------------------------
// Trigger: meta/status → 'completed'
// ---------------------------------------------------------------------------

exports.onTournamentStatusCompleted = functions
    .region('europe-west1')
    .database.ref('tournaments/{tournamentId}/meta/status')
    .onUpdate(async (change, context) => {
        const newStatus = change.after.val();
        if (newStatus !== 'completed') return null;
        try {
            await aggregate(context.params.tournamentId);
        } catch (err) {
            console.error('Aggregator failed:', err);
        }
        return null;
    });

/**
 * Manual re-run helper (admin-only) in case the trigger missed a
 * tournament or its shape was different.
 */
exports.rerunTournamentAggregation = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth?.token?.admin) {
            throw new functions.https.HttpsError('permission-denied', 'Admin required');
        }
        const { tournamentId } = data || {};
        if (!tournamentId) throw new functions.https.HttpsError('invalid-argument', 'tournamentId required');
        await db.ref(`tournaments/${tournamentId}/finalStandings/aggregatedAt`).remove().catch(() => {});
        await aggregate(tournamentId);
        return { ok: true };
    });
