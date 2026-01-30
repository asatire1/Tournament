// ===== STATE MANAGEMENT =====

/**
 * Tournament State - Single source of truth
 */
const TournamentState = {
    // Tournament metadata
    tournamentId: null,
    isOrganizer: false,

    // Tournament data
    meta: {
        name: '',
        createdAt: null,
        updatedAt: null,
        status: 'setup' // setup, group_stage, knockout, complete
    },

    // Player and team data
    players: [],
    teams: [],
    groups: [],

    // Match scores (keyed by groupIndex_roundIndex_matchIndex)
    scores: {},

    // Knockout bracket
    bracket: null,

    // UI state
    currentView: 'setup', // setup, groups, knockout, standings
    selectedGroup: 0,
    isLoading: false,

    // Listeners
    listeners: new Set(),

    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    },

    /**
     * Notify all listeners
     */
    notify() {
        this.listeners.forEach(callback => callback(this.getState()));
    },

    /**
     * Get current state
     */
    getState() {
        return {
            tournamentId: this.tournamentId,
            isOrganizer: this.isOrganizer,
            meta: { ...this.meta },
            players: [...this.players],
            teams: [...this.teams],
            groups: JSON.parse(JSON.stringify(this.groups)),
            scores: { ...this.scores },
            bracket: this.bracket ? JSON.parse(JSON.stringify(this.bracket)) : null,
            currentView: this.currentView,
            selectedGroup: this.selectedGroup,
            isLoading: this.isLoading
        };
    },

    /**
     * Reset state
     */
    reset() {
        this.tournamentId = null;
        this.isOrganizer = false;
        this.meta = { name: '', createdAt: null, updatedAt: null, status: 'setup' };
        this.players = [];
        this.teams = [];
        this.groups = [];
        this.scores = {};
        this.bracket = null;
        this.currentView = 'setup';
        this.selectedGroup = 0;
        this.isLoading = false;
        this.notify();
    },

    /**
     * Set tournament ID
     */
    setTournamentId(id) {
        this.tournamentId = id;
        this.notify();
    },

    /**
     * Set organizer status
     */
    setIsOrganizer(isOrganizer) {
        this.isOrganizer = isOrganizer;
        this.notify();
    },

    /**
     * Update metadata
     */
    updateMeta(updates) {
        this.meta = { ...this.meta, ...updates };
        this.notify();
    },

    /**
     * Set players
     */
    setPlayers(players) {
        this.players = players;
        this.notify();
    },

    /**
     * Set teams
     */
    setTeams(teams) {
        this.teams = teams;
        this.notify();
    },

    /**
     * Set groups
     */
    setGroups(groups) {
        this.groups = groups;
        this.notify();
    },

    /**
     * Update score
     */
    updateScore(scoreKey, score) {
        this.scores[scoreKey] = score;
        this.notify();
    },

    /**
     * Set all scores
     */
    setScores(scores) {
        this.scores = scores || {};
        this.notify();
    },

    /**
     * Set bracket
     */
    setBracket(bracket) {
        this.bracket = bracket;
        this.notify();
    },

    /**
     * Set current view
     */
    setCurrentView(view) {
        this.currentView = view;
        this.notify();
    },

    /**
     * Set selected group
     */
    setSelectedGroup(index) {
        this.selectedGroup = index;
        this.notify();
    },

    /**
     * Set loading state
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.notify();
    },

    /**
     * Load tournament data from Firebase snapshot
     */
    loadFromSnapshot(data) {
        if (!data) return;

        this.meta = data.meta || this.meta;
        this.players = data.players || [];
        this.teams = data.teams || [];
        this.groups = data.groups || [];
        this.scores = data.scores || {};
        this.bracket = data.bracket || null;

        // Determine view based on status
        if (this.meta.status === 'complete') {
            this.currentView = 'knockout';
        } else if (this.meta.status === 'knockout') {
            this.currentView = 'knockout';
        } else if (this.meta.status === 'group_stage') {
            this.currentView = 'groups';
        } else {
            this.currentView = 'setup';
        }

        this.notify();
    },

    /**
     * Get data for Firebase save
     */
    getDataForSave() {
        return {
            meta: this.meta,
            players: this.players,
            teams: this.teams,
            groups: this.groups,
            scores: this.scores,
            bracket: this.bracket
        };
    },

    /**
     * Check if group stage is complete
     */
    isGroupStageComplete() {
        if (!this.groups.length) return false;

        for (const group of this.groups) {
            if (!group.fixtures) continue;
            for (let roundIndex = 0; roundIndex < group.fixtures.length; roundIndex++) {
                for (let matchIndex = 0; matchIndex < group.fixtures[roundIndex].matches.length; matchIndex++) {
                    const scoreKey = `${group.groupIndex}_${roundIndex}_${matchIndex}`;
                    const score = this.scores[scoreKey];
                    if (!score || score.team1 === null || score.team2 === null) {
                        return false;
                    }
                }
            }
        }
        return true;
    },

    /**
     * Check if knockout is complete
     */
    isKnockoutComplete() {
        return this.bracket && this.bracket.champion !== null;
    }
};

console.log('State management loaded');
