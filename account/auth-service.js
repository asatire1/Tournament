/**
 * auth-service.js - Consolidated Authentication Service
 * Phase 4: Account System Consolidation
 * 
 * Single source of truth for all authentication in UberPadel
 * 
 * User Types:
 * - guest: Local-only, no Firebase account
 * - registered: Firebase account, pending verification
 * - verified: Firebase account, admin verified
 * 
 * @module account/auth-service
 */

const AuthService = {
    // ===== CONFIGURATION =====
    
    config: {
        USER_STORAGE_KEY: 'uber_padel_user',
        USERS_DB_PATH: 'users',
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
    
    // ===== STATE =====
    
    _currentUser: null,
    _listeners: [],
    _initialized: false,
    _database: null,
    _auth: null,
    
    // ===== INITIALIZATION =====
    
    /**
     * Initialize the auth service
     * Call this on every page that needs auth
     * 
     * @returns {Promise<object|null>} Current user or null
     */
    async init() {
        if (this._initialized) {
            return this._currentUser;
        }
        
        console.log('AuthService.init() called');
        console.log('typeof firebase:', typeof firebase);
        console.log('typeof firebase.auth:', typeof firebase !== 'undefined' ? typeof firebase.auth : 'N/A');
        
        // Initialize Firebase if not already done
        if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
            console.log('Firebase Auth SDK available');
            if (!firebase.apps.length) {
                firebase.initializeApp(this.config.FIREBASE_CONFIG);
            }
            this._auth = firebase.auth();
            this._database = firebase.database();
            
            // Set persistence to LOCAL (survives browser restart)
            try {
                await this._auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            } catch (e) {
                console.warn('Could not set auth persistence:', e);
            }
        } else {
            console.warn('Firebase Auth SDK not loaded. Checking if scripts are present...');
            // Log what scripts are loaded
            const scripts = document.querySelectorAll('script[src*="firebase"]');
            scripts.forEach(s => console.log('Firebase script:', s.src));
        }
        
        // Load cached user for instant UI
        this._currentUser = this._getStoredUser();
        this._notifyListeners();
        
        // Verify with Firebase if registered user
        if (this._currentUser && this._currentUser.type === 'registered') {
            await this._verifyWithFirebase();
        }
        
        // Listen for Firebase auth state changes
        if (this._auth) {
            this._auth.onAuthStateChanged(async (firebaseUser) => {
                console.log('Firebase auth state changed:', firebaseUser ? firebaseUser.email : 'signed out');
                if (firebaseUser && (!this._currentUser || this._currentUser.type !== 'guest')) {
                    await this._syncFirebaseUser(firebaseUser);
                } else if (!firebaseUser && this._currentUser && this._currentUser.type === 'registered') {
                    // Firebase signed out but we have a registered user - clear local storage
                    console.log('Firebase signed out, clearing local user');
                    this._currentUser = null;
                    localStorage.removeItem(this.config.USER_STORAGE_KEY);
                    this._notifyListeners();
                }
            });
        }
        
        this._initialized = true;
        return this._currentUser;
    },
    
    // ===== USER GETTERS =====
    
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
     * Check if user is registered (has Firebase account)
     * @returns {boolean}
     */
    isRegistered() {
        const user = this.getCurrentUser();
        return user && user.type === 'registered';
    },
    
    /**
     * Check if user is verified by admin
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
     * Get user ID
     * @returns {string|null}
     */
    getUserId() {
        const user = this.getCurrentUser();
        return user ? user.id : null;
    },
    
    /**
     * Get user's Playtomic level (if verified)
     * @returns {number|null}
     */
    getLevel() {
        const user = this.getCurrentUser();
        return user && user.playtomicLevel ? user.playtomicLevel : null;
    },
    
    /**
     * Get user status label
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
     * Get user status badge HTML
     * @param {string} [size='sm'] - Badge size: 'sm', 'md', 'lg'
     * @returns {string}
     */
    getStatusBadge(size = 'sm') {
        const user = this.getCurrentUser();
        const padding = size === 'lg' ? 'px-3 py-1.5' : size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';
        const text = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-xs';
        
        if (!user) {
            return `<span class="${padding} bg-gray-100 text-gray-600 rounded-full ${text} font-medium">Not signed in</span>`;
        }
        if (user.type === 'guest') {
            return `<span class="${padding} bg-gray-100 text-gray-600 rounded-full ${text} font-medium">👤 Guest</span>`;
        }
        if (user.status === 'verified') {
            return `<span class="${padding} bg-green-100 text-green-700 rounded-full ${text} font-medium">✓ Verified</span>`;
        }
        return `<span class="${padding} bg-amber-100 text-amber-700 rounded-full ${text} font-medium">⏳ Pending</span>`;
    },
    
    // ===== SIGN IN METHODS =====
    
    /**
     * Sign in with Google
     * @returns {Promise<object>} User object
     */
    async signInWithGoogle() {
        if (!this._auth) {
            throw new Error('Firebase not initialized');
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const result = await this._auth.signInWithPopup(provider);
        return this._syncFirebaseUser(result.user);
    },
    
    /**
     * Sign in with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<object>} User object
     */
    async signInWithEmail(email, password) {
        if (!this._auth) {
            throw new Error('Firebase not initialized');
        }
        
        const result = await this._auth.signInWithEmailAndPassword(email, password);
        return this._syncFirebaseUser(result.user);
    },
    
    /**
     * Register with email and password
     * @param {string} email 
     * @param {string} password 
     * @param {string} displayName 
     * @returns {Promise<object>} User object
     */
    async registerWithEmail(email, password, displayName) {
        if (!this._auth) {
            throw new Error('Firebase not initialized');
        }
        
        const result = await this._auth.createUserWithEmailAndPassword(email, password);
        
        // Update display name
        await result.user.updateProfile({ displayName });
        
        return this._syncFirebaseUser(result.user);
    },
    
    /**
     * Continue as guest
     * @param {string} name - Display name
     * @returns {object} Guest user object
     */
    continueAsGuest(name) {
        const guestUser = {
            id: this._generateUserId(),
            name: name.trim(),
            type: 'guest',
            createdAt: new Date().toISOString()
        };
        
        this._setUser(guestUser);
        return guestUser;
    },
    
    /**
     * Sign out
     */
    async signOut() {
        if (this._auth) {
            await this._auth.signOut();
        }
        
        this._currentUser = null;
        localStorage.removeItem(this.config.USER_STORAGE_KEY);
        this._notifyListeners();
    },
    
    // ===== PROFILE MANAGEMENT =====
    
    /**
     * Update user profile
     * @param {object} updates - Fields to update
     * @returns {Promise<object>} Updated user
     */
    async updateProfile(updates) {
        const user = this.getCurrentUser();
        if (!user) {
            throw new Error('No user logged in');
        }
        
        // Update local user
        Object.assign(user, updates);
        this._setUser(user);
        
        // If registered, update Firebase
        if (user.type === 'registered' && this._database) {
            await this._database.ref(`${this.config.USERS_DB_PATH}/${user.id}`).update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
        }
        
        return user;
    },
    
    /**
     * Complete registration profile (for new users)
     * @param {object} profile - Profile data
     * @returns {Promise<object>} Updated user
     */
    async completeProfile(profile) {
        const user = this.getCurrentUser();
        if (!user || user.type !== 'registered') {
            throw new Error('Must be registered to complete profile');
        }
        
        const fullProfile = {
            ...profile,
            status: 'pending',
            profileCompleted: true,
            completedAt: new Date().toISOString()
        };
        
        return this.updateProfile(fullProfile);
    },
    
    // ===== LISTENERS =====
    
    /**
     * Add auth state change listener
     * @param {function} callback - Called with user on change
     * @returns {function} Unsubscribe function
     */
    onAuthStateChanged(callback) {
        this._listeners.push(callback);
        
        // Call immediately with current state
        callback(this._currentUser);
        
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    },
    
    // ===== PRIVATE METHODS =====
    
    /**
     * Get user from localStorage
     * @private
     */
    _getStoredUser() {
        try {
            const data = localStorage.getItem(this.config.USER_STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading stored user:', e);
            return null;
        }
    },
    
    /**
     * Set current user and persist
     * @private
     */
    _setUser(user) {
        this._currentUser = user;
        localStorage.setItem(this.config.USER_STORAGE_KEY, JSON.stringify(user));
        this._notifyListeners();
    },
    
    /**
     * Notify all listeners of auth change
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
    
    /**
     * Sync Firebase user with local storage
     * @private
     */
    async _syncFirebaseUser(firebaseUser) {
        if (!this._database) return null;
        
        const userId = firebaseUser.uid;
        const userRef = this._database.ref(`${this.config.USERS_DB_PATH}/${userId}`);
        
        // Check if user exists in database
        const snapshot = await userRef.once('value');
        let userData = snapshot.val();
        
        if (userData) {
            // Existing user - update local cache
            const user = {
                id: userId,
                name: userData.name || firebaseUser.displayName || 'User',
                email: firebaseUser.email,
                type: 'registered',
                status: userData.status || 'pending',
                playtomicUsername: userData.playtomicUsername,
                playtomicLevel: userData.playtomicLevel,
                phone: userData.phone,
                profileCompleted: userData.profileCompleted || false,
                createdAt: userData.createdAt,
                photoURL: firebaseUser.photoURL
            };
            
            this._setUser(user);
            return user;
        } else {
            // New user - create entry
            const newUser = {
                id: userId,
                name: firebaseUser.displayName || 'User',
                email: firebaseUser.email,
                type: 'registered',
                status: 'pending',
                profileCompleted: false,
                createdAt: new Date().toISOString(),
                photoURL: firebaseUser.photoURL
            };
            
            await userRef.set({
                name: newUser.name,
                email: newUser.email,
                status: 'pending',
                profileCompleted: false,
                createdAt: newUser.createdAt
            });
            
            this._setUser(newUser);
            return newUser;
        }
    },
    
    /**
     * Verify cached registered user still exists in Firebase
     * @private
     */
    async _verifyWithFirebase() {
        if (!this._database || !this._currentUser) return;
        
        try {
            const snapshot = await this._database
                .ref(`${this.config.USERS_DB_PATH}/${this._currentUser.id}`)
                .once('value');
            
            const userData = snapshot.val();
            
            if (userData) {
                // Update local cache with latest from Firebase
                this._currentUser.status = userData.status || 'pending';
                this._currentUser.playtomicLevel = userData.playtomicLevel;
                this._currentUser.playtomicUsername = userData.playtomicUsername;
                this._currentUser.profileCompleted = userData.profileCompleted || false;
                this._setUser(this._currentUser);
            }
        } catch (e) {
            console.error('Error verifying user:', e);
        }
    },
    
    /**
     * Generate a user ID
     * @private
     */
    _generateUserId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id.toLowerCase();
    },
    
    // ===== UTILITY METHODS =====
    
    /**
     * Check if user can join level-restricted competitions
     * @param {number} minLevel - Minimum level required
     * @param {number} maxLevel - Maximum level allowed
     * @returns {boolean}
     */
    canJoinLevelRestricted(minLevel, maxLevel) {
        if (!this.isVerified()) return false;
        
        const level = this.getLevel();
        if (!level) return false;
        
        return level >= minLevel && level <= maxLevel;
    },
    
    /**
     * Get redirect URL after login
     * @returns {string}
     */
    getRedirectUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('redirect') || '/';
    },
    
    /**
     * Build login URL with redirect
     * @param {string} [redirect] - URL to redirect to after login
     * @returns {string}
     */
    getLoginUrl(redirect) {
        const url = '/account/login.html';
        if (redirect) {
            return `${url}?redirect=${encodeURIComponent(redirect)}`;
        }
        return url;
    },
    
    /**
     * Require authentication - redirect to login if not logged in
     * @param {object} [options]
     * @param {boolean} [options.requireVerified] - Require verified status
     * @param {boolean} [options.requireRegistered] - Require registered (not guest)
     * @returns {boolean} True if authenticated
     */
    requireAuth(options = {}) {
        const user = this.getCurrentUser();
        
        if (!user) {
            window.location.href = this.getLoginUrl(window.location.href);
            return false;
        }
        
        if (options.requireRegistered && user.type === 'guest') {
            window.location.href = this.getLoginUrl(window.location.href);
            return false;
        }
        
        if (options.requireVerified && user.status !== 'verified') {
            window.location.href = '/account/profile.html';
            return false;
        }
        
        return true;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.AuthService = AuthService;
}
