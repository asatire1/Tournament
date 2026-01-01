/**
 * mix-engine.js - Mix Tournament Engine
 * 
 * Core logic for Mix-style padel tournaments where:
 * - Pre-defined fixtures for various player counts (20, 24, 28)
 * - Round-robin group stage with tournament points (Win=3, Draw=1)
 * - Optional knockout stage (Quarter, Semi, Final)
 * - Supports player swapping within rounds
 * 
 * This engine is shared between Quick Play and Competitions.
 * 
 * @version 2.0.0
 * @author UberPadel
 */

import { BaseTournamentEngine } from './base-engine.js';

/**
 * Tournament points configuration
 */
const POINTS = {
    WIN: 3,
    DRAW: 1,
    LOSS: 0
};

/**
 * Supported player counts and their configurations
 */
const PLAYER_CONFIGS = {
    20: { rounds: 11, maxRounds: 11 },
    24: { rounds: 13, maxRounds: 13 },
    28: { rounds: 15, maxRounds: 15 }
};

/**
 * Mix Tournament Engine
 * Handles pre-defined fixtures, scoring, and knockout stages
 */
export class MixTournamentEngine extends BaseTournamentEngine {
    
    /**
     * Create Mix Tournament engine
     * @param {Object} config - Configuration options
     * @param {number} config.fixtureMaxScore - Max score for group matches (default: 32)
     * @param {number} config.knockoutMaxScore - Max score for knockout matches (default: 24)
     * @param {number} config.semiMaxScore - Max score for semi-finals (default: 24)
     * @param {number} config.finalMaxScore - Max score for finals (default: 32)
     * @param {string} config.knockoutFormat - 'quarter', 'semi', or 'final' (default: 'quarter')
     */
    constructor(config = {}) {
        super(config);
        this.fixtureMaxScore = config.fixtureMaxScore || 32;
        this.knockoutMaxScore = config.knockoutMaxScore || 24;
        this.semiMaxScore = config.semiMaxScore || 24;
        this.finalMaxScore = config.finalMaxScore || 32;
        this.knockoutFormat = config.knockoutFormat || 'quarter';
        this.fixturesData = config.fixturesData || null;
    }
    
    /**
     * Set fixtures data (loaded externally)
     * @param {Object} fixturesData - The fixtures object for specific player count
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
        return PLAYER_CONFIGS.hasOwnProperty(playerCount);
    }
    
    /**
     * Get supported player counts
     * @returns {Array}
     */
    getSupportedPlayerCounts() {
        return Object.keys(PLAYER_CONFIGS).map(Number);
    }
    
    /**
     * Get configuration for player count
     * @param {number} playerCount - Number of players
     * @returns {Object|null}
     */
    getPlayerConfig(playerCount) {
        return PLAYER_CONFIGS[playerCount] || null;
    }
    
    /**
     * Get total rounds for player count
     * @param {number} playerCount - Number of players
     * @returns {number}
     */
    getTotalRounds(playerCount) {
        const config = this.getPlayerConfig(playerCount);
        return config ? config.rounds : 0;
    }
    
    /**
     * Get fixtures for a specific round
     * @param {number} round - Round number (1-based)
     * @returns {Array}
     */
    getFixturesForRound(round) {
        if (!this.fixturesData) return [];
        return this.fixturesData[round] || [];
    }
    
    /**
     * Calculate standings from match scores
     * @param {Array} playerNames - Array of player names
     * @param {Object} fixtures - Fixtures object keyed by round
     * @param {Object} matchScores - Scores object keyed by round-match
     * @param {number} totalPlayers - Total number of players
     * @param {number} totalRounds - Total number of rounds
     * @returns {Array} Sorted standings
     */
    calculateStandings(playerNames, fixtures, matchScores, totalPlayers, totalRounds) {
        const standings = [];
        
        for (let playerId = 1; playerId <= totalPlayers; playerId++) {
            let matches = 0, wins = 0, draws = 0, losses = 0;
            let pointsFor = 0, pointsAgainst = 0;
            let tournamentPoints = 0;
            const partners = new Set();
            
            for (let round = 1; round <= totalRounds; round++) {
                if (!fixtures[round]) continue;
                
                fixtures[round].forEach((match, matchIdx) => {
                    const allPlayers = [...match.team1, ...match.team2];
                    if (!allPlayers.includes(playerId)) return;
                    
                    const score = this._getMatchScore(matchScores, round, matchIdx);
                    if (score.team1Score === null || score.team2Score === null) return;
                    
                    matches++;
                    const isTeam1 = match.team1.includes(playerId);
                    const playerScore = isTeam1 ? score.team1Score : score.team2Score;
                    const opponentScore = isTeam1 ? score.team2Score : score.team1Score;
                    
                    pointsFor += playerScore;
                    pointsAgainst += opponentScore;
                    
                    // Track partner
                    const partner = isTeam1 
                        ? match.team1.find(p => p !== playerId) 
                        : match.team2.find(p => p !== playerId);
                    partners.add(partner);
                    
                    // Calculate tournament points
                    if (playerScore > opponentScore) { 
                        wins++; 
                        tournamentPoints += POINTS.WIN; 
                    } else if (playerScore === opponentScore) { 
                        draws++; 
                        tournamentPoints += POINTS.DRAW; 
                    } else { 
                        losses++; 
                    }
                });
            }
            
            standings.push({
                playerId, 
                name: playerNames[playerId - 1] || `Player ${playerId}`,
                matches, 
                wins, 
                draws, 
                losses, 
                pointsFor, 
                pointsAgainst,
                pointsDiff: pointsFor - pointsAgainst, 
                tournamentPoints,
                winRate: matches > 0 ? (wins / matches * 100) : 0,
                uniquePartners: partners.size
            });
        }
        
        // Sort standings
        standings.sort((a, b) => {
            // Primary: Tournament points
            if (b.tournamentPoints !== a.tournamentPoints) {
                return b.tournamentPoints - a.tournamentPoints;
            }
            // Secondary: Point difference
            if (b.pointsDiff !== a.pointsDiff) {
                return b.pointsDiff - a.pointsDiff;
            }
            // Tertiary: Points for
            return b.pointsFor - a.pointsFor;
        });
        
        return standings;
    }
    
