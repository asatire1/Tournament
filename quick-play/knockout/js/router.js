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

    /**
     * Handle route change
     */
    async handleRoute() {
        const { path, param1, param2 } = this.parseHash();

        switch (path) {
            case 't':
                // View tournament: #/t/{tournamentId}
                if (param1) {
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
    }
};

console.log('Router loaded');
