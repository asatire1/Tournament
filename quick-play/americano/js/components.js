/**
 * components.js - UI Components for Americano Tournament
 * All rendering functions for the tournament interface
 * 
 * Updated for Phase 2: Multi-court scheduling with fixture-based scoring
 */

/**
 * Get player name from state
 */
function getPlayerName(playerNum) {
    if (!state || !state.playerNames) return `Player ${playerNum}`;
    return state.playerNames[playerNum - 1] || `Player ${playerNum}`;
}

/**
 * Get court name from state
 */
function getCourtName(courtIndex) {
    if (!state || !state.courtNames) return `Court ${courtIndex + 1}`;
    return state.courtNames[courtIndex] || `Court ${courtIndex + 1}`;
}

/**
 * Render loading state
 */
function renderLoadingState(tournamentId) {
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
            <div class="text-center">
                <div class="relative mb-6">
                    <div class="w-20 h-20 mx-auto rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
                    <div class="absolute inset-0 flex items-center justify-center text-3xl">🔄</div>
                </div>
                <h2 class="text-xl font-semibold text-gray-800 mb-2">Loading Session</h2>
                <p class="text-gray-500">Code: <span class="font-mono font-bold text-blue-600">${tournamentId?.toUpperCase() || ''}</span></p>
            </div>
        </div>
    `;
}

/**
 * Render tournament not found state
 */
function renderTournamentNotFound(tournamentId) {
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-4">
            <div class="text-center max-w-md">
                <div class="text-6xl mb-6">🔍</div>
                <h2 class="text-2xl font-bold text-gray-800 mb-3">Session Not Found</h2>
                <p class="text-gray-500 mb-2">We couldn't find a session with the code:</p>
                <p class="font-mono text-xl font-bold text-red-500 mb-6">${tournamentId?.toUpperCase() || 'UNKNOWN'}</p>
                <button onclick="Router.navigate('home')" class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">← Back to Home</button>
            </div>
        </div>
    `;
}

/**
 * Render main tournament view
 */
