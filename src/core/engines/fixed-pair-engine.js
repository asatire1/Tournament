/**
 * fixed-pair-engine.js — Fixed-Pair Tournament Engine
 *
 * A tournament where players register as pre-formed pairs and those pairs
 * stay together throughout. Organiser chooses the match format at creation:
 *
 *   - 'round-robin'  — every pair plays every other pair once.
 *   - 'groups+ko'    — pairs seeded into groups (default size 4) by combined
 *                      rating; round-robin within each group; top pairs go
 *                      to single-elim knockout (seeded across groups).
 *   - 'knockout'     — single-elimination bracket; seeded by combined rating.
 *
 * Rating-limit enforcement is done here via validatePairRating — the client
 * `registerPair` callable invokes this before writing a pair doc.
 *
 * Standings are compared via comparePairs (group points → avg points diff →
 * head-to-head → total points).
 */

import { BaseTournamentEngine } from './base-engine.js';

export class FixedPairEngine extends BaseTournamentEngine {

    constructor(config = {}) {
        super({
            pointsPerMatch: config.pointsPerMatch ?? 24,
            fixedPoints:    config.fixedPoints ?? true
        });
        this.matchFormat = config.matchFormat || 'groups+ko';
        this.groupSize   = config.groupSize   || 4;
    }

    // -----------------------------------------------------------------------
    // Rating-limit enforcement
    // -----------------------------------------------------------------------

    /**
     * Validate a pair against the tournament's rating limit.
     * @param {{rating1:number, rating2:number}} pair
     * @param {{type:'none'|'individual'|'combined', min?:number, max?:number}} limit
     * @returns {{valid:boolean, error?:string}}
     */
    validatePairRating(pair, limit) {
        if (!limit || limit.type === 'none') return { valid: true };

        const r1 = Number(pair.rating1);
        const r2 = Number(pair.rating2);
        if (!Number.isFinite(r1) || !Number.isFinite(r2)) {
            return { valid: false, error: 'Both players must have a verified rating' };
        }

        if (limit.type === 'individual') {
            if (typeof limit.max === 'number' && (r1 > limit.max || r2 > limit.max)) {
                return { valid: false, error: `Each player must be rated at most ${limit.max}` };
            }
            if (typeof limit.min === 'number' && (r1 < limit.min || r2 < limit.min)) {
                return { valid: false, error: `Each player must be rated at least ${limit.min}` };
            }
            return { valid: true };
        }

        if (limit.type === 'combined') {
            const combined = r1 + r2;
            if (typeof limit.max === 'number' && combined > limit.max) {
                return { valid: false, error: `Combined rating must be at most ${limit.max} (got ${combined.toFixed(1)})` };
            }
            if (typeof limit.min === 'number' && combined < limit.min) {
                return { valid: false, error: `Combined rating must be at least ${limit.min} (got ${combined.toFixed(1)})` };
            }
            return { valid: true };
        }

        return { valid: false, error: `Unknown rating limit type: ${limit.type}` };
    }

    // -----------------------------------------------------------------------
    // Match generation
    // -----------------------------------------------------------------------

    /**
     * Generate the full match schedule for this tournament. Returns a
     * data structure to be written to the tournament doc; concrete shapes:
     *
     *   { format: 'round-robin', rounds: [{ matches: [...] }, ...] }
     *   { format: 'groups+ko',   groups: {A: {pairIds}, ...}, groupRounds: [...], knockoutBracket: {...} }
     *   { format: 'knockout',    knockoutBracket: {...} }
     *
     * Caller passes pairs: [{ pairId, player1Uid, player2Uid, combinedRating }]
     */
    generateMatches(pairs) {
        if (!Array.isArray(pairs) || pairs.length < 2) {
            throw new Error('At least 2 pairs are required');
        }

        switch (this.matchFormat) {
            case 'round-robin': return this.generateRoundRobin(pairs);
            case 'knockout':    return this.generateKnockout(pairs);
            case 'groups+ko':
            default:            return this.generateGroupStage(pairs, this.groupSize);
        }
    }

