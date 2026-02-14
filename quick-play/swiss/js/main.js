// ===== SWISS SYSTEM MAIN INITIALIZATION =====

// ===== ROUTE CHANGE HANDLER =====

Router.onRouteChange = async function(route, tournamentId, organiserKey) {
    console.log(`Route changed: ${route}, Tournament: ${tournamentId}, Key: ${organiserKey ? 'provided' : 'none'}`);

    // Cleanup previous state
    if (state) {
        state.stopListening();
        state = null;
    }

    if (route === Router.routes.HOME) {
        // Landing page
        await renderLandingPage();
    } else if (route === Router.routes.TOURNAMENT && tournamentId) {
        // Tournament page
        await loadTournament(tournamentId, organiserKey);
    }
};

// ===== TOURNAMENT LOADING =====

async function loadTournament(tournamentId, organiserKey) {
    // Show loading
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
            <div class="text-center">
                <div class="animate-spin w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full mx-auto mb-4"></div>
                <p class="text-gray-500">Loading tournament...</p>
                <p class="text-sm text-gray-400 mt-2 font-mono">${tournamentId.toUpperCase()}</p>
            </div>
        </div>
    `;

    // Check if tournament exists
    const exists = await checkTournamentExists(tournamentId);

    if (!exists) {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen flex items-center justify-center p-4">
                <div class="text-center max-w-md">
                    <div class="text-6xl mb-6">\u{1F615}</div>
                    <h1 class="text-2xl font-bold text-gray-800 mb-4">Tournament Not Found</h1>
                    <p class="text-gray-600 mb-6">The tournament code <span class="font-mono font-bold text-amber-600">${tournamentId.toUpperCase()}</span> doesn't exist or has been deleted.</p>
                    <button onclick="Router.navigate('home')" class="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                        \u2190 Back to Home
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Create state and load data
    state = new SwissState(tournamentId);

    // Verify organiser key if provided
    if (organiserKey) {
        await state.verifyOrganiserKey(organiserKey);
    }

    // Get tournament name for MyTournaments
    try {
        const snapshot = await database.ref(`swiss-tournaments/${tournamentId}/meta/name`).once('value');
        const name = snapshot.val() || 'Swiss Tournament';
        MyTournaments.add(tournamentId, name);
        state.tournamentName = name;
    } catch (e) {
        console.warn('Could not fetch tournament name');
    }

    // Start listening to Firebase
    state.loadFromFirebase();
}

// ===== GLOBAL RENDER FUNCTION =====

function renderSwiss() {
    if (typeof SwissApp !== 'undefined' && SwissApp.render) {
        SwissApp.render();
    }
}

// ===== START APP =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('Swiss System starting...');
    Router.init();
});

// Also handle if DOM already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('Swiss System starting (immediate)...');
    Router.init();
}

console.log('Swiss System Main loaded');
