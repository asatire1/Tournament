/**
 * base-engine.js - Base Tournament Engine
 * 
 * Common functionality shared across all tournament formats:
 * - Score validation
 * - Basic standings calculations
 * - Player shuffling
 * - Tiebreaker logic
 * 
 * @version 2.0.0
 * @author UberPadel
 */

/**
 * Base Tournament Engine Class
 * Extended by format-specific engines
 */
export class BaseTournamentEngine {
    
    constructor(config = {}) {
        this.pointsPerMatch = config.pointsPerMatch || 24;
        this.fixedPoints = config.fixedPoints !== undefined ? config.fixedPoints : true;
    }
    
    /**
     * Validate a score entry
     * @param {number|null} score1 - Team 1 score
     * @param {number|null} score2 - Team 2 score
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateScore(score1, score2) {
        // Allow null scores (match not played yet)
        if (score1 === null && score2 === null) {
            return { valid: true };
        }
        
        // Both must be numbers if one is set
        if (score1 === null || score2 === null) {
            return { valid: false, error: 'Both scores must be entered' };
        }
        
        // Must be non-negative integers
        if (!Number.isInteger(score1) || !Number.isInteger(score2)) {
            return { valid: false, error: 'Scores must be whole numbers' };
        }
        
        if (score1 < 0 || score2 < 0) {
            return { valid: false, error: 'Scores cannot be negative' };
        }
        
        // Fixed points validation
        if (this.fixedPoints) {
            const total = score1 + score2;
            if (total !== this.pointsPerMatch) {
                return { 
                    valid: false, 
                    error: `Scores must add up to ${this.pointsPerMatch} (got ${total})` 
                };
            }
        }
        
        return { valid: true };
    }
    
    /**
     * Normalize score (handle -1 as null, undefined as null)
     * @param {any} score - Raw score value
     * @returns {number|null} Normalized score
     */
    normalizeScore(score) {
        if (score === undefined || score === null || score === -1) {
            return null;
        }
        return Number(score);
    }
    
    /**
     * Get match result from scores
     * @param {number} score1 - Team 1 score
     * @param {number} score2 - Team 2 score
     * @returns {Object} { winner: 1|2|0, loser: 1|2|0, isDraw: boolean, margin: number }
     */
    getMatchResult(score1, score2) {
        if (score1 === null || score2 === null) {
            return { winner: 0, loser: 0, isDraw: false, margin: 0, played: false };
        }
        
        const margin = Math.abs(score1 - score2);
        
        if (score1 > score2) {
            return { winner: 1, loser: 2, isDraw: false, margin, played: true };
        } else if (score2 > score1) {
            return { winner: 2, loser: 1, isDraw: false, margin, played: true };
        } else {
            return { winner: 0, loser: 0, isDraw: true, margin: 0, played: true };
        }
    }
    
    /**
     * Shuffle an array (Fisher-Yates algorithm)
     * @param {Array} array - Array to shuffle
     * @returns {Array} New shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    /**
     * Create initial player stats object
     * @returns {Object} Empty stats object
     */
    createEmptyStats() {
        return {
            totalScore: 0,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            pointsFor: 0,
            pointsAgainst: 0
        };
    }
    
    /**
     * Calculate derived stats from base stats
     * @param {Object} stats - Base stats object
     * @returns {Object} Stats with derived values
     */
    calculateDerivedStats(stats) {
        const pointsDiff = stats.pointsFor - stats.pointsAgainst;
        const avgScore = stats.gamesPlayed > 0 
            ? stats.totalScore / stats.gamesPlayed 
            : 0;
        const avgPointsDiff = stats.gamesPlayed > 0 
            ? pointsDiff / stats.gamesPlayed 
            : 0;
        const winRate = stats.gamesPlayed > 0
            ? (stats.wins / stats.gamesPlayed) * 100
            : 0;
            
        return {
            ...stats,
            pointsDiff,
            avgScore,
            avgPointsDiff,
            winRate
        };
    }
    
    /**
     * Standard tiebreaker comparison
     * @param {Object} a - Player A standings
     * @param {Object} b - Player B standings
     * @returns {number} Sort comparison result
     */
    comparePlayers(a, b) {
        // Primary: Average score (fairest when game counts differ)
        if (Math.abs(b.avgScore - a.avgScore) > 0.01) {
            return b.avgScore - a.avgScore;
        }
        
        // Secondary: Average point difference
        if (Math.abs(b.avgPointsDiff - a.avgPointsDiff) > 0.01) {
            return b.avgPointsDiff - a.avgPointsDiff;
        }
        
        // Tertiary: Win rate
        if (Math.abs(b.winRate - a.winRate) > 0.01) {
            return b.winRate - a.winRate;
        }
        
        // Quaternary: Total score
        if (b.totalScore !== a.totalScore) {
            return b.totalScore - a.totalScore;
        }
        
        // Final: Total wins
        return b.wins - a.wins;
    }
    
    /**
     * Sort standings array
     * @param {Array} standings - Array of player standings
     * @returns {Array} Sorted standings
     */
    sortStandings(standings) {
        return [...standings].sort((a, b) => this.comparePlayers(a, b));
    }
    
    /**
     * Generate default player names
     * @param {number} count - Number of players
     * @returns {Array} Array of player names
     */
    generateDefaultPlayerNames(count) {
        return Array.from({ length: count }, (_, i) => `Player ${i + 1}`);
    }
    
    /**
     * Generate default court names
     * @param {number} count - Number of courts
     * @returns {Array} Array of court names
     */
    generateDefaultCourtNames(count) {
        return Array.from({ length: count }, (_, i) => `Court ${i + 1}`);
    }
}

/**
 * Utility functions (exported separately for convenience)
 */

export function validateScore(score1, score2, pointsPerMatch = 24, fixedPoints = true) {
    const engine = new BaseTournamentEngine({ pointsPerMatch, fixedPoints });
    return engine.validateScore(score1, score2);
}

export function shuffleArray(array) {
    const engine = new BaseTournamentEngine();
    return engine.shuffleArray(array);
}

export function normalizeScore(score) {
    const engine = new BaseTournamentEngine();
    return engine.normalizeScore(score);
}

// Default export
export default BaseTournamentEngine;
