// ===== MAIN INITIALIZATION =====

/**
 * Initialize the application
 */
function initApp() {
    console.log('Initializing Knockout Tournament App...');

    // Subscribe to state changes for re-rendering
    TournamentState.subscribe(() => {
        // Auto-render on state change is handled by individual handlers
    });

    // Initialize router
    Router.init();

    console.log('Knockout Tournament App initialized');
}

/**
 * TV Mode data adapter for Knockout format
 */
function getTvData() {
    const state = TournamentState.getState();
    if (!state) return null;

    // Try to get group standings
    const standingsGroups = [];
    if (typeof GroupKnockoutEngine !== 'undefined' && state.groups) {
        state.groups.forEach(group => {
            const groupStandings = GroupKnockoutEngine.calculateGroupStandings ?
                GroupKnockoutEngine.calculateGroupStandings(group, state.scores) : [];
            standingsGroups.push({
                groupName: group.groupName,
                standings: groupStandings.map((s, i) => ({
                    rank: i + 1,
                    name: s.team?.name || s.name || s.playerName || `Team ${i + 1}`,
                    played: s.played || s.gamesPlayed || 0,
                    points: s.points || s.totalPoints || 0,
                    wins: s.won || s.wins || 0,
                    losses: s.lost || s.losses || 0,
                    pointsDiff: s.goalDifference || s.pointsDiff || 0
                }))
            });
        });
    }

    return {
        tournamentName: state.meta?.name || state.tournamentName || state.name || 'Knockout',
        tournamentId: state.tournamentId || TournamentState.tournamentId,
        formatName: 'Knockout',
        formatEmoji: '\u{1F3C6}',
        accentColor: 'orange',
        standingsGroups: standingsGroups.length > 0 ? standingsGroups : undefined,
        standings: standingsGroups.length === 0 ? [] : undefined,
        currentMatches: []
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
    return card;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
