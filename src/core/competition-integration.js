/**
 * Competition Integration Module
 * Links scheduled competitions with Quick Play tournament engines
 * 
 * Usage:
 *   import { CompetitionIntegration } from '/src/core/competition-integration.js';
 *   const integration = new CompetitionIntegration(firebase.database());
 *   
 *   // Load competition and players
 *   const comp = await integration.loadCompetition(compId);
 *   const players = integration.getConfirmedPlayers();
 *   
 *   // Save tournament progress
 *   await integration.saveTournamentData(tournamentData);
 *   await integration.updateStandings(standings);
 */

export class CompetitionIntegration {
    constructor(database) {
        this.database = database;
        this.competitionId = null;
        this.competition = null;
        this.tournamentKey = null;
    }
    
    /**
     * Load competition data from Firebase
     * @param {string} compId - Competition ID
     * @returns {Object|null} Competition data or null if not found
     */
    async loadCompetition(compId) {
        if (!compId) return null;
        
        try {
            const snapshot = await this.database.ref(`competitions/${compId}`).once('value');
            this.competition = snapshot.val();
            
            if (this.competition) {
                this.competitionId = compId;
                this.tournamentKey = this.competition.tournamentKey || compId;
            }
            
            return this.competition;
        } catch (e) {
            console.error('Error loading competition:', e);
            return null;
        }
    }
    
    /**
     * Get confirmed players from competition registrations
     * @returns {Array} Array of player objects with name, level, userId
     */
    getConfirmedPlayers() {
        if (!this.competition || !this.competition.registrations) {
            return [];
        }
        
        const players = [];
        Object.entries(this.competition.registrations).forEach(([id, reg]) => {
            if (reg.status === 'confirmed') {
                players.push({
                    id,
                    name: reg.name,
                    level: reg.level || null,
                    userId: reg.userId || null,
                    email: reg.email || null
                });
            }
        });
        
        return players;
    }
    
    /**
     * Get player names only (for simple player lists)
     * @returns {Array<string>} Array of player names
     */
    getPlayerNames() {
        return this.getConfirmedPlayers().map(p => p.name);
    }
    
    /**
     * Check if this is a competition-linked tournament
     * @returns {boolean}
     */
    isLinked() {
        return !!this.competitionId;
    }
    
    /**
     * Get competition info for display
     * @returns {Object} Competition info object
     */
    getCompetitionInfo() {
        if (!this.competition) return null;
        
        return {
            id: this.competitionId,
            name: this.competition.name,
            format: this.competition.format,
            status: this.competition.status,
            date: this.competition.schedule?.date,
            time: this.competition.schedule?.time,
            location: this.competition.location?.name,
            courts: this.competition.courts || 2,
            maxPlayers: this.competition.players?.max || 16,
            currentPlayers: this.competition.players?.current || 0,
            organizer: this.competition.organizer?.name
        };
    }
    
    /**
     * Save tournament data to Firebase
     * Links tournament to competition for later retrieval
     * @param {Object} data - Tournament data (matches, rounds, settings, etc.)
     */
    async saveTournamentData(data) {
        if (!this.competitionId) {
            console.warn('No competition linked - tournament data not saved to competition');
            return;
        }
        
        try {
            // Save tournament data
            await this.database.ref(`tournaments/${this.tournamentKey}`).set({
                ...data,
                competitionId: this.competitionId,
                updatedAt: new Date().toISOString()
            });
            
            // Link tournament key to competition if not already
            if (!this.competition.tournamentKey) {
                await this.database.ref(`competitions/${this.competitionId}/tournamentKey`).set(this.tournamentKey);
            }
            
        } catch (e) {
            console.error('Error saving tournament data:', e);
            throw e;
        }
    }
    
    /**
     * Update just the matches portion of tournament data
     * @param {Object} matches - Matches object keyed by match ID
     */
    async saveMatches(matches) {
        if (!this.competitionId) return;
        
        try {
            await this.database.ref(`tournaments/${this.tournamentKey}/matches`).set(matches);
            await this.database.ref(`tournaments/${this.tournamentKey}/updatedAt`).set(new Date().toISOString());
        } catch (e) {
            console.error('Error saving matches:', e);
        }
    }
    
