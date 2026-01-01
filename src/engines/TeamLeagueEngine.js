/**
 * TeamLeagueEngine.js - Team League Engine
 * Fixed teams compete in a league format
 * 
 * Phase 3: Shared Engines Extraction
 * 
 * @module engines/TeamLeagueEngine
 */

/**
 * Team League Engine
 * Handles fixed team league format
 */
class TeamLeagueEngine extends BaseEngine {
    /**
     * Configuration for Team League format
     */
    static CONFIG = {
        MIN_TEAMS: 3,
        MAX_TEAMS: 16,
        DEFAULT_TEAMS: 4,
        PLAYERS_PER_TEAM: 2,
        DEFAULT_POINTS_PER_MATCH: 21,
        POINTS_OPTIONS: [16, 21, 24, 32]
    };
    
    /**
     * Validate team count
     * 
     * @param {number} count 
     * @returns {boolean}
     */
    static validateTeamCount(count) {
        return count >= this.CONFIG.MIN_TEAMS && 
               count <= this.CONFIG.MAX_TEAMS;
    }
    
    /**
     * Generate round-robin fixtures for teams
     * 
     * @param {number} teamCount 
     * @returns {Object[]} Array of rounds with matches
     */
    static generateRoundRobinFixtures(teamCount) {
        const rounds = [];
        const teams = Array.from({ length: teamCount }, (_, i) => i);
        
        // If odd number of teams, add a "bye" team
        if (teamCount % 2 === 1) {
            teams.push(-1); // -1 represents bye
        }
        
        const numRounds = teams.length - 1;
        const halfSize = teams.length / 2;
        
        // Generate rounds using circle method
        const teamList = [...teams];
        const fixed = teamList.shift(); // Fix first team position
        
        for (let round = 0; round < numRounds; round++) {
            const roundMatches = [];
            
            // First match: fixed team vs first rotating team
            if (teamList[0] !== -1 && fixed !== -1) {
                roundMatches.push({
                    team1: fixed,
                    team2: teamList[0]
                });
            }
            
            // Other matches
            for (let i = 1; i < halfSize; i++) {
                const team1 = teamList[i];
                const team2 = teamList[teams.length - 1 - i];
                
                if (team1 !== -1 && team2 !== -1) {
                    roundMatches.push({
                        team1,
                        team2
                    });
                }
            }
            
            rounds.push({
                roundNumber: round,
                matches: roundMatches
            });
            
            // Rotate teams (except fixed)
            teamList.push(teamList.shift());
        }
        
        return rounds;
    }
    
    /**
     * Calculate team standings
     * 
     * @param {Object} params
     * @param {string[]} params.teamNames - Array of team names
     * @param {Object[]} params.rounds - Array of round objects
     * @param {Object} params.scores - Scores keyed by round-match
     * @returns {Object[]} Sorted team standings
     */
    static calculateTeamStandings({ teamNames, rounds, scores }) {
        const teamCount = teamNames.length;
        
        // Initialize team stats
        const teamStats = Array(teamCount).fill(null).map(() => ({
            played: 0,
            won: 0,
            lost: 0,
            drawn: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            leaguePoints: 0 // 3 for win, 1 for draw
        }));
        
        // Process all matches
        rounds.forEach((round, roundIndex) => {
            if (!round || !round.matches) return;
            
            round.matches.forEach((match, matchIndex) => {
                const scoreKey = `${roundIndex}_${matchIndex}`;
                const score = scores[scoreKey];
                
                if (!score || score.team1 === null || score.team2 === null) {
                    return;
                }
                
                const team1Idx = match.team1;
                const team2Idx = match.team2;
                
                if (team1Idx < 0 || team2Idx < 0) return; // Skip byes
                
                // Update team 1
                teamStats[team1Idx].played++;
                teamStats[team1Idx].pointsFor += score.team1;
                teamStats[team1Idx].pointsAgainst += score.team2;
                
                // Update team 2
                teamStats[team2Idx].played++;
                teamStats[team2Idx].pointsFor += score.team2;
                teamStats[team2Idx].pointsAgainst += score.team1;
                
                // Determine result
                if (score.team1 > score.team2) {
                    teamStats[team1Idx].won++;
                    teamStats[team1Idx].leaguePoints += 3;
                    teamStats[team2Idx].lost++;
                } else if (score.team2 > score.team1) {
                    teamStats[team2Idx].won++;
                    teamStats[team2Idx].leaguePoints += 3;
                    teamStats[team1Idx].lost++;
                } else {
                    teamStats[team1Idx].drawn++;
                    teamStats[team2Idx].drawn++;
                    teamStats[team1Idx].leaguePoints += 1;
                    teamStats[team2Idx].leaguePoints += 1;
                }
            });
        });
        
        // Build standings array
        return teamNames.map((name, index) => {
            const stats = teamStats[index];
            return {
                name: name || `Team ${index + 1}`,
                teamIndex: index,
                played: stats.played,
                won: stats.won,
                lost: stats.lost,
                drawn: stats.drawn,
                pointsFor: stats.pointsFor,
                pointsAgainst: stats.pointsAgainst,
                pointsDiff: stats.pointsFor - stats.pointsAgainst,
                leaguePoints: stats.leaguePoints
            };
        }).sort((a, b) => {
            // Primary: League points
            if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
            // Secondary: Point difference
            if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
            // Tertiary: Points for
            if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
            // Keep original order
            return a.teamIndex - b.teamIndex;
        });
    }
    
