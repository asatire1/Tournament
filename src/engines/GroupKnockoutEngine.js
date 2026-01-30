/**
 * GroupKnockoutEngine.js - Group Stage + Knockout Tournament Engine
 *
 * Format: 3 groups of players forming fixed pairs (teams)
 * - Group stage: Round-robin within groups, Win=3pts, Draw=1pt
 * - Qualification: Top 2 from each group + best 3rd place teams
 * - Knockout: QF (first to 12), SF (first to 13), Final (first to 15)
 *
 * @module engines/GroupKnockoutEngine
 */

class GroupKnockoutEngine extends BaseEngine {
    /**
     * Configuration for Group Knockout format
     */
    static CONFIG = {
        // Player configuration
        MIN_PLAYERS: 12,
        MAX_PLAYERS: 36,
        DEFAULT_PLAYERS: 27,
        PLAYERS_PER_TEAM: 2,

        // Group configuration
        DEFAULT_GROUPS: 3,
        MIN_GROUPS: 2,
        MAX_GROUPS: 4,

        // Match points
        GROUP_STAGE_POINTS: 16,
        QUARTER_FINAL_POINTS: 23,  // First to 12 wins
        SEMI_FINAL_POINTS: 25,     // First to 13 wins
        FINAL_POINTS: 29,          // First to 15 wins

        // League points
        WIN_POINTS: 3,
        DRAW_POINTS: 1,
        LOSS_POINTS: 0,

        // Serves
        SERVES_PER_PLAYER: 4
    };

    /**
     * Validate player count for tournament
     * @param {number} count - Number of players
     * @param {number} groups - Number of groups
     * @returns {Object} { valid: boolean, message: string }
     */
    static validatePlayerCount(count, groups = 3) {
        if (count < this.CONFIG.MIN_PLAYERS) {
            return { valid: false, message: `Minimum ${this.CONFIG.MIN_PLAYERS} players required` };
        }
        if (count > this.CONFIG.MAX_PLAYERS) {
            return { valid: false, message: `Maximum ${this.CONFIG.MAX_PLAYERS} players allowed` };
        }
        if (count % 2 !== 0) {
            return { valid: false, message: 'Player count must be even (for teams of 2)' };
        }

        const teamsPerGroup = Math.floor((count / 2) / groups);
        if (teamsPerGroup < 3) {
            return { valid: false, message: 'Need at least 3 teams per group' };
        }

        return { valid: true, message: 'Valid configuration' };
    }

    /**
     * Create teams from player list
     * @param {string[]} players - Array of player names
     * @returns {Object[]} Array of team objects
     */
    static createTeamsFromPlayers(players) {
        const teams = [];
        for (let i = 0; i < players.length; i += 2) {
            teams.push({
                id: Math.floor(i / 2),
                name: `${players[i]} & ${players[i + 1]}`,
                players: [players[i], players[i + 1]],
                groupIndex: -1 // Will be assigned later
            });
        }
        return teams;
    }

    /**
     * Distribute teams into groups
     * @param {Object[]} teams - Array of team objects
     * @param {number} groupCount - Number of groups
     * @returns {Object[]} Array of group objects with teams
     */
    static distributeTeamsToGroups(teams, groupCount = 3) {
        const groups = Array.from({ length: groupCount }, (_, i) => ({
            groupIndex: i,
            groupName: String.fromCharCode(65 + i), // A, B, C, D
            teams: [],
            fixtures: [],
            standings: []
        }));

        // Distribute teams evenly across groups
        teams.forEach((team, index) => {
            const groupIndex = index % groupCount;
            team.groupIndex = groupIndex;
            groups[groupIndex].teams.push({
                ...team,
                teamIndexInGroup: groups[groupIndex].teams.length
            });
        });

        return groups;
    }

