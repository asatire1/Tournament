/**
 * team-league-engine.js - Team League Tournament Engine
 * 
 * Core logic for Team League-style padel tournaments where:
 * - Teams of 2 players compete in round-robin groups
 * - Single group or two group modes
 * - Automatic knockout bracket from group standings
 * - Tournament points system (Win=3, Draw=1)
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
 * Group modes
 */
const GROUP_MODES = {
    SINGLE: 'single',
    TWO_GROUPS: 'two_groups'
};

/**
 * Knockout formats
 */
const KNOCKOUT_FORMATS = {
    FINAL_ONLY: 'final_only',
    SEMI_FINAL: 'semi_final',
    QUARTER_FINAL: 'quarter_final'
};

/**
 * Team League Tournament Engine
 * Handles team-based round-robin groups with knockout stages
 */
export class TeamLeagueEngine extends BaseTournamentEngine {
    
    /**
     * Create Team League engine
     * @param {Object} config - Configuration options
     * @param {string} config.groupMode - 'single' or 'two_groups' (default: 'two_groups')
     * @param {string} config.knockoutFormat - knockout format (default: 'quarter_final')
     * @param {number} config.groupMaxScore - Max score for group matches (default: 24)
     * @param {number} config.knockoutMaxScore - Max score for knockout matches (default: 24)
     * @param {number} config.semiMaxScore - Max score for semi-finals (default: 24)
     * @param {number} config.finalMaxScore - Max score for finals (default: 32)
     * @param {boolean} config.includeThirdPlace - Include 3rd place match (default: true)
     */
    constructor(config = {}) {
        super(config);
        this.groupMode = config.groupMode || GROUP_MODES.TWO_GROUPS;
        this.knockoutFormat = config.knockoutFormat || KNOCKOUT_FORMATS.QUARTER_FINAL;
        this.groupMaxScore = config.groupMaxScore || 24;
        this.knockoutMaxScore = config.knockoutMaxScore || 24;
        this.semiMaxScore = config.semiMaxScore || 24;
        this.finalMaxScore = config.finalMaxScore || 32;
        this.thirdPlaceMaxScore = config.thirdPlaceMaxScore || 24;
        this.includeThirdPlace = config.includeThirdPlace !== undefined ? config.includeThirdPlace : true;
    }
    
    /**
     * Set group mode
     * @param {string} mode - 'single' or 'two_groups'
     */
    setGroupMode(mode) {
        this.groupMode = mode;
    }
    
    /**
     * Create a new team object
     * @param {string} name - Team name
     * @param {string} player1Name - Player 1 name
     * @param {number} player1Rating - Player 1 rating
     * @param {string} player2Name - Player 2 name
     * @param {number} player2Rating - Player 2 rating
     * @param {number} index - Team index
     * @returns {Object}
     */
    createTeam(name, player1Name, player1Rating, player2Name, player2Rating, index) {
        const combinedRating = (player1Rating || 0) + (player2Rating || 0);
        return {
            id: index + 1,
            name: name || `Team ${index + 1}`,
            player1Name: player1Name || `Player ${index * 2 + 1}`,
            player1Rating: player1Rating || 0,
            player2Name: player2Name || `Player ${index * 2 + 2}`,
            player2Rating: player2Rating || 0,
            combinedRating,
            group: null
        };
    }
    
    /**
     * Generate default teams
     * @param {number} count - Number of teams
     * @returns {Array}
     */
    generateDefaultTeams(count) {
        return Array.from({ length: count }, (_, i) => 
            this.createTeam(null, null, 0, null, 0, i)
        );
    }
    
