// ===== SWISS SYSTEM CONFIGURATION =====

// Get limits from shared config (falls back to defaults if not loaded)
const _sharedSwissConfig = typeof FORMAT_CONFIG !== 'undefined' ? FORMAT_CONFIG['swiss'] : null;

const CONFIG = {
    // Firebase paths
    FIREBASE_ROOT: 'swiss-tournaments',

    // Format identifier
    FORMAT_TYPE: 'swiss',

    // Team Settings (from shared config)
    DEFAULT_TEAM_COUNT: 8,
    MIN_TEAMS: _sharedSwissConfig?.minTeams ?? 4,
    MAX_TEAMS: _sharedSwissConfig?.maxTeams ?? 40,

    // Match Settings (from shared config)
    DEFAULT_MAX_SCORE: _sharedSwissConfig?.defaults?.pointsPerMatch ?? 16,

    // Points System
    POINTS_WIN: 3,
    POINTS_DRAW: 1,
    POINTS_LOSS: 0,

    // Swiss-specific: Rounds
    // null = calculated dynamically via calculateSuggestedRounds()
    DEFAULT_ROUNDS: null,
    MIN_ROUNDS: 3,
    MAX_ROUNDS: 10,

    // Bye points: team with a bye receives a win's worth of points
    BYE_POINTS: 3,
    BYE_SCORE_FOR: 16,
    BYE_SCORE_AGAINST: 0,

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

// ===== SWISS-SPECIFIC FUNCTIONS =====

/**
 * Calculate the suggested number of rounds for a Swiss tournament.
 * Standard Swiss formula: ceil(log2(teamCount)), clamped to [MIN_ROUNDS, MAX_ROUNDS].
 *
 * @param {number} teamCount - Number of teams in the tournament
 * @returns {number} Suggested number of rounds
 */
function calculateSuggestedRounds(teamCount) {
    const calculated = Math.ceil(Math.log2(teamCount));
    return Math.max(CONFIG.MIN_ROUNDS, Math.min(CONFIG.MAX_ROUNDS, calculated));
}

/**
 * Create a canonical match key for two team IDs.
 * Always puts the smaller ID first so "3-7" and "7-3" map to the same key.
 *
 * @param {number} id1 - First team ID
 * @param {number} id2 - Second team ID
 * @returns {string} Canonical key e.g. "3-7"
 */
function _matchKey(id1, id2) {
    return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
}

/**
 * Generate pairings for a single Swiss round.
 *
 * Round 1: seed by combined rating (strongest vs second-strongest, etc.)
 * Round 2+: sort by current standings (points > buchholz > GD > GF),
 *           then pair adjacent teams with anti-repeat swaps.
 *
 * Handles:
 *  - Odd number of teams (lowest-ranked team without a prior bye gets a bye)
 *  - All opponents already played (pairs anyway when no alternative exists)
 *
 * @param {Array} teams - Array of team objects with at least { id, combinedRating }
 * @param {Object} matchScores - Keyed by "id1-id2", values { team1Score, team2Score }
 * @param {Object} matchHistory - Keyed by "id1-id2" (canonical), value true if they have played
 * @param {number} roundNumber - 1-based round number
 * @returns {{ round: number, matches: Array<{ team1Id: number, team2Id: number }>, bye?: number }}
 */
function generateSwissRound(teams, matchScores, matchHistory, roundNumber) {
    const history = matchHistory || {};
    const result = { round: roundNumber, matches: [] };

    // --- Determine ordering ---------------------------------------------------
    let ordered;

    if (roundNumber === 1) {
        // Seed by rating descending (strongest first)
        ordered = [...teams].sort((a, b) => {
            const ratingA = a.combinedRating ?? 0;
            const ratingB = b.combinedRating ?? 0;
            return ratingB - ratingA;
        });
    } else {
        // Sort by standings (points > buchholz > GD > GF)
        const standings = calculateStandings(teams, matchScores);
        // Map standings order back to team objects
        ordered = standings.map(s => teams.find(t => t.id === s.teamId));
    }

    // --- Handle bye for odd number of teams -----------------------------------
    let byeTeamId = null;

    if (ordered.length % 2 !== 0) {
        // Find the lowest-ranked team that has not already had a bye.
        // "Lowest-ranked" = last in the ordered array (worst standing / weakest seed).
        // Walk from bottom up to find one without a prior bye.
        const byeHistory = _extractByeHistory(matchScores);

        for (let i = ordered.length - 1; i >= 0; i--) {
            if (!byeHistory[ordered[i].id]) {
                byeTeamId = ordered[i].id;
                ordered.splice(i, 1);
                break;
            }
        }

        // If every team already had a bye, give it to the absolute last team
        if (byeTeamId === null) {
            byeTeamId = ordered[ordered.length - 1].id;
            ordered.splice(ordered.length - 1, 1);
        }

        result.bye = byeTeamId;
    }

    // --- Pair adjacent teams with anti-repeat logic ---------------------------
    // Build an array of team IDs in the current order
    const ids = ordered.map(t => t.id);
    const paired = new Set();
    const matches = [];

    for (let i = 0; i < ids.length; i++) {
        if (paired.has(ids[i])) continue;

        // Find the best partner: the nearest unpaired team that hasn't played this team
        let partnerId = null;

        // First pass: look for an opponent they haven't played yet
        for (let j = i + 1; j < ids.length; j++) {
            if (paired.has(ids[j])) continue;
            const key = _matchKey(ids[i], ids[j]);
            if (!history[key]) {
                partnerId = ids[j];
                break;
            }
        }

        // Second pass: if all remaining opponents have been played, just pick the
        // nearest unpaired one (this naturally happens in later rounds with few teams)
        if (partnerId === null) {
            for (let j = i + 1; j < ids.length; j++) {
                if (!paired.has(ids[j])) {
                    partnerId = ids[j];
                    break;
                }
            }
        }

        if (partnerId !== null) {
            paired.add(ids[i]);
            paired.add(partnerId);
            matches.push({ team1Id: ids[i], team2Id: partnerId });
        }
    }

    result.matches = matches;
    return result;
}

/**
 * Extract which teams have already received a bye from matchScores.
 * A bye is recorded as a match key like "BYE-<teamId>" or "<teamId>-BYE"
 * or via a special `bye` flag.  We also accept an explicit `_byes` property
 * on matchScores for simpler tracking.
 *
 * @param {Object} matchScores
 * @returns {Object} Map of teamId -> true for teams that have had a bye
 */
function _extractByeHistory(matchScores) {
    const byes = {};

    if (!matchScores) return byes;

    // Check for explicit _byes tracking object
    if (matchScores._byes) {
        for (const id of Object.keys(matchScores._byes)) {
            byes[Number(id)] = true;
        }
        return byes;
    }

    // Fallback: scan match keys for BYE markers
    for (const key of Object.keys(matchScores)) {
        const parts = key.split('-');
        if (parts[0] === 'BYE') {
            byes[Number(parts[1])] = true;
        } else if (parts[1] === 'BYE') {
            byes[Number(parts[0])] = true;
        }
    }

    return byes;
}

/**
 * Calculate Buchholz score for a single team.
 * Buchholz = sum of all opponents' points (strength of schedule tiebreaker).
 *
 * @param {number} teamId - The team whose Buchholz to calculate
 * @param {Object} matchScores - Keyed by "id1-id2", values { team1Score, team2Score }
 * @param {Array} standings - Array of standing objects with at least { teamId, points }
 * @returns {number} Buchholz score
 */
function calculateBuchholz(teamId, matchScores, standings) {
    if (!matchScores || !standings) return 0;

    // Build a quick lookup: teamId -> points
    const pointsMap = {};
    for (const s of standings) {
        pointsMap[s.teamId] = s.points;
    }

    // Find all opponents of this team
    let buchholz = 0;
    for (const key of Object.keys(matchScores)) {
        const score = matchScores[key];
        if (score.team1Score === null || score.team2Score === null) continue;

        const parts = key.split('-');
        const id1 = Number(parts[0]);
        const id2 = Number(parts[1]);

        // Skip bye entries
        if (isNaN(id1) || isNaN(id2)) continue;

        if (id1 === teamId) {
            buchholz += (pointsMap[id2] || 0);
        } else if (id2 === teamId) {
            buchholz += (pointsMap[id1] || 0);
        }
    }

    return buchholz;
}

/**
 * Calculate full standings with Buchholz tiebreaker.
 *
 * Each entry contains:
 *   teamId, team, played, won, drawn, lost,
 *   gamesFor, gamesAgainst, gamesDiff, points, buchholz
 *
 * Sort order: Points (desc) -> Buchholz (desc) -> GD (desc) -> GF (desc)
 *
 * @param {Array} teams - Array of team objects
 * @param {Object} matchScores - Keyed by "id1-id2"
 * @returns {Array} Sorted standings array
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
        points: 0,
        buchholz: 0
    }));

    if (!matchScores) {
        return standings;
    }

    // --- Process each completed match ---
    for (const [matchKey, score] of Object.entries(matchScores)) {
        if (score.team1Score === null || score.team2Score === null) continue;

        const parts = matchKey.split('-');
        const id1 = Number(parts[0]);
        const id2 = Number(parts[1]);

        // Skip non-numeric keys (bye markers, metadata)
        if (isNaN(id1) || isNaN(id2)) continue;

        const team1Stats = standings.find(s => s.teamId === id1);
        const team2Stats = standings.find(s => s.teamId === id2);

        if (!team1Stats || !team2Stats) continue;

        // Update games played
        team1Stats.played++;
        team2Stats.played++;

        // Update games for/against
        team1Stats.gamesFor += score.team1Score;
        team1Stats.gamesAgainst += score.team2Score;
        team2Stats.gamesFor += score.team2Score;
        team2Stats.gamesAgainst += score.team1Score;

        // Determine winner and award points
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

    // --- Apply bye points ---
    // Check for BYE entries or _byes metadata
    for (const [matchKey, score] of Object.entries(matchScores)) {
        const parts = matchKey.split('-');
        let byeTeamId = null;

        if (parts[0] === 'BYE' && !isNaN(Number(parts[1]))) {
            byeTeamId = Number(parts[1]);
        } else if (parts[1] === 'BYE' && !isNaN(Number(parts[0]))) {
            byeTeamId = Number(parts[0]);
        }

        if (byeTeamId !== null) {
            const stats = standings.find(s => s.teamId === byeTeamId);
            if (stats) {
                stats.played++;
                stats.won++;
                stats.points += CONFIG.BYE_POINTS;
                stats.gamesFor += CONFIG.BYE_SCORE_FOR;
                stats.gamesAgainst += CONFIG.BYE_SCORE_AGAINST;
            }
        }
    }

    // --- Calculate games difference ---
    standings.forEach(s => {
        s.gamesDiff = s.gamesFor - s.gamesAgainst;
    });

    // --- Calculate Buchholz (needs base points computed first) ---
    standings.forEach(s => {
        s.buchholz = calculateBuchholz(s.teamId, matchScores, standings);
    });

    // --- Sort: Points > Buchholz > GD > GF ---
    standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
        if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
        return b.gamesFor - a.gamesFor;
    });

    return standings;
}

console.log('Swiss System Config loaded');
