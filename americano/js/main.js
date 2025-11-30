/**
 * main.js - Application Initialization
 * Entry point for the Americano Tournament app
 */

/**
 * Initialize the application
 */
async function initializeApp() {
    // Initialize Firebase
    initializeFirebase();
    
    // Set up router callbacks
    Router.onRouteChange = handleRouteChange;
    
    // Initialize router (will trigger initial route handling)
    Router.init();
}

/**
 * Handle route changes
 */
async function handleRouteChange(route, tournamentId, organiserKey) {
    if (route === Router.routes.HOME) {
        renderLandingPage();
    } else if (route === Router.routes.TOURNAMENT) {
        await initializeTournament(tournamentId, organiserKey);
    }
}

/**
 * Initialize tournament view
 */
async function initializeTournament(tournamentId, organiserKey) {
    // Clean up existing state
    if (state) {
        state.stopListening();
    }
    
    // Show loading state
    renderLoadingState(tournamentId);
    
    // Check if tournament exists
    const exists = await checkTournamentExists(tournamentId);
    if (!exists) {
        renderTournamentNotFound(tournamentId);
        return;
    }
    
    // Create new state
    state = new AmericanoState(tournamentId);
    
    // Verify organiser key if provided
    if (organiserKey) {
        await state.verifyOrganiserKey(organiserKey);
    }
    
    // Load data from Firebase (this will trigger render when data arrives)
    state.loadFromFirebase();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