    /**
     * Calculate individual player standings from team results
     * 
     * @param {Object} params
     * @param {Object[]} params.teams - Array of team objects with players
     * @param {Object[]} params.rounds - Round fixtures
     * @param {Object} params.scores - Match scores
     * @returns {Object[]} Player standings
     */
    static calculatePlayerStandings({ teams, rounds, scores }) {
        // Build player stats from team results
        const playerStats = {};
        
        teams.forEach((team, teamIndex) => {
            if (!team.players) return;
            
            team.players.forEach(playerName => {
                if (!playerStats[playerName]) {
                    playerStats[playerName] = {
                        name: playerName,
                        teamIndex,
                        teamName: team.name || `Team ${teamIndex + 1}`,
                        played: 0,
                        won: 0,
                        lost: 0,
                        drawn: 0,
                        pointsFor: 0,
                        pointsAgainst: 0
                    };
                }
            });
        });
        
        // Aggregate from match results
        rounds.forEach((round, roundIndex) => {
            if (!round || !round.matches) return;
            
            round.matches.forEach((match, matchIndex) => {
                const scoreKey = `${roundIndex}_${matchIndex}`;
                const score = scores[scoreKey];
                
                if (!score || score.team1 === null || score.team2 === null) return;
                
                const team1 = teams[match.team1];
                const team2 = teams[match.team2];
                
                if (!team1 || !team2) return;
                
                // Update team 1 players
                (team1.players || []).forEach(playerName => {
                    if (!playerStats[playerName]) return;
                    
                    playerStats[playerName].played++;
                    playerStats[playerName].pointsFor += score.team1;
                    playerStats[playerName].pointsAgainst += score.team2;
                    
                    if (score.team1 > score.team2) {
                        playerStats[playerName].won++;
                    } else if (score.team1 < score.team2) {
                        playerStats[playerName].lost++;
                    } else {
                        playerStats[playerName].drawn++;
                    }
                });
                
                // Update team 2 players
                (team2.players || []).forEach(playerName => {
                    if (!playerStats[playerName]) return;
                    
                    playerStats[playerName].played++;
                    playerStats[playerName].pointsFor += score.team2;
                    playerStats[playerName].pointsAgainst += score.team1;
                    
                    if (score.team2 > score.team1) {
                        playerStats[playerName].won++;
                    } else if (score.team2 < score.team1) {
                        playerStats[playerName].lost++;
                    } else {
                        playerStats[playerName].drawn++;
                    }
                });
            });
        });
        
        // Sort by points for
        return Object.values(playerStats).sort((a, b) => {
            const diffA = a.pointsFor - a.pointsAgainst;
            const diffB = b.pointsFor - b.pointsAgainst;
            if (diffB !== diffA) return diffB - diffA;
            return b.pointsFor - a.pointsFor;
        });
    }
    
    /**
     * Get head-to-head record between two teams
     * 
     * @param {number} team1Index 
     * @param {number} team2Index 
     * @param {Object[]} rounds 
     * @param {Object} scores 
     * @returns {Object}
     */
    static getHeadToHead(team1Index, team2Index, rounds, scores) {
        let team1Wins = 0;
        let team2Wins = 0;
        let draws = 0;
        let team1Points = 0;
        let team2Points = 0;
        
        rounds.forEach((round, roundIndex) => {
            if (!round || !round.matches) return;
            
            round.matches.forEach((match, matchIndex) => {
                const isMatch = 
                    (match.team1 === team1Index && match.team2 === team2Index) ||
                    (match.team1 === team2Index && match.team2 === team1Index);
                
                if (!isMatch) return;
                
                const scoreKey = `${roundIndex}_${matchIndex}`;
                const score = scores[scoreKey];
                
                if (!score || score.team1 === null) return;
                
                // Determine which score belongs to which team
                if (match.team1 === team1Index) {
                    team1Points += score.team1;
                    team2Points += score.team2;
                    if (score.team1 > score.team2) team1Wins++;
                    else if (score.team2 > score.team1) team2Wins++;
                    else draws++;
                } else {
                    team1Points += score.team2;
                    team2Points += score.team1;
                    if (score.team2 > score.team1) team1Wins++;
                    else if (score.team1 > score.team2) team2Wins++;
                    else draws++;
                }
            });
        });
        
        return {
            team1Wins,
            team2Wins,
            draws,
            team1Points,
            team2Points,
            matches: team1Wins + team2Wins + draws
        };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TeamLeagueEngine };
}

if (typeof window !== 'undefined') {
    window.TeamLeagueEngine = TeamLeagueEngine;
}
