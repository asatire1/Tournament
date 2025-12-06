/**
 * firebase.esm.js - Firebase Configuration (ES Module)
 * 
 * ES Module version for Vite builds.
 * For legacy usage, use firebase.js with script tags.
 * 
 * @module core/firebase
 */

/**
 * Firebase root paths for each tournament format
 */
export const FIREBASE_ROOTS = {
    AMERICANO: 'americano-tournaments',
    MEXICANO: 'mexicano-tournaments',
    TEAM_LEAGUE: 'team-leagues',
    TOURNAMENT: 'fixed-pair-tournaments',
    MIX_TOURNAMENT: 'fixed-pair-tournaments',
    USERS: 'users',
    COMPETITIONS: 'competitions'
};

/**
 * Firebase configuration - loaded from environment variables in production
 */
const getFirebaseConfig = () => {
    // Check for environment variables (Vite)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        const env = import.meta.env;
        if (env.UBER_FIREBASE_API_KEY) {
            return {
                apiKey: env.UBER_FIREBASE_API_KEY,
                authDomain: env.UBER_FIREBASE_AUTH_DOMAIN,
                databaseURL: env.UBER_FIREBASE_DATABASE_URL,
                projectId: env.UBER_FIREBASE_PROJECT_ID,
                storageBucket: env.UBER_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: env.UBER_FIREBASE_MESSAGING_SENDER_ID,
                appId: env.UBER_FIREBASE_APP_ID
            };
        }
    }
    
    // Fallback to hardcoded config (for development)
    return {
        apiKey: "AIzaSyBpKr-IS2IYXtqD6M0R8SSzOITnvpDx1YE",
        authDomain: "americano-tournament.firebaseapp.com",
        databaseURL: "https://americano-tournament-default-rtdb.firebaseio.com",
        projectId: "americano-tournament",
        storageBucket: "americano-tournament.firebasestorage.app",
        messagingSenderId: "659522729498",
        appId: "1:659522729498:web:5c0a75c96d1ad0e898fd29"
    };
};

/**
 * Firebase singleton
 */
class FirebaseManager {
    constructor() {
        this._initialized = false;
        this._app = null;
        this._database = null;
        this._auth = null;
    }
    
    /**
     * Initialize Firebase (idempotent)
     */
    init() {
        if (this._initialized) {
            return this;
        }
        
        // Check if firebase is loaded
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded');
            return this;
        }
        
        const config = getFirebaseConfig();
        
        // Check if already initialized
        if (firebase.apps.length === 0) {
            this._app = firebase.initializeApp(config);
        } else {
            this._app = firebase.apps[0];
        }
        
        this._database = firebase.database();
        this._auth = firebase.auth();
        this._initialized = true;
        
        console.log('✅ Firebase initialized');
        return this;
    }
    
    /**
     * Get Firebase database reference
     */
    get database() {
        if (!this._initialized) this.init();
        return this._database;
    }
    
    /**
     * Get Firebase auth
     */
    get auth() {
        if (!this._initialized) this.init();
        return this._auth;
    }
    
    /**
     * Get tournament reference
     * @param {string} format - Tournament format key
     * @param {string} [id] - Tournament ID
     * @returns {firebase.database.Reference}
     */
    getTournamentRef(format, id = null) {
        const root = FIREBASE_ROOTS[format] || FIREBASE_ROOTS.AMERICANO;
        const path = id ? `${root}/${id}` : root;
        return this.database.ref(path);
    }
    
    /**
     * Check if tournament exists
     * @param {string} format
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async checkTournamentExists(format, id) {
        const snapshot = await this.getTournamentRef(format, id).once('value');
        return snapshot.exists();
    }
    
    /**
     * Create a tournament
     * @param {string} format
     * @param {string} id
     * @param {object} data
     * @returns {Promise<void>}
     */
    async createTournament(format, id, data) {
        await this.getTournamentRef(format, id).set({
            ...data,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    /**
     * Update tournament data
     * @param {string} format
     * @param {string} id
     * @param {object} updates
     * @returns {Promise<void>}
     */
    async updateTournament(format, id, updates) {
        await this.getTournamentRef(format, id).update({
            ...updates,
            lastModified: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    /**
     * Save score for a match
     * @param {string} format
     * @param {string} id
     * @param {number} roundIndex
     * @param {number} matchIndex
     * @param {number} team1Score
     * @param {number} team2Score
     * @returns {Promise<void>}
     */
    async saveScore(format, id, roundIndex, matchIndex, team1Score, team2Score) {
        await this.getTournamentRef(format, id)
            .child(`scores/${roundIndex}/${matchIndex}`)
            .set([team1Score, team2Score]);
    }
    
    /**
     * Subscribe to tournament changes
     * @param {string} format
     * @param {string} id
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    subscribeTournament(format, id, callback) {
        const ref = this.getTournamentRef(format, id);
        const handler = (snapshot) => {
            const data = snapshot.val();
            if (data) {
                callback(this.normalizeData(data));
            }
        };
        
        ref.on('value', handler);
        
        return () => ref.off('value', handler);
    }
    
    /**
     * Normalize Firebase data (convert arrays/objects)
     * @param {object} data
     * @returns {object}
     */
    normalizeData(data) {
        if (!data) return data;
        
        // Convert Firebase's object representation of arrays back to arrays
        const normalize = (obj) => {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            
            // Check if it's an array-like object (keys are consecutive integers starting from 0)
            const keys = Object.keys(obj);
            const isArrayLike = keys.length > 0 && 
                keys.every((k, i) => k === String(i));
            
            if (isArrayLike) {
                return keys.map(k => normalize(obj[k]));
            }
            
            // Regular object - recurse into properties
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = normalize(value);
            }
            return result;
        };
        
        return normalize(data);
    }
    
    /**
     * Verify organiser key
     * @param {string} format
     * @param {string} id
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    async verifyOrganiserKey(format, id, key) {
        const snapshot = await this.getTournamentRef(format, id)
            .child('organiserKey')
            .once('value');
        return snapshot.val() === key;
    }
}

// Create singleton instance
export const Firebase = new FirebaseManager();

export default Firebase;
