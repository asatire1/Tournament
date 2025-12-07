/**
 * state.js - Mexicano Tournament State Management
 * REBUILT: Calculates standings from match results (no stored points)
 */

class MexicanoState {
    constructor(tournamentId = null) {
        // Tournament identifiers
        this.tournamentId = tournamentId;
        this.tournamentName = '';
        this.organiserKey = null;
        this.isOrganiser = false;
        this.isInitialized = false;
        
        // Firebase sync
        this.firebaseListener = null;
        this.saveDebounceTimer = null;
        this.SAVE_DEBOUNCE_MS = 300;
        
        // Tournament settings
        this.mode = 'individual'; // 'individual' or 'team'
        this.pointsPerMatch = CONFIG.DEFAULT_POINTS_PER_MATCH;
        this.status = 'active';
        
        // Players/Teams (just names and IDs - no stored points)
        this.players = [];
        this.teams = [];
        
        // Registered players (Browse & Join)
        this.registeredPlayers = {};
        
        // Rounds and matches (source of truth for scores)
        this.rounds = [];
        this.currentRound = 0;
        this.viewingRound = 0;
        
        // Court configuration
        this.courtNames = [];
        
        // UI state
        this.activeTab = 'matches';
        this.settingsSubTab = 'players';
    }
    
    // ========================================
    // SETTINGS METHODS
    // ========================================
    
    /**
     * Update player name
     */
    updatePlayerName(index, name) {
        if (!this.canEdit()) return;
        if (this.mode === 'individual' && this.players[index]) {
            this.players[index].name = name;
        } else if (this.mode === 'team' && this.teams[index]) {
            this.teams[index].teamName = name;
        }
        this.saveToFirebase();
    }
    
    /**
     * Update court name
     */
    updateCourtName(index, name) {
        if (!this.canEdit()) return;
        if (!this.courtNames) this.courtNames = [];
        this.courtNames[index] = name;
        this.saveToFirebase();
    }
    
    /**
     * Update tournament settings
     */
    updateSettings(settings) {
        if (!this.canEdit()) return;
        
        if (settings.pointsPerMatch !== undefined) {
            this.pointsPerMatch = settings.pointsPerMatch;
        }
        if (settings.tournamentName !== undefined) {
            this.tournamentName = settings.tournamentName;
        }
        
        this.saveToFirebase();
    }
    
    /**
     * Reset all scores
     */
    resetAllScores() {
        if (!this.canEdit()) return;
        
        // Clear all match scores
        this.rounds.forEach(round => {
            if (round && round.matches) {
                round.matches.forEach(match => {
                    match.score1 = null;
                    match.score2 = null;
                    match.completed = false;
                });
            }
        });
        
        this.saveToFirebase();
    }
    
    /**
     * Get court name
     */
    getCourtName(courtIndex) {
        if (this.courtNames && this.courtNames[courtIndex]) {
            return this.courtNames[courtIndex];
        }
        return `Court ${courtIndex + 1}`;
    }
    
    // ========================================
    // STANDINGS - Calculated from match results
    // ========================================
    
    /**
     * Calculate standings from all completed matches
     * This is the KEY FIX - we don't store points, we calculate them
     */
    getStandings() {
        const stats = new Map();
        
        // Initialize all players/teams with 0
        const items = this.mode === 'individual' ? this.players : this.teams;
        items.forEach(item => {
            stats.set(item.id, {
                id: item.id,
                name: item.name || item.teamName || 'Unknown',
                totalPoints: 0,
                matchesPlayed: 0
            });
        });
        
        // Calculate from all completed matches
        this.rounds.forEach(round => {
            if (!round || !round.matches) return;
            
            round.matches.forEach(match => {
                if (!match.completed) return;
                
                const score1 = match.score1 || 0;
                const score2 = match.score2 || 0;
                
                if (this.mode === 'individual') {
                    // Individual mode - team1 and team2 are arrays of player IDs
                    const team1Ids = this.normalizeArray(match.team1);
                    const team2Ids = this.normalizeArray(match.team2);
                    
                    team1Ids.forEach(id => {
                        const s = stats.get(id);
                        if (s) {
                            s.totalPoints += score1;
                            s.matchesPlayed++;
                        }
                    });
                    
                    team2Ids.forEach(id => {
                        const s = stats.get(id);
                        if (s) {
                            s.totalPoints += score2;
                            s.matchesPlayed++;
                        }
                    });
                } else {
                    // Team mode
                    const s1 = stats.get(match.team1);
                    const s2 = stats.get(match.team2);
                    
                    if (s1) {
                        s1.totalPoints += score1;
                        s1.matchesPlayed++;
                    }
                    if (s2) {
                        s2.totalPoints += score2;
                        s2.matchesPlayed++;
                    }
                }
            });
        });
        
        // Sort by points (desc), then by matches played (asc for tiebreaker)
        return Array.from(stats.values())
            .sort((a, b) => b.totalPoints - a.totalPoints || a.matchesPlayed - b.matchesPlayed);
    }
    
