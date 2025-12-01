/**
 * fixtures.js - Americano Tournament Fixtures (5-12 players)
 * 
 * Static fixtures where each player partners with every other player.
 * Multi-court just means fewer rounds (fixtures run simultaneously).
 * 
 * Court requirements by player count:
 * - 5 players: 1 court max (4 play, 1 rests)
 * - 6 players: 1 court max (4 play, 2 rest)
 * - 7 players: 1 court max (4 play, 3 rest)
 * - 8 players: 2 courts max (all 8 play, 0 rest)
 * - 9 players: 2 courts max (8 play, 1 rest) - optimized for 2-court play
 * - 10 players: 2 courts max (8 play, 2 rest) - optimized for 2-court play
 * - 11 players: 2 courts max (8 play, 3 rest) - optimized for 2-court play
 * - 12 players: 2 courts (8 play, 4 rest) OR 3 courts (12 play, 0 rest)
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
    ],

    // 10 Players - 30 fixtures, 12 games each, optimized for 2 courts
    // 15 rounds, each round uses 2 courts, 2 players rest per round
    10: [
        { teams: [[1,6],[3,5]], rest: [2,9] },
        { teams: [[4,7],[8,10]], rest: [2,9] },
        { teams: [[1,7],[6,9]], rest: [3,8] },
        { teams: [[2,4],[5,10]], rest: [3,8] },
        { teams: [[1,10],[7,9]], rest: [5,6] },
        { teams: [[2,3],[4,8]], rest: [5,6] },
        { teams: [[2,5],[9,10]], rest: [1,7] },
        { teams: [[3,4],[6,8]], rest: [1,7] },
        { teams: [[1,5],[2,6]], rest: [4,10] },
        { teams: [[3,7],[8,9]], rest: [4,10] },
        { teams: [[2,9],[4,5]], rest: [1,8] },
        { teams: [[3,6],[7,10]], rest: [1,8] },
        { teams: [[1,3],[2,10]], rest: [5,9] },
        { teams: [[4,6],[7,8]], rest: [5,9] },
        { teams: [[1,9],[6,7]], rest: [4,10] },
        { teams: [[2,3],[5,8]], rest: [4,10] },
        { teams: [[1,8],[6,10]], rest: [2,7] },
        { teams: [[3,4],[5,9]], rest: [2,7] },
        { teams: [[1,2],[4,10]], rest: [3,6] },
        { teams: [[5,7],[8,9]], rest: [3,6] },
        { teams: [[1,4],[2,7]], rest: [3,9] },
        { teams: [[5,6],[8,10]], rest: [3,9] },
        { teams: [[2,8],[4,9]], rest: [1,7] },
        { teams: [[3,5],[6,10]], rest: [1,7] },
        { teams: [[1,4],[6,7]], rest: [2,5] },
        { teams: [[3,8],[9,10]], rest: [2,5] },
        { teams: [[1,5],[3,9]], rest: [6,10] },
        { teams: [[2,4],[7,8]], rest: [6,10] },
        { teams: [[1,9],[3,10]], rest: [4,8] },
        { teams: [[2,5],[6,7]], rest: [4,8] }
    ],

    // 11 Players - 32 fixtures, 11-12 games each, optimized for 2 courts
    // 16 rounds, each round uses 2 courts, 3 players rest per round
    11: [
        { teams: [[1,6],[3,4]], rest: [2,8,11] },
        { teams: [[5,7],[9,10]], rest: [2,8,11] },
        { teams: [[2,10],[3,7]], rest: [1,5,9] },
        { teams: [[4,6],[8,11]], rest: [1,5,9] },
        { teams: [[1,7],[2,6]], rest: [3,4,10] },
        { teams: [[5,8],[9,11]], rest: [3,4,10] },
        { teams: [[1,9],[2,8]], rest: [3,6,7] },
        { teams: [[4,5],[10,11]], rest: [3,6,7] },
        { teams: [[1,8],[7,9]], rest: [4,5,10] },
        { teams: [[2,3],[6,11]], rest: [4,5,10] },
        { teams: [[3,9],[4,11]], rest: [1,2,8] },
        { teams: [[5,6],[7,10]], rest: [1,2,8] },
        { teams: [[1,5],[3,6]], rest: [7,9,11] },
        { teams: [[2,4],[8,10]], rest: [7,9,11] },
        { teams: [[1,10],[4,9]], rest: [2,6,8] },
        { teams: [[3,5],[7,11]], rest: [2,6,8] },
        { teams: [[1,4],[7,8]], rest: [3,10,11] },
        { teams: [[2,5],[6,9]], rest: [3,10,11] },
        { teams: [[1,11],[3,10]], rest: [4,5,6] },
        { teams: [[2,7],[8,9]], rest: [4,5,6] },
        { teams: [[2,11],[5,10]], rest: [1,7,9] },
        { teams: [[3,4],[6,8]], rest: [1,7,9] },
        { teams: [[2,9],[3,8]], rest: [1,10,11] },
        { teams: [[4,5],[6,7]], rest: [1,10,11] },
        { teams: [[1,3],[5,11]], rest: [2,6,9] },
        { teams: [[4,7],[8,10]], rest: [2,6,9] },
        { teams: [[1,2],[6,10]], rest: [3,5,7] },
        { teams: [[4,8],[9,11]], rest: [3,5,7] },
        { teams: [[1,11],[5,9]], rest: [6,7,8] },
        { teams: [[2,3],[4,10]], rest: [6,7,8] },
        { teams: [[1,6],[3,11]], rest: [4,9,10] },
        { teams: [[2,5],[7,8]], rest: [4,9,10] }
    ],

    // 12 Players - Different fixtures depending on court count
    // Use getFixtures(12, courtCount) to get the right set
    12: {
        // 2 courts: 38 fixtures, 12-13 games each, 4 resting per round
        // 19 rounds
        2: [
            { teams: [[2,11],[3,6]], rest: [1,7,9,12] },
            { teams: [[4,5],[8,10]], rest: [1,7,9,12] },
            { teams: [[1,10],[7,9]], rest: [2,4,6,8] },
            { teams: [[3,5],[11,12]], rest: [2,4,6,8] },
            { teams: [[1,9],[2,4]], rest: [3,5,10,11] },
            { teams: [[6,7],[8,12]], rest: [3,5,10,11] },
            { teams: [[1,3],[5,6]], rest: [2,8,10,12] },
            { teams: [[4,7],[9,11]], rest: [2,8,10,12] },
            { teams: [[1,7],[2,5]], rest: [3,6,9,11] },
            { teams: [[4,8],[10,12]], rest: [3,6,9,11] },
            { teams: [[2,8],[3,12]], rest: [1,4,5,7] },
            { teams: [[6,9],[10,11]], rest: [1,4,5,7] },
            { teams: [[2,7],[9,10]], rest: [1,5,8,11] },
            { teams: [[3,4],[6,12]], rest: [1,5,8,11] },
            { teams: [[1,6],[5,12]], rest: [4,7,9,10] },
            { teams: [[2,3],[8,11]], rest: [4,7,9,10] },
            { teams: [[1,11],[4,10]], rest: [2,3,6,12] },
            { teams: [[5,7],[8,9]], rest: [2,3,6,12] },
            { teams: [[2,12],[3,8]], rest: [1,5,9,10] },
            { teams: [[4,6],[7,11]], rest: [1,5,9,10] },
            { teams: [[1,4],[2,10]], rest: [3,6,7,11] },
            { teams: [[5,8],[9,12]], rest: [3,6,7,11] },
            { teams: [[1,5],[3,11]], rest: [4,8,9,12] },
            { teams: [[2,6],[7,10]], rest: [4,8,9,12] },
            { teams: [[3,7],[5,9]], rest: [1,2,4,11] },
            { teams: [[6,8],[10,12]], rest: [1,2,4,11] },
            { teams: [[1,12],[4,9]], rest: [5,7,8,10] },
            { teams: [[2,3],[6,11]], rest: [5,7,8,10] },
            { teams: [[4,12],[5,11]], rest: [1,2,3,6] },
            { teams: [[7,8],[9,10]], rest: [1,2,3,6] },
            { teams: [[1,8],[4,11]], rest: [5,7,9,12] },
            { teams: [[2,3],[6,10]], rest: [5,7,9,12] },
            { teams: [[1,2],[3,9]], rest: [4,8,10,11] },
            { teams: [[5,6],[7,12]], rest: [4,8,10,11] },
            { teams: [[2,9],[5,10]], rest: [1,3,6,12] },
            { teams: [[4,7],[8,11]], rest: [1,3,6,12] },
            { teams: [[1,6],[3,10]], rest: [2,4,5,9] },
            { teams: [[7,8],[11,12]], rest: [2,4,5,9] }
        ],
        // 3 courts: 33 fixtures, 11 games each, 0 resting per round
        // 11 rounds - everyone plays every round!
        3: [
            { teams: [[1,5],[4,8]], rest: [] },
            { teams: [[3,7],[9,10]], rest: [] },
            { teams: [[2,6],[11,12]], rest: [] },
            { teams: [[1,7],[8,9]], rest: [] },
            { teams: [[3,5],[2,12]], rest: [] },
            { teams: [[4,6],[10,11]], rest: [] },
            { teams: [[1,8],[7,9]], rest: [] },
            { teams: [[5,12],[4,11]], rest: [] },
            { teams: [[2,3],[6,10]], rest: [] },
            { teams: [[1,10],[4,7]], rest: [] },
            { teams: [[9,12],[3,8]], rest: [] },
            { teams: [[2,5],[6,11]], rest: [] },
            { teams: [[1,4],[9,11]], rest: [] },
            { teams: [[2,10],[5,8]], rest: [] },
            { teams: [[3,6],[7,12]], rest: [] },
            { teams: [[1,6],[3,10]], rest: [] },
            { teams: [[7,11],[8,12]], rest: [] },
            { teams: [[2,4],[5,9]], rest: [] },
            { teams: [[1,11],[6,9]], rest: [] },
            { teams: [[5,7],[2,8]], rest: [] },
            { teams: [[3,4],[10,12]], rest: [] },
            { teams: [[1,12],[2,9]], rest: [] },
            { teams: [[3,11],[4,10]], rest: [] },
            { teams: [[5,6],[7,8]], rest: [] },
            { teams: [[1,3],[4,9]], rest: [] },
            { teams: [[5,11],[6,12]], rest: [] },
            { teams: [[2,7],[8,10]], rest: [] },
            { teams: [[1,9],[2,11]], rest: [] },
            { teams: [[3,12],[7,10]], rest: [] },
            { teams: [[4,5],[6,8]], rest: [] },
            { teams: [[1,2],[4,12]], rest: [] },
            { teams: [[3,9],[5,10]], rest: [] },
            { teams: [[6,7],[8,11]], rest: [] }
        ]
    }
};

/**
 * Tournament info for each player count
 * For 12 players, info varies by court count
 */
