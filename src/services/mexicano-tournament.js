/**
 * mexicano-tournament.js - Mexicano Tournament Implementation
 * Rankings-based pairing: 1&3 vs 2&4, pairs based on current standings
 * 
 * @module services/mexicano-tournament
 */

/**
 * Mexicano format configuration
 */
const MEXICANO_CONFIG = {
    FIREBASE_ROOT: 'mexicano-tournaments',
    STORAGE_KEY: 'uber_padel_mexicano_tournaments',
    MIN_PLAYERS: 8,
    MAX_PLAYERS: 80,
    DEFAULT_POINTS: 32,
    POINTS_OPTIONS: [16, 21, 24, 32],
    TOURNAMENT_ID_LENGTH: 6,
    ORGANISER_KEY_LENGTH: 16,
    MAX_STORED_TOURNAMENTS: 20
};

/**
 * Mexicano Tournament Class
 * Extends BaseTournament with ranking-based pairing
 */
class MexicanoTournament extends BaseTournament {
    constructor(id = null) {
        super('MEXICANO', id);
        
        // Mexicano-specific properties
        this.pointsPerMatch = MEXICANO_CONFIG.DEFAULT_POINTS;
        this.roundCount = 0; // Number of rounds to play
    }

    /**
     * Get format configuration
     * @override
     */
    getFormatConfig() {
        return MEXICANO_CONFIG;
    }

    /**
     * Validate player count - must be divisible by 4
     * @override
     */
    validatePlayerCount(count) {
        return count >= MEXICANO_CONFIG.MIN_PLAYERS && 
               count <= MEXICANO_CONFIG.MAX_PLAYERS &&
               count % 4 === 0;
    }

    /**
     * Initialize with Mexicano-specific options
     * @override
     */
    initialize(options = {}) {
        super.initialize(options);
        
        this.pointsPerMatch = options.pointsPerMatch || MEXICANO_CONFIG.DEFAULT_POINTS;
        this.roundCount = options.roundCount || this._calculateDefaultRounds();
        
        // Generate first round with random pairings
        this.rounds = [this.generateRound(0)];
        
        return this;
    }

    /**
     * Calculate default number of rounds
     * @private
     */
    _calculateDefaultRounds() {
        // A reasonable default based on player count
        const playerCount = this.players.length;
        if (playerCount <= 12) return 6;
        if (playerCount <= 20) return 8;
        if (playerCount <= 32) return 10;
        return 12;
    }

    /**
     * Generate round based on Mexicano rules
     * Round 1: Random pairing
     * Subsequent rounds: 1&3 vs 2&4 from standings
     * @override
     * @param {number} roundNumber - Round index (0-based)
     */
    generateRound(roundNumber) {
        const playerCount = this.players.length;
        const courtsNeeded = playerCount / 4;
        
        let matches;
        
        if (roundNumber === 0) {
            // First round: random pairing
            matches = this._generateRandomPairings();
        } else {
            // Subsequent rounds: ranking-based pairing
            matches = this._generateRankingBasedPairings();
        }

        return {
            roundNumber,
            matches,
            generated: new Date().toISOString()
        };
    }

    /**
     * Generate random pairings for first round
     * @private
     */
    _generateRandomPairings() {
        const playerIndices = this.players.map((_, i) => i);
        
        // Shuffle players
        for (let i = playerIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playerIndices[i], playerIndices[j]] = [playerIndices[j], playerIndices[i]];
        }

        const matches = [];
        const courtsNeeded = this.players.length / 4;

        for (let court = 0; court < courtsNeeded; court++) {
            const base = court * 4;
            matches.push({
                team1: [playerIndices[base], playerIndices[base + 1]],
                team2: [playerIndices[base + 2], playerIndices[base + 3]],
                court
            });
        }

