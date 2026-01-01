/**
 * components/ui/index.js - UI Components Bundle
 * Central export point for all UI components
 * 
 * Load order:
 *   1. Modal.js
 *   2. Toast.js
 *   3. PlayerBadge.js
 *   4. ScoreInput.js
 *   5. StandingsTable.js
 *   6. MatchCard.js
 *   7. Loading.js
 *   8. Tabs.js
 *   9. This file (optional, for verification)
 * 
 * @module components/ui
 */

// Verify all components loaded
(function() {
    const components = {
        'Modal': typeof Modal !== 'undefined',
        'Toast': typeof Toast !== 'undefined',
        'PlayerBadge': typeof PlayerBadge !== 'undefined',
        'ScoreInput': typeof ScoreInput !== 'undefined',
        'StandingsTable': typeof StandingsTable !== 'undefined',
        'MatchCard': typeof MatchCard !== 'undefined',
        'Loading': typeof Loading !== 'undefined',
        'Empty': typeof Empty !== 'undefined',
        'Tabs': typeof Tabs !== 'undefined'
    };
    
    const missing = Object.entries(components)
        .filter(([name, loaded]) => !loaded)
        .map(([name]) => name);
    
    if (missing.length > 0) {
        console.warn('⚠️ UI components not fully loaded. Missing:', missing.join(', '));
    } else {
        console.log('✅ All UI components loaded successfully');
    }
})();

/**
 * UI Components facade for convenient access
 */
const UI = {
    // Core components
    get Modal() { return window.Modal; },
    get Toast() { return window.Toast; },
    get Tabs() { return window.Tabs; },
    
    // Tournament components
    get PlayerBadge() { return window.PlayerBadge; },
    get ScoreInput() { return window.ScoreInput; },
    get StandingsTable() { return window.StandingsTable; },
    get MatchCard() { return window.MatchCard; },
    
    // State components
    get Loading() { return window.Loading; },
    get Empty() { return window.Empty; },
    
    // Convenience methods
    
    /**
     * Show a toast notification
     * @param {string} message
     * @param {string} [type='default']
     */
    toast(message, type = 'default') {
        if (this.Toast) {
            this.Toast.show(message, { type });
        }
    },
    
    /**
     * Show success toast
     * @param {string} message
     */
    success(message) {
        if (this.Toast) this.Toast.success(message);
    },
    
    /**
     * Show error toast
     * @param {string} message
     */
    error(message) {
        if (this.Toast) this.Toast.error(message);
    },
    
    /**
     * Show alert modal
     * @param {string} message
     * @param {object} options
     */
    alert(message, options) {
        if (this.Modal) this.Modal.alert(message, options);
    },
    
    /**
     * Show confirm modal
     * @param {string} message
     * @param {object} options
     * @returns {Promise<boolean>}
     */
    confirm(message, options) {
        if (this.Modal) return this.Modal.confirm(message, options);
        return Promise.resolve(window.confirm(message));
    },
    
    /**
     * Show prompt modal
     * @param {string} message
     * @param {object} options
     * @returns {Promise<string|null>}
     */
    prompt(message, options) {
        if (this.Modal) return this.Modal.prompt(message, options);
        return Promise.resolve(window.prompt(message));
    },
    
    /**
     * Close any open modal
     */
    closeModal() {
        if (this.Modal) this.Modal.close();
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UI };
}

if (typeof window !== 'undefined') {
    window.UI = UI;
}
