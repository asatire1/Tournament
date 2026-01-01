/**
 * americano-engine.js - Americano Tournament Engine
 * 
 * Core logic for Americano-style padel tournaments where:
 * - Each player partners with every other player exactly once
 * - Pre-calculated optimal fixtures ensure fairness
 * - Multi-court support with automatic scheduling
 * 
 * This engine is shared between Quick Play and Competitions.
 * 
 * @version 2.0.0
 * @author UberPadel
 */

import { BaseTournamentEngine } from './base-engine.js';

/**
 * Tournament info for each player count
 * Defines fixtures count, max courts, and games per player
 */
const TOURNAMENT_INFO = {
    5:  { fixtures: 5,  maxCourts: 1, gamesPerPlayer: 4, gamesPerPlayerMin: 4, gamesPerPlayerMax: 4 },
    6:  { fixtures: 12, maxCourts: 1, gamesPerPlayer: 8, gamesPerPlayerMin: 8, gamesPerPlayerMax: 8 },
    7:  { fixtures: 15, maxCourts: 1, gamesPerPlayer: 8, gamesPerPlayerMin: 8, gamesPerPlayerMax: 9 },
    8:  { fixtures: 14, maxCourts: 2, gamesPerPlayer: 7, gamesPerPlayerMin: 7, gamesPerPlayerMax: 7 },
    9:  { fixtures: 18, maxCourts: 2, gamesPerPlayer: 8, gamesPerPlayerMin: 8, gamesPerPlayerMax: 8 },
    10: { fixtures: 30, maxCourts: 2, gamesPerPlayer: 12, gamesPerPlayerMin: 12, gamesPerPlayerMax: 12 },
    11: { fixtures: 32, maxCourts: 2, gamesPerPlayer: 11, gamesPerPlayerMin: 11, gamesPerPlayerMax: 12 },
    12: { maxCourts: 3, 1: { fixtures: 33, gamesPerPlayer: 11 }, 2: { fixtures: 38, gamesPerPlayer: 12 }, 3: { fixtures: 33, gamesPerPlayer: 11 } },
    13: { maxCourts: 3, 1: { fixtures: 39, gamesPerPlayer: 12 }, 2: { fixtures: 40, gamesPerPlayer: 12 }, 3: { fixtures: 42, gamesPerPlayer: 12 } },
    14: { maxCourts: 3, 1: { fixtures: 46, gamesPerPlayer: 13 }, 2: { fixtures: 48, gamesPerPlayer: 13 }, 3: { fixtures: 54, gamesPerPlayer: 15 } },
    15: { maxCourts: 3, 1: { fixtures: 54, gamesPerPlayer: 14 }, 2: { fixtures: 58, gamesPerPlayer: 15 }, 3: { fixtures: 57, gamesPerPlayer: 15 } },
    16: { maxCourts: 4, 1: { fixtures: 60, gamesPerPlayer: 15 }, 2: { fixtures: 66, gamesPerPlayer: 16 }, 3: { fixtures: 69, gamesPerPlayer: 17 }, 4: { fixtures: 60, gamesPerPlayer: 15 } },
    17: { maxCourts: 4, 1: { fixtures: 69, gamesPerPlayer: 16 }, 2: { fixtures: 74, gamesPerPlayer: 17 }, 3: { fixtures: 81, gamesPerPlayer: 19 }, 4: { fixtures: 88, gamesPerPlayer: 20 } },
    18: { maxCourts: 4, 1: { fixtures: 77, gamesPerPlayer: 17 }, 2: { fixtures: 92, gamesPerPlayer: 20 }, 3: { fixtures: 93, gamesPerPlayer: 20 }, 4: { fixtures: 92, gamesPerPlayer: 20 } },
    19: { maxCourts: 4, 1: { fixtures: 87, gamesPerPlayer: 18 }, 2: { fixtures: 102, gamesPerPlayer: 21 }, 3: { fixtures: 102, gamesPerPlayer: 21 }, 4: { fixtures: 96, gamesPerPlayer: 20 } },
    20: { maxCourts: 5, 1: { fixtures: 95, gamesPerPlayer: 19 }, 2: { fixtures: 95, gamesPerPlayer: 19 }, 3: { fixtures: 95, gamesPerPlayer: 19 }, 4: { fixtures: 95, gamesPerPlayer: 19 }, 5: { fixtures: 95, gamesPerPlayer: 19 } },
    21: { maxCourts: 5, 1: { fixtures: 105, gamesPerPlayer: 20 }, 2: { fixtures: 105, gamesPerPlayer: 20 }, 3: { fixtures: 105, gamesPerPlayer: 20 }, 4: { fixtures: 105, gamesPerPlayer: 20 }, 5: { fixtures: 105, gamesPerPlayer: 20 } },
    22: { maxCourts: 5, 1: { fixtures: 115, gamesPerPlayer: 21 }, 2: { fixtures: 115, gamesPerPlayer: 21 }, 3: { fixtures: 115, gamesPerPlayer: 21 }, 4: { fixtures: 115, gamesPerPlayer: 21 }, 5: { fixtures: 115, gamesPerPlayer: 21 } },
    23: { maxCourts: 5, 1: { fixtures: 126, gamesPerPlayer: 22 }, 2: { fixtures: 126, gamesPerPlayer: 22 }, 3: { fixtures: 126, gamesPerPlayer: 22 }, 4: { fixtures: 126, gamesPerPlayer: 22 }, 5: { fixtures: 126, gamesPerPlayer: 22 } },
    24: { maxCourts: 6, 1: { fixtures: 138, gamesPerPlayer: 23 }, 2: { fixtures: 138, gamesPerPlayer: 23 }, 3: { fixtures: 138, gamesPerPlayer: 23 }, 4: { fixtures: 138, gamesPerPlayer: 23 }, 5: { fixtures: 138, gamesPerPlayer: 23 }, 6: { fixtures: 138, gamesPerPlayer: 23 } }
};

