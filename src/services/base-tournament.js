/**
 * base-tournament.js - Base Tournament Class
 * Shared logic for all tournament formats using inheritance
 * 
 * @module services/base-tournament
 */

/**
 * Tournament status constants
 */
const TOURNAMENT_STATUS = {
    SETUP: 'setup',
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed'
};

/**
 * Base Tournament Class
 * Extend this for format-specific implementations
 */
class BaseTournament {
    /**
     * @param {string} format - Tournament format key (e.g., 'AMERICANO', 'MEXICANO')
     * @param {string} [id] - Tournament ID (generated if not provided)
     */
    constructor(format, id = null) {
        this.format = format;
        this.id = id || this._generateId();
        this.organiserKey = null;
        this.passcodeHash = null;
        
        // Tournament metadata
        this.meta = {
            name: '',
            createdAt: null,
            updatedAt: null,
            status: TOURNAMENT_STATUS.SETUP,
            mode: 'anyone', // 'anyone', 'registered', 'level-based'
            levelCriteria: null
        };
        
        // Players and courts
        this.players = [];
        this.courts = [];
        
        // Rounds and scores
        this.rounds = [];
        this.scores = {};
        this.currentRound = 0;
        
        // Firebase listener cleanup
        this._unsubscribe = null;
        this._listeners = [];
    }

    // ===== ABSTRACT METHODS (must override) =====

    /**
     * Generate fixtures/rounds for this format
     * @abstract
     * @param {number} roundNumber - Round to generate
     * @returns {object[]} Array of matches for the round
     */
    generateRound(roundNumber) {
        throw new Error('generateRound() must be implemented by subclass');
    }

    /**
     * Validate player count for this format
     * @abstract
     * @param {number} count - Number of players
     * @returns {boolean}
     */
    validatePlayerCount(count) {
        throw new Error('validatePlayerCount() must be implemented by subclass');
    }

    /**
     * Get format-specific configuration
     * @abstract
     * @returns {object}
     */
    getFormatConfig() {
        throw new Error('getFormatConfig() must be implemented by subclass');
    }

    // ===== SHARED METHODS =====