function renderTournament() {
    if (!state || !state.isInitialized) return;
    
    // Check if this is groups mode
    if (state.isGroupsMode()) {
        renderGroupsTournament();
        return;
    }
    
    const canEdit = state.canEdit();
    const totalMatches = state.getTotalMatches();
    const completedMatches = state.countCompletedMatches();
    const totalTimeslots = state.getTotalTimeslots();
    const gamesRange = state.getGamesPerPlayerRange();
    const progressPercent = totalMatches > 0 ? (completedMatches / totalMatches * 100) : 0;
    
    // Tournament status
    const isComplete = completedMatches === totalMatches && totalMatches > 0;
    const isNotStarted = completedMatches === 0;
    
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen pb-24">
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-800 text-white">
                <div class="max-w-5xl mx-auto px-4 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 sm:gap-3">
                            <a href="./" class="hover:scale-110 transition-transform flex-shrink-0" style="font-size: 45px; line-height: 1;">
                                <span class="sm:hidden">🔄</span>
                                <span class="hidden sm:inline" style="font-size: 77px;">🔄</span>
                            </a>
                            <div>
                                <h1 class="text-lg font-bold truncate">${state.tournamentName || 'Americano Session'}</h1>
                                <div class="flex items-center gap-2 text-sm text-white/70">
                                    <span class="font-mono bg-white/10 px-2 py-0.5 rounded">${state.tournamentId?.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${canEdit ? '<span class="text-xs bg-amber-500/20 text-amber-200 px-2 py-1 rounded-full">Organiser</span>' : ''}
                            ${canEdit && state.registeredPlayers && Object.keys(state.registeredPlayers).length > 0 ? `
                                <button onclick="showRegisteredPlayersModal()" class="text-xs bg-green-500/20 text-green-200 px-2 py-1 rounded-full hover:bg-green-500/30 transition-colors">
                                    📋 ${Object.keys(state.registeredPlayers).length} Registrations
                                </button>
                            ` : ''}
                            <button onclick="showShareModal()" class="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Share">
                                <span class="text-xl">📤</span>
                            </button>
                            ${!canEdit ? `<button onclick="showOrganiserLoginModal()" class="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Organiser Login"><span class="text-xl">🔑</span></button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tournament Summary Card -->
            <div class="bg-gradient-to-b from-blue-800 to-transparent">
                <div class="max-w-5xl mx-auto px-4 pb-4">
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden -mt-1">
                        <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
                            <div class="p-4 text-center">
                                <div class="text-2xl font-bold text-blue-600">${state.playerCount}</div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide">Players</div>
                            </div>
                            <div class="p-4 text-center">
                                <div class="text-2xl font-bold text-purple-600">${state.courtCount}</div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide">Court${state.courtCount > 1 ? 's' : ''}</div>
                            </div>
                            <div class="p-4 text-center">
                                <div class="text-2xl font-bold text-indigo-600">${totalTimeslots}</div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide">Rounds</div>
                            </div>
                            <div class="p-4 text-center">
                                <div class="text-2xl font-bold text-teal-600">${gamesRange.min === gamesRange.max ? gamesRange.min : `${gamesRange.min}-${gamesRange.max}`}</div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide">Games/Player</div>
                            </div>
                        </div>
                        <!-- Progress -->
                        <div class="px-4 py-3 bg-gray-50 border-t border-gray-100">
                            <div class="flex items-center justify-between text-sm mb-2">
                                <span class="font-medium text-gray-700">
                                    ${isComplete ? '🎉 Tournament Complete!' : 
                                      isNotStarted ? '🎾 Ready to start' : 
                                      '⏱️ In Progress'}
                                </span>
                                <span class="text-gray-500">${completedMatches}/${totalMatches} matches</span>
                            </div>
                            <div class="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div class="h-full ${isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'} transition-all duration-500" 
                                    style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
                <div class="max-w-5xl mx-auto px-4">
                    <div class="flex gap-2 py-3">
                        <button onclick="state.currentTab = 'fixtures'; render();" class="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${state.currentTab === 'fixtures' ? 'tab-active' : 'tab-inactive'}">
                            📋 Fixtures
                        </button>
                        <button onclick="state.currentTab = 'leaderboard'; render();" class="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${state.currentTab === 'leaderboard' ? 'tab-active' : 'tab-inactive'}">
                            🏆 Leaderboard
                        </button>
                        <button onclick="state.currentTab = 'settings'; render();" class="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${state.currentTab === 'settings' ? 'tab-active' : 'tab-inactive'}">
                            ⚙️ Settings
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Tab Content -->
            <div class="max-w-5xl mx-auto px-4 py-6">
                ${state.currentTab === 'fixtures' ? renderFixturesTab() : ''}
                ${state.currentTab === 'leaderboard' ? renderLeaderboardTab() : ''}
                ${state.currentTab === 'settings' ? renderSettingsTab() : ''}
            </div>
        </div>
    `;
}

/**
 * Render fixtures tab with rounds (timeslots)
 */
function renderFixturesTab() {
    const rounds = state.getRounds();
    const totalRounds = rounds.length;
    
    // Find current round (first incomplete)
    const currentRoundIndex = rounds.findIndex(round => 
        !round.matches.every(match => {
            const score = state.getScoreByFixture(match.fixtureIndex);
            return score.team1 !== null && score.team2 !== null;
        })
    );
    
    // Build round selector buttons
    const roundButtons = `
        <button onclick="state.selectedRound = 'all'; render();" 
            class="round-btn px-3 py-2 rounded-xl text-xs font-semibold transition-all ${state.selectedRound === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'}">
            All
        </button>
        ${rounds.map((round, idx) => {
            const isComplete = round.matches.every((match) => {
                const score = state.getScoreByFixture(match.fixtureIndex);
                return score.team1 !== null && score.team2 !== null;
            });
            const isSelected = state.selectedRound === idx;
            const isCurrent = idx === currentRoundIndex;
            return `
                <button onclick="state.selectedRound = ${idx}; render();" 
                    class="round-btn w-10 h-10 rounded-xl font-semibold text-sm transition-all relative
                        ${isSelected ? 'bg-blue-500 text-white shadow-lg' : 
                          isComplete ? 'bg-green-100 text-green-700 border border-green-200' : 
                          isCurrent ? 'bg-amber-100 text-amber-700 border-2 border-amber-400' :
                          'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                    ${idx + 1}
                    ${isCurrent && !isComplete ? '<span class="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>' : ''}
                </button>
            `;
        }).join('')}
    `;
    
    // Quick navigation for current round
    const quickNav = currentRoundIndex >= 0 && state.selectedRound === 'all' ? `
        <button onclick="state.selectedRound = ${currentRoundIndex}; render();" 
            class="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
            <span>▶</span> Jump to Round ${currentRoundIndex + 1}
        </button>
    ` : '';
    
    // Determine which rounds to show
    const roundsToShow = state.selectedRound === 'all' 
        ? rounds.map((r, idx) => ({ ...r, index: idx }))
        : [{ ...rounds[state.selectedRound], index: state.selectedRound }];
    
    // Build round cards
    const roundCards = roundsToShow.map(round => renderRoundCard(round, currentRoundIndex)).join('');
    
    return `
        <div class="space-y-6">
            <!-- Round Selector -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 class="font-semibold text-gray-800">Select Round</h3>
                    <div class="flex items-center gap-3 text-sm flex-wrap">
                        ${quickNav}
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
                            <span class="text-gray-500">Done</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded bg-amber-100 border-2 border-amber-400"></span>
                            <span class="text-gray-500">Current</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2">${roundButtons}</div>
            </div>
            
            <!-- Round Cards -->
            <div class="space-y-6">
                ${roundCards}
            </div>
        </div>
    `;
}

/**
 * Render a single round card with all its matches
 */
function renderRoundCard(round, currentRoundIndex) {
    const canEdit = state.canEdit();
    const completedMatches = round.matches.filter((match) => {
        const score = state.getScoreByFixture(match.fixtureIndex);
        return score.team1 !== null && score.team2 !== null;
    }).length;
    const allComplete = completedMatches === round.matches.length;
    const isCurrent = round.index === currentRoundIndex;
    
    // Enhanced resting players display - show badges for small groups, compact for large
    const restingDisplay = round.resting.length === 0 ? '' : 
        round.resting.length <= 4 
            ? round.resting.map(p => `
                <div class="resting-player-badge ${getPlayerColorClass(p)}">
                    <span>#${p}</span>
                    <span class="hidden sm:inline">${getPlayerName(p).split(' ')[0]}</span>
                </div>
            `).join('')
            : `<span class="resting-count">${round.resting.length} players resting</span>`;
    
    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up ${isCurrent ? 'ring-2 ring-amber-400 ring-offset-2' : ''}">
            <!-- Round Header -->
            <div class="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div class="flex flex-wrap justify-between items-center gap-2">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-gray-800 text-lg">Round ${round.index + 1}</span>
                            ${isCurrent ? '<span class="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">CURRENT</span>' : ''}
                        </div>
                        ${round.matches.length > 1 ? `
                            <span class="text-sm text-gray-500 flex items-center gap-1">
                                <span class="text-base">🏟️</span> ${round.matches.length} courts
                            </span>
                        ` : ''}
                    </div>
                    <div class="flex items-center gap-3">
                        <!-- Progress indicator -->
                        <div class="flex items-center gap-2">
                            <div class="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div class="h-full ${allComplete ? 'bg-green-500' : 'bg-blue-500'} transition-all duration-300" 
                                    style="width: ${round.matches.length > 0 ? (completedMatches / round.matches.length * 100) : 0}%"></div>
                            </div>
                            <span class="text-sm ${allComplete ? 'text-green-600' : 'text-gray-500'}">
                                ${allComplete ? '✓ Complete' : `${completedMatches}/${round.matches.length}`}
                            </span>
                        </div>
                    </div>
                </div>
                ${round.resting.length > 0 ? `
                    <div class="mt-2 flex items-center gap-2 flex-wrap">
                        <span class="text-sm text-amber-700 font-medium">⏸️ Resting:</span>
                        <div class="flex flex-wrap gap-1.5">
                            ${restingDisplay}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <!-- Matches Grid -->
            <div class="p-4 grid grid-cols-1 ${round.matches.length > 1 ? 'lg:grid-cols-2' : ''} gap-4">
                ${round.matches.map((match, courtIdx) => renderMatchCard(match, courtIdx)).join('')}
            </div>
        </div>
    `;
}

/**
 * Render a single match card using fixture index
 */
function renderMatchCard(match, courtIndex) {
    const canEdit = state.canEdit();
    const fixtureIndex = match.fixtureIndex;
    const score = state.getScoreByFixture(fixtureIndex);
    const isComplete = score.team1 !== null && score.team2 !== null;
    const team1Players = match.teams[0];
    const team2Players = match.teams[1];
    
    // Determine winner for visual highlight
    const team1Wins = isComplete && score.team1 > score.team2;
    const team2Wins = isComplete && score.team2 > score.team1;
    
    const scoreDisplay = canEdit ? `
        <input type="number" min="0" max="${state.fixedPoints ? state.totalPoints : 999}"
            value="${score.team1 !== null ? score.team1 : ''}" 
            placeholder="—" 
            class="score-input-compact ${team1Wins ? 'text-green-600' : ''}" 
            onchange="state.updateScoreByFixture(${fixtureIndex}, 'team1', this.value); renderTournament();" />
        <span class="text-gray-400 text-2xl font-semibold">:</span>
        <input type="number" min="0" max="${state.fixedPoints ? state.totalPoints : 999}"
            value="${score.team2 !== null ? score.team2 : ''}" 
            placeholder="—" 
            class="score-input-compact ${team2Wins ? 'text-green-600' : ''}" 
            onchange="state.updateScoreByFixture(${fixtureIndex}, 'team2', this.value); renderTournament();" />
    ` : `
        <span class="text-3xl font-bold ${team1Wins ? 'text-green-600' : 'text-gray-800'}">${score.team1 !== null ? score.team1 : '—'}</span>
        <span class="text-gray-400 text-2xl font-semibold">:</span>
        <span class="text-3xl font-bold ${team2Wins ? 'text-green-600' : 'text-gray-800'}">${score.team2 !== null ? score.team2 : '—'}</span>
    `;
    
    return `
        <div class="match-card ${isComplete ? 'complete' : ''}">
            <div class="px-4 py-2 flex justify-between items-center bg-gray-50">
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 font-mono">#${fixtureIndex + 1}</span>
                    <div class="font-semibold text-gray-800">${getCourtName(courtIndex)}</div>
                </div>
                <div class="flex items-center gap-2">
                    ${isComplete ? '<span class="text-green-600 text-sm font-medium">✓ Done</span>' : 
                      '<span class="text-amber-500 text-xs font-medium">Awaiting score</span>'}
                </div>
            </div>
            <div class="px-3 py-4">
                <div class="match-row">
                    <div class="team-stack ${team1Wins ? 'winner' : ''}">
                        ${team1Players.map(p => `
                            <div class="player-badge-compact ${getPlayerColorClass(p)} ${team1Wins ? 'ring-2 ring-green-400 ring-offset-1' : ''}">
                                <span class="font-bold">#${p}</span>
                                <span class="player-name-truncate">${getPlayerName(p)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="score-box-horizontal ${isComplete ? 'score-complete' : ''}">
                        <div class="score-row">${scoreDisplay}</div>
                        ${state.fixedPoints ? `<span class="text-xs text-gray-400">of ${state.totalPoints} pts</span>` : ''}
                    </div>
                    <div class="team-stack ${team2Wins ? 'winner' : ''}">
                        ${team2Players.map(p => `
                            <div class="player-badge-compact ${getPlayerColorClass(p)} ${team2Wins ? 'ring-2 ring-green-400 ring-offset-1' : ''}">
                                <span class="font-bold">#${p}</span>
                                <span class="player-name-truncate">${getPlayerName(p)}</span>
                            </div>
                        `).join('')}
                    </div>
                    ${isComplete && canEdit ? `
                        <button onclick="state.clearScoreByFixture(${fixtureIndex}); renderTournament();" 
                            class="clear-score-btn-small" title="Clear score">×</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render leaderboard tab with average scoring support
 */
function renderLeaderboardTab() {
    const standings = state.calculateStandings();
    const totalMatches = state.getTotalMatches();
    const completedMatches = state.countCompletedMatches();
    const gamesRange = state.getGamesPerPlayerRange();
    
    // Check if players have different game counts (need to show avg)
    const gameCounts = standings.map(p => p.gamesPlayed).filter(g => g > 0);
    const hasVariableGames = gameCounts.length > 0 && 
        Math.max(...gameCounts) !== Math.min(...gameCounts);
    
    // Top 3 for podium display (only if we have scores)
    const hasScores = standings.some(p => p.gamesPlayed > 0);
    const top3 = hasScores ? standings.slice(0, 3) : [];
    
    return `
        <div class="space-y-6">
            ${hasScores && top3.length >= 3 ? `
                <!-- Podium Display -->
                <div class="bg-gradient-to-b from-amber-50 to-white rounded-2xl shadow-sm border border-amber-100 p-6 animate-scale-in">
                    <div class="flex justify-center items-end gap-4">
                        <!-- 2nd Place -->
                        <div class="flex flex-col items-center">
                            <div class="team-mini-badge ${getPlayerColorClass(top3[1].playerNum)} w-14 h-14 text-lg mb-2">
                                #${top3[1].playerNum}
                            </div>
                            <div class="text-sm font-semibold text-gray-800 text-center truncate max-w-20">${top3[1].name.split(' ')[0]}</div>
                            <div class="text-xs text-gray-500">${top3[1].score} pts</div>
                            <div class="w-20 h-16 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-lg mt-2 flex items-center justify-center">
                                <span class="text-2xl font-bold text-gray-600">🥈</span>
                            </div>
                        </div>
                        <!-- 1st Place -->
                        <div class="flex flex-col items-center -mt-4">
                            <div class="team-mini-badge ${getPlayerColorClass(top3[0].playerNum)} w-16 h-16 text-xl mb-2 ring-4 ring-amber-300 ring-offset-2">
                                #${top3[0].playerNum}
                            </div>
                            <div class="text-sm font-bold text-gray-800 text-center truncate max-w-24">${top3[0].name.split(' ')[0]}</div>
                            <div class="text-xs text-amber-600 font-semibold">${top3[0].score} pts</div>
                            <div class="w-24 h-24 bg-gradient-to-t from-amber-400 to-amber-300 rounded-t-lg mt-2 flex items-center justify-center shadow-lg">
                                <span class="text-3xl font-bold">🥇</span>
                            </div>
                        </div>
                        <!-- 3rd Place -->
                        <div class="flex flex-col items-center">
                            <div class="team-mini-badge ${getPlayerColorClass(top3[2].playerNum)} w-14 h-14 text-lg mb-2">
                                #${top3[2].playerNum}
                            </div>
                            <div class="text-sm font-semibold text-gray-800 text-center truncate max-w-20">${top3[2].name.split(' ')[0]}</div>
                            <div class="text-xs text-gray-500">${top3[2].score} pts</div>
                            <div class="w-20 h-12 bg-gradient-to-t from-orange-300 to-orange-200 rounded-t-lg mt-2 flex items-center justify-center">
                                <span class="text-2xl font-bold text-orange-700">🥉</span>
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- Full Standings Table -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span>🏆</span> Full Standings
                        </h2>
                        <span class="text-sm text-gray-500">${completedMatches}/${totalMatches} matches complete</span>
                    </div>
                    ${hasVariableGames ? `
                        <div class="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 inline-block">
                            ⚖️ Sorted by average score (players have ${gamesRange.min}-${gamesRange.max} games each)
                        </div>
                    ` : ''}
                </div>
                <div class="overflow-x-auto">
                    <table class="standings-table">
                        <thead>
                            <tr>
                                <th class="text-center">#</th>
                                <th>Player</th>
                                <th class="text-center">P</th>
                                <th class="text-center">W</th>
                                <th class="text-center">L</th>
                                <th class="text-center">PF</th>
                                <th class="text-center">PA</th>
                                <th class="text-center">PD</th>
                                ${hasVariableGames ? '<th class="text-center">AVG</th>' : ''}
                                <th class="text-center">PTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${standings.map((player, index) => `
                                <tr class="${index < 3 && hasScores ? 'bg-amber-50/50' : ''}">
                                    <td class="position ${index < 3 ? 'qualified' : ''}">
                                        ${index === 0 && hasScores ? '🥇' : index === 1 && hasScores ? '🥈' : index === 2 && hasScores ? '🥉' : index + 1}
                                    </td>
                                    <td>
                                        <div class="team-cell">
                                            <div class="team-mini-badge ${getPlayerColorClass(player.playerNum)}">
                                                #${player.playerNum}
                                            </div>
                                            <div class="team-info">
                                                <div class="team-name">${player.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="stat">${player.gamesPlayed}</td>
                                    <td class="stat">${player.wins}</td>
                                    <td class="stat">${player.losses}</td>
                                    <td class="stat">${player.pointsFor}</td>
                                    <td class="stat">${player.pointsAgainst}</td>
                                    <td class="stat" style="color: ${player.pointsDiff >= 0 ? '#16A34A' : '#DC2626'}">${player.pointsDiff >= 0 ? '+' : ''}${player.pointsDiff}</td>
                                    ${hasVariableGames ? `<td class="stat font-semibold">${player.avgScore.toFixed(1)}</td>` : ''}
                                    <td class="points">${player.score}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                    P = Played • W = Wins • L = Losses • PF = Points For • PA = Points Against • PD = Point Diff${hasVariableGames ? ' • AVG = Avg/Game' : ''} • PTS = Total Points
                </div>
            </div>
        </div>
    `;
}

/**
 * Render settings tab
 */
function renderSettingsTab() {
    const canEdit = state.canEdit();
    
    return `
        <div class="space-y-6">
            <!-- Settings Sub-tabs -->
            <div class="flex gap-2 overflow-x-auto pb-2">
                <button onclick="state.settingsSubTab = 'players'; render();" 
                    class="settings-subtab ${state.settingsSubTab === 'players' ? 'active' : 'inactive'}">
                    👥 Players
                </button>
                <button onclick="state.settingsSubTab = 'courts'; render();" 
                    class="settings-subtab ${state.settingsSubTab === 'courts' ? 'active' : 'inactive'}">
                    🏟️ Courts
                </button>
                <button onclick="state.settingsSubTab = 'rounds'; render();" 
                    class="settings-subtab ${state.settingsSubTab === 'rounds' ? 'active' : 'inactive'}">
                    📋 Rounds
                </button>
                <button onclick="state.settingsSubTab = 'scoring'; render();" 
                    class="settings-subtab ${state.settingsSubTab === 'scoring' ? 'active' : 'inactive'}">
                    📊 Scoring
                </button>
                <button onclick="state.settingsSubTab = 'danger'; render();" 
                    class="settings-subtab ${state.settingsSubTab === 'danger' ? 'active' : 'inactive'}">
                    ⚠️ Danger Zone
                </button>
            </div>
            
            <!-- Sub-tab Content -->
            ${state.settingsSubTab === 'players' ? renderPlayersSettings(canEdit) : ''}
            ${state.settingsSubTab === 'courts' ? renderCourtsSettings(canEdit) : ''}
            ${state.settingsSubTab === 'rounds' ? renderRoundsSettings(canEdit) : ''}
            ${state.settingsSubTab === 'scoring' ? renderScoringSettings(canEdit) : ''}
            ${state.settingsSubTab === 'danger' ? renderDangerSettings(canEdit) : ''}
        </div>
    `;
}

/**
 * Render players settings
 */
function renderPlayersSettings(canEdit) {
    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100">
                <h3 class="font-semibold text-gray-800">Player Names</h3>
                <p class="text-sm text-gray-500 mt-1">Edit player names for the tournament</p>
            </div>
            <div class="p-4 space-y-3">
                ${state.playerNames.map((name, index) => `
                    <div class="flex items-center gap-3">
                        <div class="team-mini-badge ${getPlayerColorClass(index + 1)}">#${index + 1}</div>
                        <input type="text" 
                            value="${name}" 
                            placeholder="Player ${index + 1}"
                            class="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors ${!canEdit ? 'bg-gray-50' : ''}"
                            ${!canEdit ? 'disabled' : ''}
                            onchange="state.updatePlayerName(${index}, this.value)" />
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Render courts settings with ability to change court count
 */
function renderCourtsSettings(canEdit) {
    const maxCourts = getMaxCourts(state.playerCount);
    const minCourts = getMinCourts(state.playerCount);
    const totalTimeslots = state.getTotalTimeslots();
    
    return `
        <div class="space-y-4">
            <!-- Court Count -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-800">Number of Courts</h3>
                    <p class="text-sm text-gray-500 mt-1">More courts = faster tournament, more players active per round</p>
                </div>
                <div class="p-4">
                    <div class="flex items-center gap-4">
                        <select 
                            class="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors ${!canEdit ? 'bg-gray-50' : ''}"
                            ${!canEdit ? 'disabled' : ''}
                            onchange="state.updateSettings({ courtCount: parseInt(this.value) }); render();">
                            ${(() => {
                                const options = [];
                                for (let count = minCourts; count <= maxCourts; count++) {
                                    options.push(`<option value="${count}" ${state.courtCount === count ? 'selected' : ''}>${count} court${count > 1 ? 's' : ''}</option>`);
                                }
                                return options.join('');
                            })()}
                        </select>
                    </div>
                    <div class="mt-3 p-3 bg-blue-50 rounded-xl">
                        <div class="text-sm text-blue-800">
                            <strong>${state.courtCount} court${state.courtCount > 1 ? 's' : ''}</strong> = 
                            ${state.courtCount * 4} players active per round, 
                            ${state.playerCount - (state.courtCount * 4)} resting
                        </div>
                        <div class="text-xs text-blue-600 mt-1">
                            Total rounds: ${totalTimeslots}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Court Names -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-800">Court Names</h3>
                    <p class="text-sm text-gray-500 mt-1">Customize court labels for display</p>
                </div>
                <div class="p-4 space-y-3">
                    ${state.courtNames.slice(0, state.courtCount).map((name, index) => `
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold">${index + 1}</div>
                            <input type="text" 
                                value="${name}" 
                                placeholder="Court ${index + 1}"
                                class="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors ${!canEdit ? 'bg-gray-50' : ''}"
                                ${!canEdit ? 'disabled' : ''}
                                onchange="state.updateCourtName(${index}, this.value)" />
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render rounds reordering settings
 */
function renderRoundsSettings(canEdit) {
    const rounds = state.getRounds();
    const hasCustomOrder = state.roundOrder !== null;
    
    return `
        <div class="space-y-4">
            <!-- Round Order Info -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-800">Round Order</h3>
                    <p class="text-sm text-gray-500 mt-1">Drag or use arrows to reorder when rounds are played</p>
                </div>
                <div class="p-4">
                    ${hasCustomOrder ? `
                        <div class="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                            <div class="text-sm text-amber-700">
                                <span class="font-medium">Custom order active</span> - rounds are reordered
                            </div>
                            <button 
                                onclick="state.resetRoundOrder(); render(); showToast('✅ Round order reset');"
                                class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}"
                                ${!canEdit ? 'disabled' : ''}>
                                Reset to Default
                            </button>
                        </div>
                    ` : ''}
                    
                    <!-- Rounds List -->
                    <div class="space-y-2">
                        ${rounds.map((round, displayIndex) => {
                            const originalIndex = round.originalIndex !== undefined ? round.originalIndex : round.index;
                            const matchSummary = round.matches.map(m => {
                                const t1 = m.teams[0].map(p => state.playerNames[p-1] || `P${p}`).join(' & ');
                                const t2 = m.teams[1].map(p => state.playerNames[p-1] || `P${p}`).join(' & ');
                                return `${t1} vs ${t2}`;
                            }).slice(0, 2).join(', ');
                            const extraMatches = round.matches.length > 2 ? ` +${round.matches.length - 2} more` : '';
                            
                            return `
                                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 ${canEdit ? 'hover:bg-gray-100' : ''}">
                                    <!-- Round Number -->
                                    <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                                        ${displayIndex + 1}
                                    </div>
                                    
                                    <!-- Round Info -->
                                    <div class="flex-1 min-w-0">
                                        <div class="font-medium text-gray-800">
                                            Round ${displayIndex + 1}
                                            ${hasCustomOrder && originalIndex !== displayIndex ? 
                                                `<span class="text-xs text-gray-400 ml-1">(was R${originalIndex + 1})</span>` : ''}
                                        </div>
                                        <div class="text-sm text-gray-500 truncate">
                                            ${round.matches.length} match${round.matches.length > 1 ? 'es' : ''}: ${matchSummary}${extraMatches}
                                        </div>
                                    </div>
                                    
                                    <!-- Reorder Buttons -->
                                    ${canEdit ? `
                                        <div class="flex flex-col gap-1">
                                            <button 
                                                onclick="moveRoundUp(${displayIndex})"
                                                class="p-1.5 rounded-lg ${displayIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-blue-100 hover:text-blue-600'}"
                                                ${displayIndex === 0 ? 'disabled' : ''}
                                                title="Move up">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button 
                                                onclick="moveRoundDown(${displayIndex})"
                                                class="p-1.5 rounded-lg ${displayIndex === rounds.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-blue-100 hover:text-blue-600'}"
                                                ${displayIndex === rounds.length - 1 ? 'disabled' : ''}
                                                title="Move down">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
            
            <!-- Help Text -->
            <div class="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <div class="font-semibold mb-1">💡 Tip</div>
                <p>Reorder rounds to control when specific matches are played. This is useful if you need to delay or prioritize certain matchups. Scores are preserved when rounds are reordered.</p>
            </div>
        </div>
    `;
}

/**
 * Render scoring settings
 */
function renderScoringSettings(canEdit) {
    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100">
                <h3 class="font-semibold text-gray-800">Scoring Settings</h3>
            </div>
            <div class="p-4 space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="font-medium text-gray-800">Fixed Points Mode</div>
                        <div class="text-sm text-gray-500">Automatically calculate opponent's score</div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" 
                            class="sr-only peer" 
                            ${state.fixedPoints ? 'checked' : ''}
                            ${!canEdit ? 'disabled' : ''}
                            onchange="state.updateSettings({ fixedPoints: this.checked }); render();" />
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                ${state.fixedPoints ? `
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Total Points per Match</label>
                        <select 
                            class="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors ${!canEdit ? 'bg-gray-50' : ''}"
                            ${!canEdit ? 'disabled' : ''}
                            onchange="state.updateSettings({ totalPoints: parseInt(this.value) }); render();">
                            ${CONFIG.POINTS_OPTIONS.map(pts => `
                                <option value="${pts}" ${state.totalPoints === pts ? 'selected' : ''}>${pts} points</option>
                            `).join('')}
                        </select>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Render danger zone settings
 */
function renderDangerSettings(canEdit) {
    return `
        <div class="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-red-100 bg-red-50">
                <h3 class="font-semibold text-red-800">⚠️ Danger Zone</h3>
                <p class="text-sm text-red-600 mt-1">These actions cannot be undone</p>
            </div>
            <div class="p-4 space-y-4">
                <button 
                    onclick="if(confirm('Reset ALL scores? This cannot be undone!')) { state.resetAllScores(); render(); }"
                    class="w-full px-4 py-3 border-2 border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${!canEdit ? 'disabled' : ''}>
                    🗑️ Reset All Scores
                </button>
            </div>
        </div>
    `;
}

/**
 * Main render function
 */
function render() {
    if (!state) return;
    
    if (Router.currentRoute === Router.routes.TOURNAMENT) {
        renderTournament();
    }
}

// ====== GROUPS MODE RENDERING FUNCTIONS ======

/**
 * Render Groups + Knockout tournament view
 */
function renderGroupsTournament() {
    const canEdit = state.canEdit();
    const groupsComplete = state.isGroupStageComplete();
    const totalGroupMatches = state.getTotalGroupMatches();
    const completedGroupMatches = state.countGroupMatchesComplete();
    const gamesRange = state.getGamesPerPlayerRange();
    const groupProgressPercent = totalGroupMatches > 0 ? (completedGroupMatches / totalGroupMatches * 100) : 0;
    
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen pb-24">
            <!-- Header -->
            <div class="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-800 text-white">
                <div class="max-w-5xl mx-auto px-4 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 sm:gap-3">
                            <a href="./" class="hover:scale-110 transition-transform flex-shrink-0" style="font-size: 45px; line-height: 1;">
                                <span class="sm:hidden">🏆</span>
                                <span class="hidden sm:inline" style="font-size: 77px;">🏆</span>
                            </a>
                            <div>
                                <h1 class="text-lg font-bold truncate">${state.tournamentName || 'Americano Groups'}</h1>
                                <div class="flex items-center gap-2 text-sm text-white/70">
                                    <span class="font-mono bg-white/10 px-2 py-0.5 rounded">${state.tournamentId?.toUpperCase()}</span>
                                    <span class="bg-purple-500/30 px-2 py-0.5 rounded text-xs">Groups + Knockout</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${canEdit ? '<span class="text-xs bg-amber-500/20 text-amber-200 px-2 py-1 rounded-full">Organiser</span>' : ''}
                            <button onclick="showShareModal()" class="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Share">
                                <span class="text-xl">📤</span>
                            </button>
                            ${!canEdit ? '<button onclick="showOrganiserLoginModal()" class="p-2 hover:bg-white/10 rounded-xl transition-colors" title="Organiser Login"><span class="text-xl">🔑</span></button>' : ''}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tournament Summary Card -->
            <div class="bg-gradient-to-b from-purple-800 to-transparent">
                <div class="max-w-5xl mx-auto px-4 pb-4">
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden -mt-1">
                        <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
                            <div class="p-4 text-center">
                                <div class="text-2xl font-bold text-purple-600">24</div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide">Players</div>
                            </div>
                            <div class="p-4 text-center">
                                <div class="text-2xl font-bold text-indigo-600">4</div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide">Groups</div>
                            </div>
                            <div class="p-4 text-center">
                                <div class="text-2xl font-bold text-blue-600">4</div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide">Courts</div>
                            </div>
                            <div class="p-4 text-center">
                                <div class="text-2xl font-bold text-teal-600">${gamesRange.min}-${gamesRange.max}</div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide">Games/Player</div>
                            </div>
                        </div>
                        <!-- Progress -->
                        <div class="px-4 py-3 bg-gray-50 border-t border-gray-100">
                            <div class="flex items-center justify-between text-sm mb-2">
                                <span class="font-medium text-gray-700">
                                    ${groupsComplete ? '🏆 Groups Complete - Knockout Ready!' : 
                                      completedGroupMatches === 0 ? '🎾 Group Stage Ready' : 
                                      '⏱️ Group Stage In Progress'}
                                </span>
                                <span class="text-gray-500">${completedGroupMatches}/${totalGroupMatches} group matches</span>
                            </div>
                            <div class="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div class="h-full ${groupsComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'} transition-all duration-500" 
                                    style="width: ${groupProgressPercent}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Stage Tabs -->
            <div class="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
                <div class="max-w-5xl mx-auto px-4">
                    <div class="flex gap-2 py-3">
                        <button onclick="state.selectedStage = 'groups'; render();" class="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${state.selectedStage === 'groups' ? 'bg-purple-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                            📋 Groups
                        </button>
                        <button onclick="state.selectedStage = 'knockout'; render();" class="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${state.selectedStage === 'knockout' ? 'bg-purple-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${!groupsComplete ? 'opacity-50' : ''}">
                            🏆 Knockout
                        </button>
                        <button onclick="state.selectedStage = 'settings'; render();" class="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${state.selectedStage === 'settings' ? 'bg-purple-500 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
                            ⚙️ Settings
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Stage Content -->
            <div class="max-w-5xl mx-auto px-4 py-6">
                ${state.selectedStage === 'groups' ? renderGroupsStageTab() : ''}
                ${state.selectedStage === 'knockout' ? renderKnockoutStageTab() : ''}
                ${state.selectedStage === 'settings' ? renderSettingsTab() : ''}
            </div>
        </div>
    `;
}

/**
 * Render Groups Stage Tab
 */
function renderGroupsStageTab() {
    if (!state.groups) return '<div class="text-center text-gray-500">No groups configured</div>';
    
    const groupColors = {
        A: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', header: 'bg-red-500' },
        B: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', header: 'bg-blue-500' },
        C: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', header: 'bg-green-500' },
        D: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', header: 'bg-amber-500' }
    };
    
    // Group filter buttons
    const groupFilter = `
        <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button onclick="state.selectedGroup = 'all'; render();" 
                class="px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${state.selectedGroup === 'all' ? 'bg-purple-500 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}">
                All Groups
            </button>
            ${['A', 'B', 'C', 'D'].map(g => `
                <button onclick="state.selectedGroup = '${g}'; render();" 
                    class="px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${state.selectedGroup === g ? groupColors[g].header + ' text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}">
                    Group ${g}
                </button>
            `).join('')}
        </div>
    `;
    
    const groupsToShow = state.selectedGroup === 'all' ? ['A', 'B', 'C', 'D'] : [state.selectedGroup];
    
    const groupCards = groupsToShow.map(groupLetter => renderGroupCard(groupLetter, groupColors[groupLetter])).join('');
    
    return groupFilter + groupCards;
}

/**
 * Render a single group card with standings and fixtures
 */
function renderGroupCard(groupLetter, colors) {
    const standings = state.calculateGroupStandings(groupLetter);
    const fixtures = state._generateGroupFixtures(state.groups[groupLetter]);
    const canEdit = state.canEdit();
    
    return `
        <div class="${colors.bg} ${colors.border} border rounded-2xl overflow-hidden mb-6">
            <div class="${colors.header} text-white px-4 py-3 font-bold text-lg flex items-center justify-between">
                <span>Group ${groupLetter}</span>
                <span class="text-sm font-normal opacity-80">Court ${groupLetter}</span>
            </div>
            
            <!-- Standings -->
            <div class="p-4 border-b ${colors.border}">
                <h4 class="font-semibold text-gray-700 mb-3">📊 Standings</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-gray-500 text-xs uppercase">
                                <th class="text-left py-2 px-2">#</th>
                                <th class="text-left py-2 px-2">Player</th>
                                <th class="text-center py-2 px-1">P</th>
                                <th class="text-center py-2 px-1">W</th>
                                <th class="text-center py-2 px-1">L</th>
                                <th class="text-right py-2 px-2">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${standings.map((player, idx) => `
                                <tr class="${idx < 4 ? 'bg-white/50' : ''} border-t border-gray-100">
                                    <td class="py-2 px-2 font-semibold ${idx < 4 ? colors.text : 'text-gray-400'}">${idx + 1}</td>
                                    <td class="py-2 px-2">
                                        <span class="inline-flex items-center gap-1">
                                            <span class="w-6 h-6 rounded-full ${getPlayerColorClass(player.playerNum)} text-white text-xs font-bold flex items-center justify-center">${player.playerNum}</span>
                                            <span class="truncate max-w-[100px]">${player.name}</span>
                                        </span>
                                    </td>
                                    <td class="text-center py-2 px-1">${player.gamesPlayed}</td>
                                    <td class="text-center py-2 px-1 text-green-600 font-medium">${player.wins}</td>
                                    <td class="text-center py-2 px-1 text-red-600">${player.losses}</td>
                                    <td class="text-right py-2 px-2 font-bold ${colors.text}">${player.totalPoints}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Fixtures -->
            <div class="p-4">
                <h4 class="font-semibold text-gray-700 mb-3">📋 Matches</h4>
                <div class="space-y-2">
                    ${fixtures.map((fixture, idx) => {
                        const score = state.getGroupScore(groupLetter, idx);
                        const hasScore = score.team1 !== null && score.team2 !== null;
                        const maxScore = state.fixedPoints ? state.totalPoints : 99;
                        
                        return `
                            <div class="bg-white rounded-xl p-3 border border-gray-100 ${hasScore ? 'opacity-75' : ''}">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="flex-1 text-right">
                                        <span class="text-sm font-medium">
                                            ${fixture.teams[0].map(p => `<span class="inline-flex items-center gap-1"><span class="w-5 h-5 rounded-full ${getPlayerColorClass(p)} text-white text-xs font-bold flex items-center justify-center">${p}</span></span>`).join(' ')}
                                        </span>
                                    </div>
                                    
                                    <div class="flex items-center gap-1 min-w-[80px] justify-center">
                                        ${canEdit ? `
                                            <input type="number" min="0" max="${maxScore}" 
                                                value="${score.team1 !== null ? score.team1 : ''}" 
                                                onchange="updateGroupScore('${groupLetter}', ${idx}, 0, this.value)"
                                                class="w-10 h-8 text-center border border-gray-200 rounded-lg font-bold text-sm" />
                                            <span class="text-gray-400">-</span>
                                            <input type="number" min="0" max="${maxScore}" 
                                                value="${score.team2 !== null ? score.team2 : ''}" 
                                                onchange="updateGroupScore('${groupLetter}', ${idx}, 1, this.value)"
                                                class="w-10 h-8 text-center border border-gray-200 rounded-lg font-bold text-sm" />
                                        ` : `
                                            <span class="font-bold text-lg">${score.team1 !== null ? score.team1 : '-'}</span>
                                            <span class="text-gray-400 mx-1">:</span>
                                            <span class="font-bold text-lg">${score.team2 !== null ? score.team2 : '-'}</span>
                                        `}
                                    </div>
                                    
                                    <div class="flex-1">
                                        <span class="text-sm font-medium">
                                            ${fixture.teams[1].map(p => `<span class="inline-flex items-center gap-1"><span class="w-5 h-5 rounded-full ${getPlayerColorClass(p)} text-white text-xs font-bold flex items-center justify-center">${p}</span></span>`).join(' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Knockout Stage Tab
 */
function renderKnockoutStageTab() {
    const groupsComplete = state.isGroupStageComplete();
    const canEdit = state.canEdit();
    
    if (!groupsComplete) {
        return `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">🔒</div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Knockout Stage Locked</h3>
                <p class="text-gray-500">Complete all group matches to unlock the knockout stage.</p>
                <p class="text-sm text-gray-400 mt-2">
                    ${state.countGroupMatchesComplete()} / ${state.getTotalGroupMatches()} group matches completed
                </p>
            </div>
        `;
    }
    
    // Generate bracket if not exists
    if (!state.knockoutBracket) {
        state.generateKnockoutBracket();
    }
    
    const bracket = state.knockoutBracket;
    if (!bracket) {
        return '<div class="text-center text-gray-500">Unable to generate knockout bracket</div>';
    }
    
    return `
        <div class="space-y-8">
            <!-- How it works -->
            <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h4 class="font-semibold text-purple-800 mb-2">🏆 Knockout Format</h4>
                <p class="text-sm text-purple-700">
                    Players pair up based on their group position: 1st place players from Groups A+B vs C+D, 
                    2nd place players pair similarly, and so on. Winners advance to semifinals, then finals.
                </p>
            </div>
            
            <!-- Quarterfinals -->
            <div>
                <h3 class="text-lg font-bold text-gray-800 mb-4">🎯 Quarterfinals</h3>
                <div class="grid gap-4 md:grid-cols-2">
                    ${bracket.quarterfinals.map(qf => renderKnockoutMatch(qf, canEdit)).join('')}
                </div>
            </div>
            
            <!-- Semifinals -->
            ${bracket.semifinals.length > 0 ? `
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4">⚔️ Semifinals</h3>
                    <div class="grid gap-4 md:grid-cols-2">
                        ${bracket.semifinals.map(sf => renderKnockoutMatch(sf, canEdit)).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Final -->
            ${bracket.final ? `
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4">👑 Final</h3>
                    <div class="max-w-md mx-auto">
                        ${renderKnockoutMatch(bracket.final, canEdit)}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render a knockout match card
 */
function renderKnockoutMatch(match, canEdit) {
    const score = state.getKnockoutScore(match.key);
    const hasScore = score.team1 !== null && score.team2 !== null;
    const team1Ready = match.team1 && match.team1.length === 2;
    const team2Ready = match.team2 && match.team2.length === 2;
    const matchReady = team1Ready && team2Ready;
    
    return `
        <div class="bg-white rounded-xl border ${hasScore ? 'border-green-200 bg-green-50' : 'border-gray-200'} overflow-hidden">
            <div class="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <span class="text-xs font-semibold text-gray-500 uppercase">${match.label}</span>
            </div>
            <div class="p-4">
                ${matchReady ? `
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                ${match.team1.map(p => `
                                    <span class="inline-flex items-center gap-1">
                                        <span class="w-6 h-6 rounded-full ${getPlayerColorClass(p)} text-white text-xs font-bold flex items-center justify-center">${p}</span>
                                        <span class="text-sm truncate max-w-[60px]">${getPlayerName(p)}</span>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-1">
                            ${canEdit ? `
                                <input type="number" min="0" max="99" 
                                    value="${score.team1 !== null ? score.team1 : ''}" 
                                    onchange="updateKnockoutScore('${match.key}', 0, this.value)"
                                    class="w-12 h-10 text-center border border-gray-200 rounded-lg font-bold" />
                                <span class="text-gray-400 text-lg">-</span>
                                <input type="number" min="0" max="99" 
                                    value="${score.team2 !== null ? score.team2 : ''}" 
                                    onchange="updateKnockoutScore('${match.key}', 1, this.value)"
                                    class="w-12 h-10 text-center border border-gray-200 rounded-lg font-bold" />
                            ` : `
                                <span class="text-2xl font-bold">${score.team1 !== null ? score.team1 : '-'}</span>
                                <span class="text-gray-400 text-xl mx-2">:</span>
                                <span class="text-2xl font-bold">${score.team2 !== null ? score.team2 : '-'}</span>
                            `}
                        </div>
                        
                        <div class="flex-1 text-right">
                            <div class="flex items-center justify-end gap-2">
                                ${match.team2.map(p => `
                                    <span class="inline-flex items-center gap-1">
                                        <span class="text-sm truncate max-w-[60px]">${getPlayerName(p)}</span>
                                        <span class="w-6 h-6 rounded-full ${getPlayerColorClass(p)} text-white text-xs font-bold flex items-center justify-center">${p}</span>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="text-center py-4 text-gray-400">
                        <span class="text-2xl">⏳</span>
                        <p class="text-sm mt-2">Waiting for previous matches</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

/**
 * Update group match score (called from input onchange)
 */
function updateGroupScore(groupLetter, fixtureIndex, team, value) {
    const score = state.getGroupScore(groupLetter, fixtureIndex);
    let newScore = parseInt(value);
    
    // Handle empty/invalid input
    if (isNaN(newScore) || value === '') {
        if (team === 0) {
            state.setGroupScore(groupLetter, fixtureIndex, null, score.team2);
        } else {
            state.setGroupScore(groupLetter, fixtureIndex, score.team1, null);
        }
        render();
        return;
    }
    
    // Cap at max if fixed points
    const maxScore = state.fixedPoints ? state.totalPoints : 99;
    if (newScore > maxScore) newScore = maxScore;
    if (newScore < 0) newScore = 0;
    
    // Auto-calculate other team's score if fixed points enabled
    if (state.fixedPoints) {
        const otherScore = state.totalPoints - newScore;
        if (team === 0) {
            state.setGroupScore(groupLetter, fixtureIndex, newScore, otherScore);
        } else {
            state.setGroupScore(groupLetter, fixtureIndex, otherScore, newScore);
        }
    } else {
        if (team === 0) {
            state.setGroupScore(groupLetter, fixtureIndex, newScore, score.team2);
        } else {
            state.setGroupScore(groupLetter, fixtureIndex, score.team1, newScore);
        }
    }
    
    render();
}

/**
 * Update knockout match score (called from input onchange)
 */
function updateKnockoutScore(matchKey, team, value) {
    const score = state.getKnockoutScore(matchKey);
    let newScore = parseInt(value);
    
    // Handle empty/invalid input
    if (isNaN(newScore) || value === '') {
        if (team === 0) {
            state.setKnockoutScore(matchKey, null, score.team2);
        } else {
            state.setKnockoutScore(matchKey, score.team1, null);
        }
        render();
        return;
    }
    
    // Cap at max if fixed points
    const maxScore = state.fixedPoints ? state.totalPoints : 99;
    if (newScore > maxScore) newScore = maxScore;
    if (newScore < 0) newScore = 0;
    
    // Auto-calculate other team's score if fixed points enabled
    if (state.fixedPoints) {
        const otherScore = state.totalPoints - newScore;
        if (team === 0) {
            state.setKnockoutScore(matchKey, newScore, otherScore);
        } else {
            state.setKnockoutScore(matchKey, otherScore, newScore);
        }
    } else {
        if (team === 0) {
            state.setKnockoutScore(matchKey, newScore, score.team2);
        } else {
            state.setKnockoutScore(matchKey, score.team1, newScore);
        }
    }
    
    render();
}
