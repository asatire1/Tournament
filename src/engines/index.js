/**
 * Shared Tournament Engines
 * Phase 3: Extract shared logic so bug fixes apply everywhere
 * 
 * These engines contain PURE LOGIC only - no Firebase, no UI dependencies.
 * Each format's state.js uses these engines for calculations.
 * 
 * @module engines
 */

// Export all engines
if (typeof module !== 'undefined' && module.exports) {
    const { BaseEngine } = require('./BaseEngine.js');
    const { AmericanoEngine } = require('./AmericanoEngine.js');
    const { MexicanoEngine } = require('./MexicanoEngine.js');
    const { TournamentEngine } = require('./TournamentEngine.js');
    const { TeamLeagueEngine } = require('./TeamLeagueEngine.js');
    
    module.exports = {
        BaseEngine,
        AmericanoEngine,
        MexicanoEngine,
        TournamentEngine,
        TeamLeagueEngine
    };
}

// For browser use, engines are already attached to window by each file