    /**
     * Generate round-robin fixtures for a single group
     * @param {Object[]} teams - Teams in the group
     * @returns {Object[]} Array of rounds with matches
     */
    static generateGroupFixtures(teams) {
        const teamCount = teams.length;
        const rounds = [];
        const teamIndices = teams.map((_, i) => i);

        // If odd number of teams, add a "bye"
        if (teamCount % 2 === 1) {
            teamIndices.push(-1);
        }

        const numRounds = teamIndices.length - 1;
        const halfSize = teamIndices.length / 2;

        const rotatingTeams = [...teamIndices];
        const fixed = rotatingTeams.shift();

        for (let round = 0; round < numRounds; round++) {
            const roundMatches = [];

            // First match: fixed vs first rotating
            if (rotatingTeams[0] !== -1 && fixed !== -1) {
                roundMatches.push({
                    team1Index: fixed,
                    team2Index: rotatingTeams[0],
                    team1: teams[fixed],
                    team2: teams[rotatingTeams[0]]
                });
            }

            // Remaining matches
            for (let i = 1; i < halfSize; i++) {
                const t1 = rotatingTeams[i];
                const t2 = rotatingTeams[teamIndices.length - 1 - i];

                if (t1 !== -1 && t2 !== -1) {
                    roundMatches.push({
                        team1Index: t1,
                        team2Index: t2,
                        team1: teams[t1],
                        team2: teams[t2]
                    });
                }
            }

            rounds.push({
                roundNumber: round + 1,
                matches: roundMatches
            });

            // Rotate
            rotatingTeams.push(rotatingTeams.shift());
        }

        return rounds;
    }

    /**
     * Generate fixtures for all groups
     * @param {Object[]} groups - Array of group objects
     * @returns {Object[]} Groups with fixtures added
     */
    static generateAllGroupFixtures(groups) {
        return groups.map(group => ({
            ...group,
            fixtures: this.generateGroupFixtures(group.teams)
        }));
    }