    /**
     * Get player/team stats by ID
     */
    getItemStats(id) {
        const standings = this.getStandings();
        return standings.find(s => s.id === id) || { totalPoints: 0, matchesPlayed: 0 };
    }
    
    // ========================================
    // ROUND GENERATION
    // ========================================
    
    /**
     * Generate next round based on current standings
     */
    generateRound(roundNumber) {
        console.log('🔄 Generating round', roundNumber);
        
        if (this.mode === 'individual') {
            return this.generateIndividualRound(roundNumber);
        } else {
            return this.generateTeamRound(roundNumber);
        }
    }
    
    /**
     * Generate individual mode round
     */
    generateIndividualRound(roundNumber) {
        // Get current standings
        const standings = this.getStandings();
        console.log('📊 Standings for round', roundNumber, ':', standings.map(s => `${s.name}:${s.totalPoints}`));
        console.log('📊 Players array:', this.players);
        console.log('📊 Standings count:', standings.length);
        
        if (standings.length < 4) {
            console.error('❌ Not enough players:', standings.length);
            return { roundNumber, matches: [], sittingOut: [], completed: false };
        }
        
        // Round 1: Random shuffle. After: Use standings order
        let sorted = roundNumber === 1 
            ? this.shuffleArray([...standings])
            : [...standings];
        
        console.log('📊 Sorted players:', sorted.map(s => s.name));
        
        const matches = [];
        const courts = Math.floor(sorted.length / 4);
        console.log('📊 Courts:', courts, 'for', sorted.length, 'players');
        
        for (let c = 0; c < courts; c++) {
            const base = c * 4;
            // Mexicano pairing: 1&3 vs 2&4 (by ranking)
            const p1 = sorted[base];
            const p2 = sorted[base + 1];
            const p3 = sorted[base + 2];
            const p4 = sorted[base + 3];
            
            console.log(`📊 Court ${c + 1}: ${p1?.name} & ${p3?.name} vs ${p2?.name} & ${p4?.name}`);
            
            if (!p1 || !p2 || !p3 || !p4) {
                console.error('❌ Missing player at court', c + 1);
                continue;
            }
            
            // Find original player objects for indices
            const getIndex = (id) => this.players.findIndex(p => p.id === id);
            
            const match = {
                id: this.generateId(),
                court: c + 1,
                team1: [p1.id, p3.id],
                team1Names: [p1.name, p3.name],
                team1Indices: [getIndex(p1.id), getIndex(p3.id)],
                team2: [p2.id, p4.id],
                team2Names: [p2.name, p4.name],
                team2Indices: [getIndex(p2.id), getIndex(p4.id)],
                score1: null,
                score2: null,
                completed: false
            };
            
            console.log('📊 Match generated:', match);
            matches.push(match);
        }
        
        // Players sitting out
        const sittingOut = sorted.slice(courts * 4).map(s => ({
            id: s.id,
            name: s.name,
            index: this.players.findIndex(p => p.id === s.id)
        }));
        
        console.log('✅ Generated', matches.length, 'matches for round', roundNumber);
        
        return {
            roundNumber,
            matches,
            sittingOut,
            completed: false
        };
    }
    
