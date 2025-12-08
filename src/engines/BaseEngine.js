/**
 * BaseEngine.js - Shared Tournament Calculation Engine
 * Pure logic for calculations - NO Firebase, NO UI dependencies
 * 
 * Phase 3: Shared Engines Extraction
 * Fix a bug here → fixed everywhere
 * 
 * @module engines/BaseEngine
 */

/**
 * Base Engine class with shared calculation methods
 * All format-specific engines extend this
 */
class BaseEngine {
    /**
     * Calculate standings from matches and scores
     * 
     * @param {Object} params
     * @param {string[]} params.playerNames - Array of player names
     * @param {Object[]} params.matches - Array of match objects with teams
     * @param {Object} params.scores - Score object keyed by match identifier
     * @param {Function} [params.getMatchKey] - Function to get score key from match
     * @returns {Object[]} Sorted standings array
     */
    static calculateStandings({ playerNames, matches, scores, getMatchKey }) {
        const playerCount = playerNames.length;
        
        // Initialize stats for all players
        const playerStats = Array(playerCount).fill(null).map(() => ({
            totalScore: 0,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            pointsFor: 0,
            pointsAgainst: 0
        }));
        
        // Process each match
        matches.forEach((match, matchIndex) => {
            const scoreKey = getMatchKey ? getMatchKey(match, matchIndex) : `f_${matchIndex}`;
            const score = scores[scoreKey];
            
            if (!score || score.team1 === null || score.team2 === null) {
                return; // Skip incomplete matches
            }
            
            const team1Score = score.team1;
            const team2Score = score.team2;
            
            // Get player indices for each team
            const team1Players = this.getTeamPlayers(match, 1);
            const team2Players = this.getTeamPlayers(match, 2);
            
            // Update team 1 players
            team1Players.forEach(playerIdx => {
                if (playerIdx >= 0 && playerIdx < playerCount) {
                    playerStats[playerIdx].totalScore += team1Score;
                    playerStats[playerIdx].gamesPlayed++;
                    playerStats[playerIdx].pointsFor += team1Score;
                    playerStats[playerIdx].pointsAgainst += team2Score;
                    
                    if (team1Score > team2Score) {
                        playerStats[playerIdx].wins++;
                    } else if (team1Score < team2Score) {
                        playerStats[playerIdx].losses++;
                    } else {
                        playerStats[playerIdx].draws++;
                    }
                }
            });
            
            // Update team 2 players
            team2Players.forEach(playerIdx => {
                if (playerIdx >= 0 && playerIdx < playerCount) {
                    playerStats[playerIdx].totalScore += team2Score;
                    playerStats[playerIdx].gamesPlayed++;
                    playerStats[playerIdx].pointsFor += team2Score;
                    playerStats[playerIdx].pointsAgainst += team1Score;
                    
                    if (team2Score > team1Score) {
                        playerStats[playerIdx].wins++;
                    } else if (team2Score < team1Score) {
                        playerStats[playerIdx].losses++;
                    } else {
                        playerStats[playerIdx].draws++;
                    }
                }
            });
        });
        
        // Build standings array
        return playerNames.map((name, index) => {
            const stats = playerStats[index];
            const avgScore = stats.gamesPlayed > 0 
                ? stats.totalScore / stats.gamesPlayed 
                : 0;
            const pointsDiff = stats.pointsFor - stats.pointsAgainst;
            const avgPointsDiff = stats.gamesPlayed > 0 
                ? pointsDiff / stats.gamesPlayed 
                : 0;
            
            return {
                name: name || `Player ${index + 1}`,
                playerNum: index + 1,
                playerIndex: index,
                score: stats.totalScore,
                avgScore: avgScore,
                gamesPlayed: stats.gamesPlayed,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws,
                pointsFor: stats.pointsFor,
                pointsAgainst: stats.pointsAgainst,
                pointsDiff: pointsDiff,
                avgPointsDiff: avgPointsDiff
            };
        });
    }
    
