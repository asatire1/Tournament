/**
 * base-tournament.esm.js - Base Tournament Class (ES Module stub)
 * 
 * This is a stub that references the global BaseTournament.
 * The full implementation is in base-tournament.js
 */

export class BaseTournament {
    constructor(format, options = {}) {
        // Delegate to global if available
        if (typeof window !== 'undefined' && window.BaseTournament) {
            return new window.BaseTournament(format, options);
        }
        
        this.format = format;
        this.id = options.id || null;
        this.meta = options.meta || {};
        this.players = options.players || [];
        this.courts = options.courts || 1;
        this.rounds = options.rounds || [];
        this.scores = options.scores || [];
        this.status = options.status || 'active';
    }
}

export default BaseTournament;
