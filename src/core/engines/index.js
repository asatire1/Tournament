/**
 * engines/index.js - Tournament Engines Module
 * 
 * Centralized exports for all tournament engines.
 * These engines contain the core logic shared between
 * Quick Play and Competitions systems.
 * 
 * @version 2.0.0
 * @author UberPadel
 */

// Base Engine
export { 
    BaseTournamentEngine, 
    validateScore, 
    shuffleArray, 
    normalizeScore 
} from './base-engine.js';

// Americano Engine
export { 
    AmericanoEngine, 
    createAmericanoEngine,
    TOURNAMENT_INFO as AMERICANO_TOURNAMENT_INFO 
} from './americano-engine.js';

// Mexicano Engine
export { 
    MexicanoEngine, 
    createMexicanoEngine 
} from './mexicano-engine.js';

// Mix Tournament Engine
export { 
    MixTournamentEngine, 
    createMixTournamentEngine,
    POINTS as MIX_POINTS,
    PLAYER_CONFIGS as MIX_PLAYER_CONFIGS 
} from './mix-engine.js';

// Team League Engine
export { 
    TeamLeagueEngine, 
    createTeamLeagueEngine,
    POINTS as TEAM_LEAGUE_POINTS,
    GROUP_MODES,
    KNOCKOUT_FORMATS 
} from './team-league-engine.js';

/**
 * Factory function to create engine by format type
 * @param {string} format - 'americano', 'mexicano', 'mix', or 'team-league'
 * @param {Object} config - Engine configuration
 * @returns {BaseTournamentEngine}
 */
export function createEngine(format, config = {}) {
    switch (format.toLowerCase()) {
        case 'americano':
            return createAmericanoEngine(config);
        case 'mexicano':
            return createMexicanoEngine(config);
        case 'mix':
        case 'mix-tournament':
            return createMixTournamentEngine(config);
        case 'team-league':
        case 'teamleague':
            return createTeamLeagueEngine(config);
        default:
            throw new Error(`Unknown tournament format: ${format}`);
    }
}

/**
 * Get supported formats
 * @returns {Array}
 */
export function getSupportedFormats() {
    return ['americano', 'mexicano', 'mix', 'team-league'];
}

/**
 * Get format display name
 * @param {string} format - Format key
 * @returns {string}
 */
export function getFormatDisplayName(format) {
    const names = {
        'americano': 'Americano',
        'mexicano': 'Mexicano',
        'mix': 'Mix Tournament',
        'team-league': 'Team League'
    };
    return names[format.toLowerCase()] || format;
}

/**
 * Get format emoji
 * @param {string} format - Format key
 * @returns {string}
 */
export function getFormatEmoji(format) {
    const emojis = {
        'americano': '🔄',
        'mexicano': '🎯',
        'mix': '🏓',
        'team-league': '👥'
    };
    return emojis[format.toLowerCase()] || '🎾';
}