    /**
     * Split teams into groups
     * @param {Array} teams - Array of team objects
     * @param {string} method - 'snake', 'random', or 'manual'
     * @returns {Object} { groupA: [], groupB: [] }
     */
    splitIntoGroups(teams, method = 'snake') {
        if (this.groupMode === GROUP_MODES.SINGLE) {
            return {
                groupA: teams.map(t => t.id),
                groupB: []
            };
        }
        
        const halfSize = Math.ceil(teams.length / 2);
        let groupA = [];
        let groupB = [];
        
        if (method === 'random') {
            const shuffled = this.shuffleArray([...teams]);
            groupA = shuffled.slice(0, halfSize).map(t => t.id);
            groupB = shuffled.slice(halfSize).map(t => t.id);
        } else if (method === 'snake') {
            // Snake draft: sort by rating, then alternate
            const sorted = [...teams].sort((a, b) => b.combinedRating - a.combinedRating);
            sorted.forEach((team, index) => {
                // Snake pattern: 0,3,4,7,8... go to A; 1,2,5,6,9,10... go to B
                const cycle = Math.floor(index / 2);
                const position = index % 2;
                if (cycle % 2 === 0) {
                    if (position === 0) groupA.push(team.id);
                    else groupB.push(team.id);
                } else {
                    if (position === 0) groupB.push(team.id);
                    else groupA.push(team.id);
                }
            });
        } else {
            // Manual - just split in half
            groupA = teams.slice(0, halfSize).map(t => t.id);
            groupB = teams.slice(halfSize).map(t => t.id);
        }
        
        return { groupA, groupB };
    }
    
    /**
     * Generate round-robin fixtures for a group
     * @param {Array} teamIds - Array of team IDs in the group
     * @returns {Array} Array of rounds, each containing matches
     */
    generateRoundRobinFixtures(teamIds) {
        if (teamIds.length < 2) return [];
        
        const teams = [...teamIds];
        const isOdd = teams.length % 2 !== 0;
        
        // Add bye if odd number
        if (isOdd) {
            teams.push(null); // null represents bye
        }
        
        const rounds = [];
        const n = teams.length;
        const numRounds = n - 1;
        
        for (let round = 0; round < numRounds; round++) {
            const matches = [];
            
            for (let i = 0; i < n / 2; i++) {
                const home = teams[i];
                const away = teams[n - 1 - i];
                
                // Skip bye matches
                if (home !== null && away !== null) {
                    matches.push({
                        team1Id: home,
                        team2Id: away,
                        matchKey: `${home}-${away}`
                    });
                }
            }
            
            rounds.push({
                roundNumber: round + 1,
                matches
            });
            
            // Rotate teams (keep first team fixed)
            const last = teams.pop();
            teams.splice(1, 0, last);
        }
        
        return rounds;
    }
    
    /**
     * Calculate group standings
     * @param {Array} teamIds - Team IDs in the group
     * @param {Array} teams - Full teams array (for team info)
     * @param {Object} scores - Scores object keyed by matchKey
     * @returns {Array} Sorted standings
     */
    calculateGroupStandings(teamIds, teams, scores) {
        const standings = teamIds.map(teamId => {
            const team = teams.find(t => t.id === teamId);
            if (!team) return null;
            
            return {
                teamId,
                team,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                gamesFor: 0,
                gamesAgainst: 0,
                gamesDiff: 0,
                points: 0
            };
        }).filter(Boolean);
        
        // Process scores
        Object.entries(scores || {}).forEach(([matchKey, score]) => {
            if (score.team1Score === null || score.team2Score === null) return;
            
            const [team1Id, team2Id] = matchKey.split('-').map(Number);
            const team1Stats = standings.find(s => s.teamId === team1Id);
            const team2Stats = standings.find(s => s.teamId === team2Id);
            
            if (!team1Stats || !team2Stats) return;
            
            team1Stats.played++;
            team2Stats.played++;
            
            team1Stats.gamesFor += score.team1Score;
            team1Stats.gamesAgainst += score.team2Score;
            team2Stats.gamesFor += score.team2Score;
            team2Stats.gamesAgainst += score.team1Score;
            
            if (score.team1Score > score.team2Score) {
                team1Stats.won++;
                team1Stats.points += POINTS.WIN;
                team2Stats.lost++;
            } else if (score.team2Score > score.team1Score) {
                team2Stats.won++;
                team2Stats.points += POINTS.WIN;
                team1Stats.lost++;
            } else {
                team1Stats.drawn++;
                team2Stats.drawn++;
                team1Stats.points += POINTS.DRAW;
                team2Stats.points += POINTS.DRAW;
            }
        });
        
        // Calculate games diff
        standings.forEach(s => {
            s.gamesDiff = s.gamesFor - s.gamesAgainst;
        });
        
        // Sort standings
        standings.sort((a, b) => {
            // Primary: Points
            if (b.points !== a.points) return b.points - a.points;
            // Secondary: Game difference
            if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
            // Tertiary: Games for
            return b.gamesFor - a.gamesFor;
        });
        
        return standings;
    }
    
