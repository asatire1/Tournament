/**
 * base-engine.test.js
 * Tests for BaseTournamentEngine — score validation, standings sorting, tiebreakers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseTournamentEngine } from '../../src/core/engines/base-engine.js';

describe('BaseTournamentEngine', () => {

    describe('constructor', () => {
        it('uses default config values', () => {
            const engine = new BaseTournamentEngine();
            expect(engine.pointsPerMatch).toBe(24);
            expect(engine.fixedPoints).toBe(true);
        });

        it('accepts custom config', () => {
            const engine = new BaseTournamentEngine({ pointsPerMatch: 32, fixedPoints: false });
            expect(engine.pointsPerMatch).toBe(32);
            expect(engine.fixedPoints).toBe(false);
        });
    });

    describe('validateScore', () => {
        let engine;
        beforeEach(() => { engine = new BaseTournamentEngine({ pointsPerMatch: 24, fixedPoints: true }); });

        it('accepts null/null (unplayed match)', () => {
            expect(engine.validateScore(null, null)).toEqual({ valid: true });
        });

        it('rejects when only one score is null', () => {
            const r1 = engine.validateScore(10, null);
            const r2 = engine.validateScore(null, 10);
            expect(r1.valid).toBe(false);
            expect(r2.valid).toBe(false);
        });

        it('rejects non-integer scores', () => {
            expect(engine.validateScore(10.5, 13.5)).toMatchObject({ valid: false });
        });

        it('rejects negative scores', () => {
            expect(engine.validateScore(-1, 25)).toMatchObject({ valid: false });
        });

        it('rejects scores that do not sum to pointsPerMatch (fixed mode)', () => {
            expect(engine.validateScore(10, 10)).toMatchObject({ valid: false });
            expect(engine.validateScore(0, 23)).toMatchObject({ valid: false });
        });

        it('accepts scores that sum exactly to pointsPerMatch', () => {
            expect(engine.validateScore(12, 12)).toEqual({ valid: true });
            expect(engine.validateScore(0, 24)).toEqual({ valid: true });
            expect(engine.validateScore(24, 0)).toEqual({ valid: true });
        });

        it('accepts any non-negative scores when fixedPoints is false', () => {
            const freeEngine = new BaseTournamentEngine({ fixedPoints: false });
            expect(freeEngine.validateScore(11, 11)).toEqual({ valid: true });
            expect(freeEngine.validateScore(0, 0)).toEqual({ valid: true });
            expect(freeEngine.validateScore(100, 0)).toEqual({ valid: true });
        });
    });

    describe('normalizeScore', () => {
        let engine;
        beforeEach(() => { engine = new BaseTournamentEngine(); });

        it('returns null for -1 (Firebase sentinel for "not set")', () => {
            expect(engine.normalizeScore(-1)).toBeNull();
        });

        it('returns null for null', () => {
            expect(engine.normalizeScore(null)).toBeNull();
        });

        it('returns null for undefined', () => {
            expect(engine.normalizeScore(undefined)).toBeNull();
        });

        it('returns the score for valid non-negative numbers', () => {
            expect(engine.normalizeScore(0)).toBe(0);
            expect(engine.normalizeScore(12)).toBe(12);
            expect(engine.normalizeScore(24)).toBe(24);
        });
    });

    describe('createEmptyStats', () => {
        it('returns a zeroed stats object', () => {
            const engine = new BaseTournamentEngine();
            const stats = engine.createEmptyStats();
            expect(stats.totalScore).toBe(0);
            expect(stats.gamesPlayed).toBe(0);
            expect(stats.wins).toBe(0);
            expect(stats.losses).toBe(0);
            expect(stats.draws).toBe(0);
            expect(stats.pointsFor).toBe(0);
            expect(stats.pointsAgainst).toBe(0);
        });
    });

    describe('sortStandings', () => {
        let engine;
        beforeEach(() => { engine = new BaseTournamentEngine(); });

        it('sorts by totalScore descending', () => {
            const standings = [
                { name: 'B', totalScore: 30, pointsFor: 30, pointsAgainst: 10, wins: 2 },
                { name: 'A', totalScore: 50, pointsFor: 50, pointsAgainst: 10, wins: 3 },
                { name: 'C', totalScore: 20, pointsFor: 20, pointsAgainst: 10, wins: 1 }
            ];
            const sorted = engine.sortStandings(standings);
            expect(sorted[0].name).toBe('A');
            expect(sorted[1].name).toBe('B');
            expect(sorted[2].name).toBe('C');
        });

        it('breaks ties by avgPointsDiff when avgScore is equal', () => {
            // Both players have same avgScore=15, but B has a much better avgPointsDiff
            const standings = [
                { name: 'A', totalScore: 30, avgScore: 15, avgPointsDiff: 5,  pointsFor: 30, pointsAgainst: 20, wins: 2, winRate: 100 },
                { name: 'B', totalScore: 30, avgScore: 15, avgPointsDiff: 12, pointsFor: 30, pointsAgainst: 6,  wins: 2, winRate: 100 }
            ];
            const sorted = engine.sortStandings(standings);
            expect(sorted[0].name).toBe('B'); // better avgPointsDiff
        });

        it('breaks further ties by wins', () => {
            const standings = [
                { name: 'A', totalScore: 30, pointsFor: 30, pointsAgainst: 10, wins: 1 },
                { name: 'B', totalScore: 30, pointsFor: 30, pointsAgainst: 10, wins: 3 }
            ];
            const sorted = engine.sortStandings(standings);
            expect(sorted[0].name).toBe('B');
        });
    });

    describe('calculateDerivedStats', () => {
        it('calculates pointsDiff and avgScore', () => {
            const engine = new BaseTournamentEngine();
            const raw = {
                totalScore: 60,
                gamesPlayed: 5,
                wins: 3,
                losses: 1,
                draws: 1,
                pointsFor: 60,
                pointsAgainst: 40
            };
            const derived = engine.calculateDerivedStats(raw);
            expect(derived.pointsDiff).toBe(20);
            expect(derived.avgScore).toBeCloseTo(12, 1); // 60 / 5
        });

        it('handles zero gamesPlayed without dividing by zero', () => {
            const engine = new BaseTournamentEngine();
            const raw = { totalScore: 0, gamesPlayed: 0, wins: 0, losses: 0, draws: 0, pointsFor: 0, pointsAgainst: 0 };
            const derived = engine.calculateDerivedStats(raw);
            expect(derived.avgScore).toBe(0);
        });
    });
});
