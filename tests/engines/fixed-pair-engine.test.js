/**
 * tests/engines/fixed-pair-engine.test.js
 *
 * Unit tests for FixedPairEngine focusing on:
 *   - rating-limit enforcement (individual + combined)
 *   - round-robin match count + bye handling
 *   - group + knockout generation for realistic pair counts
 *   - single-elim bracket sizing for 3/5/6/7/9 pairs
 */

import { describe, it, expect } from 'vitest';
import { FixedPairEngine } from '../../src/core/engines/fixed-pair-engine.js';

function makePairs(n, fn = (i) => ({})) {
    return Array.from({ length: n }, (_, i) => ({
        pairId: `p${i + 1}`,
        player1Uid: `u${i + 1}a`,
        player2Uid: `u${i + 1}b`,
        combinedRating: 5 + i * 0.1,
        ...fn(i)
    }));
}

describe('FixedPairEngine.validatePairRating', () => {
    it('passes when limit.type is "none"', () => {
        const e = new FixedPairEngine();
        expect(e.validatePairRating({ rating1: 4.5, rating2: 5.5 }, { type: 'none' }))
            .toEqual({ valid: true });
    });

    it('rejects a pair where one player is above individual max', () => {
        const e = new FixedPairEngine();
        const res = e.validatePairRating({ rating1: 4.5, rating2: 7.1 }, { type: 'individual', max: 7 });
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/at most 7/);
    });

    it('accepts a pair within combined limits', () => {
        const e = new FixedPairEngine();
        expect(e.validatePairRating({ rating1: 3.5, rating2: 3.4 }, { type: 'combined', max: 7 }))
            .toEqual({ valid: true });
    });

    it('rejects a pair exceeding combined max', () => {
        const e = new FixedPairEngine();
        const res = e.validatePairRating({ rating1: 4.0, rating2: 3.5 }, { type: 'combined', max: 7 });
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/at most 7/);
    });

    it('fails when either player rating is missing', () => {
        const e = new FixedPairEngine();
        const res = e.validatePairRating({ rating1: 4.0, rating2: NaN }, { type: 'individual', max: 8 });
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/verified rating/);
    });
});

describe('FixedPairEngine.generateRoundRobin', () => {
    it('schedules n*(n-1)/2 matches for n even pairs', () => {
        const e = new FixedPairEngine({ matchFormat: 'round-robin' });
        const pairs = makePairs(6);
        const out = e.generateRoundRobin(pairs);
        const total = out.rounds.reduce((sum, r) => sum + r.matches.length, 0);
        expect(total).toBe(15);          // 6*5/2
        expect(out.rounds.length).toBe(5); // 2n-1 actually = n-1 rounds for round-robin
    });

    it('handles odd pairs with a bye (no self-matches)', () => {
        const e = new FixedPairEngine({ matchFormat: 'round-robin' });
        const pairs = makePairs(5);
        const out = e.generateRoundRobin(pairs);
        // 5 rounds (n = 5+bye = 6 → n-1 = 5)
        expect(out.rounds.length).toBe(5);
        // Each player plays 4 matches (n-1)
        const count = {};
        for (const r of out.rounds) for (const m of r.matches) {
            count[m.pair1] = (count[m.pair1] || 0) + 1;
            count[m.pair2] = (count[m.pair2] || 0) + 1;
        }
        for (const id of pairs.map(p => p.pairId)) {
            expect(count[id]).toBe(4);
        }
    });
});

describe('FixedPairEngine.generateGroupStage', () => {
    it('splits 12 pairs into 3 groups of 4 via snake draft', () => {
        const e = new FixedPairEngine({ matchFormat: 'groups+ko', groupSize: 4 });
        const pairs = makePairs(12);
        const out = e.generateGroupStage(pairs, 4);
        expect(Object.keys(out.groups).sort()).toEqual(['A','B','C']);
        for (const g of Object.values(out.groups)) expect(g.pairIds.length).toBe(4);
    });

    it('produces knockout skeleton with power-of-two first round', () => {
        const e = new FixedPairEngine({ matchFormat: 'groups+ko', groupSize: 4 });
        const out = e.generateGroupStage(makePairs(8), 4);
        const firstRoundCount = out.knockoutBracket.rounds[0].matches.length;
        expect(Number.isInteger(Math.log2(firstRoundCount))).toBe(true);
    });
});

describe('FixedPairEngine.generateKnockout', () => {
    it('pads 5 pairs to 8 with byes', () => {
        const e = new FixedPairEngine({ matchFormat: 'knockout' });
        const out = e.generateKnockout(makePairs(5));
        const first = out.rounds[0].matches;
        expect(first.length).toBe(4); // 8/2
        const byeCount = first.filter(m => m.bye).length;
        expect(byeCount).toBe(3);
    });

    it('pads 3 pairs to 4 (one bye)', () => {
        const e = new FixedPairEngine({ matchFormat: 'knockout' });
        const out = e.generateKnockout(makePairs(3));
        expect(out.rounds[0].matches.length).toBe(2);
        expect(out.rounds[0].matches.filter(m => m.bye).length).toBe(1);
    });

    it('generates exactly log2(size) rounds', () => {
        const e = new FixedPairEngine({ matchFormat: 'knockout' });
        const out = e.generateKnockout(makePairs(8));
        expect(out.rounds.length).toBe(3); // 8 → 4 → 2 → 1
    });
});

describe('FixedPairEngine.computeGroupStandings', () => {
    it('gives 3 points for a win, none for a loss, ranks pairs', () => {
        const e = new FixedPairEngine({ pointsPerMatch: 24 });
        const pairs = makePairs(3);
        const schedule = e.generateGroupStage(pairs, 3);
        const pairsById = Object.fromEntries(pairs.map(p => [p.pairId, { player1Name:'A', player2Name:'B' }]));
        const gA = schedule.groupRounds['A'];
        // Fake scores — p1 beats p2, p1 beats p3, p2 beats p3
        const scores = {};
        for (const r of gA) for (const m of r.matches) {
            const [,, pairA, pairB] = [m.matchId, m.round, m.pair1, m.pair2];
            if (pairA === 'p1' && pairB === 'p2') scores[m.matchId] = { team1: 16, team2: 8 };
            if (pairA === 'p2' && pairB === 'p1') scores[m.matchId] = { team1: 8,  team2: 16 };
            if (pairA === 'p1' && pairB === 'p3') scores[m.matchId] = { team1: 16, team2: 8 };
            if (pairA === 'p3' && pairB === 'p1') scores[m.matchId] = { team1: 8,  team2: 16 };
            if (pairA === 'p2' && pairB === 'p3') scores[m.matchId] = { team1: 16, team2: 8 };
            if (pairA === 'p3' && pairB === 'p2') scores[m.matchId] = { team1: 8,  team2: 16 };
        }
        const st = e.computeGroupStandings('A', gA, pairsById, scores);
        expect(st[0].pairId).toBe('p1');
        expect(st[0].groupPoints).toBe(6);
    });
});
