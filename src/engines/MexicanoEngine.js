/**
 * MexicanoEngine.js - Mexicano Tournament Engine
 * Rankings-based pairing: 1&3 vs 2&4, pairs based on current standings
 * 
 * Phase 3: Shared Engines Extraction
 * 
 * @module engines/MexicanoEngine
 */

/**
 * Mexicano Engine
 * Handles Mexicano-specific fixture generation based on standings
 */
class MexicanoEngine extends BaseEngine {
    /**
     * Configuration for Mexicano format
     */
    static CONFIG = {
        MIN_PLAYERS: 8,
        MAX_PLAYERS: 80,
        DEFAULT_POINTS: 32,
        POINTS_OPTIONS: [16, 21, 24, 32]
    };
    
    /**
     * Validate player count - must be divisible by 4
     * 
     * @param {number} count 
     * @returns {boolean}
     */
    static validatePlayerCount(count) {
        return count >= this.CONFIG.MIN_PLAYERS && 
               count <= this.CONFIG.MAX_PLAYERS &&
               count % 4 === 0;
    }
    
    /**
     * Calculate number of courts for player count
     * 
     * @param {number} playerCount 
     * @returns {number}
     */
    static getCourtCount(playerCount) {
        return playerCount / 4;
    }
    
    /**
     * Calculate default number of rounds
     * 
     * @param {number} playerCount 
     * @returns {number}
     */
    static getDefaultRoundCount(playerCount) {
        if (playerCount <= 12) return 6;
        if (playerCount <= 20) return 8;
        if (playerCount <= 32) return 10;
        return 12;
    }
    
    /**
     * Generate random pairings for first round
     * 
     * @param {number} playerCount 
     * @returns {Object[]} Array of match objects
     */
    static generateRandomPairings(playerCount) {
        const playerIndices = Array.from({ length: playerCount }, (_, i) => i);
        const shuffled = this.shuffle(playerIndices);
        
        const matches = [];
        const courtsNeeded = playerCount / 4;
        
        for (let court = 0; court < courtsNeeded; court++) {
            const base = court * 4;
            matches.push({
                team1: [shuffled[base], shuffled[base + 1]],
                team2: [shuffled[base + 2], shuffled[base + 3]],
                court
            });
        }
        
        return matches;
    }
    
    /**
     * Generate ranking-based pairings (1&3 vs 2&4)
     * Takes current standings and creates competitive matches
     * 
     * @param {Object[]} standings - Current sorted standings
     * @returns {Object[]} Array of match objects
     */
    static generateRankingBasedPairings(standings) {
        const rankedPlayers = standings.map(s => s.playerIndex);
        const playerCount = standings.length;
        const courtsNeeded = playerCount / 4;
        
        const matches = [];
        
        for (let court = 0; court < courtsNeeded; court++) {
            const base = court * 4;
            
            // 1&3 vs 2&4 from this group of 4
            const p1 = rankedPlayers[base];     // 1st ranked in group
            const p2 = rankedPlayers[base + 1]; // 2nd ranked
            const p3 = rankedPlayers[base + 2]; // 3rd ranked
            const p4 = rankedPlayers[base + 3]; // 4th ranked
            
            matches.push({
                team1: [p1, p3], // 1st & 3rd
                team2: [p2, p4], // 2nd & 4th
                court
            });
        }
        
        return matches;
    }
    
    /**
     * Generate the next round based on current state
     * 
     * @param {number} roundNumber - Round index (0-based)
     * @param {number} playerCount - Number of players
     * @param {Object[]} [standings] - Current standings (required for round > 0)
     * @returns {Object} Round object with matches
     */
    static generateRound(roundNumber, playerCount, standings = null) {
        let matches;
        
        if (roundNumber === 0) {
            // First round: random pairing
            matches = this.generateRandomPairings(playerCount);
        } else {
            // Subsequent rounds: ranking-based pairing
            if (!standings || standings.length === 0) {
                throw new Error('Standings required for rounds after the first');
            }
            matches = this.generateRankingBasedPairings(standings);
        }
        
        return {
            roundNumber,
            matches,
            generated: new Date().toISOString()
        };
    }
    
    /**
     * Calculate Mexicano standings
     * Primary: total points, Secondary: point diff
     * 
     * @param {Object} params
     * @param {string[]} params.playerNames
     * @param {Object[]} params.rounds - Array of round objects
     * @param {Object} params.scores - Scores keyed by round-match
     * @returns {Object[]} Sorted standings
     */
    static calculateStandings({ playerNames, rounds, scores }) {
        // Flatten all matches from all rounds
        const allMatches = [];
        
        rounds.forEach((round, roundIndex) => {
            if (!round || !round.matches) return;
            
            round.matches.forEach((match, matchIndex) => {
                allMatches.push({
                    ...match,
                    roundIndex,
                    matchIndex
                });
            });
        });
        
        // Use base calculation with round-match key
        const standings = BaseEngine.calculateStandings({
            playerNames,
            matches: allMatches,
            scores,
            getMatchKey: (match) => `${match.roundIndex}_${match.matchIndex}`
        });
        
        // Sort using total score (Mexicano-specific)
        return this.sortStandings(standings, 'totalScore');
    }
    
    /**
     * Check if round is complete
     * 
     * @param {Object} round - Round object
     * @param {Object} scores - Scores object
     * @param {number} roundIndex - Index of the round
     * @returns {boolean}
     */
    static isRoundComplete(round, scores, roundIndex) {
        if (!round || !round.matches) return false;
        
        return round.matches.every((_, matchIndex) => {
            const key = `${roundIndex}_${matchIndex}`;
            const score = scores[key];
            return score && score.team1 !== null && score.team2 !== null;
        });
    }
    
    /**
     * Get player's opponents history
     * 
     * @param {number} playerIndex 
     * @param {Object[]} rounds 
     * @returns {number[]}
     */
    static getOpponentsHistory(playerIndex, rounds) {
        const opponents = new Set();
        
        rounds.forEach(round => {
            if (!round || !round.matches) return;
            
            round.matches.forEach(match => {
                const inTeam1 = match.team1.includes(playerIndex);
                const inTeam2 = match.team2.includes(playerIndex);
                
                if (inTeam1) {
                    match.team2.forEach(p => opponents.add(p));
                } else if (inTeam2) {
                    match.team1.forEach(p => opponents.add(p));
                }
            });
        });
        
        return Array.from(opponents);
    }
    
    /**
     * Get player's partners history
     * 
     * @param {number} playerIndex 
     * @param {Object[]} rounds 
     * @returns {number[]}
     */
    static getPartnersHistory(playerIndex, rounds) {
        const partners = new Set();
        
        rounds.forEach(round => {
            if (!round || !round.matches) return;
            
            round.matches.forEach(match => {
                if (match.team1.includes(playerIndex)) {
                    match.team1.forEach(p => {
                        if (p !== playerIndex) partners.add(p);
                    });
                }
                if (match.team2.includes(playerIndex)) {
                    match.team2.forEach(p => {
                        if (p !== playerIndex) partners.add(p);
                    });
                }
            });
        });
        
        return Array.from(partners);
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MexicanoEngine };
}

if (typeof window !== 'undefined') {
    window.MexicanoEngine = MexicanoEngine;
}
