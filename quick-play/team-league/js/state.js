// ===== TEAM LEAGUE STATE MANAGEMENT =====

class TeamLeagueState {
    constructor(tournamentId = null) {
        this.tournamentId = tournamentId;
        this.formatType = CONFIG.FORMAT_TYPE;
        
        // UI State - load preferences from localStorage
        this.currentTab = 'fixtures'; // fixtures, knockout, standings, partners, settings
        this.settingsSubTab = 'teams';
        this.fixturesViewMode = localStorage.getItem('teamLeague_fixturesViewMode') || 'side-by-side'; // side-by-side, group-a, group-b
        this.standingsViewMode = localStorage.getItem('teamLeague_standingsViewMode') || 'both'; // both, group-a, group-b
        this.editingTeamId = null;
        this.swapSourceTeamId = null; // For team swap UI in groups settings
        this.fixturesFilterRound = 'all'; // 'all' or round number
        this.fixturesFilterGroup = 'all'; // 'all' or group letter
        this.isInitialized = false;
        this.isSaving = false;
        
        // Organiser status
        this.isOrganiser = false;
        this.organiserKey = null;
        
        // Polling for viewers (optimization: viewers don't need real-time)
        this.pollingInterval = null;
        this.VIEWER_POLL_INTERVAL = 10000; // 10 seconds for viewers
        
        // Debounce for score updates (optimization: batch writes)
        this.pendingGroupScores = {};       // { "group-matchKey": {team1Score, team2Score} }
        this.pendingKnockoutScores = {};    // { "matchId": {team1Score, team2Score} }
        this.scoreDebounceTimer = null;
        this.SCORE_DEBOUNCE_MS = 500;       // Wait 500ms after last change
        
        // Idle detection (optimization: disconnect inactive users)
        this.idleTimer = null;
        this.IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes
        this.isDisconnected = false;
        this.activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
        this.boundResetIdle = null;
        this.lastIdleReset = 0;
        
        // Tournament metadata
        this.tournamentName = '';
        this.createdAt = null;
        
        // Team Configuration
        this.teamCount = CONFIG.DEFAULT_TEAM_COUNT;
        this.groupMode = CONFIG.DEFAULT_GROUP_MODE;
        this.includeThirdPlace = CONFIG.INCLUDE_THIRD_PLACE;
        this.knockoutFormat = 'quarter_final'; // 'final_only', 'semi_final', 'quarter_final', 'round_of_16'
        this.qualifiersPerGroup = 4; // For four_groups: 1, 2, or 4 (default 4)
        // League-only mode: no knockout stage at all. Final league
        // standings decide the result (1st = gold, 2nd = silver,
        // 3rd = bronze). One-day single-table leagues.
        this.leagueOnly = false;

        // Teams data: { id, name, player1Name, player1Rating, player2Name, player2Rating, combinedRating, group }
        this.teams = [];

        // Group assignments (team IDs)
        this.groupA = [];
        this.groupB = [];
        this.groupC = [];
        this.groupD = [];
        this.groupE = [];
        this.groupF = [];
        this.groupG = [];
        this.groupH = [];
        this.groupI = [];

        // Generated fixtures per group
        this.groupAFixtures = [];
        this.groupBFixtures = [];
        this.groupCFixtures = [];
        this.groupDFixtures = [];
        this.groupEFixtures = [];
        this.groupFFixtures = [];
        this.groupGFixtures = [];
        this.groupHFixtures = [];
        this.groupIFixtures = [];

        // Match scores
        this.groupMatchScores = {
            A: {}, B: {}, C: {}, D: {},
            E: {}, F: {}, G: {}, H: {}, I: {}
        };

        // Knockout scores
        this.knockoutScores = {
            r16_1: { team1Score: null, team2Score: null },
            r16_2: { team1Score: null, team2Score: null },
            r16_3: { team1Score: null, team2Score: null },
            r16_4: { team1Score: null, team2Score: null },
            r16_5: { team1Score: null, team2Score: null },
            r16_6: { team1Score: null, team2Score: null },
            r16_7: { team1Score: null, team2Score: null },
            r16_8: { team1Score: null, team2Score: null },
            qf1: { team1Score: null, team2Score: null },
            qf2: { team1Score: null, team2Score: null },
            qf3: { team1Score: null, team2Score: null },
            qf4: { team1Score: null, team2Score: null },
            sf1: { team1Score: null, team2Score: null },
            sf2: { team1Score: null, team2Score: null },
            thirdPlace: { team1Score: null, team2Score: null },
            final: { team1Score: null, team2Score: null }
        };

        // Registered players (Phase 4 - Browse & Join)
        this.registeredPlayers = {};

        // Knockout team assignments
        this.knockoutTeams = {
            r16_1: { team1: null, team2: null },
            r16_2: { team1: null, team2: null },
            r16_3: { team1: null, team2: null },
            r16_4: { team1: null, team2: null },
            r16_5: { team1: null, team2: null },
            r16_6: { team1: null, team2: null },
            r16_7: { team1: null, team2: null },
            r16_8: { team1: null, team2: null },
            qf1: { team1: null, team2: null },
            qf2: { team1: null, team2: null },
            qf3: { team1: null, team2: null },
            qf4: { team1: null, team2: null },
            sf1: { team1: null, team2: null },
            sf2: { team1: null, team2: null },
            thirdPlace: { team1: null, team2: null },
            final: { team1: null, team2: null }
        };
        
        // Max scores for different stages
        this.groupMaxScore = CONFIG.DEFAULT_MAX_SCORE;
        this.knockoutMaxScore = CONFIG.KNOCKOUT_MAX_SCORE;
        this.semiMaxScore = CONFIG.SEMI_MAX_SCORE;
        this.thirdPlaceMaxScore = CONFIG.THIRD_PLACE_MAX_SCORE;
        this.finalMaxScore = CONFIG.FINAL_MAX_SCORE;
        
        // Number of courts available simultaneously for group-stage matches.
        // Used to slot fixtures into "court rounds" of N concurrent matches each.
        this.courtCount = 4;

        // Court schedule: source of truth for how matches are distributed across
        // court rounds. Populated by buildCourtSchedule() on generateFixtures()
        // or rebuildCourtSchedule(). Mutated in place by moveMatchToCourtRound().
        // Array<Array<{group, genRound, matchIdx}>>
        this.courtSchedule = [];

        // Court names
        this.courtNames = {
            group: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
            knockout: {
                r16_1: 'Court 1', r16_2: 'Court 2', r16_3: 'Court 3', r16_4: 'Court 4',
                r16_5: 'Court 5', r16_6: 'Court 6', r16_7: 'Court 7', r16_8: 'Court 8',
                qf1: 'Court 1', qf2: 'Court 2', qf3: 'Court 3', qf4: 'Court 4',
                sf1: 'Centre Court', sf2: 'Court 1',
                thirdPlace: 'Court 1',
                final: 'Centre Court'
            }
        };

        // Match naming
        this.knockoutNames = {
            r16_1: 'R16-1', r16_2: 'R16-2', r16_3: 'R16-3', r16_4: 'R16-4',
            r16_5: 'R16-5', r16_6: 'R16-6', r16_7: 'R16-7', r16_8: 'R16-8',
            qf1: 'QF1',
            qf2: 'QF2',
            qf3: 'QF3',
            qf4: 'QF4',
            sf1: 'SF1',
            sf2: 'SF2',
            thirdPlace: '3rd Place',
            final: 'Final'
        };
        
        // Version control
        this.savedVersions = [];
    }

