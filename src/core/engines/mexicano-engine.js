/**
 * mexicano-engine.js - Mexicano Tournament Engine
 * 
 * Core logic for Mexicano-style padel tournaments where:
 * - Players/teams are paired based on current standings
 * - Round 1 is random, subsequent rounds use rankings
 * - Pairing pattern: 1&3 vs 2&4 (by ranking)
 * - Supports both Individual and Team modes
 * 
 * This engine is shared between Quick Play and Competitions.
 * 
 * @version 2.0.0
 * @author UberPadel
 */

import { BaseTournamentEngine } from './base-engine.js';

/**
 * Mexicano Tournament Engine
 * Handles dynamic round generation based on standings
 */
export class MexicanoEngine extends BaseTournamentEngine {
    
    /**
     * Create Mexicano engine
     * @param {Object} config - Configuration options
     * @param {number} config.pointsPerMatch - Points per match (default: 24)
     * @param {boolean} config.fixedPoints - Whether points are fixed (default: true)
     * @param {string} config.mode - 'individual' or 'team' (default: 'individual')
     */
    constructor(config = {}) {
        super(config);
        this.mode = config.mode || 'individual';
    }
    
    /**
     * Set tournament mode
     * @param {string} mode - 'individual' or 'team'
     */
    setMode(mode) {
        this.mode = mode;
    }
    
    /**
     * Check if player count is valid
     * @param {number} count - Number of players (individual) or teams (team mode)
     * @returns {Object} { valid: boolean, error?: string }
     */
    validatePlayerCount(count) {
        if (this.mode === 'individual') {
            if (count < 4) {
                return { valid: false, error: 'Minimum 4 players required' };
            }
            if (count > 24) {
                return { valid: false, error: 'Maximum 24 players allowed' };
            }
        } else {
            if (count < 2) {
                return { valid: false, error: 'Minimum 2 teams required' };
            }
            if (count > 12) {
                return { valid: false, error: 'Maximum 12 teams allowed' };
            }
        }
        return { valid: true };
    }
    
    /**
     * Calculate number of courts needed
     * @param {number} playerOrTeamCount - Number of players or teams
     * @returns {number}
     */
    calculateCourts(playerOrTeamCount) {
        if (this.mode === 'individual') {
            return Math.floor(playerOrTeamCount / 4);
        } else {
            return Math.floor(playerOrTeamCount / 2);
        }
    }
    
    /**
     * Calculate standings from match results
     * @param {Array} items - Players (individual) or teams (team mode)
     * @param {Array} rounds - Array of round objects with matches
     * @returns {Array} Sorted standings
     */
    calculateStandings(items, rounds) {
        const stats = new Map();
        
        // Initialize all items with zero stats
        items.forEach(item => {
            const id = item.id;
            stats.set(id, {
                id: id,
                name: item.name || item.teamName || 'Unknown',
                totalPoints: 0,
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                pointsFor: 0,
                pointsAgainst: 0
            });
        });
        
        // Calculate from all completed matches
        rounds.forEach(round => {
            if (!round || !round.matches) return;
            
            round.matches.forEach(match => {
                if (!match.completed) return;
                
                const score1 = match.score1 || 0;
                const score2 = match.score2 || 0;
                
                if (this.mode === 'individual') {
                    // Individual mode - team1 and team2 are arrays of player IDs
                    const team1Ids = this._normalizeArray(match.team1);
                    const team2Ids = this._normalizeArray(match.team2);
                    
                    team1Ids.forEach(id => {
                        const s = stats.get(id);
                        if (s) {
                            s.totalPoints += score1;
                            s.matchesPlayed++;
                            s.pointsFor += score1;
                            s.pointsAgainst += score2;
                            if (score1 > score2) s.wins++;
                            else if (score1 < score2) s.losses++;
                            else s.draws++;
                        }
                    });
                    
                    team2Ids.forEach(id => {
                        const s = stats.get(id);
                        if (s) {
                            s.totalPoints += score2;
                            s.matchesPlayed++;
                            s.pointsFor += score2;
                            s.pointsAgainst += score1;
                            if (score2 > score1) s.wins++;
                            else if (score2 < score1) s.losses++;
                            else s.draws++;
                        }
                    });
                } else {
                    // Team mode - team1 and team2 are single IDs
                    const s1 = stats.get(match.team1);
                    const s2 = stats.get(match.team2);
                    
                    if (s1) {
                        s1.totalPoints += score1;
                        s1.matchesPlayed++;
                        s1.pointsFor += score1;
                        s1.pointsAgainst += score2;
                        if (score1 > score2) s1.wins++;
                        else if (score1 < score2) s1.losses++;
                        else s1.draws++;
                    }
                    
                    if (s2) {
                        s2.totalPoints += score2;
                        s2.matchesPlayed++;
                        s2.pointsFor += score2;
                        s2.pointsAgainst += score1;
                        if (score2 > score1) s2.wins++;
                        else if (score2 < score1) s2.losses++;
                        else s2.draws++;
                    }
                }
            });
        });
        
        // Sort by points (desc), then by matches played (asc for tiebreaker)
        return Array.from(stats.values())
            .sort((a, b) => {
                // Primary: Total points
                if (b.totalPoints !== a.totalPoints) {
                    return b.totalPoints - a.totalPoints;
                }
                // Secondary: Point difference
                const diffA = a.pointsFor - a.pointsAgainst;
                const diffB = b.pointsFor - b.pointsAgainst;
                if (diffB !== diffA) {
                    return diffB - diffA;
                }
                // Tertiary: Wins
                if (b.wins !== a.wins) {
                    return b.wins - a.wins;
                }
                // Quaternary: Fewer matches played (tiebreaker)
                return a.matchesPlayed - b.matchesPlayed;
            });
    }
    
