/**
 * state.js - League State Management
 * Handles all league state, Firebase sync, standings calculation, and data access.
 *
 * The league system manages multi-division, multi-season competition with
 * promotion/relegation. Teams (pairs) are assigned to divisions and play
 * round-robin fixtures within their division each season.
 *
 * Score format: { sets: [[6,4], [3,6], [6,2]], winner: 1 }
 * Best of 3 sets: first team to win 2 sets wins the match.
 */

class LeagueState {
    constructor() {
        // League identifiers
        this.leagueId = null;
        this.leagueName = '';
        this.organiserKey = null;
        this.isOrganiser = false;
        this.isInitialized = false;

        // League status: 'setup' | 'active' | 'completed'
        this.status = CONFIG.LEAGUE_STATUS.SETUP;

        // Current season number (1-based)
        this.currentSeason = 1;

        // Divisions: array of { index, name }
        this.divisions = [];

        // Teams keyed by teamId
        // Each team: { name, player1Name, player2Name, player1Rating, player2Rating, combinedRating, division }
        this.teams = {};

        // Seasons keyed by season number
        // Each season: { status, divisions: { [divisionIndex]: { teams: [...teamIds], fixtures: { [weekNumber]: [...matches] } } } }
        this.seasons = {};

        // Settings
        this.settings = {
            setsPerMatch: CONFIG.DEFAULT_SETS_PER_MATCH,
            gamesPerSet: CONFIG.DEFAULT_GAMES_PER_SET,
            tiebreakAt: CONFIG.TIEBREAK_AT,
            matchDay: CONFIG.DEFAULT_MATCH_DAY,
            matchTime: CONFIG.DEFAULT_MATCH_TIME,
            venue: '',
            courts: CONFIG.DEFAULT_COURTS,
            promotionCount: CONFIG.DEFAULT_PROMOTION_COUNT,
            relegationCount: CONFIG.DEFAULT_RELEGATION_COUNT
        };

        // Firebase listener reference for cleanup
        this.firebaseListener = null;

        // Polling for viewers
        this.pollingInterval = null;
        this.VIEWER_POLL_INTERVAL = 10000; // 10 seconds

        // Debounce for score updates
        this.pendingScoreUpdates = {};
        this.scoreDebounceTimer = null;
        this.SCORE_DEBOUNCE_MS = 500;

        // Idle detection
        this.idleTimer = null;
        this.IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
        this.isDisconnected = false;
        this.activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
        this.boundResetIdle = null;
        this.lastIdleReset = 0;

        // UI state
        this.currentTab = 'fixtures';
        this.settingsSubTab = 'general';
        this.selectedSeason = null;      // null = current season
        this.selectedDivision = null;    // null = all divisions
        this.selectedWeek = 'all';       // 'all' or week number

        // Metadata
        this.createdAt = null;
    }

    // ===== FIREBASE PATH =====

    getBasePath() {
        if (!this.leagueId) {
            console.error('No league ID set!');
            return `${CONFIG.FIREBASE_ROOT}/unknown`;
        }
        return `${CONFIG.FIREBASE_ROOT}/${this.leagueId}`;
    }

    // ===== ORGANISER ACCESS =====

    canEdit() {
        return this.isOrganiser;
    }

