// ===== STATE MANAGEMENT CLASS =====

class TournamentState {
    constructor(tournamentId = null) {
        this.tournamentId = tournamentId;
        this.currentTab = 'fixtures';
        this.settingsSubTab = 'players';
        this.filterRound = 'all';
        this.filterPlayer = 'all';
        this.isInitialized = false;
        this.isSaving = false; // Flag to prevent re-render during save
        
        // Organiser status (set by verifying key against Firebase)
        this.isOrganiser = false;
        this.organiserKey = null;
        
        // Polling for viewers (optimization: viewers don't need real-time)
        this.pollingInterval = null;
        this.VIEWER_POLL_INTERVAL = 10000; // 10 seconds for viewers
        
        // Debounce for score updates (optimization: batch writes)
        this.pendingScoreUpdates = {};      // { "round-match": {team1Score, team2Score} }
        this.pendingKnockoutUpdates = {};   // { "matchId": {team1Score, team2Score} }
        this.scoreDebounceTimer = null;
        this.SCORE_DEBOUNCE_MS = 500;       // Wait 500ms after last change
        
        // Idle detection (optimization: disconnect inactive users)
        this.idleTimer = null;
        this.IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes
        this.isDisconnected = false;
        this.activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
        this.boundResetIdle = null;  // Will hold bound function reference
        this.lastIdleReset = 0;  // Throttle: track last reset time
        
        // Default data (will be overridden by loaded JSON)
        this.defaultPlayers = [];
        this.defaultFixtures = {};
        this.defaultMatchNames = {};
        this.defaultKnockoutNames = {};
        
        // Tournament metadata
        this.tournamentName = '';
        this.createdAt = null;
        
        // Current state
        this.playerNames = [];
        this.skillRatings = {};
        this.matchScores = {};
        this.fixtures = {};
        this.matchNames = {};
        this.knockoutNames = {};
        this.knockoutScores = {};
        this.knockoutFormat = 'quarter'; // 'final', 'semi', or 'quarter'
        this.fixtureMaxScore = CONFIG.FIXTURE_MAX_SCORE;
        this.knockoutMaxScore = CONFIG.KNOCKOUT_MAX_SCORE;
        this.semiMaxScore = CONFIG.SEMI_MAX_SCORE;
        this.finalMaxScore = CONFIG.FINAL_MAX_SCORE;
        this.savedVersions = [];
        this.showFairnessTabs = true;
        
        // Registered players (Phase 4 - Browse & Join)
        this.registeredPlayers = {};
        this.playerCount = 24;
        
        // Tournament status (Phase 5)
        this.tournamentStatus = 'open'; // 'open', 'in-progress', 'completed'
    }

    // Get Firebase base path for this tournament
    getBasePath() {
        if (!this.tournamentId) {
            console.error('No tournament ID set!');
            return 'tournament'; // Fallback for legacy
        }
        return `tournaments/${this.tournamentId}`;
    }

    // Check if user can edit (is organiser)
    canEdit() {
        return this.isOrganiser;
    }

    // Verify organiser key against Firebase
    async verifyOrganiserKey(key) {
        if (!this.tournamentId || !key) {
            this.isOrganiser = false;
            return false;
        }
        
        try {
            const snapshot = await database.ref(`${this.getBasePath()}/meta/organiserKey`).once('value');
            const storedKey = snapshot.val();
            this.isOrganiser = (storedKey === key);
            this.organiserKey = key;
            
            if (this.isOrganiser) {
                console.log('✅ Organiser access granted');
                // Upgrade from polling to real-time sync
                this.upgradeToRealtime();
            } else {
                console.log('❌ Invalid organiser key');
            }
            
            return this.isOrganiser;
        } catch (error) {
            console.error('Error verifying organiser key:', error);
            this.isOrganiser = false;
            return false;
        }
    }

    // ===== INITIALIZATION =====
    
