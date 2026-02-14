// ===== ROUND ROBIN STATE MANAGEMENT =====
// Simplified fork of TeamLeagueState:
// - No groups (A/B) - single flat pool
// - No knockout stage
// - Firebase path: roundrobin-tournaments/{tournamentId}

class RoundRobinState {
    constructor(tournamentId = null) {
        this.tournamentId = tournamentId;
        this.formatType = 'round_robin';

        // UI State
        this.currentTab = 'fixtures'; // fixtures, standings, settings
        this.settingsSubTab = 'teams'; // teams, courts, scoring, share, danger
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
        this.pendingScores = {};           // { "matchKey": {team1Score, team2Score} }
        this.scoreDebounceTimer = null;
        this.SCORE_DEBOUNCE_MS = 500;      // Wait 500ms after last change

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

        // Teams data: { id, name, player1Name, player1Rating, player2Name, player2Rating, combinedRating }
        this.teams = [];

        // Generated fixtures (array of rounds from generateRoundRobinFixtures)
        this.fixtures = [];

        // Match scores - flat object, matchKey like "1-2" -> {team1Score, team2Score}
        this.matchScores = {};

        // Max score
        this.maxScore = CONFIG.DEFAULT_MAX_SCORE;

        // Court names
        this.courtNames = ['Court 1', 'Court 2', 'Court 3', 'Court 4'];
    }

    // ===== FIREBASE PATH =====

    getBasePath() {
        if (!this.tournamentId) {
            console.error('No tournament ID set!');
            return 'roundrobin-tournaments/unknown';
        }
        return `roundrobin-tournaments/${this.tournamentId}`;
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
                console.log('Organiser access granted');
                // Upgrade from polling to real-time sync
                this.upgradeToRealtime();
            } else {
                console.log('Invalid organiser key');
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
            console.log('Tournament not found in Firebase');
            return false;
        }

        // Metadata
        if (data.meta) {
            this.tournamentName = data.meta.name || '';
            this.createdAt = data.meta.createdAt || null;
        }

        // Teams (static)
        this.teams = data.teams || [];

        // Fixtures (static)
        this.fixtures = data.fixtures || [];

        // Max score (static)
        this.maxScore = data.maxScore || CONFIG.DEFAULT_MAX_SCORE;

        // Court names (static)
        this.courtNames = data.courtNames || ['Court 1', 'Court 2', 'Court 3', 'Court 4'];

        // Also load initial scores
        this.matchScores = data.matchScores || {};

