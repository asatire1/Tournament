// ===== TEAM LEAGUE CONFIGURATION =====

const CONFIG = {
    // Format identifier
    FORMAT_TYPE: 'team_league',
    
    // Team Settings
    DEFAULT_TEAM_COUNT: 22,
    MIN_TEAMS: 4,
    MAX_TEAMS: 24,
    
    // Group Settings
    GROUP_MODES: {
        SINGLE: 'single_group',
        TWO_GROUPS: 'two_groups'
    },
    DEFAULT_GROUP_MODE: 'two_groups',
    
    // Knockout Qualification
    KNOCKOUT_QUALIFIERS: {
        SINGLE_GROUP: 8,    // Top 8 from single group
        TWO_GROUPS: 4       // Top 4 from each group
    },
    
    // Match Settings
    DEFAULT_MAX_SCORE: 16,
    KNOCKOUT_MAX_SCORE: 16,
    SEMI_MAX_SCORE: 16,
    THIRD_PLACE_MAX_SCORE: 16,
    FINAL_MAX_SCORE: 16,
    
    // Points System
    POINTS_WIN: 3,
    POINTS_DRAW: 1,
    POINTS_LOSS: 0,
    
    // Knockout Seeding (Two Groups)
    TWO_GROUP_SEEDING: {
        qf1: { team1: 'A1', team2: 'B4' },
        qf2: { team1: 'A2', team2: 'B3' },
        qf3: { team1: 'A3', team2: 'B2' },
        qf4: { team1: 'A4', team2: 'B1' }
    },
    
    // Knockout Seeding (Single Group - Top 8)
    SINGLE_GROUP_SEEDING: {
        qf1: { team1: 1, team2: 8 },
        qf2: { team1: 2, team2: 7 },
        qf3: { team1: 3, team2: 6 },
        qf4: { team1: 4, team2: 5 }
    },
    
    // Optional Features
    INCLUDE_THIRD_PLACE: true,
    
    // Display Settings
    GROUP_LABELS: {
        A: 'Group A',
        B: 'Group B'
    },
    
    // Team Tiers (based on combined rating, 0-10 scale)
    TEAM_TIERS: {
        ELITE: { min: 7.0, max: 10.0, name: 'Elite', class: 'team-tier-elite' },
        ADVANCED: { min: 6.0, max: 6.99, name: 'Advanced', class: 'team-tier-advanced' },
        INTERMEDIATE_PLUS: { min: 5.5, max: 5.99, name: 'Intermediate+', class: 'team-tier-intermediate-plus' },
        INTERMEDIATE: { min: 5.0, max: 5.49, name: 'Intermediate', class: 'team-tier-intermediate' },
        BEGINNER_PLUS: { min: 4.5, max: 4.99, name: 'Beginner+', class: 'team-tier-beginner-plus' },
        BEGINNER: { min: 0, max: 4.49, name: 'Beginner', class: 'team-tier-beginner' }
    },
    
    // Version Control
    MAX_SAVED_VERSIONS: 10
};

// ===== UTILITY FUNCTIONS =====

/**
 * Get tier key for a team based on combined rating
 */
function getTeamTier(combinedRating) {
    for (const [key, tier] of Object.entries(CONFIG.TEAM_TIERS)) {
        if (combinedRating >= tier.min && combinedRating <= tier.max) {
            return key.toLowerCase().replace(/_/g, '-');
        }
    }
    return 'beginner';
}

/**
 * Get tier name for a team based on combined rating
 */
function getTeamTierName(combinedRating) {
    for (const tier of Object.values(CONFIG.TEAM_TIERS)) {
        if (combinedRating >= tier.min && combinedRating <= tier.max) {
            return tier.name;
        }
    }
    return 'Beginner';
}

/**
 * Get tier CSS class for a team based on combined rating
 */
function getTeamTierClass(combinedRating) {
    for (const tier of Object.values(CONFIG.TEAM_TIERS)) {
        if (combinedRating >= tier.min && combinedRating <= tier.max) {
            return tier.class;
        }
    }
    return 'team-tier-beginner';
}

/**
 * 24 distinct team colours - assigned by team ID for visual variety
 * Ordered from "strongest looking" to softer colours
 */
