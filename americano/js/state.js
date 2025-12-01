/**
 * state.js - Tournament State Management
 * Handles all tournament state, Firebase sync, and standings calculation
 * 
 * Phase 2: Multi-court scheduling - fixtures are grouped into timeslots
 * where no player appears in multiple matches simultaneously.
 * Scores are now keyed by fixture index (f_0, f_1, etc.) for stability.
 */

class AmericanoState {
    constructor(tournamentId = null) {
        // Tournament identifiers
        this.tournamentId = tournamentId;
        this.tournamentName = '';
        this.organiserKey = null;
        this.isOrganiser = false;
        this.isInitialized = false;
        
        // Player configuration
        this.playerCount = CONFIG.DEFAULT_PLAYERS;
        this.playerNames = [];
        
        // Court configuration
        this.courtCount = CONFIG.DEFAULT_COURTS;
        this.courtNames = [];
        
        // Scoring configuration
        this.fixedPoints = CONFIG.DEFAULT_FIXED_POINTS;
        this.totalPoints = CONFIG.DEFAULT_TOTAL_POINTS;
        
        // Match scores - keyed by "f_{fixtureIndex}" for stability
        // This allows court count changes without losing scores
        this.scores = {};
        
        // Tournament status
        this.tournamentStarted = false;
        
        // UI state
        this.currentTab = 'fixtures';
        this.settingsSubTab = 'players';
        this.selectedRound = 'all';
        
        // Firebase references
        this.firebaseRef = null;
        this.unsubscribe = null;
        
        // Cached timeslots (recalculated when court count changes)
        this._cachedTimeslots = null;
        this._cachedCourtCount = null;
        this._cachedPlayerCount = null;
    }
    
    /**
     * Verify organiser key against Firebase
     */
    async verifyOrganiserKey(key) {
        if (!this.tournamentId || !key) {
            this.isOrganiser = false;
            return false;
        }
        
        try {
            const isValid = await verifyOrganiserKey(this.tournamentId, key);
            this.isOrganiser = isValid;
            this.organiserKey = isValid ? key : null;
            return isValid;
        } catch (error) {
            console.error('Error verifying organiser key:', error);
            this.isOrganiser = false;
            return false;
        }
    }
    
    /**
     * Check if user can edit tournament
     */
    canEdit() {
        return this.isOrganiser;
    }
    
