/**
 * state.js - Mexicano Tournament State Management
 * Handles all tournament state, Firebase sync, and round generation
 */

class MexicanoState {
    constructor(tournamentId = null) {
        // Tournament identifiers
        this.tournamentId = tournamentId;
        this.tournamentName = '';
        this.organiserKey = null;
        this.isOrganiser = false;
        this.isInitialized = false;
        
        // Polling for viewers (optimization: viewers don't need real-time)
        this.pollingInterval = null;
        this.VIEWER_POLL_INTERVAL = 10000; // 10 seconds for viewers
        
        // Debounce for saves (optimization: batch writes)
        this.saveDebounceTimer = null;
        this.SAVE_DEBOUNCE_MS = 500;        // Wait 500ms after last change
        this.pendingSave = false;
        
        // Idle detection (optimization: disconnect inactive users)
        this.idleTimer = null;
        this.IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes
        this.isDisconnected = false;
        this.activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
        this.boundResetIdle = null;
        this.lastIdleReset = 0;
        
        // Tournament mode and settings
        this.mode = 'individual'; // 'individual' or 'team'
        this.pointsPerMatch = CONFIG.DEFAULT_POINTS_PER_MATCH;
        this.status = 'setup'; // 'setup', 'active', 'completed'
        
        // Players/Teams
        this.players = [];
        this.teams = [];
        
        // Registered players (Phase 4 - Browse & Join)
        this.registeredPlayers = {};
        
        // Rounds and matches
        this.rounds = [];
        this.currentRound = 0;
        this.viewingRound = 0;
        
        // UI state
        this.activeTab = 'matches';
        
        // Firebase listener
        this.firebaseListener = null;
        
        // Scores being edited (prevent sync conflicts)
        this.scoresBeingEdited = new Set();
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
            
            if (isValid) {
                // Upgrade from polling to real-time sync
                this.upgradeToRealtime();
            }
            
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
     * Load tournament data from Firebase
     */
    async loadFromFirebase() {
        if (!this.tournamentId) return false;
        
        try {
            const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).once('value');
            
            if (!snapshot.exists()) {
                return false;
            }
            
            const data = snapshot.val();
            
            // Meta data (static config)
            this.tournamentName = data.meta?.name || '';
            this.mode = data.meta?.mode || 'individual';
            this.pointsPerMatch = data.meta?.pointsPerMatch || CONFIG.DEFAULT_POINTS_PER_MATCH;
            this.status = data.meta?.status || 'active';
            
            // Players/Teams - normalize arrays (Firebase may convert to objects)
            this.players = this.normalizeArray(data.players);
            this.teams = this.normalizeArray(data.teams);
            
            // Rounds - normalize to ensure arrays are properly converted
            this.rounds = this.normalizeRoundsData(data.rounds || []);
            this.currentRound = data.currentRound || 1;
            this.viewingRound = this.currentRound;
            
            this.isInitialized = true;
            
            // Save to local storage
            MyTournaments.save({
                id: this.tournamentId,
                name: this.tournamentName,
                createdAt: data.meta?.createdAt
            });
            
            console.log('📦 Initial data loaded');
            return true;
        } catch (error) {
            console.error('Error loading tournament:', error);
            return false;
        }
    }
    
    /**
     * Process DYNAMIC data from Firebase (rounds, players/teams with scores)
     */
    processDynamicData(data) {
        // Don't update if user is editing scores
        if (this.scoresBeingEdited.size > 0) {
            console.log('⏳ Skipping Firebase update - scores being edited');
            return;
        }
        
        if (!data) return;
        
        // Update rounds - normalize data from Firebase
        this.rounds = this.normalizeRoundsData(data.rounds || []);
        this.currentRound = data.currentRound || 1;
        
        // For ORGANISER: Don't overwrite local player data - organiser is source of truth
        // Only update if we don't have players yet
        if (this.isOrganiser && this.players.length > 0) {
            console.log('👑 Organiser mode - keeping local player state');
            // Don't overwrite players - local state is authoritative
        } else {
            // For VIEWERS: Always update from Firebase
            this.players = this.normalizeArray(data.players);
            this.teams = this.normalizeArray(data.teams);
        }
        
        this.status = data.meta?.status || 'active';
        this.registeredPlayers = data.registeredPlayers || {};
        
        // Adjust viewing round if needed
        if (this.viewingRound > this.rounds.length) {
            this.viewingRound = this.currentRound;
        }
        
        // Re-render
        render();
    }
    