/**
 * Americano Tournament Engine
 * Handles fixture generation, scheduling, and standings calculation
 */
export class AmericanoEngine extends BaseTournamentEngine {
    
    /**
     * Create Americano engine
     * @param {Object} config - Configuration options
     * @param {number} config.pointsPerMatch - Points per match (default: 24)
     * @param {boolean} config.fixedPoints - Whether points are fixed (default: true)
     * @param {Object} config.fixturesData - Pre-loaded fixtures data (required)
     */
    constructor(config = {}) {
        super(config);
        this.fixturesData = config.fixturesData || null;
    }
    
    /**
     * Set fixtures data (loaded externally due to size)
     * @param {Object} fixturesData - The FIXTURES object from fixtures file
     */
    setFixturesData(fixturesData) {
        this.fixturesData = fixturesData;
    }
    
    /**
     * Check if player count is supported
     * @param {number} playerCount - Number of players
     * @returns {boolean}
     */
    isPlayerCountSupported(playerCount) {
        return playerCount >= 5 && playerCount <= 24;
    }
    
    /**
     * Get maximum courts for player count
     * @param {number} playerCount - Number of players
     * @returns {number}
     */
    getMaxCourts(playerCount) {
        if (playerCount >= 12 && playerCount <= 24) {
            return TOURNAMENT_INFO[playerCount].maxCourts;
        }
        const info = TOURNAMENT_INFO[playerCount];
        return info ? info.maxCourts : 1;
    }
    
    /**
     * Get minimum courts (always 1)
     * @returns {number}
     */
    getMinCourts() {
        return 1;
    }
    
    /**
     * Get tournament info for configuration
     * @param {number} playerCount - Number of players
     * @param {number} courtCount - Number of courts (optional)
     * @returns {Object|null}
     */
    getTournamentInfo(playerCount, courtCount = null) {
        if (!this.isPlayerCountSupported(playerCount)) {
            return null;
        }
        
        if (playerCount >= 12 && playerCount <= 24) {
            const baseInfo = TOURNAMENT_INFO[playerCount];
            const courts = courtCount || baseInfo.maxCourts;
            const courtInfo = baseInfo[courts] || baseInfo[baseInfo.maxCourts];
            return { 
                ...courtInfo, 
                maxCourts: baseInfo.maxCourts,
                gamesPerPlayerMin: courtInfo.gamesPerPlayer,
                gamesPerPlayerMax: courtInfo.gamesPerPlayer
            };
        }
        
        return TOURNAMENT_INFO[playerCount] || null;
    }
    
