/**
 * TournamentEngine.js - Mix Tournament Engine
 * Fixed pairings with group stage + knockout
 * 
 * Phase 3: Shared Engines Extraction
 * 
 * @module engines/TournamentEngine
 */

/**
 * Tournament (Mix) Engine
 * Handles group stage + knockout format
 */
class TournamentEngine extends BaseEngine {
    /**
     * Configuration for Tournament format
     */
    static CONFIG = {
        MIN_PLAYERS: 8,
        MAX_PLAYERS: 32,
        DEFAULT_PLAYERS: 24,
        PLAYER_OPTIONS: [8, 12, 16, 20, 24, 28, 32],
        FIXTURE_MAX_SCORE: 6,
        KNOCKOUT_MAX_SCORE: 7,
        SEMI_MAX_SCORE: 7,
        FINAL_MAX_SCORE: 7,
        KNOCKOUT_FORMATS: ['final', 'semi', 'quarter']
    };
    
    /**
     * Validate player count
     * 
     * @param {number} count 
     * @returns {boolean}
     */
    static validatePlayerCount(count) {
        return this.CONFIG.PLAYER_OPTIONS.includes(count);
    }
    
    /**
     * Calculate group standings for a specific group
     * 
     * @param {Object} params
     * @param {number[]} params.groupPlayers - Player indices in group
     * @param {string[]} params.playerNames - All player names
     * @param {Object} params.fixtures - Fixtures object
     * @param {Object} params.scores - Match scores
     * @returns {Object[]} Sorted group standings
     */
    static calculateGroupStandings({ groupPlayers, playerNames, fixtures, scores }) {
        // Initialize stats for group players
        const stats = {};
        groupPlayers.forEach(playerIdx => {
            stats[playerIdx] = {
                playerIndex: playerIdx,
                name: playerNames[playerIdx] || `Player ${playerIdx + 1}`,
                played: 0,
                won: 0,
                lost: 0,
                drawn: 0,
                gamesFor: 0,
                gamesAgainst: 0,
                gameDiff: 0,
                points: 0 // 3 for win, 1 for draw, 0 for loss
            };
        });
        
        // Process fixtures for this group
        Object.entries(fixtures).forEach(([matchKey, match]) => {
            const score = scores[matchKey];
            if (!score || score.team1Score === undefined || score.team2Score === undefined) {
                return;
            }
            
            const team1 = match.team1 || [];
            const team2 = match.team2 || [];
            
            // Check if this match involves group players
            const team1InGroup = team1.some(p => groupPlayers.includes(p));
            const team2InGroup = team2.some(p => groupPlayers.includes(p));
            
            if (!team1InGroup && !team2InGroup) return;
            
            // Update stats
            const updateTeamStats = (team, teamScore, oppScore) => {
                team.forEach(playerIdx => {
                    if (!stats[playerIdx]) return;
                    
                    stats[playerIdx].played++;
                    stats[playerIdx].gamesFor += teamScore;
                    stats[playerIdx].gamesAgainst += oppScore;
                    
                    if (teamScore > oppScore) {
                        stats[playerIdx].won++;
                        stats[playerIdx].points += 3;
                    } else if (teamScore < oppScore) {
                        stats[playerIdx].lost++;
                    } else {
                        stats[playerIdx].drawn++;
                        stats[playerIdx].points += 1;
                    }
                });
            };
            
            updateTeamStats(team1, score.team1Score, score.team2Score);
            updateTeamStats(team2, score.team2Score, score.team1Score);
        });
        
        // Calculate game difference and sort
        return Object.values(stats)
            .map(s => ({
                ...s,
                gameDiff: s.gamesFor - s.gamesAgainst
            }))
            .sort((a, b) => {
                // Primary: Points
                if (b.points !== a.points) return b.points - a.points;
                // Secondary: Game difference
                if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
                // Tertiary: Games won
                if (b.won !== a.won) return b.won - a.won;
                // Quaternary: Games for
                return b.gamesFor - a.gamesFor;
            });
    }
    
