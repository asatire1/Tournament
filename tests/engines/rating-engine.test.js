/**
 * rating-engine.test.js
 * Tests for the ELO-based rating system.
 * Correctness here directly affects competitive tournament outcomes.
 */

import { describe, it, expect } from 'vitest';
import {
    expectedScore,
    kFactor,
    marginMultiplier,
    updateConfidence,
    applyInactivityDecay,
    calculateRatingChange,
    processDoublesMatch,
    isSuspiciousChange,
    monthsSince,
    DEFAULT_RATING,
    MIN_RATING,
    MAX_RATING
} from '../../src/core/rating-engine.js';

// ---------------------------------------------------------------------------
// expectedScore
// ---------------------------------------------------------------------------
describe('expectedScore', () => {
    it('equal ratings → 0.5 expected for both sides', () => {
        expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 4);
    });

    it('100-point advantage → player A has ~64% expected score', () => {
        expect(expectedScore(1100, 1000)).toBeCloseTo(0.640, 2);
    });

    it('400-point advantage → ~91% expected', () => {
        expect(expectedScore(1400, 1000)).toBeCloseTo(0.909, 2);
    });

    it('always returns value between 0 and 1', () => {
        for (let delta = -800; delta <= 800; delta += 100) {
            const e = expectedScore(1000 + delta, 1000);
            expect(e).toBeGreaterThan(0);
            expect(e).toBeLessThan(1);
        }
    });

    it('is symmetric: E_A + E_B = 1', () => {
        const eA = expectedScore(1200, 900);
        const eB = expectedScore(900, 1200);
        expect(eA + eB).toBeCloseTo(1.0, 5);
    });
});

// ---------------------------------------------------------------------------
// kFactor
// ---------------------------------------------------------------------------
describe('kFactor', () => {
    it('confidence=0 (new player) gives K_MAX (40)', () => {
        expect(kFactor(0)).toBeCloseTo(40, 1);
    });

    it('confidence=1 (veteran) gives K_MIN (10)', () => {
        expect(kFactor(1)).toBeCloseTo(10, 1);
    });

    it('confidence=0.5 gives midpoint K (~25)', () => {
        expect(kFactor(0.5)).toBeCloseTo(25, 1);
    });

    it('clamps confidence below 0 to 0', () => {
        expect(kFactor(-0.5)).toBe(kFactor(0));
    });

    it('clamps confidence above 1 to 1', () => {
        expect(kFactor(1.5)).toBe(kFactor(1));
    });
});

// ---------------------------------------------------------------------------
// marginMultiplier
// ---------------------------------------------------------------------------
describe('marginMultiplier', () => {
    it('1-point margin gives multiplier ≈ 1.0 (minimal boost)', () => {
        expect(marginMultiplier(13, 12)).toBeCloseTo(1.0, 0);
    });

    it('always ≥ 1', () => {
        for (let margin = 0; margin <= 20; margin++) {
            expect(marginMultiplier(margin + 10, 10)).toBeGreaterThanOrEqual(1.0);
        }
    });

    it('dominant win (20 margin) gives multiplier > 1.3', () => {
        expect(marginMultiplier(24, 0)).toBeGreaterThan(1.3);
    });

    it('larger margin always gives larger multiplier', () => {
        const m1 = marginMultiplier(15, 9);  // margin 6
        const m2 = marginMultiplier(20, 4);  // margin 16
        expect(m2).toBeGreaterThan(m1);
    });
});

// ---------------------------------------------------------------------------
// updateConfidence
// ---------------------------------------------------------------------------
describe('updateConfidence', () => {
    it('increases confidence after each game', () => {
        expect(updateConfidence(0)).toBeGreaterThan(0);
        expect(updateConfidence(0.5)).toBeGreaterThan(0.5);
    });

    it('never exceeds 1.0', () => {
        expect(updateConfidence(0.99)).toBeLessThanOrEqual(1.0);
        expect(updateConfidence(1.0)).toBe(1.0);
    });

    it('reaches full confidence after ~30 games', () => {
        let c = 0;
        for (let i = 0; i < 30; i++) c = updateConfidence(c);
        expect(c).toBeCloseTo(1.0, 1);
    });
});