    /**
     * Get fixtures for player/court configuration
     * @param {number} playerCount - Number of players
     * @param {number} courtCount - Number of courts (optional)
     * @returns {Array}
     */
    getFixtures(playerCount, courtCount = null) {
        if (!this.fixturesData) {
            console.error('AmericanoEngine: Fixtures data not loaded');
            return [];
        }
        
        if (playerCount >= 12 && playerCount <= 24) {
            const maxCourts = TOURNAMENT_INFO[playerCount].maxCourts;
            const courts = courtCount || maxCourts;
            return this.fixturesData[playerCount]?.[courts] || 
                   this.fixturesData[playerCount]?.[maxCourts] || [];
        }
        
        return this.fixturesData[playerCount] || [];
    }
    
    /**
     * Generate timeslots (rounds) from fixtures
     * Groups fixtures into rounds where no player appears twice
     * 
     * @param {number} playerCount - Number of players
     * @param {number} courtCount - Number of courts
     * @returns {Array} Array of timeslots
     */
    generateTimeslots(playerCount, courtCount) {
        const fixtures = this.getFixtures(playerCount, courtCount);
        if (!fixtures || fixtures.length === 0) {
            return [];
        }
        
        const timeslots = [];
        const usedFixtureIndices = new Set();
        
        while (usedFixtureIndices.size < fixtures.length) {
            const timeslot = {
                matches: [],
                resting: new Set(Array.from({ length: playerCount }, (_, i) => i + 1))
            };
            
            // Try to fill courts for this timeslot
            const playersInTimeslot = new Set();
            
            for (let i = 0; i < fixtures.length && timeslot.matches.length < courtCount; i++) {
                if (usedFixtureIndices.has(i)) continue;
                
                const fixture = fixtures[i];
                const playersInMatch = [...fixture.teams[0], ...fixture.teams[1]];
                
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
                    
                    // Mark players as playing
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
     * Calculate standings from scores
     * @param {Array} playerNames - Array of player names
     * @param {Object} scores - Scores object keyed by fixture index
     * @param {number} playerCount - Number of players
     * @param {number} courtCount - Number of courts
     * @returns {Array} Sorted standings array
     */
    calculateStandings(playerNames, scores, playerCount, courtCount) {
        const fixtures = this.getFixtures(playerCount, courtCount);
        
        // Initialize stats for each player
        const playerStats = Array(playerCount).fill(null).map(() => this.createEmptyStats());
        
        // Process each fixture
        fixtures.forEach((fixture, fixtureIndex) => {
            const scoreKey = `f_${fixtureIndex}`;
            const score = scores[scoreKey];
            
            if (!score) return;
            
            const score1 = this.normalizeScore(score.team1);
            const score2 = this.normalizeScore(score.team2);
            
            if (score1 === null || score2 === null) return;
            
            // Update Team 1 players
            fixture.teams[0].forEach(playerNum => {
                const idx = playerNum - 1;
                playerStats[idx].totalScore += score1;
                playerStats[idx].gamesPlayed++;
                playerStats[idx].pointsFor += score1;
                playerStats[idx].pointsAgainst += score2;
                
                if (score1 > score2) {
                    playerStats[idx].wins++;
                } else if (score1 < score2) {
                    playerStats[idx].losses++;
                } else {
                    playerStats[idx].draws++;
                }
            });
            
            // Update Team 2 players
            fixture.teams[1].forEach(playerNum => {
                const idx = playerNum - 1;
                playerStats[idx].totalScore += score2;
                playerStats[idx].gamesPlayed++;
                playerStats[idx].pointsFor += score2;
                playerStats[idx].pointsAgainst += score1;
                
                if (score2 > score1) {
                    playerStats[idx].wins++;
                } else if (score2 < score1) {
                    playerStats[idx].losses++;
                } else {
                    playerStats[idx].draws++;
                }
            });
        });
        
        // Build standings array with derived stats
        const standings = playerNames.map((name, index) => {
            const stats = this.calculateDerivedStats(playerStats[index]);
            return {
                name: name || `Player ${index + 1}`,
                playerNum: index + 1,
                ...stats
            };
        });
        
        // Sort and return
        return this.sortStandings(standings);
    }
    
    /**
     * Get score for a specific fixture
     * @param {Object} scores - Scores object
     * @param {number} fixtureIndex - Fixture index
     * @returns {Object} { team1: number|null, team2: number|null }
     */
    getScoreByFixture(scores, fixtureIndex) {
        const scoreKey = `f_${fixtureIndex}`;
        const score = scores[scoreKey];
        
        if (!score) {
            return { team1: null, team2: null };
        }
        
        return {
            team1: this.normalizeScore(score.team1),
            team2: this.normalizeScore(score.team2)
        };
    }
    
    /**
     * Count completed matches
     * @param {Object} scores - Scores object
     * @param {number} playerCount - Number of players
     * @param {number} courtCount - Number of courts
     * @returns {number}
     */
    countCompletedMatches(scores, playerCount, courtCount) {
        const fixtures = this.getFixtures(playerCount, courtCount);
        let count = 0;
        
        fixtures.forEach((_, fixtureIndex) => {
            const score = this.getScoreByFixture(scores, fixtureIndex);
            if (score.team1 !== null && score.team2 !== null) {
                count++;
            }
        });
        
        return count;
    }
    
    /**
     * Get total number of matches
     * @param {number} playerCount - Number of players
     * @param {number} courtCount - Number of courts
     * @returns {number}
     */
    getTotalMatches(playerCount, courtCount) {
        return this.getFixtures(playerCount, courtCount).length;
    }
    
    /**
     * Get total number of timeslots (rounds)
     * @param {number} playerCount - Number of players
     * @param {number} courtCount - Number of courts
     * @returns {number}
     */
    getTotalTimeslots(playerCount, courtCount) {
        return this.generateTimeslots(playerCount, courtCount).length;
    }
    
    /**
     * Calculate partnership matrix (who played with whom)
     * @param {number} playerCount - Number of players
     * @param {number} courtCount - Number of courts
     * @returns {Array} 2D array of partnership counts
     */
    getPartnershipMatrix(playerCount, courtCount) {
        const fixtures = this.getFixtures(playerCount, courtCount);
        const matrix = Array(playerCount).fill(null).map(() => 
            Array(playerCount).fill(0)
        );
        
        fixtures.forEach(fixture => {
            // Team 1 partners
            const [p1, p2] = fixture.teams[0];
            matrix[p1 - 1][p2 - 1]++;
            matrix[p2 - 1][p1 - 1]++;
            
            // Team 2 partners
            const [p3, p4] = fixture.teams[1];
            matrix[p3 - 1][p4 - 1]++;
            matrix[p4 - 1][p3 - 1]++;
        });
        
        return matrix;
    }
    
    /**
     * Validate tournament configuration
     * @param {number} playerCount - Number of players
     * @param {number} courtCount - Number of courts
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateConfiguration(playerCount, courtCount) {
        if (!this.isPlayerCountSupported(playerCount)) {
            return { 
                valid: false, 
                error: `Player count must be between 5 and 24 (got ${playerCount})` 
            };
        }
        
        const maxCourts = this.getMaxCourts(playerCount);
        if (courtCount < 1 || courtCount > maxCourts) {
            return { 
                valid: false, 
                error: `Court count must be between 1 and ${maxCourts} for ${playerCount} players` 
            };
        }
        
        return { valid: true };
    }
}

// Export singleton-style factory
export function createAmericanoEngine(config = {}) {
    return new AmericanoEngine(config);
}

// Export class and utilities
export { TOURNAMENT_INFO };
export default AmericanoEngine;
