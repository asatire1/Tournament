/**
 * storage.esm.js - LocalStorage Abstraction (ES Module)
 * 
 * Safe localStorage operations with expiration support.
 * 
 * @module core/storage
 */

/**
 * Storage key prefixes
 */
export const STORAGE_KEYS = {
    TOURNAMENTS: 'uberpadel_tournaments',
    RECENT: 'uberpadel_recent',
    USER: 'uberpadel_user',
    SETTINGS: 'uberpadel_settings',
    ORGANISER_KEYS: 'uberpadel_organiser_keys'
};

/**
 * Default TTL values (in milliseconds)
 */
const TTL = {
    SESSION: 24 * 60 * 60 * 1000,      // 24 hours
    TOURNAMENT: 7 * 24 * 60 * 60 * 1000, // 7 days
    PERMANENT: null                      // No expiration
};

/**
 * Storage manager class
 */
class StorageManager {
    constructor() {
        this._prefix = 'uberpadel_';
        this._available = this._checkAvailability();
    }
    
    /**
     * Check if localStorage is available
     * @private
     */
    _checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available, using memory fallback');
            return false;
        }
    }
    
    /**
     * Memory fallback storage
     * @private
     */
    _memoryStore = {};
    
    /**
     * Get item from storage
     * @param {string} key
     * @param {*} defaultValue
     * @returns {*}
     */
    get(key, defaultValue = null) {
        try {
            const raw = this._available 
                ? localStorage.getItem(this._prefix + key)
                : this._memoryStore[key];
                
            if (!raw) return defaultValue;
            
            const data = JSON.parse(raw);
            
            // Check expiration
            if (data._expires && Date.now() > data._expires) {
                this.remove(key);
                return defaultValue;
            }
            
            return data.value !== undefined ? data.value : data;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    }
    
    /**
     * Set item in storage
     * @param {string} key
     * @param {*} value
     * @param {number|null} ttlMs - Time to live in milliseconds
     */
    set(key, value, ttlMs = null) {
        try {
            const data = {
                value,
                _timestamp: Date.now(),
                _expires: ttlMs ? Date.now() + ttlMs : null
            };
            
            const raw = JSON.stringify(data);
            
            if (this._available) {
                localStorage.setItem(this._prefix + key, raw);
            } else {
                this._memoryStore[key] = raw;
            }
        } catch (e) {
            console.error('Storage set error:', e);
            // Try to clear old data if quota exceeded
            if (e.name === 'QuotaExceededError') {
                this._cleanup();
                this.set(key, value, ttlMs);
            }
        }
    }
    
    /**
     * Remove item from storage
     * @param {string} key
     */
    remove(key) {
        if (this._available) {
            localStorage.removeItem(this._prefix + key);
        } else {
            delete this._memoryStore[key];
        }
    }
    
    /**
     * Clear all storage with prefix
     */
    clear() {
        if (this._available) {
            Object.keys(localStorage)
                .filter(key => key.startsWith(this._prefix))
                .forEach(key => localStorage.removeItem(key));
        } else {
            this._memoryStore = {};
        }
    }
    
    /**
     * Cleanup expired items
     * @private
     */
    _cleanup() {
        if (!this._available) return;
        
        Object.keys(localStorage)
            .filter(key => key.startsWith(this._prefix))
            .forEach(key => {
                try {
                    const raw = localStorage.getItem(key);
                    const data = JSON.parse(raw);
                    if (data._expires && Date.now() > data._expires) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    // Invalid data, remove it
                    localStorage.removeItem(key);
                }
            });
    }
    
    // ===== Tournament-specific methods =====
    
    /**
     * Save tournament to local storage
     * @param {string} format
     * @param {string} id
     * @param {object} data
     */
    saveTournament(format, id, data) {
        const key = `tournament_${format}_${id}`;
        this.set(key, data, TTL.TOURNAMENT);
        this.addRecentTournament(format, id, data);
    }
    
    /**
     * Get tournament from local storage
     * @param {string} format
     * @param {string} id
     * @returns {object|null}
     */
    getTournament(format, id) {
        const key = `tournament_${format}_${id}`;
        return this.get(key, null);
    }
    
    /**
     * Remove tournament from local storage
     * @param {string} format
     * @param {string} id
     */
    removeTournament(format, id) {
        const key = `tournament_${format}_${id}`;
        this.remove(key);
    }
    
    /**
     * Get all tournaments for a format
     * @param {string} format
     * @returns {object[]}
     */
    getTournaments(format) {
        const tournaments = [];
        const prefix = `${this._prefix}tournament_${format}_`;
        
        if (!this._available) {
            Object.keys(this._memoryStore)
                .filter(k => k.startsWith(`tournament_${format}_`))
                .forEach(k => {
                    const data = this.get(k);
                    if (data) tournaments.push(data);
                });
            return tournaments;
        }
        
        Object.keys(localStorage)
            .filter(key => key.startsWith(prefix))
            .forEach(key => {
                const data = this.get(key.replace(this._prefix, ''));
                if (data) tournaments.push(data);
            });
        
        return tournaments;
    }
    
    /**
     * Add tournament to recent list
     * @param {string} format
     * @param {string} id
     * @param {object} data
     */
    addRecentTournament(format, id, data) {
        const recent = this.get(STORAGE_KEYS.RECENT, []);
        
        // Remove existing entry for this tournament
        const filtered = recent.filter(r => !(r.format === format && r.id === id));
        
        // Add to front
        filtered.unshift({
            format,
            id,
            name: data.name || data.tournamentName,
            lastAccessed: new Date().toISOString()
        });
        
        // Keep only last 20
        this.set(STORAGE_KEYS.RECENT, filtered.slice(0, 20), TTL.TOURNAMENT);
    }
    
    /**
     * Get recent tournaments
     * @param {number} limit
     * @returns {object[]}
     */
    getRecentTournaments(limit = 10) {
        const recent = this.get(STORAGE_KEYS.RECENT, []);
        return recent.slice(0, limit);
    }
    
    /**
     * Save organiser key for a tournament
     * @param {string} format
     * @param {string} id
     * @param {string} key
     */
    saveOrganiserKey(format, id, key) {
        const keys = this.get(STORAGE_KEYS.ORGANISER_KEYS, {});
        keys[`${format}_${id}`] = key;
        this.set(STORAGE_KEYS.ORGANISER_KEYS, keys, TTL.PERMANENT);
    }
    
    /**
     * Get organiser key for a tournament
     * @param {string} format
     * @param {string} id
     * @returns {string|null}
     */
    getOrganiserKey(format, id) {
        const keys = this.get(STORAGE_KEYS.ORGANISER_KEYS, {});
        return keys[`${format}_${id}`] || null;
    }
}

// Create singleton instance
export const Storage = new StorageManager();

export default Storage;