    /**
     * Generate team mode round
     */
    generateTeamRound(roundNumber) {
        const standings = this.getStandings();
        
        if (standings.length < 2) {
            return { roundNumber, matches: [], sittingOut: [], completed: false };
        }
        
        let sorted = roundNumber === 1
            ? this.shuffleArray([...standings])
            : [...standings];
        
        const matches = [];
        const numMatches = Math.floor(sorted.length / 2);
        
        for (let m = 0; m < numMatches; m++) {
            const t1 = sorted[m * 2];
            const t2 = sorted[m * 2 + 1];
            
            if (!t1 || !t2) continue;
            
            const team1Obj = this.teams.find(t => t.id === t1.id);
            const team2Obj = this.teams.find(t => t.id === t2.id);
            
            matches.push({
                id: this.generateId(),
                court: m + 1,
                team1: t1.id,
                team1Players: team1Obj ? [team1Obj.player1, team1Obj.player2] : [t1.name],
                team1Index: this.teams.findIndex(t => t.id === t1.id),
                team2: t2.id,
                team2Players: team2Obj ? [team2Obj.player1, team2Obj.player2] : [t2.name],
                team2Index: this.teams.findIndex(t => t.id === t2.id),
                score1: null,
                score2: null,
                completed: false
            });
        }
        
        const sittingOut = sorted.length % 2 !== 0 
            ? [{ id: sorted[sorted.length - 1].id, name: sorted[sorted.length - 1].name }] 
            : [];
        
        return { roundNumber, matches, sittingOut, completed: false };
    }
    
    // ========================================
    // FIREBASE SYNC - Simplified
    // ========================================
    
