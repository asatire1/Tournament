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
        await renderLandingPage();
    } else if (route === Router.routes.TV) {
        await initializeTournament(tournamentId, null);
        TVMode.init(getTvData);
    } else if (route === Router.routes.TOURNAMENT) {
        await initializeTournament(tournamentId, organiserKey);
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
        return sessionStorage.getItem('americano_organiser_' + tournamentId) === '1';
    } catch (e) {
        return false; // private mode / disabled
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
    
    // Verify organiser key if provided. Failing that, honour the marker left
    // by a successful passcode login earlier in this tab: the organiser key is
    // unreadable by design so there is nothing to re-verify, and the proof
    // already claimed write ownership server-side. This is what keeps
    // organiser status across keyless navigation, including TV mode and back.
    if (organiserKey) {
        await state.verifyOrganiserKey(organiserKey);
    } else if (isVerifiedOrganiser(tournamentId)) {
        state.isOrganiser = true;
    }

    // Load data from Firebase (this will trigger render when data arrives)
    state.loadFromFirebase();
}

/**
 * TV Mode data adapter - converts Americano state to TV format
 */
function getTvData() {
    if (!state) return null;

    // For groups mode, use group standings
    if (state.formatType === 'groups') {
        const groups = ['A', 'B', 'C', 'D'];
        const standingsGroups = groups.map(g => {
            const groupStandings = state.getGroupStandings ? state.getGroupStandings(g) : [];
            return {
                groupName: g,
                standings: groupStandings.map((s, i) => ({
                    rank: i + 1,
                    name: s.name || `Player ${s.playerNum}`,
                    played: s.gamesPlayed || 0,
                    points: s.totalPoints || s.avgScore || 0,
                    wins: s.wins,
                    losses: s.losses,
                    pointsDiff: s.pointsDiff
                }))
            };
        });

        return {
            tournamentName: state.tournamentName || 'Americano',
            tournamentId: state.tournamentId,
            formatName: 'Groups + Knockout',
            formatEmoji: '🏆',
            accentColor: 'purple',
            standingsGroups,
            currentMatches: []
        };
    }

    // Classic mode
    const standings = state.calculateStandings ? state.calculateStandings() : [];

    // Get current matches from fixtures
    const currentMatches = [];
    const timeslots = state.getTimeslots ? state.getTimeslots() : [];
    timeslots.forEach((slot, slotIdx) => {
        slot.forEach((fixture, matchIdx) => {
            const scoreKey = `f_${fixture.fixtureIndex}`;
            const score = state.scores[scoreKey] || state.scores[`${slotIdx}_${matchIdx}`];
            const s1 = score ? score.team1 : -1;
            const s2 = score ? score.team2 : -1;
            const isScored = s1 >= 0 && s2 >= 0;

            currentMatches.push({
                courtName: state.courtNames?.[matchIdx] || `Court ${matchIdx + 1}`,
                roundLabel: `Round ${slotIdx + 1}`,
                team1: fixture.team1.map(p => state.playerNames?.[p - 1] || `Player ${p}`).join(' & '),
                team2: fixture.team2.map(p => state.playerNames?.[p - 1] || `Player ${p}`).join(' & '),
                score1: isScored ? s1 : null,
                score2: isScored ? s2 : null,
                isComplete: isScored,
                isLive: !isScored
            });
        });
    });

    // Find the first incomplete round to show
    const firstIncompleteRound = currentMatches.find(m => !m.isComplete)?.roundLabel;
    const matchesToShow = firstIncompleteRound
        ? currentMatches.filter(m => m.roundLabel === firstIncompleteRound)
        : currentMatches.slice(-state.courtCount || -2);

    return {
        tournamentName: state.tournamentName || 'Americano',
        tournamentId: state.tournamentId,
        formatName: 'Americano',
        formatEmoji: '🔄',
        accentColor: 'blue',
        standings: standings.map((s, i) => ({
            rank: i + 1,
            name: s.name || `Player ${s.playerNum}`,
            played: s.gamesPlayed || 0,
            points: s.avgScore || 0,
            wins: s.wins,
            losses: s.losses,
            pointsDiff: s.pointsDiff
        })),
        currentMatches: matchesToShow
    };
}

function getCardData() {
    const tv = getTvData();
    if (!tv) return null;
    const { currentMatches, ...card } = tv;
    const timeslots = state.getTimeslots ? state.getTimeslots() : [];
    const total = timeslots.reduce((sum, s) => sum + s.length, 0);
    const completed = Object.keys(state.scores || {}).length;
    return { ...card, totalMatches: total, completedMatches: completed };
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
