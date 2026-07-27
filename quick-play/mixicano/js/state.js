/**
 * state.js - Mixicano Tournament State Management
 * Like Mexicano but with mixed-gender team pairing
 * Each team = 1 male + 1 female player
 */

class MixicanoState {
    constructor(tournamentId = null) {
        this.tournamentId = tournamentId;
        this.tournamentName = '';
        this.organiserKey = null;
        this.isOrganiser = false;
        this.isInitialized = false;

        // Firebase sync
        this.firebaseListener = null;
        this.saveDebounceTimer = null;
        this.SAVE_DEBOUNCE_MS = 300;

        // Tournament settings - always individual, mixed gender
        this.pointsPerMatch = CONFIG.DEFAULT_POINTS_PER_MATCH;
        this.status = 'active';

        // Players with gender field: { id, name, gender: 'M'|'F' }
        this.players = [];

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

    updatePlayerName(index, name) {
        if (!this.canEdit()) return;
        if (this.players[index]) {
            this.players[index].name = name;
        }
        this.saveToFirebase();
    }

    updateCourtName(index, name) {
        if (!this.canEdit()) return;
        if (!this.courtNames) this.courtNames = [];
        this.courtNames[index] = name;
        this.saveToFirebase();
    }

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

    resetAllScores() {
        if (!this.canEdit()) return;
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

    getCourtName(courtIndex) {
        if (this.courtNames && this.courtNames[courtIndex]) {
            return this.courtNames[courtIndex];
        }
        return `Court ${courtIndex + 1}`;
    }

    // ========================================
    // STANDINGS - Calculated from match results
    // ========================================

    getStandings() {
        const stats = new Map();

        // Initialize all players with 0
        this.players.forEach(player => {
            stats.set(player.id, {
                id: player.id,
                name: player.name || 'Unknown',
                gender: player.gender || 'M',
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
            });
        });

        return Array.from(stats.values())
            .sort((a, b) => b.totalPoints - a.totalPoints || a.matchesPlayed - b.matchesPlayed);
    }

    getItemStats(id) {
        const standings = this.getStandings();
        return standings.find(s => s.id === id) || { totalPoints: 0, matchesPlayed: 0 };
    }

    // ========================================
    // MIXED-GENDER ROUND GENERATION
    // ========================================

    generateRound(roundNumber) {
        console.log('🔀 Generating mixicano round', roundNumber);
        return this.generateMixicanoRound(roundNumber);
    }

    /**
     * Generate a round with mixed-gender pairing
     * Each team = 1 male + 1 female
     * Cross-pair: M#1+F#2 vs M#2+F#1 (for balance)
     */
    generateMixicanoRound(roundNumber) {
        const standings = this.getStandings();

        // Separate by gender
        const males = standings.filter(s => s.gender === 'M');
        const females = standings.filter(s => s.gender === 'F');

        console.log('📊 Males:', males.map(s => `${s.name}:${s.totalPoints}`));
        console.log('📊 Females:', females.map(s => `${s.name}:${s.totalPoints}`));

        if (males.length < 2 || females.length < 2) {
            console.error('❌ Not enough players of each gender');
            return { roundNumber, matches: [], sittingOut: [], completed: false };
        }

        // Round 1: Random shuffle within each gender
        let sortedMales = roundNumber === 1 ? this.shuffleArray([...males]) : [...males];
        let sortedFemales = roundNumber === 1 ? this.shuffleArray([...females]) : [...females];

        const matches = [];
        const courts = Math.floor(Math.min(sortedMales.length, sortedFemales.length) / 2);

        const getIndex = (id) => this.players.findIndex(p => p.id === id);

        for (let c = 0; c < courts; c++) {
            const base = c * 2;
            const m1 = sortedMales[base];
            const m2 = sortedMales[base + 1];
            const f1 = sortedFemales[base];
            const f2 = sortedFemales[base + 1];

            if (!m1 || !m2 || !f1 || !f2) continue;

            // Cross-pair: M#1+F#2 vs M#2+F#1
            const match = {
                id: this.generateId(),
                court: c + 1,
                team1: [m1.id, f2.id],
                team1Names: [m1.name, f2.name],
                team1Genders: ['M', 'F'],
                team1Indices: [getIndex(m1.id), getIndex(f2.id)],
                team2: [m2.id, f1.id],
                team2Names: [m2.name, f1.name],
                team2Genders: ['M', 'F'],
                team2Indices: [getIndex(m2.id), getIndex(f1.id)],
                score1: null,
                score2: null,
                completed: false
            };

            console.log(`📊 Court ${c + 1}: ${m1.name} ♂ & ${f2.name} ♀ vs ${m2.name} ♂ & ${f1.name} ♀`);
            matches.push(match);
        }

        // Players sitting out (if unequal count after pairing)
        const usedMales = courts * 2;
        const usedFemales = courts * 2;
        const sittingOut = [
            ...sortedMales.slice(usedMales),
            ...sortedFemales.slice(usedFemales)
        ].map(s => ({
            id: s.id,
            name: s.name,
            index: getIndex(s.id)
        }));

        console.log('✅ Generated', matches.length, 'mixed matches for round', roundNumber);

        return { roundNumber, matches, sittingOut, completed: false };
    }

    // ========================================
    // FIREBASE SYNC
    // ========================================

    async loadTournament() {
        if (!this.tournamentId) return false;

        try {
            const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).once('value');
            if (!snapshot.exists()) return false;

            const data = snapshot.val();
            this.applyData(data);
            this.isInitialized = true;

            console.log('📦 Mixicano tournament loaded');
            return true;
        } catch (error) {
            console.error('Error loading tournament:', error);
            return false;
        }
    }

    applyData(data) {
        if (!data) return;

        this.tournamentName = data.meta?.name || '';
        this.pointsPerMatch = data.meta?.pointsPerMatch || CONFIG.DEFAULT_POINTS_PER_MATCH;
        this.status = data.meta?.status || 'active';

        // Players with gender
        this.players = this.normalizeArray(data.players);

        this.courtNames = this.normalizeArray(data.courtNames);

        this.rounds = this.normalizeRoundsData(data.rounds);
        this.currentRound = data.currentRound || 1;

        if (this.viewingRound === 0 || this.viewingRound > this.rounds.length) {
            this.viewingRound = this.currentRound;
        }

        this.registeredPlayers = data.registeredPlayers || {};
    }

    setupRealtimeListener() {
        if (!this.tournamentId) return;

        this.stopListening();

        const path = `${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`;
        let lastDataHash = '';

        this.firebaseListener = database.ref(path).on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const dataHash = JSON.stringify(data);

                if (dataHash !== lastDataHash) {
                    lastDataHash = dataHash;
                    this.applyData(data);
                    render();
                }
            }
        });

        console.log('🔄 Real-time sync enabled');
    }

    stopListening() {
        if (this.firebaseListener) {
            database.ref(`${CONFIG.FIREBASE_ROOT}/${this.tournamentId}`).off('value', this.firebaseListener);
            this.firebaseListener = null;
        }
    }

    saveToFirebase() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = setTimeout(() => {
            this.doSave();
        }, this.SAVE_DEBOUNCE_MS);
    }

    async saveNow() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = null;
        }
        return await this.doSave();
    }

    async doSave() {
        if (!this.tournamentId) return false;

        try {
            const updates = {
                // meta/updatedAt write removed — score writes are open to all users but meta writes
                // require organizer auth per Firebase Security Rules. See firebase-rules-production.json
                'meta/status': this.status,
                'meta/name': this.tournamentName,
                'meta/pointsPerMatch': this.pointsPerMatch,
                currentRound: this.currentRound,
                rounds: this.rounds,
                players: this.players,
                registeredPlayers: this.registeredPlayers || {},
                courtNames: this.courtNames || []
            };

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

    isCurrentRoundComplete() {
        const round = this.rounds[this.currentRound - 1];
        if (!round || !round.matches) return false;
        return round.matches.every(m => m.completed);
    }

    completeCurrentRound() {
        if (!this.isCurrentRoundComplete()) return false;

        this.rounds[this.currentRound - 1].completed = true;

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
                        team1Genders: this.normalizeArray(m.team1Genders),
                        team2Genders: this.normalizeArray(m.team2Genders),
                        team1Indices: this.normalizeArray(m.team1Indices),
                        team2Indices: this.normalizeArray(m.team2Indices),
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

    async verifyOrganiserKey(key) {
        try {
            // Prove the key instead of reading it back: see
            // proveTournamentSecret() in shared/format-config.js.
            if (key && await proveTournamentSecret(this.tournamentId, { key })) {
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

console.log('✅ Mixicano State loaded');
