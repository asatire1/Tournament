// ===== KNOCKOUT TOURNAMENT CONFIGURATION =====

const CONFIG = {
    // Format identifier
    FORMAT_TYPE: 'group_knockout',

    // Player/Team Settings
    DEFAULT_PLAYER_COUNT: 27,
    MIN_PLAYERS: 12,
    MAX_PLAYERS: 36,
    PLAYERS_PER_TEAM: 2,

    // Group Settings
    DEFAULT_GROUPS: 3,
    MIN_GROUPS: 2,
    MAX_GROUPS: 4,

    // Match Points
    GROUP_STAGE_POINTS: 16,
    QUARTER_FINAL_POINTS: 23,  // First to 12 wins
    SEMI_FINAL_POINTS: 25,     // First to 13 wins
    FINAL_POINTS: 29,          // First to 15 wins

    // Serves
    SERVES_PER_PLAYER: 4,

    // League Points System
    POINTS_WIN: 3,
    POINTS_DRAW: 1,
    POINTS_LOSS: 0,

    // Qualification Rules
    QUALIFY_TOP_PER_GROUP: 2,      // Top 2 from each group
    QUALIFY_BEST_THIRD: 2,         // Best 2 third-place teams
    TOTAL_KNOCKOUT_TEAMS: 8,       // Total teams in knockouts

    // Team Colours for visual variety
    TEAM_COLOURS: [
        'bg-red-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-orange-500',
        'bg-teal-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-emerald-500',
        'bg-amber-500',
        'bg-cyan-500',
        'bg-rose-500',
        'bg-violet-500',
        'bg-lime-500',
        'bg-fuchsia-500',
        'bg-sky-500'
    ],

    // Version
    VERSION: '1.0.0'
};

// ===== UTILITY FUNCTIONS =====

/**
 * Get team colour class based on team index
 */
function getTeamColourClass(teamIndex) {
    return CONFIG.TEAM_COLOURS[teamIndex % CONFIG.TEAM_COLOURS.length];
}

/**
 * Generate team name from two player names
 */
function generateTeamName(player1, player2) {
    const p1 = player1.split(' ')[0];
    const p2 = player2.split(' ')[0];
    return `${p1} & ${p2}`;
}

/**
 * Get winning score for knockout stage
 */
function getWinningScore(stage) {
    switch (stage) {
        case 'quarterFinal':
            return Math.ceil(CONFIG.QUARTER_FINAL_POINTS / 2); // 12
        case 'semiFinal':
            return Math.ceil(CONFIG.SEMI_FINAL_POINTS / 2); // 13
        case 'final':
            return Math.ceil(CONFIG.FINAL_POINTS / 2); // 15
        default:
            return Math.ceil(CONFIG.GROUP_STAGE_POINTS / 2); // 9
    }
}

/**
 * Get stage display name
 */
function getStageName(stage) {
    switch (stage) {
        case 'quarterFinal': return 'Quarter Final';
        case 'semiFinal': return 'Semi Final';
        case 'final': return 'Final';
        default: return 'Group Stage';
    }
}

/**
 * Format time ago
 */
function formatTimeAgo(isoString) {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Generate a short unique ID
 */
function generateTournamentId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

console.log('Knockout Config loaded');
