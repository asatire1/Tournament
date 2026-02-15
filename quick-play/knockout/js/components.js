// ===== UI COMPONENTS =====

/**
 * Render the landing/setup page
 */
function renderSetupPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            <!-- Main Content -->
            <div class="max-w-2xl mx-auto px-4 py-8">
                <!-- Title -->
                <div class="text-center mb-8">
                    <div class="inline-flex items-center gap-2 bg-orange-100 text-orange-700 rounded-full px-4 py-2 text-sm font-medium mb-4">
                        <span>🏆</span> Group Stage + Knockout
                    </div>
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Create Knockout Tournament</h1>
                    <p class="text-gray-600">3 groups with fixed pairs, top teams advance to knockouts</p>
                </div>

                <!-- Setup Form -->
                <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <div class="space-y-6">
                        <!-- Tournament Name -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Tournament Name</label>
                            <input
                                type="text"
                                id="tournament-name"
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors"
                                placeholder="e.g., Friday Night Knockout"
                            />
                        </div>

                        <!-- Number of Players -->
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Number of Players</label>
                            <div class="flex items-center gap-4">
                                <input
                                    type="range"
                                    id="player-count"
                                    min="18"
                                    max="36"
                                    step="2"
                                    value="24"
                                    class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                    oninput="updatePlayerCountDisplay()"
                                />
                                <span id="player-count-display" class="text-2xl font-bold text-orange-600 w-16 text-center">24</span>
                            </div>
                            <p class="text-sm text-gray-500 mt-2">
                                <span id="team-count-display">12</span> teams across 3 groups
                            </p>
                        </div>

                        <!-- Format Info -->
                        <div class="bg-orange-50 rounded-xl p-4">
                            <h3 class="font-semibold text-gray-900 mb-3">Tournament Format</h3>
                            <div class="space-y-2 text-sm text-gray-600">
                                <div class="flex items-start gap-2">
                                    <span class="text-orange-500">•</span>
                                    <span><strong>Group Stage:</strong> 16 points per match, Win=3pts, Draw=1pt</span>
                                </div>
                                <div class="flex items-start gap-2">
                                    <span class="text-orange-500">•</span>
                                    <span><strong>Qualification:</strong> Top 2 from each group + best 3rd place teams</span>
                                </div>
                                <div class="flex items-start gap-2">
                                    <span class="text-orange-500">•</span>
                                    <span><strong>Quarter Finals:</strong> Best of 23 points (first to 12)</span>
                                </div>
                                <div class="flex items-start gap-2">
                                    <span class="text-orange-500">•</span>
                                    <span><strong>Semi Finals:</strong> Best of 25 points (first to 13)</span>
                                </div>
                                <div class="flex items-start gap-2">
                                    <span class="text-orange-500">•</span>
                                    <span><strong>Final:</strong> Best of 29 points (first to 15)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Create Button -->
                <button
                    onclick="handleCreateTournament()"
                    class="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-orange-500/30 transition-all"
                >
                    Create Tournament →
                </button>
            </div>
        </div>
    `;
}

/**
 * Update player count display
 */
function updatePlayerCountDisplay() {
    const count = document.getElementById('player-count').value;
    document.getElementById('player-count-display').textContent = count;
    document.getElementById('team-count-display').textContent = Math.floor(count / 2);
}

/**
 * Render player entry page
 */
function renderPlayerEntryPage() {
    const state = TournamentState.getState();
    const playerCount = state.players.length || 24;
    const app = document.getElementById('app');

    let playerInputs = '';
    for (let i = 0; i < playerCount; i++) {
        const teamNum = Math.floor(i / 2) + 1;
        const isFirstInTeam = i % 2 === 0;
        const existingName = state.players[i] || '';

        if (isFirstInTeam) {
            playerInputs += `<div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div class="text-xs font-semibold text-gray-400 mb-3">TEAM ${teamNum}</div>
                <div class="space-y-3">`;
        }

        playerInputs += `
            <input
                type="text"
                class="player-input w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                placeholder="Player ${i + 1}"
                data-index="${i}"
                value="${existingName}"
            />
        `;

        if (!isFirstInTeam) {
            playerInputs += `</div></div>`;
        }
    }

    app.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            <!-- Header -->
            <header class="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
                <div class="max-w-4xl mx-auto px-4 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">🏆</span>
                            <span class="font-bold text-lg text-gray-800">${state.meta.name || 'Knockout'}</span>
                        </div>
                        <button onclick="goToSetup()" class="text-gray-500 hover:text-gray-700 text-sm">
                            ← Back
                        </button>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <div class="max-w-2xl mx-auto px-4 py-8">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">Enter Player Names</h2>
                    <p class="text-gray-600">Players will be paired into teams (listed together)</p>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    ${playerInputs}
                </div>

                <button
                    onclick="handleStartTournament()"
                    class="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-orange-500/30 transition-all"
                >
                    Start Tournament →
                </button>
            </div>
        </div>
    `;
}

