/**
 * main.js - Application Entry Point
 * Initializes Firebase, Router, and handles navigation
 */

/**
 * Main render function - decides what to show based on route
 */
function render() {
    if (!state) {
        renderLandingPage();
        return;
    }
    
    if (state.status === 'completed') {
        renderCompletedScreen();
    } else {
        renderTournament();
    }
}

/**
 * Handle route changes
 */
async function onRouteChange(route, tournamentId, organiserKey) {
    if (route === Router.routes.HOME) {
        // Clean up existing state
        if (state) {
            state.stopListening();
            state = null;
        }
        renderLandingPage();
    } else if (route === Router.routes.TOURNAMENT) {
        await loadTournament(tournamentId, organiserKey);
    }
}

/**
 * Load tournament from Firebase
 */
async function loadTournament(tournamentId, organiserKey) {
    // Close any open modal first
    closeModal();
    
    // Clean up existing state
    if (state) {
        state.stopListening();
    }
    
    // Create new state
    state = new MexicanoState(tournamentId);
    
    // Try to load from Firebase
    const loaded = await state.loadFromFirebase();
    
    if (!loaded) {
        showToast('❌ Session not found');
        Router.navigate('home');
        return;
    }
    
    // Verify organiser key if provided
    if (organiserKey) {
        await state.verifyOrganiserKey(organiserKey);
    }
    
    // Render based on status
    render();
    
    // Setup real-time listener
    if (state.status !== 'completed') {
        state.setupRealtimeListener();
    }
}

/**
 * Initialize application
 */
function initApp() {
    console.log('🎯 Initializing Mexicano Tournament Manager...');
    
    // Initialize Firebase
    initializeFirebase();
    
    // Setup router
    Router.onRouteChange = onRouteChange;
    Router.init();
    
    console.log('✅ Mexicano App initialized');
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

console.log('✅ Mexicano Main loaded');
