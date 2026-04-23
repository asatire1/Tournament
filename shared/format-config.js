/**
 * Shared Format Configuration
 *
 * Single source of truth for all tournament format rules.
 * Used by both legacy Quick Play / Competitions and the new unified
 * /tournaments/ shell.
 *
 * Capability flags added for the unified shell:
 *   - registrationUnit: 'individual' | 'pair' (for open-registration mode)
 *   - supportedModes: ['names_only'] | ['names_only', 'open']
 *   - supportsRatingLimit: [] | ['individual'] | ['individual', 'combined']
 *   - matchFormats?: string[] (if organiser chooses at creation — e.g. fixed-pair)
 *
 * Change here → applies everywhere
 */

const FORMAT_CONFIG = {
    americano: {
        name: 'Americano',
        description: 'Round-robin with rotating partners',
        emoji: '🎾',

        minPlayers: 5,
        maxPlayers: 24,

        rule: 'any',

        defaults: {
            courts: 2,
            pointsPerMatch: 32
        },

        // Capability flags (unified shell)
        registrationUnit: 'individual',
        supportedModes: ['names_only', 'open'],
        supportsRatingLimit: ['individual'],

        hint: 'Supports 5-24 players (odd numbers allowed - players rest in rotation)'
    },

    mexicano: {
        name: 'Mexicano',
        description: 'Dynamic pairing based on standings',
        emoji: '🌮',

        minPlayers: 8,
        maxPlayers: 80,

        rule: 'divisible4',

        defaults: {
            courts: 2,
            pointsPerMatch: 32
        },

        registrationUnit: 'individual',
        supportedModes: ['names_only', 'open'],
        supportsRatingLimit: ['individual'],

        hint: 'Requires player count divisible by 4 (8, 12, 16, 20, 24...)'
    },

    mix: {
        name: 'Mix Tournament',
        description: 'Balanced competition with skill-based tiers ensuring fair matches for all levels',
        emoji: '🏆',

        minPlayers: 20,
        maxPlayers: 28,
        validOptions: [20, 24, 28],

        rule: 'fixed',

        defaults: {
            courts: 6,
            pointsPerMatch: 16
        },

        registrationUnit: 'individual',
        supportedModes: ['names_only', 'open'],
        supportsRatingLimit: ['individual'],

        hint: 'Only supports 20, 24, or 28 players (creates balanced skill tiers)'
    },

    'team-league': {
        name: 'Team League',
        description: 'Fixed teams compete in league + knockout',
        emoji: '👥',

        minTeams: 4,
        maxTeams: 36,
        playersPerTeam: 2,

        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        rule: 'teams',

        defaults: {
            courts: 2,
            pointsPerMatch: 16
        },

        registrationUnit: 'pair',
        supportedModes: ['names_only', 'open'],
        supportsRatingLimit: ['individual', 'combined'],

        hint: 'Uses fixed teams of 2 players each (4-36 teams)'
    },

    'fixed-pair': {
        name: 'Fixed-Pair Tournament',
        description: 'Pre-formed pairs compete. Organiser chooses round-robin, groups + knockout, or single-elim.',
        emoji: '🤝',

        minTeams: 4,
        maxTeams: 32,
        playersPerTeam: 2,

        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        rule: 'teams',

        defaults: {
            courts: 2,
            pointsPerMatch: 24,
            matchFormat: 'groups+ko'
        },

        // Capability flags (unified shell)
        registrationUnit: 'pair',
        supportedModes: ['names_only', 'open'],
        supportsRatingLimit: ['individual', 'combined'],
        matchFormats: ['round-robin', 'groups+ko', 'knockout'],

        hint: 'Pre-formed pairs. 4-32 teams.'
    },

    mixicano: {
        name: 'Mixicano',
        description: 'Mixed gender dynamic pairing based on standings',
        emoji: '🔀',

        minPlayers: 4,
        maxPlayers: 80,

        rule: 'divisible4',

        defaults: {
            courts: 1,
            pointsPerMatch: 32
        },

        registrationUnit: 'individual',
        supportedModes: ['names_only'],
        supportsRatingLimit: [],

        hint: 'Requires equal male and female players, divisible by 4 (4, 8, 12...)'
    },

    'round-robin': {
        name: 'Round Robin',
        description: 'Every team plays every other team once',
        emoji: '🔁',

        minTeams: 4,
        maxTeams: 24,
        playersPerTeam: 2,

        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        rule: 'teams',

        defaults: {
            courts: 2,
            pointsPerMatch: 16
        },

        registrationUnit: 'pair',
        supportedModes: ['names_only'],
        supportsRatingLimit: [],

        hint: 'Fixed pairs of 2 players each (4-24 teams)'
    },

    swiss: {
        name: 'Swiss System',
        description: 'Opponents matched by standings each round',
        emoji: '♟️',

        minTeams: 4,
        maxTeams: 40,
        playersPerTeam: 2,

        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        rule: 'teams',

        defaults: {
            courts: 2,
            pointsPerMatch: 16
        },

        registrationUnit: 'pair',
        supportedModes: ['names_only'],
        supportsRatingLimit: [],

        hint: 'Fixed pairs, even number of teams required (4-40 teams)'
    }
};