/**
 * Render group stage view
 */
function renderGroupStageView() {
    const state = TournamentState.getState();
    const app = document.getElementById('app');

    // Calculate standings for each group
    const groupsWithStandings = state.groups.map(group => ({
        ...group,
        standings: GroupKnockoutEngine.calculateGroupStandings(group, state.scores)
    }));

    const groupStageComplete = TournamentState.isGroupStageComplete();

    app.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            <!-- Header -->
            ${renderTournamentHeader(state)}

            <!-- Main Content -->
            <div class="max-w-6xl mx-auto px-4 py-6">
                <!-- Group Tabs -->
                <div class="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                    ${groupsWithStandings.map((group, idx) => `
                        <button
                            onclick="TournamentState.setSelectedGroup(${idx}); renderGroupStageView();"
                            class="px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                                state.selectedGroup === idx
                                    ? 'bg-orange-500 text-white shadow-lg'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                            }"
                        >
                            Group ${group.groupName}
                        </button>
                    `).join('')}
                    ${groupStageComplete ? `
                        <button
                            onclick="handleStartKnockouts()"
                            class="px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-all whitespace-nowrap ml-auto"
                        >
                            Start Knockouts →
                        </button>
                    ` : ''}
                </div>

                <!-- Selected Group -->
                ${renderGroupContent(groupsWithStandings[state.selectedGroup], state)}
            </div>
        </div>
    `;
}

/**
 * Render group content (standings + fixtures)
 */
