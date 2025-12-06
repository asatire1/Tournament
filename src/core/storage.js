/**
 * storage.js - LocalStorage Abstraction
 * Safe localStorage operations with fallbacks and expiration
 * 
 * @module core/storage
 */

/**
 * Storage keys used across the application
 */
const STORAGE_KEYS = {
    // User data
    USER: 'uber_padel_user',
    
    // Tournament storage by format
    AMERICANO_TOURNAMENTS: 'uber_padel_americano_tournaments',
    MEXICANO_TOURNAMENTS: 'uber_padel_mexicano_tournaments',
    TEAM_LEAGUE_TOURNAMENTS: 'uber_padel_team_tournaments',
    MIX_TOURNAMENTS: 'uber_padel_fixed_tournaments',
    
    // Preferences
    PREFERENCES: 'uber_padel_preferences',
    THEME: 'uber_padel_theme',
    
    // Recent activity
    RECENT_TOURNAMENTS: 'uber_padel_recent_tournaments'
};

/**
 * Default limits
 */
const STORAGE_LIMITS = {
    MAX_STORED_TOURNAMENTS: 20,
    MAX_RECENT_TOURNAMENTS: 10
};

/**
 * Storage utility object
 */
const Storage = {
    /**
     * Check if localStorage is available
     * @returns {boolean}
     */
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Get item from storage with JSON parsing
     * @param {string} key - Storage key
     * @param {*} [defaultValue=null] - Default value if not found
     * @returns {*} Stored value or default
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            
            const parsed = JSON.parse(item);
            
            // Check expiration if present
            if (parsed && parsed.__expires__) {
                if (Date.now() > parsed.__expires__) {
                    this.remove(key);
                    return defaultValue;
                }
                return parsed.value;
            }
            
            return parsed;
        } catch (e) {
            console.error(`Storage.get error for "${key}":`, e);
            return defaultValue;
        }
    },

    /**
     * Set item in storage with JSON stringification
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @param {number} [ttlMs] - Optional time-to-live in milliseconds
     * @returns {boolean} Success status
     */
    set(key, value, ttlMs = null) {
        try {
            let toStore = value;
            
            if (ttlMs !== null) {
                toStore = {
                    value: value,
                    __expires__: Date.now() + ttlMs
                };
            }
            
            localStorage.setItem(key, JSON.stringify(toStore));
            return true;
        } catch (e) {
            console.error(`Storage.set error for "${key}":`, e);
            // Storage might be full, try to clean up
            if (e.name === 'QuotaExceededError') {
                this.cleanup();
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (e2) {
                    return false;
                }
            }
            return false;
        }
    },

    /**
     * Remove item from storage
     * @param {string} key - Storage key
     * @returns {boolean} Success status
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`Storage.remove error for "${key}":`, e);
            return false;
        }
    },

    /**
     * Clear all uber_padel storage
     * @returns {boolean} Success status
     */
    clearAll() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (e) {
            console.error('Storage.clearAll error:', e);
            return false;
        }
    },

    /**
     * Cleanup expired items and trim large lists
     */
    cleanup() {
        try {
            // Check all known keys for expiration
            Object.values(STORAGE_KEYS).forEach(key => {
                this.get(key); // This will auto-remove expired items
            });
            
            // Trim tournament lists
            this.trimTournamentList(STORAGE_KEYS.AMERICANO_TOURNAMENTS);
            this.trimTournamentList(STORAGE_KEYS.MEXICANO_TOURNAMENTS);
            this.trimTournamentList(STORAGE_KEYS.TEAM_LEAGUE_TOURNAMENTS);
            this.trimTournamentList(STORAGE_KEYS.MIX_TOURNAMENTS);
            this.trimTournamentList(STORAGE_KEYS.RECENT_TOURNAMENTS, STORAGE_LIMITS.MAX_RECENT_TOURNAMENTS);
        } catch (e) {
            console.error('Storage.cleanup error:', e);
        }
    },

    /**
     * Trim a tournament list to max size
     * @param {string} key - Storage key
     * @param {number} [maxItems] - Max items to keep
     */
    trimTournamentList(key, maxItems = STORAGE_LIMITS.MAX_STORED_TOURNAMENTS) {
        const list = this.get(key, []);
        if (Array.isArray(list) && list.length > maxItems) {
            // Keep most recent items
            const trimmed = list.slice(-maxItems);
            this.set(key, trimmed);
        }
    },

    // ===== USER DATA =====

    /**
     * Get current user
     * @returns {object|null}
     */
    getUser() {
        return this.get(STORAGE_KEYS.USER);
    },

    /**
     * Set current user
     * @param {object} user
     * @returns {boolean}
     */
    setUser(user) {
        return this.set(STORAGE_KEYS.USER, user);
    },

    /**
     * Clear user data
     * @returns {boolean}
     */
    clearUser() {
        return this.remove(STORAGE_KEYS.USER);
    },

    // ===== TOURNAMENT DATA =====

    /**
     * Get storage key for tournament format
     * @param {string} format - Tournament format
     * @returns {string} Storage key
     */
    getTournamentStorageKey(format) {
        const keyMap = {
            'americano': STORAGE_KEYS.AMERICANO_TOURNAMENTS,
            'mexicano': STORAGE_KEYS.MEXICANO_TOURNAMENTS,
            'team-league': STORAGE_KEYS.TEAM_LEAGUE_TOURNAMENTS,
            'mix': STORAGE_KEYS.MIX_TOURNAMENTS,
            'tournament': STORAGE_KEYS.MIX_TOURNAMENTS
        };
        return keyMap[format.toLowerCase()] || STORAGE_KEYS.AMERICANO_TOURNAMENTS;
    },

    /**
     * Get all stored tournaments for a format
     * @param {string} format - Tournament format
     * @returns {object[]} Array of tournament data
     */
    getTournaments(format) {
        const key = this.getTournamentStorageKey(format);
        return this.get(key, []);
    },

    /**
     * Add or update tournament in local storage
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @param {object} data - Tournament data
     * @returns {boolean}
     */
    saveTournament(format, tournamentId, data) {
        const key = this.getTournamentStorageKey(format);
        const tournaments = this.getTournaments(format);
        
        const existingIndex = tournaments.findIndex(t => t.id === tournamentId);
        const tournamentData = {
            ...data,
            id: tournamentId,
            updatedAt: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            tournaments[existingIndex] = tournamentData;
        } else {
            tournaments.push(tournamentData);
        }
        
        // Trim to max
        const trimmed = tournaments.slice(-STORAGE_LIMITS.MAX_STORED_TOURNAMENTS);
        
        return this.set(key, trimmed);
    },

    /**
     * Get a specific tournament from local storage
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @returns {object|null}
     */
    getTournament(format, tournamentId) {
        const tournaments = this.getTournaments(format);
        return tournaments.find(t => t.id === tournamentId) || null;
    },

    /**
     * Remove a tournament from local storage
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @returns {boolean}
     */
    removeTournament(format, tournamentId) {
        const key = this.getTournamentStorageKey(format);
        const tournaments = this.getTournaments(format);
        const filtered = tournaments.filter(t => t.id !== tournamentId);
        return this.set(key, filtered);
    },

    // ===== RECENT ACTIVITY =====

    /**
     * Add tournament to recent list
     * @param {string} format - Tournament format
     * @param {string} tournamentId - Tournament ID
     * @param {string} name - Tournament name
     */
    addRecentTournament(format, tournamentId, name) {
        const recent = this.get(STORAGE_KEYS.RECENT_TOURNAMENTS, []);
        
        // Remove if already exists
        const filtered = recent.filter(t => t.id !== tournamentId);
        
        // Add to front
        filtered.unshift({
            id: tournamentId,
            format: format,
            name: name,
            accessedAt: new Date().toISOString()
        });
        
        // Trim
        const trimmed = filtered.slice(0, STORAGE_LIMITS.MAX_RECENT_TOURNAMENTS);
        
        this.set(STORAGE_KEYS.RECENT_TOURNAMENTS, trimmed);
    },

    /**
     * Get recent tournaments
     * @returns {object[]}
     */
    getRecentTournaments() {
        return this.get(STORAGE_KEYS.RECENT_TOURNAMENTS, []);
    },

    // ===== PREFERENCES =====

    /**
     * Get user preferences
     * @returns {object}
     */
    getPreferences() {
        return this.get(STORAGE_KEYS.PREFERENCES, {});
    },

    /**
     * Set user preferences
     * @param {object} prefs
     * @returns {boolean}
     */
    setPreferences(prefs) {
        const current = this.getPreferences();
        return this.set(STORAGE_KEYS.PREFERENCES, { ...current, ...prefs });
    },

    /**
     * Get theme preference
     * @returns {string} 'light' or 'dark'
     */
    getTheme() {
        return this.get(STORAGE_KEYS.THEME, 'light');
    },

    /**
     * Set theme preference
     * @param {string} theme - 'light' or 'dark'
     * @returns {boolean}
     */
    setTheme(theme) {
        return this.set(STORAGE_KEYS.THEME, theme);
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Storage, STORAGE_KEYS, STORAGE_LIMITS };
}

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
    window.Storage = Storage;
    window.STORAGE_KEYS = STORAGE_KEYS;
}
