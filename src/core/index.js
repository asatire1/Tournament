/**
 * core/index.js - Core Module Bundle
 * Central export point for all core utilities
 * 
 * Usage (script tags - order matters):
 *   <script src="src/core/firebase.js"></script>
 *   <script src="src/core/permissions.js"></script>
 *   <script src="src/core/storage.js"></script>
 *   <script src="src/core/router.js"></script>
 *   <script src="src/core/auth.js"></script>
 * 
 * Or load this file after all core modules to verify loading:
 *   <script src="src/core/index.js"></script>
 * 
 * @module core
 */

// Verify all modules loaded
(function() {
    const modules = {
        'Firebase': typeof Firebase !== 'undefined',
        'Permissions': typeof Permissions !== 'undefined',
        'Storage': typeof Storage !== 'undefined',
        'Router': typeof Router !== 'undefined',
        'Auth': typeof Auth !== 'undefined'
    };
    
    const missing = Object.entries(modules)
        .filter(([name, loaded]) => !loaded)
        .map(([name]) => name);
    
    if (missing.length > 0) {
        console.warn('⚠️ Core modules not fully loaded. Missing:', missing.join(', '));
        console.warn('Make sure to load core modules in order: firebase.js, permissions.js, storage.js, router.js, auth.js');
    } else {
        console.log('✅ All core modules loaded successfully');
    }
})();

/**
 * Core module facade for convenient access
 * Provides a single entry point to all core functionality
 */
const Core = {
    // Direct module references
    get Firebase() { return typeof Firebase !== 'undefined' ? Firebase : null; },
    get Permissions() { return typeof Permissions !== 'undefined' ? Permissions : null; },
    get Storage() { return typeof Storage !== 'undefined' ? Storage : null; },
    get Router() { return typeof Router !== 'undefined' ? Router : null; },
    get Auth() { return typeof Auth !== 'undefined' ? Auth : null; },
    
    // Constants
    get ROLES() { return typeof ROLES !== 'undefined' ? ROLES : null; },
    get ROUTES() { return typeof ROUTES !== 'undefined' ? ROUTES : null; },
    get FIREBASE_ROOTS() { return typeof FIREBASE_ROOTS !== 'undefined' ? FIREBASE_ROOTS : null; },
    get STORAGE_KEYS() { return typeof STORAGE_KEYS !== 'undefined' ? STORAGE_KEYS : null; },
    get TOURNAMENT_MODES() { return typeof TOURNAMENT_MODES !== 'undefined' ? TOURNAMENT_MODES : null; },
    
    /**
     * Initialize all core modules
     * Call this once on page load
     * @returns {Promise<object>} Initialization result
     */
    async init() {
        const result = {
            firebase: false,
            auth: false,
            router: false
        };
        
        try {
            // Initialize Firebase first
            if (this.Firebase) {
                this.Firebase.init();
                result.firebase = true;
            }
            
            // Initialize Auth (depends on Firebase)
            if (this.Auth) {
                await this.Auth.init();
                result.auth = true;
            }
            
            // Initialize Router
            if (this.Router) {
                this.Router.init();
                result.router = true;
            }
            
            console.log('✅ Core.init() complete:', result);
        } catch (error) {
            console.error('Core.init() error:', error);
        }
        
        return result;
    },
    
    /**
     * Quick access to current user
     * @returns {object|null}
     */
    getUser() {
        return this.Auth ? this.Auth.getCurrentUser() : null;
    },
    
    /**
     * Quick permission check
     * @param {string} permission
     * @returns {boolean}
     */
    can(permission) {
        return this.Auth ? this.Auth.can(permission) : false;
    },
    
    /**
     * Version info
     */
    version: '1.0.0',
    name: 'UberPadel Core'
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Core };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Core = Core;
}