    /**
     * Extract player indices from a match object
     * Handles different match formats (teams array, team1/team2 properties)
     * 
     * @param {Object} match - Match object
     * @param {number} teamNum - Team number (1 or 2)
     * @returns {number[]} Array of player indices (0-indexed)
     */
    static getTeamPlayers(match, teamNum) {
        // Format 1: match.teams = [[p1, p2], [p3, p4]] (1-indexed)
        if (match.teams && Array.isArray(match.teams)) {
            const team = match.teams[teamNum - 1] || [];
            // Convert from 1-indexed to 0-indexed
            return team.map(p => (typeof p === 'number' ? p - 1 : p));
        }
        
        // Format 2: match.team1 = [p1, p2], match.team2 = [p3, p4] (0-indexed)
        if (teamNum === 1 && match.team1) {
            return match.team1;
        }
        if (teamNum === 2 && match.team2) {
            return match.team2;
        }
        
        return [];
    }
    
    /**
     * Sort standings using standard padel ranking rules
     * Primary: Average score, Secondary: Point diff, Tertiary: Total score
     * 
     * @param {Object[]} standings - Unsorted standings array
     * @param {string} [sortMode='avgScore'] - Sorting mode
     * @returns {Object[]} Sorted standings
     */
    static sortStandings(standings, sortMode = 'avgScore') {
        return [...standings].sort((a, b) => {
            switch (sortMode) {
                case 'avgScore':
                    // Primary: Average score (fairest when game counts differ)
                    if (Math.abs(b.avgScore - a.avgScore) > 0.01) {
                        return b.avgScore - a.avgScore;
                    }
                    // Secondary: Average point difference
                    if (Math.abs(b.avgPointsDiff - a.avgPointsDiff) > 0.01) {
                        return b.avgPointsDiff - a.avgPointsDiff;
                    }
                    // Tertiary: Total score
                    return b.score - a.score;
                    
                case 'totalScore':
                    // Primary: Total score
                    if (b.score !== a.score) return b.score - a.score;
                    // Secondary: Point difference
                    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
                    // Tertiary: Wins
                    return b.wins - a.wins;
                    
                case 'wins':
                    // Primary: Wins
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    // Secondary: Point difference
                    if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
                    // Tertiary: Total score
                    return b.score - a.score;
                    
                default:
                    return b.score - a.score;
            }
        });
    }
    
    /**
     * Validate a score value
     * 
     * @param {*} value - Value to validate
     * @param {Object} [options] - Validation options
     * @param {number} [options.min=0] - Minimum allowed value
     * @param {number} [options.max] - Maximum allowed value
     * @returns {number|null} Validated score or null if invalid
     */
    static validateScore(value, options = {}) {
        const { min = 0, max } = options;
        
        if (value === null || value === undefined || value === '') {
            return null;
        }
        
        const numValue = parseInt(value, 10);
        
        if (isNaN(numValue)) {
            return null;
        }
        
        if (numValue < min) {
            return min;
        }
        
        if (max !== undefined && numValue > max) {
            return max;
        }
        
        return numValue;
    }
    
    /**
     * Calculate the complementary score for fixed-points mode
     * 
     * @param {number} score - One team's score
     * @param {number} totalPoints - Total points in the match
     * @returns {number} The other team's score
     */
    static calculateComplementScore(score, totalPoints) {
        if (score === null || score === undefined) {
            return null;
        }
        return Math.max(0, totalPoints - score);
    }
    
    /**
     * Get match result
     * 
     * @param {number} team1Score 
     * @param {number} team2Score 
     * @returns {'team1'|'team2'|'draw'|null} Winner or null if incomplete
     */
    static getMatchResult(team1Score, team2Score) {
        if (team1Score === null || team2Score === null) {
            return null;
        }
        
        if (team1Score > team2Score) return 'team1';
        if (team2Score > team1Score) return 'team2';
        return 'draw';
    }
    
    /**
     * Count completed matches
     * 
     * @param {Object[]} matches - Array of matches
     * @param {Object} scores - Scores object
     * @param {Function} [getMatchKey] - Function to get score key
     * @returns {number} Count of completed matches
     */
    static countCompletedMatches(matches, scores, getMatchKey) {
        let count = 0;
        
        matches.forEach((match, index) => {
            const key = getMatchKey ? getMatchKey(match, index) : `f_${index}`;
            const score = scores[key];
            
            if (score && score.team1 !== null && score.team2 !== null) {
                count++;
            }
        });
        
        return count;
    }
    