    /**
     * Update standings in both tournament and competition
     * @param {Array} standings - Array of player standings objects
     */
    async updateStandings(standings) {
        if (!this.competitionId) return;
        
        try {
            // Save to tournament data
            await this.database.ref(`tournaments/${this.tournamentKey}/standings`).set(standings);
            
            // Also save summary to competition for quick access
            const summary = standings.slice(0, 3).map((s, i) => ({
                rank: i + 1,
                name: s.name,
                points: s.points || 0
            }));
            await this.database.ref(`competitions/${this.competitionId}/standingsSummary`).set(summary);
            
        } catch (e) {
            console.error('Error updating standings:', e);
        }
    }
    
    /**
     * Update current round number
     * @param {number} round - Current round number
     */
    async updateCurrentRound(round) {
        if (!this.competitionId) return;
        
        try {
            await this.database.ref(`tournaments/${this.tournamentKey}/currentRound`).set(round);
        } catch (e) {
            console.error('Error updating round:', e);
        }
    }
    
    /**
     * Mark a match as completed with scores
     * @param {string} matchId - Match identifier
     * @param {number} score1 - Team 1 score
     * @param {number} score2 - Team 2 score
     */
    async completeMatch(matchId, score1, score2) {
        if (!this.competitionId) return;
        
        try {
            await this.database.ref(`tournaments/${this.tournamentKey}/matches/${matchId}`).update({
                score1,
                score2,
                completed: true,
                completedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error('Error completing match:', e);
        }
    }
    
    /**
     * Load existing tournament data (for resuming)
     * @returns {Object|null} Tournament data or null
     */
    async loadTournamentData() {
        if (!this.competitionId) return null;
        
        try {
            const snapshot = await this.database.ref(`tournaments/${this.tournamentKey}`).once('value');
            return snapshot.val();
        } catch (e) {
            console.error('Error loading tournament data:', e);
            return null;
        }
    }
    
    /**
     * Get competition ID from URL parameter
     * @returns {string|null} Competition ID or null
     */
    static getCompIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('comp') || params.get('competition') || params.get('id');
    }
    
    /**
     * Create a banner/notice showing competition info
     * @returns {string} HTML string for the banner
     */
    createCompetitionBanner() {
        if (!this.competition) return '';
        
        const info = this.getCompetitionInfo();
        
        return `
            <div class="competition-banner" style="
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                color: white;
                padding: 0.75rem 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 0.5rem;
            ">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.25rem;">🏆</span>
                    <div>
                        <div style="font-weight: 600; font-size: 0.9rem;">${this.escapeHtml(info.name)}</div>
                        <div style="font-size: 0.75rem; opacity: 0.9;">${info.location || ''} ${info.date ? '• ' + info.date : ''}</div>
                    </div>
                </div>
                <a href="/competitions/dashboard.html?id=${this.competitionId}" 
                   style="background: rgba(255,255,255,0.2); color: white; padding: 0.375rem 0.75rem; border-radius: 6px; text-decoration: none; font-size: 0.8rem; font-weight: 500;">
                    Dashboard →
                </a>
            </div>
        `;
    }
    
    /**
     * Escape HTML special characters
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

/**
 * Helper to detect if running in competition mode
 * @returns {boolean}
 */
export function isCompetitionMode() {
    const params = new URLSearchParams(window.location.search);
    return !!(params.get('comp') || params.get('competition'));
}

/**
 * Quick setup function for tournament pages
 * @param {Object} database - Firebase database reference
 * @returns {Promise<CompetitionIntegration>}
 */
export async function setupCompetitionIntegration(database) {
    const integration = new CompetitionIntegration(database);
    const compId = CompetitionIntegration.getCompIdFromUrl();
    
    if (compId) {
        await integration.loadCompetition(compId);
    }
    
    return integration;
}