    /**
     * Get knockout bracket structure
     * 
     * @param {string} format - 'final', 'semi', or 'quarter'
     * @returns {Object} Bracket structure
     */
    static getKnockoutBracket(format) {
        switch (format) {
            case 'final':
                return {
                    rounds: 1,
                    matches: {
                        final: { team1: null, team2: null }
                    }
                };
            case 'semi':
                return {
                    rounds: 2,
                    matches: {
                        semi1: { team1: null, team2: null },
                        semi2: { team1: null, team2: null },
                        final: { team1: null, team2: null },
                        thirdPlace: { team1: null, team2: null }
                    }
                };
            case 'quarter':
                return {
                    rounds: 3,
                    matches: {
                        quarter1: { team1: null, team2: null },
                        quarter2: { team1: null, team2: null },
                        quarter3: { team1: null, team2: null },
                        quarter4: { team1: null, team2: null },
                        semi1: { team1: null, team2: null },
                        semi2: { team1: null, team2: null },
                        final: { team1: null, team2: null },
                        thirdPlace: { team1: null, team2: null }
                    }
                };
            default:
                return { rounds: 0, matches: {} };
        }
    }
    
    /**
     * Progress knockout bracket based on results
     * 
     * @param {Object} bracket - Current bracket state
     * @param {Object} scores - Knockout scores
     * @returns {Object} Updated bracket
     */
    static progressKnockout(bracket, scores) {
        const updated = JSON.parse(JSON.stringify(bracket));
        
        // Progress from quarters to semis
        if (scores.quarter1 && updated.matches.semi1) {
            updated.matches.semi1.team1 = this.getWinner(scores.quarter1);
        }
        if (scores.quarter2 && updated.matches.semi1) {
            updated.matches.semi1.team2 = this.getWinner(scores.quarter2);
        }
        if (scores.quarter3 && updated.matches.semi2) {
            updated.matches.semi2.team1 = this.getWinner(scores.quarter3);
        }
        if (scores.quarter4 && updated.matches.semi2) {
            updated.matches.semi2.team2 = this.getWinner(scores.quarter4);
        }
        
        // Progress from semis to final
        if (scores.semi1 && updated.matches.final) {
            updated.matches.final.team1 = this.getWinner(scores.semi1);
            if (updated.matches.thirdPlace) {
                updated.matches.thirdPlace.team1 = this.getLoser(scores.semi1);
            }
        }
        if (scores.semi2 && updated.matches.final) {
            updated.matches.final.team2 = this.getWinner(scores.semi2);
            if (updated.matches.thirdPlace) {
                updated.matches.thirdPlace.team2 = this.getLoser(scores.semi2);
            }
        }
        
        return updated;
    }
    
    /**
     * Get winner of a knockout match
     * 
     * @param {Object} score 
     * @returns {string|null}
     */
    static getWinner(score) {
        if (!score || score.team1Score === undefined || score.team2Score === undefined) {
            return null;
        }
        return score.team1Score > score.team2Score ? 'team1' : 'team2';
    }
    
    /**
     * Get loser of a knockout match
     * 
     * @param {Object} score 
     * @returns {string|null}
     */
    static getLoser(score) {
        const winner = this.getWinner(score);
        if (!winner) return null;
        return winner === 'team1' ? 'team2' : 'team1';
    }
    
    /**
     * Calculate fairness metrics for fixtures
     * 
     * @param {Object} fixtures 
     * @param {number} playerCount 
     * @returns {Object}
     */
    static calculateFairnessMetrics(fixtures, playerCount) {
        const partnerCount = {};
        const opponentCount = {};
        
        // Initialize
        for (let i = 0; i < playerCount; i++) {
            partnerCount[i] = {};
            opponentCount[i] = {};
        }
        
        // Count from fixtures
        Object.values(fixtures).forEach(match => {
            const team1 = match.team1 || [];
            const team2 = match.team2 || [];
            
            // Partners
            if (team1.length === 2) {
                const [p1, p2] = team1;
                partnerCount[p1][p2] = (partnerCount[p1][p2] || 0) + 1;
                partnerCount[p2][p1] = (partnerCount[p2][p1] || 0) + 1;
            }
            if (team2.length === 2) {
                const [p1, p2] = team2;
                partnerCount[p1][p2] = (partnerCount[p1][p2] || 0) + 1;
                partnerCount[p2][p1] = (partnerCount[p2][p1] || 0) + 1;
            }
            
            // Opponents
            team1.forEach(p1 => {
                team2.forEach(p2 => {
                    opponentCount[p1][p2] = (opponentCount[p1][p2] || 0) + 1;
                    opponentCount[p2][p1] = (opponentCount[p2][p1] || 0) + 1;
                });
            });
        });
        
        return { partnerCount, opponentCount };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TournamentEngine };
}

if (typeof window !== 'undefined') {
    window.TournamentEngine = TournamentEngine;
}