const TEAM_COLOURS = [
    'team-color-1',   // Red
    'team-color-2',   // Purple
    'team-color-3',   // Blue
    'team-color-4',   // Green
    'team-color-5',   // Orange
    'team-color-6',   // Teal
    'team-color-7',   // Pink
    'team-color-8',   // Indigo
    'team-color-9',   // Emerald
    'team-color-10',  // Amber
    'team-color-11',  // Cyan
    'team-color-12',  // Rose
    'team-color-13',  // Violet
    'team-color-14',  // Lime
    'team-color-15',  // Fuchsia
    'team-color-16',  // Sky
    'team-color-17',  // Yellow
    'team-color-18',  // Slate
    'team-color-19',  // Stone
    'team-color-20',  // Zinc
    'team-color-21',  // Red Light
    'team-color-22',  // Blue Light
    'team-color-23',  // Green Light
    'team-color-24',  // Purple Light
];

/**
 * Get team colour class based on team ID
 * Team 1 gets the "strongest" colour (red), Team 24 gets the last colour
 */
function getTeamColourClass(teamId) {
    const index = ((teamId - 1) % 24);
    return TEAM_COLOURS[index];
}

/**
 * Generate default team name from two player names
 */
function generateTeamName(player1Name, player2Name) {
    const p1 = player1Name.split(' ')[0];
    const p2 = player2Name.split(' ')[0];
    return `${p1} & ${p2}`;
}

/**
 * Calculate combined rating from two player ratings
 */
function calculateCombinedRating(player1Rating, player2Rating) {
    return parseFloat((player1Rating + player2Rating).toFixed(2));
}

/**
 * Split teams into two balanced groups based on combined rating
 * Uses snake draft: 1-A, 2-B, 3-B, 4-A, 5-A, 6-B, etc.
 */
function splitTeamsIntoGroups(teams) {
    // Sort teams by combined rating (highest first)
    const sorted = [...teams].sort((a, b) => b.combinedRating - a.combinedRating);
    
    const groupA = [];
    const groupB = [];
    
    // Snake draft for balanced groups
    sorted.forEach((team, index) => {
        const round = Math.floor(index / 2);
        const isEvenRound = round % 2 === 0;
        const isFirstInPair = index % 2 === 0;
        
        if ((isEvenRound && isFirstInPair) || (!isEvenRound && !isFirstInPair)) {
            groupA.push({ ...team, group: 'A' });
        } else {
            groupB.push({ ...team, group: 'B' });
        }
    });
    
    return { groupA, groupB };
}

/**
 * Generate round-robin fixtures for a group
 * Returns array of rounds, each containing match pairings
 */
function generateRoundRobinFixtures(teams) {
    const n = teams.length;
    const rounds = [];
    
    // If odd number of teams, add a "bye" team
    const teamList = [...teams];
    if (n % 2 !== 0) {
        teamList.push({ id: 'BYE', name: 'BYE', isBye: true });
    }
    
    const numTeams = teamList.length;
    const numRounds = numTeams - 1;
    const halfSize = numTeams / 2;
    
    // Create initial array of team indices (excluding first team for rotation)
    const teamIndices = teamList.map((_, i) => i).slice(1);
    
    for (let round = 0; round < numRounds; round++) {
        const roundMatches = [];
        
        // First team (index 0) stays fixed
        const firstTeamIndex = 0;
        const lastTeamIndex = teamIndices[teamIndices.length - 1];
        
        // First match: team 0 vs last in rotation
        if (!teamList[firstTeamIndex].isBye && !teamList[lastTeamIndex].isBye) {
            roundMatches.push({
                team1Id: teamList[firstTeamIndex].id,
                team2Id: teamList[lastTeamIndex].id
            });
        }
        
        // Remaining matches: pair from outside in
        for (let i = 0; i < halfSize - 1; i++) {
            const team1Index = teamIndices[i];
            const team2Index = teamIndices[teamIndices.length - 2 - i];
            
            if (!teamList[team1Index].isBye && !teamList[team2Index].isBye) {
                roundMatches.push({
                    team1Id: teamList[team1Index].id,
                    team2Id: teamList[team2Index].id
                });
            }
        }
        
        rounds.push({
            round: round + 1,
            matches: roundMatches
        });
        
        // Rotate: move last element to front (excluding position 0)
        teamIndices.unshift(teamIndices.pop());
    }
    
    return rounds;
}

