/**
 * main.js - League App Entry Point
 * Initializes Firebase, sets up routing, and handles render cycle.
 */

// activeTab is declared in components.js (loaded before main.js)

/**
 * Main render function — called on every data change.
 * Dispatches to landing page or league view based on route.
 */
function render() {
    const app = document.getElementById('app');
    if (!app) return;

    switch (Router.currentRoute) {
        case Router.routes.HOME:
            renderLanding();
            break;

        case Router.routes.LEAGUE:
            if (!state.isInitialized) {
                app.innerHTML = `
                    <div class="flex items-center justify-center min-h-screen">
                        <div class="text-center">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                            <p class="text-gray-500">Loading league...</p>
                        </div>
                    </div>`;
                return;
            }
            renderLeague();
            break;

        case Router.routes.TV:
            if (!state.isInitialized) {
                app.innerHTML = `
                    <div class="flex items-center justify-center min-h-screen bg-gray-900">
                        <div class="text-center">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
                            <p class="text-gray-400">Loading TV mode...</p>
                        </div>
                    </div>`;
                return;
            }
            renderTVMode();
            break;

        default:
            renderLanding();
    }
}

/**
 * Render TV mode — full-screen dark standings display.
 */
function renderTVMode() {
    const app = document.getElementById('app');
    if (!app) return;

    // Hide nav in TV mode
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';

    const season = state.getActiveSeason();
    const progress = state.getSeasonProgress(season);

    let divisionsHtml = '';
    state.divisions.forEach(div => {
        const standings = state.getStandings(season, div.index);
        const promotionZone = state.getPromotionZone(season, div.index);
        const relegationZone = state.getRelegationZone(season, div.index);

        let rows = '';
        standings.forEach((s, i) => {
            const isPromotion = promotionZone.includes(s.teamId);
            const isRelegation = relegationZone.includes(s.teamId);
            const zoneBorder = isPromotion ? 'border-l-4 border-green-500' : isRelegation ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent';
            const bg = i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50';

            rows += `
                <tr class="${bg} ${zoneBorder}">
                    <td class="px-3 py-2 text-gray-400 text-center">${i + 1}</td>
                    <td class="px-3 py-2 text-white font-medium">${s.teamName}</td>
                    <td class="px-3 py-2 text-gray-300 text-center">${s.played}</td>
                    <td class="px-3 py-2 text-gray-300 text-center">${s.wins}</td>
                    <td class="px-3 py-2 text-gray-300 text-center">${s.draws}</td>
                    <td class="px-3 py-2 text-gray-300 text-center">${s.losses}</td>
                    <td class="px-3 py-2 text-gray-300 text-center">${s.setDiff > 0 ? '+' : ''}${s.setDiff}</td>
                    <td class="px-3 py-2 text-white font-bold text-center">${s.points}</td>
                </tr>`;
        });

        divisionsHtml += `
            <div class="flex-1 min-w-[300px]">
                <h3 class="text-lg font-bold text-indigo-400 mb-2">${div.name}</h3>
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-gray-500 text-xs uppercase">
                            <th class="px-3 py-1 text-center">#</th>
                            <th class="px-3 py-1 text-left">Team</th>
                            <th class="px-3 py-1 text-center">P</th>
                            <th class="px-3 py-1 text-center">W</th>
                            <th class="px-3 py-1 text-center">D</th>
                            <th class="px-3 py-1 text-center">L</th>
                            <th class="px-3 py-1 text-center">S+/-</th>
                            <th class="px-3 py-1 text-center">Pts</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    });

    app.innerHTML = `
        <div class="min-h-screen bg-gray-900 p-6">
            <div class="max-w-7xl mx-auto">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h1 class="text-3xl font-bold text-white">${state.leagueName}</h1>
                        <p class="text-gray-400 mt-1">Season ${season} &bull; ${progress.completed}/${progress.total} matches (${progress.percentage}%)</p>
                    </div>
                    <div class="text-indigo-400 text-4xl">&#127942;</div>
                </div>
                <div class="flex flex-wrap gap-6">${divisionsHtml}</div>
            </div>
        </div>`;
}

/**
 * Handle route changes
 */
function onRouteChange(route, leagueId, organiserKey) {
    // Clean up previous state
    state.stopListening();
    state.isInitialized = false;

    if (route === Router.routes.HOME) {
        render();
        return;
    }

    if (!leagueId) {
        Router.navigate('home');
        return;
    }

    // Reset tab to overview when entering a new league
    activeTab = 'overview';

    // Set up state. isOrganiser stays false until access is actually proved —
    // the key in the URL is a claim, not evidence.
    state.leagueId = leagueId;
    state.organiserKey = organiserKey;
    state.isOrganiser = false;

    // Show loading state
    render();

    // Resolve organiser access (URL key, cached key, or existing ownership),
    // then load. Always loads, whatever the outcome — a failed check just
    // means viewer mode.
    state.resolveOrganiserAccess(organiserKey).then(() => {
        state.loadFromFirebase(leagueId);
        // Save to local storage for My Leagues
        if (state.leagueName) {
            MyLeagues.add(leagueId, state.leagueName);
        }
    });
}

// switchTab is declared in components.js (loaded before main.js)

/**
 * Get TV data adapter for shared TV mode
 */
function getTvData() {
    if (!state.isInitialized || !state.leagueId) return null;

    const season = state.getActiveSeason();
    const allStandings = [];

    state.divisions.forEach(div => {
        const standings = state.getStandings(season, div.index);
        standings.forEach((s, i) => {
            allStandings.push({
                rank: i + 1,
                name: s.teamName,
                played: s.played,
                points: s.points,
                wins: s.wins,
                losses: s.losses,
                pointsDiff: s.gameDiff
            });
        });
    });

    const upcoming = state.getUpcomingFixtures(4);
    const currentMatches = upcoming.map(m => {
        const t1 = state.getTeam(m.team1Id);
        const t2 = state.getTeam(m.team2Id);
        return {
            team1: t1 ? t1.name : 'TBD',
            team2: t2 ? t2.name : 'TBD',
            score1: null,
            score2: null,
            isComplete: false,
            isLive: false,
            roundLabel: 'Week ' + (m.weekNumber + 1)
        };
    });

    return {
        tournamentName: state.leagueName || 'League',
        tournamentId: state.leagueId,
        formatName: 'League',
        formatEmoji: '&#127942;',
        accentColor: 'indigo',
        standings: allStandings,
        currentMatches
    };
}

/**
 * Get card data adapter for result card sharing
 */
function getCardData() {
    const tv = getTvData();
    if (!tv) return null;
    const { currentMatches, ...card } = tv;
    const progress = state.getSeasonProgress(state.getActiveSeason());
    return { ...card, totalMatches: progress.total, completedMatches: progress.completed };
}

/**
 * Initialize the app
 */
function initializeApp() {
    // Initialize Firebase
    initializeFirebase();

    // Set up routing
    Router.onRouteChange = onRouteChange;
    Router.init();

    // Flush scores before page unload
    window.addEventListener('beforeunload', function () {
        state.flushScoresImmediately();
    });
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