const TOURNAMENT_INFO = {
    5: { fixtures: 5,  maxCourts: 1, gamesPerPlayer: 4 },
    6: { fixtures: 12, maxCourts: 1, gamesPerPlayer: 8 },
    7: { fixtures: 15, maxCourts: 1, gamesPerPlayer: 8 },
    8: { fixtures: 14, maxCourts: 2, gamesPerPlayer: 7 },
    9: { fixtures: 18, maxCourts: 2, gamesPerPlayer: 8 },
    10: { fixtures: 30, maxCourts: 2, gamesPerPlayer: 12 },
    11: { fixtures: 32, maxCourts: 2, gamesPerPlayer: 11 },  // 11-12 games, slight variance
    12: {
        maxCourts: 3,
        // Info varies by court count
        2: { fixtures: 38, gamesPerPlayer: 12 },  // 12-13 games, 4 resting
        3: { fixtures: 33, gamesPerPlayer: 11 }   // Perfect: 11 games, 0 resting
    }
};

/**
 * Get fixtures for a player count (and optionally court count for 12 players)
 */
function getFixtures(playerCount, courtCount) {
    if (playerCount === 12) {
        // For 12 players, return fixtures based on court count
        const courts = courtCount || 3;  // Default to 3 courts (optimal)
        return FIXTURES[12][courts] || FIXTURES[12][3];
    }
    return FIXTURES[playerCount] || [];
}

/**
 * Get tournament info for a player count (and optionally court count for 12 players)
 */
function getTournamentInfo(playerCount, courtCount) {
    if (playerCount === 12) {
        const courts = courtCount || 3;
        const baseInfo = TOURNAMENT_INFO[12];
        const courtInfo = baseInfo[courts] || baseInfo[3];
        return {
            ...courtInfo,
            maxCourts: baseInfo.maxCourts
        };
    }
    return TOURNAMENT_INFO[playerCount] || null;
}

/**
 * Get maximum courts for a player count
 */
function getMaxCourts(playerCount) {
    if (playerCount === 12) {
        return TOURNAMENT_INFO[12].maxCourts;
    }
    const info = TOURNAMENT_INFO[playerCount];
    return info ? info.maxCourts : 1;
}

/**
 * Get minimum courts for a player count
 * For 12 players, minimum is 2 courts
 */
function getMinCourts(playerCount) {
    if (playerCount === 12) {
        return 2;  // 12 players needs at least 2 courts
    }
    return 1;
}

/**
 * Check if player count is supported
 */
function isPlayerCountSupported(playerCount) {
    return playerCount >= 5 && playerCount <= 12;
}
