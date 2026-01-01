/**
 * tournament-service.js - Tournament CRUD Operations
 * Unified service for all tournament format operations
 * 
 * @module services/tournament-service
 */

/**
 * Tournament format constants
 */
const FORMATS = {
    AMERICANO: 'AMERICANO',
    MEXICANO: 'MEXICANO',
    TEAM_LEAGUE: 'TEAM_LEAGUE',
    MIX_TOURNAMENT: 'MIX_TOURNAMENT'
};

/**
 * Format display names
 */
const FORMAT_NAMES = {
    [FORMATS.AMERICANO]: 'Americano',
    [FORMATS.MEXICANO]: 'Mexicano',
    [FORMATS.TEAM_LEAGUE]: 'Team League',
    [FORMATS.MIX_TOURNAMENT]: 'Mix Tournament'
};

/**
 * Format URL paths
 */
const FORMAT_PATHS = {
    [FORMATS.AMERICANO]: 'americano',
    [FORMATS.MEXICANO]: 'mexicano',
    [FORMATS.TEAM_LEAGUE]: 'team-league',
    [FORMATS.MIX_TOURNAMENT]: 'tournament'
};

/**
 * Tournament Service - Unified API for all formats
 */
const TournamentService = {
    /**
     * Create a new tournament
     * @param {string} format - Tournament format (use FORMATS constants)
     * @param {object} options - Tournament options
     * @returns {Promise<object>} { success, tournament, error }
     */
    async create(format, options = {}) {
        try {
            const TournamentClass = this.getFormatClass(format);
            if (!TournamentClass) {
                return { success: false, error: `Unknown format: ${format}` };
            }

            const tournament = new TournamentClass();
            tournament.initialize(options);

            // Validate player count
            if (!tournament.validatePlayerCount(tournament.players.length)) {
                const config = tournament.getFormatConfig();
                return {
                    success: false,
                    error: `Invalid player count. Required: ${config.MIN_PLAYERS}-${config.MAX_PLAYERS}`
                };
            }

            // Generate initial rounds if the format supports it
            if (typeof tournament.generateAllRounds === 'function') {
                tournament.generateAllRounds();
            } else if (typeof tournament.generateRound === 'function') {
                tournament.rounds = [tournament.generateRound(0)];
            }

            // Save to Firebase
            const saved = await tournament.save();
            if (!saved) {
                return { success: false, error: 'Failed to save tournament' };
            }

            // Save to local storage
            this._saveToLocal(format, tournament);

            return {
                success: true,
                tournament,
                id: tournament.id,
                organiserKey: tournament.organiserKey
            };
        } catch (error) {
            console.error('TournamentService.create error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Load an existing tournament
     * @param {string} format - Tournament format
     * @param {string} id - Tournament ID
     * @returns {Promise<object>} { success, tournament, error }
     */
    async load(format, id) {
        try {
            const TournamentClass = this.getFormatClass(format);
            if (!TournamentClass) {
                return { success: false, error: `Unknown format: ${format}` };
            }

            const tournament = new TournamentClass(id);
            const loaded = await tournament.load();

            if (!loaded) {
                return { success: false, error: 'Tournament not found' };
            }

            return { success: true, tournament };
        } catch (error) {
            console.error('TournamentService.load error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Check if a tournament exists
     * @param {string} format - Tournament format
     * @param {string} id - Tournament ID
     * @returns {Promise<boolean>}
     */
    async exists(format, id) {
        try {
            const Firebase = window.Firebase;
            return await Firebase.checkTournamentExists(format, id);
        } catch (error) {
            console.error('TournamentService.exists error:', error);
            return false;
        }
    },

    /**
     * Delete a tournament
     * @param {string} format - Tournament format
     * @param {string} id - Tournament ID
     * @param {string} organiserKey - Organiser key for verification
     * @returns {Promise<object>} { success, error }
     */
    async delete(format, id, organiserKey) {
        try {
            // Verify organiser key first
            const Firebase = window.Firebase;
            const isValid = await Firebase.verifyOrganiserKey(format, id, organiserKey);
            
            if (!isValid) {
                return { success: false, error: 'Invalid organiser key' };
            }

            // Delete from Firebase
            const ref = Firebase.getTournamentRef(format, id);
            await ref.remove();

            // Remove from local storage
            this._removeFromLocal(format, id);

            return { success: true };
        } catch (error) {
            console.error('TournamentService.delete error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get recent tournaments for a format
     * @param {string} format - Tournament format
     * @param {number} [limit=10] - Max tournaments to return
     * @returns {object[]} Array of tournament summaries
     */
    getRecent(format, limit = 10) {
        try {
            const Storage = window.Storage;
            const tournaments = Storage.getTournaments(FORMAT_PATHS[format] || format.toLowerCase());
            return tournaments.slice(-limit).reverse();
        } catch (error) {
            console.error('TournamentService.getRecent error:', error);
            return [];
        }
    },

    /**
     * Get all recent tournaments across all formats
     * @param {number} [limit=20] - Max tournaments to return
     * @returns {object[]} Array of tournament summaries with format info
     */
    getAllRecent(limit = 20) {
        try {
            const Storage = window.Storage;
            const all = [];

            Object.entries(FORMAT_PATHS).forEach(([format, path]) => {
                const tournaments = Storage.getTournaments(path);
                tournaments.forEach(t => {
                    all.push({ ...t, format, formatName: FORMAT_NAMES[format] });
                });
            });

            // Sort by updatedAt descending
            all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            return all.slice(0, limit);
        } catch (error) {
            console.error('TournamentService.getAllRecent error:', error);
            return [];
        }
    },

    /**
     * Subscribe to tournament updates
     * @param {string} format - Tournament format
     * @param {string} id - Tournament ID
     * @param {function} callback - Called with tournament data on changes
     * @returns {Promise<object>} { success, unsubscribe, tournament, error }
     */
    async subscribe(format, id, callback) {
        try {
            const result = await this.load(format, id);
            if (!result.success) {
                return result;
            }

            const unsubscribe = result.tournament.subscribe(callback);
            return {
                success: true,
                tournament: result.tournament,
                unsubscribe
            };
        } catch (error) {
            console.error('TournamentService.subscribe error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get the tournament class for a format
     * @param {string} format - Tournament format
     * @returns {class|null} Tournament class constructor
     */
    getFormatClass(format) {
        const classes = {
            [FORMATS.AMERICANO]: window.AmericanoTournament,
            [FORMATS.MEXICANO]: window.MexicanoTournament,
            [FORMATS.TEAM_LEAGUE]: window.TeamLeagueTournament,
            [FORMATS.MIX_TOURNAMENT]: window.MixTournament
        };

        return classes[format] || null;
    },

    /**
     * Get format info
     * @param {string} format - Tournament format
     * @returns {object} Format information
     */
    getFormatInfo(format) {
        return {
            key: format,
            name: FORMAT_NAMES[format] || format,
            path: FORMAT_PATHS[format] || format.toLowerCase()
        };
    },

    /**
     * Get all available formats
     * @returns {object[]} Array of format info objects
     */
    getAllFormats() {
        return Object.keys(FORMATS).map(key => this.getFormatInfo(FORMATS[key]));
    },

    /**
     * Generate shareable links
     * @param {string} format - Tournament format
     * @param {string} id - Tournament ID
     * @param {string} [organiserKey] - Optional organiser key
     * @returns {object} { playerLink, organiserLink }
     */
    getLinks(format, id, organiserKey = null) {
        const path = FORMAT_PATHS[format] || format.toLowerCase();
        const base = window.location.origin;
        
        const playerLink = `${base}/${path}/#/t/${id}`;
        const organiserLink = organiserKey 
            ? `${base}/${path}/#/t/${id}?key=${organiserKey}`
            : null;

        return { playerLink, organiserLink };
    },

    // ===== PRIVATE METHODS =====

    /**
     * Save tournament summary to local storage
     * @private
     */
    _saveToLocal(format, tournament) {
        try {
            const Storage = window.Storage;
            const path = FORMAT_PATHS[format] || format.toLowerCase();
            
            Storage.saveTournament(path, tournament.id, {
                id: tournament.id,
                name: tournament.meta.name,
                playerCount: tournament.players.length,
                status: tournament.meta.status,
                createdAt: tournament.meta.createdAt,
                updatedAt: tournament.meta.updatedAt
            });

            // Add to recent
            Storage.addRecentTournament(path, tournament.id, tournament.meta.name);
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    },

    /**
     * Remove tournament from local storage
     * @private
     */
    _removeFromLocal(format, id) {
        try {
            const Storage = window.Storage;
            const path = FORMAT_PATHS[format] || format.toLowerCase();
            Storage.removeTournament(path, id);
        } catch (error) {
            console.error('Error removing from local storage:', error);
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TournamentService, FORMATS, FORMAT_NAMES, FORMAT_PATHS };
}

if (typeof window !== 'undefined') {
    window.TournamentService = TournamentService;
    window.FORMATS = FORMATS;
    window.FORMAT_NAMES = FORMAT_NAMES;
}