    /**
     * Check if all matches in a round/group are complete
     * 
     * @param {Object[]} matches - Array of matches
     * @param {Object} scores - Scores object
     * @param {Function} [getMatchKey] - Function to get score key
     * @returns {boolean}
     */
    static isRoundComplete(matches, scores, getMatchKey) {
        return matches.every((match, index) => {
            const key = getMatchKey ? getMatchKey(match, index) : `f_${index}`;
            const score = scores[key];
            return score && score.team1 !== null && score.team2 !== null;
        });
    }
    
    /**
     * Generate default player names
     * 
     * @param {number} count - Number of players
     * @param {string} [prefix='Player'] - Name prefix
     * @returns {string[]}
     */
    static generatePlayerNames(count, prefix = 'Player') {
        return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
    }
    
    /**
     * Generate default court names
     * 
     * @param {number} count - Number of courts
     * @param {string} [prefix='Court'] - Name prefix
     * @returns {string[]}
     */
    static generateCourtNames(count, prefix = 'Court') {
        return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
    }
    
    /**
     * Shuffle an array using Fisher-Yates algorithm
     * 
     * @param {any[]} array - Array to shuffle
     * @returns {any[]} New shuffled array
     */
    static shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }
    
    /**
     * Generate a tournament ID
     * 
     * @param {number} [length=6] - ID length
     * @returns {string}
     */
    static generateTournamentId(length = 6) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < length; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }
    
    /**
     * Generate an organiser key
     * 
     * @param {number} [length=16] - Key length
     * @returns {string}
     */
    static generateOrganiserKey(length = 16) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < length; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    }
    
    /**
     * Hash a passcode (simple hash for browser use)
     * 
     * @param {string} passcode
     * @returns {string}
     */
    static hashPasscode(passcode) {
        let hash = 0;
        for (let i = 0; i < passcode.length; i++) {
            const char = passcode.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }
    
    /**
     * Calculate partner statistics for Americano-style tournaments
     * 
     * @param {Object[]} matches - Array of match objects
     * @param {number} playerCount - Number of players
     * @returns {Object} Partner pairing matrix
     */
    static calculatePartnerStats(matches, playerCount) {
        const pairings = {};
        
        // Initialize pairing matrix
        for (let i = 0; i < playerCount; i++) {
            pairings[i] = {};
            for (let j = 0; j < playerCount; j++) {
                if (i !== j) pairings[i][j] = 0;
            }
        }
        
        // Count pairings from all matches
        matches.forEach(match => {
            const team1 = this.getTeamPlayers(match, 1);
            const team2 = this.getTeamPlayers(match, 2);
            
            // Team 1 partners
            if (team1.length === 2) {
                const [p1, p2] = team1;
                if (pairings[p1] && pairings[p2]) {
                    pairings[p1][p2]++;
                    pairings[p2][p1]++;
                }
            }
            
            // Team 2 partners
            if (team2.length === 2) {
                const [p1, p2] = team2;
                if (pairings[p1] && pairings[p2]) {
                    pairings[p1][p2]++;
                    pairings[p2][p1]++;
                }
            }
        });
        
        return pairings;
    }
    
    /**
     * Calculate opponent statistics
     * 
     * @param {Object[]} matches - Array of match objects
     * @param {number} playerCount - Number of players
     * @returns {Object} Opponent pairing matrix
     */
    static calculateOpponentStats(matches, playerCount) {
        const opponents = {};
        
        // Initialize opponent matrix
        for (let i = 0; i < playerCount; i++) {
            opponents[i] = {};
            for (let j = 0; j < playerCount; j++) {
                if (i !== j) opponents[i][j] = 0;
            }
        }
        
        // Count opponent matchups
        matches.forEach(match => {
            const team1 = this.getTeamPlayers(match, 1);
            const team2 = this.getTeamPlayers(match, 2);
            
            // Each team1 player faced each team2 player
            team1.forEach(p1 => {
                team2.forEach(p2 => {
                    if (opponents[p1] && opponents[p2]) {
                        opponents[p1][p2]++;
                        opponents[p2][p1]++;
                    }
                });
            });
        });
        
        return opponents;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaseEngine };
}

if (typeof window !== 'undefined') {
    window.BaseEngine = BaseEngine;
}
