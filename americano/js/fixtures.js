/**
 * fixtures.js - Americano Tournament Fixtures (5-9 players)
 * 
 * Static fixtures where each player partners with every other player.
 * Multi-court just means fewer rounds (fixtures run simultaneously).
 * 
 * Court requirements by player count:
 * - 5 players: 1 court max (4 play, 1 rests)
 * - 6 players: 1 court max (4 play, 2 rest)
 * - 7 players: 1 court max (4 play, 3 rest)
 * - 8 players: 2 courts max (all 8 play, 0 rest)
 * - 9 players: 2 courts max (8 play, 1 rests) - optimized for 2-court play
 */

const FIXTURES = {
    // 5 Players - 5 fixtures, 4 games each
    5: [
        { teams: [[1,2],[3,4]], rest: [5] },
        { teams: [[1,3],[4,5]], rest: [2] },
        { teams: [[1,4],[2,5]], rest: [3] },
        { teams: [[1,5],[2,3]], rest: [4] },
        { teams: [[2,4],[3,5]], rest: [1] }
    ],

    // 6 Players - 12 fixtures, 8 games each
    6: [
        { teams: [[1,2],[3,4]], rest: [5,6] },
        { teams: [[5,6],[1,3]], rest: [2,4] },
        { teams: [[2,4],[1,6]], rest: [3,5] },
        { teams: [[3,6],[2,5]], rest: [1,4] },
        { teams: [[1,4],[3,5]], rest: [2,6] },
        { teams: [[2,6],[4,5]], rest: [1,3] },
        { teams: [[1,6],[2,3]], rest: [4,5] },
        { teams: [[4,6],[3,5]], rest: [1,2] },
        { teams: [[1,3],[2,4]], rest: [5,6] },
        { teams: [[1,5],[3,4]], rest: [2,6] },
        { teams: [[2,5],[4,6]], rest: [1,3] },
        { teams: [[1,2],[5,6]], rest: [3,4] }
    ],

    // 7 Players - 15 fixtures, ~8-9 games each
    7: [
        { teams: [[1,2],[3,4]], rest: [5,6,7] },
        { teams: [[1,3],[4,5]], rest: [2,6,7] },
        { teams: [[1,4],[5,6]], rest: [2,3,7] },
        { teams: [[1,5],[6,7]], rest: [2,3,4] },
        { teams: [[1,6],[2,3]], rest: [4,5,7] },
        { teams: [[1,7],[2,4]], rest: [3,5,6] },
        { teams: [[2,5],[3,6]], rest: [1,4,7] },
        { teams: [[2,6],[4,7]], rest: [1,3,5] },
        { teams: [[2,7],[5,6]], rest: [1,3,4] },
        { teams: [[3,5],[4,6]], rest: [1,2,7] },
        { teams: [[3,7],[4,5]], rest: [1,2,6] },
        { teams: [[5,7],[3,4]], rest: [1,2,6] },
        { teams: [[6,7],[2,3]], rest: [1,4,5] },
        { teams: [[1,2],[4,6]], rest: [3,5,7] },
        { teams: [[1,3],[5,7]], rest: [2,4,6] }
    ],

    // 8 Players - 14 fixtures, 7 games each
    8: [
        { teams: [[1,2],[3,4]], rest: [5,6,7,8] },
        { teams: [[1,3],[5,6]], rest: [2,4,7,8] },
        { teams: [[1,4],[7,8]], rest: [2,3,5,6] },
        { teams: [[1,5],[2,6]], rest: [3,4,7,8] },
        { teams: [[1,6],[3,7]], rest: [2,4,5,8] },
        { teams: [[1,7],[4,8]], rest: [2,3,5,6] },
        { teams: [[1,8],[2,5]], rest: [3,4,6,7] },
        { teams: [[2,3],[4,5]], rest: [1,6,7,8] },
        { teams: [[2,4],[6,7]], rest: [1,3,5,8] },
        { teams: [[2,7],[5,8]], rest: [1,3,4,6] },
        { teams: [[2,8],[3,6]], rest: [1,4,5,7] },
        { teams: [[3,5],[6,8]], rest: [1,2,4,7] },
        { teams: [[3,8],[4,7]], rest: [1,2,5,6] },
        { teams: [[4,6],[5,7]], rest: [1,2,3,8] }
    ],

    // 9 Players - 18 fixtures, 8 games each, optimized for 2 courts
    // 9 rounds, each round uses 2 courts, 1 player rests per round
    9: [
        { teams: [[2,3],[4,5]], rest: [1] },
        { teams: [[6,7],[8,9]], rest: [1] },
        { teams: [[1,3],[4,6]], rest: [2] },
        { teams: [[5,8],[7,9]], rest: [2] },
        { teams: [[1,2],[4,7]], rest: [3] },
        { teams: [[5,9],[6,8]], rest: [3] },
        { teams: [[1,5],[2,6]], rest: [4] },
        { teams: [[3,9],[7,8]], rest: [4] },
        { teams: [[1,4],[2,7]], rest: [5] },
        { teams: [[3,8],[6,9]], rest: [5] },
        { teams: [[1,7],[2,8]], rest: [6] },
        { teams: [[3,5],[4,9]], rest: [6] },
        { teams: [[1,8],[2,9]], rest: [7] },
        { teams: [[3,4],[5,6]], rest: [7] },
        { teams: [[1,9],[2,4]], rest: [8] },
        { teams: [[3,6],[5,7]], rest: [8] },
        { teams: [[1,6],[2,5]], rest: [9] },
        { teams: [[3,7],[4,8]], rest: [9] }
    ]
};

/**
 * Tournament info for each player count
 */
const TOURNAMENT_INFO = {
    5: { fixtures: 5,  maxCourts: 1, gamesPerPlayer: 4 },
    6: { fixtures: 12, maxCourts: 1, gamesPerPlayer: 8 },
    7: { fixtures: 15, maxCourts: 1, gamesPerPlayer: 8 },
    8: { fixtures: 14, maxCourts: 2, gamesPerPlayer: 7 },
    9: { fixtures: 18, maxCourts: 2, gamesPerPlayer: 8 }
};

/**
 * Get fixtures for a player count
 */
function getFixtures(playerCount) {
    return FIXTURES[playerCount] || [];
}

/**
 * Get tournament info for a player count
 */
function getTournamentInfo(playerCount) {
    return TOURNAMENT_INFO[playerCount] || null;
}

/**
 * Get maximum courts for a player count
 */
function getMaxCourts(playerCount) {
    const info = TOURNAMENT_INFO[playerCount];
    return info ? info.maxCourts : 1;
}

/**
 * Check if player count is supported
 */
function isPlayerCountSupported(playerCount) {
    return playerCount >= 5 && playerCount <= 9;
}