    /**
     * Calculate standings for a single group
     * @param {Object} group - Group object with teams and fixtures
     * @param {Object} scores - Scores keyed by groupIndex_roundIndex_matchIndex
     * @returns {Object[]} Sorted standings array
     */
    static calculateGroupStandings(group, scores) {
        const { teams, fixtures, groupIndex } = group;

        // Initialize stats for each team
        const teamStats = teams.map((team, idx) => ({
            teamIndex: idx,
            team: team,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
        }));

        // Process all matches
        fixtures.forEach((round, roundIndex) => {
            round.matches.forEach((match, matchIndex) => {
                const scoreKey = `${groupIndex}_${roundIndex}_${matchIndex}`;
                const score = scores[scoreKey];

                if (!score || score.team1 === null || score.team2 === null) {
                    return;
                }

                const team1Stats = teamStats[match.team1Index];
                const team2Stats = teamStats[match.team2Index];

                // Update games played
                team1Stats.played++;
                team2Stats.played++;

                // Update goals
                team1Stats.goalsFor += score.team1;
                team1Stats.goalsAgainst += score.team2;
                team2Stats.goalsFor += score.team2;
                team2Stats.goalsAgainst += score.team1;

                // Update results
                if (score.team1 > score.team2) {
                    team1Stats.won++;
                    team1Stats.points += this.CONFIG.WIN_POINTS;
                    team2Stats.lost++;
                } else if (score.team2 > score.team1) {
                    team2Stats.won++;
                    team2Stats.points += this.CONFIG.WIN_POINTS;
                    team1Stats.lost++;
                } else {
                    team1Stats.drawn++;
                    team2Stats.drawn++;
                    team1Stats.points += this.CONFIG.DRAW_POINTS;
                    team2Stats.points += this.CONFIG.DRAW_POINTS;
                }
            });
        });

        // Calculate goal difference
        teamStats.forEach(stats => {
            stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
        });

        // Sort by: Points > Goal Difference > Goals Scored
        return teamStats.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return a.teamIndex - b.teamIndex;
        });
    }

    /**
     * Calculate standings for all groups
     * @param {Object[]} groups - Array of groups
     * @param {Object} scores - All scores
     * @returns {Object[]} Groups with standings
     */
    static calculateAllGroupStandings(groups, scores) {
        return groups.map(group => ({
            ...group,
            standings: this.calculateGroupStandings(group, scores)
        }));
    }

    /**
     * Determine qualified teams from group standings
     * @param {Object[]} groups - Groups with calculated standings
     * @returns {Object} { potA: [], potB: [], allQualified: [] }
     */
    static determineQualifiedTeams(groups) {
        const groupCount = groups.length;

        // Collect top 2 from each group
        const firstPlaceTeams = [];
        const secondPlaceTeams = [];
        const thirdPlaceTeams = [];

        groups.forEach((group, groupIndex) => {
            const standings = group.standings;

            if (standings[0]) {
                firstPlaceTeams.push({
                    ...standings[0],
                    groupIndex,
                    groupName: group.groupName,
                    position: 1
                });
            }
            if (standings[1]) {
                secondPlaceTeams.push({
                    ...standings[1],
                    groupIndex,
                    groupName: group.groupName,
                    position: 2
                });
            }
            if (standings[2]) {
                thirdPlaceTeams.push({
                    ...standings[2],
                    groupIndex,
                    groupName: group.groupName,
                    position: 3
                });
            }
        });

        // Sort 2nd place teams by points/GD/GF to find best 2nd
        secondPlaceTeams.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });

        // Sort 3rd place teams
        thirdPlaceTeams.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });

        // Pot A: All group winners + best 2nd place team
        const potA = [
            ...firstPlaceTeams,
            secondPlaceTeams[0] // Best 2nd place
        ].filter(Boolean);

        // Pot B: Remaining 2nd place teams + best 3rd place teams (to make 8 total)
        const potB = [];

        // Add remaining 2nd place teams
        for (let i = 1; i < secondPlaceTeams.length; i++) {
            potB.push(secondPlaceTeams[i]);
        }

        // Add best 3rd place teams to reach 8 total qualifiers
        const totalNeeded = 8;
        const currentTotal = potA.length + potB.length;
        const thirdPlaceNeeded = Math.min(totalNeeded - currentTotal, thirdPlaceTeams.length);

        for (let i = 0; i < thirdPlaceNeeded; i++) {
            potB.push(thirdPlaceTeams[i]);
        }

        // Sort pots by points for seeding
        potA.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.goalDifference - a.goalDifference;
        });

        potB.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.goalDifference - a.goalDifference;
        });

        return {
            potA,
            potB,
            allQualified: [...potA, ...potB],
            firstPlaceTeams,
            secondPlaceTeams,
            thirdPlaceTeams
        };
    }

    /**
     * Generate knockout bracket from qualified teams
     * Ensures teams from same group don't meet in QF (where possible)
     *
     * @param {Object} qualified - { potA, potB }
     * @returns {Object} Knockout bracket structure
     */
    static generateKnockoutBracket(qualified) {
        const { potA, potB } = qualified;

        // Standard 8-team bracket: Pot A teams vs Pot B teams
        // Seeding: 1A vs 4B, 2A vs 3B, 3A vs 2B, 4A vs 1B
        const quarterFinals = [];

        for (let i = 0; i < Math.min(potA.length, potB.length); i++) {
            const potATeam = potA[i];
            // Match with opposite end of Pot B
            const potBIndex = potB.length - 1 - i;
            const potBTeam = potB[potBIndex] || potB[i];

            // Check for same group clash and try to swap
            let finalPotBTeam = potBTeam;
            if (potATeam && potBTeam && potATeam.groupIndex === potBTeam.groupIndex) {
                // Try to find a swap partner
                for (let j = 0; j < potB.length; j++) {
                    if (j !== potBIndex && potB[j] && potB[j].groupIndex !== potATeam.groupIndex) {
                        finalPotBTeam = potB[j];
                        break;
                    }
                }
            }

            quarterFinals.push({
                matchNumber: i + 1,
                team1: potATeam,
                team2: finalPotBTeam,
                seed1: i + 1,
                seed2: potB.length - i,
                winner: null,
                score: { team1: null, team2: null }
            });
        }

        // Semi-finals placeholders
        const semiFinals = [
            {
                matchNumber: 1,
                team1: null, // Winner of QF1
                team2: null, // Winner of QF2
                sourceMatch1: 0,
                sourceMatch2: 1,
                winner: null,
                score: { team1: null, team2: null }
            },
            {
                matchNumber: 2,
                team1: null, // Winner of QF3
                team2: null, // Winner of QF4
                sourceMatch1: 2,
                sourceMatch2: 3,
                winner: null,
                score: { team1: null, team2: null }
            }
        ];

        // Final placeholder
        const final = {
            matchNumber: 1,
            team1: null, // Winner of SF1
            team2: null, // Winner of SF2
            sourceMatch1: 0,
            sourceMatch2: 1,
            winner: null,
            score: { team1: null, team2: null }
        };

        return {
            quarterFinals,
            semiFinals,
            final,
            champion: null
        };
    }

    /**
     * Get match points for knockout stage
     * @param {string} stage - 'quarterFinal', 'semiFinal', 'final'
     * @returns {number} Total points for the match
     */
    static getKnockoutMatchPoints(stage) {
        switch (stage) {
            case 'quarterFinal':
                return this.CONFIG.QUARTER_FINAL_POINTS;
            case 'semiFinal':
                return this.CONFIG.SEMI_FINAL_POINTS;
            case 'final':
                return this.CONFIG.FINAL_POINTS;
            default:
                return this.CONFIG.GROUP_STAGE_POINTS;
        }
    }

    /**
     * Get winning score for knockout stage
     * @param {string} stage
     * @returns {number} Points needed to win
     */
    static getWinningScore(stage) {
        const total = this.getKnockoutMatchPoints(stage);
        return Math.ceil(total / 2);
    }

    /**
     * Update knockout bracket with match result
     * @param {Object} bracket - Current bracket state
     * @param {string} stage - 'quarterFinal', 'semiFinal', 'final'
     * @param {number} matchIndex - Match index within stage
     * @param {Object} score - { team1, team2 }
     * @returns {Object} Updated bracket
     */
    static updateKnockoutResult(bracket, stage, matchIndex, score) {
        const updatedBracket = JSON.parse(JSON.stringify(bracket));

        let match;
        if (stage === 'quarterFinal') {
            match = updatedBracket.quarterFinals[matchIndex];
        } else if (stage === 'semiFinal') {
            match = updatedBracket.semiFinals[matchIndex];
        } else if (stage === 'final') {
            match = updatedBracket.final;
        }

        if (!match) return updatedBracket;

        match.score = score;

        // Determine winner
        if (score.team1 !== null && score.team2 !== null) {
            match.winner = score.team1 > score.team2 ? match.team1 : match.team2;

            // Advance winner to next round
            if (stage === 'quarterFinal') {
                const sfIndex = Math.floor(matchIndex / 2);
                const position = matchIndex % 2 === 0 ? 'team1' : 'team2';
                updatedBracket.semiFinals[sfIndex][position] = match.winner;
            } else if (stage === 'semiFinal') {
                const position = matchIndex === 0 ? 'team1' : 'team2';
                updatedBracket.final[position] = match.winner;
            } else if (stage === 'final') {
                updatedBracket.champion = match.winner;
            }
        }

        return updatedBracket;
    }

    /**
     * Check if group stage is complete
     * @param {Object[]} groups - Groups with fixtures
     * @param {Object} scores - All scores
     * @returns {boolean}
     */
    static isGroupStageComplete(groups, scores) {
        for (const group of groups) {
            for (let roundIndex = 0; roundIndex < group.fixtures.length; roundIndex++) {
                for (let matchIndex = 0; matchIndex < group.fixtures[roundIndex].matches.length; matchIndex++) {
                    const scoreKey = `${group.groupIndex}_${roundIndex}_${matchIndex}`;
                    const score = scores[scoreKey];
                    if (!score || score.team1 === null || score.team2 === null) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Check if knockout stage is complete
     * @param {Object} bracket
     * @returns {boolean}
     */
    static isKnockoutComplete(bracket) {
        return bracket && bracket.champion !== null;
    }

    /**
     * Get tournament summary
     * @param {Object} tournamentData
     * @returns {Object}
     */
    static getTournamentSummary(tournamentData) {
        const { groups, scores, bracket, meta } = tournamentData;

        const groupsWithStandings = this.calculateAllGroupStandings(groups, scores || {});
        const groupStageComplete = this.isGroupStageComplete(groups, scores || {});
        const knockoutComplete = bracket ? this.isKnockoutComplete(bracket) : false;

        let totalMatches = 0;
        let completedMatches = 0;

        groups.forEach(group => {
            group.fixtures.forEach((round, roundIndex) => {
                round.matches.forEach((match, matchIndex) => {
                    totalMatches++;
                    const scoreKey = `${group.groupIndex}_${roundIndex}_${matchIndex}`;
                    if (scores && scores[scoreKey] && scores[scoreKey].team1 !== null) {
                        completedMatches++;
                    }
                });
            });
        });

        // Add knockout matches
        if (bracket) {
            totalMatches += bracket.quarterFinals.length + bracket.semiFinals.length + 1;
            bracket.quarterFinals.forEach(m => m.winner && completedMatches++);
            bracket.semiFinals.forEach(m => m.winner && completedMatches++);
            if (bracket.final.winner) completedMatches++;
        }

        return {
            name: meta?.name || 'Unnamed Tournament',
            totalPlayers: groups.reduce((sum, g) => sum + g.teams.length * 2, 0),
            totalTeams: groups.reduce((sum, g) => sum + g.teams.length, 0),
            groupCount: groups.length,
            totalMatches,
            completedMatches,
            progress: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
            groupStageComplete,
            knockoutComplete,
            champion: bracket?.champion?.team?.name || null
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GroupKnockoutEngine;
}