    /**
     * Round-robin: every pair plays every other pair once.
     * Uses circle method for balanced rounds (handles odd count with a BYE).
     */
    generateRoundRobin(pairs) {
        const ids = pairs.map(p => p.pairId);
        const withBye = ids.length % 2 === 0 ? ids : [...ids, null /* bye */];
        const n = withBye.length;
        const rounds = [];

        // Fix the first pair, rotate the rest.
        const rotated = [...withBye];
        for (let r = 0; r < n - 1; r++) {
            const matches = [];
            for (let i = 0; i < n / 2; i++) {
                const a = rotated[i];
                const b = rotated[n - 1 - i];
                if (a !== null && b !== null) {
                    matches.push({ matchId: `${r}_${i}`, round: r, pair1: a, pair2: b });
                }
            }
            rounds.push({ round: r, matches });
            // rotate (keep index 0 fixed)
            const last = rotated.pop();
            rotated.splice(1, 0, last);
        }

        return { format: 'round-robin', rounds };
    }

    /**
     * Groups + single-elim knockout.
     * Seeds by combined rating descending, then uses a snake assignment
     * across groups so each group has comparable total strength.
     */
    generateGroupStage(pairs, groupSize = 4) {
        const sorted = [...pairs].sort((a, b) => (b.combinedRating || 0) - (a.combinedRating || 0));
        const groupCount = Math.max(1, Math.ceil(sorted.length / groupSize));
        const groups = {};
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        for (let i = 0; i < groupCount; i++) {
            groups[letters[i]] = { pairIds: [] };
        }

        // Snake draft
        let direction = 1, g = 0;
        for (const pair of sorted) {
            groups[letters[g]].pairIds.push(pair.pairId);
            g += direction;
            if (g >= groupCount) { g = groupCount - 1; direction = -1; }
            else if (g < 0)      { g = 0;              direction = 1; }
        }

        // Round-robin inside each group
        const groupRounds = {};
        for (const [letter, group] of Object.entries(groups)) {
            const groupPairs = group.pairIds.map(pid => sorted.find(p => p.pairId === pid));
            const rr = this.generateRoundRobin(groupPairs);
            groupRounds[letter] = rr.rounds.map(r => ({
                round: r.round,
                matches: r.matches.map(m => ({ ...m, matchId: `g-${letter}-${m.matchId}` }))
            }));
        }

        // Placeholder knockout bracket — populated once groups finish.
        // We pre-compute the slot layout (seeded 1v2-of-other-group, etc.)
        // so the UI can render brackets immediately even without scores.
        const knockoutBracket = this._buildKnockoutSkeleton(groupCount);

        return {
            format: 'groups+ko',
            groupSize,
            groups,
            groupRounds,
            knockoutBracket
        };
    }

    /**
     * Build an empty knockout bracket skeleton for N groups where 2 pairs
     * advance from each group. Returns a tree of rounds:
     * [{ round: 0, matches: [{ slot1: 'A1', slot2: 'B2' }, ...] }, ...]
     */
    _buildKnockoutSkeleton(groupCount) {
        const advancing = groupCount * 2;
        const slotPairs = [];
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        // Cross-pair group winners with runners-up from different groups:
        // A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2, ...
        for (let i = 0; i < groupCount; i += 2) {
            const g1 = letters[i], g2 = letters[i + 1] || letters[i];
            slotPairs.push({ slot1: `${g1}1`, slot2: `${g2}2` });
            slotPairs.push({ slot1: `${g2}1`, slot2: `${g1}2` });
        }
        while (slotPairs.length > 0 && !Number.isInteger(Math.log2(slotPairs.length))) {
            slotPairs.push({ slot1: null, slot2: null, bye: true });
        }

        const rounds = [];
        let currentSlots = slotPairs.length;
        let roundIdx = 0;
        let firstRoundMatches = slotPairs.map((p, i) => ({
            matchId: `ko-0-${i}`, round: 0, slot1: p.slot1, slot2: p.slot2, bye: !!p.bye
        }));
        rounds.push({ round: 0, matches: firstRoundMatches });

        currentSlots = Math.floor(currentSlots / 2);
        roundIdx = 1;
        while (currentSlots >= 1) {
            const matches = [];
            for (let i = 0; i < currentSlots; i++) {
                matches.push({
                    matchId: `ko-${roundIdx}-${i}`,
                    round: roundIdx,
                    slot1: null, slot2: null
                });
            }
            rounds.push({ round: roundIdx, matches });
            if (currentSlots === 1) break;
            currentSlots = Math.floor(currentSlots / 2);
            roundIdx++;
        }
        return { rounds, advancing };
    }

