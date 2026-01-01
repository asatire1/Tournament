/**
 * organizer-auth.js - Anonymous Authentication for Tournament Organizers
 * 
 * Enables cross-device "My Tournaments" by using Firebase Anonymous Auth.
 * This is invisible to users - they don't need to sign up or log in.
 * 
 * Key features:
 * - Auto sign-in anonymously when creating a tournament
 * - Store organizerUid in tournament meta for ownership
 * - Query "My Tournaments" across devices
 * - Backward compatible with passcode system
 * 
 * @module core/organizer-auth
 */

const OrganizerAuth = {
    // Storage key for anonymous user persistence hint
    ANON_UID_KEY: 'uber_padel_organizer_uid',
    
    // Cache
    _currentUid: null,
    _initialized: false,
    _initPromise: null,

    /**
     * Initialize organizer auth - ensures anonymous sign-in
     * Call this before any tournament creation
     * @returns {Promise<string|null>} The organizer UID or null if failed
     */
    async init() {
        // Return cached promise if already initializing
        if (this._initPromise) {
            return this._initPromise;
        }

        // Return cached UID if already initialized
        if (this._initialized && this._currentUid) {
            return this._currentUid;
        }

        this._initPromise = this._doInit();
        return this._initPromise;
    },

    /**
     * Internal initialization
     * @private
     */
    async _doInit() {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined' || !firebase.auth) {
                console.warn('⚠️ OrganizerAuth: Firebase Auth not available, using local ID');
                return this._useLocalFallback();
            }

            // Check current auth state
            const currentUser = firebase.auth().currentUser;
            
            if (currentUser) {
                // Already signed in (could be anonymous or Google)
                this._currentUid = currentUser.uid;
                this._saveUidHint(currentUser.uid);
                this._initialized = true;
                console.log('✅ OrganizerAuth: Already signed in', currentUser.uid.substring(0, 8) + '...');
                return this._currentUid;
            }

            // Try anonymous sign-in
            try {
                const result = await firebase.auth().signInAnonymously();
                this._currentUid = result.user.uid;
                this._saveUidHint(result.user.uid);
                this._initialized = true;
                console.log('✅ OrganizerAuth: Anonymous sign-in', this._currentUid.substring(0, 8) + '...');
                return this._currentUid;
            } catch (anonError) {
                // Anonymous auth might be disabled - fall back to local ID
                console.warn('⚠️ OrganizerAuth: Anonymous auth failed, using local ID', anonError.code);
                return this._useLocalFallback();
            }

        } catch (error) {
            console.error('❌ OrganizerAuth: Init failed', error);
            return this._useLocalFallback();
        }
    },
    
    /**
     * Fall back to localStorage-based ID when anonymous auth is unavailable
     * @private
     */
    _useLocalFallback() {
        // Try to get existing local ID
        let localId = localStorage.getItem('uberpadel_organizer_id');
        
        if (!localId) {
            // Generate a new local ID
            localId = 'local_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('uberpadel_organizer_id', localId);
            console.log('✅ OrganizerAuth: Created local ID', localId.substring(0, 12) + '...');
        } else {
            console.log('✅ OrganizerAuth: Using existing local ID', localId.substring(0, 12) + '...');
        }
        
        this._currentUid = localId;
        this._initialized = true;
        return this._currentUid;
    },

    /**
     * Get current organizer UID
     * @returns {string|null}
     */
    getUid() {
        if (this._currentUid) {
            return this._currentUid;
        }
        
        // Try to get from Firebase
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const user = firebase.auth().currentUser;
            if (user) {
                this._currentUid = user.uid;
                return this._currentUid;
            }
        }
        
        return null;
    },

    /**
     * Ensure we have an organizer UID before creating a tournament
     * @returns {Promise<string>} The organizer UID
     * @throws {Error} If unable to get UID
     */
    async ensureUid() {
        let uid = this.getUid();
        if (uid) return uid;

        uid = await this.init();
        if (!uid) {
            throw new Error('Unable to initialize organizer authentication');
        }
        return uid;
    },

    /**
     * Check if current user owns a tournament
     * @param {object} tournamentMeta - Tournament meta object with organizerUid
     * @returns {boolean}
     */
    isOwner(tournamentMeta) {
        if (!tournamentMeta || !tournamentMeta.organizerUid) {
            return false;
        }
        const currentUid = this.getUid();
        return currentUid && currentUid === tournamentMeta.organizerUid;
    },

    /**
     * Save UID hint to localStorage (for debugging/reference only)
     * @private
     */
    _saveUidHint(uid) {
        try {
            localStorage.setItem(this.ANON_UID_KEY, uid);
        } catch (e) {
            // Ignore localStorage errors
        }
    },

    /**
     * Get saved UID hint from localStorage
     * @returns {string|null}
     */
    getSavedUidHint() {
        try {
            return localStorage.getItem(this.ANON_UID_KEY);
        } catch (e) {
            return null;
        }
    },

    /**
     * Listen for auth state changes
     * @param {function} callback - Called with uid or null
     * @returns {function} Unsubscribe function
     */
    onAuthStateChange(callback) {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            callback(null);
            return () => {};
        }

        return firebase.auth().onAuthStateChanged((user) => {
            this._currentUid = user ? user.uid : null;
            if (user) {
                this._saveUidHint(user.uid);
            }
            callback(this._currentUid);
        });
    }
};


