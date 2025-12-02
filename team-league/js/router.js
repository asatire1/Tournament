// ===== HASH-BASED ROUTER FOR TEAM LEAGUE =====

const Router = {
    // Current route state
    currentRoute: null,
    tournamentId: null,
    organiserKey: null,
    isOrganiser: false,
    
    // Route patterns
    routes: {
        HOME: 'home',
        TOURNAMENT: 'tournament'
    },
    
    // Initialize router
    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        // Handle initial route
        this.handleRoute();
    },
    
    // Parse current hash and determine route
    handleRoute() {
        const hash = window.location.hash.slice(1); // Remove the #
        
        // Parse the hash
        // Format: /t/{tournamentId}?key={organiserKey}
        // or empty for home
        
        if (!hash || hash === '/' || hash === '') {
            this.currentRoute = this.routes.HOME;
            this.tournamentId = null;
            this.organiserKey = null;
            this.isOrganiser = false;
        } else if (hash.startsWith('/t/')) {
            this.currentRoute = this.routes.TOURNAMENT;
            
            // Extract tournament ID and optional key
            const pathAndQuery = hash.slice(3); // Remove '/t/'
            const [path, queryString] = pathAndQuery.split('?');
            
            this.tournamentId = path;
            
            // Parse query parameters
            if (queryString) {
                const params = new URLSearchParams(queryString);
                this.organiserKey = params.get('key');
            } else {
                this.organiserKey = null;
            }
            
            // isOrganiser will be verified against Firebase later
            this.isOrganiser = !!this.organiserKey;
        } else {
            // Unknown route, go home
            this.navigate('home');
            return;
        }
        
        // Trigger route change callback
        if (this.onRouteChange) {
            this.onRouteChange(this.currentRoute, this.tournamentId, this.organiserKey);
        }
    },
    
    // Navigate to a route
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
    
    // Get shareable player link (without key)
    getPlayerLink(tournamentId) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/t/${tournamentId}`;
    },
    
    // Get organiser link (with key)
    getOrganiserLink(tournamentId, organiserKey) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/t/${tournamentId}?key=${organiserKey}`;
    },
    
    // Generate unique tournament ID (short, readable)
    generateTournamentId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    },
    
    // Callback for route changes (set by main.js)
    onRouteChange: null
};

console.log('✅ Router initialized (Team Tournament)');