    /**
     * Wait for Firebase anonymous auth to finish signing the user in so
     * firebase.auth().currentUser is available. The league loader can easily
     * race the initial sign-in, so anything needing currentUser must await
     * this first. Resolves to the UID, or null if none appears in time.
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
     * Verify organiser access by proving possession of the organiser key.
     *
     * The key is no longer readable (it lives on the unreadable
     * tournamentSecrets node), so the proof write *is* the verification: it
     * succeeds only if the key matches, and it simultaneously claims write
     * ownership for this session's UID.
     */
    async verifyOrganiserKey(key) {
        if (!this.leagueId || !key) {
            this.isOrganiser = false;
            return false;
        }

        try {
            const uid = await this._awaitFirebaseAuthUid();
            if (!uid) {
                console.warn('verifyOrganiserKey: no Firebase auth UID (sign-in timed out)');
                this.isOrganiser = false;
                return false;
            }

            const isValid = await claimLeagueWithKey(this.leagueId, key, uid);
            this.isOrganiser = isValid;
            this.organiserKey = isValid ? key : null;

            if (isValid) {
                console.log('Organiser access granted');
                // Persist the verified key for this tab so navigating to a
                // keyless route and back does not drop write ownership.
                // sessionStorage is tab-scoped, the right lifetime for a
                // shared secret.
                try {
                    sessionStorage.setItem('league_key_' + this.leagueId, key);
                } catch (e) { /* private mode / disabled — ignore */ }
                await this.claimOwnership();
                this.upgradeToRealtime();
            } else {
                console.log('Invalid organiser key');
                try {
                    sessionStorage.removeItem('league_key_' + this.leagueId);
                } catch (e) { /* ignore */ }
            }

            return isValid;
        } catch (error) {
            console.error('Error verifying organiser key:', error);
            this.isOrganiser = false;
            return false;
        }
    }

    /**
     * Verify organiser access from a passcode rather than the organiser key.
     * Same proof mechanism, against the stored passcode hash. The organiser
     * key is never learned, so ownership rests on the `claimant` record.
     * @returns {Promise<boolean>}
     */
    async verifyOrganiserPasscode(passcode) {
        if (!this.leagueId || !passcode) {
            this.isOrganiser = false;
            return false;
        }
        try {
            const hash = (typeof CryptoUtils !== 'undefined')
                ? await CryptoUtils.hashPasscode(passcode)
                : passcode; // Fallback: legacy plaintext data
            const uid = await this._awaitFirebaseAuthUid();
            if (!uid) {
                this.isOrganiser = false;
                return false;
            }
            this.isOrganiser = await claimLeagueWithPasscode(this.leagueId, hash, uid);
            if (this.isOrganiser) {
                console.log('Organiser access granted (passcode)');
                await this.claimOwnership();
                this.upgradeToRealtime();
            }
            return this.isOrganiser;
        } catch (error) {
            console.error('Error verifying passcode:', error);
            this.isOrganiser = false;
            return false;
        }
    }

    /**
     * Anchor meta/organizerUid to this session's UID so writes pass the
     * league write rule directly, then read back to confirm it stuck.
     * Sessions that already proved a secret are accepted via the rule's
     * `claimant` clause even if this direct write is refused.
     * @returns {Promise<boolean>}
     */
    async claimOwnership() {
        if (!this.leagueId) return false;
        const uid = await this._awaitFirebaseAuthUid();
        if (!uid) return false;

        const path = `${this.getBasePath()}/meta/organizerUid`;
        try {
            await database.ref(path).set(uid);
            const snap = await database.ref(path).once('value');
            if (snap.val() === uid) {
                console.log('🔑 Ownership claimed for current session');
                return true;
            }
            console.warn('claimOwnership: server still has', snap.val(), 'expected', uid);
            return false;
        } catch (e) {
            // Expected when returning on a different device: the direct write
            // is refused, but the earlier secret proof already registered this
            // UID as `claimant`, which the write rule honours.
            console.warn('claimOwnership: direct write refused, relying on claimant proof:', e.code || e.message);
            return false;
        }
    }

    /**
     * Work out whether this session is the organiser, in preference order:
     *   1. a key supplied in the URL,
     *   2. a key cached in sessionStorage from earlier in this tab,
     *   3. an existing ownership record — meta/organizerUid already matches
     *      our uid, which is how a passcode login (which never learns the
     *      key) keeps organiser access.
     * @returns {Promise<boolean>}
     */
    async resolveOrganiserAccess(keyFromUrl) {
        if (keyFromUrl) return this.verifyOrganiserKey(keyFromUrl);

        let cached = null;
        try {
            cached = sessionStorage.getItem('league_key_' + this.leagueId);
        } catch (e) { /* private mode / disabled — ignore */ }
        if (cached) return this.verifyOrganiserKey(cached);

        const uid = await this._awaitFirebaseAuthUid();
        if (!uid) {
            this.isOrganiser = false;
            return false;
        }
        try {
            const snap = await database.ref(`${this.getBasePath()}/meta/organizerUid`).once('value');
            this.isOrganiser = snap.val() === uid;
        } catch (e) {
            this.isOrganiser = false;
        }
        if (this.isOrganiser) {
            console.log('Organiser access restored for this session');
            this.upgradeToRealtime();
        }
        return this.isOrganiser;
    }

