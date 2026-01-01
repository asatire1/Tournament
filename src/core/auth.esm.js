/**
 * auth.esm.js - Authentication Module (ES Module)
 * 
 * User authentication with Firebase and permission integration.
 * 
 * @module core/auth
 */

import { Firebase } from './firebase.esm.js';
import { Permissions, ROLES } from './permissions.esm.js';
import { Storage } from './storage.esm.js';

/**
 * Auth manager class
 */
class AuthManager {
    constructor() {
        this._user = null;
        this._listeners = [];
        this._initialized = false;
    }
    
    /**
     * Initialize authentication
     */
    async init() {
        if (this._initialized) return this;
        
        // Ensure Firebase is initialized
        Firebase.init();
        
        // Listen for auth state changes
        Firebase.auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                this._user = await this._enrichUser(firebaseUser);
            } else {
                this._user = null;
            }
            
            // Notify listeners
            this._listeners.forEach(fn => fn(this._user));
        });
        
        this._initialized = true;
        return this;
    }
    
    /**
     * Enrich Firebase user with additional data
     * @private
     */
    async _enrichUser(firebaseUser) {
        const user = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isVerified: false,
            isAdmin: false,
            level: null
        };
        
        // Fetch additional data from database
        try {
            const snapshot = await Firebase.database
                .ref(`users/${firebaseUser.uid}`)
                .once('value');
            
            const userData = snapshot.val();
            if (userData) {
                user.isVerified = userData.isVerified || false;
                user.isAdmin = userData.isAdmin || false;
                user.level = userData.level || null;
                user.displayName = userData.displayName || user.displayName;
            }
        } catch (e) {
            console.error('Error fetching user data:', e);
        }
        
        return user;
    }
    
    /**
     * Get current user
     * @returns {object|null}
     */
    getCurrentUser() {
        return this._user;
    }
    
    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return this._user !== null;
    }
    
    /**
     * Check if user is verified
     * @returns {boolean}
     */
    isVerified() {
        return this._user?.isVerified || false;
    }
    
    /**
     * Check if user is admin
     * @returns {boolean}
     */
    isAdmin() {
        return this._user?.isAdmin || false;
    }
    
    /**
     * Check if user has a permission
     * @param {string} permission
     * @returns {boolean}
     */
    can(permission) {
        return Permissions.can(this._user, permission);
    }
    
    /**
     * Check if user can join a tournament
     * @param {object} tournament
     * @returns {{ allowed: boolean, reason: string | null }}
     */
    canJoinTournament(tournament) {
        return Permissions.canJoinTournament(this._user, tournament);
    }
    
    /**
     * Get user's role
     * @returns {number}
     */
    getRole() {
        return Permissions.getUserRole(this._user);
    }
    
    /**
     * Get user's role name
     * @returns {string}
     */
    getRoleName() {
        return Permissions.getRoleName(this.getRole());
    }
    
    /**
     * Get creation permissions
     * @returns {object}
     */
    getCreationPermissions() {
        return Permissions.getCreationPermissions(this._user);
    }
    
    /**
     * Sign in with Google
     * @returns {Promise<object>}
     */
    async signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const result = await Firebase.auth.signInWithPopup(provider);
        
        // Create/update user in database
        await this._createOrUpdateUser(result.user);
        
        return this._user;
    }
    
    /**
     * Sign out
     * @returns {Promise<void>}
     */
    async signOut() {
        await Firebase.auth.signOut();
        this._user = null;
    }
    
    /**
     * Create or update user in database
     * @private
     */
    async _createOrUpdateUser(firebaseUser) {
        const userRef = Firebase.database.ref(`users/${firebaseUser.uid}`);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            // Create new user
            await userRef.set({
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                isVerified: false,
                isAdmin: false,
                level: null
            });
        } else {
            // Update last login
            await userRef.update({
                lastLogin: firebase.database.ServerValue.TIMESTAMP,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL
            });
        }
    }
    
    /**
     * Add auth state change listener
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    onAuthStateChange(callback) {
        this._listeners.push(callback);
        
        // Immediately call with current state
        callback(this._user);
        
        return () => {
            this._listeners = this._listeners.filter(fn => fn !== callback);
        };
    }
    
    /**
     * Get role badge HTML
     * @returns {string}
     */
    getRoleBadge() {
        const role = this.getRole();
        
        switch (role) {
            case ROLES.ADMIN:
                return '<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Admin</span>';
            case ROLES.VERIFIED:
                return '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Verified</span>';
            case ROLES.REGISTERED:
                return '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Member</span>';
            default:
                return '<span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Guest</span>';
        }
    }
    
    /**
     * Render user info HTML
     * @returns {string}
     */
    renderUserInfo() {
        if (!this._user) {
            return `
                <button onclick="Auth.signInWithGoogle()" class="btn btn-primary">
                    Sign in with Google
                </button>
            `;
        }
        
        return `
            <div class="flex items-center gap-3">
                ${this._user.photoURL ? `<img src="${this._user.photoURL}" class="w-8 h-8 rounded-full" alt="Profile">` : ''}
                <div>
                    <div class="font-medium">${this._user.displayName || 'User'}</div>
                    ${this.getRoleBadge()}
                </div>
            </div>
        `;
    }
}

// Create singleton instance
export const Auth = new AuthManager();

export default Auth;