    // ===== FIREBASE PATH =====
    
    getBasePath() {
        if (!this.tournamentId) {
            console.error('No tournament ID set!');
            return 'team-tournaments/unknown';
        }
        return `team-tournaments/${this.tournamentId}`;
    }

    // ===== ORGANISER ACCESS =====
    
    canEdit() {
        return this.isOrganiser;
    }

    /**
     * Claim Firebase write ownership for the current anonymous session.
     * Anonymous auth issues a new UID per browser session, so a returning
     * organiser may not match the original creator's UID. Once the URL key
     * has been verified client-side, we re-anchor `meta/organizerUid` to the
     * current auth.uid so subsequent writes pass the rule's UID-equality
     * check. The Firebase rule allows this rewrite only when organiserKey
     * is unchanged in the new payload.
     */
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
            // Read back to confirm — a rule-rejected .set() can resolve locally
            // but the server-side value won't have changed.
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
     * Transfer ownership to this session by proving we hold the tournament's
     * organiser key. Replaces the old database rule that let any client
     * re-point organizerUid at itself without proving anything.
     * @returns {Promise<boolean>}
     */
    async _claimOwnershipViaServer() {
        if (!this.organiserKey) {
            console.warn('claimOwnership: no organiser key held, cannot claim');
            return false;
        }
        try {
            // Prove we hold the organiser key by writing it as `proof` to
            // tournamentSecrets/<id>. That node is unreadable (".read": false),
            // so only someone who already knows the key can satisfy the rule —
            // and the same write records us as the claimant, which the
            // tournament write rule accepts as ownership.
            const uid = await this._awaitFirebaseAuthUid();
            if (!uid) return false;
            await database.ref(`tournamentSecrets/${this.tournamentId}`).update({
                proof: this.organiserKey,
                claimant: uid,
            });
            console.log('\u{1F511} Ownership claimed via organiser-key proof');
            return true;
        } catch (e) {
            console.warn('claimOwnership: key proof rejected:', e.code || e.message);
            return false;
        }
    }

