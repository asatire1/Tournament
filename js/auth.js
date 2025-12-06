// ===== UBER PADEL AUTH UTILITY =====
// Shared authentication state management for all pages

const UberAuth = {
    // Storage keys
    USER_STORAGE_KEY: 'uber_padel_user',
    USERS_DB_PATH: 'users',
    
    // Current user cache
    _currentUser: null,
    _listeners: [],
    
    // ===== INITIALIZATION =====
    
    /**
     * Initialize auth - call this on page load
     * @param {object} firebaseApp - Firebase app instance (optional if already initialized)
     */
    async init(firebaseApp) {
        // Load from localStorage first for instant UI
        this._currentUser = this.getStoredUser();
        this._notifyListeners();
        
        // If registered user, verify with Firebase
        if (this._currentUser && this._currentUser.type === 'registered') {
            await this._verifyRegisteredUser();
        }
        
        // Listen for Firebase auth changes
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(async (firebaseUser) => {
                if (firebaseUser && (!this._currentUser || this._currentUser.type !== 'guest')) {
                    await this._syncFirebaseUser(firebaseUser);
                }
            });
        }
        
        return this._currentUser;
    },
    
    // ===== GETTERS =====
    
    /**
     * Get current user (from memory or localStorage)
     * @returns {object|null} User object or null
     */
    getCurrentUser() {
        if (!this._currentUser) {
            this._currentUser = this.getStoredUser();
        }
        return this._currentUser;
    },
    
    /**
     * Get stored user from localStorage
     * @returns {object|null}
     */
    getStoredUser() {
        try {
            const data = localStorage.getItem(this.USER_STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading stored user:', e);
            return null;
        }
    },
    
    /**
     * Check if user is logged in (guest or registered)
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.getCurrentUser();
    },
    
    /**
     * Check if user is a guest
     * @returns {boolean}
     */
    isGuest() {
        const user = this.getCurrentUser();
        return user && user.type === 'guest';
    },
    
    /**
     * Check if user is registered (Google sign-in)
     * @returns {boolean}
     */
    isRegistered() {
        const user = this.getCurrentUser();
        return user && user.type === 'registered';
    },
    
    /**
     * Check if user is verified
     * @returns {boolean}
     */
    isVerified() {
        const user = this.getCurrentUser();
        return user && user.type === 'registered' && user.status === 'verified';
    },
    
    /**
     * Check if user is pending verification
     * @returns {boolean}
     */
    isPending() {
        const user = this.getCurrentUser();
        return user && user.type === 'registered' && user.status === 'pending';
    },
    
    /**
     * Get user's display name
     * @returns {string}
     */
    getName() {
        const user = this.getCurrentUser();
        return user ? user.name : 'Guest';
    },
    
    /**
     * Get user's status label
     * @returns {string}
     */
    getStatusLabel() {
        const user = this.getCurrentUser();
        if (!user) return 'Not signed in';
        if (user.type === 'guest') return 'Guest';
        if (user.status === 'verified') return 'Verified';
        return 'Pending';
    },
    
    /**
     * Get user's status badge HTML
     * @returns {string}
     */
    getStatusBadge() {
        const user = this.getCurrentUser();
        if (!user) {
            return '<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Not signed in</span>';
        }
        if (user.type === 'guest') {
            return '<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">👤 Guest</span>';
        }
        if (user.status === 'verified') {
            return '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ Verified</span>';
        }
        return '<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">⏳ Pending</span>';
    },
    
    // ===== PERMISSIONS =====
    
    /**
     * Check if user can join a tournament
     * @param {object} tournament - Tournament object with mode property
     * @returns {object} { allowed: boolean, reason: string }
     */
    canJoinTournament(tournament) {
        const user = this.getCurrentUser();
        const mode = tournament.mode || 'anyone';
        
        if (!user) {
            return { allowed: false, reason: 'Please sign in to join tournaments' };
        }
        
        if (mode === 'anyone') {
            return { allowed: true, reason: '' };
        }
        
        if (mode === 'registered') {
            if (user.type === 'guest') {
                return { allowed: false, reason: 'This tournament is for registered players only' };
            }
            return { allowed: true, reason: '' };
        }
        
        if (mode === 'level-based') {
            if (user.type === 'guest') {
                return { allowed: false, reason: 'This tournament requires verified players' };
            }
            if (user.status !== 'verified') {
                return { allowed: false, reason: 'Your account must be verified to join level-based tournaments' };
            }
            // Check level criteria
            if (tournament.levelCriteria && user.playtomicLevel) {
                const level = parseFloat(user.playtomicLevel);
                if (level < tournament.levelCriteria.min || level > tournament.levelCriteria.max) {
                    return { 
                        allowed: false, 
                        reason: `Your level (${level}) is outside the required range (${tournament.levelCriteria.min} - ${tournament.levelCriteria.max})`
                    };
                }
            }
            return { allowed: true, reason: '' };
        }
        
        return { allowed: true, reason: '' };
    },
    
    /**
     * Check if user can create tournaments with specific modes
     * @returns {object} { anyone: boolean, registered: boolean, levelBased: boolean }
     */
    getOrganiserPermissions() {
        const user = this.getCurrentUser();
        
        if (!user) {
            return { anyone: false, registered: false, levelBased: false };
        }
        
        if (user.type === 'guest') {
            return { anyone: true, registered: false, levelBased: false };
        }
        
        if (user.status === 'verified') {
            return { anyone: true, registered: true, levelBased: true };
        }
        
        // Pending registered user
        return { anyone: true, registered: false, levelBased: false };
    },
    
    // ===== ACTIONS =====
    
    /**
     * Store user data
     * @param {object} user
     */
    setStoredUser(user) {
        localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
        this._currentUser = user;
        this._notifyListeners();
    },
    
    /**
     * Clear stored user (logout)
     */
    clearStoredUser() {
        localStorage.removeItem(this.USER_STORAGE_KEY);
        this._currentUser = null;
        this._notifyListeners();
    },
    
    /**
     * Sign out user
     */
    async signOut() {
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().signOut();
            }
            this.clearStoredUser();
            return true;
        } catch (error) {
            console.error('Sign out error:', error);
            return false;
        }
    },
    
    /**
     * Redirect to login if not authenticated
     * @param {string} returnUrl - URL to return to after login
     */
    requireLogin(returnUrl) {
        if (!this.isLoggedIn()) {
            const return_param = returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : '';
            window.location.href = `login.html${return_param}`;
            return false;
        }
        return true;
    },
    
    /**
     * Redirect to login if not verified
     * @param {string} returnUrl
     */
    requireVerified(returnUrl) {
        if (!this.isVerified()) {
            if (!this.isLoggedIn()) {
                this.requireLogin(returnUrl);
            } else {
                // Show message that verification is required
                alert('You need to be verified to access this feature.');
            }
            return false;
        }
        return true;
    },
    
    // ===== LISTENERS =====
    
    /**
     * Add auth state change listener
     * @param {function} callback - Called with user object when auth state changes
     * @returns {function} Unsubscribe function
     */
    onAuthStateChange(callback) {
        this._listeners.push(callback);
        // Immediately call with current state
        callback(this._currentUser);
        
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    },
    
    _notifyListeners() {
        this._listeners.forEach(callback => {
            try {
                callback(this._currentUser);
            } catch (e) {
                console.error('Auth listener error:', e);
            }
        });
    },
    
    // ===== INTERNAL =====
    
    async _verifyRegisteredUser() {
        if (!this._currentUser || this._currentUser.type !== 'registered') return;
        
        try {
            const snapshot = await firebase.database()
                .ref(`${this.USERS_DB_PATH}/${this._currentUser.id}`)
                .once('value');
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                // Update local cache with latest data
                this._currentUser = {
                    ...this._currentUser,
                    name: userData.name,
                    status: userData.status,
                    playtomicLevel: userData.playtomicLevel
                };
                this.setStoredUser(this._currentUser);
            } else {
                // User no longer exists in DB
                this.clearStoredUser();
            }
        } catch (error) {
            console.error('Error verifying user:', error);
        }
    },
    
    async _syncFirebaseUser(firebaseUser) {
        try {
            const snapshot = await firebase.database()
                .ref(this.USERS_DB_PATH)
                .orderByChild('googleUid')
                .equalTo(firebaseUser.uid)
                .once('value');
            
            if (snapshot.exists()) {
                let userData = null;
                snapshot.forEach(child => {
                    userData = { id: child.key, ...child.val() };
                });
                
                this.setStoredUser({
                    type: 'registered',
                    id: userData.id,
                    name: userData.name,
                    status: userData.status,
                    email: userData.email,
                    playtomicLevel: userData.playtomicLevel
                });
            }
        } catch (error) {
            console.error('Error syncing Firebase user:', error);
        }
    },
    
    // ===== UI HELPERS =====
    
    /**
     * Get login button HTML for navigation
     * @returns {string}
     */
    getNavHTML() {
        const user = this.getCurrentUser();
        
        if (!user) {
            return `<a href="login.html" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">Sign In</a>`;
        }
        
        return `
            <a href="my-account.html" class="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors">
                <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                <span class="font-medium text-gray-700">${user.name}</span>
                ${this.getStatusBadge()}
            </a>
        `;
    },
    
    /**
     * Render user info in a container
     * @param {string} containerId
     */
    renderUserInfo(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = this.getNavHTML();
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UberAuth;
}

console.log('✅ UberAuth utility loaded');