    /**
     * Generate a round based on current standings
     * @param {number} roundNumber - Round number (1-based)
     * @param {Array} items - Players or teams
     * @param {Array} rounds - Previous rounds (for standings calculation)
     * @returns {Object} Round object with matches
     */
    generateRound(roundNumber, items, rounds = []) {
        if (this.mode === 'individual') {
            return this._generateIndividualRound(roundNumber, items, rounds);
        } else {
            return this._generateTeamRound(roundNumber, items, rounds);
        }
    }
    
    /**
     * Generate individual mode round
     * @private
     */
    _generateIndividualRound(roundNumber, players, rounds) {
        // Get current standings
        const standings = this.calculateStandings(players, rounds);
        
        if (standings.length < 4) {
            return { 
                roundNumber, 
                matches: [], 
                sittingOut: [], 
                completed: false,
                error: 'Not enough players'
            };
        }
        
        // Round 1: Random shuffle. After: Use standings order
        let sorted = roundNumber === 1 
            ? this.shuffleArray([...standings])
            : [...standings];
        
        const matches = [];
        const courts = Math.floor(sorted.length / 4);
        
        for (let c = 0; c < courts; c++) {
            const base = c * 4;
            // Mexicano pairing: 1&3 vs 2&4 (by ranking within group)
            const p1 = sorted[base];
            const p2 = sorted[base + 1];
            const p3 = sorted[base + 2];
            const p4 = sorted[base + 3];
            
            if (!p1 || !p2 || !p3 || !p4) continue;
            
            // Find original player indices
            const getIndex = (id) => players.findIndex(p => p.id === id);
            
            const match = {
                id: this._generateId(),
                court: c + 1,
                team1: [p1.id, p3.id],
                team1Names: [p1.name, p3.name],
                team1Indices: [getIndex(p1.id), getIndex(p3.id)],
                team2: [p2.id, p4.id],
                team2Names: [p2.name, p4.name],
                team2Indices: [getIndex(p2.id), getIndex(p4.id)],
                score1: null,
                score2: null,
                completed: false
            };
            
            matches.push(match);
        }
        
        // Players sitting out (those beyond full courts)
        const sittingOut = sorted.slice(courts * 4).map(s => ({
            id: s.id,
            name: s.name,
            index: players.findIndex(p => p.id === s.id)
        }));
        
        return {
            roundNumber,
            matches,
            sittingOut,
            completed: false
        };
    }
    
