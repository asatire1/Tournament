/**
 * firebase.js - Single Firebase Configuration
 * Centralized Firebase initialization for all tournament formats
 * 
 * @module core/firebase
 */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDYIlRS_me7sy7ptNmRrvPQCeXP2H-hHzU",
    authDomain: "stretford-padel-tournament.firebaseapp.com",
    databaseURL: "https://stretford-padel-tournament-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "stretford-padel-tournament",
    storageBucket: "stretford-padel-tournament.firebasestorage.app",
    messagingSenderId: "596263602058",
    appId: "1:596263602058:web:f69f7f8d00c60abbd0aa73",
    measurementId: "G-TGJ6CZ4DZ0"
};

/**
 * Firebase database roots for different tournament formats
 */
const FIREBASE_ROOTS = {
    AMERICANO: 'americano-tournaments',
    MEXICANO: 'mexicano-tournaments',
    TEAM_LEAGUE: 'team-leagues',
    MIX_TOURNAMENT: 'fixed-tournaments',
    USERS: 'users'
};

/**
 * Firebase singleton
 */
const Firebase = {
    _app: null,
    _database: null,
    _auth: null,
    _initialized: false,

    /**
     * Initialize Firebase (idempotent - safe to call multiple times)
     * @returns {object} { app, database, auth }
     */
    init() {
        if (this._initialized) {
            return {
                app: this._app,
                database: this._database,
                auth: this._auth
            };
        }

        // Check if firebase is available
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded');
            throw new Error('Firebase SDK must be loaded before calling Firebase.init()');
        }

        // Initialize app if not already done
        if (!firebase.apps.length) {
            this._app = firebase.initializeApp(FIREBASE_CONFIG);
        } else {
            this._app = firebase.apps[0];
        }

        this._database = firebase.database();
        this._auth = firebase.auth();
        this._initialized = true;

        console.log('✅ Firebase initialized (core/firebase.js)');

        return {
            app: this._app,
            database: this._database,
            auth: this._auth
        };
    },

    /**
     * Get database reference
     * @returns {object} Firebase database instance
     */
    getDatabase() {
        if (!this._initialized) {
            this.init();
        }
        return this._database;
    },

    /**
     * Get auth instance
     * @returns {object} Firebase auth instance
     */
    getAuth() {
        if (!this._initialized) {
            this.init();
        }
        return this._auth;
    },

    /**
     * Get reference to a tournament format's data
     * @param {string} format - Tournament format (use FIREBASE_ROOTS keys)
     * @param {string} [tournamentId] - Optional tournament ID
     * @returns {object} Firebase database reference
     */
    getTournamentRef(format, tournamentId = null) {
        const db = this.getDatabase();
        const root = FIREBASE_ROOTS[format] || format;
        
        if (tournamentId) {
            return db.ref(`${root}/${tournamentId}`);
        }
        return db.ref(root);
    },

    /**
     * Get reference to users data
     * @param {string} [userId] - Optional user ID
     * @returns {object} Firebase database reference
     */
    getUsersRef(userId = null) {
        const db = this.getDatabase();
        if (userId) {
            return db.ref(`${FIREBASE_ROOTS.USERS}/${userId}`);
        }
        return db.ref(FIREBASE_ROOTS.USERS);
    },

    /**
     * Check if a tournament exists
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @returns {Promise<boolean>}
     */
    async checkTournamentExists(format, tournamentId) {
        try {
            const ref = this.getTournamentRef(format, tournamentId);
            const snapshot = await ref.child('meta').once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Error checking tournament existence:', error);
            return false;
        }
    },

    /**
     * Create a tournament
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @param {object} data - Tournament data
     * @returns {Promise<boolean>}
     */
    async createTournament(format, tournamentId, data) {
        try {
            const ref = this.getTournamentRef(format, tournamentId);
            await ref.set(data);
            return true;
        } catch (error) {
            console.error('Error creating tournament:', error);
            return false;
        }
    },

    /**
     * Update tournament data
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @param {object} data - Data to update
     * @returns {Promise<boolean>}
     */
    async updateTournament(format, tournamentId, data) {
        try {
            const ref = this.getTournamentRef(format, tournamentId);
            await ref.update(data);
            return true;
        } catch (error) {
            console.error('Error updating tournament:', error);
            return false;
        }
    },

    /**
     * Save a score to a tournament
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @param {number} roundIndex - Round index
     * @param {number} matchIndex - Match index
     * @param {number|null} team1Score - Team 1 score
     * @param {number|null} team2Score - Team 2 score
     * @returns {Promise<boolean>}
     */
    async saveScore(format, tournamentId, roundIndex, matchIndex, team1Score, team2Score) {
        try {
            const ref = this.getTournamentRef(format, tournamentId);
            await ref.child(`scores/${roundIndex}_${matchIndex}`).set({
                team1: team1Score === null ? -1 : team1Score,
                team2: team2Score === null ? -1 : team2Score
            });
            await ref.child('meta/updatedAt').set(new Date().toISOString());
            return true;
        } catch (error) {
            console.error('Error saving score:', error);
            return false;
        }
    },

    /**
     * Verify organiser key
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @param {string} key - Key to verify
     * @returns {Promise<boolean>}
     */
    async verifyOrganiserKey(format, tournamentId, key) {
        try {
            const ref = this.getTournamentRef(format, tournamentId);
            const snapshot = await ref.child('meta/organiserKey').once('value');
            return snapshot.val() === key;
        } catch (error) {
            console.error('Error verifying organiser key:', error);
            return false;
        }
    },

    /**
     * Get passcode hash for login verification
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @returns {Promise<string|null>}
     */
    async getPasscodeHash(format, tournamentId) {
        try {
            const ref = this.getTournamentRef(format, tournamentId);
            const snapshot = await ref.child('meta/passcodeHash').once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting passcode hash:', error);
            return null;
        }
    },

    /**
     * Get organiser key after passcode verification
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @returns {Promise<string|null>}
     */
    async getOrganiserKey(format, tournamentId) {
        try {
            const ref = this.getTournamentRef(format, tournamentId);
            const snapshot = await ref.child('meta/organiserKey').once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting organiser key:', error);
            return null;
        }
    },

    /**
     * Subscribe to tournament updates
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    subscribeTournament(format, tournamentId, callback) {
        const ref = this.getTournamentRef(format, tournamentId);
        ref.on('value', callback);
        
        return () => ref.off('value', callback);
    },

    /**
     * Normalize Firebase data (convert arrays from objects)
     * @param {object} data - Firebase data that might have arrays stored as objects
     * @returns {object} Normalized data with proper arrays
     */
    normalizeData(data) {
        if (!data) return data;
        
        // If it's an object with numeric keys, convert to array
        if (typeof data === 'object' && !Array.isArray(data)) {
            const keys = Object.keys(data);
            const isArrayLike = keys.length > 0 && keys.every(k => !isNaN(parseInt(k)));
            
            if (isArrayLike) {
                const maxIndex = Math.max(...keys.map(k => parseInt(k)));
                const arr = new Array(maxIndex + 1);
                keys.forEach(k => {
                    arr[parseInt(k)] = this.normalizeData(data[k]);
                });
                return arr;
            }
            
            // Recursively normalize nested objects
            const normalized = {};
            for (const key of keys) {
                normalized[key] = this.normalizeData(data[key]);
            }
            return normalized;
        }
        
        return data;
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Firebase, FIREBASE_CONFIG, FIREBASE_ROOTS };
}

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
    window.Firebase = Firebase;
    window.FIREBASE_ROOTS = FIREBASE_ROOTS;
}
