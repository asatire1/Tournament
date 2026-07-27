/**
 * Shared Format Configuration
 * 
 * Single source of truth for all tournament format rules.
 * Used by both Quick Play and Competitions.
 * 
 * Change here → applies everywhere
 */

const FORMAT_CONFIG = {
    americano: {
        name: 'Americano',
        description: 'Round-robin with rotating partners',
        emoji: '🎾',
        
        // Player limits
        minPlayers: 5,
        maxPlayers: 24,
        
        // Validation rule: 'any', 'divisible4', 'fixed', 'teams'
        rule: 'any',
        
        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 32
        },
        
        // Help text
        hint: 'Supports 5-24 players (odd numbers allowed - players rest in rotation)'
    },
    
    mexicano: {
        name: 'Mexicano',
        description: 'Dynamic pairing based on standings',
        emoji: '🌮',
        
        // Player limits
        minPlayers: 8,
        maxPlayers: 80,
        
        // Validation rule
        rule: 'divisible4',
        
        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 32
        },
        
        // Help text
        hint: 'Requires player count divisible by 4 (8, 12, 16, 20, 24...)'
    },
    
    mix: {
        name: 'Mix Tournament',
        description: 'Balanced competition with skill-based tiers ensuring fair matches for all levels',
        emoji: '🏆',
        
        // Player limits (fixed options only)
        minPlayers: 20,
        maxPlayers: 28,
        validOptions: [20, 24, 28],
        
        // Validation rule
        rule: 'fixed',
        
        // Default settings
        defaults: {
            courts: 6,
            pointsPerMatch: 16
        },
        
        // Help text
        hint: 'Only supports 20, 24, or 28 players (creates balanced skill tiers)'
    },
    
    'team-league': {
        name: 'Team League',
        description: 'Fixed teams compete in league + knockout',
        emoji: '👥',
        
        // Team limits (not players)
        minTeams: 4,
        maxTeams: 36,
        playersPerTeam: 2,

        // Computed player limits
        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        // Validation rule
        rule: 'teams',

        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 16
        },

        // Help text
        hint: 'Uses fixed teams of 2 players each (4-36 teams)'
    },

    mixicano: {
        name: 'Mixicano',
        description: 'Mixed gender dynamic pairing based on standings',
        emoji: '🔀',

        // Player limits (must be divisible by 4, equal M/F)
        minPlayers: 4,
        maxPlayers: 80,

        // Validation rule
        rule: 'divisible4',

        // Default settings
        defaults: {
            courts: 1,
            pointsPerMatch: 32
        },

        // Help text
        hint: 'Requires equal male and female players, divisible by 4 (4, 8, 12...)'
    },

    'round-robin': {
        name: 'Round Robin',
        description: 'Every team plays every other team once',
        emoji: '🔁',

        // Team limits
        minTeams: 4,
        maxTeams: 24,
        playersPerTeam: 2,

        // Computed player limits
        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        // Validation rule
        rule: 'teams',

        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 16
        },

        // Help text
        hint: 'Fixed pairs of 2 players each (4-24 teams)'
    },

    swiss: {
        name: 'Swiss System',
        description: 'Opponents matched by standings each round',
        emoji: '♟️',

        // Team limits
        minTeams: 4,
        maxTeams: 40,
        playersPerTeam: 2,

        // Computed player limits
        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        // Validation rule
        rule: 'teams',

        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 16
        },

        // Help text
        hint: 'Fixed pairs, even number of teams required (4-40 teams)'
    }
};

/**
 * Validate player/team count for a format
 * @param {number} count - Number of players or teams
 * @param {string} format - Format key (americano, mexicano, mix, team-league)
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
    
    // Check minimum
    if (count < min) {
        return { 
            valid: false, 
            error: `Minimum ${min} ${label} required for ${config.name}` 
        };
    }
    
    // Check maximum
    if (count > max) {
        return { 
            valid: false, 
            error: `Maximum ${max} ${label} allowed for ${config.name}` 
        };
    }
    
    // Format-specific rules
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
 * @param {string} format - Format key
 * @returns {object|null} Format config or null if not found
 */
function getFormatConfig(format) {
    return FORMAT_CONFIG[format] || null;
}

/**
 * Get all format keys
 * @returns {string[]} Array of format keys
 */
function getAllFormats() {
    return Object.keys(FORMAT_CONFIG);
}

/**
 * Escape a value for interpolation into HTML.
 *
 * This file is loaded by every format page, so it is the one place a shared
 * helper can live without adding another script tag. Player names, team names,
 * tournament names and scores all come from other users via the database, and
 * are rendered with innerHTML throughout the app.
 *
 * Quotes are escaped too, so this is safe in attribute positions
 * (value="...", title="..."), not only in text nodes. Prefer setting
 * .textContent or .value as a property where you can — this is for the many
 * places that build markup as strings.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Coerce a score to a safe numeric string for rendering.
 * Scores arrive from the database as unvalidated JSON on several roots, so a
 * non-number must never reach innerHTML.
 * @param {unknown} value
 * @returns {string} The number as a string, or '' if it is not a finite number.
 */
function safeScore(value) {
    return Number.isFinite(Number(value)) && value !== '' && value !== null ? String(Number(value)) : '';
}

// Make available globally — plain-script pages use these directly
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
    window.safeScore  = safeScore;
}

// Export for use in modules (if using ES modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FORMAT_CONFIG, validateFormatCount, getFormatConfig, getAllFormats, escapeHtml, safeScore };
}
