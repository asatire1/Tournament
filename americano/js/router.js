/**
 * router.js - URL Routing and Navigation
 * Handles hash-based routing for the Americano app
 */

const Router = {
    // Current state
    currentRoute: null,
    tournamentId: null,
    organiserKey: null,
    isOrganiser: false,
    
    // Route constants
    routes: {
        HOME: 'home',
        TOURNAMENT: 'tournament'
    },
    
    // Callback for route changes
    onRouteChange: null,
    
    /**
     * Initialize router and start listening for hash changes
     */
    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    },
    
    /**
     * Parse current hash and update route state
     */
    handleRoute() {
        const hash = window.location.hash.slice(1);
        
        if (!hash || hash === '/' || hash === '') {
            // Home page
            this.currentRoute = this.routes.HOME;
            this.tournamentId = null;
            this.organiserKey = null;
            this.isOrganiser = false;
        } else if (hash.startsWith('/t/')) {
            // Tournament page
            this.currentRoute = this.routes.TOURNAMENT;
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
     */
    navigate(route, tournamentId = null, organiserKey = null) {
        let hash = '';
        
        if (route === 'home' || route === this.routes.HOME) {
            hash = '';
        } else if (route === 'tournament' || route === this.routes.TOURNAMENT) {
            hash = `/t/${tournamentId}`;
            if (organiserKey) {
                hash += `?key=${organiserKey}`;
            }
        }
        
        window.location.hash = hash;
    },
    
    /**
     * Generate player link for sharing
     */
    getPlayerLink(tournamentId) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/t/${tournamentId}`;
    },
    
    /**
     * Generate organiser link with key
     */
    getOrganiserLink(tournamentId, organiserKey) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/t/${tournamentId}?key=${organiserKey}`;
    },
    
    /**
     * Generate unique tournament ID
     */
    generateTournamentId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < CONFIG.TOURNAMENT_ID_LENGTH; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    },
    
    /**
     * Generate organiser key
     */
    generateOrganiserKey() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < CONFIG.ORGANISER_KEY_LENGTH; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    }
};
