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
        this.showFairnessTabs = false;
        
        // Registered players (Phase 4 - Browse & Join)
        this.registeredPlayers = {};
        this.playerCount = 24;
        
        // Round ordering (custom order for rounds)
        this.roundOrder = null;

        // Excluded rounds (array of 1-based round numbers excluded from standings)
        this.excludedRounds = [];
        
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
                // Persist the verified key in sessionStorage so the organiser
                // can navigate into TV mode (or any keyless route) and come
                // back without losing write ownership. sessionStorage is
                // tab-scoped and cleared when the tab closes, which is the
                // right lifetime for a shared-secret.
                try {
                    sessionStorage.setItem('tournament_key_' + this.tournamentId, key);
                } catch (e) { /* private mode / disabled — ignore */ }
                // Upgrade from polling to real-time sync
                this.upgradeToRealtime();
                // Re-anchor Firebase ownership to this session's anon UID so
                // writes succeed. If the claim doesn't stick on the server we
                // surface the problem loudly — this is the "can edit in UI but
                // every write gets reverted by Firebase" scenario that
                // happens when an organiser returns on a different device.
                const claimed = await this.claimOwnership();
                if (!claimed) {
                    console.error('⚠️ Organiser key matched but could not claim Firebase write ownership. Writes will fail until this resolves.');
                    if (typeof showToast === 'function') {
                        showToast('⚠️ Could not secure write access. Refresh and try again.');
                    }
                }
            } else {
                console.log('❌ Invalid organiser key');
                try {
                    sessionStorage.removeItem('tournament_key_' + this.tournamentId);
                } catch (e) { /* ignore */ }
            }

            return this.isOrganiser;
        } catch (error) {
            console.error('Error verifying organiser key:', error);
            this.isOrganiser = false;
            return false;
        }
    }

    /**
     * Wait for Firebase anonymous auth to finish signing the user in so
     * firebase.auth().currentUser is available. The tournament loader can
     * easily race the initial signInAnonymously() call, so any method
     * that needs currentUser must await this first. Resolves to the UID
     * on success, or null if no user appears within the timeout.
     */
    async _awaitFirebaseAuthUid(timeoutMs = 8000) {
        if (typeof firebase === 'undefined' || !firebase.auth) return null;
        const auth = firebase.auth();
        if (auth.currentUser) return auth.currentUser.uid;
        return new Promise(resolve => {
            let done = false;
            const unsub = auth.onAuthStateChanged(user => {
                if (done) return;
                if (user) { done = true; unsub(); resolve(user.uid); }
            });
            setTimeout(() => {
                if (done) return;
                done = true;
                unsub();
                resolve(auth.currentUser ? auth.currentUser.uid : null);
            }, timeoutMs);
        });
    }

    /**
     * Claim Firebase write ownership for this tournament: set
     * meta/organizerUid to the current anon Firebase UID, then read back
     * to confirm the write actually stuck on the server. Returns
     * true/false instead of silently swallowing errors. The rule's
     * ownership-transfer clause lets a session that already has a valid
     * organiserKey re-anchor meta/organizerUid to its own UID.
     */
    async claimOwnership() {
        if (!this.tournamentId) return false;
        const currentUid = await this._awaitFirebaseAuthUid();
        if (!currentUid) {
            console.warn('claimOwnership: no Firebase auth UID (sign-in timed out)');
            return false;
        }
        const path = `${this.getBasePath()}/meta/organizerUid`;
        try {
            await database.ref(path).set(currentUid);
            const snap = await database.ref(path).once('value');
            const actualUid = snap.val();
            if (actualUid === currentUid) {
                console.log('🔑 Ownership claimed for current session');
                return true;
            }
            console.warn('claimOwnership: server still has', actualUid, 'expected', currentUid);
            return false;
        } catch (e) {
            // The rules accept a direct write only when the tournament is
            // unowned or already ours. A returning organiser on a new device
            // has a different anonymous UID, so their claim lands here and has
            // to be proved server-side with the organiser key.
            console.warn('claimOwnership: direct write rejected, trying server claim:', e.code || e.message);
            return await this._claimOwnershipViaServer();
        }
    }

    /**
     * Ask the server to transfer ownership to this session, proving we hold the
     * tournament's organiser key. Replaces the old database rule that let any
     * client re-point organizerUid at itself.
     * @returns {Promise<boolean>}
     */
    async _claimOwnershipViaServer() {
        if (!this.organiserKey) {
            console.warn('claimOwnership: no organiser key held, cannot claim');
            return false;
        }
        try {
            const claim = firebase.app().functions('europe-west1')
                .httpsCallable('claimTournamentOwnership');
            const res = await claim({
                format: 'tournament',
                tournamentId: this.tournamentId,
                organiserKey: this.organiserKey,
            });
            if (res?.data?.success) {
                console.log('🔑 Ownership claimed via server');
                return true;
            }
            return false;
        } catch (e) {
            console.warn('claimOwnership: server claim failed:', e.code || e.message);
            return false;
        }
    }

    /**
     * Fast-path guard before destructive writes: does this session
     * currently have write ownership on the server? If not, re-claim.
     * Returns true if the session can write, false otherwise.
     */
    async ensureWriteOwnership() {
        if (!this.isOrganiser || !this.tournamentId) return false;
        const currentUid = await this._awaitFirebaseAuthUid();
        if (!currentUid) return false;
        try {
            const snap = await database.ref(`${this.getBasePath()}/meta/organizerUid`).once('value');
            if (snap.val() === currentUid) return true;
        } catch (e) { /* fall through to claim attempt */ }
        return await this.claimOwnership();
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
        this.showFairnessTabs = false;
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
        this.showFairnessTabs = data.showFairnessTabs !== undefined ? data.showFairnessTabs : false;
        
        // Registered players (Phase 4)
        this.registeredPlayers = data.registeredPlayers || {};
        this.playerCount = data.meta?.playerCount || 24;
        
        // Round ordering
        this.roundOrder = data.roundOrder || null;

        // Excluded rounds
        this.excludedRounds = data.excludedRounds || [];
        
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
        let lastMatchScores = '';
        let lastKnockoutScores = '';
        
        // Listen to match scores
        database.ref(`${basePath}/matchScores`).on('value', (snapshot) => {
            if (!this.isSaving) {
                const newData = snapshot.val() || {};
                const newDataStr = JSON.stringify(newData);
                if (newDataStr !== lastMatchScores) {
                    lastMatchScores = newDataStr;
                    this.matchScores = newData;
                    render();
                }
            }
        });
        
        // Listen to knockout scores
        database.ref(`${basePath}/knockoutScores`).on('value', (snapshot) => {
            if (!this.isSaving) {
                const newData = snapshot.val() || {};
                const newDataStr = JSON.stringify(newData);
                if (newDataStr !== lastKnockoutScores) {
                    lastKnockoutScores = newDataStr;
                    this.knockoutScores = newData;
                    render();
                }
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
        
        // Stop idle detection (clean up event listeners)
        this.stopIdleDetection();
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

    async saveToFirebase() {
        if (!this.canEdit()) {
            console.log('⚠️ Cannot save - not organiser');
            return;
        }

        // Set flag to prevent Firebase listener from overwriting during save
        this.isSaving = true;

        // Re-anchor write ownership if this session's UID doesn't match
        // meta/organizerUid on the server (returning-on-different-device case).
        await this.ensureWriteOwnership();

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
        updates[`${basePath}/roundOrder`] = this.roundOrder;
        updates[`${basePath}/excludedRounds`] = this.excludedRounds;

        database.ref().update(updates).then(() => {
            // Clear saving flag after a short delay to allow Firebase listener to settle
            setTimeout(() => {
                this.isSaving = false;
            }, 100);
        }).catch((error) => {
            console.error('❌ Error saving to Firebase:', error.code || error.message);
            if (typeof showToast === 'function') {
                showToast('⚠️ Save failed — ' + (error.code || 'permission denied'));
            }
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
    async flushPendingScores() {
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
            const matchCount = Object.keys(this.pendingScoreUpdates).length;
            const knockoutCount = Object.keys(this.pendingKnockoutUpdates).length;

            // Clear pending updates before the async write so new edits can
            // queue up while this batch is in flight.
            this.pendingScoreUpdates = {};
            this.pendingKnockoutUpdates = {};

            // Re-anchor write ownership if needed, then batch-write.
            await this.ensureWriteOwnership();

            try {
                await database.ref().update(updates);
                console.log(`✅ Saved ${matchCount} match + ${knockoutCount} knockout scores`);
            } catch (err) {
                console.error('❌ Error saving scores:', err.code || err.message);
                if (typeof showToast === 'function') {
                    showToast('⚠️ Score save failed — ' + (err.code || 'permission denied'));
                }
            }
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

    // Granular update for settings — multi-path update under
    // ensureWriteOwnership so returning-on-different-device organisers
    // can recover ownership on the fly, with surfaced errors.
    async saveSettingToFirebase(key, value) {
        if (!this.canEdit()) return;
        await this.ensureWriteOwnership();
        const updates = {
            [`${this.getBasePath()}/${key}`]: value,
            [`${this.getBasePath()}/meta/updatedAt`]: new Date().toISOString(),
        };
        try {
            await database.ref().update(updates);
        } catch (err) {
            console.error(`❌ Settings save failed:`, err.code || err.message);
            if (typeof showToast === 'function') {
                showToast('⚠️ Settings save failed — ' + (err.code || 'permission denied'));
            }
        }
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
            if (this.excludedRounds.includes(round)) continue;
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
                if (this.excludedRounds.includes(round)) continue;
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
    
    // ===== ROUND ORDERING =====
    
    /**
     * Move a round to a new position
     * @param {number} fromIndex - Current display position
     * @param {number} toIndex - Target display position
     */
    moveRound(fromIndex, toIndex) {
        if (!this.canEdit()) return;
        
        const totalRounds = CONFIG.TOTAL_ROUNDS;
        
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
        this.saveToFirebase();
    }

    // ===== ROUND EXCLUSION =====

    /**
     * Check if a round is excluded from standings
     * @param {number} round - 1-based round number
     * @returns {boolean}
     */
    isRoundExcluded(round) {
        return this.excludedRounds.includes(round);
    }

    /**
     * Toggle a round's exclusion from standings
     * @param {number} round - 1-based round number
     */
    toggleRoundExclusion(round) {
        if (!this.canEdit()) return;
        const idx = this.excludedRounds.indexOf(round);
        if (idx === -1) {
            this.excludedRounds.push(round);
        } else {
            this.excludedRounds.splice(idx, 1);
        }
        this.saveSettingToFirebase('excludedRounds', this.excludedRounds);
    }
}

console.log('✅ State management loaded');
