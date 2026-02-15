// ===== ROUTER =====

/**
 * Simple hash-based router for the knockout tournament
 */
const Router = {
    /**
     * Initialize router
     */
    init() {
        // Handle initial route
        this.handleRoute();

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
    },

    /**
     * Parse current hash
     */
    parseHash() {
        const hash = window.location.hash.slice(1); // Remove #
        const parts = hash.split('/').filter(Boolean);

        return {
            path: parts[0] || '',
            param1: parts[1] || '',
            param2: parts[2] || ''
        };
    },

    // Route patterns
    routes: {
        HOME: 'home',
        TOURNAMENT: 'tournament',
        TV: 'tv'
    },

    /**
     * Handle route change
     */
    async handleRoute() {
        const { path, param1, param2 } = this.parseHash();

        switch (path) {
            case 't':
                // Check for TV mode: #/t/{tournamentId}/tv
                if (param1 && param2 === 'tv') {
                    this.currentRoute = this.routes.TV;
                    this.tournamentId = param1;
                    await loadTournamentById(param1);
                    if (typeof TVMode !== 'undefined') {
                        TVMode.init(getTvData);
                    }
                } else if (param1) {
                    this.currentRoute = this.routes.TOURNAMENT;
                    this.tournamentId = param1;
                    await loadTournamentById(param1);
                }
                break;

            case 'create':
                // Create tournament: #/create/{tournamentId}
                if (param1) {
                    // Tournament already being created, show player entry
                    TournamentState.setCurrentView('players');
                    render();
                }
                break;

            default:
                // Landing page
                this.currentRoute = this.routes.HOME;
                TournamentState.reset();
                TournamentState.setCurrentView('setup');
                render();
                break;
        }
    },

    /**
     * Navigate to a route
     */
    navigate(path) {
        window.location.hash = path;
    },

    // Get shareable player link (without key)
    getPlayerLink(tournamentId) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/t/${tournamentId}`;
    },

    // Get TV mode link
    getTVLink(tournamentId) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/t/${tournamentId}/tv`;
    }
};

console.log('Router loaded');