function renderGroupContent(group, state) {
    if (!group) return '<p>No group selected</p>';

    return `
        <div class="grid lg:grid-cols-2 gap-6">
            <!-- Standings -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4">Group ${group.groupName} Standings</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-200">
                                <th class="text-left py-2 px-2">#</th>
                                <th class="text-left py-2 px-2">Team</th>
                                <th class="text-center py-2 px-1">P</th>
                                <th class="text-center py-2 px-1">W</th>
                                <th class="text-center py-2 px-1">D</th>
                                <th class="text-center py-2 px-1">L</th>
                                <th class="text-center py-2 px-1">GD</th>
                                <th class="text-center py-2 px-1 font-bold">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.standings.map((team, idx) => `
                                <tr class="border-b border-gray-100 ${idx < 2 ? 'bg-green-50' : idx === 2 ? 'bg-yellow-50' : ''}">
                                    <td class="py-2 px-2 font-medium">${idx + 1}</td>
                                    <td class="py-2 px-2 font-medium truncate max-w-[150px]">${team.team?.name || 'TBD'}</td>
                                    <td class="text-center py-2 px-1">${team.played}</td>
                                    <td class="text-center py-2 px-1">${team.won}</td>
                                    <td class="text-center py-2 px-1">${team.drawn}</td>
                                    <td class="text-center py-2 px-1">${team.lost}</td>
                                    <td class="text-center py-2 px-1 ${team.goalDifference > 0 ? 'text-green-600' : team.goalDifference < 0 ? 'text-red-600' : ''}">${team.goalDifference > 0 ? '+' : ''}${team.goalDifference}</td>
                                    <td class="text-center py-2 px-1 font-bold">${team.points}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 flex gap-4 text-xs">
                    <div class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-200"></span> Qualifies</div>
                    <div class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-yellow-200"></span> Best 3rd</div>
                </div>
            </div>

            <!-- Fixtures -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4">Fixtures</h3>
                <div class="space-y-4 max-h-[500px] overflow-y-auto">
                    ${group.fixtures.map((round, roundIdx) => `
                        <div>
                            <div class="text-xs font-semibold text-gray-400 mb-2">ROUND ${round.roundNumber}</div>
                            <div class="space-y-2">
                                ${round.matches.map((match, matchIdx) => {
                                    const scoreKey = `${group.groupIndex}_${roundIdx}_${matchIdx}`;
                                    const score = state.scores[scoreKey] || { team1: null, team2: null };
                                    return renderMatchCard(match, score, scoreKey, state.isOrganizer);
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render match card
 */
function renderMatchCard(match, score, scoreKey, isOrganizer) {
    const hasScore = score.team1 !== null && score.team2 !== null;
    const team1Winner = hasScore && score.team1 > score.team2;
    const team2Winner = hasScore && score.team2 > score.team1;

    return `
        <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
            <div class="flex-1 text-right">
                <span class="text-sm font-medium ${team1Winner ? 'text-green-600' : ''}">${match.team1?.name || 'TBD'}</span>
            </div>
            <div class="flex items-center gap-1">
                ${isOrganizer ? `
                    <input
                        type="number"
                        min="0"
                        max="16"
                        class="w-10 h-8 text-center border border-gray-200 rounded font-bold ${team1Winner ? 'bg-green-100' : ''}"
                        value="${score.team1 !== null ? score.team1 : ''}"
                        data-score-key="${scoreKey}"
                        data-team="1"
                        onchange="handleScoreChange(this)"
                    />
                    <span class="text-gray-400">-</span>
                    <input
                        type="number"
                        min="0"
                        max="16"
                        class="w-10 h-8 text-center border border-gray-200 rounded font-bold ${team2Winner ? 'bg-green-100' : ''}"
                        value="${score.team2 !== null ? score.team2 : ''}"
                        data-score-key="${scoreKey}"
                        data-team="2"
                        onchange="handleScoreChange(this)"
                    />
                ` : `
                    <span class="px-2 py-1 bg-white rounded font-bold ${team1Winner ? 'text-green-600' : ''}">${score.team1 !== null ? score.team1 : '-'}</span>
                    <span class="text-gray-400">-</span>
                    <span class="px-2 py-1 bg-white rounded font-bold ${team2Winner ? 'text-green-600' : ''}">${score.team2 !== null ? score.team2 : '-'}</span>
                `}
            </div>
            <div class="flex-1 text-left">
                <span class="text-sm font-medium ${team2Winner ? 'text-green-600' : ''}">${match.team2?.name || 'TBD'}</span>
            </div>
        </div>
    `;
}

/**
 * Render knockout bracket view
 */
function renderKnockoutView() {
    const state = TournamentState.getState();
    const app = document.getElementById('app');

    if (!state.bracket) {
        app.innerHTML = '<p>Bracket not generated yet</p>';
        return;
    }

    app.innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
            <!-- Header -->
            ${renderTournamentHeader(state)}

            <!-- Main Content -->
            <div class="max-w-6xl mx-auto px-4 py-6">
                <div class="text-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Knockout Stage</h2>
                    ${state.bracket.champion ? `
                        <div class="mt-4 inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 rounded-full px-6 py-2 text-lg font-bold">
                            🏆 Champion: ${state.bracket.champion.team?.name || state.bracket.champion.name || 'TBD'}
                        </div>
                    ` : ''}
                </div>

                <!-- Bracket -->
                <div class="flex justify-center gap-8 overflow-x-auto pb-6">
                    <!-- Quarter Finals -->
                    <div class="flex-shrink-0">
                        <h3 class="text-sm font-semibold text-gray-500 mb-4 text-center">Quarter Finals</h3>
                        <div class="space-y-4">
                            ${state.bracket.quarterFinals.map((match, idx) =>
                                renderKnockoutMatch(match, 'quarterFinal', idx, state.isOrganizer)
                            ).join('')}
                        </div>
                    </div>

                    <!-- Semi Finals -->
                    <div class="flex-shrink-0 pt-16">
                        <h3 class="text-sm font-semibold text-gray-500 mb-4 text-center">Semi Finals</h3>
                        <div class="space-y-24">
                            ${state.bracket.semiFinals.map((match, idx) =>
                                renderKnockoutMatch(match, 'semiFinal', idx, state.isOrganizer)
                            ).join('')}
                        </div>
                    </div>

                    <!-- Final -->
                    <div class="flex-shrink-0 pt-40">
                        <h3 class="text-sm font-semibold text-gray-500 mb-4 text-center">Final</h3>
                        ${renderKnockoutMatch(state.bracket.final, 'final', 0, state.isOrganizer)}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render knockout match card
 */
function renderKnockoutMatch(match, stage, matchIndex, isOrganizer) {
    const team1Name = match.team1?.team?.name || match.team1?.name || 'TBD';
    const team2Name = match.team2?.team?.name || match.team2?.name || 'TBD';
    const hasScore = match.score.team1 !== null && match.score.team2 !== null;
    const team1Winner = match.winner && (match.winner === match.team1 || match.winner.teamIndex === match.team1?.teamIndex);
    const team2Winner = match.winner && (match.winner === match.team2 || match.winner.teamIndex === match.team2?.teamIndex);
    const winningScore = getWinningScore(stage);

    return `
        <div class="bg-white rounded-xl shadow-lg p-4 w-56">
            <div class="text-xs text-gray-400 mb-2 text-center">First to ${winningScore}</div>

            <!-- Team 1 -->
            <div class="flex items-center gap-2 p-2 rounded-lg ${team1Winner ? 'bg-green-100' : 'bg-gray-50'} mb-2">
                <span class="flex-1 text-sm font-medium truncate ${team1Winner ? 'text-green-700' : ''}">${team1Name}</span>
                ${isOrganizer && match.team1 && match.team2 ? `
                    <input
                        type="number"
                        min="0"
                        max="20"
                        class="w-10 h-7 text-center border border-gray-200 rounded font-bold text-sm"
                        value="${match.score.team1 !== null ? match.score.team1 : ''}"
                        data-stage="${stage}"
                        data-match="${matchIndex}"
                        data-team="1"
                        onchange="handleKnockoutScoreChange(this)"
                    />
                ` : `
                    <span class="font-bold ${team1Winner ? 'text-green-700' : ''}">${match.score.team1 !== null ? match.score.team1 : '-'}</span>
                `}
            </div>

            <!-- Team 2 -->
            <div class="flex items-center gap-2 p-2 rounded-lg ${team2Winner ? 'bg-green-100' : 'bg-gray-50'}">
                <span class="flex-1 text-sm font-medium truncate ${team2Winner ? 'text-green-700' : ''}">${team2Name}</span>
                ${isOrganizer && match.team1 && match.team2 ? `
                    <input
                        type="number"
                        min="0"
                        max="20"
                        class="w-10 h-7 text-center border border-gray-200 rounded font-bold text-sm"
                        value="${match.score.team2 !== null ? match.score.team2 : ''}"
                        data-stage="${stage}"
                        data-match="${matchIndex}"
                        data-team="2"
                        onchange="handleKnockoutScoreChange(this)"
                    />
                ` : `
                    <span class="font-bold ${team2Winner ? 'text-green-700' : ''}">${match.score.team2 !== null ? match.score.team2 : '-'}</span>
                `}
            </div>
        </div>
    `;
}

/**
 * Render tournament header
 */
function renderTournamentHeader(state) {
    return `
        <header class="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
            <div class="max-w-6xl mx-auto px-4 py-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">🏆</span>
                        <div>
                            <h1 class="font-bold text-lg text-gray-800">${state.meta.name || 'Knockout'}</h1>
                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                <span class="font-mono">${state.tournamentId?.toUpperCase() || ''}</span>
                                ${state.isOrganizer ? '<span class="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs">Organizer</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <a href="#/t/${state.tournamentId}/tv" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors" title="TV / Spectator Mode">
                            📺 TV
                        </a>
                        <button onclick="showShareLinksModal()" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                            📋 Share
                        </button>
                        <div class="flex gap-1">
                            <button
                                onclick="TournamentState.setCurrentView('groups'); render();"
                                class="px-3 py-2 rounded-lg text-sm font-medium ${state.currentView === 'groups' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                            >
                                Groups
                            </button>
                            <button
                                onclick="TournamentState.setCurrentView('knockout'); render();"
                                class="px-3 py-2 rounded-lg text-sm font-medium ${state.currentView === 'knockout' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                            >
                                Knockout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    `;
}

/**
 * Copy share link
 */
function copyShareLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied!');
    });
}

/**
 * Show toast message
 */
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg mb-2 animate-fade-in';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

/**
 * Main render function
 */
function render() {
    if (typeof TVMode !== 'undefined' && TVMode.isActive) { TVMode.render(); return; }
    const state = TournamentState.getState();

    if (state.isLoading) {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
                    <p class="text-gray-600">Loading tournament...</p>
                </div>
            </div>
        `;
        return;
    }

    switch (state.currentView) {
        case 'setup':
            renderSetupPage();
            break;
        case 'players':
            renderPlayerEntryPage();
            break;
        case 'groups':
            renderGroupStageView();
            break;
        case 'knockout':
            renderKnockoutView();
            break;
        default:
            renderSetupPage();
    }
}

console.log('Components loaded');
