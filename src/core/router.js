/**
 * router.js - Shared Routing Logic
 * Hash-based routing utility for tournament pages
 * 
 * @module core/router
 */

/**
 * Default configuration (can be overridden)
 */
const ROUTER_DEFAULTS = {
    TOURNAMENT_ID_LENGTH: 6,
    ORGANISER_KEY_LENGTH: 16
};

/**
 * Route constants
 */
const ROUTES = {
    HOME: 'home',
    TOURNAMENT: 'tournament',
    CREATE: 'create',
    SETTINGS: 'settings'
};

/**
 * Create a router instance
 * @param {object} [config] - Optional configuration override
 * @returns {object} Router instance
 */
function createRouter(config = {}) {
    const settings = { ...ROUTER_DEFAULTS, ...config };
    
    return {
        // Current state
        currentRoute: null,
        tournamentId: null,
        organiserKey: null,
        isOrganiser: false,
        
        // Route constants reference
        routes: ROUTES,
        
        // Callback for route changes
        onRouteChange: null,
        
        // Listeners for cleanup
        _hashListener: null,
        
        /**
         * Initialize router and start listening for hash changes
         */
        init() {
            this._hashListener = () => this.handleRoute();
            window.addEventListener('hashchange', this._hashListener);
            this.handleRoute();
            return this;
        },
        
        /**
         * Cleanup - remove listeners
         */
        destroy() {
            if (this._hashListener) {
                window.removeEventListener('hashchange', this._hashListener);
                this._hashListener = null;
            }
        },
        
        /**
         * Parse current hash and update route state
         */
        handleRoute() {
            const hash = window.location.hash.slice(1);
            
            if (!hash || hash === '/' || hash === '') {
                // Home page
                this.currentRoute = ROUTES.HOME;
                this.tournamentId = null;
                this.organiserKey = null;
                this.isOrganiser = false;
            } else if (hash.startsWith('/t/')) {
                // Tournament page
                this.currentRoute = ROUTES.TOURNAMENT;
                const pathAndQuery = hash.slice(3);
                const [path, queryString] = pathAndQuery.split('?');
                this.tournamentId = path;
                
                if (queryString) {
                    const params = new URLSearchParams(queryString);
                    this.organiserKey = params.get('key');
                } else {
                    this.organiserKey = null;
                }
                
                this.isOrganiser = !!this.organiserKey;
            } else if (hash === '/create') {
                this.currentRoute = ROUTES.CREATE;
                this.tournamentId = null;
                this.organiserKey = null;
                this.isOrganiser = false;
            } else if (hash === '/settings') {
                this.currentRoute = ROUTES.SETTINGS;
                this.tournamentId = null;
                this.organiserKey = null;
                this.isOrganiser = false;
            } else {
                // Unknown route - redirect home
                this.navigate('home');
                return;
            }
            
            // Trigger callback if set
            if (this.onRouteChange) {
                this.onRouteChange(this.currentRoute, this.tournamentId, this.organiserKey);
            }
        },
        
        /**
         * Navigate to a route
         * @param {string} route - Route name or ROUTES constant
         * @param {string} [tournamentId] - Tournament ID for tournament route
         * @param {string} [organiserKey] - Organiser key for organiser access
         */
        navigate(route, tournamentId = null, organiserKey = null) {
            let hash = '';
            
            if (route === 'home' || route === ROUTES.HOME) {
                hash = '';
            } else if (route === 'tournament' || route === ROUTES.TOURNAMENT) {
                hash = `/t/${tournamentId}`;
                if (organiserKey) {
                    hash += `?key=${organiserKey}`;
                }
            } else if (route === 'create' || route === ROUTES.CREATE) {
                hash = '/create';
            } else if (route === 'settings' || route === ROUTES.SETTINGS) {
                hash = '/settings';
            }
            
            window.location.hash = hash;
        },
        
        /**
         * Navigate to home
         */
        goHome() {
            this.navigate(ROUTES.HOME);
        },
        
        /**
         * Navigate to tournament as player
         * @param {string} tournamentId
         */
        goToTournament(tournamentId) {
            this.navigate(ROUTES.TOURNAMENT, tournamentId);
        },
        
        /**
         * Navigate to tournament as organiser
         * @param {string} tournamentId
         * @param {string} organiserKey
         */
        goToTournamentAsOrganiser(tournamentId, organiserKey) {
            this.navigate(ROUTES.TOURNAMENT, tournamentId, organiserKey);
        },
        
        /**
         * Generate player link for sharing
         * @param {string} tournamentId
         * @returns {string} Full URL
         */
        getPlayerLink(tournamentId) {
            const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
            return `${base}#/t/${tournamentId}`;
        },
        
        /**
         * Generate organiser link with key
         * @param {string} tournamentId
         * @param {string} organiserKey
         * @returns {string} Full URL
         */
        getOrganiserLink(tournamentId, organiserKey) {
            const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
            return `${base}#/t/${tournamentId}?key=${organiserKey}`;
        },
        
        /**
         * Generate unique tournament ID
         * @returns {string}
         */
        generateTournamentId() {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let id = '';
            for (let i = 0; i < settings.TOURNAMENT_ID_LENGTH; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return id;
        },
        
        /**
         * Generate organiser key
         * @returns {string}
         */
        generateOrganiserKey() {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let key = '';
            for (let i = 0; i < settings.ORGANISER_KEY_LENGTH; i++) {
                key += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return key;
        },
        
        /**
         * Generate a passcode hash (simple hash for demo)
         * @param {string} passcode
         * @returns {string}
         */
        hashPasscode(passcode) {
            // Simple hash - in production, use proper hashing
            let hash = 0;
            for (let i = 0; i < passcode.length; i++) {
                const char = passcode.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash.toString(16);
        },
        
        /**
         * Get current state as an object
         * @returns {object}
         */
        getState() {
            return {
                route: this.currentRoute,
                tournamentId: this.tournamentId,
                organiserKey: this.organiserKey,
                isOrganiser: this.isOrganiser
            };
        }
    };
}

/**
 * Default router instance (backwards compatible)
 */
const Router = createRouter();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createRouter, Router, ROUTES, ROUTER_DEFAULTS };
}

// Make available globally for non-module usage
if (typeof window !== 'undefined') {
    window.createRouter = createRouter;
    window.Router = Router;
    window.ROUTES = ROUTES;
}
