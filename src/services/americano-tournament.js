/**
 * americano-tournament.js - Americano Tournament Implementation
 * Rotating partners format where everyone plays with everyone
 * 
 * @module services/americano-tournament
 */

/**
 * Americano format configuration
 */
const AMERICANO_CONFIG = {
    FIREBASE_ROOT: 'americano-tournaments',
    STORAGE_KEY: 'uber_padel_americano_tournaments',
    MIN_PLAYERS: 5,
    MAX_PLAYERS: 24,
    MIN_COURTS: 1,
    MAX_COURTS: 6,
    DEFAULT_PLAYERS: 6,
    DEFAULT_COURTS: 1,
    DEFAULT_TOTAL_POINTS: 16,
    DEFAULT_FIXED_POINTS: true,
    POINTS_OPTIONS: [16, 21, 24, 32],
    TOURNAMENT_ID_LENGTH: 6,
    ORGANISER_KEY_LENGTH: 16,
    MAX_STORED_TOURNAMENTS: 20,
    MAX_ROUNDS_DISPLAY: 26
};

/**
 * Americano Tournament Class
 * Extends BaseTournament with rotating partner logic
 */
class AmericanoTournament extends BaseTournament {
    constructor(id = null) {
        super('AMERICANO', id);
        
        // Americano-specific properties
        this.totalPoints = AMERICANO_CONFIG.DEFAULT_TOTAL_POINTS;
        this.fixedPoints = AMERICANO_CONFIG.DEFAULT_FIXED_POINTS;
        this.fixtures = null; // Pre-generated fixtures for player count
    }

    /**
     * Get format configuration
     * @override
     */
    getFormatConfig() {
        return AMERICANO_CONFIG;
    }

    /**
     * Validate player count
     * @override
     */
    validatePlayerCount(count) {
        return count >= AMERICANO_CONFIG.MIN_PLAYERS && 
               count <= AMERICANO_CONFIG.MAX_PLAYERS;
    }

    /**
     * Initialize with Americano-specific options
     * @override
     */
    initialize(options = {}) {
        super.initialize(options);
        
        this.totalPoints = options.totalPoints || AMERICANO_CONFIG.DEFAULT_TOTAL_POINTS;
        this.fixedPoints = options.fixedPoints !== undefined ? options.fixedPoints : AMERICANO_CONFIG.DEFAULT_FIXED_POINTS;
        
        // Load fixtures for this player count
        this._loadFixtures();
        
        return this;
    }

    /**
     * Load pre-generated fixtures for the player count
     * @private
     */
    _loadFixtures() {
        // Check if FIXTURES global exists (from fixtures.js)
        if (typeof FIXTURES !== 'undefined' && FIXTURES[this.players.length]) {
            this.fixtures = FIXTURES[this.players.length];
        }
    }

    /**
     * Generate a round based on Americano rotating partner rules
     * @override
     * @param {number} roundNumber - Round index (0-based)
     * @returns {object} Round object with matches
     */
    generateRound(roundNumber) {
        if (!this.fixtures || !this.fixtures.rounds) {
            console.error('No fixtures available for', this.players.length, 'players');
            return { matches: [] };
        }

        const fixtureRound = this.fixtures.rounds[roundNumber];
        if (!fixtureRound) {
            console.warn('No fixture data for round', roundNumber);
            return { matches: [] };
        }

        // Map fixture format to match format
        const matches = fixtureRound.map(match => ({
            team1: match.team1.map(p => p - 1), // Convert 1-indexed to 0-indexed
            team2: match.team2.map(p => p - 1),
            court: match.court || 0
        }));

        return {
            roundNumber,
            matches,
            sitting: this._getSittingPlayers(matches)
        };
    }

    /**
     * Generate all rounds at once
     */
    generateAllRounds() {
        if (!this.fixtures || !this.fixtures.rounds) {
            this._loadFixtures();
        }

        if (!this.fixtures || !this.fixtures.rounds) {
            console.error('Cannot generate rounds: no fixtures');
            return;
        }

        this.rounds = this.fixtures.rounds.map((_, index) => 
            this.generateRound(index)
        );
    }

    /**
     * Get players sitting out for a round
     * @private
     * @param {object[]} matches - Matches for the round
     * @returns {number[]} Array of sitting player indices
     */
    _getSittingPlayers(matches) {
        const playing = new Set();
        
        matches.forEach(match => {
            match.team1.forEach(p => playing.add(p));
            match.team2.forEach(p => playing.add(p));
        });

        const sitting = [];
        for (let i = 0; i < this.players.length; i++) {
            if (!playing.has(i)) {
                sitting.push(i);
            }
        }
        
        return sitting;
    }

    /**
     * Get the total number of rounds for this tournament
     * @returns {number}
     */
    getTotalRounds() {
        if (this.fixtures && this.fixtures.rounds) {
            return this.fixtures.rounds.length;
        }
        return this.rounds.length;
    }

    /**
     * Get number of courts in use
     * @returns {number}
     */
    getCourtCount() {
        if (this.fixtures && this.fixtures.courts) {
            return this.fixtures.courts;
        }
        // Calculate from player count
        return Math.min(
            Math.floor(this.players.length / 4),
            AMERICANO_CONFIG.MAX_COURTS
        );
    }

    /**
     * Calculate Americano-specific standings
     * Partners change each round, so individual performance matters
     * @override
     */
    getStandings() {
        const standings = super.getStandings();
        
        // Americano uses total points scored as primary ranking
        return standings.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
            return b.won - a.won;
        });
    }

    /**
     * Get partner statistics - who has played with whom
     * @returns {object} Partner pairing stats
     */
    getPartnerStats() {
        const pairings = {};
        
        // Initialize pairing matrix
        for (let i = 0; i < this.players.length; i++) {
            pairings[i] = {};
            for (let j = 0; j < this.players.length; j++) {
                if (i !== j) pairings[i][j] = 0;
            }
        }

        // Count pairings from all rounds
        this.rounds.forEach(round => {
            if (!round || !round.matches) return;
            
            round.matches.forEach(match => {
                // Team 1 partners
                if (match.team1.length === 2) {
                    const [p1, p2] = match.team1;
                    pairings[p1][p2]++;
                    pairings[p2][p1]++;
                }
                // Team 2 partners
                if (match.team2.length === 2) {
                    const [p1, p2] = match.team2;
                    pairings[p1][p2]++;
                    pairings[p2][p1]++;
                }
            });
        });

        return pairings;
    }

    /**
     * Convert to Firebase data with Americano-specific fields
     * @override
     */
    toFirebaseData() {
        const data = super.toFirebaseData();
        
        return {
            ...data,
            totalPoints: this.totalPoints,
            fixedPoints: this.fixedPoints,
            fixtureInfo: {
                playerCount: this.players.length,
                courtCount: this.getCourtCount(),
                totalRounds: this.getTotalRounds()
            }
        };
    }

    /**
     * Apply data from Firebase
     * @override
     * @private
     */
    _applyData(data) {
        super._applyData(data);
        
        if (data.totalPoints) this.totalPoints = data.totalPoints;
        if (data.fixedPoints !== undefined) this.fixedPoints = data.fixedPoints;
        
        // Reload fixtures if needed
        if (!this.fixtures && this.players.length > 0) {
            this._loadFixtures();
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AmericanoTournament, AMERICANO_CONFIG };
}

if (typeof window !== 'undefined') {
    window.AmericanoTournament = AmericanoTournament;
    window.AMERICANO_CONFIG = AMERICANO_CONFIG;
}