    /**
     * Get qualified teams from a group
     * @param {Array} standings - Group standings
     * @param {number} count - Number of teams to qualify
     * @returns {Array}
     */
    getQualifiedTeams(standings, count) {
        return standings.slice(0, count);
    }
    
    /**
     * Generate knockout bracket from group standings
     * @param {Array} groupAStandings - Group A standings
     * @param {Array} groupBStandings - Group B standings (empty for single group)
     * @returns {Object} Knockout bracket with team assignments
     */
    generateKnockoutBracket(groupAStandings, groupBStandings = []) {
        const bracket = {
            qf1: { team1: null, team2: null },
            qf2: { team1: null, team2: null },
            qf3: { team1: null, team2: null },
            qf4: { team1: null, team2: null },
            sf1: { team1: null, team2: null },
            sf2: { team1: null, team2: null },
            thirdPlace: { team1: null, team2: null },
            final: { team1: null, team2: null }
        };
        
        if (this.groupMode === GROUP_MODES.SINGLE) {
            // Single group: 1v8, 2v7, 3v6, 4v5
            if (groupAStandings.length >= 8) {
                bracket.qf1 = { 
                    team1: groupAStandings[0]?.teamId || null, 
                    team2: groupAStandings[7]?.teamId || null 
                };
                bracket.qf2 = { 
                    team1: groupAStandings[3]?.teamId || null, 
                    team2: groupAStandings[4]?.teamId || null 
                };
                bracket.qf3 = { 
                    team1: groupAStandings[1]?.teamId || null, 
                    team2: groupAStandings[6]?.teamId || null 
                };
                bracket.qf4 = { 
                    team1: groupAStandings[2]?.teamId || null, 
                    team2: groupAStandings[5]?.teamId || null 
                };
            }
        } else {
            // Two groups: A1vB4, A2vB3, B1vA4, B2vA3
            if (groupAStandings.length >= 4 && groupBStandings.length >= 4) {
                bracket.qf1 = { 
                    team1: groupAStandings[0]?.teamId || null, 
                    team2: groupBStandings[3]?.teamId || null 
                };
                bracket.qf2 = { 
                    team1: groupAStandings[1]?.teamId || null, 
                    team2: groupBStandings[2]?.teamId || null 
                };
                bracket.qf3 = { 
                    team1: groupBStandings[0]?.teamId || null, 
                    team2: groupAStandings[3]?.teamId || null 
                };
                bracket.qf4 = { 
                    team1: groupBStandings[1]?.teamId || null, 
                    team2: groupAStandings[2]?.teamId || null 
                };
            }
        }
        
        return bracket;
    }
    
