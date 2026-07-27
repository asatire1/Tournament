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
        // Clean up existing state
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
 * Did this tab already verify the organiser passcode for this tournament?
 * Only the fact of verification is stored — never the key or the passcode.
 * @param {string} tournamentId
 * @returns {boolean}
 */
function isVerifiedOrganiser(tournamentId) {
    if (!tournamentId) return false;
    try {
        return sessionStorage.getItem('mexicano_organiser_' + tournamentId) === '1';
    } catch (e) {
        return false; // private mode / disabled
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
    const loaded = await state.loadTournament();
    
    if (!loaded) {
        showToast('❌ Session not found');
        Router.navigate('home');
        return;
    }
    
    // Verify the organiser key if provided. Failing that, honour the marker
    // left by a successful passcode login earlier in this tab: the key is
    // unreadable by design so there is nothing to re-verify, and the proof
    // already claimed write ownership server-side. This is what keeps
    // organiser status across keyless navigation, including TV mode and back.
    if (organiserKey) {
        await state.verifyOrganiserKey(organiserKey);
    } else if (isVerifiedOrganiser(tournamentId)) {
        state.isOrganiser = true;
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
        tournamentName: state.name || state.tournamentName || 'Mexicano',
        tournamentId: state.tournamentId,
        formatName: 'Mexicano',
        formatEmoji: '\u{1F1F2}\u{1F1FD}',
        accentColor: 'teal',
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

console.log('✅ Mexicano Main loaded');
