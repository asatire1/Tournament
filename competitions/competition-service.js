/**
 * competition-service.js - Competition Management Service
 * Phase 5: Competition System
 * 
 * Handles all competition CRUD operations and integrates with shared engines
 * 
 * @module competitions/competition-service
 */

const CompetitionService = {
    // ===== CONFIGURATION =====
    
    config: {
        COMPETITIONS_DB_PATH: 'competitions',
        FIREBASE_CONFIG: {
            apiKey: "AIzaSyDYIlRS_me7sy7ptNmRrvPQCeXP2H-hHzU",
            authDomain: "stretford-padel-tournament.firebaseapp.com",
            databaseURL: "https://stretford-padel-tournament-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "stretford-padel-tournament",
            storageBucket: "stretford-padel-tournament.firebasestorage.app",
            messagingSenderId: "596263602058",
            appId: "1:596263602058:web:f69f7f8d00c60abbd0aa73"
        }
    },
    
    // Competition statuses
    STATUS: {
        DRAFT: 'draft',
        REGISTRATION: 'registration',
        ACTIVE: 'active',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },
    
    // Tournament formats
    FORMAT: {
        AMERICANO: 'americano',
        MEXICANO: 'mexicano',
        MIX: 'mix',
        TEAM_LEAGUE: 'team-league'
    },
    
    // Access restrictions
    ACCESS: {
        ANYONE: 'anyone',
        REGISTERED: 'registered',
        VERIFIED: 'verified'
    },
    
    // ===== STATE =====
    
    _database: null,
    _initialized: false,
    _cache: new Map(),
    _cacheTimeout: 5 * 60 * 1000, // 5 minutes
    _listCache: null,
    _listCacheTime: 0,
    _listCacheTimeout: 2 * 60 * 1000, // 2 minutes for list cache
    _activeListeners: new Map(),
    _connectionState: 'unknown',
    _pendingWrites: [],
    _isOnline: true,
    
    // ===== INITIALIZATION =====
    
    /**
     * Initialize the service with connection monitoring
     */
    init() {
        if (this._initialized) return;
        
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(this.config.FIREBASE_CONFIG);
            }
            this._database = firebase.database();
            
            // Monitor connection state
            this._database.ref('.info/connected').on('value', (snap) => {
                this._isOnline = snap.val() === true;
                this._connectionState = this._isOnline ? 'connected' : 'disconnected';
                
                // Process pending writes when back online
                if (this._isOnline && this._pendingWrites.length > 0) {
                    this._processPendingWrites();
                }
            });
            
            // Load cached list from localStorage
            this._loadListCacheFromStorage();
        }
        
        this._initialized = true;
    },
    
    /**
     * Load list cache from localStorage for instant display
     */
    _loadListCacheFromStorage() {
        try {
            const cached = localStorage.getItem('uberpadel_competitions_cache');
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // Use if less than 10 minutes old
                if (Date.now() - timestamp < 10 * 60 * 1000) {
                    this._listCache = data;
                    this._listCacheTime = timestamp;
                }
            }
        } catch (e) {
            // Ignore localStorage errors
        }
    },
    
    /**
     * Save list cache to localStorage
     */
    _saveListCacheToStorage(data) {
        try {
            localStorage.setItem('uberpadel_competitions_cache', JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {
            // Ignore localStorage errors (quota exceeded, etc.)
        }
    },
    
    /**
     * Process pending writes when connection restored
     */
    async _processPendingWrites() {
        const writes = [...this._pendingWrites];
        this._pendingWrites = [];
        
        for (const write of writes) {
            try {
                await write.execute();
                write.resolve();
            } catch (error) {
                write.reject(error);
            }
        }
    },
    
    // ===== FETCH COMPETITIONS =====
    
    /**
     * Get all competitions with pagination and caching
     * @param {object} [options] - Filter options
     * @param {string} [options.status] - Filter by status
     * @param {string} [options.format] - Filter by format
     * @param {string} [options.organizerId] - Filter by organizer
     * @param {number} [options.limit] - Max results (default: 50)
     * @param {string} [options.startAfter] - Cursor for pagination
     * @param {boolean} [options.forceRefresh] - Skip cache
     * @returns {Promise<{competitions: Array, hasMore: boolean, cursor: string}>}
     */
    async getAll(options = {}) {
        this.init();
        
        const limit = options.limit || 50;
        const forceRefresh = options.forceRefresh || false;
        
        // Return cached list if fresh and no specific filters
        if (!forceRefresh && 
            !options.status && !options.format && !options.organizerId && !options.startAfter &&
            this._listCache && 
            Date.now() - this._listCacheTime < this._listCacheTimeout) {
            return this._listCache.slice(0, limit);
        }
        
        // Build optimized query
        let query = this._database.ref(this.config.COMPETITIONS_DB_PATH);
        
        // Use server-side ordering for better performance
        query = query.orderByChild('meta/eventDate');
        
        // Pagination support
        if (options.startAfter) {
            query = query.startAfter(options.startAfter);
        }
        
        // Limit results
        query = query.limitToLast(limit + 1); // +1 to check if more exist
        
        const snapshot = await query.once('value');
        
        let competitions = [];
        
        snapshot.forEach((child) => {
            const comp = child.val();
            if (comp && comp.meta) {
                comp.id = child.key;
                competitions.push(comp);
            }
        });
        
        // Reverse for newest first (since we used limitToLast)
        competitions.reverse();
        
        // Apply client-side filters (for fields not indexed)
        if (options.status) {
            competitions = competitions.filter(c => c.meta.status === options.status);
        }
        if (options.format) {
            competitions = competitions.filter(c => c.meta.format === options.format);
        }
        if (options.organizerId) {
            competitions = competitions.filter(c => c.meta.organizerId === options.organizerId);
        }
        
        // Check for more results
        const hasMore = competitions.length > limit;
        if (hasMore) {
            competitions = competitions.slice(0, limit);
        }
        
        // Cache the full list (without filters)
        if (!options.status && !options.format && !options.organizerId && !options.startAfter) {
            this._listCache = competitions;
            this._listCacheTime = Date.now();
            this._saveListCacheToStorage(competitions);
        }
        
        return competitions;
    },
    
    /**
     * Get competitions open for registration
     * @param {object} [options] - Filter options
     * @returns {Promise<Array>}
     */
    async getOpenForRegistration(options = {}) {
        return this.getAll({ ...options, status: this.STATUS.REGISTRATION });
    },
    
    /**
     * Get competitions the user can join based on their level
     * @param {number} userLevel - User's Playtomic level
     * @param {object} [options] - Additional filters
     * @returns {Promise<Array>}
     */
    async getEligible(userLevel, options = {}) {
        const competitions = await this.getOpenForRegistration(options);
        
        return competitions.filter(comp => {
            const min = parseFloat(comp.meta.minLevel) || 0;
            const max = parseFloat(comp.meta.maxLevel) || 10;
            return userLevel >= min && userLevel <= max;
        });
    },
    
    /**
     * Get a single competition by ID with multi-layer caching
     * @param {string} id - Competition ID
     * @param {boolean} [forceRefresh] - Skip cache
     * @returns {Promise<object|null>}
     */
    async getById(id, forceRefresh = false) {
        this.init();
        
        // Layer 1: Memory cache
        if (!forceRefresh) {
            const cached = this._cache.get(id);
            if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
                return cached.data;
            }
            
            // Layer 2: localStorage cache (for instant load on page refresh)
            try {
                const stored = localStorage.getItem(`uberpadel_comp_${id}`);
                if (stored) {
                    const { data, timestamp } = JSON.parse(stored);
                    if (Date.now() - timestamp < this._cacheTimeout) {
                        // Update memory cache
                        this._cache.set(id, { data, timestamp });
                        return data;
                    }
                }
            } catch (e) {
                // Ignore localStorage errors
            }
        }
        
        // Layer 3: Firebase
        const snapshot = await this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${id}`)
            .once('value');
        
        if (!snapshot.exists()) return null;
        
        const comp = snapshot.val();
        comp.id = id;
        
        // Update both caches
        const cacheEntry = { data: comp, timestamp: Date.now() };
        this._cache.set(id, cacheEntry);
        
        try {
            localStorage.setItem(`uberpadel_comp_${id}`, JSON.stringify(cacheEntry));
        } catch (e) {
            // Ignore localStorage errors
        }
        
        return comp;
    },
    
    /**
     * Get competitions organized by a user
     * @param {string} organizerId - Organizer's user ID
     * @returns {Promise<Array>}
     */
    async getByOrganizer(organizerId) {
        return this.getAll({ organizerId });
    },
    
    // ===== CREATE COMPETITION =====
    
    /**
     * Create a new competition
     * @param {object} data - Competition data
     * @returns {Promise<object>} Created competition
     */
    async create(data) {
        this.init();
        
        console.log('CompetitionService.create called with:', data);
        
        // Validate required fields
        if (!data.name || !data.name.trim()) {
            throw new Error('Competition name is required');
        }
        if (!data.format) {
            throw new Error('Competition format is required');
        }
        if (!data.organizerId) {
            throw new Error('Organizer ID is required');
        }
        
        const id = this._generateId();
        const organiserKey = this._generateOrganiserKey();
        
        // Build competition object with safe defaults (Firebase rejects undefined)
        const competition = {
            meta: {
                id,
                name: data.name.trim(),
                description: data.description || '',
                format: data.format,
                status: this.STATUS.DRAFT,
                
                // Event details (use null instead of undefined)
                eventDate: data.eventDate || null,
                eventTime: data.eventTime || null,
                location: data.location || '',
                
                // Player settings - ensure integers
                minPlayers: parseInt(data.minPlayers) || this._getDefaultMinPlayers(data.format),
                maxPlayers: parseInt(data.maxPlayers) || this._getDefaultMaxPlayers(data.format),
                
                // Level restrictions - ensure numbers
                minLevel: parseFloat(data.minLevel) || 0,
                maxLevel: parseFloat(data.maxLevel) || 10,
                accessRestriction: data.accessRestriction || this.ACCESS.ANYONE,
                
                // Format-specific settings (use null instead of undefined)
                courts: parseInt(data.courts) || 4,
                pointsPerGame: parseInt(data.pointsPerGame) || 32,
                roundCount: data.roundCount !== undefined ? data.roundCount : null,
                
                // Organizer
                organizerId: data.organizerId,
                organizerName: data.organizerName || 'Unknown',
                organiserKey,
                
                // Timestamps
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            registeredPlayers: {},
            matches: {},
            standings: {}
        };
        
        console.log('Saving competition to Firebase:', competition);
        
        // Sanitize object - remove undefined values (Firebase rejects them)
        const sanitize = (obj) => {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value === undefined) continue;
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    result[key] = sanitize(value);
                } else {
                    result[key] = value;
                }
            }
            return result;
        };
        
        const sanitizedCompetition = sanitize(competition);
        console.log('Sanitized competition:', sanitizedCompetition);
        
        try {
            await this._database
                .ref(`${this.config.COMPETITIONS_DB_PATH}/${id}`)
                .set(sanitizedCompetition);
            
            console.log('Competition created successfully with ID:', id);
            
            competition.id = id;
            return { competition, organiserKey };
        } catch (firebaseError) {
            console.error('Firebase error:', firebaseError);
            throw new Error(`Database error: ${firebaseError.message}`);
        }
    },
    
    /**
     * Update competition metadata
     * @param {string} id - Competition ID
     * @param {object} updates - Fields to update
     * @returns {Promise<object>}
     */
    async update(id, updates) {
        this.init();
        
        // Don't allow updating certain fields
        delete updates.id;
        delete updates.organizerId;
        delete updates.organiserKey;
        delete updates.createdAt;
        
        updates.updatedAt = new Date().toISOString();
        
        await this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${id}/meta`)
            .update(updates);
        
        // Invalidate cache
        this._cache.delete(id);
        
        return this.getById(id);
    },
    
    /**
     * Update competition status
     * @param {string} id - Competition ID
     * @param {string} status - New status
     * @returns {Promise<object>}
     */
    async updateStatus(id, status) {
        return this.update(id, { status });
    },
    
    /**
     * Open registration for a competition
     * @param {string} id - Competition ID
     * @returns {Promise<object>}
     */
    async openRegistration(id) {
        return this.updateStatus(id, this.STATUS.REGISTRATION);
    },
    
    /**
     * Start a competition
     * @param {string} id - Competition ID
     * @returns {Promise<object>}
     */
    async start(id) {
        const comp = await this.getById(id);
        if (!comp) throw new Error('Competition not found');
        
        // Generate initial fixtures based on format
        await this._generateInitialFixtures(comp);
        
        return this.updateStatus(id, this.STATUS.ACTIVE);
    },
    
    /**
     * Complete a competition
     * @param {string} id - Competition ID
     * @returns {Promise<object>}
     */
    async complete(id) {
        return this.updateStatus(id, this.STATUS.COMPLETED);
    },
    
    /**
     * Cancel a competition
     * @param {string} id - Competition ID
     * @returns {Promise<object>}
     */
    async cancel(id) {
        return this.updateStatus(id, this.STATUS.CANCELLED);
    },
    
    /**
     * Delete a competition
     * @param {string} id - Competition ID
     */
    async delete(id) {
        this.init();
        await this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${id}`)
            .remove();
        this._cache.delete(id);
    },
    
    // ===== REGISTRATION =====
    
    /**
     * Register a player for a competition
     * @param {string} competitionId - Competition ID
     * @param {object} player - Player data
     * @returns {Promise<object>}
     */
    async registerPlayer(competitionId, player) {
        this.init();
        
        const comp = await this.getById(competitionId);
        if (!comp) throw new Error('Competition not found');
        
        // Validate registration is open
        if (comp.meta.status !== this.STATUS.REGISTRATION) {
            throw new Error('Registration is not open');
        }
        
        // Check capacity
        const registeredCount = Object.keys(comp.registeredPlayers || {}).length;
        if (registeredCount >= comp.meta.maxPlayers) {
            throw new Error('Competition is full');
        }
        
        // Check if already registered by ID
        if (comp.registeredPlayers && comp.registeredPlayers[player.id]) {
            throw new Error('You are already registered');
        }
        
        // Check if already registered by email (for registered users)
        if (player.email && comp.registeredPlayers) {
            const existingByEmail = Object.values(comp.registeredPlayers).find(
                p => p.email && p.email.toLowerCase() === player.email.toLowerCase()
            );
            if (existingByEmail) {
                throw new Error('This email is already registered for this competition');
            }
        }
        
        // Check if already registered by name (for guests - warn but allow)
        if (comp.registeredPlayers) {
            const existingByName = Object.values(comp.registeredPlayers).find(
                p => p.name.toLowerCase() === player.name.toLowerCase()
            );
            if (existingByName) {
                // For guests, allow but warn (they might be re-registering from a different device)
                console.warn(`Player with name "${player.name}" already registered`);
            }
        }
        
        // Register player (use null instead of undefined - Firebase rejects undefined)
        const registration = {
            id: player.id,
            name: player.name,
            email: player.email || null,
            level: player.level !== undefined ? player.level : null,
            registeredAt: new Date().toISOString()
        };
        
        await this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${competitionId}/registeredPlayers/${player.id}`)
            .set(registration);
        
        this._cache.delete(competitionId);
        
        return registration;
    },
    
    /**
     * Unregister a player from a competition
     * @param {string} competitionId - Competition ID
     * @param {string} playerId - Player ID
     */
    async unregisterPlayer(competitionId, playerId) {
        this.init();
        
        const comp = await this.getById(competitionId);
        if (!comp) throw new Error('Competition not found');
        
        if (comp.meta.status !== this.STATUS.REGISTRATION) {
            throw new Error('Cannot unregister after registration closes');
        }
        
        await this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${competitionId}/registeredPlayers/${playerId}`)
            .remove();
        
        this._cache.delete(competitionId);
    },
    
    /**
     * Get registered players for a competition
     * @param {string} competitionId - Competition ID
     * @returns {Promise<Array>}
     */
    async getRegisteredPlayers(competitionId) {
        const comp = await this.getById(competitionId);
        if (!comp) return [];
        
        return Object.values(comp.registeredPlayers || {});
    },
    
    /**
     * Check if a player is registered
     * @param {string} competitionId - Competition ID
     * @param {string} playerId - Player ID
     * @returns {Promise<boolean>}
     */
    async isPlayerRegistered(competitionId, playerId) {
        const comp = await this.getById(competitionId);
        return !!(comp && comp.registeredPlayers && comp.registeredPlayers[playerId]);
    },
    
    // ===== MATCHES & SCORES =====
    
    /**
     * Update a match score
     * @param {string} competitionId - Competition ID
     * @param {string} matchId - Match ID
     * @param {object} score - Score data { team1: number, team2: number }
     */
    async updateScore(competitionId, matchId, score) {
        this.init();
        
        await this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${competitionId}/matches/${matchId}`)
            .update({
                score,
                completedAt: new Date().toISOString()
            });
        
        // Recalculate standings
        await this._recalculateStandings(competitionId);
        
        this._cache.delete(competitionId);
    },
    
    /**
     * Get standings for a competition
     * @param {string} competitionId - Competition ID
     * @returns {Promise<Array>}
     */
    async getStandings(competitionId) {
        const comp = await this.getById(competitionId);
        if (!comp) return [];
        
        return Object.values(comp.standings || {})
            .sort((a, b) => (b.points || b.avgScore || 0) - (a.points || a.avgScore || 0));
    },
    
    // ===== ORGANIZER ACCESS =====
    
    /**
     * Verify organizer key
     * @param {string} competitionId - Competition ID
     * @param {string} key - Organizer key to verify
     * @returns {Promise<boolean>}
     */
    async verifyOrganiserKey(competitionId, key) {
        const comp = await this.getById(competitionId);
        return comp && comp.meta.organiserKey === key;
    },
    
    /**
     * Check if user is the organizer
     * @param {string} competitionId - Competition ID
     * @param {string} userId - User ID
     * @returns {Promise<boolean>}
     */
    async isOrganizer(competitionId, userId) {
        const comp = await this.getById(competitionId);
        return comp && comp.meta.organizerId === userId;
    },
    
    // ===== REAL-TIME LISTENERS =====
    
    /**
     * Debounce helper to prevent excessive updates
     */
    _debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Listen to competition changes with debouncing
     * @param {string} competitionId - Competition ID
     * @param {function} callback - Called on changes
     * @param {number} [debounceMs=100] - Debounce delay
     * @returns {function} Unsubscribe function
     */
    onCompetitionChange(competitionId, callback, debounceMs = 100) {
        this.init();
        
        // Check if already listening
        const existingKey = `comp_${competitionId}`;
        if (this._activeListeners.has(existingKey)) {
            // Add callback to existing listener
            const existing = this._activeListeners.get(existingKey);
            existing.callbacks.push(callback);
            return () => {
                existing.callbacks = existing.callbacks.filter(cb => cb !== callback);
                if (existing.callbacks.length === 0) {
                    existing.unsubscribe();
                    this._activeListeners.delete(existingKey);
                }
            };
        }
        
        const ref = this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${competitionId}`);
        
        const callbacks = [callback];
        
        // Debounced handler
        const debouncedHandler = this._debounce((snapshot) => {
            let comp = null;
            if (snapshot.exists()) {
                comp = snapshot.val();
                comp.id = competitionId;
                
                // Update cache
                this._cache.set(competitionId, { data: comp, timestamp: Date.now() });
            }
            
            callbacks.forEach(cb => cb(comp));
        }, debounceMs);
        
        const listener = ref.on('value', debouncedHandler);
        
        const unsubscribe = () => {
            ref.off('value', listener);
            this._activeListeners.delete(existingKey);
        };
        
        this._activeListeners.set(existingKey, { callbacks, unsubscribe });
        
        return () => {
            callbacks.splice(callbacks.indexOf(callback), 1);
            if (callbacks.length === 0) {
                unsubscribe();
            }
        };
    },
    
    /**
     * Listen to registration changes with debouncing
     * @param {string} competitionId - Competition ID
     * @param {function} callback - Called on changes
     * @param {number} [debounceMs=100] - Debounce delay
     * @returns {function} Unsubscribe function
     */
    onRegistrationChange(competitionId, callback, debounceMs = 100) {
        this.init();
        
        const ref = this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${competitionId}/registeredPlayers`);
        
        const listener = ref.on('value', (snapshot) => {
            const players = [];
            snapshot.forEach((child) => {
                players.push(child.val());
            });
            callback(players);
        });
        
        return () => ref.off('value', listener);
    },
    
    // ===== UTILITY METHODS =====
    
    /**
     * Get format display info
     * @param {string} format - Format key
     * @returns {object}
     */
    getFormatInfo(format) {
        const formats = {
            [this.FORMAT.AMERICANO]: {
                label: 'Americano',
                emoji: '🔄',
                color: 'blue',
                description: 'Rotating partners, play with everyone'
            },
            [this.FORMAT.MEXICANO]: {
                label: 'Mexicano',
                emoji: '🌶️',
                color: 'orange',
                description: 'Dynamic pairings based on standings'
            },
            [this.FORMAT.MIX]: {
                label: 'Mix Tournament',
                emoji: '🏆',
                color: 'purple',
                description: 'Group stage + knockout bracket'
            },
            [this.FORMAT.TEAM_LEAGUE]: {
                label: 'Team League',
                emoji: '👥',
                color: 'amber',
                description: 'Fixed teams, round-robin league'
            }
        };
        return formats[format] || { label: format, emoji: '🎾', color: 'gray' };
    },
    
    /**
     * Get status display info
     * @param {string} status - Status key
     * @returns {object}
     */
    getStatusInfo(status) {
        const statuses = {
            [this.STATUS.DRAFT]: {
                label: 'Draft',
                color: 'gray',
                bgClass: 'bg-gray-100 text-gray-600'
            },
            [this.STATUS.REGISTRATION]: {
                label: 'Registration Open',
                color: 'green',
                bgClass: 'bg-green-100 text-green-700'
            },
            [this.STATUS.ACTIVE]: {
                label: 'In Progress',
                color: 'blue',
                bgClass: 'bg-blue-100 text-blue-700'
            },
            [this.STATUS.COMPLETED]: {
                label: 'Completed',
                color: 'purple',
                bgClass: 'bg-purple-100 text-purple-700'
            },
            [this.STATUS.CANCELLED]: {
                label: 'Cancelled',
                color: 'red',
                bgClass: 'bg-red-100 text-red-600'
            }
        };
        return statuses[status] || { label: status, color: 'gray', bgClass: 'bg-gray-100' };
    },
    
    /**
     * Format level for display
     * @param {number} level - Level value
     * @returns {string}
     */
    formatLevel(level) {
        if (!level) return '-';
        return parseFloat(level).toFixed(2);
    },
    
    /**
     * Check if user can access a competition
     * @param {object} competition - Competition object
     * @param {object} user - User object from AuthService
     * @returns {object} { canAccess: boolean, reason: string }
     */
    checkAccess(competition, user) {
        const access = competition.meta.accessRestriction || this.ACCESS.ANYONE;
        
        if (access === this.ACCESS.ANYONE) {
            return { canAccess: true };
        }
        
        if (!user) {
            return { canAccess: false, reason: 'Sign in required' };
        }
        
        if (access === this.ACCESS.REGISTERED && user.type === 'guest') {
            return { canAccess: false, reason: 'Registered account required' };
        }
        
        if (access === this.ACCESS.VERIFIED && user.status !== 'verified') {
            return { canAccess: false, reason: 'Verified account required' };
        }
        
        return { canAccess: true };
    },
    
    /**
     * Check if user meets level requirements
     * @param {object} competition - Competition object
     * @param {number} userLevel - User's level
     * @returns {object} { eligible: boolean, reason: string }
     */
    checkEligibility(competition, userLevel) {
        if (!userLevel) {
            return { eligible: true }; // Can't check without level
        }
        
        const min = parseFloat(competition.meta.minLevel) || 0;
        const max = parseFloat(competition.meta.maxLevel) || 10;
        
        if (userLevel < min) {
            return { 
                eligible: false, 
                reason: `Level too low (min: ${this.formatLevel(min)})` 
            };
        }
        
        if (userLevel > max) {
            return { 
                eligible: false, 
                reason: `Level too high (max: ${this.formatLevel(max)})` 
            };
        }
        
        return { eligible: true };
    },
    
    // ===== PRIVATE METHODS =====
    
    _generateId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id.toLowerCase();
    },
    
    _generateOrganiserKey() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let key = '';
        for (let i = 0; i < 6; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return key;
    },
    
    _getDefaultMinPlayers(format) {
        switch (format) {
            case this.FORMAT.AMERICANO: return 8;
            case this.FORMAT.MEXICANO: return 8;
            case this.FORMAT.MIX: return 8;
            case this.FORMAT.TEAM_LEAGUE: return 6;
            default: return 8;
        }
    },
    
    _getDefaultMaxPlayers(format) {
        switch (format) {
            case this.FORMAT.AMERICANO: return 24;
            case this.FORMAT.MEXICANO: return 24;
            case this.FORMAT.MIX: return 32;
            case this.FORMAT.TEAM_LEAGUE: return 32;
            default: return 24;
        }
    },
    
    async _generateInitialFixtures(competition) {
        // Use shared engines from Phase 3
        const format = competition.meta.format;
        const players = Object.values(competition.registeredPlayers || {});
        
        if (players.length === 0) {
            console.warn('No players to generate fixtures for');
            return;
        }
        
        let fixtures = {};
        
        switch (format) {
            case this.FORMAT.AMERICANO:
                if (typeof AmericanoEngine !== 'undefined') {
                    const playerCount = players.length;
                    const courts = competition.meta.courts || AmericanoEngine.getOptimalCourtCount(playerCount);
                    // Note: Full fixture generation handled by Quick Play integration
                    // Here we just set up the initial state
                    fixtures = {
                        generatedAt: new Date().toISOString(),
                        format: 'americano',
                        playerCount,
                        courts
                    };
                }
                break;
                
            case this.FORMAT.MEXICANO:
                if (typeof MexicanoEngine !== 'undefined') {
                    const playerCount = players.length;
                    const courts = MexicanoEngine.getCourtCount(playerCount);
                    const roundCount = competition.meta.roundCount || MexicanoEngine.getDefaultRoundCount(playerCount);
                    
                    // Generate first round pairings
                    const pairings = MexicanoEngine.generateRandomPairings(players.map((p, i) => i));
                    
                    fixtures = {
                        generatedAt: new Date().toISOString(),
                        format: 'mexicano',
                        playerCount,
                        courts,
                        roundCount,
                        currentRound: 1,
                        rounds: {
                            1: { pairings, completed: false }
                        }
                    };
                }
                break;
                
            case this.FORMAT.MIX:
                if (typeof TournamentEngine !== 'undefined') {
                    const playerCount = players.length;
                    fixtures = {
                        generatedAt: new Date().toISOString(),
                        format: 'mix',
                        playerCount,
                        stage: 'group' // Start in group stage
                    };
                }
                break;
                
            case this.FORMAT.TEAM_LEAGUE:
                if (typeof TeamLeagueEngine !== 'undefined') {
                    // Convert players to teams if not already
                    const teamCount = Math.floor(players.length / 2) || players.length;
                    const rounds = TeamLeagueEngine.generateRoundRobinFixtures(teamCount);
                    
                    fixtures = {
                        generatedAt: new Date().toISOString(),
                        format: 'team-league',
                        teamCount,
                        roundRobinRounds: rounds
                    };
                }
                break;
        }
        
        // Save fixtures to database
        await this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${competition.id}/fixtures`)
            .set(fixtures);
        
        console.log(`Generated fixtures for ${format} with ${players.length} players`);
    },
    
    async _recalculateStandings(competitionId) {
        // Use shared engines from Phase 3
        const comp = await this.getById(competitionId);
        if (!comp) return;
        
        const format = comp.meta.format;
        const matches = Object.values(comp.matches || {});
        const players = Object.values(comp.registeredPlayers || {});
        
        if (matches.length === 0 || players.length === 0) {
            return;
        }
        
        let standings = {};
        
        // Build player map for standings
        const playerMap = {};
        players.forEach(p => {
            playerMap[p.id] = {
                id: p.id,
                name: p.name,
                gamesPlayed: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                totalScore: 0,
                avgScore: 0
            };
        });
        
        // Process matches
        matches.forEach(match => {
            if (!match.score || match.score.team1 === undefined || match.score.team2 === undefined) {
                return;
            }
            
            const score1 = parseInt(match.score.team1) || 0;
            const score2 = parseInt(match.score.team2) || 0;
            
            // Update team 1 players
            (match.team1 || []).forEach(playerId => {
                if (playerMap[playerId]) {
                    playerMap[playerId].gamesPlayed++;
                    playerMap[playerId].pointsFor += score1;
                    playerMap[playerId].pointsAgainst += score2;
                    playerMap[playerId].totalScore += score1;
                    
                    if (score1 > score2) playerMap[playerId].wins++;
                    else if (score1 < score2) playerMap[playerId].losses++;
                    else playerMap[playerId].draws++;
                }
            });
            
            // Update team 2 players
            (match.team2 || []).forEach(playerId => {
                if (playerMap[playerId]) {
                    playerMap[playerId].gamesPlayed++;
                    playerMap[playerId].pointsFor += score2;
                    playerMap[playerId].pointsAgainst += score1;
                    playerMap[playerId].totalScore += score2;
                    
                    if (score2 > score1) playerMap[playerId].wins++;
                    else if (score2 < score1) playerMap[playerId].losses++;
                    else playerMap[playerId].draws++;
                }
            });
        });
        
        // Calculate averages
        Object.values(playerMap).forEach(p => {
            if (p.gamesPlayed > 0) {
                p.avgScore = Math.round((p.totalScore / p.gamesPlayed) * 100) / 100;
            }
        });
        
        // Sort standings based on format
        let sortedStandings;
        
        switch (format) {
            case this.FORMAT.AMERICANO:
                // Americano: Sort by average score
                sortedStandings = Object.values(playerMap)
                    .sort((a, b) => b.avgScore - a.avgScore || b.totalScore - a.totalScore);
                break;
                
            case this.FORMAT.MEXICANO:
                // Mexicano: Sort by total score
                sortedStandings = Object.values(playerMap)
                    .sort((a, b) => b.totalScore - a.totalScore || b.avgScore - a.avgScore);
                break;
                
            case this.FORMAT.MIX:
            case this.FORMAT.TEAM_LEAGUE:
            default:
                // Points system: 3 for win, 1 for draw
                sortedStandings = Object.values(playerMap)
                    .map(p => ({
                        ...p,
                        points: (p.wins * 3) + (p.draws * 1),
                        pointDiff: p.pointsFor - p.pointsAgainst
                    }))
                    .sort((a, b) => b.points - a.points || b.pointDiff - a.pointDiff);
                break;
        }
        
        // Add rank
        sortedStandings.forEach((p, idx) => {
            p.rank = idx + 1;
            standings[p.id] = p;
        });
        
        // Save standings
        await this._database
            .ref(`${this.config.COMPETITIONS_DB_PATH}/${competitionId}/standings`)
            .set(standings);
        
        console.log(`Recalculated standings for competition ${competitionId}`);
    },
    
    // ===== BATCH OPERATIONS =====
    
    /**
     * Update multiple matches in a single batch
     * More efficient than individual updates
     * @param {string} competitionId - Competition ID
     * @param {Array<{matchId: string, score: object}>} updates - Array of score updates
     */
    async batchUpdateScores(competitionId, updates) {
        this.init();
        
        const batchUpdate = {};
        const now = new Date().toISOString();
        
        updates.forEach(({ matchId, score }) => {
            batchUpdate[`${this.config.COMPETITIONS_DB_PATH}/${competitionId}/matches/${matchId}/score`] = score;
            batchUpdate[`${this.config.COMPETITIONS_DB_PATH}/${competitionId}/matches/${matchId}/completedAt`] = now;
        });
        
        // Single atomic write
        await this._database.ref().update(batchUpdate);
        
        // Recalculate standings once
        await this._recalculateStandings(competitionId);
        
        // Clear cache
        this._cache.delete(competitionId);
    },
    
    /**
     * Register multiple players in a batch
     * @param {string} competitionId - Competition ID
     * @param {Array<object>} players - Array of player objects
     */
    async batchRegisterPlayers(competitionId, players) {
        this.init();
        
        const comp = await this.getById(competitionId);
        if (!comp) throw new Error('Competition not found');
        
        const currentCount = Object.keys(comp.registeredPlayers || {}).length;
        const maxPlayers = comp.meta.maxPlayers;
        
        if (currentCount + players.length > maxPlayers) {
            throw new Error(`Cannot register ${players.length} players. Only ${maxPlayers - currentCount} spots available.`);
        }
        
        const batchUpdate = {};
        const now = new Date().toISOString();
        
        players.forEach(player => {
            batchUpdate[`${this.config.COMPETITIONS_DB_PATH}/${competitionId}/registeredPlayers/${player.id}`] = {
                ...player,
                registeredAt: now
            };
        });
        
        await this._database.ref().update(batchUpdate);
        this._cache.delete(competitionId);
    },
    
    // ===== CACHE MANAGEMENT =====
    
    /**
     * Clear all caches - useful after major updates
     */
    clearAllCaches() {
        this._cache.clear();
        this._listCache = null;
        this._listCacheTime = 0;
        
        // Clear localStorage caches
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('uberpadel_comp_') || key === 'uberpadel_competitions_cache') {
                    localStorage.removeItem(key);
                }
            });
        } catch (e) {
            // Ignore localStorage errors
        }
    },
    
    /**
     * Clear cache for a specific competition
     * @param {string} competitionId - Competition ID
     */
    clearCache(competitionId) {
        this._cache.delete(competitionId);
        
        try {
            localStorage.removeItem(`uberpadel_comp_${competitionId}`);
        } catch (e) {
            // Ignore localStorage errors
        }
    },
    
    /**
     * Get cache statistics for debugging
     * @returns {object} Cache stats
     */
    getCacheStats() {
        return {
            memoryCacheSize: this._cache.size,
            listCacheAge: this._listCacheTime ? Date.now() - this._listCacheTime : null,
            isOnline: this._isOnline,
            connectionState: this._connectionState,
            pendingWrites: this._pendingWrites.length,
            activeListeners: this._activeListeners.size
        };
    },
    
    /**
     * Prefetch competitions for faster navigation
     * Call on page load to warm cache
     * @param {number} [limit=20] - Number to prefetch
     */
    async prefetch(limit = 20) {
        try {
            await this.getAll({ limit, forceRefresh: false });
        } catch (e) {
            // Ignore prefetch errors
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CompetitionService };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CompetitionService = CompetitionService;
}
