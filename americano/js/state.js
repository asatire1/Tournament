/**
 * state.js - Tournament State Management
 * Handles all tournament state, Firebase sync, and standings calculation
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
        
        // Match scores - keyed by "roundIndex_matchIndex"
        // For multi-court: each timeslot has multiple matches
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
                
                // Scores - convert from Firebase format
                if (data.scores) {
                    this.scores = {};
                    Object.entries(data.scores).forEach(([key, value]) => {
                        this.scores[key] = {
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
                
                // Re-render UI
                render();
            }
        });
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
            scores: this.scores,
            tournamentStarted: this.tournamentStarted
        });
    }
    
    /**
     * Save a single match score to Firebase
     */
    saveMatchScoreToFirebase(roundIndex, matchIndex, team1Score, team2Score) {
        if (!this.tournamentId) return;
        
        const key = `${roundIndex}_${matchIndex}`;
        database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}/scores/${key}`).set({
            team1: team1Score === null ? -1 : team1Score,
            team2: team2Score === null ? -1 : team2Score
        });
        database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}/meta/updatedAt`).set(new Date().toISOString());
    }
    
    /**
     * Update a match score
     */
    updateScore(roundIndex, matchIndex, team, value) {
        if (!this.canEdit()) return;
        
        const key = `${roundIndex}_${matchIndex}`;
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
            roundIndex, 
            matchIndex, 
            this.scores[key].team1, 
            this.scores[key].team2
        );
    }
    
    /**
     * Clear a match score
     */
    clearScore(roundIndex, matchIndex) {
        if (!this.canEdit()) return;
        
        const key = `${roundIndex}_${matchIndex}`;
        this.scores[key] = { team1: null, team2: null };
        this.saveMatchScoreToFirebase(roundIndex, matchIndex, null, null);
    }
    
    /**
     * Get score for a specific match
     */
    getScore(roundIndex, matchIndex) {
        const key = `${roundIndex}_${matchIndex}`;
        return this.scores[key] || { team1: null, team2: null };
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
        Object.assign(this, settings);
        this.saveToFirebase();
    }
    
    /**
     * Get rounds (fixtures grouped by court count)
     * Each round contains `courtCount` matches happening simultaneously
     */
    getRounds() {
        const fixtures = FIXTURES[this.playerCount] || [];
        const rounds = [];
        
        // Group fixtures into rounds based on court count
        for (let i = 0; i < fixtures.length; i += this.courtCount) {
            const roundMatches = fixtures.slice(i, i + this.courtCount);
            
            // Calculate resting players for this round
            const playingPlayers = new Set();
            roundMatches.forEach(match => {
                match.teams[0].forEach(p => playingPlayers.add(p));
                match.teams[1].forEach(p => playingPlayers.add(p));
            });
            
            const allPlayers = Array.from({ length: this.playerCount }, (_, i) => i + 1);
            const restingPlayers = allPlayers.filter(p => !playingPlayers.has(p));
            
            rounds.push({
                matches: roundMatches,
                resting: restingPlayers,
                index: rounds.length
            });
        }
        
        return rounds;
    }
    
    /**
     * Calculate standings with W/L/PD (Team League style)
     */
    calculateStandings() {
        const playerStats = Array(this.playerCount).fill(null).map(() => ({
            score: 0,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            pointsFor: 0,
            pointsAgainst: 0
        }));
        
        const fixtures = FIXTURES[this.playerCount] || [];
        
        // Iterate through all fixtures and their scores
        fixtures.forEach((fixture, fixtureIndex) => {
            // Determine which round and match index this fixture belongs to
            const roundIndex = Math.floor(fixtureIndex / this.courtCount);
            const matchIndex = fixtureIndex % this.courtCount;
            
            const score = this.getScore(roundIndex, matchIndex);
            
            if (score.team1 !== null && score.team2 !== null) {
                // Team 1 players
                fixture.teams[0].forEach(playerNum => {
                    const idx = playerNum - 1;
                    playerStats[idx].score += score.team1;
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
                    playerStats[idx].score += score.team2;
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
        return this.playerNames.map((name, index) => ({
            name: name || `Player ${index + 1}`,
            playerNum: index + 1,
            score: playerStats[index].score,
            gamesPlayed: playerStats[index].gamesPlayed,
            wins: playerStats[index].wins,
            losses: playerStats[index].losses,
            draws: playerStats[index].draws,
            pointsFor: playerStats[index].pointsFor,
            pointsAgainst: playerStats[index].pointsAgainst,
            pointsDiff: playerStats[index].pointsFor - playerStats[index].pointsAgainst
        })).sort((a, b) => {
            // Sort by total score, then by point difference
            if (b.score !== a.score) return b.score - a.score;
            return b.pointsDiff - a.pointsDiff;
        });
    }
    
    /**
     * Count completed matches
     */
    countCompletedMatches() {
        return Object.values(this.scores).filter(s => s && s.team1 !== null && s.team2 !== null).length;
    }
    
    /**
     * Get total number of matches
     */
    getTotalMatches() {
        return (FIXTURES[this.playerCount] || []).length;
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
