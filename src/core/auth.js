/**
 * auth.js - Enhanced Authentication Module
 * Integrates with permissions.js for role-based access control
 * 
 * @module core/auth
 */

// Dependencies: permissions.js, storage.js, firebase.js should be loaded first

/**
 * Enhanced Auth object that works with the new permissions system
 */
const Auth = {
    // Storage key (consistent with existing)
    USER_STORAGE_KEY: 'uber_padel_user',
    USERS_DB_PATH: 'users',
    
    // Current user cache
    _currentUser: null,
    _listeners: [],
    _initialized: false,

    // ===== INITIALIZATION =====

    /**
     * Initialize auth - call this on page load
     * @returns {Promise<object|null>} Current user
     */
    async init() {
        if (this._initialized) {
            return this._currentUser;
        }

        // Load from localStorage first for instant UI
        this._currentUser = this._getStoredUser();
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

        this._initialized = true;
        return this._currentUser;
    },

    // ===== GETTERS =====

    /**
     * Get current user
     * @returns {object|null}
     */
    getCurrentUser() {
        if (!this._currentUser) {
            this._currentUser = this._getStoredUser();
        }
        return this._currentUser;
    },

    /**
     * Get stored user from localStorage
     * @private
     * @returns {object|null}
     */
    _getStoredUser() {
        try {
            // Use Storage if available, otherwise direct localStorage
            if (typeof Storage !== 'undefined' && Storage.getUser) {
                return Storage.getUser();
            }
            const data = localStorage.getItem(this.USER_STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading stored user:', e);
            return null;
        }
    },

    /**
     * Check if user is logged in
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
     * Check if user is admin
     * @returns {boolean}
     */
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.isAdmin === true;
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
     * Get user's role using permissions system
     * @returns {string}
     */
    getRole() {
        // Use Permissions if available
        if (typeof Permissions !== 'undefined' && Permissions.getRole) {
            return Permissions.getRole(this.getCurrentUser());
        }
        // Fallback
        const user = this.getCurrentUser();
        if (!user) return 'guest';
        if (user.type === 'guest') return 'guest';
        if (user.isAdmin) return 'admin';
        if (user.status === 'verified') return 'verified';
        if (user.type === 'registered') return 'registered';
        return 'guest';
    },

    // ===== PERMISSIONS INTEGRATION =====

    /**
     * Check if user has a specific permission
     * @param {string} permission - Permission name
     * @returns {boolean}
     */
    can(permission) {
        if (typeof Permissions !== 'undefined' && Permissions.can) {
            return Permissions.can(this.getCurrentUser(), permission);
        }
        console.warn('Permissions module not loaded, defaulting to true');
        return true;
    },

    /**
     * Check if user has at least a certain role
     * @param {string} role - Required role
     * @returns {boolean}
     */
    hasRole(role) {
        if (typeof Permissions !== 'undefined' && Permissions.hasRole) {
            return Permissions.hasRole(this.getCurrentUser(), role);
        }
        return false;
    },

    /**
     * Check if user can join a tournament
     * @param {object} tournament - Tournament with mode and levelCriteria
     * @returns {{ allowed: boolean, reason: string }}
     */
    canJoinTournament(tournament) {
        if (typeof Permissions !== 'undefined' && Permissions.canJoinTournament) {
            return Permissions.canJoinTournament(this.getCurrentUser(), tournament);
        }
        // Fallback to simple check
        return { allowed: this.isLoggedIn(), reason: '' };
    },

    /**
     * Get tournament creation permissions
     * @returns {{ anyone: boolean, registered: boolean, levelBased: boolean }}
     */
    getCreationPermissions() {
        if (typeof Permissions !== 'undefined' && Permissions.getCreationPermissions) {
            return Permissions.getCreationPermissions(this.getCurrentUser());
        }
        // Fallback
        const user = this.getCurrentUser();
        if (!user) return { anyone: false, registered: false, levelBased: false };
        if (user.type === 'guest') return { anyone: true, registered: false, levelBased: false };
        if (user.status === 'verified') return { anyone: true, registered: true, levelBased: true };
        return { anyone: true, registered: false, levelBased: false };
    },

    // ===== UI HELPERS =====

    /**
     * Get status label
     * @returns {string}
     */
    getStatusLabel() {
        const user = this.getCurrentUser();
        if (!user) return 'Not signed in';
        if (user.type === 'guest') return 'Guest';
        if (user.isAdmin) return 'Admin';
        if (user.status === 'verified') return 'Verified';
        return 'Pending';
    },

    /**
     * Get role badge HTML
     * @returns {string}
     */
    getRoleBadge() {
        if (typeof Permissions !== 'undefined' && Permissions.getRoleBadge) {
            return Permissions.getRoleBadge(this.getCurrentUser());
        }
        // Fallback
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

    /**
     * Get navigation HTML
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
                ${this.getRoleBadge()}
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
    },

    // ===== ACTIONS =====

    /**
     * Store user data
     * @param {object} user
     */
    setUser(user) {
        try {
            if (typeof Storage !== 'undefined' && Storage.setUser) {
                Storage.setUser(user);
            } else {
                localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
            }
            this._currentUser = user;
            this._notifyListeners();
        } catch (e) {
            console.error('Error storing user:', e);
        }
    },

    /**
     * Clear stored user (logout)
     */
    clearUser() {
        try {
            if (typeof Storage !== 'undefined' && Storage.clearUser) {
                Storage.clearUser();
            } else {
                localStorage.removeItem(this.USER_STORAGE_KEY);
            }
            this._currentUser = null;
            this._notifyListeners();
        } catch (e) {
            console.error('Error clearing user:', e);
        }
    },

    /**
     * Sign out user
     * @returns {Promise<boolean>}
     */
    async signOut() {
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().signOut();
            }
            this.clearUser();
            return true;
        } catch (error) {
            console.error('Sign out error:', error);
            return false;
        }
    },

    /**
     * Redirect to login if not authenticated
     * @param {string} [returnUrl] - URL to return to after login
     * @returns {boolean}
     */
    requireLogin(returnUrl) {
        if (!this.isLoggedIn()) {
            const returnParam = returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : '';
            window.location.href = `login.html${returnParam}`;
            return false;
        }
        return true;
    },

    /**
     * Redirect to login if not verified
     * @param {string} [returnUrl]
     * @returns {boolean}
     */
    requireVerified(returnUrl) {
        if (!this.isVerified()) {
            if (!this.isLoggedIn()) {
                return this.requireLogin(returnUrl);
            }
            alert('You need to be verified to access this feature.');
            return false;
        }
        return true;
    },

    /**
     * Require admin access
     * @returns {boolean}
     */
    requireAdmin() {
        if (!this.isAdmin()) {
            if (!this.isLoggedIn()) {
                return this.requireLogin(window.location.href);
            }
            alert('Admin access required.');
            return false;
        }
        return true;
    },

    // ===== LISTENERS =====

    /**
     * Add auth state change listener
     * @param {function} callback
     * @returns {function} Unsubscribe function
     */
    onAuthStateChange(callback) {
        this._listeners.push(callback);
        callback(this._currentUser);
        
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    },

    /**
     * Notify all listeners
     * @private
     */
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

    /**
     * Verify registered user with Firebase
     * @private
     */
    async _verifyRegisteredUser() {
        if (!this._currentUser || this._currentUser.type !== 'registered') return;
        
        try {
            const db = typeof Firebase !== 'undefined' && Firebase.getDatabase 
                ? Firebase.getDatabase() 
                : firebase.database();
            
            const snapshot = await db
                .ref(`${this.USERS_DB_PATH}/${this._currentUser.id}`)
                .once('value');
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                this._currentUser = {
                    ...this._currentUser,
                    name: userData.name,
                    status: userData.status,
                    playtomicLevel: userData.playtomicLevel,
                    isAdmin: userData.isAdmin || false
                };
                this.setUser(this._currentUser);
            } else {
                this.clearUser();
            }
        } catch (error) {
            console.error('Error verifying user:', error);
        }
    },

    /**
     * Sync with Firebase auth user
     * @private
     */
    async _syncFirebaseUser(firebaseUser) {
        try {
            const db = typeof Firebase !== 'undefined' && Firebase.getDatabase 
                ? Firebase.getDatabase() 
                : firebase.database();
            
            const snapshot = await db
                .ref(this.USERS_DB_PATH)
                .orderByChild('googleUid')
                .equalTo(firebaseUser.uid)
                .once('value');
            
            if (snapshot.exists()) {
                let userData = null;
                snapshot.forEach(child => {
                    userData = { id: child.key, ...child.val() };
                });
                
                this.setUser({
                    type: 'registered',
                    id: userData.id,
                    name: userData.name,
                    status: userData.status,
                    email: userData.email,
                    playtomicLevel: userData.playtomicLevel,
                    isAdmin: userData.isAdmin || false
                });
            }
        } catch (error) {
            console.error('Error syncing Firebase user:', error);
        }
    }
};

// Backwards compatibility - also expose as UberAuth
const UberAuth = Auth;

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Auth, UberAuth };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Auth = Auth;
    window.UberAuth = Auth; // Backwards compatibility
}

console.log('✅ Auth module loaded (core/auth.js)');