/**
 * Validate player/team count for a format
 * @param {number} count - Number of players or teams
 * @param {string} format - Format key (americano, mexicano, mix, team-league, fixed-pair, ...)
 * @returns {object} { valid: boolean, error?: string }
 */
function validateFormatCount(count, format) {
    const config = FORMAT_CONFIG[format];

    if (!config) {
        return { valid: false, error: `Unknown format: ${format}` };
    }

    const isTeamFormat = config.rule === 'teams' || config.playersPerTeam > 0;
    const label = isTeamFormat ? 'teams' : 'players';
    const min = isTeamFormat ? config.minTeams : config.minPlayers;
    const max = isTeamFormat ? config.maxTeams : config.maxPlayers;

    if (count < min) {
        return { valid: false, error: `Minimum ${min} ${label} required for ${config.name}` };
    }

    if (count > max) {
        return { valid: false, error: `Maximum ${max} ${label} allowed for ${config.name}` };
    }

    if (config.rule === 'divisible4' && count % 4 !== 0) {
        const lower = Math.floor(count / 4) * 4;
        const upper = Math.ceil(count / 4) * 4;
        const suggestion = lower >= min ? `${lower} or ${upper}` : `${upper}`;
        return {
            valid: false,
            error: `${config.name} requires player count divisible by 4. Try ${suggestion}.`
        };
    }

    if (config.rule === 'fixed' && !config.validOptions.includes(count)) {
        return {
            valid: false,
            error: `${config.name} only supports ${config.validOptions.join(', ')} players`
        };
    }

    return { valid: true };
}

/**
 * Get format configuration
 */
function getFormatConfig(format) {
    return FORMAT_CONFIG[format] || null;
}

/**
 * Get all format keys
 */
function getAllFormats() {
    return Object.keys(FORMAT_CONFIG);
}

/**
 * Get format keys that support a given capability flag.
 * @param {string} capability - e.g. 'open' for supportedModes
 * @returns {string[]}
 */
function getFormatsSupportingMode(mode) {
    return Object.keys(FORMAT_CONFIG).filter(k => {
        const modes = FORMAT_CONFIG[k].supportedModes || [];
        return modes.includes(mode);
    });
}

// Export for use in modules (if using ES modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FORMAT_CONFIG,
        validateFormatCount,
        getFormatConfig,
        getAllFormats,
        getFormatsSupportingMode
    };
}

// Make available globally for <script> tag consumers (legacy pages + new shell)
if (typeof window !== 'undefined') {
    window.FORMAT_CONFIG = FORMAT_CONFIG;
    window.validateFormatCount = validateFormatCount;
    window.getFormatConfig = getFormatConfig;
    window.getAllFormats = getAllFormats;
    window.getFormatsSupportingMode = getFormatsSupportingMode;
}