    /**
     * Load tournament data from Firebase and subscribe to changes
     */
    loadFromFirebase() {
        if (!this.tournamentId) return;
        
        this.firebaseRef = database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`);
        
        this.unsubscribe = this.firebaseRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Meta data
                this.tournamentName = data.meta?.name || '';
                
                // Player config
                this.playerCount = data.playerCount || CONFIG.DEFAULT_PLAYERS;
                if (data.playerNames) {
                    this.playerNames = Array.isArray(data.playerNames) 
                        ? data.playerNames 
                        : Object.values(data.playerNames);
                } else {
                    this.playerNames = getDefaultPlayerNames(this.playerCount);
                }
                
                // Court config
                this.courtCount = data.courtCount || CONFIG.DEFAULT_COURTS;
                if (data.courtNames) {
                    this.courtNames = Array.isArray(data.courtNames)
                        ? data.courtNames
                        : Object.values(data.courtNames);
                } else {
                    this.courtNames = getDefaultCourtNames(this.courtCount);
                }
                
                // Scoring config
                this.fixedPoints = data.fixedPoints !== undefined ? data.fixedPoints : CONFIG.DEFAULT_FIXED_POINTS;
                this.totalPoints = data.totalPoints || CONFIG.DEFAULT_TOTAL_POINTS;
                
                // Scores - convert from Firebase format and handle migration
                if (data.scores) {
                    this.scores = {};
                    Object.entries(data.scores).forEach(([key, value]) => {
                        // Migrate old format (roundIndex_matchIndex) to new format (f_fixtureIndex)
                        const newKey = this._migrateScoreKey(key, data.courtCount || CONFIG.DEFAULT_COURTS);
                        this.scores[newKey] = {
                            team1: value?.team1 === -1 ? null : value?.team1,
                            team2: value?.team2 === -1 ? null : value?.team2
                        };
                    });
                } else {
                    this.scores = {};
                }
                
                // Status
                this.tournamentStarted = data.tournamentStarted || false;
                this.isInitialized = true;
                
                // Invalidate cache
                this._cachedTimeslots = null;
                
                // Re-render UI
                render();
            }
        });
    }
    
    /**
     * Migrate old score key format to new format
     * Old: "roundIndex_matchIndex" (e.g., "0_0", "1_2")
     * New: "f_fixtureIndex" (e.g., "f_0", "f_5")
     */
    _migrateScoreKey(key, oldCourtCount) {
        // Already in new format
        if (key.startsWith('f_')) {
            return key;
        }
        
        // Convert old format to fixture index
        const parts = key.split('_');
        if (parts.length === 2) {
            const roundIndex = parseInt(parts[0]);
            const matchIndex = parseInt(parts[1]);
            const fixtureIndex = roundIndex * oldCourtCount + matchIndex;
            return `f_${fixtureIndex}`;
        }
        
        return key;
    }
    
    /**
     * Stop listening to Firebase changes
     */
    stopListening() {
        if (this.firebaseRef && this.unsubscribe) {
            this.firebaseRef.off('value', this.unsubscribe);
        }
    }
    
    /**
     * Save full tournament state to Firebase
     */
    saveToFirebase() {
        if (!this.tournamentId) return;
        
        // Convert scores to Firebase format
        const firebaseScores = {};
        Object.entries(this.scores).forEach(([key, value]) => {
            firebaseScores[key] = {
                team1: value.team1 === null ? -1 : value.team1,
                team2: value.team2 === null ? -1 : value.team2
            };
        });
        
        database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).update({
            meta: {
                name: this.tournamentName,
                organiserKey: this.organiserKey,
                updatedAt: new Date().toISOString()
            },
            playerCount: this.playerCount,
            playerNames: this.playerNames,
            courtCount: this.courtCount,
            courtNames: this.courtNames,
            fixedPoints: this.fixedPoints,
            totalPoints: this.totalPoints,
            scores: firebaseScores,
            tournamentStarted: this.tournamentStarted
        });
    }
    
    /**
     * Save a single match score to Firebase using fixture index
     */
    saveMatchScoreToFirebase(fixtureIndex, team1Score, team2Score) {
        if (!this.tournamentId) return;
        
        const key = `f_${fixtureIndex}`;
        database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}/scores/${key}`).set({
            team1: team1Score === null ? -1 : team1Score,
            team2: team2Score === null ? -1 : team2Score
        });
        database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}/meta/updatedAt`).set(new Date().toISOString());
    }
    
    /**
     * Update a match score by fixture index
     */
    updateScoreByFixture(fixtureIndex, team, value) {
        if (!this.canEdit()) return;
        
        const key = `f_${fixtureIndex}`;
        if (!this.scores[key]) {
            this.scores[key] = { team1: null, team2: null };
        }
        
        const numValue = value === '' || value === null ? null : parseInt(value);
        this.scores[key][team] = numValue;
        
        // Auto-calculate other team's score if fixed points
        if (this.fixedPoints && team === 'team1' && numValue !== null) {
            this.scores[key].team2 = this.totalPoints - numValue;
        }
        
        this.saveMatchScoreToFirebase(
            fixtureIndex,
            this.scores[key].team1, 
            this.scores[key].team2
        );
    }
    
    /**
     * Clear a match score by fixture index
     */
    clearScoreByFixture(fixtureIndex) {
        if (!this.canEdit()) return;
        
        const key = `f_${fixtureIndex}`;
        this.scores[key] = { team1: null, team2: null };
        this.saveMatchScoreToFirebase(fixtureIndex, null, null);
    }
    
    /**
     * Get score for a specific fixture
     */
    getScoreByFixture(fixtureIndex) {
        const key = `f_${fixtureIndex}`;
        return this.scores[key] || { team1: null, team2: null };
    }
    
    // Legacy methods for backward compatibility
    updateScore(roundIndex, matchIndex, team, value) {
        // Convert to fixture index using current timeslot structure
        const timeslots = this.getRounds();
        if (timeslots[roundIndex] && timeslots[roundIndex].matches[matchIndex]) {
            const fixtureIndex = timeslots[roundIndex].matches[matchIndex].fixtureIndex;
            this.updateScoreByFixture(fixtureIndex, team, value);
        }
    }
    
    clearScore(roundIndex, matchIndex) {
        const timeslots = this.getRounds();
        if (timeslots[roundIndex] && timeslots[roundIndex].matches[matchIndex]) {
            const fixtureIndex = timeslots[roundIndex].matches[matchIndex].fixtureIndex;
            this.clearScoreByFixture(fixtureIndex);
        }
    }
    
    getScore(roundIndex, matchIndex) {
        const timeslots = this.getRounds();
        if (timeslots[roundIndex] && timeslots[roundIndex].matches[matchIndex]) {
            const fixtureIndex = timeslots[roundIndex].matches[matchIndex].fixtureIndex;
            return this.getScoreByFixture(fixtureIndex);
        }
        return { team1: null, team2: null };
    }
    
    /**
     * Update player name
     */
    updatePlayerName(index, name) {
        if (!this.canEdit()) return;
        this.playerNames[index] = name;
        this.saveToFirebase();
    }
    
    /**
     * Update court name
     */
    updateCourtName(index, name) {
        if (!this.canEdit()) return;
        this.courtNames[index] = name;
        this.saveToFirebase();
    }
    
    /**
     * Update tournament settings
     */
    updateSettings(settings) {
        if (!this.canEdit()) return;
        
        // Check if court count is changing
        if (settings.courtCount !== undefined && settings.courtCount !== this.courtCount) {
            // Invalidate cache
            this._cachedTimeslots = null;
            
            // Ensure court names array is updated
            const newCourtCount = settings.courtCount;
            if (newCourtCount > this.courtNames.length) {
                // Add new court names
                for (let i = this.courtNames.length; i < newCourtCount; i++) {
                    this.courtNames.push(`Court ${i + 1}`);
                }
            }
        }
        
        Object.assign(this, settings);
        this.saveToFirebase();
    }
    
    /**
     * Get timeslots (rounds) - fixtures grouped so no player plays twice in same timeslot
     * Each timeslot contains up to `courtCount` matches happening simultaneously
     * 
     * This is the core multi-court scheduling algorithm.
     */
    getRounds() {
        // Return cached result if valid
        if (this._cachedTimeslots && 
            this._cachedCourtCount === this.courtCount &&
            this._cachedPlayerCount === this.playerCount) {
            return this._cachedTimeslots;
        }
        
        const fixtures = FIXTURES[this.playerCount] || [];
        const timeslots = [];
        const usedFixtureIndices = new Set();
        
        // Keep grouping fixtures into timeslots until all are used
        while (usedFixtureIndices.size < fixtures.length) {
            const timeslot = {
                matches: [],
                resting: new Set(Array.from({length: this.playerCount}, (_, i) => i + 1)),
                index: timeslots.length
            };
            
            // Track which players are already in this timeslot
            const playersInTimeslot = new Set();
            
            // Find compatible fixtures for this timeslot
            for (let i = 0; i < fixtures.length && timeslot.matches.length < this.courtCount; i++) {
                if (usedFixtureIndices.has(i)) continue;
                
                const fixture = fixtures[i];
                const playersInMatch = [...fixture.teams[0], ...fixture.teams[1]];
                
                // Check if any player is already playing in this timeslot
                const hasConflict = playersInMatch.some(p => playersInTimeslot.has(p));
                
                if (!hasConflict) {
                    // Add this fixture to the timeslot
                    timeslot.matches.push({
                        teams: fixture.teams,
                        rest: fixture.rest,
                        fixtureIndex: i  // Store original fixture index for scoring
                    });
                    usedFixtureIndices.add(i);
                    
                    // Mark these players as playing
                    playersInMatch.forEach(p => {
                        playersInTimeslot.add(p);
                        timeslot.resting.delete(p);
                    });
                }
            }
            
            // Convert resting set to sorted array
            timeslot.resting = Array.from(timeslot.resting).sort((a, b) => a - b);
            timeslots.push(timeslot);
        }
        
        // Cache the result
        this._cachedTimeslots = timeslots;
        this._cachedCourtCount = this.courtCount;
        this._cachedPlayerCount = this.playerCount;
        
        return timeslots;
    }
    
    /**
     * Calculate standings with W/L/PD (Team League style)
     * Uses fixture-based scoring for accurate results
     */
    calculateStandings() {
        const playerStats = Array(this.playerCount).fill(null).map(() => ({
            totalScore: 0,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            pointsFor: 0,
            pointsAgainst: 0
        }));
        
        const fixtures = FIXTURES[this.playerCount] || [];
        
        // Iterate through all fixtures using fixture index
        fixtures.forEach((fixture, fixtureIndex) => {
            const score = this.getScoreByFixture(fixtureIndex);
            
            if (score.team1 !== null && score.team2 !== null) {
                // Team 1 players
                fixture.teams[0].forEach(playerNum => {
                    const idx = playerNum - 1;
                    playerStats[idx].totalScore += score.team1;
                    playerStats[idx].gamesPlayed++;
                    playerStats[idx].pointsFor += score.team1;
                    playerStats[idx].pointsAgainst += score.team2;
                    
                    if (score.team1 > score.team2) {
                        playerStats[idx].wins++;
                    } else if (score.team1 < score.team2) {
                        playerStats[idx].losses++;
                    } else {
                        playerStats[idx].draws++;
                    }
                });
                
                // Team 2 players
                fixture.teams[1].forEach(playerNum => {
                    const idx = playerNum - 1;
                    playerStats[idx].totalScore += score.team2;
                    playerStats[idx].gamesPlayed++;
                    playerStats[idx].pointsFor += score.team2;
                    playerStats[idx].pointsAgainst += score.team1;
                    
                    if (score.team2 > score.team1) {
                        playerStats[idx].wins++;
                    } else if (score.team2 < score.team1) {
                        playerStats[idx].losses++;
                    } else {
                        playerStats[idx].draws++;
                    }
                });
            }
        });
        
        // Build standings array and sort
        return this.playerNames.map((name, index) => {
            const stats = playerStats[index];
            const avgScore = stats.gamesPlayed > 0 
                ? stats.totalScore / stats.gamesPlayed 
                : 0;
            const pointsDiff = stats.pointsFor - stats.pointsAgainst;
            const avgPointsDiff = stats.gamesPlayed > 0 
                ? pointsDiff / stats.gamesPlayed 
                : 0;
            
            return {
                name: name || `Player ${index + 1}`,
                playerNum: index + 1,
                score: stats.totalScore,        // Total score (legacy)
                avgScore: avgScore,             // Average score per game
                gamesPlayed: stats.gamesPlayed,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws,
                pointsFor: stats.pointsFor,
                pointsAgainst: stats.pointsAgainst,
                pointsDiff: pointsDiff,
                avgPointsDiff: avgPointsDiff    // Average point diff per game
            };
        }).sort((a, b) => {
            // Primary sort: Average score (fairest when game counts differ)
            if (Math.abs(b.avgScore - a.avgScore) > 0.01) {
                return b.avgScore - a.avgScore;
            }
            // Secondary sort: Average point difference
            if (Math.abs(b.avgPointsDiff - a.avgPointsDiff) > 0.01) {
                return b.avgPointsDiff - a.avgPointsDiff;
            }
            // Tertiary sort: Total score (tiebreaker for equal averages)
            return b.score - a.score;
        });
    }
    
    /**
     * Count completed matches
     */
    countCompletedMatches() {
        let count = 0;
        const fixtures = FIXTURES[this.playerCount] || [];
        fixtures.forEach((_, fixtureIndex) => {
            const score = this.getScoreByFixture(fixtureIndex);
            if (score.team1 !== null && score.team2 !== null) {
                count++;
            }
        });
        return count;
    }
    
    /**
     * Get total number of matches (fixtures)
     */
    getTotalMatches() {
        return (FIXTURES[this.playerCount] || []).length;
    }
    
    /**
     * Get total number of timeslots (rounds)
     */
    getTotalTimeslots() {
        return this.getRounds().length;
    }
    
    /**
     * Get games per player range for current configuration
     */
    getGamesPerPlayerRange() {
        const info = getTournamentInfo(this.playerCount);
        return {
            min: info.gamesPerPlayerMin,
            max: info.gamesPerPlayerMax
        };
    }
    
    /**
     * Reset all scores
     */
    resetAllScores() {
        if (!this.canEdit()) return;
        this.scores = {};
        this.saveToFirebase();
    }
}

// Global state instance
let state = null;

/**
 * My Tournaments - Local storage management
 */
const MyTournaments = {
    KEY: CONFIG.STORAGE_KEY,
    
    getAll() {
        try {
            const data = localStorage.getItem(this.KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },
    
    add(tournamentId, name) {
        const tournaments = this.getAll();
        if (!tournaments.find(t => t.id === tournamentId)) {
            tournaments.unshift({
                id: tournamentId,
                name: name,
                createdAt: new Date().toISOString()
            });
            if (tournaments.length > CONFIG.MAX_STORED_TOURNAMENTS) {
                tournaments.pop();
            }
            localStorage.setItem(this.KEY, JSON.stringify(tournaments));
        }
    },
    
    remove(tournamentId) {
        const tournaments = this.getAll().filter(t => t.id !== tournamentId);
        localStorage.setItem(this.KEY, JSON.stringify(tournaments));
    },
    
    updateName(tournamentId, name) {
        const tournaments = this.getAll();
        const tournament = tournaments.find(t => t.id === tournamentId);
        if (tournament) {
            tournament.name = name;
            localStorage.setItem(this.KEY, JSON.stringify(tournaments));
        }
    }
};
