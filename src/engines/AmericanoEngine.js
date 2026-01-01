/**
 * AmericanoEngine.js - Americano Tournament Engine
 * Rotating partners format where everyone plays with everyone
 * 
 * Phase 3: Shared Engines Extraction
 * 
 * @module engines/AmericanoEngine
 */

/**
 * Americano Engine
 * Handles Americano-specific fixture generation and standings
 */
class AmericanoEngine extends BaseEngine {
    /**
     * Configuration for Americano format
     */
    static CONFIG = {
        MIN_PLAYERS: 5,
        MAX_PLAYERS: 24,
        MIN_COURTS: 1,
        MAX_COURTS: 6,
        DEFAULT_PLAYERS: 6,
        DEFAULT_COURTS: 1,
        DEFAULT_TOTAL_POINTS: 16,
        DEFAULT_FIXED_POINTS: true,
        POINTS_OPTIONS: [16, 21, 24, 32]
    };
    
    /**
     * Validate player count for Americano format
     * 
     * @param {number} count 
     * @returns {boolean}
     */
    static validatePlayerCount(count) {
        return count >= this.CONFIG.MIN_PLAYERS && 
               count <= this.CONFIG.MAX_PLAYERS;
    }
    
    /**
     * Calculate optimal court count for player count
     * 
     * @param {number} playerCount 
     * @returns {number}
     */
    static getOptimalCourtCount(playerCount) {
        return Math.min(
            Math.floor(playerCount / 4),
            this.CONFIG.MAX_COURTS
        );
    }
    
    /**
     * Group fixtures into timeslots for multi-court play
     * Each timeslot contains matches where no player appears twice
     * 
     * @param {Object[]} fixtures - All fixtures for the tournament
     * @param {number} courtCount - Number of available courts
     * @returns {Object[]} Array of timeslots, each with matches array
     */
    static groupFixturesIntoTimeslots(fixtures, courtCount) {
        const timeslots = [];
        const usedFixtureIndices = new Set();
        const playerCount = this.getPlayerCountFromFixtures(fixtures);
        
        // Keep grouping fixtures into timeslots until all are used
        while (usedFixtureIndices.size < fixtures.length) {
            const timeslot = {
                matches: [],
                resting: new Set(Array.from({ length: playerCount }, (_, i) => i + 1)),
                index: timeslots.length
            };
            
            // Track which players are already in this timeslot
            const playersInTimeslot = new Set();
            
            // Find compatible fixtures for this timeslot
            for (let i = 0; i < fixtures.length && timeslot.matches.length < courtCount; i++) {
                if (usedFixtureIndices.has(i)) continue;
                
                const fixture = fixtures[i];
                const playersInMatch = this.getPlayersFromFixture(fixture);
                
                // Check if any player is already playing in this timeslot
                const hasConflict = playersInMatch.some(p => playersInTimeslot.has(p));
                
                if (!hasConflict) {
                    // Add this fixture to the timeslot
                    timeslot.matches.push({
                        teams: fixture.teams,
                        rest: fixture.rest,
                        fixtureIndex: i
                    });
                    usedFixtureIndices.add(i);
                    
                    // Mark these players as playing
                    playersInMatch.forEach(p => {
                        playersInTimeslot.add(p);
                        timeslot.resting.delete(p);
                    });
                }
            }
            
            // Convert resting set to sorted array
            timeslot.resting = Array.from(timeslot.resting).sort((a, b) => a - b);
            timeslots.push(timeslot);
        }
        
        return timeslots;
    }
    
    /**
     * Get all players from a fixture
     * 
     * @param {Object} fixture 
     * @returns {number[]}
     */
    static getPlayersFromFixture(fixture) {
        if (fixture.teams) {
            return [...fixture.teams[0], ...fixture.teams[1]];
        }
        return [];
    }
    
    /**
     * Infer player count from fixtures
     * 
     * @param {Object[]} fixtures 
     * @returns {number}
     */
    static getPlayerCountFromFixtures(fixtures) {
        let maxPlayer = 0;
        fixtures.forEach(fixture => {
            const players = this.getPlayersFromFixture(fixture);
            players.forEach(p => {
                if (p > maxPlayer) maxPlayer = p;
            });
        });
        return maxPlayer;
    }
    
    /**
     * Calculate Americano standings
     * Uses average score as primary metric (fairest when game counts differ)
     * 
     * @param {Object} params
     * @param {string[]} params.playerNames
     * @param {Object[]} params.fixtures - All fixtures
     * @param {Object} params.scores - Scores keyed by fixture index
     * @returns {Object[]} Sorted standings
     */
    static calculateStandings({ playerNames, fixtures, scores }) {
        // Build matches array from fixtures
        const matches = fixtures.map((fixture, index) => ({
            ...fixture,
            fixtureIndex: index
        }));
        
        // Use base calculation with fixture index key
        const standings = BaseEngine.calculateStandings({
            playerNames,
            matches,
            scores,
            getMatchKey: (match) => `f_${match.fixtureIndex}`
        });
        
        // Sort using average score (Americano-specific)
        return this.sortStandings(standings, 'avgScore');
    }
    
    /**
     * Get tournament info for a player count
     * 
     * @param {number} playerCount 
     * @param {Object[]} fixtures - Fixtures for this count
     * @returns {Object}
     */
    static getTournamentInfo(playerCount, fixtures) {
        const gamesPerPlayer = {};
        
        fixtures.forEach(fixture => {
            const players = this.getPlayersFromFixture(fixture);
            players.forEach(p => {
                gamesPerPlayer[p] = (gamesPerPlayer[p] || 0) + 1;
            });
        });
        
        const counts = Object.values(gamesPerPlayer);
        
        return {
            playerCount,
            totalMatches: fixtures.length,
            gamesPerPlayerMin: Math.min(...counts),
            gamesPerPlayerMax: Math.max(...counts),
            courts: Math.floor(playerCount / 4)
        };
    }
    
    /**
     * Calculate score with fixed points complement
     * 
     * @param {number} score - One team's score
     * @param {number} totalPoints - Total points per match
     * @param {boolean} fixedPoints - Whether to use fixed points mode
     * @returns {number|null}
     */
    static calculateOtherScore(score, totalPoints, fixedPoints) {
        if (!fixedPoints || score === null || score === undefined) {
            return null;
        }
        return BaseEngine.calculateComplementScore(score, totalPoints);
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AmericanoEngine };
}

if (typeof window !== 'undefined') {
    window.AmericanoEngine = AmericanoEngine;
}
