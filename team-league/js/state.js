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
        this.knockoutFormat = 'quarter_final'; // 'final_only', 'semi_final', 'quarter_final'
        
        // Teams data: { id, name, player1Name, player1Rating, player2Name, player2Rating, combinedRating, group }
        this.teams = [];
        
        // Group assignments (team IDs)
        this.groupA = [];
        this.groupB = [];
        
        // Generated fixtures per group
        this.groupAFixtures = [];
        this.groupBFixtures = [];
        
        // Match scores
        this.groupMatchScores = {
            A: {},
            B: {}
        };
        
        // Knockout scores
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
        
        // Registered players (Phase 4 - Browse & Join)
        this.registeredPlayers = {};
        
        // Knockout team assignments
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
        
        // Max scores for different stages
        this.groupMaxScore = CONFIG.DEFAULT_MAX_SCORE;
        this.knockoutMaxScore = CONFIG.KNOCKOUT_MAX_SCORE;
        this.semiMaxScore = CONFIG.SEMI_MAX_SCORE;
        this.thirdPlaceMaxScore = CONFIG.THIRD_PLACE_MAX_SCORE;
        this.finalMaxScore = CONFIG.FINAL_MAX_SCORE;
        
        // Court names
        this.courtNames = {
            group: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
            knockout: {
                qf1: 'Court 1', qf2: 'Court 2', qf3: 'Court 3', qf4: 'Court 4',
                sf1: 'Centre Court', sf2: 'Court 1',
                thirdPlace: 'Court 1',
                final: 'Centre Court'
            }
        };
        
        // Match naming
        this.knockoutNames = {
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
        
        // Teams (static)
        this.teams = data.teams || [];
        this.groupA = data.groupA || [];
        this.groupB = data.groupB || [];
        
        // Fixtures (static)
        this.groupAFixtures = data.groupAFixtures || [];
        this.groupBFixtures = data.groupBFixtures || [];
        
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
        this.groupMatchScores = data.groupMatchScores || { A: {}, B: {} };
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
        
        this.groupMatchScores = groupMatchScores || { A: {}, B: {} };
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
        database.ref(`${basePath}/groupMatchScores`).on('value', (snapshot) => {
            if (!this.isSaving) {
                this.groupMatchScores = snapshot.val() || { A: {}, B: {} };
                renderTeamLeague();
            }
        });
        
        database.ref(`${basePath}/knockoutScores`).on('value', (snapshot) => {
            if (!this.isSaving) {
                this.knockoutScores = snapshot.val() || this.knockoutScores;
                renderTeamLeague();
            }
        });
        
        database.ref(`${basePath}/knockoutTeams`).on('value', (snapshot) => {
            if (!this.isSaving) {
                this.knockoutTeams = snapshot.val() || this.knockoutTeams;
                renderTeamLeague();
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
        updates[`${basePath}/teamCount`] = this.teamCount;
        updates[`${basePath}/groupMode`] = this.groupMode;
        updates[`${basePath}/includeThirdPlace`] = this.includeThirdPlace;
        updates[`${basePath}/teams`] = this.teams;
        updates[`${basePath}/groupA`] = this.groupA;
        updates[`${basePath}/groupB`] = this.groupB;
        updates[`${basePath}/groupAFixtures`] = this.groupAFixtures;
        updates[`${basePath}/groupBFixtures`] = this.groupBFixtures;
        updates[`${basePath}/groupMatchScores`] = this.groupMatchScores;
        updates[`${basePath}/knockoutScores`] = this.knockoutScores;
        updates[`${basePath}/knockoutTeams`] = this.knockoutTeams;
        updates[`${basePath}/groupMaxScore`] = this.groupMaxScore;
        updates[`${basePath}/knockoutMaxScore`] = this.knockoutMaxScore;
        updates[`${basePath}/semiMaxScore`] = this.semiMaxScore;
        updates[`${basePath}/thirdPlaceMaxScore`] = this.thirdPlaceMaxScore;
        updates[`${basePath}/finalMaxScore`] = this.finalMaxScore;
        updates[`${basePath}/knockoutNames`] = this.knockoutNames;
        updates[`${basePath}/courtNames`] = this.courtNames;
        updates[`${basePath}/savedVersions`] = this.savedVersions;
        updates[`${basePath}/registeredPlayers`] = this.registeredPlayers || {};
        
        database.ref().update(updates).then(() => {
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
    flushPendingScores() {
        const basePath = this.getBasePath();
        const updates = {};
        let hasUpdates = false;
        
        // Add pending group scores
        for (const key in this.pendingGroupScores) {
            const { group, matchKey, team1Score, team2Score } = this.pendingGroupScores[key];
            updates[`${basePath}/groupMatchScores/${group}/${matchKey}`] = { team1Score, team2Score };
            hasUpdates = true;
        }
        
        // Add pending knockout scores
        for (const matchId in this.pendingKnockoutScores) {
            const { team1Score, team2Score } = this.pendingKnockoutScores[matchId];
            updates[`${basePath}/knockoutScores/${matchId}`] = { team1Score, team2Score };
            hasUpdates = true;
        }
        
        if (hasUpdates) {
            updates[`${basePath}/meta/updatedAt`] = new Date().toISOString();
            
            database.ref().update(updates)
                .then(() => {
                    console.log(`✅ Saved ${Object.keys(this.pendingGroupScores).length} group + ${Object.keys(this.pendingKnockoutScores).length} knockout scores`);
                })
                .catch(err => {
                    console.error('❌ Error saving scores:', err);
                });
            
            this.pendingGroupScores = {};
            this.pendingKnockoutScores = {};
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

    saveSettingToFirebase(key, value) {
        if (!this.canEdit()) return;
        
        database.ref(`${this.getBasePath()}/${key}`).set(value);
        database.ref(`${this.getBasePath()}/meta/updatedAt`).set(new Date().toISOString());
    }

    saveTeamsToFirebase() {
        if (!this.canEdit()) return;
        
        database.ref(`${this.getBasePath()}/teams`).set(this.teams);
        database.ref(`${this.getBasePath()}/meta/updatedAt`).set(new Date().toISOString());
    }

    saveGroupsToFirebase() {
        if (!this.canEdit()) return;
        
        const basePath = this.getBasePath();
        database.ref(`${basePath}/groupA`).set(this.groupA);
        database.ref(`${basePath}/groupB`).set(this.groupB);
        database.ref(`${basePath}/teams`).set(this.teams);
        database.ref(`${basePath}/meta/updatedAt`).set(new Date().toISOString());
    }

    saveFixturesToFirebase() {
        if (!this.canEdit()) return;
        
        const basePath = this.getBasePath();
        database.ref(`${basePath}/groupAFixtures`).set(this.groupAFixtures);
        database.ref(`${basePath}/groupBFixtures`).set(this.groupBFixtures);
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
        this.groupA = [];
        this.groupB = [];
        this.groupAFixtures = [];
        this.groupBFixtures = [];
        this.groupMatchScores = { A: {}, B: {} };
        
        this.saveToFirebase();
    }

    // ===== GROUP MANAGEMENT =====

    setGroupMode(mode) {
        if (!this.canEdit()) return;
        
        if (mode !== CONFIG.GROUP_MODES.SINGLE && mode !== CONFIG.GROUP_MODES.TWO_GROUPS) {
            console.error('Invalid group mode');
            return;
        }
        
        this.groupMode = mode;
        
        // Clear existing groups and fixtures
        this.groupA = [];
        this.groupB = [];
        this.groupAFixtures = [];
        this.groupBFixtures = [];
        this.groupMatchScores = { A: {}, B: {} };
        
        this.saveToFirebase();
    }

    splitIntoGroups() {
        if (!this.canEdit()) return false;
        
        if (this.teams.length < 2) {
            console.error('Need at least 2 teams to split into groups');
            return false;
        }
        
        if (this.groupMode === CONFIG.GROUP_MODES.SINGLE) {
            // All teams in group A
            this.groupA = this.teams.map(t => t.id);
            this.groupB = [];
            
            this.teams.forEach(team => {
                team.group = 'A';
            });
        } else {
            // Split into two balanced groups
            const { groupA, groupB } = splitTeamsIntoGroups(this.teams);
            
            this.groupA = groupA.map(t => t.id);
            this.groupB = groupB.map(t => t.id);
            
            groupA.forEach(t => {
                const team = this.teams.find(team => team.id === t.id);
                if (team) team.group = 'A';
            });
            groupB.forEach(t => {
                const team = this.teams.find(team => team.id === t.id);
                if (team) team.group = 'B';
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
        
        const groupATeams = this.groupA.map(id => this.teams.find(t => t.id === id)).filter(Boolean);
        const groupBTeams = this.groupB.map(id => this.teams.find(t => t.id === id)).filter(Boolean);
        
        this.groupAFixtures = generateRoundRobinFixtures(groupATeams);
        
        if (this.groupMode === CONFIG.GROUP_MODES.TWO_GROUPS && groupBTeams.length > 0) {
            this.groupBFixtures = generateRoundRobinFixtures(groupBTeams);
        } else {
            this.groupBFixtures = [];
        }
        
        // Clear existing scores
        this.groupMatchScores = { A: {}, B: {} };
        
        this.saveToFirebase();
        return true;
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
        const groupAStandings = this.getGroupStandings('A');
        const groupBStandings = this.getGroupStandings('B');
        
        if (this.groupMode === CONFIG.GROUP_MODES.SINGLE) {
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
        database.ref(`${this.getBasePath()}/knockoutTeams`).set(this.knockoutTeams);
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
        
        const groupAStandings = this.getGroupStandings('A');
        const groupBStandings = this.getGroupStandings('B');
        const knockoutFormat = this.knockoutFormat || 'quarter_final';
        
        // Final Only - top 2 overall
        if (knockoutFormat === 'final_only') {
            if (this.groupMode === CONFIG.GROUP_MODES.SINGLE) {
                // Single group: 1st vs 2nd
                this.knockoutTeams.final = { team1: groupAStandings[0]?.teamId, team2: groupAStandings[1]?.teamId };
            } else {
                // Two groups: winner of A vs winner of B
                this.knockoutTeams.final = { team1: groupAStandings[0]?.teamId, team2: groupBStandings[0]?.teamId };
            }
            this.saveToFirebase();
            return;
        }
        
        // Semi Final - top 4
        if (knockoutFormat === 'semi_final') {
            if (this.groupMode === CONFIG.GROUP_MODES.SINGLE) {
                // Single group: 1v4, 2v3
                this.knockoutTeams.sf1 = { team1: groupAStandings[0]?.teamId, team2: groupAStandings[3]?.teamId };
                this.knockoutTeams.sf2 = { team1: groupAStandings[1]?.teamId, team2: groupAStandings[2]?.teamId };
            } else {
                // Two groups: A1vB2, A2vB1
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
            
            // 3rd place playoff
            if (this.includeThirdPlace && sf1Loser && sf2Loser) {
                this.knockoutTeams.thirdPlace = { team1: sf1Loser, team2: sf2Loser };
            }
            
            // Final
            if (sf1Winner && sf2Winner) {
                this.knockoutTeams.final = { team1: sf1Winner, team2: sf2Winner };
            }
            
            this.saveToFirebase();
            return;
        }
        
        // Quarter final format (default) - full progression
        // QF winners to SF
        const qf1Winner = this.getKnockoutMatchWinner('qf1');
        const qf2Winner = this.getKnockoutMatchWinner('qf2');
        const qf3Winner = this.getKnockoutMatchWinner('qf3');
        const qf4Winner = this.getKnockoutMatchWinner('qf4');
        
        if (qf1Winner && qf4Winner) {
            this.knockoutTeams.sf1 = { team1: qf1Winner, team2: qf4Winner };
        }
        
        if (qf2Winner && qf3Winner) {
            this.knockoutTeams.sf2 = { team1: qf2Winner, team2: qf3Winner };
        }
        
        // SF results
        const sf1Winner = this.getKnockoutMatchWinner('sf1');
        const sf1Loser = this.getKnockoutMatchLoser('sf1');
        const sf2Winner = this.getKnockoutMatchWinner('sf2');
        const sf2Loser = this.getKnockoutMatchLoser('sf2');
        
        // 3rd place playoff
        if (this.includeThirdPlace && sf1Loser && sf2Loser) {
            this.knockoutTeams.thirdPlace = { team1: sf1Loser, team2: sf2Loser };
        }
        
        // Final
        if (sf1Winner && sf2Winner) {
            this.knockoutTeams.final = { team1: sf1Winner, team2: sf2Winner };
        }
        
        this.saveToFirebase();
    }

    clearKnockoutProgression(fromMatchId) {
        const clearOrder = {
            'qf1': ['sf1', 'thirdPlace', 'final'],
            'qf2': ['sf2', 'thirdPlace', 'final'],
            'qf3': ['sf2', 'thirdPlace', 'final'],
            'qf4': ['sf1', 'thirdPlace', 'final'],
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
        const teamIds = group === 'A' ? this.groupA : this.groupB;
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
        const teamIds = group === 'A' ? this.groupA : this.groupB;
        return teamIds.map(id => this.getTeamById(id)).filter(Boolean);
    }

    getTotalGroupMatches(group) {
        const fixtures = group === 'A' ? this.groupAFixtures : this.groupBFixtures;
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
            groupA: [...this.groupA],
            groupB: [...this.groupB],
            groupAFixtures: JSON.parse(JSON.stringify(this.groupAFixtures)),
            groupBFixtures: JSON.parse(JSON.stringify(this.groupBFixtures)),
            groupMatchScores: JSON.parse(JSON.stringify(this.groupMatchScores)),
            knockoutScores: JSON.parse(JSON.stringify(this.knockoutScores)),
            knockoutTeams: JSON.parse(JSON.stringify(this.knockoutTeams))
        };
        
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
        this.groupMatchScores = { A: {}, B: {} };
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
        return {
            exportDate: new Date().toISOString(),
            formatType: this.formatType,
            tournamentId: this.tournamentId,
            tournamentName: this.tournamentName,
            teamCount: this.teamCount,
            groupMode: this.groupMode,
            includeThirdPlace: this.includeThirdPlace,
            teams: this.teams,
            groupA: this.groupA,
            groupB: this.groupB,
            groupAFixtures: this.groupAFixtures,
            groupBFixtures: this.groupBFixtures,
            groupMatchScores: this.groupMatchScores,
            knockoutScores: this.knockoutScores,
            knockoutTeams: this.knockoutTeams
        };
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