        console.log('Static data loaded');
        return true;
    }

    // Process DYNAMIC data from Firebase (scores - changes frequently)
    processDynamicData(matchScores) {
        if (this.isSaving) {
            console.log('Skipping Firebase update - save in progress');
            return;
        }

        this.matchScores = matchScores || {};

        renderRoundRobin();
    }

    loadFromFirebase() {
        const basePath = this.getBasePath();

        // Monitor connection
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('Connected to Firebase');
            } else {
                console.log('Disconnected from Firebase');
            }
        });

        // STEP 1: Load static data once
        database.ref(basePath).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (!this.processStaticData(data)) {
                this.isInitialized = true;
                renderRoundRobin();
                return;
            }

            this.isInitialized = true;
            renderRoundRobin();

            // STEP 2: Set up listeners for dynamic data only (scores)
            if (this.isOrganiser) {
                console.log('Organiser mode: Real-time sync for scores');
                this.setupScoreListeners(basePath);
            } else {
                console.log('Viewer mode: Polling scores (every ' + (this.VIEWER_POLL_INTERVAL/1000) + 's)');
                this.setupScorePolling(basePath);
            }

            // STEP 3: Start idle detection
            this.startIdleDetection();
        });
    }

    // Set up real-time listeners for scores only (organiser mode)
    setupScoreListeners(basePath) {
        let lastScores = '';

        database.ref(`${basePath}/matchScores`).on('value', (snapshot) => {
            if (!this.isSaving) {
                const newData = snapshot.val() || {};
                const newDataStr = JSON.stringify(newData);
                if (newDataStr !== lastScores) {
                    lastScores = newDataStr;
                    this.matchScores = newData;
                    renderRoundRobin();
                }
            }
        });
    }

    // Set up polling for scores only (viewer mode)
    setupScorePolling(basePath) {
        this.pollingInterval = setInterval(() => {
            database.ref(`${basePath}/matchScores`).once('value').then((snapshot) => {
                this.processDynamicData(snapshot.val());
            });
        }, this.VIEWER_POLL_INTERVAL);
    }

    // Upgrade from polling to real-time (when viewer becomes organiser)
    upgradeToRealtime() {
        if (this.pollingInterval) {
            console.log('Upgrading to real-time sync');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;

            const basePath = this.getBasePath();
            this.setupScoreListeners(basePath);
        }
    }

    stopListening() {
        const basePath = this.getBasePath();

        // Clear real-time listeners
        database.ref(`${basePath}/matchScores`).off();
        database.ref(basePath).off();
        database.ref('.info/connected').off();

        // Clear polling interval if active
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('Stopped polling');
        }

        // Stop idle detection (clean up event listeners)
        this.stopIdleDetection();
    }

    // Reload static data (called when organiser updates settings)
    reloadStaticData() {
        const basePath = this.getBasePath();
        database.ref(basePath).once('value').then((snapshot) => {
            this.processStaticData(snapshot.val());
            renderRoundRobin();
        });
    }

    // ===== IDLE DETECTION =====

    startIdleDetection() {
        this.boundResetIdle = this.resetIdleTimer.bind(this);
        this.activityEvents.forEach(event => {
            document.addEventListener(event, this.boundResetIdle, { passive: true });
        });
        this.resetIdleTimer();
        console.log('Idle detection started (timeout: ' + (this.IDLE_TIMEOUT_MS / 60000) + ' min)');
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
        console.log('User idle - disconnecting to save resources');
        this.isDisconnected = true;
        this.flushScoresImmediately();
        this.stopListening();
        this.showReconnectBanner();
    }

    reconnect() {
        if (!this.isDisconnected) return;
        console.log('User active - reconnecting...');
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
            renderRoundRobin();
            console.log('Reconnected successfully');
        });
    }

    showReconnectBanner() {
        if (document.getElementById('idle-banner')) return;
        const banner = document.createElement('div');
        banner.id = 'idle-banner';
        banner.className = 'fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-2 px-4 z-50 shadow-lg';
        banner.innerHTML = `
            <span>Disconnected due to inactivity.</span>
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

    // ===== SAVE OPERATIONS =====

    saveToFirebase() {
        if (!this.canEdit()) {
            console.log('Cannot save - not organiser');
            return;
        }

        this.isSaving = true;
        const basePath = this.getBasePath();

        database.ref(`${basePath}/meta/updatedAt`).set(new Date().toISOString());

        const updates = {};
        updates[`${basePath}/teams`] = this.teams;
        updates[`${basePath}/fixtures`] = this.fixtures;
        updates[`${basePath}/matchScores`] = this.matchScores;
        updates[`${basePath}/maxScore`] = this.maxScore;
        updates[`${basePath}/courtNames`] = this.courtNames;

        database.ref().update(updates).then(() => {
            setTimeout(() => {
                this.isSaving = false;
            }, 100);
        }).catch((error) => {
            console.error('Error saving to Firebase:', error);
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

    // Granular score save - DEBOUNCED
    saveScoreToFirebase(matchKey, team1Score, team2Score) {
        if (!this.canEdit()) return;

        // Queue the update
        this.pendingScores[matchKey] = { team1Score, team2Score };

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

        // Add pending scores
        for (const matchKey in this.pendingScores) {
            const { team1Score, team2Score } = this.pendingScores[matchKey];
            updates[`${basePath}/matchScores/${matchKey}`] = { team1Score, team2Score };
            hasUpdates = true;
        }

        if (hasUpdates) {
            updates[`${basePath}/meta/updatedAt`] = new Date().toISOString();

            database.ref().update(updates)
                .then(() => {
                    console.log(`Saved ${Object.keys(this.pendingScores).length} scores`);
                })
                .catch(err => {
                    console.error('Error saving scores:', err);
                });

            this.pendingScores = {};
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

    saveTeamsToFirebase() {
        if (!this.canEdit()) return;

        database.ref(`${this.getBasePath()}/teams`).set(this.teams);
        database.ref(`${this.getBasePath()}/meta/updatedAt`).set(new Date().toISOString());
    }

    saveFixturesToFirebase() {
        if (!this.canEdit()) return;

        database.ref(`${this.getBasePath()}/fixtures`).set(this.fixtures);
        database.ref(`${this.getBasePath()}/meta/updatedAt`).set(new Date().toISOString());
    }

    saveCourtNamesToFirebase() {
        if (!this.canEdit()) return;

        database.ref(`${this.getBasePath()}/courtNames`).set(this.courtNames);
        database.ref(`${this.getBasePath()}/meta/updatedAt`).set(new Date().toISOString());
    }

    saveSettingToFirebase(key, value) {
        if (!this.canEdit()) return;

        database.ref(`${this.getBasePath()}/${key}`).set(value);
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
            combinedRating
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

        // Clear fixtures and scores when teams change
        this.fixtures = [];
        this.matchScores = {};

        this.saveToFirebase();
    }

    getTeamById(teamId) {
        return this.teams.find(t => t.id === teamId);
    }

    // ===== FIXTURE GENERATION =====

    generateFixtures() {
        if (!this.canEdit()) return false;

        if (this.teams.length < 2) {
            console.error('Need at least 2 teams to generate fixtures');
            return false;
        }

        this.fixtures = generateRoundRobinFixtures(this.teams);

        // Clear existing scores
        this.matchScores = {};

        this.saveToFirebase();
        return true;
    }

    // ===== SCORE MANAGEMENT =====

    updateScore(team1Id, team2Id, team1Score, team2Score) {
        if (!this.canEdit()) return;

        const matchKey = `${team1Id}-${team2Id}`;

        this.matchScores[matchKey] = {
            team1Score: team1Score !== null ? parseInt(team1Score) : null,
            team2Score: team2Score !== null ? parseInt(team2Score) : null
        };

        this.saveScoreToFirebase(matchKey,
            team1Score !== null ? parseInt(team1Score) : null,
            team2Score !== null ? parseInt(team2Score) : null
        );
    }

    clearScore(team1Id, team2Id) {
        if (!this.canEdit()) return;

        const matchKey = `${team1Id}-${team2Id}`;

        if (this.matchScores[matchKey]) {
            delete this.matchScores[matchKey];
            database.ref(`${this.getBasePath()}/matchScores/${matchKey}`).remove();
        }
    }

    getScore(team1Id, team2Id) {
        const matchKey = `${team1Id}-${team2Id}`;
        return this.matchScores[matchKey] || { team1Score: null, team2Score: null };
    }

    isMatchComplete(team1Id, team2Id) {
        const score = this.getScore(team1Id, team2Id);
        return score.team1Score !== null && score.team2Score !== null;
    }

    // ===== STANDINGS =====

    getStandings() {
        return calculateStandings(this.teams, this.matchScores);
    }

    isLeagueComplete() {
        // Count total matches from fixtures
        const totalMatches = this.fixtures.reduce((total, round) => total + round.matches.length, 0);
        if (totalMatches === 0) return false;

        // Count completed matches
        const completedMatches = Object.values(this.matchScores)
            .filter(s => s.team1Score !== null && s.team2Score !== null).length;

        return completedMatches === totalMatches;
    }

    // ===== RESET & EXPORT =====

    resetAllScores() {
        if (!this.canEdit()) return;

        this.matchScores = {};
        this.saveToFirebase();
    }

    exportData() {
        return {
            exportDate: new Date().toISOString(),
            formatType: this.formatType,
            tournamentId: this.tournamentId,
            tournamentName: this.tournamentName,
            teams: this.teams,
            fixtures: this.fixtures,
            matchScores: this.matchScores,
            maxScore: this.maxScore,
            courtNames: this.courtNames,
            standings: this.getStandings()
        };
    }
}

// calculateStandings() is defined in config.js (loaded before state.js)

// ===== TOURNAMENT EXISTENCE CHECK =====

async function checkTournamentExists(tournamentId) {
    try {
        const snapshot = await database.ref(`roundrobin-tournaments/${tournamentId}/meta`).once('value');
        return snapshot.exists();
    } catch (error) {
        return false;
    }
}

// ===== MY TOURNAMENTS STORAGE =====

const MyTournaments = {
    KEY: 'roundrobin_tournaments',

    getAll() {
        try {
            const data = localStorage.getItem(this.KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    add(id, name) {
        const tournaments = this.getAll();
        if (!tournaments.find(t => t.id === id)) {
            tournaments.unshift({
                id: id,
                name: name,
                createdAt: new Date().toISOString()
            });
            if (tournaments.length > 20) {
                tournaments.pop();
            }
            localStorage.setItem(this.KEY, JSON.stringify(tournaments));
        }
    },

    remove(id) {
        const tournaments = this.getAll().filter(t => t.id !== id);
        localStorage.setItem(this.KEY, JSON.stringify(tournaments));
    }
};

// ===== GLOBAL STATE =====

// Global state instance
let state = null;

// Placeholder render function (implemented in components.js)
function renderRoundRobin() {
    if (typeof RoundRobinApp !== 'undefined') {
        RoundRobinApp.render();
    } else {
        console.log('Components not loaded yet');
    }
}

console.log('Round Robin State loaded');
