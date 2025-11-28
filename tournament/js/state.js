// ===== STATE MANAGEMENT CLASS =====

class TournamentState {
    constructor(tournamentId = null) {
        this.tournamentId = tournamentId;
        this.currentTab = 'fixtures';
        this.settingsSubTab = 'players';
        this.filterRound = 'all';
        this.filterPlayer = 'all';
        this.isInitialized = false;
        
        // Organiser status (set by verifying key against Firebase)
        this.isOrganiser = false;
        this.organiserKey = null;
        
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
        this.fixtureMaxScore = CONFIG.FIXTURE_MAX_SCORE;
        this.knockoutMaxScore = CONFIG.KNOCKOUT_MAX_SCORE;
        this.semiMaxScore = CONFIG.SEMI_MAX_SCORE;
        this.finalMaxScore = CONFIG.FINAL_MAX_SCORE;
        this.savedVersions = [];
        this.showFairnessTabs = true;
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

        database.ref(basePath).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Load metadata
                if (data.meta) {
                    this.tournamentName = data.meta.name || '';
                    this.createdAt = data.meta.createdAt || null;
                }
                
                this.playerNames = data.playerNames || this.playerNames;
                this.skillRatings = data.skillRatings || this.skillRatings;
                this.matchScores = data.matchScores || {};
                this.fixtures = data.fixtures || this.fixtures;
                this.matchNames = data.matchNames || this.matchNames;
                this.knockoutNames = data.knockoutNames || this.knockoutNames;
                this.knockoutScores = data.knockoutScores || {};
                this.fixtureMaxScore = data.fixtureMaxScore || CONFIG.FIXTURE_MAX_SCORE;
                this.knockoutMaxScore = data.knockoutMaxScore || CONFIG.KNOCKOUT_MAX_SCORE;
                this.semiMaxScore = data.semiMaxScore || CONFIG.SEMI_MAX_SCORE;
                this.finalMaxScore = data.finalMaxScore || CONFIG.FINAL_MAX_SCORE;
                this.savedVersions = data.savedVersions || [];
                this.showFairnessTabs = data.showFairnessTabs !== undefined ? data.showFairnessTabs : true;
            } else {
                // Tournament doesn't exist
                console.log('⚠️ Tournament not found in Firebase');
            }
            
            if (!this.isInitialized) {
                this.isInitialized = true;
                render();
            } else {
                render();
            }
        });
    }

    // Stop listening to Firebase (when leaving tournament)
    stopListening() {
        const basePath = this.getBasePath();
        database.ref(basePath).off();
        database.ref('.info/connected').off();
    }

    saveToFirebase() {
        if (!this.canEdit()) {
            console.log('⚠️ Cannot save - not organiser');
            return;
        }
        
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
        updates[`${basePath}/fixtureMaxScore`] = this.fixtureMaxScore;
        updates[`${basePath}/knockoutMaxScore`] = this.knockoutMaxScore;
        updates[`${basePath}/semiMaxScore`] = this.semiMaxScore;
        updates[`${basePath}/finalMaxScore`] = this.finalMaxScore;
        updates[`${basePath}/savedVersions`] = this.savedVersions;
        updates[`${basePath}/showFairnessTabs`] = this.showFairnessTabs;
        
        database.ref().update(updates);
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

    // Granular update for match scores only (most common operation)
    saveMatchScoreToFirebase(round, matchIdx, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        const path = `${this.getBasePath()}/matchScores/${round}/${matchIdx}`;
        database.ref(path).set({
            team1Score: team1Score,
            team2Score: team2Score
        });
        
        // Update timestamp
        database.ref(`${this.getBasePath()}/meta/updatedAt`).set(new Date().toISOString());
    }

    // Granular update for knockout scores
    saveKnockoutScoreToFirebase(matchId, team1Score, team2Score) {
        if (!this.canEdit()) return;
        
        const path = `${this.getBasePath()}/knockoutScores/${matchId}`;
        database.ref(path).set({
            team1Score: team1Score,
            team2Score: team2Score
        });
        
        // Update timestamp
        database.ref(`${this.getBasePath()}/meta/updatedAt`).set(new Date().toISOString());
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
