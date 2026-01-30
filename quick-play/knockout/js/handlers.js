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

console.log('Handlers loaded');
