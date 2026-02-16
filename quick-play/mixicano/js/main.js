/**
 * main.js - Application Entry Point
 * Initializes Firebase, Router, and handles navigation
 */

/**
 * Main render function - decides what to show based on route
 */
async function render() {
    if (typeof TVMode !== 'undefined' && TVMode.isActive) { TVMode.render(); return; }
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
    } else if (route === Router.routes.TV) {
        await loadTournament(tournamentId, null);
        TVMode.init(getTvData);
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

/**
 * TV Mode data adapter
 */
function getTvData() {
    if (!state) return null;

    const standings = state.getStandings ? state.getStandings() : [];

    // Get current round matches
    const currentMatches = [];
    const rounds = state.rounds || [];
    rounds.forEach((round, roundIdx) => {
        if (!round) return;
        round.forEach(match => {
            const isScored = match.score1 != null && match.score1 >= 0;
            currentMatches.push({
                courtName: match.court || null,
                roundLabel: `Round ${roundIdx + 1}`,
                team1: match.team1Names || match.team1?.map(id => state.getPlayerName ? state.getPlayerName(id) : `Player ${id}`).join(' & ') || 'TBD',
                team2: match.team2Names || match.team2?.map(id => state.getPlayerName ? state.getPlayerName(id) : `Player ${id}`).join(' & ') || 'TBD',
                score1: isScored ? match.score1 : null,
                score2: isScored ? match.score2 : null,
                isComplete: isScored,
                isLive: !isScored && roundIdx === rounds.length - 1
            });
        });
    });

    // Show last round only
    const lastRoundLabel = currentMatches.length > 0 ? currentMatches[currentMatches.length - 1].roundLabel : null;
    const matchesToShow = lastRoundLabel ? currentMatches.filter(m => m.roundLabel === lastRoundLabel) : [];

    return {
        tournamentName: state.name || state.tournamentName || 'Mixicano',
        tournamentId: state.tournamentId,
        formatName: 'Mixicano',
        formatEmoji: '\u{1F500}',
        accentColor: 'rose',
        standings: standings.map((s, i) => ({
            rank: i + 1,
            name: s.name || `Player ${s.id}`,
            played: s.matchesPlayed || 0,
            points: s.totalPoints || 0
        })),
        currentMatches: matchesToShow
    };
}

function getCardData() {
    const tv = getTvData();
    if (!tv) return null;
    const { currentMatches, ...card } = tv;
    const rounds = state.rounds || [];
    const total = rounds.reduce((sum, r) => sum + (r ? r.length : 0), 0);
    const completed = rounds.reduce((sum, r) => sum + (r ? r.filter(m => m.score1 != null).length : 0), 0);
    return { ...card, totalMatches: total, completedMatches: completed };
}

console.log('✅ Mixicano Main loaded');
