/**
 * router.esm.js - Hash-based Router (ES Module)
 * 
 * Simple hash routing for single-page tournament apps.
 * 
 * @module core/router
 */

/**
 * Route definitions
 */
const ROUTES = {
    HOME: 'home',
    TOURNAMENT: 'tournament',
    CREATE: 'create',
    SETTINGS: 'settings',
    STANDINGS: 'standings'
};

/**
 * Router class
 */
class RouterManager {
    constructor() {
        this.routes = ROUTES;
        this.currentRoute = ROUTES.HOME;
        this.currentId = null;
        this.currentKey = null;
        this._listeners = [];
        this._initialized = false;
    }
    
    /**
     * Initialize the router
     * @param {Function} onRouteChange - Callback for route changes
     */
    init(onRouteChange = null) {
        if (this._initialized) return this;
        
        if (onRouteChange) {
            this._listeners.push(onRouteChange);
        }
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => this._handleHashChange());
        
        // Handle initial route
        this._handleHashChange();
        
        this._initialized = true;
        return this;
    }
    
    /**
     * Handle hash change
     * @private
     */
    _handleHashChange() {
        const hash = window.location.hash.slice(1); // Remove #
        const parts = hash.split('/').filter(Boolean);
        
        if (parts.length === 0) {
            this.currentRoute = ROUTES.HOME;
            this.currentId = null;
            this.currentKey = null;
        } else if (parts.length === 1) {
            this.currentRoute = ROUTES.TOURNAMENT;
            this.currentId = parts[0];
            this.currentKey = null;
        } else if (parts.length >= 2) {
            this.currentRoute = ROUTES.TOURNAMENT;
            this.currentId = parts[0];
            this.currentKey = parts[1];
        }
        
        // Notify listeners
        this._listeners.forEach(fn => fn(this.currentRoute, this.currentId, this.currentKey));
    }
    
    /**
     * Navigate to a route
     * @param {string} route
     * @param {string} [id]
     * @param {string} [key]
     */
    navigate(route, id = null, key = null) {
        let hash = '';
        
        switch (route) {
            case ROUTES.HOME:
                hash = '';
                break;
            case ROUTES.TOURNAMENT:
                if (id && key) {
                    hash = `${id}/${key}`;
                } else if (id) {
                    hash = id;
                }
                break;
            default:
                hash = route;
        }
        
        window.location.hash = hash;
    }
    
    /**
     * Add route change listener
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    onRouteChange(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(fn => fn !== callback);
        };
    }
    
    /**
     * Get player link for a tournament
     * @param {string} id
     * @returns {string}
     */
    getPlayerLink(id) {
        const base = window.location.origin + window.location.pathname;
        return `${base}#${id}`;
    }
    
    /**
     * Get organiser link for a tournament
     * @param {string} id
     * @param {string} key
     * @returns {string}
     */
    getOrganiserLink(id, key) {
        const base = window.location.origin + window.location.pathname;
        return `${base}#${id}/${key}`;
    }
    
    /**
     * Generate a random tournament ID
     * @param {number} length
     * @returns {string}
     */
    generateTournamentId(length = 6) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * Generate a random organiser key
     * @param {number} length
     * @returns {string}
     */
    generateOrganiserKey(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * Parse URL parameters
     * @returns {object}
     */
    getParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }
}

// Create singleton instance
export const Router = new RouterManager();

export default Router;