    /**
     * Generate a tournament ID
     * @private
     */
    _generateId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    /**
     * Generate an organiser key
     */
    generateOrganiserKey() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < 16; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.organiserKey = key;
        return key;
    }

    /**
     * Hash a passcode using SHA-256 (async)
     * @param {string} passcode
     * @returns {Promise<string>}
     */
    async hashPasscode(passcode) {
        if (!passcode) {
            this.passcodeHash = '';
            return '';
        }
        
        // Use Web Crypto API for secure hashing
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(passcode);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                this.passcodeHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                return this.passcodeHash;
            } catch (e) {
                console.warn('Web Crypto API failed, using fallback');
            }
        }
        
        // Fallback
        let hash = 0;
        for (let i = 0; i < passcode.length; i++) {
            const char = passcode.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        this.passcodeHash = hash.toString(16);
        return this.passcodeHash;
    }

    /**
     * Initialize tournament with basic setup
     * @param {object} options
     * @returns {Promise<BaseTournament>}
     */
    async initialize(options = {}) {
        const {
            name = 'New Tournament',
            players = [],
            courts = [],
            mode = 'anyone',
            levelCriteria = null,
            passcode = null
        } = options;

        this.meta.name = name;
        this.meta.createdAt = new Date().toISOString();
        this.meta.updatedAt = new Date().toISOString();
        this.meta.mode = mode;
        this.meta.levelCriteria = levelCriteria;

        this.players = players;
        this.courts = courts.length > 0 ? courts : this._getDefaultCourts();

        this.generateOrganiserKey();
        if (passcode) {
            await this.hashPasscode(passcode);
        }

        return this;
    }

    /**
     * Get default court names
     * @private
     */
    _getDefaultCourts() {
        const config = this.getFormatConfig();
        const courtCount = config.DEFAULT_COURTS || 1;
        return Array.from({ length: courtCount }, (_, i) => `Court ${i + 1}`);
    }

    // ===== FIREBASE OPERATIONS =====

    /**
     * Load tournament from Firebase
     * @returns {Promise<boolean>}
     */
    async load() {
        if (!this.id) {
            console.error('Cannot load: no tournament ID');
            return false;
        }

        try {
            const Firebase = window.Firebase;
            const ref = Firebase.getTournamentRef(this.format, this.id);
            const snapshot = await ref.once('value');
            
            if (!snapshot.exists()) {
                console.warn(`Tournament ${this.id} not found`);
                return false;
            }

            const data = Firebase.normalizeData(snapshot.val());
            this._applyData(data);
            return true;
        } catch (error) {
            console.error('Error loading tournament:', error);
            return false;
        }
    }

    /**
     * Save tournament to Firebase
     * @returns {Promise<boolean>}
     */
    async save() {
        try {
            const Firebase = window.Firebase;
            const data = this.toFirebaseData();
            
            await Firebase.createTournament(this.format, this.id, data);
            this.meta.updatedAt = new Date().toISOString();
            return true;
        } catch (error) {
            console.error('Error saving tournament:', error);
            return false;
        }
    }

    /**
     * Update specific fields in Firebase
     * @param {object} updates - Fields to update
     * @returns {Promise<boolean>}
     */
    async update(updates) {
        try {
            const Firebase = window.Firebase;
            updates['meta/updatedAt'] = new Date().toISOString();
            
            await Firebase.updateTournament(this.format, this.id, updates);
            this.meta.updatedAt = updates['meta/updatedAt'];
            return true;
        } catch (error) {
            console.error('Error updating tournament:', error);
            return false;
        }
    }

    /**
     * Subscribe to real-time updates
     * @param {function} callback - Called with tournament data on changes
     * @returns {function} Unsubscribe function
     */
    subscribe(callback) {
        const Firebase = window.Firebase;
        
        this._unsubscribe = Firebase.subscribeTournament(this.format, this.id, (snapshot) => {
            if (snapshot.exists()) {
                const data = Firebase.normalizeData(snapshot.val());
                this._applyData(data);
                callback(this);
            }
        });

        return () => {
            if (this._unsubscribe) {
                this._unsubscribe();
                this._unsubscribe = null;
            }
        };
    }

    /**
     * Convert to Firebase-compatible data
     * @returns {object}
     */
    toFirebaseData() {
        return {
            meta: {
                ...this.meta,
                organiserKey: this.organiserKey,
                passcodeHash: this.passcodeHash
            },
            players: this.players,
            courts: this.courts,
            rounds: this.rounds,
            scores: this.scores,
            currentRound: this.currentRound
        };
    }

    /**
     * Apply data from Firebase to this instance
     * @private
     * @param {object} data
     */
    _applyData(data) {
        if (data.meta) {
            this.meta = { ...this.meta, ...data.meta };
            this.organiserKey = data.meta.organiserKey || this.organiserKey;
            this.passcodeHash = data.meta.passcodeHash || this.passcodeHash;
        }
        if (data.players) this.players = data.players;
        if (data.courts) this.courts = data.courts;
        if (data.rounds) this.rounds = data.rounds;
        if (data.scores) this.scores = data.scores;
        if (typeof data.currentRound === 'number') this.currentRound = data.currentRound;
    }

    // ===== SCORING =====

    /**
     * Save a match score
     * @param {number} roundIndex
     * @param {number} matchIndex
     * @param {number|null} team1Score
     * @param {number|null} team2Score
     * @returns {Promise<boolean>}
     */
    async saveScore(roundIndex, matchIndex, team1Score, team2Score) {
        const scoreKey = `${roundIndex}_${matchIndex}`;
        this.scores[scoreKey] = {
            team1: team1Score === null ? -1 : team1Score,
            team2: team2Score === null ? -1 : team2Score
        };

        try {
            const Firebase = window.Firebase;
            return await Firebase.saveScore(
                this.format, this.id,
                roundIndex, matchIndex,
                team1Score, team2Score
            );
        } catch (error) {
            console.error('Error saving score:', error);
            return false;
        }
    }

    /**
     * Get score for a match
     * @param {number} roundIndex
     * @param {number} matchIndex
     * @returns {object|null} { team1, team2 } or null
     */
    getScore(roundIndex, matchIndex) {
        const scoreKey = `${roundIndex}_${matchIndex}`;
        const score = this.scores[scoreKey];
        if (!score) return null;
        
        return {
            team1: score.team1 === -1 ? null : score.team1,
            team2: score.team2 === -1 ? null : score.team2
        };
    }

    /**
     * Check if a round is complete
     * @param {number} roundIndex
     * @returns {boolean}
     */
    isRoundComplete(roundIndex) {
        const round = this.rounds[roundIndex];
        if (!round || !round.matches) return false;

        return round.matches.every((match, matchIndex) => {
            const score = this.getScore(roundIndex, matchIndex);
            return score && score.team1 !== null && score.team2 !== null;
        });
    }

    // ===== STANDINGS =====

    /**
     * Calculate standings from all scores
     * @returns {object[]} Sorted array of player standings
     */
    getStandings() {
        const standings = {};

        // Initialize all players
        this.players.forEach((player, index) => {
            standings[index] = {
                playerIndex: index,
                name: typeof player === 'string' ? player : player.name,
                played: 0,
                won: 0,
                lost: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                pointsDiff: 0,
                totalPoints: 0
            };
        });

        // Process all completed matches
        this.rounds.forEach((round, roundIndex) => {
            if (!round || !round.matches) return;

            round.matches.forEach((match, matchIndex) => {
                const score = this.getScore(roundIndex, matchIndex);
                if (!score || score.team1 === null || score.team2 === null) return;

                // Get team players
                const team1 = match.team1 || [];
                const team2 = match.team2 || [];

                // Update stats for team 1 players
                team1.forEach(playerIndex => {
                    if (standings[playerIndex]) {
                        standings[playerIndex].played++;
                        standings[playerIndex].pointsFor += score.team1;
                        standings[playerIndex].pointsAgainst += score.team2;
                        if (score.team1 > score.team2) {
                            standings[playerIndex].won++;
                        } else if (score.team1 < score.team2) {
                            standings[playerIndex].lost++;
                        }
                    }
                });

                // Update stats for team 2 players
                team2.forEach(playerIndex => {
                    if (standings[playerIndex]) {
                        standings[playerIndex].played++;
                        standings[playerIndex].pointsFor += score.team2;
                        standings[playerIndex].pointsAgainst += score.team1;
                        if (score.team2 > score.team1) {
                            standings[playerIndex].won++;
                        } else if (score.team2 < score.team1) {
                            standings[playerIndex].lost++;
                        }
                    }
                });
            });
        });

        // Calculate derived stats and sort
        return Object.values(standings)
            .map(s => ({
                ...s,
                pointsDiff: s.pointsFor - s.pointsAgainst,
                totalPoints: s.pointsFor // Can be customized per format
            }))
            .sort((a, b) => {
                // Sort by points, then by point diff, then by wins
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
                return b.won - a.won;
            });
    }

    // ===== ACCESS CONTROL =====

    /**
     * Verify organiser key
     * @param {string} key
     * @returns {Promise<boolean>}
     */
    async verifyOrganiserKey(key) {
        if (this.organiserKey) {
            return this.organiserKey === key;
        }

        // Check Firebase
        try {
            const Firebase = window.Firebase;
            return await Firebase.verifyOrganiserKey(this.format, this.id, key);
        } catch (error) {
            console.error('Error verifying organiser key:', error);
            return false;
        }
    }

    /**
     * Verify passcode and return organiser key
     * @param {string} passcode
     * @returns {Promise<string|null>} Organiser key if valid, null otherwise
     */
    async verifyPasscode(passcode) {
        try {
            const Firebase = window.Firebase;
            const storedHash = await Firebase.getPasscodeHash(this.format, this.id);
            
            if (!storedHash) return null;
            
            // Handle legacy base64 encoded passcodes
            try {
                if (btoa(atob(storedHash)) === storedHash) {
                    if (atob(storedHash) === passcode) {
                        return await Firebase.getOrganiserKey(this.format, this.id);
                    }
                }
            } catch (e) { /* Not base64 */ }
            
            // Handle legacy simple hash
            if (storedHash.length <= 8 && /^-?[0-9a-f]+$/i.test(storedHash)) {
                let legacyHash = 0;
                for (let i = 0; i < passcode.length; i++) {
                    const char = passcode.charCodeAt(i);
                    legacyHash = ((legacyHash << 5) - legacyHash) + char;
                    legacyHash = legacyHash & legacyHash;
                }
                if (legacyHash.toString(16) === storedHash) {
                    return await Firebase.getOrganiserKey(this.format, this.id);
                }
            }
            
            // Compare with SHA-256 hash
            const hash = await this.hashPasscode(passcode);
            if (storedHash === hash) {
                return await Firebase.getOrganiserKey(this.format, this.id);
            }
            
            return null;
        } catch (error) {
            console.error('Error verifying passcode:', error);
            return null;
        }
    }

    // ===== STATUS =====

    /**
     * Set tournament status
     * @param {string} status - One of TOURNAMENT_STATUS values
     */
    async setStatus(status) {
        this.meta.status = status;
        return this.update({ 'meta/status': status });
    }

    /**
     * Check if tournament is active
     * @returns {boolean}
     */
    isActive() {
        return this.meta.status === TOURNAMENT_STATUS.ACTIVE;
    }

    /**
     * Check if tournament is completed
     * @returns {boolean}
     */
    isCompleted() {
        return this.meta.status === TOURNAMENT_STATUS.COMPLETED;
    }

    // ===== CHANGE LISTENERS =====

    /**
     * Add a change listener
     * @param {function} callback
     * @returns {function} Unsubscribe function
     */
    onChange(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    }

    /**
     * Notify all change listeners
     * @protected
     */
    _notifyChange() {
        this._listeners.forEach(callback => {
            try {
                callback(this);
            } catch (e) {
                console.error('Change listener error:', e);
            }
        });
    }

    // ===== CLEANUP =====

    /**
     * Cleanup resources
     */
    destroy() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        this._listeners = [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BaseTournament, TOURNAMENT_STATUS };
}

if (typeof window !== 'undefined') {
    window.BaseTournament = BaseTournament;
    window.TOURNAMENT_STATUS = TOURNAMENT_STATUS;
}
