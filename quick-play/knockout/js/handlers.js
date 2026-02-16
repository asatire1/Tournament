// ===== EVENT HANDLERS =====

/**
 * Handle create tournament button click
 */
async function handleCreateTournament() {
    const nameInput = document.getElementById('tournament-name');
    const countInput = document.getElementById('player-count');

    const name = nameInput.value.trim() || 'Knockout Tournament';
    const playerCount = parseInt(countInput.value);

    // Generate tournament ID
    const tournamentId = generateTournamentId();

    // Initialize state
    TournamentState.reset();
    TournamentState.setTournamentId(tournamentId);
    TournamentState.setIsOrganizer(true);
    TournamentState.updateMeta({
        name: name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'setup',
        playerCount: playerCount
    });

    // Create empty player array
    const players = Array(playerCount).fill('');
    TournamentState.setPlayers(players);

    // Store organizer status
    localStorage.setItem(`knockout_organizer_${tournamentId}`, 'true');

    // Update URL
    window.location.hash = `#/create/${tournamentId}`;

    // Show player entry page
    TournamentState.setCurrentView('players');
    render();
}

/**
 * Handle start tournament (after player entry)
 */
async function handleStartTournament() {
    const inputs = document.querySelectorAll('.player-input');
    const players = [];

    inputs.forEach((input, index) => {
        const name = input.value.trim() || `Player ${index + 1}`;
        players.push(name);
    });

    // Validate all players have names
    if (players.some(p => !p)) {
        showToast('Please enter all player names');
        return;
    }

    TournamentState.setPlayers(players);

    // Create teams from players (pairs)
    const teams = GroupKnockoutEngine.createTeamsFromPlayers(players);
    TournamentState.setTeams(teams);

    // Distribute teams to groups
    const groups = GroupKnockoutEngine.distributeTeamsToGroups(teams, CONFIG.DEFAULT_GROUPS);

    // Generate fixtures for each group
    const groupsWithFixtures = GroupKnockoutEngine.generateAllGroupFixtures(groups);
    TournamentState.setGroups(groupsWithFixtures);

    // Update meta
    TournamentState.updateMeta({
        status: 'group_stage',
        updatedAt: new Date().toISOString()
    });

    // Save to Firebase
    const success = await saveTournament(TournamentState.tournamentId, TournamentState.getDataForSave());

    if (success) {
        // Update URL
        window.location.hash = `#/t/${TournamentState.tournamentId}`;

        // Show groups view
        TournamentState.setCurrentView('groups');
        render();

        showToast('Tournament started!');
    } else {
        showToast('Error saving tournament');
    }
}

/**
 * Handle group stage score change
 */
async function handleScoreChange(input) {
    if (!TournamentState.isOrganizer) return;

    const scoreKey = input.dataset.scoreKey;
    const team = input.dataset.team;
    const value = input.value === '' ? null : parseInt(input.value);

    // Get current score
    const currentScore = TournamentState.getState().scores[scoreKey] || { team1: null, team2: null };

    // Update score
    const newScore = {
        ...currentScore,
        [`team${team}`]: value
    };

    // Update state
    TournamentState.updateScore(scoreKey, newScore);

    // Save to Firebase
    await updateMatchScore(TournamentState.tournamentId, scoreKey, newScore);

    // Re-render to update standings
    render();
}

/**
 * Handle knockout score change
 */
async function handleKnockoutScoreChange(input) {
    if (!TournamentState.isOrganizer) return;

    const stage = input.dataset.stage;
    const matchIndex = parseInt(input.dataset.match);
    const team = input.dataset.team;
    const value = input.value === '' ? null : parseInt(input.value);

    const state = TournamentState.getState();
    let bracket = JSON.parse(JSON.stringify(state.bracket));

    // Get the match
    let match;
    if (stage === 'quarterFinal') {
        match = bracket.quarterFinals[matchIndex];
    } else if (stage === 'semiFinal') {
        match = bracket.semiFinals[matchIndex];
    } else if (stage === 'final') {
        match = bracket.final;
    }

    if (!match) return;

    // Update score
    match.score[`team${team}`] = value;

    // Check for winner (reaches winning score)
    const winningScore = getWinningScore(stage);
    if (match.score.team1 !== null && match.score.team2 !== null) {
        if (match.score.team1 >= winningScore) {
            match.winner = match.team1;
        } else if (match.score.team2 >= winningScore) {
            match.winner = match.team2;
        } else if (match.score.team1 + match.score.team2 >= CONFIG[`${stage.toUpperCase().replace('FINAL', '_FINAL')}_POINTS`] ||
                   match.score.team1 + match.score.team2 >= getWinningScore(stage) * 2 - 1) {
            // Match complete - determine winner by higher score
            match.winner = match.score.team1 > match.score.team2 ? match.team1 : match.team2;
        }
    }

    // Advance winner to next round
    if (match.winner) {
        if (stage === 'quarterFinal') {
            const sfIndex = Math.floor(matchIndex / 2);
            const position = matchIndex % 2 === 0 ? 'team1' : 'team2';
            bracket.semiFinals[sfIndex][position] = match.winner;
        } else if (stage === 'semiFinal') {
            const position = matchIndex === 0 ? 'team1' : 'team2';
            bracket.final[position] = match.winner;
        } else if (stage === 'final') {
            bracket.champion = match.winner;

            // Update tournament status
            TournamentState.updateMeta({
                status: 'complete',
                updatedAt: new Date().toISOString()
            });
        }
    }

    // Update state
    TournamentState.setBracket(bracket);

    // Save to Firebase
    await updateKnockoutBracket(TournamentState.tournamentId, bracket);
    await updateTournament(TournamentState.tournamentId, {
        'meta/updatedAt': new Date().toISOString()
    });

    // Re-render
    render();
}