    /**
     * Generate team mode round
     * @private
     */
    _generateTeamRound(roundNumber, teams, rounds) {
        const standings = this.calculateStandings(teams, rounds);
        
        if (standings.length < 2) {
            return { 
                roundNumber, 
                matches: [], 
                sittingOut: [], 
                completed: false,
                error: 'Not enough teams'
            };
        }
        
        let sorted = roundNumber === 1
            ? this.shuffleArray([...standings])
            : [...standings];
        
        const matches = [];
        const numMatches = Math.floor(sorted.length / 2);
        
        for (let m = 0; m < numMatches; m++) {
            const t1 = sorted[m * 2];
            const t2 = sorted[m * 2 + 1];
            
            if (!t1 || !t2) continue;
            
            // Find original team objects
            const team1Obj = teams.find(t => t.id === t1.id);
            const team2Obj = teams.find(t => t.id === t2.id);
            
            matches.push({
                id: this._generateId(),
                court: m + 1,
                team1: t1.id,
                team1Name: t1.name,
                team1Players: team1Obj ? [team1Obj.player1, team1Obj.player2] : [],
                team1Index: teams.findIndex(t => t.id === t1.id),
                team2: t2.id,
                team2Name: t2.name,
                team2Players: team2Obj ? [team2Obj.player1, team2Obj.player2] : [],
                team2Index: teams.findIndex(t => t.id === t2.id),
                score1: null,
                score2: null,
                completed: false
            });
        }
        
        // Team sitting out (if odd number)
        const sittingOut = sorted.length % 2 !== 0 
            ? [{ 
                id: sorted[sorted.length - 1].id, 
                name: sorted[sorted.length - 1].name,
                index: teams.findIndex(t => t.id === sorted[sorted.length - 1].id)
            }] 
            : [];
        
        return { 
            roundNumber, 
            matches, 
            sittingOut, 
            completed: false 
        };
    }
    
    /**
     * Check if round is complete (all matches have scores)
     * @param {Object} round - Round object
     * @returns {boolean}
     */
    isRoundComplete(round) {
        if (!round || !round.matches || round.matches.length === 0) {
            return false;
        }
        return round.matches.every(match => match.completed);
    }
    
    /**
     * Update match score
     * @param {Object} round - Round object
     * @param {string} matchId - Match ID
     * @param {number} score1 - Team 1 score
     * @param {number} score2 - Team 2 score
     * @returns {Object} Updated round
     */
    updateMatchScore(round, matchId, score1, score2) {
        const match = round.matches.find(m => m.id === matchId);
        if (!match) return round;
        
        // Validate score
        const validation = this.validateScore(score1, score2);
        if (!validation.valid) {
            console.warn('Invalid score:', validation.error);
            return round;
        }
        
        // Update match
        match.score1 = score1;
        match.score2 = score2;
        match.completed = score1 !== null && score2 !== null;
        
        // Check if round is complete
        round.completed = this.isRoundComplete(round);
        
        return round;
    }
    
    /**
     * Get match statistics
     * @param {Array} rounds - All rounds
     * @returns {Object} Stats summary
     */
    getMatchStats(rounds) {
        let totalMatches = 0;
        let completedMatches = 0;
        let totalRounds = rounds.length;
        let completedRounds = 0;
        
        rounds.forEach(round => {
            if (!round || !round.matches) return;
            
            totalMatches += round.matches.length;
            completedMatches += round.matches.filter(m => m.completed).length;
            
            if (round.completed) completedRounds++;
        });
        
        return {
            totalMatches,
            completedMatches,
            totalRounds,
            completedRounds,
            progress: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0
        };
    }
    
    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Normalize array (handle Firebase object conversion)
     * @private
     */
    _normalizeArray(arr) {
        if (Array.isArray(arr)) return arr;
        if (arr && typeof arr === 'object') return Object.values(arr);
        return [];
    }
    
    /**
     * Create a new player object
     * @param {string} name - Player name
     * @param {number} index - Player index
     * @returns {Object}
     */
    createPlayer(name, index) {
        return {
            id: this._generateId(),
            name: name || `Player ${index + 1}`,
            index: index
        };
    }
    
    /**
     * Create a new team object
     * @param {string} teamName - Team name
     * @param {string} player1 - Player 1 name
     * @param {string} player2 - Player 2 name
     * @param {number} index - Team index
     * @returns {Object}
     */
    createTeam(teamName, player1, player2, index) {
        return {
            id: this._generateId(),
            teamName: teamName || `Team ${index + 1}`,
            player1: player1 || `Player ${index * 2 + 1}`,
            player2: player2 || `Player ${index * 2 + 2}`,
            index: index
        };
    }
}

// Export factory function
export function createMexicanoEngine(config = {}) {
    return new MexicanoEngine(config);
}

// Export class
export default MexicanoEngine;