    /**
     * Guard before writes: does this session still hold write ownership?
     * If not, re-claim. Returns true if the session can write.
     */
    async ensureWriteOwnership() {
        if (!this.isOrganiser || !this.leagueId) return false;
        const uid = await this._awaitFirebaseAuthUid();
        if (!uid) return false;
        try {
            const snap = await database.ref(`${this.getBasePath()}/meta/organizerUid`).once('value');
            if (snap.val() === uid) return true;
        } catch (e) { /* fall through to claim attempt */ }
        return await this.claimOwnership();
    }

    // ===== FIREBASE OPERATIONS =====

    /**
     * Load league data from Firebase and subscribe to changes.
     * Sets up a .on('value') listener on leagues/{leagueId}.
     */
    loadFromFirebase(leagueId) {
        if (leagueId) {
            this.leagueId = leagueId;
        }
        if (!this.leagueId) return;

        const basePath = this.getBasePath();

        // STEP 1: Load all data once
        database.ref(basePath).once('value').then((snapshot) => {
            const data = snapshot.val();
            if (!this.parseFirebaseData(data)) {
                this.isInitialized = true;
                render();
                return;
            }

            this.isInitialized = true;
            render();

            // STEP 2: Set up listeners for dynamic data (scores change frequently)
            if (this.isOrganiser) {
                console.log('Organiser mode: Real-time sync');
                this.setupRealtimeListeners();
            } else {
                console.log('Viewer mode: Polling every ' + (this.VIEWER_POLL_INTERVAL / 1000) + 's');
                this.setupPolling();
            }

            // STEP 3: Start idle detection
            this.startIdleDetection();
        });
    }

    /**
     * Parse a Firebase data snapshot and populate all state properties.
     */
    parseFirebaseData(data) {
        if (!data) {
            console.log('League not found in Firebase');
            return false;
        }

        // Metadata
        if (data.meta) {
            this.leagueName = data.meta.name || '';
            // organiserKey is deliberately not read back from meta — it is not
            // stored there any more. The session's key comes from the URL or
            // sessionStorage and is verified by proof against tournamentSecrets.
            this.createdAt = data.meta.createdAt || null;
        }

        // Status
        this.status = data.status || CONFIG.LEAGUE_STATUS.SETUP;

        // Current season
        this.currentSeason = data.currentSeason || 1;

        // Divisions
        if (data.divisions) {
            this.divisions = Array.isArray(data.divisions)
                ? data.divisions
                : Object.values(data.divisions);
        } else {
            this.divisions = CONFIG.DEFAULT_DIVISION_NAMES.map((name, index) => ({
                index,
                name
            }));
        }

        // Teams
        this.teams = data.teams || {};

        // Seasons
        this.seasons = data.seasons || {};

        // Settings
        if (data.settings) {
            this.settings = {
                setsPerMatch: data.settings.setsPerMatch ?? CONFIG.DEFAULT_SETS_PER_MATCH,
                gamesPerSet: data.settings.gamesPerSet ?? CONFIG.DEFAULT_GAMES_PER_SET,
                tiebreakAt: data.settings.tiebreakAt ?? CONFIG.TIEBREAK_AT,
                matchDay: data.settings.matchDay ?? CONFIG.DEFAULT_MATCH_DAY,
                matchTime: data.settings.matchTime ?? CONFIG.DEFAULT_MATCH_TIME,
                venue: data.settings.venue ?? '',
                courts: data.settings.courts ?? CONFIG.DEFAULT_COURTS,
                promotionCount: data.settings.promotionCount ?? CONFIG.DEFAULT_PROMOTION_COUNT,
                relegationCount: data.settings.relegationCount ?? CONFIG.DEFAULT_RELEGATION_COUNT
            };
        }

        console.log('League data loaded:', this.leagueName);
        return true;
    }