// ---------------------------------------------------------------------------
// applyInactivityDecay
// ---------------------------------------------------------------------------
describe('applyInactivityDecay', () => {
    it('no decay for 0 months', () => {
        expect(applyInactivityDecay(0.8, 0)).toBeCloseTo(0.8, 5);
    });

    it('25% decay after 1 month', () => {
        expect(applyInactivityDecay(1.0, 1)).toBeCloseTo(0.75, 2);
    });

    it('compound decay: more months = less confidence', () => {
        const c1 = applyInactivityDecay(1.0, 1);
        const c3 = applyInactivityDecay(1.0, 3);
        const c6 = applyInactivityDecay(1.0, 6);
        expect(c3).toBeLessThan(c1);
        expect(c6).toBeLessThan(c3);
    });

    it('never goes below 0', () => {
        expect(applyInactivityDecay(0.1, 24)).toBeGreaterThanOrEqual(0);
    });
});

// ---------------------------------------------------------------------------
// calculateRatingChange
// ---------------------------------------------------------------------------
describe('calculateRatingChange', () => {
    it('winner gains rating, loser loses rating', () => {
        const winner = calculateRatingChange({
            playerRating: 1000, opponentRating: 1000,
            playerConfidence: 0.5,
            playerScore: 20, opponentScore: 4
        });
        const loser = calculateRatingChange({
            playerRating: 1000, opponentRating: 1000,
            playerConfidence: 0.5,
            playerScore: 4, opponentScore: 20
        });
        expect(winner.delta).toBeGreaterThan(0);
        expect(loser.delta).toBeLessThan(0);
        expect(winner.newRating).toBeGreaterThan(1000);
        expect(loser.newRating).toBeLessThan(1000);
    });

    it('upset (lower rated beats higher) gains more than expected win', () => {
        // Lower-rated player wins against a much stronger opponent
        const upset = calculateRatingChange({
            playerRating: 800, opponentRating: 1200,
            playerConfidence: 0.5,
            playerScore: 20, opponentScore: 4
        });
        // Higher-rated beats lower-rated (expected)
        const expected = calculateRatingChange({
            playerRating: 1200, opponentRating: 800,
            playerConfidence: 0.5,
            playerScore: 20, opponentScore: 4
        });
        expect(upset.delta).toBeGreaterThan(expected.delta);
    });

    it('draw gives tiny changes near 0 for evenly matched players', () => {
        const draw = calculateRatingChange({
            playerRating: 1000, opponentRating: 1000,
            playerConfidence: 0.5,
            playerScore: 12, opponentScore: 12
        });
        expect(Math.abs(draw.delta)).toBeLessThanOrEqual(2);
    });

    it('never exceeds ±40 points change', () => {
        const extreme = calculateRatingChange({
            playerRating: 2000, opponentRating: 100,
            playerConfidence: 0, // new player, K=40
            playerScore: 0, opponentScore: 24 // huge upset for opponent
        });
        expect(Math.abs(extreme.delta)).toBeLessThanOrEqual(40);
    });

    it('never goes below MIN_RATING', () => {
        const nearFloor = calculateRatingChange({
            playerRating: 105, opponentRating: 3000,
            playerConfidence: 1.0,
            playerScore: 0, opponentScore: 24
        });
        expect(nearFloor.newRating).toBeGreaterThanOrEqual(MIN_RATING);
    });

    it('never exceeds MAX_RATING', () => {
        const nearCeiling = calculateRatingChange({
            playerRating: 2995, opponentRating: 100,
            playerConfidence: 0,
            playerScore: 24, opponentScore: 0
        });
        expect(nearCeiling.newRating).toBeLessThanOrEqual(MAX_RATING);
    });

    it('confidence increases after the match', () => {
        const result = calculateRatingChange({
            playerRating: 1000, opponentRating: 1000,
            playerConfidence: 0.5,
            playerScore: 12, opponentScore: 12
        });
        expect(result.newConfidence).toBeGreaterThan(0.5);
    });
});