    async loadDefaults() {
        try {
            // Load players
            const playersResponse = await fetch(CONFIG.DATA_PATHS.PLAYERS);
            const playersData = await playersResponse.json();
            this.defaultPlayers = playersData.players;
            
            // Load fixtures
            const fixturesResponse = await fetch(CONFIG.DATA_PATHS.FIXTURES);
            this.defaultFixtures = await fixturesResponse.json();
            
            // Load match names
            const matchNamesResponse = await fetch(CONFIG.DATA_PATHS.MATCH_NAMES);
            const matchNamesData = await matchNamesResponse.json();
            this.defaultMatchNames = matchNamesData.fixtureMatches;
            this.defaultKnockoutNames = matchNamesData.knockoutMatches;
            
            console.log('✅ Default data loaded successfully from JSON files');
        } catch (error) {
            console.error('❌ Error loading default data:', error);
            console.log('💡 Make sure you are running from a web server (not file://)');
        }
    }

    initializeDefaults() {
        // Players
        this.playerNames = this.defaultPlayers.map(p => p.name);
        this.skillRatings = {};
        this.defaultPlayers.forEach(p => {
            this.skillRatings[p.id] = p.rating;
        });
        
        // Fixtures
        this.fixtures = JSON.parse(JSON.stringify(this.defaultFixtures));
        
        // Match names
        this.matchNames = {...this.defaultMatchNames};
        this.knockoutNames = {...this.defaultKnockoutNames};
        
        // Scores
        this.matchScores = {};
        this.knockoutScores = {};
        
        // Knockout settings
        this.fixtureMaxScore = CONFIG.FIXTURE_MAX_SCORE;
        this.knockoutMaxScore = CONFIG.KNOCKOUT_MAX_SCORE;
        this.semiMaxScore = CONFIG.SEMI_MAX_SCORE;
        this.finalMaxScore = CONFIG.FINAL_MAX_SCORE;
        
        this.savedVersions = [];
        this.showFairnessTabs = true;
    }

    // ===== FIREBASE OPERATIONS =====

    // Process STATIC data from Firebase (loaded once)
    processStaticData(data) {
        if (!data) {
            console.log('⚠️ Tournament not found in Firebase');
            return false;
        }
        
        // Load metadata
        if (data.meta) {
            this.tournamentName = data.meta.name || '';
            this.createdAt = data.meta.createdAt || null;
            
            // Load player count and update config
            const playerCount = data.meta.playerCount || 24;
            if (CONFIG.PLAYER_CONFIGS[playerCount]) {
                setPlayerCountConfig(playerCount);
            }
        }
        
        // Static data - rarely changes
        this.playerNames = data.playerNames || this.playerNames;
        this.skillRatings = data.skillRatings || this.skillRatings;
        this.fixtures = data.fixtures || this.fixtures;
        this.matchNames = data.matchNames || this.matchNames;
        this.knockoutNames = data.knockoutNames || this.knockoutNames;
        this.knockoutFormat = data.knockoutFormat || 'quarter';
        this.fixtureMaxScore = data.fixtureMaxScore || CONFIG.FIXTURE_MAX_SCORE;
        this.knockoutMaxScore = data.knockoutMaxScore || CONFIG.KNOCKOUT_MAX_SCORE;
        this.semiMaxScore = data.semiMaxScore || CONFIG.SEMI_MAX_SCORE;
        this.finalMaxScore = data.finalMaxScore || CONFIG.FINAL_MAX_SCORE;
        this.savedVersions = data.savedVersions || [];
        this.showFairnessTabs = data.showFairnessTabs !== undefined ? data.showFairnessTabs : true;
        
        // Registered players (Phase 4)
        this.registeredPlayers = data.registeredPlayers || {};
        this.playerCount = data.meta?.playerCount || 24;
        
        // Tournament status (Phase 5)
        this.tournamentStatus = data.meta?.status || 'open';
        
        // Also load initial scores
        this.matchScores = data.matchScores || {};
        this.knockoutScores = data.knockoutScores || {};
        
        console.log('📦 Static data loaded');
        return true;
    }
    
    // Process DYNAMIC data from Firebase (scores - changes frequently)
    processDynamicData(matchScores, knockoutScores) {
        // Skip updating local state if we're in the middle of saving
        if (this.isSaving) {
            console.log('⏳ Skipping Firebase update - save in progress');
            return;
        }
        
        this.matchScores = matchScores || {};
        this.knockoutScores = knockoutScores || {};
        
        render();
    }

