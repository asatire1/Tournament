/**
 * user-service.js - User Management Service
 * Handles user profiles, verification, and history
 * 
 * @module services/user-service
 */

/**
 * User status constants
 */
const USER_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    SUSPENDED: 'suspended'
};

/**
 * User Service - Unified user management API
 */
const UserService = {
    /**
     * Get a user by ID
     * @param {string} userId
     * @returns {Promise<object|null>}
     */
    async getUser(userId) {
        try {
            const Firebase = window.Firebase;
            const ref = Firebase.getUsersRef(userId);
            const snapshot = await ref.once('value');
            
            if (!snapshot.exists()) return null;
            
            return { id: userId, ...snapshot.val() };
        } catch (error) {
            console.error('UserService.getUser error:', error);
            return null;
        }
    },

    /**
     * Get user by Google UID
     * @param {string} googleUid
     * @returns {Promise<object|null>}
     */
    async getUserByGoogleUid(googleUid) {
        try {
            const Firebase = window.Firebase;
            const ref = Firebase.getUsersRef();
            const snapshot = await ref
                .orderByChild('googleUid')
                .equalTo(googleUid)
                .once('value');
            
            if (!snapshot.exists()) return null;
            
            let user = null;
            snapshot.forEach(child => {
                user = { id: child.key, ...child.val() };
            });
            
            return user;
        } catch (error) {
            console.error('UserService.getUserByGoogleUid error:', error);
            return null;
        }
    },

    /**
     * Get user by email
     * @param {string} email
     * @returns {Promise<object|null>}
     */
    async getUserByEmail(email) {
        try {
            const Firebase = window.Firebase;
            const ref = Firebase.getUsersRef();
            const snapshot = await ref
                .orderByChild('email')
                .equalTo(email.toLowerCase())
                .once('value');
            
            if (!snapshot.exists()) return null;
            
            let user = null;
            snapshot.forEach(child => {
                user = { id: child.key, ...child.val() };
            });
            
            return user;
        } catch (error) {
            console.error('UserService.getUserByEmail error:', error);
            return null;
        }
    },

    /**
     * Create a new user
     * @param {object} userData
     * @returns {Promise<object>} { success, user, error }
     */
    async createUser(userData) {
        try {
            const Firebase = window.Firebase;
            const ref = Firebase.getUsersRef();
            const newRef = ref.push();
            
            const user = {
                name: userData.name,
                email: userData.email?.toLowerCase(),
                googleUid: userData.googleUid || null,
                status: USER_STATUS.PENDING,
                playtomicLevel: userData.playtomicLevel || null,
                playtomicUrl: userData.playtomicUrl || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await newRef.set(user);
            
            return {
                success: true,
                user: { id: newRef.key, ...user }
            };
        } catch (error) {
            console.error('UserService.createUser error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update user profile
     * @param {string} userId
     * @param {object} updates
     * @returns {Promise<object>} { success, error }
     */
    async updateUser(userId, updates) {
        try {
            const Firebase = window.Firebase;
            const ref = Firebase.getUsersRef(userId);
            
            // Add timestamp
            updates.updatedAt = new Date().toISOString();
            
            // Sanitize email if present
            if (updates.email) {
                updates.email = updates.email.toLowerCase();
            }
            
            await ref.update(updates);
            
            return { success: true };
        } catch (error) {
            console.error('UserService.updateUser error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Verify a user (admin action)
     * @param {string} userId
     * @param {string} playtomicLevel - Verified Playtomic level
     * @returns {Promise<object>} { success, error }
     */
    async verifyUser(userId, playtomicLevel = null) {
        try {
            const updates = {
                status: USER_STATUS.VERIFIED,
                verifiedAt: new Date().toISOString()
            };
            
            if (playtomicLevel) {
                updates.playtomicLevel = playtomicLevel;
            }
            
            return await this.updateUser(userId, updates);
        } catch (error) {
            console.error('UserService.verifyUser error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Suspend a user (admin action)
     * @param {string} userId
     * @param {string} [reason]
     * @returns {Promise<object>} { success, error }
     */
    async suspendUser(userId, reason = null) {
        try {
            const updates = {
                status: USER_STATUS.SUSPENDED,
                suspendedAt: new Date().toISOString()
            };
            
            if (reason) {
                updates.suspendReason = reason;
            }
            
            return await this.updateUser(userId, updates);
        } catch (error) {
            console.error('UserService.suspendUser error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get all users (admin)
     * @param {object} [options]
     * @returns {Promise<object[]>}
     */
    async getAllUsers(options = {}) {
        try {
            const { status, limit = 100 } = options;
            
            const Firebase = window.Firebase;
            let ref = Firebase.getUsersRef();
            
            if (status) {
                ref = ref.orderByChild('status').equalTo(status);
            }
            
            const snapshot = await ref.limitToLast(limit).once('value');
            
            if (!snapshot.exists()) return [];
            
            const users = [];
            snapshot.forEach(child => {
                users.push({ id: child.key, ...child.val() });
            });
            
            // Sort by createdAt descending
            users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return users;
        } catch (error) {
            console.error('UserService.getAllUsers error:', error);
            return [];
        }
    },

    /**
     * Get pending verification users (admin)
     * @returns {Promise<object[]>}
     */
    async getPendingUsers() {
        return this.getAllUsers({ status: USER_STATUS.PENDING });
    },

    /**
     * Get verified users (admin)
     * @returns {Promise<object[]>}
     */
    async getVerifiedUsers() {
        return this.getAllUsers({ status: USER_STATUS.VERIFIED });
    },

    /**
     * Search users by name
     * @param {string} query
     * @param {number} [limit=20]
     * @returns {Promise<object[]>}
     */
    async searchUsers(query, limit = 20) {
        try {
            // Firebase doesn't support text search, so we fetch and filter
            const allUsers = await this.getAllUsers({ limit: 500 });
            
            const queryLower = query.toLowerCase();
            
            return allUsers
                .filter(user => 
                    user.name?.toLowerCase().includes(queryLower) ||
                    user.email?.toLowerCase().includes(queryLower)
                )
                .slice(0, limit);
        } catch (error) {
            console.error('UserService.searchUsers error:', error);
            return [];
        }
    },

    /**
     * Get user's tournament history
     * @param {string} userId
     * @returns {Promise<object[]>}
     */
    async getUserTournaments(userId) {
        // This would require a separate index of user -> tournaments
        // For now, return from local storage
        try {
            const Storage = window.Storage;
            return Storage.getRecentTournaments();
        } catch (error) {
            console.error('UserService.getUserTournaments error:', error);
            return [];
        }
    },

    /**
     * Update user's Playtomic level
     * @param {string} userId
     * @param {string} level
     * @param {string} [playtomicUrl]
     * @returns {Promise<object>} { success, error }
     */
    async updatePlaytomicLevel(userId, level, playtomicUrl = null) {
        const updates = {
            playtomicLevel: level,
            playtomicUpdatedAt: new Date().toISOString()
        };
        
        if (playtomicUrl) {
            updates.playtomicUrl = playtomicUrl;
        }
        
        return this.updateUser(userId, updates);
    },

    /**
     * Check if a user can perform an action
     * @param {object} user
     * @param {string} action
     * @returns {boolean}
     */
    canPerformAction(user, action) {
        if (!user) return false;
        
        // Use Permissions system if available
        if (typeof Permissions !== 'undefined' && Permissions.can) {
            return Permissions.can(user, action);
        }
        
        // Fallback
        return true;
    },

    /**
     * Get or create user from Google sign-in
     * @param {object} googleUser - Firebase auth user
     * @returns {Promise<object>} { success, user, isNew, error }
     */
    async getOrCreateFromGoogle(googleUser) {
        try {
            // Check if user exists
            let user = await this.getUserByGoogleUid(googleUser.uid);
            
            if (user) {
                return { success: true, user, isNew: false };
            }
            
            // Create new user
            const result = await this.createUser({
                name: googleUser.displayName || 'Player',
                email: googleUser.email,
                googleUid: googleUser.uid
            });
            
            if (result.success) {
                return { success: true, user: result.user, isNew: true };
            }
            
            return result;
        } catch (error) {
            console.error('UserService.getOrCreateFromGoogle error:', error);
            return { success: false, error: error.message };
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserService, USER_STATUS };
}

if (typeof window !== 'undefined') {
    window.UserService = UserService;
    window.USER_STATUS = USER_STATUS;
}