    /**
     * Single-elim knockout seeded by combined rating (high vs low).
     */
    generateKnockout(pairs) {
        const sorted = [...pairs].sort((a, b) => (b.combinedRating || 0) - (a.combinedRating || 0));
        // Pad to next power of two with byes
        let size = 1;
        while (size < sorted.length) size *= 2;
        const byes = size - sorted.length;
        const seeded = sorted.slice(); // index 0 = top seed
        for (let i = 0; i < byes; i++) seeded.push(null);

        // Classic seeding order: 1 vs 16, 8 vs 9, 5 vs 12, 4 vs 13, ...
        const seedingOrder = _seedingOrder(size);
        const firstRoundMatches = [];
        for (let i = 0; i < size / 2; i++) {
            const a = seeded[seedingOrder[2 * i]     - 1];
            const b = seeded[seedingOrder[2 * i + 1] - 1];
            firstRoundMatches.push({
                matchId: `ko-0-${i}`,
                round: 0,
                pair1: a ? a.pairId : null,
                pair2: b ? b.pairId : null,
                bye:   a === null || b === null
            });
        }

        const rounds = [{ round: 0, matches: firstRoundMatches }];
        let current = size / 2;
        let roundIdx = 1;
        while (current > 1) {
            const matches = [];
            for (let i = 0; i < current / 2; i++) {
                matches.push({ matchId: `ko-${roundIdx}-${i}`, round: roundIdx, pair1: null, pair2: null });
            }
            rounds.push({ round: roundIdx, matches });
            current /= 2;
            roundIdx++;
        }

        return { format: 'knockout', rounds };
    }

    // -----------------------------------------------------------------------
    // Standings
    // -----------------------------------------------------------------------

    /**
     * Compute group standings for one group.
     * @param {string} groupLetter
     * @param {Array} groupRoundsForLetter  e.g. groupRounds['A']
     * @param {Object} pairsById            map pairId → { player1Name, player2Name, ... }
     * @param {Object} scores               scores dict keyed by matchId → { team1, team2 }
     */
    computeGroupStandings(groupLetter, groupRoundsForLetter, pairsById, scores) {
        const stats = {};
        for (const round of groupRoundsForLetter) {
            for (const m of round.matches) {
                const scoreRow = scores?.[m.matchId];
                const s1 = this.normalizeScore(scoreRow?.team1);
                const s2 = this.normalizeScore(scoreRow?.team2);
                const result = this.getMatchResult(s1, s2);
                for (const pairId of [m.pair1, m.pair2]) {
                    if (!stats[pairId]) stats[pairId] = this._emptyPairStats(pairId, pairsById[pairId]);
                }
                if (!result.played) continue;
                const a = stats[m.pair1], b = stats[m.pair2];
                a.gamesPlayed++; b.gamesPlayed++;
                a.pointsFor += s1; a.pointsAgainst += s2; a.totalScore += s1;
                b.pointsFor += s2; b.pointsAgainst += s1; b.totalScore += s2;
                if (result.winner === 1)      { a.wins++; b.losses++; a.groupPoints += 3; }
                else if (result.winner === 2) { b.wins++; a.losses++; b.groupPoints += 3; }
                else                          { a.draws++; b.draws++; a.groupPoints++; b.groupPoints++; }
            }
        }
        const standings = Object.values(stats).map(s => this.calculateDerivedStats(s));
        return standings.sort((a, b) => this.comparePairs(a, b));
    }

