// ===== ROUND ROBIN MAIN INITIALIZATION =====

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
        await renderLandingPage();
    } else if (route === Router.routes.TV) {
        await loadTournament(tournamentId, null);
        TVMode.init(getTvData);
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
                <div class="animate-spin w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
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
                    <p class="text-gray-600 mb-6">The tournament code <span class="font-mono font-bold text-emerald-600">${tournamentId.toUpperCase()}</span> doesn't exist or has been deleted.</p>
                    <button onclick="Router.navigate('home')" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors">
                        ← Back to Home
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Create state and load data
    state = new RoundRobinState(tournamentId);

    // Verify organiser key if provided
    if (organiserKey) {
        await state.verifyOrganiserKey(organiserKey);
    }

    // Get tournament name for MyTournaments
    try {
        const snapshot = await database.ref(`roundrobin-tournaments/${tournamentId}/meta/name`).once('value');
        const name = snapshot.val() || 'Round Robin';
        MyTournaments.add(tournamentId, name);
        state.tournamentName = name;
    } catch (e) {
        console.warn('Could not fetch tournament name');
    }

    // Start listening to Firebase
    state.loadFromFirebase();
}

// ===== GLOBAL RENDER FUNCTION =====

function renderRoundRobin() {
    if (typeof TVMode !== 'undefined' && TVMode.isActive) { TVMode.render(); return; }
    if (typeof RoundRobinApp !== 'undefined' && RoundRobinApp.render) {
        RoundRobinApp.render();
    }
}

/**
 * TV Mode data adapter for Round Robin
 */
function getTvData() {
    if (!state) return null;

    // Firebase returns arrays as objects {0:{},1:{}} — coerce back to array
    const teamsArr = Array.isArray(state.teams)
        ? state.teams
        : Object.values(state.teams || {});
    const standings = typeof calculateStandings === 'function'
        ? calculateStandings(teamsArr, state.matchScores || {})
        : [];

    const currentMatches = [];
    const fixtures = state.fixtures || [];
    fixtures.forEach((match, i) => {
        if (!match) return;
        const isScored = match.score1 != null && match.score1 >= 0;
        currentMatches.push({
            courtName: match.court || null,
            roundLabel: match.roundLabel || `Round ${match.round || Math.floor(i / 2) + 1}`,
            team1: match.team1Name || match.team1 || 'TBD',
            team2: match.team2Name || match.team2 || 'TBD',
            score1: isScored ? match.score1 : null,
            score2: isScored ? match.score2 : null,
            isComplete: isScored,
            isLive: !isScored
        });
    });

    return {
        tournamentName: state.tournamentName || 'Round Robin',
        tournamentId: state.tournamentId,
        formatName: 'Round Robin',
        formatEmoji: '\u{1F501}',
        accentColor: 'emerald',
        standings: standings.map((s, i) => ({
            rank: i + 1,
            name: s.name || s.teamName || `Team ${i + 1}`,
            played: s.played || 0,
            points: s.points || 0,
            wins: s.wins,
            losses: s.losses,
            pointsDiff: s.pointsDiff || s.goalDifference
        })),
        currentMatches: currentMatches.filter(m => !m.isComplete).slice(0, 6)
    };
}

function getCardData() {
    const tv = getTvData();
    if (!tv) return null;
    const { currentMatches, ...card } = tv;
    const fixtures = state.fixtures || [];
    const total = fixtures.length;
    const completed = fixtures.filter(m => m && m.score1 != null && m.score1 >= 0).length;
    return { ...card, totalMatches: total, completedMatches: completed };
}

// ===== START APP =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 Round Robin starting...');
    Router.init();
});

// Also handle if DOM already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('🏁 Round Robin starting (immediate)...');
    Router.init();
}

console.log('✅ Round Robin Main loaded');
