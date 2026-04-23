/**
 * tournaments/js/config.js — Unified tournament module constants
 *
 * The unified `/tournaments/` shell writes every new tournament into a single
 * Firebase Realtime Database root: `tournaments/{id}`. The `meta.format`
 * field tells the engine + play-page dispatcher which format to use.
 *
 * Legacy roots (americano-tournaments/*, mexicano-tournaments/*, ...) are
 * kept alive read-only for already-created tournaments. New tournaments
 * never write there.
 */

const TOURNAMENTS_CONFIG = {
    // Unified Firebase root for the new shell
    FIREBASE_ROOT: 'tournaments',

    // IDs + keys
    TOURNAMENT_ID_LENGTH: 8,
    ORGANISER_KEY_LENGTH: 16,

    // Browse / search
    DEFAULT_RADIUS_MILES: 25,
    RADIUS_OPTIONS: [5, 10, 25, 50, 100],
    BROWSE_PAGE_SIZE: 20,
    BROWSE_CACHE_TTL_MS: 2 * 60 * 1000, // 2 minutes

    // Postcode service
    POSTCODE_CACHE_KEY: 'uberpadel_postcode_cache',
    POSTCODE_CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours in localStorage
    POSTCODES_IO_BASE: 'https://api.postcodes.io',

    // localStorage keys
    LAST_POSTCODE_KEY: 'uberpadel_last_postcode',
    MY_TOURNAMENTS_KEY: 'uberpadel_my_tournaments_unified',
    MAX_STORED_TOURNAMENTS: 20,

    // Lifecycle states
    LIFECYCLE: {
        DRAFT:                'draft',
        OPEN_FOR_REGISTRATION:'open_for_registration',
        REGISTRATION_CLOSED:  'registration_closed',
        ACTIVE:               'active',
        COMPLETED:            'completed',
        CANCELLED:            'cancelled'
    },

    // Registration modes
    REG_MODE: {
        OPEN:        'open',
        NAMES_ONLY:  'names_only'
    },

    // Phase flags — turn features on as phases ship
    FEATURE_FLAGS: {
        OPEN_REGISTRATION_ENABLED: true,  // Phase C live
        PAID_ENTRY_ENABLED:        false, // Phase E lights this up
        INVITE_LINKS_ENABLED:      true   // Phase D live
    }
};

/**
 * Generate a random tournament ID (8 chars, alphanumeric).
 * Matches the existing validation regex `[a-zA-Z0-9]{6,20}` in rules.
 */
function generateTournamentId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < TOURNAMENTS_CONFIG.TOURNAMENT_ID_LENGTH; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

/**
 * Generate a random organiser key (16 chars).
 */
function generateOrganiserKey() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < TOURNAMENTS_CONFIG.ORGANISER_KEY_LENGTH; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

/**
 * Format picker tiles source of truth — filters the FORMAT_CONFIG by
 * whether the format is ready for the unified shell.
 * @param {string} [mode] - If given, only formats supporting this mode
 */
function getPickerFormats(mode) {
    if (typeof FORMAT_CONFIG === 'undefined') return [];
    return Object.entries(FORMAT_CONFIG)
        .filter(([, cfg]) => {
            if (!mode) return true;
            return (cfg.supportedModes || []).includes(mode);
        })
        .map(([key, cfg]) => ({
            key,
            name: cfg.name,
            emoji: cfg.emoji,
            description: cfg.description,
            registrationUnit: cfg.registrationUnit,
            hint: cfg.hint
        }));
}

if (typeof window !== 'undefined') {
    window.TOURNAMENTS_CONFIG  = TOURNAMENTS_CONFIG;
    window.generateTournamentId = generateTournamentId;
    window.generateOrganiserKey = generateOrganiserKey;
    window.getPickerFormats     = getPickerFormats;
}
