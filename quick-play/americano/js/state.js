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
        
        // Polling for viewers (optimization: viewers don't need real-time)
        this.pollingInterval = null;
        this.VIEWER_POLL_INTERVAL = 10000; // 10 seconds for viewers
        
        // Debounce for score updates (optimization: batch writes)
        this.pendingScoreUpdates = {};      // { "f_index": {team1, team2} }
        this.scoreDebounceTimer = null;
        this.SCORE_DEBOUNCE_MS = 500;       // Wait 500ms after last change
        
        // Idle detection (optimization: disconnect inactive users)
        this.idleTimer = null;
        this.IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes
        this.isDisconnected = false;
        this.activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
        this.boundResetIdle = null;
        this.lastIdleReset = 0;
        
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
        
        // Round ordering (custom order for rounds)
        // null = use default order, array = custom order [0, 2, 1, 3, ...] (indices)
        this.roundOrder = null;
        
        // Registered players (Phase 4 - Browse & Join)
        this.registeredPlayers = {};
        
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
        
        // ====== GROUPS + KNOCKOUT MODE ======
        this.formatType = 'classic';  // 'classic' or 'groups'
        this.groups = null;           // { A: [1,2,3,4,5,6], B: [...], C: [...], D: [...] }
        this.groupScores = {};        // Scores for group stage matches (keyed by group_fixtureIdx)
        this.knockoutScores = {};     // Scores for knockout matches (keyed by round_match: 'qf_0', 'sf_1', 'final')
        this.knockoutBracket = null;  // Generated knockout bracket after groups complete
        this.selectedGroup = 'all';   // For group tab filtering: 'all', 'A', 'B', 'C', 'D'
        this.selectedStage = 'groups'; // 'groups' or 'knockout'
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
     * Process STATIC data from Firebase (loaded once)
     */
    processStaticData(data) {
        if (!data) {
            console.log('⚠️ Tournament not found in Firebase');
            return false;
        }
        
        // Meta data
        this.tournamentName = data.meta?.name || '';
        
        // Format type - classic or groups
        this.formatType = data.formatType || 'classic';
        
        // Player config (static)
        this.playerCount = data.playerCount || CONFIG.DEFAULT_PLAYERS;
        if (data.playerNames) {
            this.playerNames = Array.isArray(data.playerNames) 
                ? data.playerNames 
                : Object.values(data.playerNames);
        } else {
            this.playerNames = getDefaultPlayerNames(this.playerCount);
        }
        
        // Court config (static)
        this.courtCount = data.courtCount || CONFIG.DEFAULT_COURTS;
        if (data.courtNames) {
            this.courtNames = Array.isArray(data.courtNames)
                ? data.courtNames
                : Object.values(data.courtNames);
        } else {
            this.courtNames = getDefaultCourtNames(this.courtCount);
        }
        
        // Scoring config (static)
        this.fixedPoints = data.fixedPoints !== undefined ? data.fixedPoints : CONFIG.DEFAULT_FIXED_POINTS;
        this.totalPoints = data.totalPoints || CONFIG.DEFAULT_TOTAL_POINTS;
        
        // Status (static)
        this.tournamentStarted = data.tournamentStarted || false;
        
        // Registered players (Phase 4)
        this.registeredPlayers = data.registeredPlayers || {};
        
        // Round ordering (custom order for rounds)
        this.roundOrder = data.roundOrder || null;
        
        // Groups mode specific data
        if (this.formatType === 'groups') {
            this.groups = data.groups || null;
            this.groupScores = data.groupScores || {};
            this.knockoutScores = data.knockoutScores || {};
            this.knockoutBracket = data.knockoutBracket || null;
        }
        
        // Also load initial scores (for classic mode)
        if (data.scores) {
            this.scores = {};
            Object.entries(data.scores).forEach(([key, value]) => {
                const newKey = this._migrateScoreKey(key, data.courtCount || CONFIG.DEFAULT_COURTS);
                this.scores[newKey] = {
                    team1: (value?.team1 != null && value?.team1 !== -1) ? value.team1 : null,
                    team2: (value?.team2 != null && value?.team2 !== -1) ? value.team2 : null
                };
            });
        } else {
            this.scores = {};
        }
        
        // Invalidate cache
        this._cachedTimeslots = null;
        
        console.log('📦 Static data loaded, format:', this.formatType);
        return true;
    }
    
    /**
     * Process DYNAMIC data from Firebase (scores - changes frequently)
     */
    processDynamicData(scoresData) {
        // Build new scores object
        const newScores = {};
        if (scoresData) {
            Object.entries(scoresData).forEach(([key, value]) => {
                const newKey = this._migrateScoreKey(key, this.courtCount);
                newScores[newKey] = {
                    team1: (value?.team1 != null && value?.team1 !== -1) ? value.team1 : null,
                    team2: (value?.team2 != null && value?.team2 !== -1) ? value.team2 : null
                };
            });
        }
        
        // Check if scores actually changed
        const oldScoresStr = JSON.stringify(this.scores);
        const newScoresStr = JSON.stringify(newScores);
        
        if (oldScoresStr === newScoresStr) {
            // No change, skip render
            return;
        }
        
        this.scores = newScores;
        
        // Invalidate cache
        this._cachedTimeslots = null;
        
        render();
    }
    
    /**
     * Load tournament data from Firebase and subscribe to changes
     */
    loadFromFirebase() {
        if (!this.tournamentId) return;
        
        this.firebaseRef = database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`);
        
        // STEP 1: Load static data once
        this.firebaseRef.once('value').then((snapshot) => {
            const data = snapshot.val();
            if (!this.processStaticData(data)) {
                this.isInitialized = true;
                render();
                return;
            }
            
            this.isInitialized = true;
            render();
            
            // STEP 2: Set up listeners for dynamic data only (scores)
            if (this.isOrganiser) {
                console.log('👑 Organiser mode: Real-time sync for scores');
                this.setupScoreListeners();
            } else {
                console.log('👁️ Viewer mode: Polling scores (every ' + (this.VIEWER_POLL_INTERVAL/1000) + 's)');
                this.setupScorePolling();
            }
            
            // STEP 3: Start idle detection
            this.startIdleDetection();
        });
    }
    
    /**
     * Set up real-time listener for scores only (organiser mode)
     */
    setupScoreListeners() {
        database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}/scores`).on('value', (snapshot) => {
            this.processDynamicData(snapshot.val());
        });
    }
    
    /**
     * Set up polling for scores only (viewer mode)
     */
    setupScorePolling() {
        this.pollingInterval = setInterval(() => {
            database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}/scores`).once('value').then((snapshot) => {
                this.processDynamicData(snapshot.val());
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
            
            this.setupScoreListeners();
        }
    }
    
    /**
     * Stop listening to Firebase changes
     */
    stopListening() {
        // Clear real-time listeners
        database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}/scores`).off();
        if (this.firebaseRef && this.unsubscribe) {
            this.firebaseRef.off('value', this.unsubscribe);
        }
        
        // Clear polling interval if active
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('🛑 Stopped polling');
        }
        
        // Stop idle detection (clean up event listeners)
        this.stopIdleDetection();
    }
    
    /**
     * Reload static data (called when organiser updates settings)
     */
    reloadStaticData() {
        this.firebaseRef.once('value').then((snapshot) => {
            this.processStaticData(snapshot.val());
            render();
        });
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
        this.flushScoresImmediately();
        this.stopListening();
        this.showReconnectBanner();
    }
    
    reconnect() {
        if (!this.isDisconnected) return;
        console.log('🔄 User active - reconnecting...');
        this.isDisconnected = false;
        this.hideReconnectBanner();
        
        this.firebaseRef.once('value').then((snapshot) => {
            this.processStaticData(snapshot.val());
            if (this.isOrganiser) {
                this.setupScoreListeners();
            } else {
                this.setupScorePolling();
            }
            render();
            console.log('✅ Reconnected successfully');
        });
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
            tournamentStarted: this.tournamentStarted,
            registeredPlayers: this.registeredPlayers || {},
            roundOrder: this.roundOrder || null
        });
    }
    
    /**
     * Save a single match score to Firebase using fixture index - DEBOUNCED
     */
    saveMatchScoreToFirebase(fixtureIndex, team1Score, team2Score) {
        if (!this.tournamentId) return;
        
        // Queue the update
        const key = `f_${fixtureIndex}`;
        this.pendingScoreUpdates[key] = { 
            team1: team1Score === null ? -1 : team1Score, 
            team2: team2Score === null ? -1 : team2Score 
        };
        
        // Debounce the actual save
        this.debouncedScoreSave();
    }
    
    /**
     * Debounced save - batches all pending score updates
     */
    debouncedScoreSave() {
        if (this.scoreDebounceTimer) {
            clearTimeout(this.scoreDebounceTimer);
        }
        
        this.scoreDebounceTimer = setTimeout(() => {
            this.flushPendingScores();
        }, this.SCORE_DEBOUNCE_MS);
    }
    
    /**
     * Flush all pending score updates to Firebase in a single batch
     */
    flushPendingScores() {
        if (!this.tournamentId || Object.keys(this.pendingScoreUpdates).length === 0) {
            this.scoreDebounceTimer = null;
            return;
        }
        
        const basePath = `${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`;
        const updates = {};
        
        for (const key in this.pendingScoreUpdates) {
            updates[`${basePath}/scores/${key}`] = this.pendingScoreUpdates[key];
        }
        
        // meta/updatedAt write removed — score writes are open to all users but meta writes
        // require organizer auth per Firebase Security Rules. See firebase-rules-production.json

        database.ref().update(updates)
            .then(() => {
                console.log(`✅ Saved ${Object.keys(this.pendingScoreUpdates).length} scores`);
            })
            .catch(err => {
                console.error('❌ Error saving scores:', err);
            });
        
        this.pendingScoreUpdates = {};
        this.scoreDebounceTimer = null;
    }
    
    /**
     * Force immediate save (e.g., before page unload)
     */
    flushScoresImmediately() {
        if (this.scoreDebounceTimer) {
            clearTimeout(this.scoreDebounceTimer);
            this.scoreDebounceTimer = null;
        }
        this.flushPendingScores();
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
        
        // Auto-calculate other team's score if fixed points mode
        if (this.fixedPoints && numValue !== null) {
            if (team === 'team1') {
                this.scores[key].team2 = this.totalPoints - numValue;
            } else if (team === 'team2') {
                this.scores[key].team1 = this.totalPoints - numValue;
            }
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
        const score = this.scores[key];
        if (!score) {
            return { team1: null, team2: null };
        }
        // Ensure undefined values become null
        return {
            team1: score.team1 != null ? score.team1 : null,
            team2: score.team2 != null ? score.team2 : null
        };
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
     * Respects custom roundOrder if set.
     */
    getRounds() {
        // Get the base timeslots (unordered)
        const baseTimeslots = this._getBaseTimeslots();
        
        // Apply custom order if set
        if (this.roundOrder && Array.isArray(this.roundOrder)) {
            const orderedTimeslots = [];
            this.roundOrder.forEach((originalIndex, newIndex) => {
                if (baseTimeslots[originalIndex]) {
                    const slot = { ...baseTimeslots[originalIndex] };
                    slot.displayIndex = newIndex;  // New display position
                    slot.originalIndex = originalIndex;  // Original position for score lookup
                    orderedTimeslots.push(slot);
                }
            });
            return orderedTimeslots;
        }
        
        return baseTimeslots;
    }
    
    /**
     * Get base timeslots without custom ordering (for settings UI)
     */
    _getBaseTimeslots() {
        // Return cached result if valid
        if (this._cachedTimeslots && 
            this._cachedCourtCount === this.courtCount &&
            this._cachedPlayerCount === this.playerCount) {
            return this._cachedTimeslots;
        }
        
        const fixtures = getFixtures(this.playerCount, this.courtCount);
        const timeslots = [];
        const usedFixtureIndices = new Set();
        
        // Keep grouping fixtures into timeslots until all are used
        while (usedFixtureIndices.size < fixtures.length) {
            const timeslot = {
                matches: [],
                resting: new Set(Array.from({length: this.playerCount}, (_, i) => i + 1)),
                index: timeslots.length,
                originalIndex: timeslots.length
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
     * Move a round to a new position
     * @param {number} fromIndex - Current display position
     * @param {number} toIndex - Target display position
     */
    moveRound(fromIndex, toIndex) {
        if (!this.canEdit()) return;
        
        const baseTimeslots = this._getBaseTimeslots();
        const totalRounds = baseTimeslots.length;
        
        // Initialize roundOrder if not set
        if (!this.roundOrder) {
            this.roundOrder = Array.from({ length: totalRounds }, (_, i) => i);
        }
        
        // Validate indices
        if (fromIndex < 0 || fromIndex >= totalRounds || 
            toIndex < 0 || toIndex >= totalRounds) {
            return;
        }
        
        // Move the round
        const [moved] = this.roundOrder.splice(fromIndex, 1);
        this.roundOrder.splice(toIndex, 0, moved);
        
        // Save to Firebase
        this.saveToFirebase();
    }
    
    /**
     * Reset round order to default
     */
    resetRoundOrder() {
        if (!this.canEdit()) return;
        this.roundOrder = null;
        this._cachedTimeslots = null;
        this.saveToFirebase();
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
        
        const fixtures = getFixtures(this.playerCount, this.courtCount);
        
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
        const fixtures = getFixtures(this.playerCount, this.courtCount);
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
        return getFixtures(this.playerCount, this.courtCount).length;
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
        if (this.formatType === 'groups') {
            return {
                min: CONFIG.GROUPS_MODE.MIN_GAMES,
                max: CONFIG.GROUPS_MODE.MAX_GAMES
            };
        }
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
        if (this.formatType === 'groups') {
            this.groupScores = {};
            this.knockoutScores = {};
            this.knockoutBracket = null;
        }
        this.saveToFirebase();
    }
    
    // ====== GROUPS + KNOCKOUT MODE METHODS ======
    
    /**
     * Check if tournament is in groups mode
     */
    isGroupsMode() {
        return this.formatType === 'groups';
    }
    
    /**
     * Get group fixtures for a specific group (A, B, C, D)
     * Each player partners with every other player in their group once
     */
    getGroupFixtures(groupLetter) {
        if (!this.groups || !this.groups[groupLetter]) return [];
        
        const players = this.groups[groupLetter];
        const fixtures = [];
        
        // Generate all unique pairings where each player partners with everyone else
        // For 6 players, this creates 15 matches (each player plays 5 games)
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                // Create partner pair
                const team1 = [players[i], players[j]];
                
                // Find opponents from remaining players
                const remaining = players.filter((_, idx) => idx !== i && idx !== j);
                
                // We need to create matches where this pair plays against other pairs
                // Since there are 4 remaining players, we create 2 opponent pairs
            }
        }
        
        // Alternative: Use pre-defined 6-player Americano fixtures adapted for groups
        // This ensures fair rotation where everyone partners with everyone
        const groupFixtures = this._generateGroupFixtures(players);
        return groupFixtures;
    }
    
    /**
     * Generate group fixtures for 6 players
     * Adapted from classic 6-player Americano: 15 matches, each player plays 5 games
     * (partnering with each other player exactly once)
     */
    _generateGroupFixtures(players) {
        // Standard 6-player Americano fixtures mapped to actual player numbers
        // Each match: [[player, player], [player, player]] with 2 resting
        const templateFixtures = [
            { teams: [[0,1],[2,3]], rest: [4,5] },
            { teams: [[4,5],[0,2]], rest: [1,3] },
            { teams: [[1,3],[0,5]], rest: [2,4] },
            { teams: [[2,5],[1,4]], rest: [0,3] },
            { teams: [[0,3],[2,4]], rest: [1,5] },
            { teams: [[1,5],[3,4]], rest: [0,2] },
            { teams: [[0,5],[1,2]], rest: [3,4] },
            { teams: [[3,5],[2,4]], rest: [0,1] },
            { teams: [[0,2],[1,3]], rest: [4,5] },
            { teams: [[0,4],[2,3]], rest: [1,5] },
            { teams: [[1,4],[3,5]], rest: [0,2] },
            { teams: [[0,1],[4,5]], rest: [2,3] }
        ];
        
        // Map template indices to actual player numbers
        return templateFixtures.map((fixture, idx) => ({
            teams: [
                [players[fixture.teams[0][0]], players[fixture.teams[0][1]]],
                [players[fixture.teams[1][0]], players[fixture.teams[1][1]]]
            ],
            rest: fixture.rest.map(r => players[r]),
            fixtureIndex: idx
        }));
    }
    
    /**
     * Get all group fixtures with group info
     */
    getAllGroupFixtures() {
        if (!this.groups) return [];
        
        const allFixtures = [];
        ['A', 'B', 'C', 'D'].forEach(groupLetter => {
            const fixtures = this._generateGroupFixtures(this.groups[groupLetter]);
            fixtures.forEach((fixture, idx) => {
                allFixtures.push({
                    ...fixture,
                    group: groupLetter,
                    groupFixtureIndex: idx,
                    key: `${groupLetter}_${idx}`
                });
            });
        });
        return allFixtures;
    }
    
    /**
     * Get group rounds (timeslots) - 4 groups playing simultaneously
     */
    getGroupRounds() {
        if (!this.groups) return [];
        
        const groupFixtures = {};
        ['A', 'B', 'C', 'D'].forEach(g => {
            groupFixtures[g] = this._generateGroupFixtures(this.groups[g]);
        });
        
        // Each group has 12 fixtures, 5 rounds (2-3 matches per round when run sequentially)
        // With 4 courts (1 per group), we can run 1 match from each group simultaneously
        const rounds = [];
        const maxFixtures = Math.max(...Object.values(groupFixtures).map(f => f.length));
        
        for (let i = 0; i < maxFixtures; i++) {
            const round = {
                roundNumber: i + 1,
                matches: []
            };
            
            ['A', 'B', 'C', 'D'].forEach(group => {
                if (groupFixtures[group][i]) {
                    round.matches.push({
                        ...groupFixtures[group][i],
                        group,
                        key: `${group}_${i}`
                    });
                }
            });
            
            if (round.matches.length > 0) {
                rounds.push(round);
            }
        }
        
        return rounds;
    }
    
    /**
     * Get score for a group match
     */
    getGroupScore(groupLetter, fixtureIndex) {
        const key = `${groupLetter}_${fixtureIndex}`;
        const score = this.groupScores[key];
        return {
            team1: score?.team1 ?? null,
            team2: score?.team2 ?? null
        };
    }
    
    /**
     * Set score for a group match
     */
    setGroupScore(groupLetter, fixtureIndex, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        const key = `${groupLetter}_${fixtureIndex}`;
        this.groupScores[key] = {
            team1: team1Score,
            team2: team2Score
        };
        
        this._saveGroupsToFirebase();
    }
    
    /**
     * Calculate standings for a specific group
     */
    calculateGroupStandings(groupLetter) {
        if (!this.groups || !this.groups[groupLetter]) return [];
        
        const players = this.groups[groupLetter];
        const playerStats = {};
        
        // Initialize stats for each player
        players.forEach(playerNum => {
            playerStats[playerNum] = {
                playerNum,
                name: this.playerNames[playerNum - 1] || `Player ${playerNum}`,
                totalPoints: 0,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                pointsFor: 0,
                pointsAgainst: 0
            };
        });
        
        // Process each fixture
        const fixtures = this._generateGroupFixtures(players);
        fixtures.forEach((fixture, idx) => {
            const score = this.getGroupScore(groupLetter, idx);
            
            if (score.team1 !== null && score.team2 !== null) {
                // Update team 1 players
                fixture.teams[0].forEach(playerNum => {
                    const stats = playerStats[playerNum];
                    stats.gamesPlayed++;
                    stats.totalPoints += score.team1;
                    stats.pointsFor += score.team1;
                    stats.pointsAgainst += score.team2;
                    
                    if (score.team1 > score.team2) stats.wins++;
                    else if (score.team1 < score.team2) stats.losses++;
                    else stats.draws++;
                });
                
                // Update team 2 players
                fixture.teams[1].forEach(playerNum => {
                    const stats = playerStats[playerNum];
                    stats.gamesPlayed++;
                    stats.totalPoints += score.team2;
                    stats.pointsFor += score.team2;
                    stats.pointsAgainst += score.team1;
                    
                    if (score.team2 > score.team1) stats.wins++;
                    else if (score.team2 < score.team1) stats.losses++;
                    else stats.draws++;
                });
            }
        });
        
        // Convert to array and sort by total points (then point diff as tiebreaker)
        return Object.values(playerStats).sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            const aDiff = a.pointsFor - a.pointsAgainst;
            const bDiff = b.pointsFor - b.pointsAgainst;
            return bDiff - aDiff;
        });
    }
    
    /**
     * Check if group stage is complete
     */
    isGroupStageComplete() {
        if (!this.groups) return false;
        
        let allComplete = true;
        ['A', 'B', 'C', 'D'].forEach(group => {
            const fixtures = this._generateGroupFixtures(this.groups[group]);
            fixtures.forEach((_, idx) => {
                const score = this.getGroupScore(group, idx);
                if (score.team1 === null || score.team2 === null) {
                    allComplete = false;
                }
            });
        });
        
        return allComplete;
    }
    
    /**
     * Generate knockout bracket from group standings
     * 1st place players pair together, 2nd with 2nd, etc.
     */
    generateKnockoutBracket() {
        if (!this.isGroupStageComplete()) return null;
        
        const standings = {};
        ['A', 'B', 'C', 'D'].forEach(group => {
            standings[group] = this.calculateGroupStandings(group);
        });
        
        // Create quarterfinal matchups
        // Position 1 from each group plays QF, winners go to SF, then Final
        // Position 2, 3, etc. also have their own brackets
        
        const bracket = {
            quarterfinals: [],
            semifinals: [],
            final: null
        };
        
        // QF1: A1+B1 vs C1+D1 (1st place from each group)
        // QF2: A2+B2 vs C2+D2 (2nd place)
        // QF3: A3+B3 vs C3+D3 (3rd place)
        // QF4: A4+B4 vs C4+D4 (4th place)
        
        for (let pos = 0; pos < 4; pos++) {
            const team1 = [
                standings['A'][pos]?.playerNum,
                standings['B'][pos]?.playerNum
            ].filter(Boolean);
            const team2 = [
                standings['C'][pos]?.playerNum,
                standings['D'][pos]?.playerNum
            ].filter(Boolean);
            
            if (team1.length === 2 && team2.length === 2) {
                bracket.quarterfinals.push({
                    position: pos + 1,
                    team1,
                    team2,
                    label: `QF ${pos + 1} (Position ${pos + 1})`,
                    key: `qf_${pos}`
                });
            }
        }
        
        this.knockoutBracket = bracket;
        this._saveGroupsToFirebase();
        
        return bracket;
    }
    
    /**
     * Get knockout match score
     */
    getKnockoutScore(matchKey) {
        const score = this.knockoutScores[matchKey];
        return {
            team1: score?.team1 ?? null,
            team2: score?.team2 ?? null
        };
    }
    
    /**
     * Set knockout match score and advance winners
     */
    setKnockoutScore(matchKey, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        this.knockoutScores[matchKey] = {
            team1: team1Score,
            team2: team2Score
        };
        
        // Check if we need to advance to next round
        this._advanceKnockoutWinners();
        this._saveGroupsToFirebase();
    }
    
    /**
     * Advance knockout winners to next round
     */
    _advanceKnockoutWinners() {
        if (!this.knockoutBracket) return;
        
        // Check QF completion and create SF matchups
        const qfResults = this.knockoutBracket.quarterfinals.map(qf => {
            const score = this.getKnockoutScore(qf.key);
            if (score.team1 !== null && score.team2 !== null) {
                return {
                    ...qf,
                    winner: score.team1 > score.team2 ? qf.team1 : qf.team2,
                    loser: score.team1 > score.team2 ? qf.team2 : qf.team1
                };
            }
            return null;
        });
        
        // Create semifinals if QF1 and QF2 are complete
        if (qfResults[0] && qfResults[1] && this.knockoutBracket.semifinals.length < 2) {
            // SF1: QF1 winner vs QF2 winner
            this.knockoutBracket.semifinals = [{
                team1: qfResults[0].winner,
                team2: qfResults[1].winner,
                label: 'SF 1 (Positions 1-2)',
                key: 'sf_0'
            }];
        }
        
        // Add SF2 if QF3 and QF4 are complete
        if (qfResults[2] && qfResults[3] && this.knockoutBracket.semifinals.length < 2) {
            this.knockoutBracket.semifinals.push({
                team1: qfResults[2].winner,
                team2: qfResults[3].winner,
                label: 'SF 2 (Positions 3-4)',
                key: 'sf_1'
            });
        }
        
        // Create final if both SF are complete
        const sfResults = this.knockoutBracket.semifinals.map(sf => {
            const score = this.getKnockoutScore(sf.key);
            if (score.team1 !== null && score.team2 !== null) {
                return {
                    ...sf,
                    winner: score.team1 > score.team2 ? sf.team1 : sf.team2
                };
            }
            return null;
        });
        
        if (sfResults[0] && !this.knockoutBracket.final) {
            this.knockoutBracket.final = {
                team1: sfResults[0].winner,
                team2: null, // Will be set when SF2 completes
                label: 'Final',
                key: 'final'
            };
        }
        
        if (sfResults[1] && this.knockoutBracket.final && !this.knockoutBracket.final.team2) {
            this.knockoutBracket.final.team2 = sfResults[1].winner;
        }
    }
    
    /**
     * Save groups mode data to Firebase
     */
    _saveGroupsToFirebase() {
        if (!this.tournamentId || !this.canEdit()) return;
        
        const updates = {
            groupScores: this.groupScores,
            knockoutScores: this.knockoutScores,
            knockoutBracket: this.knockoutBracket
        };
        
        database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).update(updates);
    }
    
    /**
     * Count completed group matches
     */
    countGroupMatchesComplete() {
        if (!this.groups) return 0;
        
        let count = 0;
        ['A', 'B', 'C', 'D'].forEach(group => {
            const fixtures = this._generateGroupFixtures(this.groups[group]);
            fixtures.forEach((_, idx) => {
                const score = this.getGroupScore(group, idx);
                if (score.team1 !== null && score.team2 !== null) {
                    count++;
                }
            });
        });
        return count;
    }
    
    /**
     * Get total group matches
     */
    getTotalGroupMatches() {
        if (!this.groups) return 0;
        return 12 * 4; // 12 fixtures per group × 4 groups = 48 total
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
