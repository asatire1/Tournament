/**
 * main.js - Application Entry Point
 * Initializes Firebase, Router, and handles navigation
 */

/**
 * Main render function - decides what to show based on route
 */
async function render() {
    if (!state) {
        await renderLandingPage();
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
        if (state) {
            state.stopListening();
            state = null;
        }
        await renderLandingPage();
    } else if (route === Router.routes.TOURNAMENT) {
        await loadTournament(tournamentId, organiserKey);
    }
}

/**
 * Load tournament from Firebase
 */
async function loadTournament(tournamentId, organiserKey) {
    closeModal();

    if (state) {
        state.stopListening();
    }

    state = new MixicanoState(tournamentId);

    const loaded = await state.loadTournament();

    if (!loaded) {
        showToast('❌ Session not found');
        Router.navigate('home');
        return;
    }

    if (organiserKey) {
        await state.verifyOrganiserKey(organiserKey);
    }

    render();

    if (state.status !== 'completed') {
        state.setupRealtimeListener();
    }
}

/**
 * Initialize application
 */
function initApp() {
    console.log('🔀 Initializing Mixicano Tournament Manager...');

    initializeFirebase();

    Router.onRouteChange = onRouteChange;
    Router.init();

    console.log('✅ Mixicano App initialized');
}

document.addEventListener('DOMContentLoaded', initApp);

console.log('✅ Mixicano Main loaded');