    /**
     * Get match score from scores object
     * @private
     */
    _getMatchScore(matchScores, round, matchIdx) {
        const roundScores = matchScores[round];
        if (!roundScores) return { team1Score: null, team2Score: null };
        
        const score = roundScores[matchIdx];
        if (!score) return { team1Score: null, team2Score: null };
        
        return {
            team1Score: this.normalizeScore(score.team1Score),
            team2Score: this.normalizeScore(score.team2Score)
        };
    }
    
    /**
     * Check if match is complete
     * @param {Object} matchScores - Scores object
     * @param {number} round - Round number
     * @param {number} matchIdx - Match index
     * @returns {boolean}
     */
    isMatchComplete(matchScores, round, matchIdx) {
        const score = this._getMatchScore(matchScores, round, matchIdx);
        return score.team1Score !== null && score.team2Score !== null;
    }
    
    /**
     * Get match winner
     * @param {Object} matchScores - Scores object
     * @param {number} round - Round number
     * @param {number} matchIdx - Match index
     * @returns {string|null} 'team1', 'team2', 'draw', or null
     */
    getWinner(matchScores, round, matchIdx) {
        const score = this._getMatchScore(matchScores, round, matchIdx);
        if (score.team1Score === null || score.team2Score === null) return null;
        if (score.team1Score > score.team2Score) return 'team1';
        if (score.team2Score > score.team1Score) return 'team2';
        return 'draw';
    }
    
    /**
     * Count completed matches across all rounds
     * @param {Object} fixtures - Fixtures object
     * @param {Object} matchScores - Scores object
     * @param {number} totalRounds - Total rounds
     * @returns {Object} { completed, total }
     */
    countMatches(fixtures, matchScores, totalRounds) {
        let completed = 0;
        let total = 0;
        
        for (let round = 1; round <= totalRounds; round++) {
            if (!fixtures[round]) continue;
            
            fixtures[round].forEach((_, matchIdx) => {
                total++;
                if (this.isMatchComplete(matchScores, round, matchIdx)) {
                    completed++;
                }
            });
        }
        
        return { completed, total };
    }
    
    /**
     * Swap players in a fixture
     * @param {Object} fixtures - Fixtures object (will be modified)
     * @param {number} round - Round number
     * @param {number} matchIdx - Match index
     * @param {string} position - 't1p1', 't1p2', 't2p1', or 't2p2'
     * @param {number} oldValue - Old player ID
     * @param {number} newValue - New player ID
     * @returns {Object} Updated fixtures
     */
    swapPlayer(fixtures, round, matchIdx, position, oldValue, newValue) {
        const roundFixtures = fixtures[round];
        if (!roundFixtures) return fixtures;
        
        const match = roundFixtures[matchIdx];
        if (!match) return fixtures;
        
        // Find if new player exists elsewhere in round and swap
        roundFixtures.forEach((m, idx) => {
            ['team1', 'team2'].forEach(team => {
                [0, 1].forEach(pos => {
                    if (m[team][pos] === newValue) {
                        fixtures[round][idx][team][pos] = oldValue;
                    }
                });
            });
        });
        
        // Update the target position
        if (position === 't1p1') match.team1[0] = newValue;
        else if (position === 't1p2') match.team1[1] = newValue;
        else if (position === 't2p1') match.team2[0] = newValue;
        else if (position === 't2p2') match.team2[1] = newValue;
        
        return fixtures;
    }
    
    /**
     * Get knockout bracket structure
     * @param {string} format - 'quarter', 'semi', or 'final'
     * @returns {Object} Bracket structure
     */
    getKnockoutBracket(format = 'quarter') {
        const brackets = {
            final: {
                matches: ['final'],
                participants: 2
            },
            semi: {
                matches: ['semi1', 'semi2', 'final'],
                participants: 4
            },
            quarter: {
                matches: ['qf1', 'qf2', 'qf3', 'qf4', 'semi1', 'semi2', 'final'],
                participants: 8
            }
        };
        
        return brackets[format] || brackets.quarter;
    }
    
    /**
     * Get knockout match max score
     * @param {string} matchId - Match ID (e.g., 'qf1', 'semi1', 'final')
     * @returns {number}
     */
    getKnockoutMaxScore(matchId) {
        if (matchId === 'final') return this.finalMaxScore;
        if (matchId.startsWith('semi')) return this.semiMaxScore;
        return this.knockoutMaxScore;
    }
    
    /**
     * Generate default player names
     * @param {number} count - Number of players
     * @returns {Array}
     */
    generateDefaultPlayerNames(count) {
        return Array.from({ length: count }, (_, i) => `Player ${i + 1}`);
    }
    
    /**
     * Validate tournament configuration
     * @param {number} playerCount - Number of players
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateConfiguration(playerCount) {
        if (!this.isPlayerCountSupported(playerCount)) {
            const supported = this.getSupportedPlayerCounts().join(', ');
            return { 
                valid: false, 
                error: `Player count must be one of: ${supported} (got ${playerCount})` 
            };
        }
        return { valid: true };
    }
}

// Export factory function
export function createMixTournamentEngine(config = {}) {
    return new MixTournamentEngine(config);
}

// Export constants
export { POINTS, PLAYER_CONFIGS };

// Export class
export default MixTournamentEngine;
