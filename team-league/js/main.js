// ===== TEAM LEAGUE MAIN INITIALIZATION =====

// ===== ROUTE CHANGE HANDLER =====

Router.onRouteChange = async function(route, tournamentId, organiserKey) {
    console.log(`📍 Route changed: ${route}, Tournament: ${tournamentId}, Key: ${organiserKey ? 'provided' : 'none'}`);
    
    // Cleanup previous state
    if (state) {
        state.stopListening();
        state = null;
    }
    
    if (route === Router.routes.HOME) {
        // Landing page
        renderLandingPage();
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
                <div class="animate-spin w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"></div>
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
                    <div class="text-6xl mb-6">😕</div>
                    <h1 class="text-2xl font-bold text-gray-800 mb-4">Tournament Not Found</h1>
                    <p class="text-gray-600 mb-6">The tournament code <span class="font-mono font-bold text-purple-600">${tournamentId.toUpperCase()}</span> doesn't exist or has been deleted.</p>
                    <button onclick="Router.navigate('home')" class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
                        ← Back to Home
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Create state and load data
    state = new TeamLeagueState(tournamentId);
    
    // Verify organiser key if provided
    if (organiserKey) {
        await state.verifyOrganiserKey(organiserKey);
    }
    
    // Get tournament name for MyTournaments
    try {
        const snapshot = await database.ref(`team-tournaments/${tournamentId}/meta/name`).once('value');
        const name = snapshot.val() || 'Team Tournament';
        MyTournaments.add(tournamentId, name);
        state.tournamentName = name;
    } catch (e) {
        console.warn('Could not fetch tournament name');
    }
    
    // Start listening to Firebase
    state.loadFromFirebase();
}

// ===== GLOBAL RENDER FUNCTION =====

function renderTeamLeague() {
    if (typeof TeamLeagueApp !== 'undefined' && TeamLeagueApp.render) {
        TeamLeagueApp.render();
    }
}

// ===== START APP =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 Team Tournament starting...');
    Router.init();
});

// Also handle if DOM already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('🏁 Team Tournament starting (immediate)...');
    Router.init();
}

console.log('✅ Team Tournament Main loaded');