    /**
     * Fast-path check: does this session currently have write ownership for
     * the tournament? If not, try to re-claim. Returns true if the session
     * can write, false otherwise. Used as a guard before destructive writes
     * (score saves, team reorders, etc.) to recover from the returning-on-
     * different-device scenario without waiting for the organiser to refresh.
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

    async verifyOrganiserKey(key) {
        if (!this.tournamentId || !key) {
            this.isOrganiser = false;
            return false;
        }

        try {
            // Prove the key rather than reading it back and comparing here:
            // see proveTournamentSecret() in shared/format-config.js.
            this.isOrganiser = await proveTournamentSecret(this.tournamentId, { key });
            this.organiserKey = key;

            if (this.isOrganiser) {
                console.log('✅ Organiser access granted');
                // Persist the FACT that this session verified — never the key
                // itself. The successful proof already recorded us as the
                // claimant server-side, so write ownership survives without
                // the browser holding a copy of the secret. sessionStorage is
                // tab-scoped and cleared when the tab closes, which is the
                // right lifetime for this. It lets the organiser navigate into
                // TV mode (or any keyless route) and come back as organiser.
                try {
                    sessionStorage.setItem('teamLeague_organiser_' + this.tournamentId, '1');
                } catch (e) { /* private mode / disabled — ignore */ }
                // Upgrade from polling to real-time sync
                this.upgradeToRealtime();
                // Re-anchor Firebase ownership to this session's anon UID so
                // writes succeed. If the claim doesn't stick on the server we
                // surface the problem loudly — this is the "can edit in UI but
                // every write gets reverted by Firebase" scenario.
                const claimed = await this.claimOwnership();
                if (!claimed) {
                    console.error('⚠️ Organiser key matched but could not claim Firebase write ownership. Writes will fail until this resolves.');
                    if (typeof showToast === 'function') {
                        showToast('⚠️ Could not secure write access. Refresh and try again.');
                    }
                }
            } else {
                console.log('❌ Invalid organiser key');
                // Wipe any stale organiser marker for this tournament — this
                // session can no longer prove it holds the key.
                try {
                    sessionStorage.removeItem('teamLeague_organiser_' + this.tournamentId);
                } catch (e) { /* ignore */ }
            }

            return this.isOrganiser;
        } catch (error) {
            console.error('Error verifying organiser key:', error);
            this.isOrganiser = false;
            return false;
        }
    }

    // ===== FIREBASE OPERATIONS =====

    // Process STATIC data from Firebase (loaded once)
    processStaticData(data) {
        if (!data) {
            console.log('⚠️ Tournament not found in Firebase');
            return false;
        }
        
        // Metadata
        if (data.meta) {
            this.tournamentName = data.meta.name || '';
            this.createdAt = data.meta.createdAt || null;
        }
        
        // Configuration (static)
        this.teamCount = data.teamCount || CONFIG.DEFAULT_TEAM_COUNT;
        this.groupMode = data.groupMode || CONFIG.DEFAULT_GROUP_MODE;
        this.includeThirdPlace = data.includeThirdPlace !== undefined ? data.includeThirdPlace : CONFIG.INCLUDE_THIRD_PLACE;
        this.knockoutFormat = data.knockoutFormat || 'quarter_final';
        this.leagueOnly = data.leagueOnly === true;
        this.qualifiersPerGroup = data.qualifiersPerGroup || 4;
        this.courtCount = (typeof data.courtCount === 'number' && data.courtCount > 0) ? data.courtCount : 4;
        this.courtSchedule = Array.isArray(data.courtSchedule) ? data.courtSchedule : [];

        // Teams (static)
        this.teams = data.teams || [];
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            this[`group${letter}`] = data[`group${letter}`] || [];
            this[`group${letter}Fixtures`] = data[`group${letter}Fixtures`] || [];
        });
        
        // Max scores (static)
        this.groupMaxScore = data.groupMaxScore || CONFIG.DEFAULT_MAX_SCORE;
        this.knockoutMaxScore = data.knockoutMaxScore || CONFIG.KNOCKOUT_MAX_SCORE;
        this.semiMaxScore = data.semiMaxScore || CONFIG.SEMI_MAX_SCORE;
        this.thirdPlaceMaxScore = data.thirdPlaceMaxScore || CONFIG.THIRD_PLACE_MAX_SCORE;
        this.finalMaxScore = data.finalMaxScore || CONFIG.FINAL_MAX_SCORE;
        
        // Names (static)
        this.knockoutNames = data.knockoutNames || this.knockoutNames;
        
        // Court names (static)
        this.courtNames = data.courtNames || {
            group: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
            knockout: {
                qf1: 'Court 1', qf2: 'Court 2', qf3: 'Court 3', qf4: 'Court 4',
                sf1: 'Centre Court', sf2: 'Court 1',
                thirdPlace: 'Court 1',
                final: 'Centre Court'
            }
        };
        
        // Versions (static)
        this.savedVersions = data.savedVersions || [];
        
        // Also load initial scores
        this.groupMatchScores = data.groupMatchScores || {};
        // Ensure all group letters exist for older tournaments
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            if (!this.groupMatchScores[letter]) this.groupMatchScores[letter] = {};
        });
        this.knockoutScores = data.knockoutScores || this.knockoutScores;
        this.knockoutTeams = data.knockoutTeams || this.knockoutTeams;
        
        // Registered players (Phase 4)
        this.registeredPlayers = data.registeredPlayers || {};
        
        console.log('📦 Static data loaded');
        return true;
    }
    
    // Process DYNAMIC data from Firebase (scores - changes frequently)
    processDynamicData(groupMatchScores, knockoutScores, knockoutTeams) {
        if (this.isSaving) {
            console.log('⏳ Skipping Firebase update - save in progress');
            return;
        }
        
        this.groupMatchScores = groupMatchScores || {};
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            if (!this.groupMatchScores[letter]) this.groupMatchScores[letter] = {};
        });
        if (!this.groupMatchScores.C) this.groupMatchScores.C = {};
        if (!this.groupMatchScores.D) this.groupMatchScores.D = {};
        this.knockoutScores = knockoutScores || this.knockoutScores;
        this.knockoutTeams = knockoutTeams || this.knockoutTeams;

        renderTeamLeague();
    }

    loadFromFirebase() {
        const basePath = this.getBasePath();
        
        // Monitor connection
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('✅ Connected to Firebase');
            } else {
                console.log('❌ Disconnected from Firebase');
            }
        });

        // STEP 1: Load static data once
        database.ref(basePath).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (!this.processStaticData(data)) {
                this.isInitialized = true;
                renderTeamLeague();
                return;
            }
            
            this.isInitialized = true;
            renderTeamLeague();
            
            // STEP 2: Set up listeners for dynamic data only (scores)
            if (this.isOrganiser) {
                console.log('👑 Organiser mode: Real-time sync for scores');
                this.setupScoreListeners(basePath);
            } else {
                console.log('👁️ Viewer mode: Polling scores (every ' + (this.VIEWER_POLL_INTERVAL/1000) + 's)');
                this.setupScorePolling(basePath);
            }
            
            // STEP 3: Start idle detection
            this.startIdleDetection();
        });
    }
    
    // Set up real-time listeners for scores only (organiser mode)
    setupScoreListeners(basePath) {
        let lastGroupScores = '';
        let lastKnockoutScores = '';
        let lastKnockoutTeams = '';
        
        database.ref(`${basePath}/groupMatchScores`).on('value', (snapshot) => {
            if (!this.isSaving) {
                const newData = snapshot.val() || { A: {}, B: {}, C: {}, D: {} };
                if (!newData.C) newData.C = {};
                if (!newData.D) newData.D = {};
                const newDataStr = JSON.stringify(newData);
                if (newDataStr !== lastGroupScores) {
                    lastGroupScores = newDataStr;
                    this.groupMatchScores = newData;
                    renderTeamLeague();
                }
            }
        });
        
        database.ref(`${basePath}/knockoutScores`).on('value', (snapshot) => {
            if (!this.isSaving) {
                const newData = snapshot.val() || this.knockoutScores;
                const newDataStr = JSON.stringify(newData);
                if (newDataStr !== lastKnockoutScores) {
                    lastKnockoutScores = newDataStr;
                    this.knockoutScores = newData;
                    renderTeamLeague();
                }
            }
        });
        
        database.ref(`${basePath}/knockoutTeams`).on('value', (snapshot) => {
            if (!this.isSaving) {
                const newData = snapshot.val() || this.knockoutTeams;
                const newDataStr = JSON.stringify(newData);
                if (newDataStr !== lastKnockoutTeams) {
                    lastKnockoutTeams = newDataStr;
                    this.knockoutTeams = newData;
                    renderTeamLeague();
                }
            }
        });
    }
    
    // Set up polling for scores only (viewer mode)
    setupScorePolling(basePath) {
        this.pollingInterval = setInterval(() => {
            Promise.all([
                database.ref(`${basePath}/groupMatchScores`).once('value'),
                database.ref(`${basePath}/knockoutScores`).once('value'),
                database.ref(`${basePath}/knockoutTeams`).once('value')
            ]).then(([groupSnapshot, knockoutSnapshot, teamsSnapshot]) => {
                this.processDynamicData(
                    groupSnapshot.val(),
                    knockoutSnapshot.val(),
                    teamsSnapshot.val()
                );
            });
        }, this.VIEWER_POLL_INTERVAL);
    }

    // Upgrade from polling to real-time (when viewer becomes organiser)
    upgradeToRealtime() {
        if (this.pollingInterval) {
            console.log('⬆️ Upgrading to real-time sync');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            
            const basePath = this.getBasePath();
            this.setupScoreListeners(basePath);
        }
    }

    stopListening() {
        const basePath = this.getBasePath();
        
        // Clear real-time listeners
        database.ref(`${basePath}/groupMatchScores`).off();
        database.ref(`${basePath}/knockoutScores`).off();
        database.ref(`${basePath}/knockoutTeams`).off();
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
            renderTeamLeague();
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
        
        const basePath = this.getBasePath();
        database.ref(basePath).once('value').then((snapshot) => {
            this.processStaticData(snapshot.val());
            if (this.isOrganiser) {
                this.setupScoreListeners(basePath);
            } else {
                this.setupScorePolling(basePath);
            }
            renderTeamLeague();
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

    saveToFirebase() {
        if (!this.canEdit()) {
            console.log('⚠️ Cannot save - not organiser');
            return;
        }
        
        this.isSaving = true;
        const basePath = this.getBasePath();
        
        database.ref(`${basePath}/meta/updatedAt`).set(new Date().toISOString());
        
        const updates = {};
        updates['teamCount'] = this.teamCount;
        updates['groupMode'] = this.groupMode;
        updates['includeThirdPlace'] = this.includeThirdPlace;
        updates['teams'] = this.teams;
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            updates[`group${letter}`] = this[`group${letter}`];
            updates[`group${letter}Fixtures`] = this[`group${letter}Fixtures`];
        });
        updates['qualifiersPerGroup'] = this.qualifiersPerGroup;
        updates['courtCount'] = this.courtCount;
        updates['courtSchedule'] = this.courtSchedule;
        updates['groupMatchScores'] = this.groupMatchScores;
        updates['knockoutScores'] = this.knockoutScores;
        updates['knockoutTeams'] = this.knockoutTeams;
        updates['groupMaxScore'] = this.groupMaxScore;
        updates['knockoutMaxScore'] = this.knockoutMaxScore;
        updates['semiMaxScore'] = this.semiMaxScore;
        updates['thirdPlaceMaxScore'] = this.thirdPlaceMaxScore;
        updates['finalMaxScore'] = this.finalMaxScore;
        updates['knockoutNames'] = this.knockoutNames;
        updates['courtNames'] = this.courtNames;
        updates['savedVersions'] = this.savedVersions;
        updates['registeredPlayers'] = this.registeredPlayers || {};

        database.ref(basePath).update(updates).then(() => {
            setTimeout(() => {
                this.isSaving = false;
            }, 100);
        }).catch((error) => {
            console.error('❌ Error saving to Firebase:', error);
            this.isSaving = false;
        });
    }

    // Debounced save
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

    // Granular saves - DEBOUNCED
    saveGroupScoreToFirebase(group, matchKey, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        // Queue the update
        const key = `${group}-${matchKey}`;
        this.pendingGroupScores[key] = { group, matchKey, team1Score, team2Score };
        
        // Debounce the actual save
        this.debouncedScoreSave();
    }

    saveKnockoutScoreToFirebase(matchId, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        // Queue the update
        this.pendingKnockoutScores[matchId] = { team1Score, team2Score };
        
        // Debounce the actual save
        this.debouncedScoreSave();
    }
    
    // Debounced save - batches all pending score updates
    debouncedScoreSave() {
        if (this.scoreDebounceTimer) {
            clearTimeout(this.scoreDebounceTimer);
        }
        
        this.scoreDebounceTimer = setTimeout(() => {
            this.flushPendingScores();
        }, this.SCORE_DEBOUNCE_MS);
    }
    
    // Flush all pending score updates to Firebase in a single batch
    async flushPendingScores() {
        const basePath = this.getBasePath();
        let hasUpdates = false;

        // Guard: prevent the Firebase listener from overwriting local
        // state with a stale snapshot while this write is in flight.
        this.isSaving = true;

        try {
            // Write group scores directly to groupMatchScores/ path
            // (has its own .write rule: "auth != null", no ownership needed)
            const groupUpdates = {};
            for (const key in this.pendingGroupScores) {
                const { group, matchKey, team1Score, team2Score } = this.pendingGroupScores[key];
                groupUpdates[`${group}/${matchKey}`] = { team1Score, team2Score };
                hasUpdates = true;
            }
            const groupCount = Object.keys(this.pendingGroupScores).length;
            this.pendingGroupScores = {};

            if (Object.keys(groupUpdates).length > 0) {
                await database.ref(`${basePath}/groupMatchScores`).update(groupUpdates);
            }

            // Write knockout scores directly to knockoutScores/ path
            // (has its own .write rule: "auth != null", no ownership needed)
            const knockoutUpdates = {};
            for (const matchId in this.pendingKnockoutScores) {
                const { team1Score, team2Score } = this.pendingKnockoutScores[matchId];
                knockoutUpdates[matchId] = { team1Score, team2Score };
                hasUpdates = true;
            }
            const knockoutCount = Object.keys(this.pendingKnockoutScores).length;
            this.pendingKnockoutScores = {};

            if (Object.keys(knockoutUpdates).length > 0) {
                await database.ref(`${basePath}/knockoutScores`).update(knockoutUpdates);
            }

            if (hasUpdates) {
                console.log(`✅ Saved ${groupCount} group + ${knockoutCount} knockout scores`);
            }
        } catch (err) {
            console.error('❌ Error saving scores:', err.code || err.message);
            if (typeof showToast === 'function') {
                showToast('⚠️ Score save failed — ' + (err.code || 'permission denied'));
            }
        } finally {
            // Brief delay so the listener ignores the echo snapshot
            setTimeout(() => { this.isSaving = false; }, 300);
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

    // Internal helper: execute an updates-map write under a pre-flight
    // ensureWriteOwnership() so a returning-on-different-device organiser
    // can recover ownership on the fly. Any server error is logged and
    // surfaced via toast instead of being silently dropped — that was the
    // source of the "saves for a second then reverts" symptom.
    async _writeUpdates(updates, label) {
        await this.ensureWriteOwnership();
        try {
            await database.ref(this.getBasePath()).update(updates);
        } catch (err) {
            console.error(`❌ ${label} save failed:`, err.code || err.message);
            if (typeof showToast === 'function') {
                showToast(`⚠️ ${label} save failed — ${err.code || 'permission denied'}`);
            }
        }
    }

    saveSettingToFirebase(key, value) {
        if (!this.canEdit()) return;
        this._writeUpdates({
            [key]: value,
            'meta/updatedAt': new Date().toISOString(),
        }, 'Settings');
    }

    saveTeamsToFirebase() {
        if (!this.canEdit()) return;
        this._writeUpdates({
            teams: this.teams,
            'meta/updatedAt': new Date().toISOString(),
        }, 'Teams');
    }

    saveGroupsToFirebase() {
        if (!this.canEdit()) return;
        const updates = {};
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            updates[`group${letter}`] = this[`group${letter}`];
        });
        updates.teams = this.teams;
        updates['meta/updatedAt'] = new Date().toISOString();
        this._writeUpdates(updates, 'Groups');
    }

    saveFixturesToFirebase() {
        if (!this.canEdit()) return;

        const basePath = this.getBasePath();
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            database.ref(`${basePath}/group${letter}Fixtures`).set(this[`group${letter}Fixtures`]);
        });
        database.ref(`${basePath}/meta/updatedAt`).set(new Date().toISOString());
    }

    saveCourtNamesToFirebase() {
        if (!this.canEdit()) return;
        
        database.ref(`${this.getBasePath()}/courtNames`).set(this.courtNames);
        database.ref(`${this.getBasePath()}/meta/updatedAt`).set(new Date().toISOString());
    }

    // ===== TEAM MANAGEMENT =====

    addTeam(player1Name, player1Rating, player2Name, player2Rating, customName = null) {
        if (!this.canEdit()) return null;
        
        const id = this.teams.length + 1;
        const combinedRating = calculateCombinedRating(player1Rating, player2Rating);
        const name = customName || generateTeamName(player1Name, player2Name);
        
        const team = {
            id,
            name,
            player1Name,
            player1Rating: parseFloat(player1Rating),
            player2Name,
            player2Rating: parseFloat(player2Rating),
            combinedRating,
            group: null
        };
        
        this.teams.push(team);
        this.saveToFirebaseDebounced();
        return team;
    }

    updateTeam(teamId, updates) {
        if (!this.canEdit()) return;
        
        const teamIndex = this.teams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) return;
        
        const team = this.teams[teamIndex];
        
        if (updates.player1Name !== undefined) team.player1Name = updates.player1Name;
        if (updates.player1Rating !== undefined) team.player1Rating = parseFloat(updates.player1Rating);
        if (updates.player2Name !== undefined) team.player2Name = updates.player2Name;
        if (updates.player2Rating !== undefined) team.player2Rating = parseFloat(updates.player2Rating);
        if (updates.name !== undefined) team.name = updates.name;
        
        // Recalculate combined rating
        team.combinedRating = calculateCombinedRating(team.player1Rating, team.player2Rating);
        
        // Auto-update name if not custom
        if (updates.player1Name !== undefined || updates.player2Name !== undefined) {
            if (!updates.name) {
                team.name = generateTeamName(team.player1Name, team.player2Name);
            }
        }
        
        this.teams[teamIndex] = team;
        this.saveToFirebaseDebounced();
    }

    removeTeam(teamId) {
        if (!this.canEdit()) return;
        
        this.teams = this.teams.filter(t => t.id !== teamId);
        
        // Re-number team IDs
        this.teams.forEach((team, index) => {
            team.id = index + 1;
        });
        
        // Clear groups and fixtures
        this._clearAllGroups();

        this.saveToFirebase();
    }

    // ===== GROUP MANAGEMENT =====

    _clearAllGroups() {
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            this[`group${letter}`] = [];
            this[`group${letter}Fixtures`] = [];
        });
        const scores = {};
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => { scores[letter] = {}; });
        this.groupMatchScores = scores;
    }

    /** Get the group array property name for a letter, e.g. 'A' -> 'groupA' */
    _groupProp(letter) { return `group${letter}`; }
    /** Get the fixtures array property name for a letter */
    _fixtureProp(letter) { return `group${letter}Fixtures`; }

    /** Get active group letters based on current groupMode */
    getActiveGroupLetters() {
        return getActiveGroups(this.groupMode);
    }

    setGroupMode(mode) {
        if (!this.canEdit()) return;

        const validModes = Object.values(CONFIG.GROUP_MODES);
        if (!validModes.includes(mode)) {
            console.error('Invalid group mode:', mode);
            return;
        }

        this.groupMode = mode;
        this._clearAllGroups();
        this.saveToFirebase();
    }

    splitIntoGroups() {
        if (!this.canEdit()) return false;

        if (this.teams.length < 2) {
            console.error('Need at least 2 teams to split into groups');
            return false;
        }

        // Clear all groups first
        this._clearAllGroups();

        const groupCount = CONFIG.GROUP_COUNT[this.groupMode] || 1;

        if (this.groupMode === CONFIG.GROUP_MODES.SINGLE) {
            // All teams in group A
            this.groupA = this.teams.map(t => t.id);
            this.teams.forEach(team => { team.group = 'A'; });
        } else if (this.groupMode === CONFIG.GROUP_MODES.TWO_GROUPS) {
            // Split into two balanced groups using snake draft
            const { groupA, groupB } = splitTeamsIntoGroups(this.teams);
            this.groupA = groupA.map(t => t.id);
            this.groupB = groupB.map(t => t.id);
            groupA.forEach(t => {
                const team = this.teams.find(tm => tm.id === t.id);
                if (team) team.group = 'A';
            });
            groupB.forEach(t => {
                const team = this.teams.find(tm => tm.id === t.id);
                if (team) team.group = 'B';
            });
        } else {
            // 4, 6, or 9 groups - use random draw into N groups
            const result = splitTeamsIntoNGroups(this.teams, groupCount);
            const activeLetters = this.getActiveGroupLetters();

            activeLetters.forEach(letter => {
                const groupTeams = result[letter] || [];
                this[`group${letter}`] = groupTeams.map(t => t.id);
                groupTeams.forEach(t => {
                    const team = this.teams.find(tm => tm.id === t.id);
                    if (team) team.group = letter;
                });
            });
        }

        this.saveToFirebase();
        return true;
    }

    generateFixtures() {
        if (!this.canEdit()) return false;

        if (this.groupA.length === 0) {
            console.error('Split teams into groups first');
            return false;
        }

        const activeLetters = this.getActiveGroupLetters();

        // Generate fixtures for each active group
        activeLetters.forEach(letter => {
            const teamIds = this[`group${letter}`];
            const groupTeams = teamIds.map(id => this.teams.find(t => t.id === id)).filter(Boolean);
            this[`group${letter}Fixtures`] = groupTeams.length > 0 ? generateRoundRobinFixtures(groupTeams) : [];
        });

        // Clear fixtures for inactive groups
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            if (!activeLetters.includes(letter)) {
                this[`group${letter}Fixtures`] = [];
            }
        });

        // Clear existing scores
        const scores = {};
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => { scores[letter] = {}; });
        this.groupMatchScores = scores;

        // Rebuild the court schedule from scratch on every fixture generation.
        this.rebuildCourtSchedule();

        this.saveToFirebase();
        return true;
    }

    // ===== COURT SCHEDULE =====

    /**
     * Rebuild the court schedule by running the packer over current fixtures.
     * Overwrites any manual overrides (matches the "always re-pack from scratch"
     * policy when courts or fixtures change).
     */
    rebuildCourtSchedule() {
        const activeLetters = this.getActiveGroupLetters();
        if (typeof buildCourtSchedule !== 'function') {
            console.warn('buildCourtSchedule not loaded yet');
            this.courtSchedule = [];
            return;
        }
        this.courtSchedule = buildCourtSchedule(activeLetters, this, Math.max(1, this.courtCount || 4));
    }

    /**
     * Move a match from one court round to another.
     * Validates:
     *  - target CR isn't already at capacity
     *  - target CR doesn't already contain another match from the same
     *    group on a different genRound (would cause a team collision)
     * Returns { ok: boolean, reason?: string }.
     */
    moveMatchToCourtRound(sourceCR, sourceIdx, targetCR) {
        if (!this.canEdit()) return { ok: false, reason: 'Not organiser' };
        if (!Array.isArray(this.courtSchedule)) return { ok: false, reason: 'No schedule' };
        const src = this.courtSchedule[sourceCR];
        if (!src || !src[sourceIdx]) return { ok: false, reason: 'Invalid source' };

        // Create target CR if user picked "new" (sentinel = courtSchedule.length)
        if (targetCR === this.courtSchedule.length) {
            this.courtSchedule.push([]);
        }
        const dst = this.courtSchedule[targetCR];
        if (!dst) return { ok: false, reason: 'Invalid target' };
        if (sourceCR === targetCR) return { ok: false, reason: 'Same court round' };

        const ref = src[sourceIdx];
        const courtCount = Math.max(1, this.courtCount || 4);

        if (dst.length >= courtCount) {
            return { ok: false, reason: `Court round full (${courtCount})` };
        }

        // Team-collision check: if dst already has a match from the same group
        // on a DIFFERENT genRound, reject. (Same genRound is always fine — the
        // generator guarantees it's conflict-free.)
        const conflict = dst.find(r => r.group === ref.group && r.genRound !== ref.genRound);
        if (conflict) {
            return { ok: false, reason: `Team conflict: Group ${ref.group} R${conflict.genRound} already in this court round` };
        }

        // Perform the move.
        src.splice(sourceIdx, 1);
        dst.push(ref);

        // Remove the source CR if it's now empty and isn't the last one.
        if (src.length === 0) {
            this.courtSchedule.splice(sourceCR, 1);
        }

        this.saveSettingToFirebase('courtSchedule', this.courtSchedule);
        return { ok: true };
    }

    // ===== SCORE MANAGEMENT =====

    updateGroupScore(group, team1Id, team2Id, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        const matchKey = `${team1Id}-${team2Id}`;
        
        if (!this.groupMatchScores[group]) {
            this.groupMatchScores[group] = {};
        }
        
        this.groupMatchScores[group][matchKey] = { 
            team1Score: team1Score !== null ? parseInt(team1Score) : null, 
            team2Score: team2Score !== null ? parseInt(team2Score) : null 
        };
        
        this.saveGroupScoreToFirebase(group, matchKey, 
            team1Score !== null ? parseInt(team1Score) : null, 
            team2Score !== null ? parseInt(team2Score) : null
        );
        
        // Auto-update knockout bracket based on current standings
        this.autoUpdateKnockoutBracket();
    }
    
    /**
     * Auto-populate knockout bracket based on current standings
     * This shows potential matchups even before group stage is complete
     */
    autoUpdateKnockoutBracket() {
        // Skip auto-update for 6/9 groups - manual knockout assignment only
        const groupCount = CONFIG.GROUP_COUNT[this.groupMode] || 1;
        if (groupCount > 4) return;

        const groupAStandings = this.getGroupStandings('A');
        const groupBStandings = this.getGroupStandings('B');
        const groupCStandings = this.getGroupStandings('C');
        const groupDStandings = this.getGroupStandings('D');

        if (this.groupMode === CONFIG.GROUP_MODES.FOUR_GROUPS) {
            this._autoUpdateFourGroupKnockout(groupAStandings, groupBStandings, groupCStandings, groupDStandings);
        } else if (this.groupMode === CONFIG.GROUP_MODES.SINGLE) {
            if (groupAStandings.length >= 8) {
                const seeding = CONFIG.SINGLE_GROUP_SEEDING;
                this.knockoutTeams.qf1 = { team1: groupAStandings[seeding.qf1.team1 - 1]?.teamId || null, team2: groupAStandings[seeding.qf1.team2 - 1]?.teamId || null };
                this.knockoutTeams.qf2 = { team1: groupAStandings[seeding.qf2.team1 - 1]?.teamId || null, team2: groupAStandings[seeding.qf2.team2 - 1]?.teamId || null };
                this.knockoutTeams.qf3 = { team1: groupAStandings[seeding.qf3.team1 - 1]?.teamId || null, team2: groupAStandings[seeding.qf3.team2 - 1]?.teamId || null };
                this.knockoutTeams.qf4 = { team1: groupAStandings[seeding.qf4.team1 - 1]?.teamId || null, team2: groupAStandings[seeding.qf4.team2 - 1]?.teamId || null };
            }
        } else {
            // Two groups mode
            if (groupAStandings.length >= 4 && groupBStandings.length >= 4) {
                this.knockoutTeams.qf1 = { team1: groupAStandings[0]?.teamId || null, team2: groupBStandings[3]?.teamId || null };
                this.knockoutTeams.qf2 = { team1: groupAStandings[1]?.teamId || null, team2: groupBStandings[2]?.teamId || null };
                this.knockoutTeams.qf3 = { team1: groupAStandings[2]?.teamId || null, team2: groupBStandings[1]?.teamId || null };
                this.knockoutTeams.qf4 = { team1: groupAStandings[3]?.teamId || null, team2: groupBStandings[0]?.teamId || null };
            }
        }

        // Save knockout teams to Firebase
        this.isSaving = true;
        database.ref(`${this.getBasePath()}/knockoutTeams`).set(this.knockoutTeams).then(() => {
            this.isSaving = false;
        }).catch(() => {
            this.isSaving = false;
        });

        // Re-render to reflect updated bracket
        renderTeamLeague();
    }

    _autoUpdateFourGroupKnockout(aStandings, bStandings, cStandings, dStandings) {
        const standings = { A: aStandings, B: bStandings, C: cStandings, D: dStandings };
        const get = (code) => {
            // code like 'A1' means group A, position 1
            const group = code[0];
            const pos = parseInt(code.slice(1)) - 1;
            return standings[group]?.[pos]?.teamId || null;
        };

        const q = this.qualifiersPerGroup || 2;

        if (q === 4) {
            // R16 seeding
            const seeding = CONFIG.FOUR_GROUP_SEEDING_R16;
            for (const [matchId, s] of Object.entries(seeding)) {
                this.knockoutTeams[matchId] = { team1: get(s.team1), team2: get(s.team2) };
            }
        } else if (q === 2) {
            // QF seeding
            const seeding = CONFIG.FOUR_GROUP_SEEDING_QF;
            for (const [matchId, s] of Object.entries(seeding)) {
                this.knockoutTeams[matchId] = { team1: get(s.team1), team2: get(s.team2) };
            }
        } else if (q === 1) {
            // SF seeding
            const seeding = CONFIG.FOUR_GROUP_SEEDING_SF;
            for (const [matchId, s] of Object.entries(seeding)) {
                this.knockoutTeams[matchId] = { team1: get(s.team1), team2: get(s.team2) };
            }
        }
    }

    clearGroupScore(group, team1Id, team2Id) {
        if (!this.canEdit()) return;
        
        const matchKey = `${team1Id}-${team2Id}`;
        
        if (this.groupMatchScores[group] && this.groupMatchScores[group][matchKey]) {
            delete this.groupMatchScores[group][matchKey];
            database.ref(`${this.getBasePath()}/groupMatchScores/${group}/${matchKey}`).remove();
            
            // Auto-update knockout bracket based on new standings
            this.autoUpdateKnockoutBracket();
        }
    }

    getGroupScore(group, team1Id, team2Id) {
        const matchKey = `${team1Id}-${team2Id}`;
        return this.groupMatchScores[group]?.[matchKey] || { team1Score: null, team2Score: null };
    }

    isGroupMatchComplete(group, team1Id, team2Id) {
        const score = this.getGroupScore(group, team1Id, team2Id);
        return score.team1Score !== null && score.team2Score !== null;
    }

    // ===== KNOCKOUT MANAGEMENT =====

    updateKnockoutScore(matchId, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        this.knockoutScores[matchId] = { 
            team1Score: team1Score !== null ? parseInt(team1Score) : null, 
            team2Score: team2Score !== null ? parseInt(team2Score) : null 
        };
        
        this.saveKnockoutScoreToFirebase(matchId, 
            team1Score !== null ? parseInt(team1Score) : null, 
            team2Score !== null ? parseInt(team2Score) : null
        );
        
        // Auto-progress winners
        this.updateKnockoutProgression();
    }

    clearKnockoutScore(matchId) {
        if (!this.canEdit()) return;
        
        this.knockoutScores[matchId] = { team1Score: null, team2Score: null };
        database.ref(`${this.getBasePath()}/knockoutScores/${matchId}`).remove();
        
        // Clear dependent matches
        this.clearKnockoutProgression(matchId);
    }

    getKnockoutScore(matchId) {
        return this.knockoutScores[matchId] || { team1Score: null, team2Score: null };
    }

    isKnockoutMatchComplete(matchId) {
        const score = this.getKnockoutScore(matchId);
        return score.team1Score !== null && score.team2Score !== null;
    }

    getKnockoutMatchWinner(matchId) {
        const score = this.getKnockoutScore(matchId);
        if (score.team1Score === null || score.team2Score === null) return null;
        
        const teams = this.knockoutTeams[matchId];
        if (!teams) return null;
        
        if (score.team1Score > score.team2Score) return teams.team1;
        if (score.team2Score > score.team1Score) return teams.team2;
        return null;
    }

    getKnockoutMatchLoser(matchId) {
        const score = this.getKnockoutScore(matchId);
        if (score.team1Score === null || score.team2Score === null) return null;
        
        const teams = this.knockoutTeams[matchId];
        if (!teams) return null;
        
        if (score.team1Score > score.team2Score) return teams.team2;
        if (score.team2Score > score.team1Score) return teams.team1;
        return null;
    }

    setKnockoutTeamsFromStandings() {
        if (!this.canEdit()) return;

        // 6/9 groups: no automatic seeding
        const groupCount = CONFIG.GROUP_COUNT[this.groupMode] || 1;
        if (groupCount > 4) {
            console.log('⚠️ Auto knockout seeding not available for 6+ groups. Set teams manually.');
            return;
        }

        const groupAStandings = this.getGroupStandings('A');
        const groupBStandings = this.getGroupStandings('B');
        const groupCStandings = this.getGroupStandings('C');
        const groupDStandings = this.getGroupStandings('D');
        const knockoutFormat = this.knockoutFormat || 'quarter_final';

        // Four groups mode — delegate to helper
        if (this.groupMode === CONFIG.GROUP_MODES.FOUR_GROUPS) {
            this._autoUpdateFourGroupKnockout(groupAStandings, groupBStandings, groupCStandings, groupDStandings);
            this.saveToFirebase();
            return;
        }

        // Final Only - top 2 overall
        if (knockoutFormat === 'final_only') {
            if (this.groupMode === CONFIG.GROUP_MODES.SINGLE) {
                this.knockoutTeams.final = { team1: groupAStandings[0]?.teamId, team2: groupAStandings[1]?.teamId };
            } else {
                this.knockoutTeams.final = { team1: groupAStandings[0]?.teamId, team2: groupBStandings[0]?.teamId };
            }
            this.saveToFirebase();
            return;
        }

        // Semi Final - top 4
        if (knockoutFormat === 'semi_final') {
            if (this.groupMode === CONFIG.GROUP_MODES.SINGLE) {
                this.knockoutTeams.sf1 = { team1: groupAStandings[0]?.teamId, team2: groupAStandings[3]?.teamId };
                this.knockoutTeams.sf2 = { team1: groupAStandings[1]?.teamId, team2: groupAStandings[2]?.teamId };
            } else {
                this.knockoutTeams.sf1 = { team1: groupAStandings[0]?.teamId, team2: groupBStandings[1]?.teamId };
                this.knockoutTeams.sf2 = { team1: groupAStandings[1]?.teamId, team2: groupBStandings[0]?.teamId };
            }
            this.saveToFirebase();
            return;
        }

        // Quarter Final (default) - top 8
        if (this.groupMode === CONFIG.GROUP_MODES.SINGLE) {
            if (groupAStandings.length >= 8) {
                const seeding = CONFIG.SINGLE_GROUP_SEEDING;
                this.knockoutTeams.qf1 = { team1: groupAStandings[seeding.qf1.team1 - 1]?.teamId, team2: groupAStandings[seeding.qf1.team2 - 1]?.teamId };
                this.knockoutTeams.qf2 = { team1: groupAStandings[seeding.qf2.team1 - 1]?.teamId, team2: groupAStandings[seeding.qf2.team2 - 1]?.teamId };
                this.knockoutTeams.qf3 = { team1: groupAStandings[seeding.qf3.team1 - 1]?.teamId, team2: groupAStandings[seeding.qf3.team2 - 1]?.teamId };
                this.knockoutTeams.qf4 = { team1: groupAStandings[seeding.qf4.team1 - 1]?.teamId, team2: groupAStandings[seeding.qf4.team2 - 1]?.teamId };
            }
        } else {
            if (groupAStandings.length >= 4 && groupBStandings.length >= 4) {
                this.knockoutTeams.qf1 = { team1: groupAStandings[0]?.teamId, team2: groupBStandings[3]?.teamId };
                this.knockoutTeams.qf2 = { team1: groupAStandings[1]?.teamId, team2: groupBStandings[2]?.teamId };
                this.knockoutTeams.qf3 = { team1: groupAStandings[2]?.teamId, team2: groupBStandings[1]?.teamId };
                this.knockoutTeams.qf4 = { team1: groupAStandings[3]?.teamId, team2: groupBStandings[0]?.teamId };
            }
        }

        this.saveToFirebase();
    }

    updateKnockoutProgression() {
        const knockoutFormat = this.knockoutFormat || 'quarter_final';

        // Final only has no progression
        if (knockoutFormat === 'final_only') {
            return;
        }

        // Semi final format - just progress SF winners to final
        if (knockoutFormat === 'semi_final') {
            const sf1Winner = this.getKnockoutMatchWinner('sf1');
            const sf1Loser = this.getKnockoutMatchLoser('sf1');
            const sf2Winner = this.getKnockoutMatchWinner('sf2');
            const sf2Loser = this.getKnockoutMatchLoser('sf2');

            if (this.includeThirdPlace && sf1Loser && sf2Loser) {
                this.knockoutTeams.thirdPlace = { team1: sf1Loser, team2: sf2Loser };
            }
            if (sf1Winner && sf2Winner) {
                this.knockoutTeams.final = { team1: sf1Winner, team2: sf2Winner };
            }

            this.saveToFirebase();
            return;
        }

        // Round of 16 format — R16 winners feed into QF
        if (knockoutFormat === 'round_of_16') {
            const r16Map = CONFIG.R16_TO_QF;
            for (const [qfId, [r16a, r16b]] of Object.entries(r16Map)) {
                const winnerA = this.getKnockoutMatchWinner(r16a);
                const winnerB = this.getKnockoutMatchWinner(r16b);
                if (winnerA && winnerB) {
                    this.knockoutTeams[qfId] = { team1: winnerA, team2: winnerB };
                }
            }
        }

        // Quarter final progression (shared by QF and R16 formats)
        const qf1Winner = this.getKnockoutMatchWinner('qf1');
        const qf2Winner = this.getKnockoutMatchWinner('qf2');
        const qf3Winner = this.getKnockoutMatchWinner('qf3');
        const qf4Winner = this.getKnockoutMatchWinner('qf4');

        if (qf1Winner && qf2Winner) {
            this.knockoutTeams.sf1 = { team1: qf1Winner, team2: qf2Winner };
        }

        if (qf3Winner && qf4Winner) {
            this.knockoutTeams.sf2 = { team1: qf3Winner, team2: qf4Winner };
        }

        // SF results
        const sf1Winner = this.getKnockoutMatchWinner('sf1');
        const sf1Loser = this.getKnockoutMatchLoser('sf1');
        const sf2Winner = this.getKnockoutMatchWinner('sf2');
        const sf2Loser = this.getKnockoutMatchLoser('sf2');

        if (this.includeThirdPlace && sf1Loser && sf2Loser) {
            this.knockoutTeams.thirdPlace = { team1: sf1Loser, team2: sf2Loser };
        }
        if (sf1Winner && sf2Winner) {
            this.knockoutTeams.final = { team1: sf1Winner, team2: sf2Winner };
        }

        this.saveToFirebase();
    }

    clearKnockoutProgression(fromMatchId) {
        const clearOrder = {
            'r16_1': ['qf1', 'sf1', 'thirdPlace', 'final'],
            'r16_2': ['qf1', 'sf1', 'thirdPlace', 'final'],
            'r16_3': ['qf2', 'sf1', 'thirdPlace', 'final'],
            'r16_4': ['qf2', 'sf1', 'thirdPlace', 'final'],
            'r16_5': ['qf3', 'sf2', 'thirdPlace', 'final'],
            'r16_6': ['qf3', 'sf2', 'thirdPlace', 'final'],
            'r16_7': ['qf4', 'sf2', 'thirdPlace', 'final'],
            'r16_8': ['qf4', 'sf2', 'thirdPlace', 'final'],
            'qf1': ['sf1', 'thirdPlace', 'final'],
            'qf2': ['sf1', 'thirdPlace', 'final'],
            'qf3': ['sf2', 'thirdPlace', 'final'],
            'qf4': ['sf2', 'thirdPlace', 'final'],
            'sf1': ['thirdPlace', 'final'],
            'sf2': ['thirdPlace', 'final'],
            'thirdPlace': [],
            'final': []
        };
        
        const toClear = clearOrder[fromMatchId] || [];
        toClear.forEach(matchId => {
            this.knockoutTeams[matchId] = { team1: null, team2: null };
            this.knockoutScores[matchId] = { team1Score: null, team2Score: null };
        });
        
        this.saveToFirebase();
    }

    // ===== STANDINGS =====

    getGroupStandings(group) {
        const teamIds = this[`group${group}`] || [];
        const scores = this.groupMatchScores[group] || {};
        
        const standings = teamIds.map(teamId => {
            const team = this.teams.find(t => t.id === teamId);
            if (!team) return null;
            
            return {
                teamId,
                team,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                gamesFor: 0,
                gamesAgainst: 0,
                gamesDiff: 0,
                points: 0
            };
        }).filter(Boolean);
        
        // Process scores
        Object.entries(scores).forEach(([matchKey, score]) => {
            if (score.team1Score === null || score.team2Score === null) return;
            
            const [team1Id, team2Id] = matchKey.split('-').map(Number);
            const team1Stats = standings.find(s => s.teamId === team1Id);
            const team2Stats = standings.find(s => s.teamId === team2Id);
            
            if (!team1Stats || !team2Stats) return;
            
            team1Stats.played++;
            team2Stats.played++;
            
            team1Stats.gamesFor += score.team1Score;
            team1Stats.gamesAgainst += score.team2Score;
            team2Stats.gamesFor += score.team2Score;
            team2Stats.gamesAgainst += score.team1Score;
            
            if (score.team1Score > score.team2Score) {
                team1Stats.won++;
                team1Stats.points += CONFIG.POINTS_WIN;
                team2Stats.lost++;
            } else if (score.team2Score > score.team1Score) {
                team2Stats.won++;
                team2Stats.points += CONFIG.POINTS_WIN;
                team1Stats.lost++;
            } else {
                team1Stats.drawn++;
                team2Stats.drawn++;
                team1Stats.points += CONFIG.POINTS_DRAW;
                team2Stats.points += CONFIG.POINTS_DRAW;
            }
        });
        
        // Calculate games diff
        standings.forEach(s => {
            s.gamesDiff = s.gamesFor - s.gamesAgainst;
        });
        
        // Sort
        standings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
            return b.gamesFor - a.gamesFor;
        });
        
        return standings;
    }

    getQualifiedTeams(group) {
        const standings = this.getGroupStandings(group);
        const qualifyCount = this.groupMode === CONFIG.GROUP_MODES.SINGLE 
            ? CONFIG.KNOCKOUT_QUALIFIERS.SINGLE_GROUP 
            : CONFIG.KNOCKOUT_QUALIFIERS.TWO_GROUPS;
        return standings.slice(0, qualifyCount);
    }

    // ===== HELPER METHODS =====

    getTeamById(teamId) {
        return this.teams.find(t => t.id === teamId);
    }

    getTeamsInGroup(group) {
        const teamIds = this[`group${group}`] || [];
        return teamIds.map(id => this.getTeamById(id)).filter(Boolean);
    }

    getTotalGroupMatches(group) {
        const fixtures = this[`group${group}Fixtures`] || [];
        return fixtures.reduce((total, round) => total + round.matches.length, 0);
    }

    getCompletedGroupMatches(group) {
        const scores = this.groupMatchScores[group] || {};
        return Object.values(scores).filter(s => s.team1Score !== null && s.team2Score !== null).length;
    }

    isGroupStageComplete(group) {
        return this.getCompletedGroupMatches(group) === this.getTotalGroupMatches(group);
    }

    // ===== SETTINGS =====

    setIncludeThirdPlace(include) {
        if (!this.canEdit()) return;
        this.includeThirdPlace = include;
        this.saveSettingToFirebase('includeThirdPlace', include);
    }

    updateGroupMaxScore(value) {
        if (!this.canEdit()) return;
        this.groupMaxScore = parseInt(value);
        this.saveSettingToFirebase('groupMaxScore', this.groupMaxScore);
    }

    updateKnockoutMaxScore(value) {
        if (!this.canEdit()) return;
        this.knockoutMaxScore = parseInt(value);
        this.saveSettingToFirebase('knockoutMaxScore', this.knockoutMaxScore);
    }

    // ===== BACKUP/RESTORE =====

    createBackup(name) {
        if (!this.canEdit()) return null;
        
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const backup = {
            id: Date.now(),
            name: name || `Backup ${timestamp}`,
            timestamp,
            teams: JSON.parse(JSON.stringify(this.teams)),
            groupMatchScores: JSON.parse(JSON.stringify(this.groupMatchScores)),
            knockoutScores: JSON.parse(JSON.stringify(this.knockoutScores)),
            knockoutTeams: JSON.parse(JSON.stringify(this.knockoutTeams))
        };
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            backup[`group${letter}`] = [...(this[`group${letter}`] || [])];
            backup[`group${letter}Fixtures`] = JSON.parse(JSON.stringify(this[`group${letter}Fixtures`] || []));
        });
        
        this.savedVersions.unshift(backup);
        if (this.savedVersions.length > CONFIG.MAX_SAVED_VERSIONS) {
            this.savedVersions = this.savedVersions.slice(0, CONFIG.MAX_SAVED_VERSIONS);
        }
        
        this.saveToFirebase();
        return backup;
    }

    resetAllScores() {
        if (!this.canEdit()) return;
        
        this.createBackup('Auto-backup before reset');
        const scores = {};
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => { scores[letter] = {}; });
        this.groupMatchScores = scores;
        this.knockoutScores = {
            qf1: { team1Score: null, team2Score: null },
            qf2: { team1Score: null, team2Score: null },
            qf3: { team1Score: null, team2Score: null },
            qf4: { team1Score: null, team2Score: null },
            sf1: { team1Score: null, team2Score: null },
            sf2: { team1Score: null, team2Score: null },
            thirdPlace: { team1Score: null, team2Score: null },
            final: { team1Score: null, team2Score: null }
        };
        this.knockoutTeams = {
            qf1: { team1: null, team2: null },
            qf2: { team1: null, team2: null },
            qf3: { team1: null, team2: null },
            qf4: { team1: null, team2: null },
            sf1: { team1: null, team2: null },
            sf2: { team1: null, team2: null },
            thirdPlace: { team1: null, team2: null },
            final: { team1: null, team2: null }
        };
        
        this.saveToFirebase();
    }

    // ===== EXPORT =====

    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            formatType: this.formatType,
            tournamentId: this.tournamentId,
            tournamentName: this.tournamentName,
            teamCount: this.teamCount,
            groupMode: this.groupMode,
            includeThirdPlace: this.includeThirdPlace,
            teams: this.teams,
            groupMatchScores: this.groupMatchScores,
            knockoutScores: this.knockoutScores,
            knockoutTeams: this.knockoutTeams
        };
        CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
            data[`group${letter}`] = this[`group${letter}`];
            data[`group${letter}Fixtures`] = this[`group${letter}Fixtures`];
        });
        return data;
    }
}

// Global state instance
let state = null;

// Placeholder render function (implemented in components.js)
function renderTeamLeague() {
    if (typeof TeamLeagueApp !== 'undefined') {
        TeamLeagueApp.render();
    } else {
        console.log('⏳ Components not loaded yet');
    }
}

console.log('✅ Team Tournament State loaded');