    /**
     * Load tournament from Firebase
     */
    async loadTournament() {
        if (!this.tournamentId) return false;
        
        try {
            const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).once('value');
            
            if (!snapshot.exists()) return false;
            
            const data = snapshot.val();
            this.applyData(data);
            this.isInitialized = true;
            
            console.log('📦 Tournament loaded');
            return true;
        } catch (error) {
            console.error('Error loading tournament:', error);
            return false;
        }
    }
    
    /**
     * Apply data from Firebase
     */
    applyData(data) {
        if (!data) return;
        
        // Meta
        this.tournamentName = data.meta?.name || '';
        // Ensure mode is valid (not accessMode value like 'anyone')
        const rawMode = data.meta?.mode;
        this.mode = (rawMode === 'individual' || rawMode === 'team') ? rawMode : 'individual';
        console.log('📦 Applied mode:', this.mode, '(raw:', rawMode, ')');
        this.pointsPerMatch = data.meta?.pointsPerMatch || CONFIG.DEFAULT_POINTS_PER_MATCH;
        this.status = data.meta?.status || 'active';
        
        // Players/Teams (just names and IDs)
        this.players = this.normalizeArray(data.players);
        this.teams = this.normalizeArray(data.teams);
        console.log('📦 Loaded', this.players.length, 'players,', this.teams.length, 'teams');
        
        // Court names
        this.courtNames = this.normalizeArray(data.courtNames);
        
        // Rounds (source of truth for all scores)
        this.rounds = this.normalizeRoundsData(data.rounds);
        this.currentRound = data.currentRound || 1;
        
        if (this.viewingRound === 0 || this.viewingRound > this.rounds.length) {
            this.viewingRound = this.currentRound;
        }
        
        this.registeredPlayers = data.registeredPlayers || {};
    }
    
    /**
     * Setup real-time listener
     */
    setupRealtimeListener() {
        if (!this.tournamentId) return;
        
        this.stopListening();
        
        const path = `${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`;
        
        // Store last data hash to detect changes
        let lastDataHash = '';
        
        this.firebaseListener = database.ref(path).on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const dataHash = JSON.stringify(data);
                
                // Only render if data actually changed
                if (dataHash !== lastDataHash) {
                    lastDataHash = dataHash;
                    this.applyData(data);
                    render();
                }
            }
        });
        
        console.log('🔄 Real-time sync enabled');
    }
    
    /**
     * Stop listening
     */
    stopListening() {
        if (this.firebaseListener) {
            database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).off('value', this.firebaseListener);
            this.firebaseListener = null;
        }
    }
    
    /**
     * Save to Firebase (debounced)
     */
    saveToFirebase() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        this.saveDebounceTimer = setTimeout(() => {
            this.doSave();
        }, this.SAVE_DEBOUNCE_MS);
    }
    
    /**
     * Immediate save
     */
    async saveNow() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = null;
        }
        return await this.doSave();
    }
    
    /**
     * Perform the actual save
     */
    async doSave() {
        if (!this.tournamentId) return false;
        
        try {
            const updates = {
                'meta/updatedAt': new Date().toISOString(),
                'meta/status': this.status,
                'meta/name': this.tournamentName,
                'meta/pointsPerMatch': this.pointsPerMatch,
                currentRound: this.currentRound,
                rounds: this.rounds,
                registeredPlayers: this.registeredPlayers || {},
                courtNames: this.courtNames || []
            };
            
            // Players/teams don't change during gameplay - only save if needed
            if (this.mode === 'individual') {
                updates.players = this.players;
            } else {
                updates.teams = this.teams;
            }
            
            await database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).update(updates);
            console.log('✅ Saved to Firebase');
            return true;
        } catch (error) {
            console.error('❌ Save error:', error);
            return false;
        }
    }
    
    // ========================================
    // MATCH OPERATIONS
    // ========================================
    
    /**
     * Update match score
     */
    updateMatchScore(matchId, score1, score2) {
        const round = this.rounds.find(r => r.matches?.some(m => m.id === matchId));
        if (!round) return false;
        
        const match = round.matches.find(m => m.id === matchId);
        if (!match) return false;
        
        match.score1 = score1;
        match.score2 = score2;
        match.completed = (score1 !== null && score2 !== null && score1 + score2 === this.pointsPerMatch);
        
        this.saveToFirebase();
        return true;
    }
    
    /**
     * Check if current round is complete
     */
    isCurrentRoundComplete() {
        const round = this.rounds[this.currentRound - 1];
        if (!round || !round.matches) return false;
        return round.matches.every(m => m.completed);
    }
    
    /**
     * Complete current round and generate next
     */
    completeCurrentRound() {
        if (!this.isCurrentRoundComplete()) return false;
        
        // Mark current round complete
        this.rounds[this.currentRound - 1].completed = true;
        
        // Generate next round
        const nextRound = this.generateRound(this.currentRound + 1);
        
        if (nextRound.matches.length === 0) {
            console.error('❌ Failed to generate next round');
            return false;
        }
        
        this.rounds.push(nextRound);
        this.currentRound++;
        this.viewingRound = this.currentRound;
        
        this.saveToFirebase();
        return true;
    }
    
    // ========================================
    // UTILITIES
    // ========================================
    
    normalizeArray(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        return Object.values(data);
    }
    
    normalizeRoundsData(rounds) {
        if (!rounds) return [];
        
        const arr = Array.isArray(rounds) ? rounds : Object.values(rounds);
        
        return arr.map(round => {
            if (!round) return null;
            
            const matches = Array.isArray(round.matches) 
                ? round.matches 
                : (round.matches ? Object.values(round.matches) : []);
            
            return {
                ...round,
                matches: matches.map(m => {
                    if (!m) return null;
                    return {
                        ...m,
                        team1: this.normalizeArray(m.team1),
                        team2: this.normalizeArray(m.team2),
                        team1Names: this.normalizeArray(m.team1Names),
                        team2Names: this.normalizeArray(m.team2Names),
                        team1Indices: this.normalizeArray(m.team1Indices),
                        team2Indices: this.normalizeArray(m.team2Indices),
                        // Ensure scores are null not undefined
                        score1: m.score1 != null ? m.score1 : null,
                        score2: m.score2 != null ? m.score2 : null
                    };
                }).filter(Boolean),
                sittingOut: this.normalizeArray(round.sittingOut)
            };
        }).filter(Boolean);
    }
    
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    }
    
    canEdit() {
        return this.isOrganiser && this.status !== 'completed';
    }
    
    /**
     * Verify organiser key
     */
    async verifyOrganiserKey(key) {
        try {
            const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}/meta/organiserKey`).once('value');
            const storedKey = snapshot.val();
            
            if (storedKey && storedKey === key) {
                this.organiserKey = key;
                this.isOrganiser = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error verifying organiser key:', error);
            return false;
        }
    }
}

// Global state instance
let state = null;

// Local tournament storage
const MyTournaments = {
    getAll() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    },
    
    save(tournament) {
        const list = this.getAll().filter(t => t.id !== tournament.id);
        list.unshift(tournament);
        if (list.length > CONFIG.MAX_STORED_TOURNAMENTS) list.pop();
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(list));
    },
    
    remove(tournamentId) {
        const list = this.getAll().filter(t => t.id !== tournamentId);
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(list));
    }
};

console.log('✅ Mexicano State (v2) loaded');
