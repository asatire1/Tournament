// ===== MAIN INITIALIZATION =====

/**
 * Initialize the application
 */
function initApp() {
    console.log('Initializing Knockout Tournament App...');

    // Subscribe to state changes for re-rendering
    TournamentState.subscribe(() => {
        // Auto-render on state change is handled by individual handlers
    });

    // Initialize router
    Router.init();

    console.log('Knockout Tournament App initialized');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