    /**
     * Normalize array data from Firebase (converts object-with-numeric-keys to array)
     */
    normalizeArray(data) {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        // Firebase converts arrays to objects with numeric keys
        return Object.values(data);
    }
    
    /**
     * Setup real-time listener or polling for tournament updates
     */
    setupRealtimeListener() {
        if (!this.tournamentId) return;
        
        // Clean up existing listener/polling
        this.stopListening();
        
        const basePath = `${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`;
        
        if (this.isOrganiser) {
            // ORGANISER: Real-time listeners for dynamic data
            console.log('👑 Organiser mode: Real-time sync for scores');
            this.setupScoreListeners(basePath);
        } else {
            // VIEWER: Polling for dynamic data only
            console.log('👁️ Viewer mode: Polling scores (every ' + (this.VIEWER_POLL_INTERVAL/1000) + 's)');
            this.setupScorePolling(basePath);
        }
        
        // Start idle detection (only on first setup, not on reconnect)
        if (!this.boundResetIdle) {
            this.startIdleDetection();
        }
    }
    
    /**
     * Set up real-time listeners for dynamic data (organiser mode)
     */
    setupScoreListeners(basePath) {
        // Listen to all dynamic data paths
        this.firebaseListener = database.ref(basePath).on('value', (snapshot) => {
            if (snapshot.exists() && this.scoresBeingEdited.size === 0) {
                this.processDynamicData(snapshot.val());
            }
        });
    }
    
    /**
     * Set up polling for dynamic data (viewer mode)
     */
    setupScorePolling(basePath) {
        this.pollingInterval = setInterval(() => {
            // Fetch only the dynamic parts
            Promise.all([
                database.ref(`${basePath}/rounds`).once('value'),
                database.ref(`${basePath}/currentRound`).once('value'),
                database.ref(`${basePath}/players`).once('value'),
                database.ref(`${basePath}/teams`).once('value'),
                database.ref(`${basePath}/meta/status`).once('value')
            ]).then(([roundsSnap, currentRoundSnap, playersSnap, teamsSnap, statusSnap]) => {
                if (this.scoresBeingEdited.size === 0) {
                    this.rounds = this.normalizeRoundsData(roundsSnap.val() || []);
                    this.currentRound = currentRoundSnap.val() || 1;
                    this.players = this.normalizeArray(playersSnap.val());
                    this.teams = this.normalizeArray(teamsSnap.val());
                    this.status = statusSnap.val() || 'active';
                    
                    if (this.viewingRound > this.rounds.length) {
                        this.viewingRound = this.currentRound;
                    }
                    
                    render();
                }
            });
        }, this.VIEWER_POLL_INTERVAL);
    }
    
    /**
     * Upgrade from polling to real-time (when viewer becomes organiser)
     */
    upgradeToRealtime() {
        if (this.pollingInterval) {
            console.log('⬆️ Upgrading to real-time sync');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            
            const basePath = `${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`;
            this.setupScoreListeners(basePath);
        }
    }
    
    /**
     * Stop listening to Firebase changes
     */
    stopListening() {
        // Clear real-time listener
        if (this.firebaseListener) {
            database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).off('value', this.firebaseListener);
            this.firebaseListener = null;
        }
        
