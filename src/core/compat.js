/**
 * compat.js - Backwards Compatibility Layer
 * Allows existing tournament code to use new core modules seamlessly
 * 
 * Include this file AFTER core modules to create format-specific compatibility:
 * 
 * <script src="src/core/firebase.js"></script>
 * <script src="src/core/permissions.js"></script>
 * <script src="src/core/storage.js"></script>
 * <script src="src/core/router.js"></script>
 * <script src="src/core/auth.js"></script>
 * <script src="src/core/compat.js"></script>
 * 
 * Then in your format-specific code, call:
 *   setupCompat('americano'); // or 'mexicano', 'team-league', 'tournament'
 * 
 * @module core/compat
 */

/**
 * Format-specific configuration defaults
 */
const FORMAT_CONFIGS = {
    americano: {
        FIREBASE_ROOT: 'americano-tournaments',
        STORAGE_KEY: 'uber_padel_americano_tournaments',
        MIN_PLAYERS: 5,
        MAX_PLAYERS: 24,
        MIN_COURTS: 1,
        MAX_COURTS: 6,
        DEFAULT_PLAYERS: 6,
        DEFAULT_COURTS: 1,
        DEFAULT_TOTAL_POINTS: 16,
        DEFAULT_FIXED_POINTS: true,
        POINTS_OPTIONS: [16, 21, 24, 32],
        TOURNAMENT_ID_LENGTH: 6,
        ORGANISER_KEY_LENGTH: 16,
        MAX_STORED_TOURNAMENTS: 20,
        MAX_ROUNDS_DISPLAY: 26
    },
    mexicano: {
        FIREBASE_ROOT: 'mexicano-tournaments',
        STORAGE_KEY: 'uber_padel_mexicano_tournaments',
        MIN_PLAYERS: 8,
        MAX_PLAYERS: 80,
        DEFAULT_POINTS: 32,
        POINTS_OPTIONS: [16, 21, 24, 32],
        TOURNAMENT_ID_LENGTH: 6,
        ORGANISER_KEY_LENGTH: 16,
        MAX_STORED_TOURNAMENTS: 20
    },
    'team-league': {
        FIREBASE_ROOT: 'team-leagues',
        STORAGE_KEY: 'uber_padel_team_tournaments',
        MIN_TEAMS: 2,
        MAX_TEAMS: 16,
        TOURNAMENT_ID_LENGTH: 6,
        ORGANISER_KEY_LENGTH: 16,
        MAX_STORED_TOURNAMENTS: 20
    },
    tournament: {
        FIREBASE_ROOT: 'fixed-tournaments',
        STORAGE_KEY: 'uber_padel_fixed_tournaments',
        TOURNAMENT_ID_LENGTH: 6,
        ORGANISER_KEY_LENGTH: 16,
        MAX_STORED_TOURNAMENTS: 20
    },
    mix: {
        FIREBASE_ROOT: 'fixed-tournaments',
        STORAGE_KEY: 'uber_padel_fixed_tournaments',
        TOURNAMENT_ID_LENGTH: 6,
        ORGANISER_KEY_LENGTH: 16,
        MAX_STORED_TOURNAMENTS: 20
    }
};

/**
 * Player color classes (shared across formats)
 */
const PLAYER_COLORS = [
    'player-color-1', 'player-color-2', 'player-color-3', 'player-color-4',
    'player-color-5', 'player-color-6', 'player-color-7', 'player-color-8',
    'player-color-9', 'player-color-10', 'player-color-11', 'player-color-12',
    'player-color-13', 'player-color-14', 'player-color-15', 'player-color-16',
    'player-color-17', 'player-color-18', 'player-color-19', 'player-color-20',
    'player-color-21', 'player-color-22', 'player-color-23', 'player-color-24'
];

/**
 * Setup compatibility layer for a specific format
 * This creates the expected global variables that existing code relies on
 * 
 * @param {string} format - Tournament format ('americano', 'mexicano', 'team-league', 'tournament')
 */