// ---------------------------------------------------------------------------
// processDoublesMatch
// ---------------------------------------------------------------------------
describe('processDoublesMatch', () => {
    it('returns rating changes for all 4 players', () => {
        const match = {
            team1: {
                score: 20,
                players: [
                    { uid: 'p1', rating: 1000, confidence: 0.5 },
                    { uid: 'p2', rating: 1000, confidence: 0.5 }
                ]
            },
            team2: {
                score: 4,
                players: [
                    { uid: 'p3', rating: 1000, confidence: 0.5 },
                    { uid: 'p4', rating: 1000, confidence: 0.5 }
                ]
            }
        };
        const results = processDoublesMatch(match);
        expect(results.length).toBe(4);
        expect(results.map(r => r.uid).sort()).toEqual(['p1', 'p2', 'p3', 'p4'].sort());
    });

    it('both winners gain rating, both losers lose rating', () => {
        const match = {
            team1: {
                score: 20,
                players: [
                    { uid: 'p1', rating: 1000, confidence: 0.5 },
                    { uid: 'p2', rating: 1000, confidence: 0.5 }
                ]
            },
            team2: {
                score: 4,
                players: [
                    { uid: 'p3', rating: 1000, confidence: 0.5 },
                    { uid: 'p4', rating: 1000, confidence: 0.5 }
                ]
            }
        };
        const results = processDoublesMatch(match);
        const winners = results.filter(r => r.uid === 'p1' || r.uid === 'p2');
        const losers  = results.filter(r => r.uid === 'p3' || r.uid === 'p4');
        winners.forEach(w => expect(w.delta).toBeGreaterThan(0));
        losers.forEach(l => expect(l.delta).toBeLessThan(0));
    });

    it('uses average team rating when calculating opponent strength', () => {
        // p2 is very strong. p3/p4 face the AVERAGE of p1+p2, not just p1.
        const match = {
            team1: {
                score: 20,
                players: [
                    { uid: 'p1', rating: 800,  confidence: 0.5 },
                    { uid: 'p2', rating: 1600, confidence: 0.5 }  // Avg = 1200
                ]
            },
            team2: {
                score: 4,
                players: [
                    { uid: 'p3', rating: 1000, confidence: 0.5 },
                    { uid: 'p4', rating: 1000, confidence: 0.5 }  // Avg = 1000
                ]
            }
        };
        const results = processDoublesMatch(match);
        // p3 and p4 lose to a team with avg 1200 — expected loss, small penalty
        const p3 = results.find(r => r.uid === 'p3');
        const p4 = results.find(r => r.uid === 'p4');
        // The loss should be relatively modest since opponent was stronger (expected)
        expect(Math.abs(p3.delta)).toBeLessThan(30);
        expect(Math.abs(p4.delta)).toBeLessThan(30);
    });

    it('symmetric: equal-rated teams sum to zero delta (net neutral)', () => {
        const match = {
            team1: { score: 20, players: [
                { uid: 'p1', rating: 1000, confidence: 0.8 },
                { uid: 'p2', rating: 1000, confidence: 0.8 }
            ]},
            team2: { score: 4, players: [
                { uid: 'p3', rating: 1000, confidence: 0.8 },
                { uid: 'p4', rating: 1000, confidence: 0.8 }
            ]}
        };
        const results = processDoublesMatch(match);
        const totalDelta = results.reduce((sum, r) => sum + r.delta, 0);
        // Net delta should be close to zero (what's gained by winners is lost by losers)
        expect(Math.abs(totalDelta)).toBeLessThanOrEqual(4); // small rounding tolerance
    });
});

// ---------------------------------------------------------------------------
// isSuspiciousChange
// ---------------------------------------------------------------------------
describe('isSuspiciousChange', () => {
    it('flags a >35 point single-match change', () => {
        expect(isSuspiciousChange({ before: 1000, after: 1040, gamesPlayed: 50 })).toBe(true);
        expect(isSuspiciousChange({ before: 1000, after: 960,  gamesPlayed: 50 })).toBe(true);
    });

    it('does not flag normal changes', () => {
        expect(isSuspiciousChange({ before: 1000, after: 1020, gamesPlayed: 20 })).toBe(false);
    });

    it('does not flag new players even with large swings (they are expected to be volatile)', () => {
        expect(isSuspiciousChange({ before: 1000, after: 1038, gamesPlayed: 3 })).toBe(false);
    });

    it('flags crossing a milestone by >50 points', () => {
        expect(isSuspiciousChange({ before: 1010, after: 940, gamesPlayed: 30 })).toBe(true);  // crosses 1000 by 60
    });
});

// ---------------------------------------------------------------------------
// monthsSince
// ---------------------------------------------------------------------------
describe('monthsSince', () => {
    it('returns ~0 for a very recent timestamp', () => {
        const now = new Date().toISOString();
        expect(monthsSince(now)).toBeCloseTo(0, 1);
    });

    it('returns ~1 for a timestamp 30 days ago', () => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        expect(monthsSince(thirtyDaysAgo)).toBeCloseTo(1, 1);
    });

    it('returns ~12 for a timestamp one year ago', () => {
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        expect(monthsSince(oneYearAgo)).toBeCloseTo(12, 0);
    });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('constants', () => {
    it('DEFAULT_RATING is 1000', () => {
        expect(DEFAULT_RATING).toBe(1000);
    });

    it('MIN_RATING < DEFAULT_RATING < MAX_RATING', () => {
        expect(MIN_RATING).toBeLessThan(DEFAULT_RATING);
        expect(DEFAULT_RATING).toBeLessThan(MAX_RATING);
    });
});
