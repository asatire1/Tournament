/**
 * americano-engine.test.js
 * Tests for AmericanoEngine — timeslot generation, standings calculation,
 * score retrieval, match counting.
 *
 * Fixtures data is mocked with hand-crafted data for deterministic tests.
 * This isolates engine logic from the large fixtures JSON files.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AmericanoEngine } from '../../src/core/engines/americano-engine.js';

// ---------------------------------------------------------------------------
// Minimal fixture data for a 6-player, 1-court Americano.
// 6 players → 15 possible 2v2 fixtures (C(6,2) * C(4,2) / 2 = 15... but
// Americano ensures each pair partners once, so actually 12 fixtures for 6 players).
// We use a small hand-crafted set that satisfies:
//   - each team has 2 players
//   - player numbers are 1-6
//   - no player appears in both teams of the same fixture
// ---------------------------------------------------------------------------
const MOCK_FIXTURES_6P = [
    { teams: [[1, 2], [3, 4]], rest: [5, 6] },
    { teams: [[1, 3], [5, 6]], rest: [2, 4] },
    { teams: [[2, 4], [5, 6]], rest: [1, 3] },
    { teams: [[1, 4], [2, 5]], rest: [3, 6] },
    { teams: [[3, 5], [4, 6]], rest: [1, 2] },
    { teams: [[1, 6], [3, 5]], rest: [2, 4] }
];

// 8-player, 2-court set — pairs of fixtures that don't share players
const MOCK_FIXTURES_8P = [
    { teams: [[1, 2], [3, 4]], rest: [5, 6, 7, 8] },
    { teams: [[5, 6], [7, 8]], rest: [1, 2, 3, 4] },
    { teams: [[1, 3], [5, 7]], rest: [2, 4, 6, 8] },
    { teams: [[2, 4], [6, 8]], rest: [1, 3, 5, 7] },
    { teams: [[1, 5], [2, 6]], rest: [3, 4, 7, 8] },
    { teams: [[3, 7], [4, 8]], rest: [1, 2, 5, 6] }
];

const MOCK_FIXTURES = {
    6: MOCK_FIXTURES_6P,
    8: { 2: MOCK_FIXTURES_8P }   // 8 players, 2 courts (nested format)
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEngine(fixturesData = MOCK_FIXTURES) {
    const engine = new AmericanoEngine({ pointsPerMatch: 24, fixedPoints: true });
    engine.setFixturesData(fixturesData);
    return engine;
}

// Build a scores object where ALL 6 fixtures have been played
// Player 1 dominates: all their matches score 20-4 for their team.
function buildDominantScores() {
    return {
        f_0: { team1: 20, team2: 4 },  // P1+P2 beat P3+P4
        f_1: { team1: 20, team2: 4 },  // P1+P3 beat P5+P6
        f_2: { team1: 4,  team2: 20 }, // P2+P4 lost to P5+P6
        f_3: { team1: 20, team2: 4 },  // P1+P4 beat P2+P5
        f_4: { team1: 4,  team2: 20 }, // P3+P5 lost to P4+P6
        f_5: { team1: 20, team2: 4 }   // P1+P6 beat P3+P5
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AmericanoEngine', () => {

    describe('isPlayerCountSupported', () => {
        it('accepts 5 to 24 players', () => {
            const e = makeEngine();
            for (let n = 5; n <= 24; n++) {
                expect(e.isPlayerCountSupported(n)).toBe(true);
            }
        });

        it('rejects counts outside 5-24', () => {
            const e = makeEngine();
            expect(e.isPlayerCountSupported(4)).toBe(false);
            expect(e.isPlayerCountSupported(25)).toBe(false);
            expect(e.isPlayerCountSupported(0)).toBe(false);
        });
    });

    describe('getMaxCourts', () => {
        it('returns 1 for 5 players', () => {
            expect(makeEngine().getMaxCourts(5)).toBe(1);
        });

        it('returns 6 for 24 players', () => {
            expect(makeEngine().getMaxCourts(24)).toBe(6);
        });
    });

    describe('generateTimeslots (6 players, 1 court)', () => {
        let engine;
        beforeEach(() => { engine = makeEngine(); });

        it('generates timeslots from mock fixtures', () => {
            const timeslots = engine.generateTimeslots(6, 1);
            expect(timeslots.length).toBeGreaterThan(0);
        });

        it('no player appears in multiple matches within the same timeslot', () => {
            const timeslots = engine.generateTimeslots(6, 1);
            timeslots.forEach((slot, slotIdx) => {
                const playersInSlot = new Set();
                slot.matches.forEach(match => {
                    const allPlayers = [...match.teams[0], ...match.teams[1]];
                    allPlayers.forEach(p => {
                        expect(
                            playersInSlot.has(p),
                            `Player ${p} appears twice in timeslot ${slotIdx}`
                        ).toBe(false);
                        playersInSlot.add(p);
                    });
                });
            });
        });

        it('all fixtures appear exactly once across all timeslots', () => {
            const timeslots = engine.generateTimeslots(6, 1);
            const seenIndices = new Set();
            timeslots.forEach(slot => {
                slot.matches.forEach(m => {
                    expect(seenIndices.has(m.fixtureIndex)).toBe(false); // no duplicates
                    seenIndices.add(m.fixtureIndex);
                });
            });
            expect(seenIndices.size).toBe(MOCK_FIXTURES_6P.length);
        });

        it('resting array contains players not in any match of that timeslot', () => {
            const timeslots = engine.generateTimeslots(6, 1);
            timeslots.forEach(slot => {
                const playing = new Set();
                slot.matches.forEach(m => {
                    [...m.teams[0], ...m.teams[1]].forEach(p => playing.add(p));
                });
                slot.resting.forEach(r => {
                    expect(playing.has(r)).toBe(false);
                });
            });
        });
    });

    describe('generateTimeslots (8 players, 2 courts)', () => {
        it('schedules 2 matches per timeslot', () => {
            const engine = makeEngine();
            const timeslots = engine.generateTimeslots(8, 2);
            timeslots.forEach(slot => {
                expect(slot.matches.length).toBe(2);
            });
        });
    });

    describe('calculateStandings', () => {
        let engine;
        const playerNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];

        beforeEach(() => { engine = makeEngine(); });

        it('returns one entry per player', () => {
            const standings = engine.calculateStandings(playerNames, {}, 6, 1);
            expect(standings.length).toBe(6);
        });

        it('all players have 0 stats when no scores submitted', () => {
            const standings = engine.calculateStandings(playerNames, {}, 6, 1);
            standings.forEach(s => {
                expect(s.gamesPlayed).toBe(0);
                expect(s.totalScore).toBe(0);
            });
        });

        it('correctly accumulates scores for each player', () => {
            const scores = {
                f_0: { team1: 20, team2: 4 }  // Alice+Bob beat Carol+Dave (fixture 0)
            };
            const standings = engine.calculateStandings(playerNames, scores, 6, 1);
            const alice = standings.find(s => s.name === 'Alice');
            const carol = standings.find(s => s.name === 'Carol');

            expect(alice.gamesPlayed).toBe(1);
            expect(alice.pointsFor).toBe(20);
            expect(alice.pointsAgainst).toBe(4);
            expect(alice.wins).toBe(1);

            expect(carol.gamesPlayed).toBe(1);
            expect(carol.pointsFor).toBe(4);
            expect(carol.pointsAgainst).toBe(20);
            expect(carol.wins).toBe(0);
            expect(carol.losses).toBe(1);
        });

        it('Player 1 (Alice) ranks first when they dominate all matches', () => {
            const scores = buildDominantScores();
            const standings = engine.calculateStandings(playerNames, scores, 6, 1);
            expect(standings[0].name).toBe('Alice');
        });

        it('standings are sorted with highest avgScore first', () => {
            // AmericanoEngine sorts by avgScore (not totalScore), which is fair when
            // players have played different numbers of games.
            const scores = buildDominantScores();
            const standings = engine.calculateStandings(playerNames, scores, 6, 1);
            for (let i = 0; i < standings.length - 1; i++) {
                expect(standings[i].avgScore).toBeGreaterThanOrEqual(standings[i + 1].avgScore);
            }
        });

        it('ignores scores with Firebase sentinel value -1', () => {
            const scores = { f_0: { team1: -1, team2: -1 } };
            const standings = engine.calculateStandings(playerNames, scores, 6, 1);
            standings.forEach(s => expect(s.gamesPlayed).toBe(0));
        });
    });

    describe('getScoreByFixture', () => {
        let engine;
        beforeEach(() => { engine = makeEngine(); });

        it('returns null/null for a missing fixture', () => {
            const result = engine.getScoreByFixture({}, 0);
            expect(result).toEqual({ team1: null, team2: null });
        });

        it('returns the score for a played fixture', () => {
            const scores = { f_3: { team1: 18, team2: 6 } };
            expect(engine.getScoreByFixture(scores, 3)).toEqual({ team1: 18, team2: 6 });
        });

        it('converts -1 to null', () => {
            const scores = { f_0: { team1: -1, team2: -1 } };
            expect(engine.getScoreByFixture(scores, 0)).toEqual({ team1: null, team2: null });
        });
    });

    describe('countCompletedMatches', () => {
        let engine;
        beforeEach(() => { engine = makeEngine(); });

        it('returns 0 when no scores submitted', () => {
            expect(engine.countCompletedMatches({}, 6, 1)).toBe(0);
        });

        it('returns correct count for partial scores', () => {
            const scores = {
                f_0: { team1: 20, team2: 4 },
                f_2: { team1: 15, team2: 9 }
            };
            expect(engine.countCompletedMatches(scores, 6, 1)).toBe(2);
        });

        it('returns total fixtures when all scores entered', () => {
            const scores = buildDominantScores();
            expect(engine.countCompletedMatches(scores, 6, 1)).toBe(MOCK_FIXTURES_6P.length);
        });

        it('does not count fixtures with -1 sentinel', () => {
            const scores = { f_0: { team1: -1, team2: -1 } };
            expect(engine.countCompletedMatches(scores, 6, 1)).toBe(0);
        });
    });
});
