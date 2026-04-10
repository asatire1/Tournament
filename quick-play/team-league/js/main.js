// ===== TEAM LEAGUE MAIN INITIALIZATION =====

// ===== ROUTE CHANGE HANDLER =====

Router.onRouteChange = async function(route, tournamentId, organiserKey) {
    // Recover organiser key from sessionStorage when the URL doesn't carry
    // one. This handles the round-trip into TV mode (which is keyless) and
    // any other keyless navigation within the same tab: as long as the key
    // was verified earlier in this session, the user stays in organiser
    // mode. sessionStorage is cleared on tab close, so it can't leak.
    if (!organiserKey && tournamentId) {
        try {
            const cached = sessionStorage.getItem('teamLeague_key_' + tournamentId);
            if (cached) organiserKey = cached;
        } catch (e) { /* private mode / disabled — ignore */ }
    }

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
        // TV route: load with whatever key we have so the same state instance
        // can still write (an organiser viewing their own TV preview should
        // not lose ownership). Viewers without a key just render read-only.
        await loadTournament(tournamentId, organiserKey);
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
    if (typeof TVMode !== 'undefined' && TVMode.isActive) { TVMode.render(); return; }
    if (typeof TeamLeagueApp !== 'undefined' && TeamLeagueApp.render) {
        TeamLeagueApp.render();
    }
}

/**
 * TV Mode data adapter for Team League
 */
function getTvData() {
    if (!state) return null;

    const standingsGroups = [];

    // Get group standings
    const activeGroups = state.groupMode === 'four_groups' ? ['A', 'B', 'C', 'D'] : state.groupMode === 'two_groups' ? ['A', 'B'] : ['A'];
    activeGroups.forEach(group => {
        const groupStandings = state.getGroupStandings ? state.getGroupStandings(group) : [];
        standingsGroups.push({
            groupName: group,
            standings: groupStandings.map((s, i) => ({
                rank: i + 1,
                name: s.name || s.teamName || `Team ${i + 1}`,
                played: s.played || 0,
                points: s.points || 0,
                wins: s.wins,
                losses: s.losses,
                pointsDiff: s.pointsDiff || s.goalDifference
            }))
        });
    });

    // Get current matches
    const currentMatches = [];
    const fixtures = [...(state.groupAFixtures || []), ...(state.groupBFixtures || []), ...(state.groupCFixtures || []), ...(state.groupDFixtures || [])];
    fixtures.forEach((match, i) => {
        if (!match) return;
        const isScored = match.score1 != null && match.score1 >= 0;
        currentMatches.push({
            courtName: match.court || null,
            roundLabel: match.group ? `Group ${match.group}` : `Match ${i + 1}`,
            team1: match.team1Name || match.team1 || 'TBD',
            team2: match.team2Name || match.team2 || 'TBD',
            score1: isScored ? match.score1 : null,
            score2: isScored ? match.score2 : null,
            isComplete: isScored,
            isLive: !isScored
        });
    });

    return {
        tournamentName: state.tournamentName || 'Team League',
        tournamentId: state.tournamentId,
        formatName: 'Team League',
        formatEmoji: '\u{1F465}',
        accentColor: 'purple',
        standingsGroups,
        currentMatches: currentMatches.filter(m => !m.isComplete).slice(0, 6)
    };
}

function getCardData() {
    const tv = getTvData();
    if (!tv) return null;
    const { currentMatches, ...card } = tv;
    // Flatten group standings for card display
    if (card.standingsGroups && !card.standings) {
        card.standings = card.standingsGroups.flatMap(g => (g.standings || []).map(s => ({ ...s, subtitle: `Group ${g.groupName}` })));
        card.standings.sort((a, b) => (b.points || 0) - (a.points || 0));
        card.standings.forEach((s, i) => s.rank = i + 1);
    }
    const fixtures = [...(state.groupAFixtures || []), ...(state.groupBFixtures || []), ...(state.groupCFixtures || []), ...(state.groupDFixtures || [])];
    const total = fixtures.length;
    const completed = fixtures.filter(m => m && m.score1 != null && m.score1 >= 0).length;
    return { ...card, totalMatches: total, completedMatches: completed };
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
