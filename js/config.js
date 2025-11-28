// ===== APPLICATION CONFIGURATION =====

const CONFIG = {
    // Admin passcode for creating tournaments
    ADMIN_PASSCODE: '2025',
    
    // Tournament Settings
    TOTAL_PLAYERS: 24,
    TOTAL_ROUNDS: 13,
    MATCHES_PER_ROUND: 6,
    DEFAULT_MAX_SCORE: 16,
    FIXTURE_MAX_SCORE: 16, // Default max score for fixture matches
    
    // Knockout Settings
    KNOCKOUT_MAX_SCORE: 16,
    SEMI_MAX_SCORE: 16,
    FINAL_MAX_SCORE: 16,
    
    // Points System
    POINTS_WIN: 3,
    POINTS_DRAW: 1,
    POINTS_LOSS: 0,
    
    // Tier Definitions
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
        MATCH_NAMES: './data/match-names.json'
    },
    
    // Version Control
    MAX_SAVED_VERSIONS: 10
};

// ===== UTILITY FUNCTIONS =====

function getTier(playerId) {
    for (const [key, tier] of Object.entries(CONFIG.TIERS)) {
        if (playerId >= tier.min && playerId <= tier.max) {
            return key.toLowerCase().replace(/_/g, '-');
        }
    }
    return 'beginner';
}

function getTierName(playerId) {
    for (const tier of Object.values(CONFIG.TIERS)) {
        if (playerId >= tier.min && playerId <= tier.max) {
            return tier.name;
        }
    }
    return 'Beginner';
}

function getTierClass(playerId) {
    for (const tier of Object.values(CONFIG.TIERS)) {
        if (playerId >= tier.min && playerId <= tier.max) {
            return tier.class;
        }
    }
    return 'tier-beginner';
}

function isWithinGroup(match) {
    const allPlayers = [...match.team1, ...match.team2];
    const tier = getTier(allPlayers[0]);
    return allPlayers.every(p => getTier(p) === tier);
}

console.log('✅ Config loaded');
