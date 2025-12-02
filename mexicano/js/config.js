/**
 * config.js - Mexicano Configuration
 * Application constants and settings
 */

const CONFIG = {
    // Firebase paths
    FIREBASE_ROOT: 'mexicano-tournaments',
    
    // Tournament settings
    MIN_PLAYERS_INDIVIDUAL: 8,
    MIN_TEAMS: 4,
    DEFAULT_POINTS_PER_MATCH: 24,
    
    // ID generation
    TOURNAMENT_ID_LENGTH: 6,
    ORGANISER_KEY_LENGTH: 16,
    
    // Local storage
    STORAGE_KEY: 'mexicano_tournaments',
    MAX_STORED_TOURNAMENTS: 10
};

// Color utilities
function getPlayerColor(index) {
    return `player-color-${index % 16}`;
}

function getTeamColor(index) {
    return `team-color-${index % 8}`;
}

console.log('✅ Mexicano Config loaded');