function setupCompat(format) {
    const formatConfig = FORMAT_CONFIGS[format];
    
    if (!formatConfig) {
        console.error(`Unknown format: ${format}. Available: ${Object.keys(FORMAT_CONFIGS).join(', ')}`);
        return;
    }
    
    // ===== Create CONFIG global =====
    window.CONFIG = { ...formatConfig };
    
    // ===== Create database global =====
    // Initialize Firebase and expose database
    if (typeof Firebase !== 'undefined') {
        Firebase.init();
        window.database = Firebase.getDatabase();
    }
    
    // ===== Create backwards-compatible firebase functions =====
    
    // Initialize Firebase (legacy function)
    window.initializeFirebase = function() {
        if (typeof Firebase !== 'undefined') {
            const { database } = Firebase.init();
            window.database = database;
            return database;
        }
        // Fallback for when new core isn't loaded
        return null;
    };
    
    // Get tournament reference
    window.getTournamentRef = function(tournamentId) {
        if (typeof Firebase !== 'undefined') {
            return Firebase.getTournamentRef(format.toUpperCase().replace('-', '_'), tournamentId);
        }
        return window.database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}`);
    };
    
    // Check tournament exists
    window.checkTournamentExists = async function(tournamentId) {
        if (typeof Firebase !== 'undefined') {
            return Firebase.checkTournamentExists(format.toUpperCase().replace('-', '_'), tournamentId);
        }
        try {
            const snapshot = await window.database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta`).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Error checking tournament existence:', error);
            return false;
        }
    };
    
    // Create tournament
    window.createTournamentInFirebase = async function(tournamentId, data) {
        if (typeof Firebase !== 'undefined') {
            return Firebase.createTournament(format.toUpperCase().replace('-', '_'), tournamentId, data);
        }
        try {
            await window.database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}`).set(data);
            return true;
        } catch (error) {
            console.error('Error creating tournament:', error);
            return false;
        }
    };
    
    // Update tournament
    window.updateTournamentInFirebase = async function(tournamentId, data) {
        if (typeof Firebase !== 'undefined') {
            return Firebase.updateTournament(format.toUpperCase().replace('-', '_'), tournamentId, data);
        }
        try {
            await window.database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}`).update(data);
            return true;
        } catch (error) {
            console.error('Error updating tournament:', error);
            return false;
        }
    };
    
    // Save score
    window.saveScoreToFirebase = async function(tournamentId, roundIndex, matchIndex, team1Score, team2Score) {
        if (typeof Firebase !== 'undefined') {
            return Firebase.saveScore(format.toUpperCase().replace('-', '_'), tournamentId, roundIndex, matchIndex, team1Score, team2Score);
        }
        try {
            await window.database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/scores/${roundIndex}_${matchIndex}`).set({
                team1: team1Score === null ? -1 : team1Score,
                team2: team2Score === null ? -1 : team2Score
            });
            await window.database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta/updatedAt`).set(new Date().toISOString());
            return true;
        } catch (error) {
            console.error('Error saving score:', error);
            return false;
        }
    };
    
    // Verify organiser key
    window.verifyOrganiserKey = async function(tournamentId, key) {
        if (typeof Firebase !== 'undefined') {
            return Firebase.verifyOrganiserKey(format.toUpperCase().replace('-', '_'), tournamentId, key);
        }
        try {
            const snapshot = await window.database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta/organiserKey`).once('value');
            return snapshot.val() === key;
        } catch (error) {
            console.error('Error verifying organiser key:', error);
            return false;
        }
    };
    
    // Get passcode hash
    window.getPasscodeHash = async function(tournamentId) {
        if (typeof Firebase !== 'undefined') {
            return Firebase.getPasscodeHash(format.toUpperCase().replace('-', '_'), tournamentId);
        }
        try {
            const snapshot = await window.database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta/passcodeHash`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting passcode hash:', error);
            return null;
        }
    };
    
    // Get organiser key
    window.getOrganiserKey = async function(tournamentId) {
        if (typeof Firebase !== 'undefined') {
            return Firebase.getOrganiserKey(format.toUpperCase().replace('-', '_'), tournamentId);
        }
        try {
            const snapshot = await window.database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta/organiserKey`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting organiser key:', error);
            return null;
        }
    };
    
    // ===== Player colors =====
    window.PLAYER_COLORS = PLAYER_COLORS;
    
    window.getPlayerColorClass = function(playerNum) {
        const index = (playerNum - 1) % PLAYER_COLORS.length;
        return PLAYER_COLORS[index];
    };
    
    window.getDefaultPlayerNames = function(count) {
        return Array.from({ length: count }, (_, i) => `Player ${i + 1}`);
    };
    
    window.getDefaultCourtNames = function(count) {
        return Array.from({ length: count }, (_, i) => `Court ${i + 1}`);
    };
    
    // ===== UberAuth compatibility =====
    if (typeof Auth !== 'undefined') {
        window.UberAuth = Auth;
    }
    
    console.log(`✅ Compatibility layer setup for: ${format}`);
    console.log(`   CONFIG.FIREBASE_ROOT: ${CONFIG.FIREBASE_ROOT}`);
    
    return CONFIG;
}

/**
 * Get format-specific config without setting globals
 * Useful for services that need config but don't want side effects
 * 
 * @param {string} format
 * @returns {object} Config for the format
 */
function getFormatConfig(format) {
    return { ...FORMAT_CONFIGS[format] } || null;
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupCompat, getFormatConfig, FORMAT_CONFIGS, PLAYER_COLORS };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.setupCompat = setupCompat;
    window.getFormatConfig = getFormatConfig;
    window.FORMAT_CONFIGS = FORMAT_CONFIGS;
}
