/**
 * services/index.js - Services Layer Bundle
 * Central export point for all services
 * 
 * Load order:
 *   1. Core modules (firebase, permissions, storage, router, auth)
 *   2. base-tournament.js
 *   3. Format-specific tournaments (americano-tournament.js, etc.)
 *   4. tournament-service.js
 *   5. user-service.js
 *   6. This file (optional, for verification)
 * 
 * @module services
 */

// Verify all services loaded
(function() {
    const services = {
        'BaseTournament': typeof BaseTournament !== 'undefined',
        'AmericanoTournament': typeof AmericanoTournament !== 'undefined',
        'MexicanoTournament': typeof MexicanoTournament !== 'undefined',
        'TournamentService': typeof TournamentService !== 'undefined',
        'UserService': typeof UserService !== 'undefined'
    };
    
    const missing = Object.entries(services)
        .filter(([name, loaded]) => !loaded)
        .map(([name]) => name);
    
    if (missing.length > 0) {
        console.warn('⚠️ Services not fully loaded. Missing:', missing.join(', '));
    } else {
        console.log('✅ All services loaded successfully');
    }
})();

/**
 * Services facade for convenient access
 */
const Services = {
    // Tournament classes
    get BaseTournament() { return window.BaseTournament; },
    get AmericanoTournament() { return window.AmericanoTournament; },
    get MexicanoTournament() { return window.MexicanoTournament; },
    
    // Services
    get Tournament() { return window.TournamentService; },
    get User() { return window.UserService; },
    
    // Constants
    get FORMATS() { return window.FORMATS; },
    get TOURNAMENT_STATUS() { return window.TOURNAMENT_STATUS; },
    get USER_STATUS() { return window.USER_STATUS; },
    
    /**
     * Create a new tournament
     * @param {string} format - 'AMERICANO', 'MEXICANO', etc.
     * @param {object} options - Tournament options
     */
    async createTournament(format, options) {
        return this.Tournament.create(format, options);
    },
    
    /**
     * Load an existing tournament
     * @param {string} format
     * @param {string} id
     */
    async loadTournament(format, id) {
        return this.Tournament.load(format, id);
    },
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return window.Auth?.getCurrentUser() || null;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Services };
}

if (typeof window !== 'undefined') {
    window.Services = Services;
}
