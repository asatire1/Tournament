// ===== APPLICATION CONFIGURATION =====

const CONFIG = {
    // Tournament Settings - defaults (can be overridden by tournament metadata)
    TOTAL_PLAYERS: 24,
    TOTAL_ROUNDS: 13,
    MATCHES_PER_ROUND: 6,
    DEFAULT_MAX_SCORE: 16,
    FIXTURE_MAX_SCORE: 16, // Default max score for fixture matches
    
    // Supported Player Counts
    SUPPORTED_PLAYER_COUNTS: [20, 24, 28],
    
    // Player Count Configurations
    PLAYER_CONFIGS: {
        20: {
            totalPlayers: 20,
            totalRounds: 11,
            matchesPerRound: 5,
            tierCount: 5,
            fixturesFile: './data/fixtures-20.json',
            tierNames: ['Elite', 'Advanced', 'Intermediate+', 'Intermediate', 'Beginner']
        },
        24: {
            totalPlayers: 24,
            totalRounds: 13,
            matchesPerRound: 6,
            tierCount: 6,
            fixturesFile: './data/fixtures.json',
            tierNames: ['Elite', 'Advanced', 'Intermediate+', 'Intermediate', 'Beginner+', 'Beginner']
        },
        28: {
            totalPlayers: 28,
            totalRounds: 15,
            matchesPerRound: 7,
            tierCount: 7,
            fixturesFile: './data/fixtures-28.json',
            tierNames: ['Elite', 'Advanced+', 'Advanced', 'Intermediate+', 'Intermediate', 'Beginner+', 'Beginner']
        }
    },
    
    // Knockout Settings
    KNOCKOUT_MAX_SCORE: 16,
    SEMI_MAX_SCORE: 16,
    FINAL_MAX_SCORE: 16,
    
    // Points System
    POINTS_WIN: 3,
    POINTS_DRAW: 1,
    POINTS_LOSS: 0,
    
    // Tier Definitions - will be dynamically set based on player count
    TIERS: {
        ELITE: { min: 1, max: 4, name: 'Elite', class: 'tier-elite' },
        ADVANCED: { min: 5, max: 8, name: 'Advanced', class: 'tier-advanced' },
        INTERMEDIATE_PLUS: { min: 9, max: 12, name: 'Intermediate+', class: 'tier-intermediate-plus' },
        INTERMEDIATE: { min: 13, max: 16, name: 'Intermediate', class: 'tier-intermediate' },
        BEGINNER_PLUS: { min: 17, max: 20, name: 'Beginner+', class: 'tier-beginner-plus' },
        BEGINNER: { min: 21, max: 24, name: 'Beginner', class: 'tier-beginner' }
    },
    
    // Data Paths (relative to index.html)
    DATA_PATHS: {
        PLAYERS: './data/players.json',
        FIXTURES: './data/fixtures.json',
        FIXTURES_20: './data/fixtures-20.json',
        FIXTURES_28: './data/fixtures-28.json',
        MATCH_NAMES: './data/match-names.json'
    },
    
    // Version Control
    MAX_SAVED_VERSIONS: 10
};

// ===== DYNAMIC TIER GENERATION =====

// Generate tiers based on player count
function generateTiers(playerCount) {
    const config = CONFIG.PLAYER_CONFIGS[playerCount];
    if (!config) return CONFIG.TIERS; // fallback to default
    
    const tiers = {};
    const tierNames = config.tierNames;
    const tierKeys = ['ELITE', 'ADVANCED_PLUS', 'ADVANCED', 'INTERMEDIATE_PLUS', 'INTERMEDIATE', 'BEGINNER_PLUS', 'BEGINNER'];
    const tierClasses = ['tier-elite', 'tier-advanced-plus', 'tier-advanced', 'tier-intermediate-plus', 'tier-intermediate', 'tier-beginner-plus', 'tier-beginner'];
    
    for (let i = 0; i < config.tierCount; i++) {
        const key = tierKeys[i] || `TIER_${i + 1}`;
        const className = tierClasses[i] || `tier-${i + 1}`;
        tiers[key] = {
            min: i * 4 + 1,
            max: (i + 1) * 4,
            name: tierNames[i],
            class: className
        };
    }
    
    return tiers;
}

// Set active player count configuration
function setPlayerCountConfig(playerCount) {
    const config = CONFIG.PLAYER_CONFIGS[playerCount];
    if (!config) {
        console.warn(`Unsupported player count: ${playerCount}, falling back to 24`);
        return setPlayerCountConfig(24);
    }
    
    CONFIG.TOTAL_PLAYERS = config.totalPlayers;
    CONFIG.TOTAL_ROUNDS = config.totalRounds;
    CONFIG.MATCHES_PER_ROUND = config.matchesPerRound;
    CONFIG.TIERS = generateTiers(playerCount);
    
    return config;
}

// Get fixtures file path for a player count
function getFixturesPath(playerCount) {
    const config = CONFIG.PLAYER_CONFIGS[playerCount];
    return config ? config.fixturesFile : CONFIG.DATA_PATHS.FIXTURES;
}

// ===== UTILITY FUNCTIONS =====

function getTier(playerId, playerCount = CONFIG.TOTAL_PLAYERS) {
    const tiers = playerCount !== CONFIG.TOTAL_PLAYERS ? generateTiers(playerCount) : CONFIG.TIERS;
    for (const [key, tier] of Object.entries(tiers)) {
        if (playerId >= tier.min && playerId <= tier.max) {
            return key.toLowerCase().replace(/_/g, '-');
        }
    }
    return 'beginner';
}

function getTierName(playerId, playerCount = CONFIG.TOTAL_PLAYERS) {
    const tiers = playerCount !== CONFIG.TOTAL_PLAYERS ? generateTiers(playerCount) : CONFIG.TIERS;
    for (const tier of Object.values(tiers)) {
        if (playerId >= tier.min && playerId <= tier.max) {
            return tier.name;
        }
    }
    return 'Beginner';
}

function getTierClass(playerId, playerCount = CONFIG.TOTAL_PLAYERS) {
    const tiers = playerCount !== CONFIG.TOTAL_PLAYERS ? generateTiers(playerCount) : CONFIG.TIERS;
    for (const tier of Object.values(tiers)) {
        if (playerId >= tier.min && playerId <= tier.max) {
            return tier.class;
        }
    }
    return 'tier-beginner';
}

function isWithinGroup(match, playerCount = CONFIG.TOTAL_PLAYERS) {
    const allPlayers = [...match.team1, ...match.team2];
    const tier = getTier(allPlayers[0], playerCount);
    return allPlayers.every(p => getTier(p, playerCount) === tier);
}

console.log('✅ Config loaded');