/**
 * MyTournamentsCloud - Query tournaments from Firebase by organizer UID
 * Works alongside the existing localStorage MyTournaments
 */
const MyTournamentsCloud = {
    // Cache for query results
    _cache: null,
    _cacheTime: 0,
    CACHE_TTL: 30000, // 30 seconds

    /**
     * Get all tournaments created by current organizer
     * @param {string} firebaseRoot - The Firebase path (e.g., 'americano-tournaments')
     * @returns {Promise<Array>} List of tournaments
     */
    async getAll(firebaseRoot) {
        const uid = OrganizerAuth.getUid();
        if (!uid) {
            console.log('📋 MyTournamentsCloud: No UID, returning empty');
            return [];
        }

        // Check cache
        const cacheKey = `${firebaseRoot}_${uid}`;
        if (this._cache && this._cache.key === cacheKey && Date.now() - this._cacheTime < this.CACHE_TTL) {
            return this._cache.data;
        }

        try {
            if (typeof firebase === 'undefined' || !firebase.database) {
                return [];
            }

            const db = firebase.database();
            const snapshot = await db
                .ref(firebaseRoot)
                .orderByChild('meta/organizerUid')
                .equalTo(uid)
                .once('value');

            const tournaments = [];
            snapshot.forEach((child) => {
                const data = child.val();
                tournaments.push({
                    id: child.key,
                    name: data.meta?.name || 'Unnamed',
                    createdAt: data.meta?.createdAt || null,
                    updatedAt: data.meta?.updatedAt || null,
                    mode: data.meta?.mode || 'anyone',
                    playerCount: data.playerCount,
                    isOwner: true // We queried by our UID, so we own these
                });
            });

            // Sort by updatedAt descending
            tournaments.sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt || 0);
                const dateB = new Date(b.updatedAt || b.createdAt || 0);
                return dateB - dateA;
            });

            // Update cache
            this._cache = { key: cacheKey, data: tournaments };
            this._cacheTime = Date.now();

            console.log(`📋 MyTournamentsCloud: Found ${tournaments.length} tournaments`);
            return tournaments;

        } catch (error) {
            console.error('❌ MyTournamentsCloud: Query failed', error);
            return [];
        }
    },

    /**
     * Invalidate cache (call after creating a tournament)
     */
    invalidateCache() {
        this._cache = null;
        this._cacheTime = 0;
    },

    /**
     * Merge cloud tournaments with localStorage tournaments
     * Removes duplicates, prioritizes cloud data
     * @param {Array} cloudTournaments - From getAll()
     * @param {Array} localTournaments - From localStorage MyTournaments
     * @returns {Array} Merged list
     */
    mergeWithLocal(cloudTournaments, localTournaments) {
        const merged = new Map();

        // Add cloud tournaments first (they take priority)
        cloudTournaments.forEach(t => {
            merged.set(t.id, { ...t, source: 'cloud' });
        });

        // Add local tournaments that aren't in cloud
        localTournaments.forEach(t => {
            if (!merged.has(t.id)) {
                merged.set(t.id, { ...t, source: 'local', isOwner: true });
            }
        });

        // Convert to array and sort
        return Array.from(merged.values()).sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0);
            const dateB = new Date(b.updatedAt || b.createdAt || 0);
            return dateB - dateA;
        });
    }
};


// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OrganizerAuth, MyTournamentsCloud };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.OrganizerAuth = OrganizerAuth;
    window.MyTournamentsCloud = MyTournamentsCloud;
}

console.log('✅ OrganizerAuth module loaded (core/organizer-auth.js)');
