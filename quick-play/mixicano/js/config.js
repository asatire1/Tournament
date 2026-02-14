/**
 * config.js - Mixicano Configuration
 * Application constants and settings
 *
 * Player limits are loaded from shared/format-config.js
 */

// Get limits from shared config (falls back to defaults if not loaded)
const _sharedConfig = typeof FORMAT_CONFIG !== 'undefined' ? FORMAT_CONFIG.mixicano : null;

const CONFIG = {
    // Firebase paths
    FIREBASE_ROOT: 'mixicano-tournaments',

    // Tournament settings - requires equal M/F, divisible by 4
    MIN_PLAYERS: _sharedConfig?.minPlayers ?? 4,
    MAX_PLAYERS: _sharedConfig?.maxPlayers ?? 80,
    MIN_PLAYERS_INDIVIDUAL: _sharedConfig?.minPlayers ?? 4,
    MAX_PLAYERS_INDIVIDUAL: _sharedConfig?.maxPlayers ?? 80,
    VALID_PLAYER_COUNTS: [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80],
    DEFAULT_POINTS_PER_MATCH: _sharedConfig?.defaults?.pointsPerMatch ?? 24,

    // ID generation
    TOURNAMENT_ID_LENGTH: 6,
    ORGANISER_KEY_LENGTH: 16,

    // Local storage
    STORAGE_KEY: 'mixicano_tournaments',
    MAX_STORED_TOURNAMENTS: 10
};

// Helper to check if player count is valid
function isValidPlayerCount(count) {
    if (typeof validateFormatCount === 'function') {
        return validateFormatCount(count, 'mixicano').valid;
    }
    return CONFIG.VALID_PLAYER_COUNTS.includes(count);
}

// Get next valid player count
function getNextValidPlayerCount(current) {
    for (const valid of CONFIG.VALID_PLAYER_COUNTS) {
        if (valid > current) return valid;
    }
    return CONFIG.MAX_PLAYERS;
}

// Color utilities
function getPlayerColor(index) {
    return `player-color-${index % 16}`;
}

console.log('✅ Mixicano Config loaded');
