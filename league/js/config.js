/**
 * config.js - League Configuration
 * Constants for divisions, team limits, scoring, etc.
 */

const CONFIG = {
    // Team limits per division
    MIN_TEAMS_PER_DIVISION: 4,
    MAX_TEAMS_PER_DIVISION: 16,

    // Division limits
    MIN_DIVISIONS: 2,
    MAX_DIVISIONS: 5,
    DEFAULT_DIVISIONS: 3,

    // Default division names
    DEFAULT_DIVISION_NAMES: ['Beginner', 'Intermediate', 'Advanced'],

    // Players per team (squad of 4, any 2 play each match)
    PLAYERS_PER_TEAM: 4,

    // Match format
    DEFAULT_SETS_PER_MATCH: 3,  // Best of 3
    DEFAULT_GAMES_PER_SET: 6,
    TIEBREAK_AT: 6,             // Tiebreak when both reach this score

    // Points system
    POINTS_WIN: 3,
    POINTS_DRAW: 1,
    POINTS_LOSS: 0,

    // Promotion / Relegation
    DEFAULT_PROMOTION_COUNT: 2,
    DEFAULT_RELEGATION_COUNT: 2,

    // Schedule defaults
    DEFAULT_MATCH_DAY: 'Wednesday',
    DEFAULT_MATCH_TIME: '19:00',
    DEFAULT_COURTS: 2,

    // League ID settings
    LEAGUE_ID_LENGTH: 6,
    ORGANISER_KEY_LENGTH: 16,

    // Local storage keys
    STORAGE_KEY: 'uber_padel_leagues',
    MAX_STORED_LEAGUES: 20,

    // Firebase paths
    FIREBASE_ROOT: 'leagues',

    // Games per set options
    GAMES_PER_SET_OPTIONS: [4, 6],

    // Match day options
    MATCH_DAY_OPTIONS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],

    // Season status values
    SEASON_STATUS: {
        SETUP: 'setup',
        ACTIVE: 'active',
        COMPLETED: 'completed'
    },

    // League status values
    LEAGUE_STATUS: {
        SETUP: 'setup',
        ACTIVE: 'active',
        COMPLETED: 'completed'
    },

    // Match status values
    MATCH_STATUS: {
        SCHEDULED: 'scheduled',
        COMPLETED: 'completed',
        POSTPONED: 'postponed',
        CANCELLED: 'cancelled'
    }
};
