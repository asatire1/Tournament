/**
 * main.js - Application Entry Point
 * 
 * This is the main entry point for the Vite-built application.
 * It initializes all modules and sets up the application.
 * 
 * @module main
 */

// Import styles
import './styles/main.css';

// Import core modules
import { Core, Firebase, Permissions, Storage, Router, Auth } from './core/index.esm.js';

// Import services
import { TournamentService, UserService } from './services/index.esm.js';

// Import UI components
import { UI, Modal, Toast, PlayerBadge, ScoreInput, StandingsTable, MatchCard, Loading, Empty, Tabs } from './components/ui/index.esm.js';

/**
 * UberPadel Application
 */
class UberPadelApp {
    constructor() {
        this.initialized = false;
        this.version = '2.0.0';
    }
    
    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) return;
        
        console.log(`🎾 UberPadel v${this.version} starting...`);
        
        try {
            // Initialize core modules
            await Core.init();
            
            // Initialize router
            Router.init((route, id, key) => {
                console.log(`📍 Route changed: ${route}`, { id, key });
                this.onRouteChange(route, id, key);
            });
            
            // Initialize toast container
            Toast.init({ position: 'bottom-right' });
            
            this.initialized = true;
            console.log('✅ UberPadel initialized successfully');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('uberpadel:ready', { detail: { app: this } }));
            
        } catch (error) {
            console.error('❌ Failed to initialize UberPadel:', error);
            throw error;
        }
    }
    
    /**
     * Handle route changes
     */
    onRouteChange(route, id, key) {
        // Override in format-specific implementations
    }
    
    /**
     * Get the current user
     */
    getUser() {
        return Auth.getCurrentUser();
    }
    
    /**
     * Check if user can perform action
     */
    can(permission) {
        return Auth.can(permission);
    }
}

// Create app instance
const app = new UberPadelApp();

// Expose to window for debugging and legacy compatibility
if (typeof window !== 'undefined') {
    // Core
    window.Firebase = Firebase;
    window.Permissions = Permissions;
    window.Storage = Storage;
    window.Router = Router;
    window.Auth = Auth;
    
    // Services
    window.TournamentService = TournamentService;
    window.UserService = UserService;
    
    // UI Components
    window.UI = UI;
    window.Modal = Modal;
    window.Toast = Toast;
    window.PlayerBadge = PlayerBadge;
    window.ScoreInput = ScoreInput;
    window.StandingsTable = StandingsTable;
    window.MatchCard = MatchCard;
    window.Loading = Loading;
    window.Empty = Empty;
    window.Tabs = Tabs;
    
    // Legacy compatibility
    window.showToast = (msg) => Toast.show(msg);
    window.closeModal = () => Modal.close();
    
    // App instance
    window.UberPadel = app;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}

// Export for ES modules
export {
    app as default,
    app as UberPadel,
    // Core
    Core,
    Firebase,
    Permissions,
    Storage,
    Router,
    Auth,
    // Services
    TournamentService,
    UserService,
    // UI
    UI,
    Modal,
    Toast,
    PlayerBadge,
    ScoreInput,
    StandingsTable,
    MatchCard,
    Loading,
    Empty,
    Tabs
};