    /**
     * Set up real-time listeners for score data (organiser mode).
     */
    setupRealtimeListeners() {
        const basePath = this.getBasePath();

        this.firebaseListener = database.ref(basePath).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.parseFirebaseData(data);
                render();
            }
        });
    }

    /**
     * Set up polling for score data (viewer mode).
     */
    setupPolling() {
        const basePath = this.getBasePath();

        this.pollingInterval = setInterval(() => {
            database.ref(basePath).once('value').then((snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.parseFirebaseData(data);
                    render();
                }
            });
        }, this.VIEWER_POLL_INTERVAL);
    }

    /**
     * Upgrade from polling to real-time (when viewer becomes organiser).
     */
    upgradeToRealtime() {
        if (this.pollingInterval) {
            console.log('Upgrading to real-time sync');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            this.setupRealtimeListeners();
        }
    }

    /**
     * Stop listening to Firebase changes and clean up.
     */
    stopListening() {
        const basePath = this.getBasePath();

        // Clear real-time listener
        if (this.firebaseListener) {
            database.ref(basePath).off('value', this.firebaseListener);
            this.firebaseListener = null;
        }

        // Clear polling interval
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        // Stop idle detection
        this.stopIdleDetection();
    }

    /**
     * Reload all data from Firebase (called after organiser updates).
     */
    reloadData() {
        const basePath = this.getBasePath();
        database.ref(basePath).once('value').then((snapshot) => {
            this.parseFirebaseData(snapshot.val());
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
            this.parseFirebaseData(snapshot.val());
            if (this.isOrganiser) {
                this.setupRealtimeListeners();
            } else {
                this.setupPolling();
            }
            render();
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

    /**
     * Save full league state to Firebase.
     */
    saveToFirebase() {
        if (!this.canEdit() || !this.leagueId) return;

        const basePath = this.getBasePath();

        // Scoped meta paths, not a whole `meta` object: passing a nested object
        // to update() replaces that child wholesale, which would drop
        // meta/organizerUid (losing write ownership) along with venue,
        // description, matchFormat and the rest of the creation metadata.
        database.ref(basePath).update({
            'meta/name': this.leagueName,
            'meta/createdAt': this.createdAt,
            'meta/updatedAt': new Date().toISOString(),
            status: this.status,
            currentSeason: this.currentSeason,
            divisions: this.divisions,
            teams: this.teams,
            seasons: this.seasons,
            settings: this.settings
        });
    }

    /**
     * Save a single match score to Firebase - DEBOUNCED.
     */
    saveMatchScoreToFirebase(seasonNumber, weekNumber, matchIndex, scoreData) {
        if (!this.canEdit() || !this.leagueId) return;

        const key = `${seasonNumber}_${weekNumber}_${matchIndex}`;
        this.pendingScoreUpdates[key] = { seasonNumber, weekNumber, matchIndex, scoreData };

        this.debouncedScoreSave();
    }

    /**
     * Debounced save - batches all pending score updates.
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
     * Flush all pending score updates to Firebase in a single batch.
     */
    flushPendingScores() {
        if (!this.leagueId || Object.keys(this.pendingScoreUpdates).length === 0) {
            this.scoreDebounceTimer = null;
            return;
        }

        const basePath = this.getBasePath();
        const updates = {};

        for (const key in this.pendingScoreUpdates) {
            const { seasonNumber, weekNumber, matchIndex, scoreData } = this.pendingScoreUpdates[key];
            const matchPath = `${basePath}/seasons/${seasonNumber}/fixtures/${weekNumber}/${matchIndex}`;
            updates[`${matchPath}/score`] = scoreData;
            updates[`${matchPath}/status`] = CONFIG.MATCH_STATUS.COMPLETED;
        }

        updates[`${basePath}/meta/updatedAt`] = new Date().toISOString();

        database.ref().update(updates)
            .then(() => {
                console.log('Saved ' + Object.keys(this.pendingScoreUpdates).length + ' score(s)');
            })
            .catch(err => {
                console.error('Error saving scores:', err);
            });

        this.pendingScoreUpdates = {};
        this.scoreDebounceTimer = null;
    }

    /**
     * Force immediate save (e.g., before page unload).
     */
    flushScoresImmediately() {
        if (this.scoreDebounceTimer) {
            clearTimeout(this.scoreDebounceTimer);
            this.scoreDebounceTimer = null;
        }
        this.flushPendingScores();
    }

    // ===== TEAM ACCESS =====

    /**
     * Get a team object by teamId.
     */
    getTeam(teamId) {
        return this.teams[teamId] || null;
    }

    /**
     * Get all teams in a specific division.
     */
    getTeamsByDivision(divisionIndex) {
        const result = [];
        for (const teamId in this.teams) {
            if (this.teams[teamId].division === divisionIndex) {
                result.push({ teamId, ...this.teams[teamId] });
            }
        }
        return result;
    }

    // ===== FIXTURE ACCESS =====

    /**
     * Get fixtures for a specific week in a season.
     * Returns an array of match objects for the given week.
     */
    getFixturesForWeek(seasonNumber, weekNumber) {
        const season = this.seasons[seasonNumber];
        if (!season || !season.fixtures || !season.fixtures[weekNumber]) {
            return [];
        }

        const weekFixtures = season.fixtures[weekNumber];
        return Array.isArray(weekFixtures) ? weekFixtures : Object.values(weekFixtures);
    }

    /**
     * Get all fixtures for a specific division in a season.
     * Iterates all weeks and filters by division.
     */
    getFixturesForDivision(seasonNumber, divisionIndex) {
        const season = this.seasons[seasonNumber];
        if (!season || !season.fixtures) return [];

        const fixtures = [];
        const weeks = season.fixtures;

        for (const weekNumber in weeks) {
            const weekFixtures = Array.isArray(weeks[weekNumber])
                ? weeks[weekNumber]
                : Object.values(weeks[weekNumber]);

            weekFixtures.forEach((match, matchIndex) => {
                if (match.division === divisionIndex) {
                    fixtures.push({
                        ...match,
                        weekNumber: parseInt(weekNumber),
                        matchIndex
                    });
                }
            });
        }

        return fixtures;
    }

    /**
     * Get the next N unplayed fixtures across the current season.
     */
    getUpcomingFixtures(limit = 5) {
        const seasonNumber = this.currentSeason;
        const season = this.seasons[seasonNumber];
        if (!season || !season.fixtures) return [];

        const upcoming = [];
        const weeks = season.fixtures;
        const weekNumbers = Object.keys(weeks).map(Number).sort((a, b) => a - b);

        for (const weekNumber of weekNumbers) {
            if (upcoming.length >= limit) break;

            const weekFixtures = Array.isArray(weeks[weekNumber])
                ? weeks[weekNumber]
                : Object.values(weeks[weekNumber]);

            weekFixtures.forEach((match, matchIndex) => {
                if (upcoming.length >= limit && !this.isMatchComplete(match)) return;
                if (!this.isMatchComplete(match)) {
                    upcoming.push({
                        ...match,
                        weekNumber,
                        matchIndex,
                        seasonNumber
                    });
                }
            });
        }

        return upcoming.slice(0, limit);
    }

    /**
     * Get the last N completed fixtures across the current season.
     */
    getRecentResults(limit = 5) {
        const seasonNumber = this.currentSeason;
        const season = this.seasons[seasonNumber];
        if (!season || !season.fixtures) return [];

        const completed = [];
        const weeks = season.fixtures;
        const weekNumbers = Object.keys(weeks).map(Number).sort((a, b) => b - a);

        for (const weekNumber of weekNumbers) {
            if (completed.length >= limit) break;

            const weekFixtures = Array.isArray(weeks[weekNumber])
                ? weeks[weekNumber]
                : Object.values(weeks[weekNumber]);

            weekFixtures.forEach((match, matchIndex) => {
                if (this.isMatchComplete(match)) {
                    completed.push({
                        ...match,
                        weekNumber,
                        matchIndex,
                        seasonNumber
                    });
                }
            });
        }

        return completed.slice(0, limit);
    }

    // ===== MATCH / SCORE HELPERS =====

    /**
     * Check if a match has a completed score.
     * A match is complete if it has a score object with sets and a winner.
     */
    isMatchComplete(match) {
        if (!match || !match.score) return false;
        if (match.status === CONFIG.MATCH_STATUS.COMPLETED) return true;

        const score = match.score;
        if (!score.sets || !Array.isArray(score.sets) || score.sets.length === 0) return false;

        // Check if there is a declared winner
        if (score.winner === 1 || score.winner === 2) return true;

        // Otherwise determine by counting set wins
        return this.getMatchWinner(match) !== null;
    }

    /**
     * Get the winning teamId from a match's score sets.
     * Best of 3: first team to win 2 sets wins.
     * Returns the teamId of the winner, or null if undecided.
     */
    getMatchWinner(match) {
        if (!match || !match.score || !match.score.sets) return null;

        const sets = match.score.sets;
        let team1Wins = 0;
        let team2Wins = 0;
        const setsToWin = Math.ceil((this.settings.setsPerMatch || 3) / 2);

        for (const set of sets) {
            if (!Array.isArray(set) || set.length < 2) continue;
            if (set[0] > set[1]) {
                team1Wins++;
            } else if (set[1] > set[0]) {
                team2Wins++;
            }
        }

        if (team1Wins >= setsToWin) return match.team1Id;
        if (team2Wins >= setsToWin) return match.team2Id;

        // Also check the declared winner field
        if (match.score.winner === 1) return match.team1Id;
        if (match.score.winner === 2) return match.team2Id;

        return null;
    }

    /**
     * Get the losing teamId from a match.
     */
    getMatchLoser(match) {
        const winner = this.getMatchWinner(match);
        if (!winner || !match) return null;

        return winner === match.team1Id ? match.team2Id : match.team1Id;
    }

    /**
     * Count set wins for each team in a match.
     * Returns { team1Sets, team2Sets }.
     */
    getSetScore(match) {
        if (!match || !match.score || !match.score.sets) {
            return { team1Sets: 0, team2Sets: 0 };
        }

        let team1Sets = 0;
        let team2Sets = 0;

        for (const set of match.score.sets) {
            if (!Array.isArray(set) || set.length < 2) continue;
            if (set[0] > set[1]) team1Sets++;
            else if (set[1] > set[0]) team2Sets++;
        }

        return { team1Sets, team2Sets };
    }

    /**
     * Count total games won by each team in a match.
     * Returns { team1Games, team2Games }.
     */
    getGameScore(match) {
        if (!match || !match.score || !match.score.sets) {
            return { team1Games: 0, team2Games: 0 };
        }

        let team1Games = 0;
        let team2Games = 0;

        for (const set of match.score.sets) {
            if (!Array.isArray(set) || set.length < 2) continue;
            team1Games += set[0];
            team2Games += set[1];
        }

        return { team1Games, team2Games };
    }

    // ===== STANDINGS CALCULATION =====

    /**
     * Calculate standings for a division in a given season.
     *
     * Points: Win = 3, Draw = 1, Loss = 0
     * Sort order: points desc -> set diff desc -> game diff desc -> head-to-head
     *
     * Returns sorted array of standing objects.
     */
    getStandings(seasonNumber, divisionIndex) {
        const season = this.seasons[seasonNumber];
        if (!season) return [];

        // Gather all team IDs for this division
        const divisionTeamIds = [];
        for (const teamId in this.teams) {
            if (this.teams[teamId].division === divisionIndex) {
                divisionTeamIds.push(teamId);
            }
        }

        // Also check season-specific division assignments
        if (season.divisions && season.divisions[divisionIndex] && season.divisions[divisionIndex].teams) {
            const seasonTeams = season.divisions[divisionIndex].teams;
            if (Array.isArray(seasonTeams)) {
                seasonTeams.forEach(tid => {
                    const id = String(tid);
                    if (!divisionTeamIds.includes(id)) {
                        divisionTeamIds.push(id);
                    }
                });
            }
        }

        // Initialize stats for each team
        const stats = {};
        divisionTeamIds.forEach(teamId => {
            const team = this.teams[teamId];
            stats[teamId] = {
                teamId,
                teamName: team ? team.name : ('Team ' + teamId),
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                setsFor: 0,
                setsAgainst: 0,
                setDiff: 0,
                gamesFor: 0,
                gamesAgainst: 0,
                gameDiff: 0,
                points: 0
            };
        });

        // Head-to-head record for tiebreaking
        const headToHead = {};

        // Get all fixtures for this division
        const fixtures = this.getFixturesForDivision(seasonNumber, divisionIndex);

        fixtures.forEach(match => {
            if (!this.isMatchComplete(match)) return;

            const t1 = String(match.team1Id);
            const t2 = String(match.team2Id);
            const s1 = stats[t1];
            const s2 = stats[t2];

            if (!s1 || !s2) return;

            s1.played++;
            s2.played++;

            // Count sets
            const { team1Sets, team2Sets } = this.getSetScore(match);
            s1.setsFor += team1Sets;
            s1.setsAgainst += team2Sets;
            s2.setsFor += team2Sets;
            s2.setsAgainst += team1Sets;

            // Count games
            const { team1Games, team2Games } = this.getGameScore(match);
            s1.gamesFor += team1Games;
            s1.gamesAgainst += team2Games;
            s2.gamesFor += team2Games;
            s2.gamesAgainst += team1Games;

            // Determine winner
            const winnerId = this.getMatchWinner(match);

            if (winnerId === t1) {
                s1.wins++;
                s1.points += CONFIG.POINTS_WIN;
                s2.losses++;
                s2.points += CONFIG.POINTS_LOSS;

                // Head-to-head
                if (!headToHead[t1]) headToHead[t1] = {};
                if (!headToHead[t1][t2]) headToHead[t1][t2] = 0;
                headToHead[t1][t2]++;
            } else if (winnerId === t2) {
                s2.wins++;
                s2.points += CONFIG.POINTS_WIN;
                s1.losses++;
                s1.points += CONFIG.POINTS_LOSS;

                if (!headToHead[t2]) headToHead[t2] = {};
                if (!headToHead[t2][t1]) headToHead[t2][t1] = 0;
                headToHead[t2][t1]++;
            } else {
                // Draw (unlikely in best-of-3, but handled for completeness)
                s1.draws++;
                s1.points += CONFIG.POINTS_DRAW;
                s2.draws++;
                s2.points += CONFIG.POINTS_DRAW;
            }
        });

        // Calculate differentials
        for (const teamId in stats) {
            stats[teamId].setDiff = stats[teamId].setsFor - stats[teamId].setsAgainst;
            stats[teamId].gameDiff = stats[teamId].gamesFor - stats[teamId].gamesAgainst;
        }

        // Sort standings
        const standings = Object.values(stats);
        standings.sort((a, b) => {
            // 1. Points descending
            if (b.points !== a.points) return b.points - a.points;

            // 2. Set difference descending
            if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;

            // 3. Game difference descending
            if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;

            // 4. Head-to-head: team with more wins vs the other ranks higher
            const aBeatsB = (headToHead[a.teamId] && headToHead[a.teamId][b.teamId]) || 0;
            const bBeatsA = (headToHead[b.teamId] && headToHead[b.teamId][a.teamId]) || 0;
            if (aBeatsB !== bBeatsA) return bBeatsA - aBeatsB; // More h2h wins = higher

            // 5. Games for descending (final tiebreak)
            return b.gamesFor - a.gamesFor;
        });

        return standings;
    }

    // ===== SEASON PROGRESS =====

    /**
     * Get the progress of a season: total matches, completed, and percentage.
     */
    getSeasonProgress(seasonNumber) {
        const season = this.seasons[seasonNumber];
        if (!season || !season.fixtures) {
            return { total: 0, completed: 0, percentage: 0 };
        }

        let total = 0;
        let completed = 0;

        for (const weekNumber in season.fixtures) {
            const weekFixtures = Array.isArray(season.fixtures[weekNumber])
                ? season.fixtures[weekNumber]
                : Object.values(season.fixtures[weekNumber]);

            weekFixtures.forEach(match => {
                total++;
                if (this.isMatchComplete(match)) {
                    completed++;
                }
            });
        }

        return {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    // ===== PROMOTION / RELEGATION ZONES =====

    /**
     * Get teamIds in the promotion zone for a division.
     * Returns the top N teams based on standings (where N = promotionCount).
     * Only the lowest division (index 0) is excluded from promotion since
     * it is already the highest tier. We assume index 0 = top division.
     */
    getPromotionZone(seasonNumber, divisionIndex) {
        // Top division cannot be promoted
        if (divisionIndex === 0) return [];

        const standings = this.getStandings(seasonNumber, divisionIndex);
        const count = this.settings.promotionCount || 0;
        return standings.slice(0, count).map(s => s.teamId);
    }

    /**
     * Get teamIds in the relegation zone for a division.
     * Returns the bottom N teams based on standings (where N = relegationCount).
     * The lowest-ranked division is excluded from relegation.
     */
    getRelegationZone(seasonNumber, divisionIndex) {
        // Bottom division cannot be relegated
        const maxDivisionIndex = this.divisions.length - 1;
        if (divisionIndex >= maxDivisionIndex) return [];

        const standings = this.getStandings(seasonNumber, divisionIndex);
        const count = this.settings.relegationCount || 0;
        if (standings.length === 0 || count === 0) return [];

        return standings.slice(-count).map(s => s.teamId);
    }

    // ===== AGGREGATE HELPERS =====

    /**
     * Get total number of weeks in a season.
     */
    getWeekCount(seasonNumber) {
        const season = this.seasons[seasonNumber];
        if (!season || !season.fixtures) return 0;
        return Object.keys(season.fixtures).length;
    }

    /**
     * Get all week numbers for a season, sorted.
     */
    getWeekNumbers(seasonNumber) {
        const season = this.seasons[seasonNumber];
        if (!season || !season.fixtures) return [];
        return Object.keys(season.fixtures).map(Number).sort((a, b) => a - b);
    }

    /**
     * Count completed matches in a specific division for a season.
     */
    getCompletedMatchCount(seasonNumber, divisionIndex) {
        const fixtures = this.getFixturesForDivision(seasonNumber, divisionIndex);
        return fixtures.filter(m => this.isMatchComplete(m)).length;
    }

    /**
     * Count total matches in a specific division for a season.
     */
    getTotalMatchCount(seasonNumber, divisionIndex) {
        return this.getFixturesForDivision(seasonNumber, divisionIndex).length;
    }

    /**
     * Check if all matches in a season are complete.
     */
    isSeasonComplete(seasonNumber) {
        const progress = this.getSeasonProgress(seasonNumber);
        return progress.total > 0 && progress.completed === progress.total;
    }

    /**
     * Get the current active season number (or fallback to currentSeason).
     */
    getActiveSeason() {
        return this.selectedSeason || this.currentSeason;
    }
}

// ===== GLOBAL STATE INSTANCE =====

const state = new LeagueState();

// ===== MY LEAGUES - Local Storage Management =====

const MyLeagues = {
    KEY: CONFIG.STORAGE_KEY,

    getAll() {
        try {
            const data = localStorage.getItem(this.KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    add(leagueId, name) {
        const leagues = this.getAll();
        if (!leagues.find(l => l.id === leagueId)) {
            leagues.unshift({
                id: leagueId,
                name: name,
                createdAt: new Date().toISOString()
            });
            if (leagues.length > CONFIG.MAX_STORED_LEAGUES) {
                leagues.pop();
            }
            localStorage.setItem(this.KEY, JSON.stringify(leagues));
        }
    },

    remove(leagueId) {
        const leagues = this.getAll().filter(l => l.id !== leagueId);
        localStorage.setItem(this.KEY, JSON.stringify(leagues));
    },

    updateName(leagueId, name) {
        const leagues = this.getAll();
        const league = leagues.find(l => l.id === leagueId);
        if (league) {
            league.name = name;
            localStorage.setItem(this.KEY, JSON.stringify(leagues));
        }
    }
};

console.log('League State loaded');