    loadFromFirebase() {
        const basePath = this.getBasePath();
        
        // Monitor Firebase connection status
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('✅ Connected to Firebase');
            } else {
                console.log('❌ Disconnected from Firebase');
            }
        });

        // STEP 1: Load static data once (meta, players, fixtures, settings)
        database.ref(basePath).once('value').then((snapshot) => {
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
                // ORGANISER: Real-time listeners for scores only
                console.log('👑 Organiser mode: Real-time sync for scores');
                this.setupScoreListeners(basePath);
            } else {
                // VIEWER: Polling for scores only
                console.log('👁️ Viewer mode: Polling scores (every ' + (this.VIEWER_POLL_INTERVAL/1000) + 's)');
                this.setupScorePolling(basePath);
            }
            
            // STEP 3: Start idle detection to disconnect inactive users
            this.startIdleDetection();
        });
    }
    
    // Set up real-time listeners for scores only (organiser mode)
    setupScoreListeners(basePath) {
        // Listen to match scores
        database.ref(`${basePath}/matchScores`).on('value', (snapshot) => {
            if (!this.isSaving) {
                this.matchScores = snapshot.val() || {};
                render();
            }
        });
        
        // Listen to knockout scores
        database.ref(`${basePath}/knockoutScores`).on('value', (snapshot) => {
            if (!this.isSaving) {
                this.knockoutScores = snapshot.val() || {};
                render();
            }
        });
    }
    
    // Set up polling for scores only (viewer mode)
    setupScorePolling(basePath) {
        this.pollingInterval = setInterval(() => {
            // Only fetch scores, not entire tournament
            Promise.all([
                database.ref(`${basePath}/matchScores`).once('value'),
                database.ref(`${basePath}/knockoutScores`).once('value')
            ]).then(([matchSnapshot, knockoutSnapshot]) => {
                this.processDynamicData(matchSnapshot.val(), knockoutSnapshot.val());
            });
        }, this.VIEWER_POLL_INTERVAL);
    }

    // Upgrade from polling to real-time (when viewer becomes organiser)
    upgradeToRealtime() {
        if (this.pollingInterval) {
            console.log('⬆️ Upgrading to real-time sync');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            
            // Switch to real-time listeners for scores
            const basePath = this.getBasePath();
            this.setupScoreListeners(basePath);
        }
    }

    // Stop listening to Firebase (when leaving tournament)
    stopListening() {
        const basePath = this.getBasePath();
        
        // Clear real-time listeners
        database.ref(`${basePath}/matchScores`).off();
        database.ref(`${basePath}/knockoutScores`).off();
        database.ref(basePath).off();
        database.ref('.info/connected').off();
        
        // Clear polling interval if active
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('🛑 Stopped polling');
        }
    }
    
    // Reload static data (called when organiser updates settings)
    reloadStaticData() {
        const basePath = this.getBasePath();
        database.ref(basePath).once('value').then((snapshot) => {
            this.processStaticData(snapshot.val());
            render();
        });
    }
    
    // ===== IDLE DETECTION =====
    
    // Start monitoring for idle state
    startIdleDetection() {
        // Create bound function reference so we can remove it later
        this.boundResetIdle = this.resetIdleTimer.bind(this);
        
        // Add event listeners for user activity
        this.activityEvents.forEach(event => {
            document.addEventListener(event, this.boundResetIdle, { passive: true });
        });
        
        // Start the idle timer
        this.resetIdleTimer();
        console.log('👁️ Idle detection started (timeout: ' + (this.IDLE_TIMEOUT_MS / 60000) + ' min)');
    }
    
    // Stop monitoring for idle state
    stopIdleDetection() {
        // Remove event listeners
        if (this.boundResetIdle) {
            this.activityEvents.forEach(event => {
                document.removeEventListener(event, this.boundResetIdle);
            });
            this.boundResetIdle = null;
        }
        
        // Clear idle timer
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }
    
    // Reset the idle timer (called on any user activity)
    resetIdleTimer() {
        // Throttle: only process if 5+ seconds since last reset (unless disconnected)
        const now = Date.now();
        if (!this.isDisconnected && this.lastIdleReset && (now - this.lastIdleReset) < 5000) {
            return;
        }
        this.lastIdleReset = now;
        
        // Clear existing timer
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        
        // If we were disconnected, reconnect
        if (this.isDisconnected) {
            this.reconnect();
        }
        
        // Start new timer
        this.idleTimer = setTimeout(() => {
            this.onIdle();
        }, this.IDLE_TIMEOUT_MS);
    }
    
    // Called when user becomes idle
    onIdle() {
        if (this.isDisconnected) return;
        
        console.log('😴 User idle - disconnecting to save resources');
        this.isDisconnected = true;
        
        // Flush any pending saves
        this.flushScoresImmediately();
        
        // Stop listening to Firebase
        this.stopListening();
        
        // Show reconnect banner
        this.showReconnectBanner();
    }
    
    // Reconnect after being idle
    reconnect() {
        if (!this.isDisconnected) return;
        
        console.log('🔄 User active - reconnecting...');
        this.isDisconnected = false;
        
        // Hide reconnect banner
        this.hideReconnectBanner();
        
        // Reload data and restart listeners
        const basePath = this.getBasePath();
        database.ref(basePath).once('value').then((snapshot) => {
            this.processStaticData(snapshot.val());
            
            if (this.isOrganiser) {
                this.setupScoreListeners(basePath);
            } else {
                this.setupScorePolling(basePath);
            }
            
            render();
            console.log('✅ Reconnected successfully');
        });
    }
    
    // Show banner indicating disconnection
    showReconnectBanner() {
        const existingBanner = document.getElementById('idle-banner');
        if (existingBanner) return;
        
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
    
    // Hide reconnect banner
    hideReconnectBanner() {
        const banner = document.getElementById('idle-banner');
        if (banner) {
            banner.remove();
        }
    }

    saveToFirebase() {
        if (!this.canEdit()) {
            console.log('⚠️ Cannot save - not organiser');
            return;
        }
        
        // Set flag to prevent Firebase listener from overwriting during save
        this.isSaving = true;
        
        const basePath = this.getBasePath();
        
        // Update the updatedAt timestamp
        database.ref(`${basePath}/meta/updatedAt`).set(new Date().toISOString());
        
        // Use granular updates instead of overwriting entire database
        const updates = {};
        updates[`${basePath}/playerNames`] = this.playerNames;
        updates[`${basePath}/skillRatings`] = this.skillRatings;
        updates[`${basePath}/matchScores`] = this.matchScores;
        updates[`${basePath}/fixtures`] = this.fixtures;
        updates[`${basePath}/matchNames`] = this.matchNames;
        updates[`${basePath}/knockoutNames`] = this.knockoutNames;
        updates[`${basePath}/knockoutScores`] = this.knockoutScores;
        updates[`${basePath}/knockoutFormat`] = this.knockoutFormat;
        updates[`${basePath}/fixtureMaxScore`] = this.fixtureMaxScore;
        updates[`${basePath}/knockoutMaxScore`] = this.knockoutMaxScore;
        updates[`${basePath}/semiMaxScore`] = this.semiMaxScore;
        updates[`${basePath}/finalMaxScore`] = this.finalMaxScore;
        updates[`${basePath}/savedVersions`] = this.savedVersions;
        updates[`${basePath}/showFairnessTabs`] = this.showFairnessTabs;
        updates[`${basePath}/registeredPlayers`] = this.registeredPlayers || {};
        
        database.ref().update(updates).then(() => {
            // Clear saving flag after a short delay to allow Firebase listener to settle
            setTimeout(() => {
                this.isSaving = false;
            }, 100);
        }).catch((error) => {
            console.error('❌ Error saving to Firebase:', error);
            this.isSaving = false;
        });
    }

    // Debounced save - groups rapid changes together
    debouncedSave = null;
    saveToFirebaseDebounced() {
        if (!this.canEdit()) return;
        
        if (this.debouncedSave) {
            clearTimeout(this.debouncedSave);
        }
        this.debouncedSave = setTimeout(() => {
            this.saveToFirebase();
        }, 500);
    }

    // Granular update for match scores only (most common operation) - DEBOUNCED
    saveMatchScoreToFirebase(round, matchIdx, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        // Queue the update
        const key = `${round}-${matchIdx}`;
        this.pendingScoreUpdates[key] = { round, matchIdx, team1Score, team2Score };
        
        // Debounce the actual save
        this.debouncedScoreSave();
    }

    // Granular update for knockout scores - DEBOUNCED
    saveKnockoutScoreToFirebase(matchId, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        // Queue the update
        this.pendingKnockoutUpdates[matchId] = { team1Score, team2Score };
        
        // Debounce the actual save
        this.debouncedScoreSave();
    }
    
    // Debounced save - batches all pending score updates
    debouncedScoreSave() {
        // Clear existing timer
        if (this.scoreDebounceTimer) {
            clearTimeout(this.scoreDebounceTimer);
        }
        
        // Set new timer
        this.scoreDebounceTimer = setTimeout(() => {
            this.flushPendingScores();
        }, this.SCORE_DEBOUNCE_MS);
    }
    
    // Flush all pending score updates to Firebase in a single batch
    flushPendingScores() {
        const basePath = this.getBasePath();
        const updates = {};
        let hasUpdates = false;
        
        // Add pending match scores
        for (const key in this.pendingScoreUpdates) {
            const { round, matchIdx, team1Score, team2Score } = this.pendingScoreUpdates[key];
            updates[`${basePath}/matchScores/${round}/${matchIdx}`] = { team1Score, team2Score };
            hasUpdates = true;
        }
        
        // Add pending knockout scores
        for (const matchId in this.pendingKnockoutUpdates) {
            const { team1Score, team2Score } = this.pendingKnockoutUpdates[matchId];
            updates[`${basePath}/knockoutScores/${matchId}`] = { team1Score, team2Score };
            hasUpdates = true;
        }
        
        if (hasUpdates) {
            // Add timestamp
            updates[`${basePath}/meta/updatedAt`] = new Date().toISOString();
            
            // Batch write all updates
            database.ref().update(updates)
                .then(() => {
                    console.log(`✅ Saved ${Object.keys(this.pendingScoreUpdates).length} match + ${Object.keys(this.pendingKnockoutUpdates).length} knockout scores`);
                })
                .catch(err => {
                    console.error('❌ Error saving scores:', err);
                });
            
            // Clear pending updates
            this.pendingScoreUpdates = {};
            this.pendingKnockoutUpdates = {};
        }
        
        this.scoreDebounceTimer = null;
    }
    
    // Force immediate save (e.g., before page unload)
    flushScoresImmediately() {
        if (this.scoreDebounceTimer) {
            clearTimeout(this.scoreDebounceTimer);
            this.scoreDebounceTimer = null;
        }
        this.flushPendingScores();
    }

    // Granular update for settings
    saveSettingToFirebase(key, value) {
        if (!this.canEdit()) return;
        
        database.ref(`${this.getBasePath()}/${key}`).set(value);
        database.ref(`${this.getBasePath()}/meta/updatedAt`).set(new Date().toISOString());
    }

    // ===== PLAYER MANAGEMENT =====

    updatePlayerName(index, name) {
        if (!this.canEdit()) return;
        this.playerNames[index] = name;
        this.saveToFirebaseDebounced();
    }

    updateSkillRating(playerId, rating) {
        if (!this.canEdit()) return;
        this.skillRatings[playerId] = rating;
        this.saveToFirebaseDebounced();
    }

    resetPlayerNames() {
        if (!this.canEdit()) return;
        this.playerNames = this.defaultPlayers.map(p => p.name);
        this.skillRatings = {};
        this.defaultPlayers.forEach(p => {
            this.skillRatings[p.id] = p.rating;
        });
        this.saveToFirebase();
    }

    // ===== MATCH NAME MANAGEMENT =====

    updateMatchName(matchNum, name) {
        if (!this.canEdit()) return;
        this.matchNames[matchNum] = name;
        this.saveToFirebaseDebounced();
    }

    updateKnockoutName(matchId, name) {
        if (!this.canEdit()) return;
        this.knockoutNames[matchId] = name;
        this.saveToFirebaseDebounced();
    }

    resetMatchNames() {
        if (!this.canEdit()) return;
        this.matchNames = {...this.defaultMatchNames};
        this.saveToFirebase();
    }

    resetKnockoutNames() {
        if (!this.canEdit()) return;
        this.knockoutNames = {...this.defaultKnockoutNames};
        this.saveToFirebase();
    }

    // ===== SCORE MANAGEMENT =====

    updateMatchScore(round, match, team1Score, team2Score) {
        if (!this.canEdit()) return;
        if (!this.matchScores[round]) {
            this.matchScores[round] = {};
        }
        this.matchScores[round][match] = { team1Score, team2Score };
        this.saveMatchScoreToFirebase(round, match, team1Score, team2Score);
    }

    clearMatchScore(round, match) {
        if (!this.canEdit()) return;
        if (this.matchScores[round] && this.matchScores[round][match]) {
            delete this.matchScores[round][match];
            database.ref(`${this.getBasePath()}/matchScores/${round}/${match}`).remove();
        }
    }

    getMatchScore(round, matchIdx) {
        return this.matchScores[round]?.[matchIdx] || { team1Score: null, team2Score: null };
    }

    isMatchComplete(round, matchIdx) {
        const score = this.getMatchScore(round, matchIdx);
        return score.team1Score !== null && score.team2Score !== null;
    }

    getWinner(round, matchIdx) {
        const score = this.getMatchScore(round, matchIdx);
        if (score.team1Score === null || score.team2Score === null) return null;
        if (score.team1Score > score.team2Score) return 'team1';
        if (score.team2Score > score.team1Score) return 'team2';
        return 'draw';
    }

    resetAllScores() {
        if (!this.canEdit()) return;
        this.createBackup('Auto-backup before reset');
        this.matchScores = {};
        this.saveToFirebase();
    }

    // ===== KNOCKOUT SCORE MANAGEMENT =====

    updateKnockoutScore(matchId, team1Score, team2Score) {
        if (!this.canEdit()) return;
        this.knockoutScores[matchId] = { team1Score, team2Score };
        this.saveKnockoutScoreToFirebase(matchId, team1Score, team2Score);
    }

    clearKnockoutScore(matchId) {
        if (!this.canEdit()) return;
        if (this.knockoutScores[matchId]) {
            delete this.knockoutScores[matchId];
            database.ref(`${this.getBasePath()}/knockoutScores/${matchId}`).remove();
        }
    }

    getKnockoutScore(matchId) {
        return this.knockoutScores[matchId] || { team1Score: null, team2Score: null };
    }

    updateKnockoutMaxScore(value) {
        if (!this.canEdit()) return;
        this.knockoutMaxScore = value;
        this.saveSettingToFirebase('knockoutMaxScore', value);
    }

    updateSemiMaxScore(value) {
        if (!this.canEdit()) return;
        this.semiMaxScore = value;
        this.saveSettingToFirebase('semiMaxScore', value);
    }

    updateFinalMaxScore(value) {
        if (!this.canEdit()) return;
        this.finalMaxScore = value;
        this.saveSettingToFirebase('finalMaxScore', value);
    }

    updateFixtureMaxScore(value) {
        if (!this.canEdit()) return;
        this.fixtureMaxScore = value;
        this.saveSettingToFirebase('fixtureMaxScore', value);
    }

    toggleFairnessTabs() {
        if (!this.canEdit()) return;
        this.showFairnessTabs = !this.showFairnessTabs;
        this.saveSettingToFirebase('showFairnessTabs', this.showFairnessTabs);
    }

    // ===== FIXTURE MANAGEMENT =====

    updateFixture(round, matchIdx, team1p1, team1p2, team2p1, team2p2) {
        if (!this.canEdit()) return;
        this.fixtures[round][matchIdx] = {
            team1: [parseInt(team1p1), parseInt(team1p2)],
            team2: [parseInt(team2p1), parseInt(team2p2)]
        };
        this.saveToFirebase();
    }

    updateFixtureWithSwap(round, matchIdx, position, oldValue, newValue) {
        if (!this.canEdit()) return;
        const match = this.fixtures[round][matchIdx];
        
        // Check if new value exists elsewhere in round
        const playersInRound = [];
        this.fixtures[round].forEach((m, idx) => {
            playersInRound.push(...m.team1, ...m.team2);
        });
        
        // If player exists, swap positions
        if (playersInRound.includes(newValue)) {
            this.fixtures[round].forEach((m, idx) => {
                ['team1', 'team2'].forEach(team => {
                    [0, 1].forEach(pos => {
                        if (m[team][pos] === newValue) {
                            this.fixtures[round][idx][team][pos] = oldValue;
                        }
                    });
                });
            });
        }
        
        // Update the position
        if (position === 't1p1') match.team1[0] = newValue;
        else if (position === 't1p2') match.team1[1] = newValue;
        else if (position === 't2p1') match.team2[0] = newValue;
        else if (position === 't2p2') match.team2[1] = newValue;
        
        this.saveToFirebase();
    }

    resetFixtures() {
        if (!this.canEdit()) return;
        this.fixtures = JSON.parse(JSON.stringify(this.defaultFixtures));
        this.saveToFirebase();
    }

    exportFixtures() {
        return JSON.stringify(this.fixtures, null, 2);
    }

    importFixtures(fixturesJson) {
        if (!this.canEdit()) return false;
        try {
            const parsed = JSON.parse(fixturesJson);
            this.fixtures = parsed;
            this.saveToFirebase();
            return true;
        } catch (e) {
            return false;
        }
    }

    // ===== VERSION MANAGEMENT =====

    createBackup(name) {
        if (!this.canEdit()) return null;
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const backup = {
            id: Date.now(),
            name: name || `Backup ${timestamp}`,
            timestamp: timestamp,
            playerNames: [...this.playerNames],
            skillRatings: {...this.skillRatings},
            matchScores: JSON.parse(JSON.stringify(this.matchScores)),
            fixtures: JSON.parse(JSON.stringify(this.fixtures)),
            matchNames: {...this.matchNames},
            knockoutNames: {...this.knockoutNames},
            knockoutScores: JSON.parse(JSON.stringify(this.knockoutScores)),
            knockoutMaxScore: this.knockoutMaxScore,
            semiMaxScore: this.semiMaxScore,
            finalMaxScore: this.finalMaxScore
        };
        
        this.savedVersions.unshift(backup);
        if (this.savedVersions.length > CONFIG.MAX_SAVED_VERSIONS) {
            this.savedVersions = this.savedVersions.slice(0, CONFIG.MAX_SAVED_VERSIONS);
        }
        this.saveToFirebase();
        return backup;
    }

    loadVersion(versionId) {
        if (!this.canEdit()) return;
        const version = this.savedVersions.find(v => v.id === versionId);
        if (version) {
            this.createBackup('Auto-backup before load');
            this.playerNames = [...version.playerNames];
            this.skillRatings = {...version.skillRatings};
            this.matchScores = JSON.parse(JSON.stringify(version.matchScores));
            if (version.fixtures) this.fixtures = JSON.parse(JSON.stringify(version.fixtures));
            if (version.matchNames) this.matchNames = {...version.matchNames};
            if (version.knockoutNames) this.knockoutNames = {...version.knockoutNames};
            if (version.knockoutScores) this.knockoutScores = JSON.parse(JSON.stringify(version.knockoutScores));
            if (version.knockoutMaxScore) this.knockoutMaxScore = version.knockoutMaxScore;
            if (version.semiMaxScore) this.semiMaxScore = version.semiMaxScore;
            if (version.finalMaxScore) this.finalMaxScore = version.finalMaxScore;
            this.saveToFirebase();
        }
    }

    deleteVersion(versionId) {
        if (!this.canEdit()) return;
        this.savedVersions = this.savedVersions.filter(v => v.id !== versionId);
        this.saveToFirebase();
    }

    // ===== DATA IMPORT/EXPORT =====

    exportData() {
        return {
            exportDate: new Date().toISOString(),
            tournamentId: this.tournamentId,
            tournamentName: this.tournamentName,
            playerNames: this.playerNames,
            skillRatings: this.skillRatings,
            matchScores: this.matchScores,
            fixtures: this.fixtures,
            matchNames: this.matchNames,
            knockoutNames: this.knockoutNames,
            knockoutScores: this.knockoutScores,
            knockoutMaxScore: this.knockoutMaxScore,
            semiMaxScore: this.semiMaxScore,
            finalMaxScore: this.finalMaxScore,
            savedVersions: this.savedVersions
        };
    }

    importData(data) {
        if (!this.canEdit()) return;
        if (data.playerNames) this.playerNames = data.playerNames;
        if (data.skillRatings) this.skillRatings = data.skillRatings;
        if (data.matchScores) this.matchScores = data.matchScores;
        if (data.fixtures) this.fixtures = data.fixtures;
        if (data.matchNames) this.matchNames = data.matchNames;
        if (data.knockoutNames) this.knockoutNames = data.knockoutNames;
        if (data.knockoutScores) this.knockoutScores = data.knockoutScores;
        if (data.knockoutMaxScore) this.knockoutMaxScore = data.knockoutMaxScore;
        if (data.semiMaxScore) this.semiMaxScore = data.semiMaxScore;
        if (data.finalMaxScore) this.finalMaxScore = data.finalMaxScore;
        if (data.savedVersions) this.savedVersions = data.savedVersions;
        this.saveToFirebase();
    }

    // ===== STATISTICS =====

    countCompletedMatches() {
        let count = 0;
        for (let round = 1; round <= CONFIG.TOTAL_ROUNDS; round++) {
            for (let match = 0; match < CONFIG.MATCHES_PER_ROUND; match++) {
                if (this.isMatchComplete(round, match)) count++;
            }
        }
        return count;
    }

    calculateStandings() {
        const standings = [];
        for (let playerId = 1; playerId <= CONFIG.TOTAL_PLAYERS; playerId++) {
            let matches = 0, wins = 0, draws = 0, losses = 0;
            let pointsFor = 0, pointsAgainst = 0;
            let tournamentPoints = 0;
            const partners = new Set();
            
            for (let round = 1; round <= CONFIG.TOTAL_ROUNDS; round++) {
                if (!this.fixtures[round]) continue;
                
                this.fixtures[round].forEach((match, matchIdx) => {
                    const allPlayers = [...match.team1, ...match.team2];
                    if (!allPlayers.includes(playerId)) return;
                    
                    const score = this.getMatchScore(round, matchIdx);
                    if (score.team1Score === null || score.team2Score === null) return;
                    
                    matches++;
                    const isTeam1 = match.team1.includes(playerId);
                    const playerScore = isTeam1 ? score.team1Score : score.team2Score;
                    const opponentScore = isTeam1 ? score.team2Score : score.team1Score;
                    
                    pointsFor += playerScore;
                    pointsAgainst += opponentScore;
                    
                    const partner = isTeam1 
                        ? match.team1.find(p => p !== playerId) 
                        : match.team2.find(p => p !== playerId);
                    partners.add(partner);
                    
                    if (playerScore > opponentScore) { 
                        wins++; 
                        tournamentPoints += CONFIG.POINTS_WIN; 
                    } else if (playerScore === opponentScore) { 
                        draws++; 
                        tournamentPoints += CONFIG.POINTS_DRAW; 
                    } else { 
                        losses++; 
                    }
                });
            }
            
            standings.push({
                playerId, 
                name: this.playerNames[playerId - 1], 
                rating: this.skillRatings[playerId],
                matches, wins, draws, losses, 
                pointsFor, pointsAgainst,
                pointsDiff: pointsFor - pointsAgainst, 
                tournamentPoints,
                winRate: matches > 0 ? (wins / matches * 100).toFixed(1) : '0.0',
                uniquePartners: partners.size
            });
        }
        
        standings.sort((a, b) => {
            if (b.tournamentPoints !== a.tournamentPoints) return b.tournamentPoints - a.tournamentPoints;
            if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
            return b.pointsFor - a.pointsFor;
        });
        
        return standings;
    }
}

console.log('✅ State management loaded');
