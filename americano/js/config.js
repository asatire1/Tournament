/**
 * config.js - Americano Tournament Configuration
 * Constants for player limits, courts, points system, etc.
 */

const CONFIG = {
    // Player limits (5-20 supported)
    MIN_PLAYERS: 5,
    MAX_PLAYERS: 20,
    
    // Court limits (max 5 courts for 20 players)
    MIN_COURTS: 1,
    MAX_COURTS: 5,
    
    // Default settings
    DEFAULT_PLAYERS: 6,
    DEFAULT_COURTS: 1,
    DEFAULT_TOTAL_POINTS: 16,
    DEFAULT_FIXED_POINTS: true,
    
    // Points system options
    POINTS_OPTIONS: [16, 21, 24, 32],
    
    // Tournament ID settings
    TOURNAMENT_ID_LENGTH: 6,
    ORGANISER_KEY_LENGTH: 16,
    
    // Local storage keys
    STORAGE_KEY: 'stretford_padel_americano_tournaments',
    MAX_STORED_TOURNAMENTS: 20,
    
    // Firebase paths
    FIREBASE_ROOT: 'americano',
    
    // UI settings
    MAX_ROUNDS_DISPLAY: 19  // Max rounds (20 players, 5 courts - optimized)
};

// Player colour classes for badges (20 players max)
const PLAYER_COLORS = [
    'player-color-1',  // Red
    'player-color-2',  // Purple
    'player-color-3',  // Blue
    'player-color-4',  // Green
    'player-color-5',  // Orange
    'player-color-6',  // Teal
    'player-color-7',  // Pink
    'player-color-8',  // Indigo
    'player-color-9',  // Amber
    'player-color-10', // Cyan
    'player-color-11', // Rose
    'player-color-12', // Lime
    'player-color-13', // Violet
    'player-color-14', // Emerald
    'player-color-15', // Fuchsia
    'player-color-16', // Sky
    'player-color-17', // Yellow
    'player-color-18', // Slate
    'player-color-19', // Stone
    'player-color-20'  // Zinc
];

/**
 * Get player color class by player number (1-indexed)
 */
function getPlayerColorClass(playerNum) {
    const index = (playerNum - 1) % PLAYER_COLORS.length;
    return PLAYER_COLORS[index];
}

/**
 * Get default player names for a given player count
 */
function getDefaultPlayerNames(count) {
    return Array.from({ length: count }, (_, i) => `Player ${i + 1}`);
}

/**
 * Get default court names for a given court count
 */
function getDefaultCourtNames(count) {
    return Array.from({ length: count }, (_, i) => `Court ${i + 1}`);
}
