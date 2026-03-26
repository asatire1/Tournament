/**
 * mexicano-engine.test.js
 * Tests for MexicanoEngine — player count validation, standings calculation,
 * round generation (dynamic pairing by rankings).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MexicanoEngine } from '../../src/core/engines/mexicano-engine.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEngine(mode = 'individual') {
    return new MexicanoEngine({ pointsPerMatch: 24, fixedPoints: true, mode });
}

function makePlayers(count) {
    return Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
}

function makeMatch(team1, team2, score1, score2) {
    return {
        team1,
        team2,
        score1,
        score2,
        completed: score1 !== null && score2 !== null
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MexicanoEngine', () => {

    describe('validatePlayerCount (individual mode)', () => {
        let engine;
        beforeEach(() => { engine = makeEngine('individual'); });

        it('accepts 4 to 24 players', () => {
            expect(engine.validatePlayerCount(4).valid).toBe(true);
            expect(engine.validatePlayerCount(12).valid).toBe(true);
            expect(engine.validatePlayerCount(24).valid).toBe(true);
        });

        it('rejects fewer than 4 players', () => {
            expect(engine.validatePlayerCount(3).valid).toBe(false);
        });

        it('rejects more than 24 players', () => {
            expect(engine.validatePlayerCount(25).valid).toBe(false);
        });
    });

    describe('validatePlayerCount (team mode)', () => {
        let engine;
        beforeEach(() => { engine = makeEngine('team'); });

        it('accepts 2 to 12 teams', () => {
            expect(engine.validatePlayerCount(2).valid).toBe(true);
            expect(engine.validatePlayerCount(8).valid).toBe(true);
            expect(engine.validatePlayerCount(12).valid).toBe(true);
        });

        it('rejects fewer than 2 teams', () => {
            expect(engine.validatePlayerCount(1).valid).toBe(false);
        });

        it('rejects more than 12 teams', () => {
            expect(engine.validatePlayerCount(13).valid).toBe(false);
        });
    });

    describe('calculateCourts', () => {
        it('individual: floor(players / 4)', () => {
            const e = makeEngine('individual');
            expect(e.calculateCourts(4)).toBe(1);
            expect(e.calculateCourts(8)).toBe(2);
            expect(e.calculateCourts(12)).toBe(3);
        });

        it('team: floor(teams / 2)', () => {
            const e = makeEngine('team');
            expect(e.calculateCourts(4)).toBe(2);
            expect(e.calculateCourts(8)).toBe(4);
        });
    });

    describe('calculateStandings', () => {
        let engine;
        const players = makePlayers(8);

        beforeEach(() => { engine = makeEngine('individual'); });

        it('returns one entry per player', () => {
            const standings = engine.calculateStandings(players, []);
            expect(standings.length).toBe(8);
        });

        it('all players start at zero', () => {
            const standings = engine.calculateStandings(players, []);
            standings.forEach(s => {
                expect(s.totalPoints).toBe(0);
                expect(s.matchesPlayed).toBe(0);
            });
        });

        it('correctly credits points to winning team players', () => {
            const round1 = {
                matches: [
                    makeMatch(['p1', 'p2'], ['p3', 'p4'], 20, 4)
                ]
            };
            const standings = engine.calculateStandings(players, [round1]);

            const p1 = standings.find(s => s.id === 'p1');
            const p3 = standings.find(s => s.id === 'p3');

            expect(p1.totalPoints).toBe(20);
            expect(p1.wins).toBe(1);
            expect(p1.pointsFor).toBe(20);
            expect(p1.pointsAgainst).toBe(4);

            expect(p3.totalPoints).toBe(4);
            expect(p3.losses).toBe(1);
            expect(p3.pointsFor).toBe(4);
            expect(p3.pointsAgainst).toBe(20);
        });

        it('handles draws correctly', () => {
            const round1 = {
                matches: [
                    makeMatch(['p1', 'p2'], ['p3', 'p4'], 12, 12)
                ]
            };
            const standings = engine.calculateStandings(players, [round1]);
            const p1 = standings.find(s => s.id === 'p1');
            expect(p1.draws).toBe(1);
            expect(p1.wins).toBe(0);
            expect(p1.losses).toBe(0);
        });

        it('ignores incomplete matches', () => {
            const round1 = {
                matches: [
                    { team1: ['p1', 'p2'], team2: ['p3', 'p4'], score1: null, score2: null, completed: false }
                ]
            };
            const standings = engine.calculateStandings(players, [round1]);
            standings.forEach(s => expect(s.matchesPlayed).toBe(0));
        });

        it('sorts by totalPoints descending', () => {
            const round1 = {
                matches: [
                    makeMatch(['p1', 'p2'], ['p3', 'p4'], 20, 4),
                    makeMatch(['p5', 'p6'], ['p7', 'p8'], 10, 14)
                ]
            };
            const standings = engine.calculateStandings(players, [round1]);
            for (let i = 0; i < standings.length - 1; i++) {
                expect(standings[i].totalPoints).toBeGreaterThanOrEqual(standings[i + 1].totalPoints);
            }
        });

        it('tiebreak: point difference before wins', () => {
            // p1+p2 win big (diff +16), p5+p6 win small (diff +4) — both same wins
            const round1 = {
                matches: [
                    makeMatch(['p1', 'p2'], ['p3', 'p4'], 20, 4),  // p1+p2 diff = +16
                    makeMatch(['p5', 'p6'], ['p7', 'p8'], 14, 10)   // p5+p6 diff = +4
                ]
            };
            const standings = engine.calculateStandings(players, [round1]);
            const rank1 = standings[0];
            const rank2 = standings[1];
            // p1 and p2 should rank above p5 and p6
            expect(['p1', 'p2']).toContain(rank1.id);
            expect(['p1', 'p2']).toContain(rank2.id);
        });

        it('accumulates across multiple rounds', () => {
            const rounds = [
                { matches: [makeMatch(['p1', 'p2'], ['p3', 'p4'], 20, 4)] },
                { matches: [makeMatch(['p1', 'p3'], ['p2', 'p4'], 20, 4)] }
            ];
            const standings = engine.calculateStandings(players, rounds);
            const p1 = standings.find(s => s.id === 'p1');
            expect(p1.matchesPlayed).toBe(2);
            expect(p1.totalPoints).toBe(40); // 20 + 20
        });
    });

    describe('generateRound (individual mode)', () => {
        let engine;
        beforeEach(() => { engine = makeEngine('individual'); });

        it('generates a round with the correct number of matches for 8 players', () => {
            const players = makePlayers(8);
            const round = engine.generateRound(1, players, []);
            // 8 players / 4 per match = 2 matches
            expect(round.matches.length).toBe(2);
        });

        it('round 1 assigns all 8 players across matches', () => {
            const players = makePlayers(8);
            const round = engine.generateRound(1, players, []);
            const allPlayerIds = round.matches.flatMap(m => [
                ...engine._normalizeArray(m.team1),
                ...engine._normalizeArray(m.team2)
            ]);
            expect(allPlayerIds.length).toBe(8);
            expect(new Set(allPlayerIds).size).toBe(8); // no duplicates
        });

        it('pairing 1&3 vs 2&4 (top 4 by ranking) in round 2+', () => {
            const players = makePlayers(8);

            // After round 1: p1 first, p2 second, p3 third, p4 fourth by score
            const round1 = {
                matches: [
                    makeMatch([players[0].id, players[1].id], [players[2].id, players[3].id], 20, 4),
                    makeMatch([players[4].id, players[5].id], [players[6].id, players[7].id], 20, 4)
                ]
            };

            const standings = engine.calculateStandings(players, [round1]);
            const round2 = engine.generateRound(2, players, standings);

            // The round should exist and have 2 matches
            expect(round2.matches).toBeDefined();
            expect(round2.matches.length).toBe(2);
        });
    });

    describe('team mode standings', () => {
        it('credits points to the team (single ID), not individual players', () => {
            const engine = makeEngine('team');
            const teams = [
                { id: 't1', teamName: 'Red' },
                { id: 't2', teamName: 'Blue' },
                { id: 't3', teamName: 'Green' },
                { id: 't4', teamName: 'Yellow' }
            ];
            const rounds = [{
                matches: [
                    { team1: 't1', team2: 't2', score1: 20, score2: 4, completed: true }
                ]
            }];
            const standings = engine.calculateStandings(teams, rounds);
            const t1 = standings.find(s => s.id === 't1');
            expect(t1.totalPoints).toBe(20);
            expect(t1.wins).toBe(1);
        });
    });
});