    /**
     * Progress knockout bracket based on scores
     * @param {Object} bracket - Current bracket
     * @param {Object} scores - Knockout scores
     * @returns {Object} Updated bracket
     */
    updateKnockoutProgression(bracket, scores) {
        const getWinner = (matchId) => {
            const score = scores[matchId];
            if (!score || score.team1Score === null || score.team2Score === null) {
                return null;
            }
            if (score.team1Score > score.team2Score) {
                return bracket[matchId]?.team1;
            } else if (score.team2Score > score.team1Score) {
                return bracket[matchId]?.team2;
            }
            return null; // Draw - shouldn't happen in knockout
        };
        
        const getLoser = (matchId) => {
            const score = scores[matchId];
            if (!score || score.team1Score === null || score.team2Score === null) {
                return null;
            }
            if (score.team1Score > score.team2Score) {
                return bracket[matchId]?.team2;
            } else if (score.team2Score > score.team1Score) {
                return bracket[matchId]?.team1;
            }
            return null;
        };
        
        // QF winners to SF
        bracket.sf1.team1 = getWinner('qf1');
        bracket.sf1.team2 = getWinner('qf2');
        bracket.sf2.team1 = getWinner('qf3');
        bracket.sf2.team2 = getWinner('qf4');
        
        // SF winners to Final
        bracket.final.team1 = getWinner('sf1');
        bracket.final.team2 = getWinner('sf2');
        
        // SF losers to Third Place
        if (this.includeThirdPlace) {
            bracket.thirdPlace.team1 = getLoser('sf1');
            bracket.thirdPlace.team2 = getLoser('sf2');
        }
        
        return bracket;
    }
    
    /**
     * Get max score for knockout match
     * @param {string} matchId - Match ID
     * @returns {number}
     */
    getKnockoutMaxScore(matchId) {
        if (matchId === 'final') return this.finalMaxScore;
        if (matchId.startsWith('sf')) return this.semiMaxScore;
        if (matchId === 'thirdPlace') return this.thirdPlaceMaxScore;
        return this.knockoutMaxScore;
    }
    
    /**
     * Check if all group matches are complete
     * @param {Array} fixtures - Group fixtures
     * @param {Object} scores - Scores object
     * @returns {boolean}
     */
    isGroupComplete(fixtures, scores) {
        for (const round of fixtures) {
            for (const match of round.matches) {
                const score = scores[match.matchKey];
                if (!score || score.team1Score === null || score.team2Score === null) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * Get match statistics
     * @param {Array} groupAFixtures - Group A fixtures
     * @param {Array} groupBFixtures - Group B fixtures
     * @param {Object} groupAScores - Group A scores
     * @param {Object} groupBScores - Group B scores
     * @returns {Object} Stats summary
     */
    getMatchStats(groupAFixtures, groupBFixtures, groupAScores, groupBScores) {
        let totalMatches = 0;
        let completedMatches = 0;
        
        const countGroup = (fixtures, scores) => {
            for (const round of fixtures) {
                for (const match of round.matches) {
                    totalMatches++;
                    const score = scores[match.matchKey];
                    if (score && score.team1Score !== null && score.team2Score !== null) {
                        completedMatches++;
                    }
                }
            }
        };
        
        countGroup(groupAFixtures || [], groupAScores || {});
        countGroup(groupBFixtures || [], groupBScores || {});
        
        return {
            totalMatches,
            completedMatches,
            progress: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0
        };
    }
    
    /**
     * Validate team count
     * @param {number} count - Number of teams
     * @returns {Object} { valid: boolean, error?: string }
     */
    validateTeamCount(count) {
        if (count < 4) {
            return { valid: false, error: 'Minimum 4 teams required' };
        }
        if (count > 16) {
            return { valid: false, error: 'Maximum 16 teams allowed' };
        }
        if (this.groupMode === GROUP_MODES.TWO_GROUPS && count < 8) {
            return { valid: false, error: 'Two-group mode requires at least 8 teams' };
        }
        return { valid: true };
    }
}

// Export factory function
export function createTeamLeagueEngine(config = {}) {
    return new TeamLeagueEngine(config);
}

// Export constants
export { POINTS, GROUP_MODES, KNOCKOUT_FORMATS };

// Export class
export default TeamLeagueEngine;