        return matches;
    }

    /**
     * Generate ranking-based pairings (1&3 vs 2&4)
     * @private
     */
    _generateRankingBasedPairings() {
        const standings = this.getStandings();
        const rankedPlayers = standings.map(s => s.playerIndex);
        
        const matches = [];
        const courtsNeeded = this.players.length / 4;

        for (let court = 0; court < courtsNeeded; court++) {
            const base = court * 4;
            
            // 1&3 vs 2&4 from this group of 4
            const p1 = rankedPlayers[base];     // 1st ranked
            const p2 = rankedPlayers[base + 1]; // 2nd ranked
            const p3 = rankedPlayers[base + 2]; // 3rd ranked
            const p4 = rankedPlayers[base + 3]; // 4th ranked
            
            matches.push({
                team1: [p1, p3], // 1st & 3rd
                team2: [p2, p4], // 2nd & 4th
                court
            });
        }

        return matches;
    }

    /**
     * Advance to next round
     * Generates new pairings based on current standings
     */
    advanceRound() {
        if (!this.isRoundComplete(this.currentRound)) {
            console.warn('Cannot advance: current round not complete');
            return false;
        }

        this.currentRound++;
        
        if (this.currentRound < this.roundCount) {
            const newRound = this.generateRound(this.currentRound);
            this.rounds.push(newRound);
            this._notifyChange();
            return true;
        }

        // Tournament complete
        this.meta.status = 'completed';
        this._notifyChange();
        return false;
    }

    /**
     * Calculate Mexicano standings
     * Primary: total points, Secondary: point diff
     * @override
     */
    getStandings() {
        const standings = super.getStandings();
        
        // Mexicano uses total points as primary ranking
        return standings.sort((a, b) => {
            // Primary: total points
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            // Secondary: point differential
            if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
            // Tertiary: matches won
            if (b.won !== a.won) return b.won - a.won;
            // Keep original order if all else equal
            return a.playerIndex - b.playerIndex;
        });
    }

    /**
     * Get current court count
     */
    getCourtCount() {
        return this.players.length / 4;
    }

    /**
     * Get remaining rounds
     */
    getRemainingRounds() {
        return Math.max(0, this.roundCount - this.currentRound - 1);
    }

    /**
     * Check if tournament is complete
     * @override
     */
    isCompleted() {
        return this.currentRound >= this.roundCount - 1 && 
               this.isRoundComplete(this.currentRound);
    }

    /**
     * Get player's opponents history
     * @param {number} playerIndex
     * @returns {number[]} Array of opponent indices
     */
    getOpponentsHistory(playerIndex) {
        const opponents = new Set();
        
        this.rounds.forEach(round => {
            if (!round || !round.matches) return;
            
            round.matches.forEach(match => {
                const inTeam1 = match.team1.includes(playerIndex);
                const inTeam2 = match.team2.includes(playerIndex);
                
                if (inTeam1) {
                    match.team2.forEach(p => opponents.add(p));
                } else if (inTeam2) {
                    match.team1.forEach(p => opponents.add(p));
                }
            });
        });
        
        return Array.from(opponents);
    }

    /**
     * Get player's partners history
     * @param {number} playerIndex
     * @returns {number[]} Array of partner indices
     */
    getPartnersHistory(playerIndex) {
        const partners = new Set();
        
        this.rounds.forEach(round => {
            if (!round || !round.matches) return;
            
            round.matches.forEach(match => {
                if (match.team1.includes(playerIndex)) {
                    match.team1.forEach(p => {
                        if (p !== playerIndex) partners.add(p);
                    });
                }
                if (match.team2.includes(playerIndex)) {
                    match.team2.forEach(p => {
                        if (p !== playerIndex) partners.add(p);
                    });
                }
            });
        });
        
        return Array.from(partners);
    }

    /**
     * Convert to Firebase data
     * @override
     */
    toFirebaseData() {
        const data = super.toFirebaseData();
        
        return {
            ...data,
            pointsPerMatch: this.pointsPerMatch,
            roundCount: this.roundCount,
            tournamentInfo: {
                playerCount: this.players.length,
                courtCount: this.getCourtCount(),
                format: 'mexicano'
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
        
        if (data.pointsPerMatch) this.pointsPerMatch = data.pointsPerMatch;
        if (data.roundCount) this.roundCount = data.roundCount;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MexicanoTournament, MEXICANO_CONFIG };
}

if (typeof window !== 'undefined') {
    window.MexicanoTournament = MexicanoTournament;
    window.MEXICANO_CONFIG = MEXICANO_CONFIG;
}
