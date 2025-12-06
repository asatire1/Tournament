/**
 * Core Module Entry Point (ES Module version)
 * 
 * This file re-exports all core modules for ES module environments.
 * For legacy environments, use the individual .js files with script tags.
 * 
 * @module core
 */

// Re-export all core modules
export { Firebase, FIREBASE_ROOTS } from './firebase.esm.js';
export { Permissions, ROLES, PERMISSIONS } from './permissions.esm.js';
export { Storage, STORAGE_KEYS } from './storage.esm.js';
export { Router } from './router.esm.js';
export { Auth } from './auth.esm.js';

// Also export a combined Core object for convenience
import { Firebase } from './firebase.esm.js';
import { Permissions } from './permissions.esm.js';
import { Storage } from './storage.esm.js';
import { Router } from './router.esm.js';
import { Auth } from './auth.esm.js';

export const Core = {
    Firebase,
    Permissions,
    Storage,
    Router,
    Auth,
    
    /**
     * Initialize all core modules
     */
    async init() {
        console.log('🚀 Initializing Core modules...');
        
        // Initialize Firebase
        Firebase.init();
        
        // Initialize Auth (which depends on Firebase)
        await Auth.init();
        
        console.log('✅ Core modules initialized');
        return this;
    }
};

export default Core;