        // Clear polling interval if active
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('🛑 Stopped polling');
        }
    }
    
    // ===== IDLE DETECTION =====
    
    startIdleDetection() {
        this.boundResetIdle = this.resetIdleTimer.bind(this);
        this.activityEvents.forEach(event => {
            document.addEventListener(event, this.boundResetIdle, { passive: true });
        });
        this.resetIdleTimer();
        console.log('👁️ Idle detection started (timeout: ' + (this.IDLE_TIMEOUT_MS / 60000) + ' min)');
    }
    
    stopIdleDetection() {
        if (this.boundResetIdle) {
            this.activityEvents.forEach(event => {
                document.removeEventListener(event, this.boundResetIdle);
            });
            this.boundResetIdle = null;
        }
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }
    
    resetIdleTimer() {
        const now = Date.now();
        if (!this.isDisconnected && this.lastIdleReset && (now - this.lastIdleReset) < 5000) {
            return;
        }
        this.lastIdleReset = now;
        
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        if (this.isDisconnected) {
            this.reconnect();
        }
        this.idleTimer = setTimeout(() => {
            this.onIdle();
        }, this.IDLE_TIMEOUT_MS);
    }
    
    onIdle() {
        if (this.isDisconnected) return;
        console.log('😴 User idle - disconnecting to save resources');
        this.isDisconnected = true;
        this.flushSaveImmediately();
        this.stopListening();
        this.showReconnectBanner();
    }
    
    async reconnect() {
        if (!this.isDisconnected) return;
        console.log('🔄 User active - reconnecting...');
        this.isDisconnected = false;
        this.hideReconnectBanner();
        
        await this.loadFromFirebase();
        this.setupRealtimeListener();
        render();
        console.log('✅ Reconnected successfully');
    }
    
    showReconnectBanner() {
        if (document.getElementById('idle-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'idle-banner';
        banner.className = 'fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 px-4 z-50 shadow-lg';
        banner.innerHTML = `
            <span>😴 Disconnected due to inactivity.</span>
            <button onclick="state.resetIdleTimer()" class="ml-2 underline font-semibold hover:text-amber-100">
                Click to reconnect
            </button>
        `;
        document.body.prepend(banner);
    }
    
    hideReconnectBanner() {
        const banner = document.getElementById('idle-banner');
        if (banner) banner.remove();
    }
    
    /**
     * Save state to Firebase - DEBOUNCED
     */
    async saveToFirebase() {
        this.pendingSave = true;
        
        // Debounce the actual save
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        
        this.saveDebounceTimer = setTimeout(() => {
            this.flushSave();
        }, this.SAVE_DEBOUNCE_MS);
        
        return true; // Return immediately, actual save is async
    }
    
    /**
     * Flush pending save to Firebase
     */
    async flushSave() {
        if (!this.tournamentId || !this.pendingSave) {
            this.saveDebounceTimer = null;
            return false;
        }
        
        try {
            const updates = {
                'meta/updatedAt': new Date().toISOString(),
                currentRound: this.currentRound,
                rounds: this.rounds,
                registeredPlayers: this.registeredPlayers || {}
            };
            
            if (this.mode === 'individual') {
                updates.players = this.players;
            } else {
                updates.teams = this.teams;
            }
            
            await database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).update(updates);
            console.log('✅ Saved tournament state');
            this.pendingSave = false;
            this.saveDebounceTimer = null;
            return true;
        } catch (error) {
            console.error('❌ Error saving to Firebase:', error);
            this.saveDebounceTimer = null;
            return false;
        }
    }
    
    /**
     * Force immediate save (e.g., before page unload)
     */
    async flushSaveImmediately() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = null;
        }
        // Force pendingSave to true to ensure we save
        this.pendingSave = true;
        return await this.flushSave();
    }
    
    /**
     * Normalize rounds data from Firebase
     * Firebase sometimes converts arrays to objects, this ensures proper structure
     */
    normalizeRoundsData(rounds) {
        if (!rounds) return [];
        
        // Convert Firebase object-with-numeric-keys to array if needed
        const roundsArray = Array.isArray(rounds) ? rounds : Object.values(rounds);
        
        return roundsArray.map(round => {
            if (!round) return null;
            
            // Normalize matches array
            const matches = Array.isArray(round.matches) 
                ? round.matches 
                : (round.matches ? Object.values(round.matches) : []);
            
            // Normalize sitting out array
            const sittingOut = Array.isArray(round.sittingOut) 
                ? round.sittingOut 
                : (round.sittingOut ? Object.values(round.sittingOut) : []);
            
            return {
                ...round,
                matches: matches.map(match => {
                    if (!match) return null;
                    
                    // Ensure team arrays are properly converted
                    return {
                        ...match,
                        team1: Array.isArray(match.team1) ? match.team1 : (match.team1 ? Object.values(match.team1) : []),
                        team2: Array.isArray(match.team2) ? match.team2 : (match.team2 ? Object.values(match.team2) : []),
                        team1Names: Array.isArray(match.team1Names) ? match.team1Names : (match.team1Names ? Object.values(match.team1Names) : []),
                        team2Names: Array.isArray(match.team2Names) ? match.team2Names : (match.team2Names ? Object.values(match.team2Names) : []),
                        team1Indices: Array.isArray(match.team1Indices) ? match.team1Indices : (match.team1Indices ? Object.values(match.team1Indices) : []),
                        team2Indices: Array.isArray(match.team2Indices) ? match.team2Indices : (match.team2Indices ? Object.values(match.team2Indices) : [])
                    };
                }).filter(m => m !== null),
                sittingOut
            };
        }).filter(r => r !== null);
    }
    
    /**
     * Generate a round based on current standings
     */
    generateRound(roundNumber) {
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
        console.log('🔄 Generating round', roundNumber, 'with players:', this.players);
        
        // Defensive check for players
        if (!this.players || this.players.length < 4) {
            console.error('❌ Not enough players to generate round:', this.players);
            return {
                roundNumber,
                matches: [],
                sittingOut: [],
                completed: false
            };
        }
        
        // Round 1: Random shuffle. After: Sort by standings
        let sorted = roundNumber === 1 
            ? this.shuffleArray([...this.players])
            : [...this.players].sort((a, b) => 
                (b.totalPoints || 0) - (a.totalPoints || 0) || (a.matchesPlayed || 0) - (b.matchesPlayed || 0)
            );
        
        console.log('📋 Sorted players:', sorted);
        
        const matches = [];
        const courts = Math.floor(sorted.length / 4);
        
        for (let c = 0; c < courts; c++) {
            const base = c * 4;
            // Mexicano pairing: 1&3 vs 2&4
            const team1 = [sorted[base], sorted[base + 2]];
            const team2 = [sorted[base + 1], sorted[base + 3]];
            
            // Skip if any player is undefined
            if (!team1[0] || !team1[1] || !team2[0] || !team2[1]) {
                console.error('❌ Missing player in pairing:', { team1, team2 });
                continue;
            }
            
            matches.push({
                id: this.generateId(),
                court: c + 1,
                team1: team1.map(p => p.id),
                team1Names: team1.map(p => p.name || 'Unknown'),
                team1Indices: team1.map(p => this.players.findIndex(x => x.id === p.id)),
                team2: team2.map(p => p.id),
                team2Names: team2.map(p => p.name || 'Unknown'),
                team2Indices: team2.map(p => this.players.findIndex(x => x.id === p.id)),
                score1: null,
                score2: null,
                completed: false
            });
        }
        
        // Players sitting out this round
        const sittingOut = sorted.slice(courts * 4).map(p => ({
            id: p.id,
            name: p.name || 'Unknown',
            index: this.players.findIndex(x => x.id === p.id)
        }));
        
        console.log('✅ Generated round with', matches.length, 'matches');
        
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
        let sorted = roundNumber === 1
            ? this.shuffleArray([...this.teams])
            : [...this.teams].sort((a, b) =>
                b.totalPoints - a.totalPoints || a.matchesPlayed - b.matchesPlayed
            );
        
        const matches = [];
        const numMatches = Math.floor(sorted.length / 2);
        
        for (let i = 0; i < numMatches; i++) {
            const t1 = sorted[i * 2];
            const t2 = sorted[i * 2 + 1];
            
            matches.push({
                id: this.generateId(),
                court: i + 1,
                team1: t1.id,
                team1Name: t1.teamName,
                team1Players: [t1.player1, t1.player2],
                team1Index: this.teams.findIndex(x => x.id === t1.id),
                team2: t2.id,
                team2Name: t2.teamName,
                team2Players: [t2.player1, t2.player2],
                team2Index: this.teams.findIndex(x => x.id === t2.id),
                score1: null,
                score2: null,
                completed: false
            });
        }
        
        // Team sitting out (odd number of teams)
        const sittingOut = sorted.length % 2 !== 0 ? [{
            id: sorted[sorted.length - 1].id,
            name: sorted[sorted.length - 1].teamName,
            index: this.teams.findIndex(x => x.id === sorted[sorted.length - 1].id)
        }] : [];
        
        return {
            roundNumber,
            matches,
            sittingOut,
            completed: false
        };
    }
    
    /**
     * Update points after a match is completed
     */
    updatePoints(match, score1, score2) {
        console.log('📊 Updating points:', { score1, score2, team1: match.team1, team2: match.team2 });
        
        // Normalize team arrays in case they came from Firebase as objects
        const team1Ids = Array.isArray(match.team1) ? match.team1 : Object.values(match.team1 || {});
        const team2Ids = Array.isArray(match.team2) ? match.team2 : Object.values(match.team2 || {});
        
        if (this.mode === 'individual') {
            team1Ids.forEach(id => {
                const player = this.players.find(p => p.id === id);
                if (player) {
                    player.totalPoints = (player.totalPoints || 0) + score1;
                    player.matchesPlayed = (player.matchesPlayed || 0) + 1;
                    console.log(`  ✅ ${player.name}: +${score1} pts = ${player.totalPoints} total`);
                } else {
                    console.error(`  ❌ Player not found: ${id}`);
                }
            });
            team2Ids.forEach(id => {
                const player = this.players.find(p => p.id === id);
                if (player) {
                    player.totalPoints = (player.totalPoints || 0) + score2;
                    player.matchesPlayed = (player.matchesPlayed || 0) + 1;
                    console.log(`  ✅ ${player.name}: +${score2} pts = ${player.totalPoints} total`);
                } else {
                    console.error(`  ❌ Player not found: ${id}`);
                }
            });
        } else {
            const t1 = this.teams.find(t => t.id === match.team1);
            const t2 = this.teams.find(t => t.id === match.team2);
            
            if (t1) {
                t1.totalPoints = (t1.totalPoints || 0) + score1;
                t1.matchesPlayed = (t1.matchesPlayed || 0) + 1;
            }
            if (t2) {
                t2.totalPoints = (t2.totalPoints || 0) + score2;
                t2.matchesPlayed = (t2.matchesPlayed || 0) + 1;
            }
        }
    }
    
    /**
     * Revert points (for editing completed matches)
     */
    revertPoints(match) {
        if (this.mode === 'individual') {
            match.team1.forEach(id => {
                const player = this.players.find(p => p.id === id);
                if (player) {
                    player.totalPoints -= match.score1;
                    player.matchesPlayed--;
                }
            });
            match.team2.forEach(id => {
                const player = this.players.find(p => p.id === id);
                if (player) {
                    player.totalPoints -= match.score2;
                    player.matchesPlayed--;
                }
            });
        } else {
            const t1 = this.teams.find(t => t.id === match.team1);
            const t2 = this.teams.find(t => t.id === match.team2);
            
            if (t1) {
                t1.totalPoints -= match.score1;
                t1.matchesPlayed--;
            }
            if (t2) {
                t2.totalPoints -= match.score2;
                t2.matchesPlayed--;
            }
        }
    }
    
    /**
     * Get sorted standings
     */
    getStandings() {
        const items = this.mode === 'individual' 
            ? [...this.players] 
            : [...this.teams];
        
        return items.sort((a, b) => b.totalPoints - a.totalPoints);
    }
    
    // Utility methods
    generateId() {
        return Math.random().toString(36).substring(2, 9);
    }
    
    shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
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
    
    save(tournament) {
        const all = this.getAll().filter(t => t.id !== tournament.id);
        all.unshift(tournament);
        if (all.length > CONFIG.MAX_STORED_TOURNAMENTS) {
            all.pop();
        }
        localStorage.setItem(this.KEY, JSON.stringify(all));
    },
    
    remove(tournamentId) {
        const tournaments = this.getAll().filter(t => t.id !== tournamentId);
        localStorage.setItem(this.KEY, JSON.stringify(tournaments));
    }
};

console.log('✅ Mexicano State loaded');
