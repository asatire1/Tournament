// ===== ROUND ROBIN CONFIGURATION =====

// Get limits from shared config (falls back to defaults if not loaded)
const _sharedRRConfig = typeof FORMAT_CONFIG !== 'undefined' ? FORMAT_CONFIG['round-robin'] : null;

const CONFIG = {
    // Firebase paths
    FIREBASE_ROOT: 'roundrobin-tournaments',

    // Format identifier
    FORMAT_TYPE: 'round_robin',

    // Team Settings (from shared config)
    DEFAULT_TEAM_COUNT: 8,
    MIN_TEAMS: _sharedRRConfig?.minTeams ?? 4,
    MAX_TEAMS: _sharedRRConfig?.maxTeams ?? 24,

    // Match Settings (from shared config)
    DEFAULT_MAX_SCORE: _sharedRRConfig?.defaults?.pointsPerMatch ?? 16,

    // Points System
    POINTS_WIN: 3,
    POINTS_DRAW: 1,
    POINTS_LOSS: 0,

    // Version Control
    MAX_SAVED_VERSIONS: 10
};

// ===== UTILITY FUNCTIONS =====

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
 * Calculate standings from match results
 */
function calculateStandings(teams, matchScores) {
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

console.log('✅ Round Robin Config loaded');
