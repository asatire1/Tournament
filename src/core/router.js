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
 * Has this tab already proved the organiser secret for this tournament?
 *
 * The organiser key used to be cached in sessionStorage so organiser status
 * survived navigation. It isn't any more: the key is proved by writing it to
 * an unreadable node (see proveTournamentSecret in shared/format-config.js),
 * and that proof records this session as the claimant server-side. So what
 * persists is the fact of verification, written by markOrganiserVerified()
 * in core/compat.js — never the secret itself.
 *
 * @param {string} tournamentId
 * @returns {boolean}
 */
function isOrganiserVerified(tournamentId) {
    if (!tournamentId) return false;
    try {
        return sessionStorage.getItem(`organiser_verified_${tournamentId}`) === '1';
    } catch (e) {
        return false; // sessionStorage unavailable
    }
}

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
         * Parse current hash and update route state.
         * Organiser keys are NEVER stored — not in the URL, and no longer in
         * sessionStorage either. A key arriving in a legacy ?key= URL is held
         * in memory for this page and stripped from the URL; what survives
         * navigation is the "verified" marker written once the key has been
         * proved (see isOrganiserVerified above).
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

                // Carry an in-memory key across hash changes within the same
                // tournament — it is never written anywhere.
                const carriedKey = this.tournamentId === path ? this.organiserKey : null;
                this.tournamentId = path;

                // Legacy ?key= URLs: take the key into memory and strip it
                // from the URL so it doesn't leak into history/logs.
                let keyFromUrl = null;
                if (queryString) {
                    const params = new URLSearchParams(queryString);
                    keyFromUrl = params.get('key');
                    if (keyFromUrl && this.tournamentId) {
                        const cleanHash = `/t/${this.tournamentId}`;
                        history.replaceState(null, '', `${window.location.pathname}#${cleanHash}`);
                    }
                }

                this.organiserKey = keyFromUrl || carriedKey;
                // A held key still needs proving by the caller; a stored
                // marker means this tab already proved one.
                this.isOrganiser = !!this.organiserKey || isOrganiserVerified(this.tournamentId);
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
         * Navigate to a route.
         * An organiserKey is held in memory for this page only — never put in
         * the URL and never persisted. Organiser status persists instead as
         * the verified-marker set once the key has been proved.
         * @param {string} route - Route name or ROUTES constant
         * @param {string} [tournamentId] - Tournament ID for tournament route
         * @param {string} [organiserKey] - Organiser key — in-memory only
         */
        navigate(route, tournamentId = null, organiserKey = null) {
            let hash = '';

            if (route === 'home' || route === ROUTES.HOME) {
                hash = '';
            } else if (route === 'tournament' || route === ROUTES.TOURNAMENT) {
                hash = `/t/${tournamentId}`;
                // Carry the key in memory so handleRoute() can pick it up.
                if (organiserKey && tournamentId) {
                    this.tournamentId = tournamentId;
                    this.organiserKey = organiserKey;
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
         * Generate organiser link.
         * The organiser key is NOT included in the URL, and is not stored
         * anywhere on the client. Organiser access is regained via passcode
         * entry after a new session starts.
         * @param {string} tournamentId
         * @returns {string} Full URL (same as player link — access controlled by passcode)
         */
        getOrganiserLink(tournamentId) {
            const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
            return `${base}#/t/${tournamentId}`;
        },
        
        /**
         * Generate a cryptographically random tournament ID.
         * Uses crypto.getRandomValues() — never Math.random().
         * @returns {string}
         */
        generateTournamentId() {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            const bytes = new Uint8Array(settings.TOURNAMENT_ID_LENGTH);
            crypto.getRandomValues(bytes);
            return Array.from(bytes).map(b => chars[b % chars.length]).join('');
        },

        /**
         * Generate a cryptographically random organiser key.
         * @returns {string}
         */
        generateOrganiserKey() {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const bytes = new Uint8Array(24);
            crypto.getRandomValues(bytes);
            return Array.from(bytes).map(b => chars[b % chars.length]).join('');
        },

        /**
         * Hash a passcode using SHA-256 (Web Crypto API).
         * No weak fallback — Web Crypto is supported in all modern browsers.
         * @param {string} passcode
         * @returns {Promise<string>}
         */
        async hashPasscode(passcode) {
            if (!passcode) return '';

            if (typeof crypto === 'undefined' || !crypto.subtle) {
                throw new Error('Web Crypto API unavailable — cannot hash passcode securely.');
            }

            const encoder = new TextEncoder();
            const data = encoder.encode(passcode);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