/**
 * Handle start knockouts
 */
async function handleStartKnockouts() {
    if (!TournamentState.isGroupStageComplete()) {
        showToast('Complete all group stage matches first');
        return;
    }

    const state = TournamentState.getState();

    // Calculate final standings
    const groupsWithStandings = GroupKnockoutEngine.calculateAllGroupStandings(state.groups, state.scores);

    // Determine qualified teams
    const qualified = GroupKnockoutEngine.determineQualifiedTeams(groupsWithStandings);

    // Generate knockout bracket
    const bracket = GroupKnockoutEngine.generateKnockoutBracket(qualified);

    // Update state
    TournamentState.setBracket(bracket);
    TournamentState.updateMeta({
        status: 'knockout',
        updatedAt: new Date().toISOString()
    });

    // Save to Firebase
    await updateKnockoutBracket(TournamentState.tournamentId, bracket);
    await updateTournament(TournamentState.tournamentId, {
        'meta/status': 'knockout',
        'meta/updatedAt': new Date().toISOString()
    });

    // Switch to knockout view
    TournamentState.setCurrentView('knockout');
    render();

    showToast('Knockout stage started!');
}

/**
 * Go back to setup
 */
function goToSetup() {
    TournamentState.setCurrentView('setup');
    render();
}

/**
 * Load tournament by ID
 */
async function loadTournamentById(tournamentId) {
    TournamentState.setLoading(true);
    render();

    const data = await loadTournament(tournamentId);

    if (!data) {
        showToast('Tournament not found');
        TournamentState.reset();
        window.location.hash = '';
        render();
        return;
    }

    // Check if organizer
    const isOrganizer = localStorage.getItem(`knockout_organizer_${tournamentId}`) === 'true';

    TournamentState.setTournamentId(tournamentId);
    TournamentState.setIsOrganizer(isOrganizer);
    TournamentState.loadFromSnapshot(data);
    TournamentState.setLoading(false);

    // Subscribe to updates
    subscribeTournament(tournamentId, (updatedData) => {
        TournamentState.loadFromSnapshot(updatedData);
        render();
    });

    render();
}

// ===== SHARE LINKS =====

/**
 * Show share links modal with TV Mode link
 */
function showShareLinksModal() {
    const state = TournamentState.getState();
    const tournamentId = state.tournamentId || TournamentState.tournamentId;
    if (!tournamentId) return;

    const playerLink = Router.getPlayerLink(tournamentId);
    const shareButtonsHTML = typeof SocialShare !== 'undefined' ? SocialShare.getShareButtons(state.meta?.name || 'Knockout Tournament', tournamentId, 'knockout', playerLink, null) : '';

    let container = document.getElementById('modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'modal-container';
        document.body.appendChild(container);
    }

    container.innerHTML = `
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onclick="if(event.target === this) { document.getElementById('modal-container').innerHTML = ''; }">
            <div class="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-auto">
                <div class="sticky top-0 bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between">
                    <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <span>🔗</span> Share Tournament
                    </h2>
                    <button onclick="document.getElementById('modal-container').innerHTML = ''" class="text-white/80 hover:text-white p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="p-5 sm:p-6 space-y-5">
                    ${shareButtonsHTML}
                    <div class="text-center pb-2">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800">${state.meta?.name || 'Knockout Tournament'}</div>
                        <div class="text-sm text-gray-500 mt-1">Code: <span class="font-mono font-bold text-orange-600">${tournamentId.toUpperCase()}</span></div>
                    </div>

                    <!-- Player Link -->
                    <div class="bg-green-50 border border-green-200 rounded-2xl p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-lg">👥</span>
                            <span class="font-semibold text-green-800">Share Link</span>
                        </div>
                        <p class="text-sm text-green-700 mb-3">Share this with everyone to view scores in real-time</p>
                        <div class="flex gap-2">
                            <input type="text" value="${playerLink}" readonly class="flex-1 min-w-0 px-3 py-2.5 bg-white border border-green-300 rounded-xl text-sm text-gray-600 font-mono truncate" onclick="this.select()" />
                            <button onclick="navigator.clipboard.writeText('${playerLink}'); showToast('✅ Link copied!')" class="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl font-medium transition-colors whitespace-nowrap">Copy</button>
                        </div>
                    </div>

                    <!-- TV Mode -->
                    <div class="bg-purple-50 rounded-xl p-4">
                        <div class="text-sm font-semibold text-purple-800 mb-2">📺 TV Mode</div>
                        <p class="text-xs text-gray-500 mb-2">Full-screen leaderboard for wall-mounted screens</p>
                        <div class="flex items-center gap-2">
                            <input type="text" value="${Router.getTVLink(tournamentId)}" readonly class="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm font-mono" />
                            <button onclick="navigator.clipboard.writeText('${Router.getTVLink(tournamentId)}'); showToast('✅ Copied!')" class="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600">Copy</button>
                        </div>
                    </div>
                </div>

                <div class="sticky bottom-0 p-4 bg-gray-50 border-t border-gray-100">
                    <button onclick="document.getElementById('modal-container').innerHTML = ''" class="w-full px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">Done</button>
                </div>
            </div>
        </div>
    `;
}

console.log('Handlers loaded');