/**
 * Get knockout matchups based on group standings
 */
function getKnockoutMatchups(groupAStandings, groupBStandings, groupMode) {
    if (groupMode === CONFIG.GROUP_MODES.SINGLE) {
        // Single group: top 8
        const seeding = CONFIG.SINGLE_GROUP_SEEDING;
        return {
            qf1: { team1: groupAStandings[seeding.qf1.team1 - 1], team2: groupAStandings[seeding.qf1.team2 - 1] },
            qf2: { team1: groupAStandings[seeding.qf2.team1 - 1], team2: groupAStandings[seeding.qf2.team2 - 1] },
            qf3: { team1: groupAStandings[seeding.qf3.team1 - 1], team2: groupAStandings[seeding.qf3.team2 - 1] },
            qf4: { team1: groupAStandings[seeding.qf4.team1 - 1], team2: groupAStandings[seeding.qf4.team2 - 1] }
        };
    } else {
        // Two groups: A1vB4, A2vB3, A3vB2, A4vB1
        return {
            qf1: { team1: groupAStandings[0], team2: groupBStandings[3] },
            qf2: { team1: groupAStandings[1], team2: groupBStandings[2] },
            qf3: { team1: groupAStandings[2], team2: groupBStandings[1] },
            qf4: { team1: groupAStandings[3], team2: groupBStandings[0] }
        };
    }
}

/**
 * Calculate group standings from match results
 */
function calculateGroupStandings(teams, matchScores) {
    const standings = teams.map(team => ({
        teamId: team.id,
        team: team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        gamesDiff: 0,
        points: 0
    }));
    
    // Process each match
    for (const [matchKey, score] of Object.entries(matchScores)) {
        if (score.team1Score === null || score.team2Score === null) continue;
        
        const [team1Id, team2Id] = matchKey.split('-').map(Number);
        const team1Stats = standings.find(s => s.teamId === team1Id);
        const team2Stats = standings.find(s => s.teamId === team2Id);
        
        if (!team1Stats || !team2Stats) continue;
        
        // Update games played
        team1Stats.played++;
        team2Stats.played++;
        
        // Update games for/against
        team1Stats.gamesFor += score.team1Score;
        team1Stats.gamesAgainst += score.team2Score;
        team2Stats.gamesFor += score.team2Score;
        team2Stats.gamesAgainst += score.team1Score;
        
        // Determine winner
        if (score.team1Score > score.team2Score) {
            team1Stats.won++;
            team1Stats.points += CONFIG.POINTS_WIN;
            team2Stats.lost++;
            team2Stats.points += CONFIG.POINTS_LOSS;
        } else if (score.team2Score > score.team1Score) {
            team2Stats.won++;
            team2Stats.points += CONFIG.POINTS_WIN;
            team1Stats.lost++;
            team1Stats.points += CONFIG.POINTS_LOSS;
        } else {
            team1Stats.drawn++;
            team2Stats.drawn++;
            team1Stats.points += CONFIG.POINTS_DRAW;
            team2Stats.points += CONFIG.POINTS_DRAW;
        }
    }
    
    // Calculate games difference
    standings.forEach(s => {
        s.gamesDiff = s.gamesFor - s.gamesAgainst;
    });
    
    // Sort by: points, then games diff, then games for
    standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
        return b.gamesFor - a.gamesFor;
    });
    
    return standings;
}

/**
 * Validate team count for group mode
 */
function validateTeamCount(teamCount, groupMode) {
    if (groupMode === CONFIG.GROUP_MODES.TWO_GROUPS) {
        if (teamCount % 2 !== 0) {
            return { valid: false, message: 'Team count must be even for two groups' };
        }
        if (teamCount < 8) {
            return { valid: false, message: 'Need at least 8 teams for two groups (4 per group)' };
        }
    } else {
        if (teamCount < 8) {
            return { valid: false, message: 'Need at least 8 teams for knockout stage' };
        }
    }
    return { valid: true };
}

console.log('✅ Team Tournament Config loaded');