    _emptyPairStats(pairId, pairMeta) {
        return {
            pairId,
            player1Name: pairMeta?.player1Name || null,
            player2Name: pairMeta?.player2Name || null,
            groupPoints: 0,
            ...this.createEmptyStats()
        };
    }

    /**
     * Tiebreaker: group points → avg points diff → head-to-head → total.
     */
    comparePairs(a, b) {
        if (b.groupPoints !== a.groupPoints) return b.groupPoints - a.groupPoints;
        if (Math.abs(b.avgPointsDiff - a.avgPointsDiff) > 0.01) return b.avgPointsDiff - a.avgPointsDiff;
        // head-to-head not stored here (would need full match list) — fall back
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return b.wins - a.wins;
    }

    /**
     * Produce the final standings list once the tournament is completed.
     * Caller supplies match schedule + scores + pairs registry.
     */
    computeFinalStandings({ schedule, scores, pairsById }) {
        if (!schedule) return [];
        const format = schedule.format;

        if (format === 'round-robin') {
            return this.computeGroupStandings('_', schedule.rounds, pairsById, scores);
        }

        if (format === 'groups+ko') {
            // For Phase C the final standings = knockout bracket position,
            // with group-stage used only for seeding. If KO not completed,
            // fall back to group-sum standings.
            const allIds = Object.keys(pairsById);
            const rollup = [];
            for (const letter of Object.keys(schedule.groupRounds || {})) {
                const st = this.computeGroupStandings(letter, schedule.groupRounds[letter], pairsById, scores);
                st.forEach(s => rollup.push({ ...s, group: letter }));
            }
            // Sort overall by groupPoints then tiebreakers; rank 1..N.
            rollup.sort((a, b) => this.comparePairs(a, b));
            return rollup.map((r, i) => ({ ...r, rank: i + 1 }));
        }

        if (format === 'knockout') {
            // Basic: winners of each match progress one rank higher.
            // We return pairs ordered by highest round reached.
            const highestRound = {};
            for (const round of schedule.rounds) {
                for (const m of round.matches) {
                    const scoreRow = scores?.[m.matchId];
                    const s1 = this.normalizeScore(scoreRow?.team1);
                    const s2 = this.normalizeScore(scoreRow?.team2);
                    const r = this.getMatchResult(s1, s2);
                    for (const pid of [m.pair1, m.pair2]) {
                        if (!pid) continue;
                        if (!highestRound[pid] || round.round > highestRound[pid]) {
                            highestRound[pid] = round.round;
                        }
                    }
                    if (r.played) {
                        const winner = r.winner === 1 ? m.pair1 : m.pair2;
                        if (winner && round.round + 1 > (highestRound[winner] || 0)) {
                            highestRound[winner] = round.round + 1;
                        }
                    }
                }
            }
            const arr = Object.entries(highestRound).map(([pid, rnd]) => ({
                pairId: pid,
                player1Name: pairsById[pid]?.player1Name || null,
                player2Name: pairsById[pid]?.player2Name || null,
                highestRound: rnd
            }));
            arr.sort((a, b) => b.highestRound - a.highestRound);
            return arr.map((r, i) => ({ ...r, rank: i + 1 }));
        }

        return [];
    }
}

/**
 * Classic single-elim seeding order for size N (1-indexed).
 * e.g. size 8 → [1,8,4,5,2,7,3,6]
 */
function _seedingOrder(size) {
    let order = [1, 2];
    while (order.length < size) {
        const next = [];
        const roundSize = order.length * 2;
        for (const s of order) {
            next.push(s);
            next.push(roundSize + 1 - s);
        }
        order = next;
    }
    return order;
}

export default FixedPairEngine;
