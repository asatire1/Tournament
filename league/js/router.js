/**
 * router.js - URL Routing and Navigation
 * Handles hash-based routing for the League system
 *
 * Routes:
 *   #/              Landing page (create/join)
 *   #/l/{id}        View league (read-only)
 *   #/l/{id}?key=X  Organiser view
 *   #/l/{id}/tv     TV mode
 */

const Router = {
    currentRoute: null,
    leagueId: null,
    organiserKey: null,
    isOrganiser: false,

    routes: {
        HOME: 'home',
        LEAGUE: 'league',
        TV: 'tv'
    },

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
            this.currentRoute = this.routes.HOME;
            this.leagueId = null;
            this.organiserKey = null;
            this.isOrganiser = false;
        } else if (hash.startsWith('/l/')) {
            const pathAndQuery = hash.slice(3);
            const [path, queryString] = pathAndQuery.split('?');

            if (path.endsWith('/tv')) {
                this.currentRoute = this.routes.TV;
                this.leagueId = path.slice(0, -3);
            } else {
                this.currentRoute = this.routes.LEAGUE;
                this.leagueId = path;
            }

            if (queryString) {
                const params = new URLSearchParams(queryString);
                this.organiserKey = params.get('key');
            } else {
                this.organiserKey = null;
            }

            this.isOrganiser = !!this.organiserKey;
        } else {
            this.navigate('home');
            return;
        }

        if (this.onRouteChange) {
            this.onRouteChange(this.currentRoute, this.leagueId, this.organiserKey);
        }
    },

    /**
     * Navigate to a route
     */
    navigate(route, leagueId = null, organiserKey = null) {
        let hash = '';

        if (route === 'home' || route === this.routes.HOME) {
            hash = '';
        } else if (route === 'league' || route === this.routes.LEAGUE) {
            hash = `/l/${leagueId}`;
            if (organiserKey) {
                hash += `?key=${organiserKey}`;
            }
        } else if (route === 'tv' || route === this.routes.TV) {
            hash = `/l/${leagueId}/tv`;
        }

        window.location.hash = hash;
    },

    /**
     * Generate player/viewer link
     */
    getPlayerLink(leagueId) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/l/${leagueId}`;
    },

    /**
     * Generate organiser link with key
     */
    getOrganiserLink(leagueId, organiserKey) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/l/${leagueId}?key=${organiserKey}`;
    },

    /**
     * Generate TV mode link
     */
    getTVLink(leagueId) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/l/${leagueId}/tv`;
    },

    /**
     * Generate unique league ID
     */
    generateLeagueId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < CONFIG.LEAGUE_ID_LENGTH; i++) {
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
