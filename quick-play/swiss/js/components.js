// ===== SWISS SYSTEM UI COMPONENTS =====
// Forked from Round Robin components.js
// Swiss System = round-by-round generation, Buchholz tiebreaker, amber theme.

// ===== BADGE COMPONENTS =====

function TeamBadge(team, size = 'full') {
    if (!team) return '<div class="text-gray-400 text-sm">TBD</div>';

    const colourClass = getTeamColourClass(team.id);

    if (size === 'mini') {
        return `
            <div class="team-mini-badge ${colourClass}" title="${team.name}">
                ${team.name.substring(0, 2).toUpperCase()}
            </div>
        `;
    }

    if (size === 'compact') {
        return `
            <div class="team-badge-compact ${colourClass}">
                <span class="team-name">${team.name}</span>
                <span class="team-players">${team.player1Name} & ${team.player2Name}</span>
            </div>
        `;
    }

    // Full size
    return `
        <div class="team-badge ${colourClass}">
            <span class="team-badge-name">${team.name}</span>
            <span class="team-badge-players">${team.player1Name} & ${team.player2Name}</span>
            <span class="team-badge-rating">${team.combinedRating.toFixed(1)} combined</span>
        </div>
    `;
}

// ===== MATCH CARD COMPONENT =====

function renderMatchCard(match, roundIndex, matchIndex, canEditMatch) {
    const team1 = state.getTeamById(match.team1Id);
    const team2 = state.getTeamById(match.team2Id);
    const score = state.getScore(match.team1Id, match.team2Id);
    const isComplete = score.team1Score !== null && score.team2Score !== null;
    const maxScore = state.maxScore;

    let team1Winner = false;
    let team2Winner = false;
    if (isComplete) {
        team1Winner = score.team1Score > score.team2Score;
        team2Winner = score.team2Score > score.team1Score;
    }

    const inputId1 = `score-${match.team1Id}-${match.team2Id}-1`;
    const inputId2 = `score-${match.team1Id}-${match.team2Id}-2`;

    // Court label
    const courtNames = state.courtNames || [];
    const courtLabel = courtNames[matchIndex] ? courtNames[matchIndex] : '';

    return `
        <div class="team-match-card ${isComplete ? 'complete' : ''}" data-team1="${match.team1Id}" data-team2="${match.team2Id}">
            <div class="match-header">
                <div class="match-info">
                    <span class="match-round">Round ${roundIndex + 1}</span>
                    <span class="match-number">Match ${matchIndex + 1}</span>
                    ${courtLabel ? `<span class="match-court text-xs text-gray-400 ml-2">${courtLabel}</span>` : ''}
                </div>
                ${isComplete && canEditMatch ? `
                    <button class="clear-score-btn-small" onclick="clearScore(${match.team1Id}, ${match.team2Id})" title="Clear score">&times;</button>
                ` : ''}
            </div>
            <div class="match-body">
                <div class="teams-row">
                    <div class="team-side ${team1Winner ? 'winner' : ''}">
                        ${TeamBadge(team1, 'compact')}
                        <span class="rating-label">${team1?.combinedRating?.toFixed(1) || '-'}</span>
                    </div>

                    <div class="score-section">
                        <div class="score-inputs">
                            ${canEditMatch ? `
                                <input type="number"
                                    id="${inputId1}"
                                    class="score-input"
                                    value="${score.team1Score !== null ? score.team1Score : ''}"
                                    placeholder="-"
                                    min="0"
                                    max="${maxScore}"
                                    oninput="autoFillScore('${inputId1}', '${inputId2}', ${maxScore})"
                                    onchange="handleScore(${match.team1Id}, ${match.team2Id}, this.value, document.getElementById('${inputId2}').value)"
                                />
                                <span class="score-divider">:</span>
                                <input type="number"
                                    id="${inputId2}"
                                    class="score-input"
                                    value="${score.team2Score !== null ? score.team2Score : ''}"
                                    placeholder="-"
                                    min="0"
                                    max="${maxScore}"
                                    oninput="autoFillScore('${inputId2}', '${inputId1}', ${maxScore})"
                                    onchange="handleScore(${match.team1Id}, ${match.team2Id}, document.getElementById('${inputId1}').value, this.value)"
                                />
                            ` : `
                                <span class="score-display">${score.team1Score !== null ? score.team1Score : '-'}</span>
                                <span class="score-divider">:</span>
                                <span class="score-display">${score.team2Score !== null ? score.team2Score : '-'}</span>
                            `}
                        </div>
                    </div>

                    <div class="team-side ${team2Winner ? 'winner' : ''}">
                        ${TeamBadge(team2, 'compact')}
                        <span class="rating-label">${team2?.combinedRating?.toFixed(1) || '-'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== TAB COMPONENTS =====

function renderRoundsTab() {
    const rounds = state.rounds || [];
    const teams = state.teams || [];
    const canEdit = state.canEdit();

    if (teams.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">&#9823;</div>
                <p class="text-gray-500 mb-2">No teams added yet</p>
                <p class="text-sm text-gray-400">Add teams in Settings to get started</p>
            </div>
        `;
    }

    if (rounds.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">&#9823;</div>
                <p class="text-gray-500 mb-2">No rounds generated</p>
                <p class="text-sm text-gray-400 mb-6">Generate the first round to start</p>
                ${canEdit ? `
                    <button onclick="generateNextRound()" class="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                        Generate Round 1
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Current display round
    const displayRound = state.displayRound || 0;
    const round = rounds[displayRound];
    const totalRounds = state.totalRounds || rounds.length;

    // Round completion stats
    let completedMatches = 0;
    let totalMatches = round.matches.length;
    round.matches.forEach(match => {
        const score = state.getScore(match.team1Id, match.team2Id);
        if (score.team1Score !== null && score.team2Score !== null) completedMatches++;
    });

    const isRoundComplete = completedMatches === totalMatches;
    const isLastGeneratedRound = displayRound === rounds.length - 1;
    const canGenerateNext = isRoundComplete && isLastGeneratedRound && rounds.length < totalRounds && canEdit;
    const isTournamentComplete = rounds.length >= totalRounds && isRoundComplete;

    // Overall progress
    let totalAllMatches = 0;
    let completedAllMatches = 0;
    rounds.forEach(r => {
        r.matches.forEach(m => {
            totalAllMatches++;
            const s = state.getScore(m.team1Id, m.team2Id);
            if (s.team1Score !== null && s.team2Score !== null) completedAllMatches++;
        });
    });
    const overallProgress = totalAllMatches > 0 ? Math.round((completedAllMatches / totalAllMatches) * 100) : 0;

    // Bye info for this round
    const byeTeam = round.bye ? state.getTeamById(round.bye) : null;

    return `
        <!-- Overall Progress -->
        <div class="mb-4">
            <div class="flex items-center justify-between text-sm text-gray-500 mb-1">
                <span>Round ${rounds.length} of ${totalRounds}</span>
                <span>${completedAllMatches}/${totalAllMatches} matches played</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-gradient-to-r from-amber-500 to-yellow-500 h-2.5 rounded-full transition-all duration-500" style="width: ${overallProgress}%"></div>
            </div>
        </div>

        <!-- Round Navigator -->
        <div class="flex items-center justify-center gap-4 mb-6">
            <button onclick="navigateRound(-1)" class="p-2 rounded-lg ${displayRound > 0 ? 'hover:bg-amber-50 text-amber-600' : 'text-gray-300 cursor-not-allowed'}" ${displayRound === 0 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div class="flex gap-1">
                ${rounds.map((_, idx) => `
                    <button onclick="goToRound(${idx})" class="w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${idx === displayRound ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-amber-100'}">
                        ${idx + 1}
                    </button>
                `).join('')}
            </div>

            <button onclick="navigateRound(1)" class="p-2 rounded-lg ${displayRound < rounds.length - 1 ? 'hover:bg-amber-50 text-amber-600' : 'text-gray-300 cursor-not-allowed'}" ${displayRound >= rounds.length - 1 ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>

        <!-- Round Header -->
        <h2 class="text-xl font-bold text-gray-800 mb-4">Round ${displayRound + 1} <span class="text-sm font-normal text-gray-400">${completedMatches}/${totalMatches} complete</span></h2>

        <!-- Bye Notice -->
        ${byeTeam ? `
            <div class="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span class="text-amber-600 font-semibold text-sm">BYE</span>
                <div class="flex items-center gap-2">
                    ${TeamBadge(byeTeam, 'mini')}
                    <span class="text-sm text-amber-800 font-medium">${byeTeam.name}</span>
                    <span class="text-xs text-amber-600">receives ${CONFIG.BYE_POINTS} pts</span>
                </div>
            </div>
        ` : ''}

        <!-- Matches -->
        <div class="grid gap-4 md:grid-cols-2">
            ${round.matches.map((match, matchIdx) => renderMatchCard(match, displayRound, matchIdx, canEdit && isLastGeneratedRound)).join('')}
        </div>

        <!-- Action Buttons -->
        ${canGenerateNext ? `
            <div class="mt-8 text-center">
                <button onclick="generateNextRound()" class="px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all">
                    Generate Round ${rounds.length + 1}
                </button>
                <p class="text-xs text-gray-400 mt-2">Pairings based on current standings</p>
            </div>
        ` : ''}

        ${isTournamentComplete ? `
            <div class="mt-8 text-center bg-amber-50 rounded-2xl p-6 border-2 border-amber-200">
                <div class="text-4xl mb-3">&#127942;</div>
                <h3 class="text-xl font-bold text-amber-800 mb-2">Tournament Complete!</h3>
                <p class="text-amber-600">All ${totalRounds} rounds have been played.</p>
                <button onclick="setTab('standings')" class="mt-4 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                    View Final Standings
                </button>
            </div>
        ` : ''}
    `;
}

function renderStandingsTab() {
    const standings = state.getStandings();

    if (!standings || standings.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">&#128202;</div>
                <p class="text-gray-500 mb-2">No standings yet</p>
                <p class="text-sm text-gray-400">Add teams and play matches to see standings</p>
            </div>
        `;
    }

    const medals = ['&#129351;', '&#129352;', '&#129353;'];

    return `
        <div class="group-card">
            <div class="group-header bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-t-2xl px-4 py-3 flex items-center gap-2">
                <span>&#128202;</span>
                <span class="font-semibold">Standings</span>
            </div>
            <div class="p-4">
                <div class="overflow-x-auto">
                    <table class="standings-table">
                        <thead>
                            <tr>
                                <th class="text-center">#</th>
                                <th>Team</th>
                                <th class="text-center">P</th>
                                <th class="text-center">W</th>
                                <th class="text-center">D</th>
                                <th class="text-center">L</th>
                                <th class="text-center">GF</th>
                                <th class="text-center">GA</th>
                                <th class="text-center">GD</th>
                                <th class="text-center">Pts</th>
                                <th class="text-center">Buch</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${standings.map((row, idx) => {
                                const isTopThree = idx < 3;
                                const colourClass = getTeamColourClass(row.team.id);
                                const medal = idx < 3 ? medals[idx] : '';
                                return `
                                    <tr class="${isTopThree ? 'bg-amber-50' : ''}">
                                        <td class="position text-center font-semibold ${isTopThree ? 'text-amber-700' : ''}">
                                            ${medal ? `<span class="mr-1">${medal}</span>` : ''}${idx + 1}
                                        </td>
                                        <td>
                                            <div class="team-cell">
                                                <div class="team-mini-badge ${colourClass}">${row.team.name.substring(0, 2).toUpperCase()}</div>
                                                <div class="team-info">
                                                    <div class="team-name">${row.team.name}</div>
                                                    <div class="team-players-small">${row.team.player1Name} & ${row.team.player2Name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="stat">${row.played}</td>
                                        <td class="stat">${row.won}</td>
                                        <td class="stat">${row.drawn}</td>
                                        <td class="stat">${row.lost}</td>
                                        <td class="stat">${row.gamesFor}</td>
                                        <td class="stat">${row.gamesAgainst}</td>
                                        <td class="stat">${row.gamesDiff > 0 ? '+' : ''}${row.gamesDiff}</td>
                                        <td class="points font-bold ${isTopThree ? 'text-amber-700' : ''}">${row.points}</td>
                                        <td class="stat text-center ${isTopThree ? 'text-amber-600 font-semibold' : ''}">${row.buchholz}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Buchholz Explanation -->
        <div class="mt-4 bg-gray-50 rounded-xl p-4">
            <p class="text-xs text-gray-500">
                <span class="font-semibold text-gray-600">Buch</span> = Buchholz score (sum of opponents' points).
                Used as tiebreaker: higher Buchholz means tougher opponents faced.
                Sort order: Points &gt; Buchholz &gt; Game Difference &gt; Games For.
            </p>
        </div>
    `;
}

function renderSettingsTab() {
    const canEditSettings = state.canEdit();

    if (!canEditSettings) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4">&#128274;</div>
                <p class="text-gray-500 mb-4">Organiser access required to edit settings</p>
                <button onclick="showOrganiserLoginModal()" class="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                    Login as Organiser
                </button>
            </div>
        `;
    }

    const subTab = state.settingsSubTab || 'teams';

    return `
        <!-- Settings Subtabs -->
        <div class="flex flex-wrap gap-2 mb-6">
            <button onclick="setSettingsSubTab('teams')" class="settings-subtab ${subTab === 'teams' ? 'active' : 'inactive'}">
                &#128101; Teams
            </button>
            <button onclick="setSettingsSubTab('courts')" class="settings-subtab ${subTab === 'courts' ? 'active' : 'inactive'}">
                &#127967; Courts
            </button>
            <button onclick="setSettingsSubTab('scoring')" class="settings-subtab ${subTab === 'scoring' ? 'active' : 'inactive'}">
                &#9881; Scoring
            </button>
            <button onclick="setSettingsSubTab('share')" class="settings-subtab ${subTab === 'share' ? 'active' : 'inactive'}">
                &#128279; Share
            </button>
            <button onclick="setSettingsSubTab('danger')" class="settings-subtab ${subTab === 'danger' ? 'active' : 'inactive'}">
                &#9888; Danger Zone
            </button>
        </div>

        <!-- Settings Content -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            ${subTab === 'teams' ? renderTeamsSettings() : ''}
            ${subTab === 'courts' ? renderCourtsSettings() : ''}
            ${subTab === 'scoring' ? renderScoringSettings() : ''}
            ${subTab === 'share' ? renderShareSettings() : ''}
            ${subTab === 'danger' ? renderDangerSettings() : ''}
        </div>
    `;
}

// ===== SETTINGS SUB-SECTIONS =====

function renderTeamsSettings() {
    const editingTeamId = state.editingTeamId || null;

    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Manage Teams</h3>

        <!-- Add Team Form -->
        <div class="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 class="font-semibold text-gray-700 mb-3">Add New Team</h4>
            <div class="grid gap-4 md:grid-cols-2">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 1 Name</label>
                    <input type="text" id="new-player1-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none" placeholder="e.g. John" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 1 Rating (0-5)</label>
                    <input type="number" id="new-player1-rating" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none" placeholder="3.5" min="0" max="5" step="0.1" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 2 Name</label>
                    <input type="text" id="new-player2-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none" placeholder="e.g. Jane" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 2 Rating (0-5)</label>
                    <input type="number" id="new-player2-rating" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none" placeholder="3.0" min="0" max="5" step="0.1" />
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-600 mb-1">Team Name (optional)</label>
                <input type="text" id="new-team-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none" placeholder="Auto-generated if empty" />
            </div>
            <button onclick="addNewTeam()" class="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors">
                + Add Team
            </button>
        </div>

        <!-- Team List -->
        <h4 class="font-semibold text-gray-700 mb-3">Current Teams (${state.teams.length})</h4>
        ${state.teams.length === 0 ? `
            <p class="text-gray-400 text-center py-8">No teams added yet</p>
        ` : `
            <div class="space-y-3">
                ${state.teams.map(team => {
                    const colourClass = getTeamColourClass(team.id);
                    const isEditing = editingTeamId === team.id;

                    if (isEditing) {
                        return `
                            <div class="p-4 bg-amber-50 rounded-xl border-2 border-amber-300">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="team-mini-badge ${colourClass}">${team.id}</div>
                                    <span class="font-semibold text-amber-700">Editing Team</span>
                                </div>
                                <div class="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Player 1</label>
                                        <input type="text" id="edit-p1-name-${team.id}" value="${team.player1Name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                                        <input type="number" id="edit-p1-rating-${team.id}" value="${team.player1Rating}" min="0" max="5" step="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Player 2</label>
                                        <input type="text" id="edit-p2-name-${team.id}" value="${team.player2Name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                                        <input type="number" id="edit-p2-rating-${team.id}" value="${team.player2Rating}" min="0" max="5" step="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" />
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Team Name</label>
                                    <input type="text" id="edit-team-name-${team.id}" value="${team.name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" />
                                </div>
                                <div class="mt-3 flex gap-2">
                                    <button onclick="saveTeamEdit(${team.id})" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors">
                                        Save
                                    </button>
                                    <button onclick="cancelTeamEdit()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-sm transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        `;
                    }

                    return `
                        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                            <div class="team-mini-badge ${colourClass}">${team.id}</div>
                            <div class="flex-1 min-w-0">
                                <div class="font-semibold text-gray-800">${team.name}</div>
                                <div class="text-sm text-gray-500">${team.player1Name} (${team.player1Rating}) & ${team.player2Name} (${team.player2Rating})</div>
                                <div class="text-xs text-gray-400">Combined: ${team.combinedRating.toFixed(1)}</div>
                            </div>
                            <div class="flex gap-1">
                                <button onclick="startTeamEdit(${team.id})" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit team">
                                    &#9999;
                                </button>
                                <button onclick="removeTeam(${team.id})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove team">
                                    &#128465;
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `}
    `;
}

function renderCourtsSettings() {
    const courtNames = state.courtNames || [];

    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Court Names</h3>
        <p class="text-sm text-gray-600 mb-6">
            Assign court names to matches. These will be displayed on the rounds page.
        </p>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            ${[0, 1, 2, 3].map(i => `
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Court ${i + 1}</label>
                    <input
                        type="text"
                        id="court-name-${i}"
                        value="${courtNames[i] || `Court ${i + 1}`}"
                        onchange="updateCourtName(${i}, this.value)"
                        class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none"
                        placeholder="Court ${i + 1}"
                    />
                </div>
            `).join('')}
        </div>
    `;
}

function renderScoringSettings() {
    const currentMaxScore = state.maxScore || 16;
    const scoreOptions = [16, 21, 24, 32];

    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Scoring Settings</h3>

        <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">Max Score Per Match</label>
            <div class="flex flex-wrap gap-3">
                ${scoreOptions.map(val => `
                    <button onclick="updateMaxScore(${val})"
                        class="px-5 py-2.5 rounded-xl font-medium text-sm transition-colors border-2
                            ${currentMaxScore === val
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300'}">
                        ${val} points
                    </button>
                `).join('')}
            </div>
            <p class="text-xs text-gray-400 mt-2">When one score is entered, the other auto-fills to make both scores total ${currentMaxScore}.</p>
        </div>

        <!-- Total Rounds Setting -->
        <div class="mt-6">
            <label class="block text-sm font-medium text-gray-600 mb-2">Total Rounds</label>
            <div class="flex items-center gap-3">
                <input
                    type="number"
                    id="total-rounds-input"
                    value="${state.totalRounds || calculateSuggestedRounds(state.teams.length || 4)}"
                    min="${CONFIG.MIN_ROUNDS}"
                    max="${CONFIG.MAX_ROUNDS}"
                    onchange="updateTotalRounds(parseInt(this.value))"
                    class="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none text-center font-semibold"
                />
                <span class="text-sm text-gray-500">rounds (suggested: ${calculateSuggestedRounds(state.teams.length || 4)} for ${state.teams.length || 0} teams)</span>
            </div>
            <p class="text-xs text-gray-400 mt-2">Standard Swiss formula: ceil(log2(teams)). Range: ${CONFIG.MIN_ROUNDS}-${CONFIG.MAX_ROUNDS}.</p>
        </div>
    `;
}

function renderShareSettings() {
    const tournamentId = state.tournamentId || '';
    const tournamentCode = tournamentId.toUpperCase();
    const playerLink = Router.getPlayerLink(tournamentId);
    const organiserLink = state.organiserKey ? Router.getOrganiserLink(tournamentId, state.organiserKey) : '';

    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Share Tournament</h3>

        <!-- Tournament Code -->
        <div class="bg-amber-50 rounded-xl p-4 mb-6">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-amber-800">Tournament Code</span>
                <button onclick="copyToClipboard('${tournamentCode}'); showToast('Code copied!')" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors">
                    Copy Code
                </button>
            </div>
            <div class="text-2xl font-mono font-bold text-amber-700 text-center py-2">${tournamentCode}</div>
        </div>

        <!-- Player Link -->
        <div class="bg-gray-50 rounded-xl p-4 mb-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-gray-700">&#128101; Player Link</span>
                <button onclick="copyToClipboard('${playerLink}'); showToast('Link copied!')" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors">
                    Copy
                </button>
            </div>
            <div class="text-xs text-gray-600 font-mono break-all bg-white p-2 rounded-lg">${playerLink}</div>
        </div>

        ${organiserLink ? `
            <!-- Organiser Link -->
            <div class="bg-amber-50 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-amber-800">&#128273; Organiser Link</span>
                    <button onclick="copyToClipboard('${organiserLink}'); showToast('Organiser link copied!')" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors">
                        Copy
                    </button>
                </div>
                <div class="text-xs text-amber-700 font-mono break-all bg-white p-2 rounded-lg">${organiserLink}</div>
                <p class="text-xs text-amber-600 mt-2">Keep this private - it grants edit access.</p>
            </div>
        ` : ''}
    `;
}

function renderDangerSettings() {
    return `
        <h3 class="text-lg font-bold text-red-600 mb-4">Danger Zone</h3>

        <div class="space-y-4">
            <div class="bg-red-50 rounded-xl p-4">
                <h4 class="font-semibold text-red-800 mb-2">Reset All Scores</h4>
                <p class="text-sm text-red-600 mb-3">Clear all match scores. Teams and rounds will be kept.</p>
                <button onclick="confirmResetScores()" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
                    Reset Scores
                </button>
            </div>

            <div class="bg-red-50 rounded-xl p-4">
                <h4 class="font-semibold text-red-800 mb-2">Reset All Rounds</h4>
                <p class="text-sm text-red-600 mb-3">Clear all rounds and scores. Teams will be kept.</p>
                <button onclick="confirmResetRounds()" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
                    Reset Rounds
                </button>
            </div>

            <div class="bg-gray-50 rounded-xl p-4">
                <h4 class="font-semibold text-gray-800 mb-2">Export Tournament Data</h4>
                <p class="text-sm text-gray-600 mb-3">Download all tournament data as JSON.</p>
                <button onclick="exportTournamentData()" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    &#128229; Export Data
                </button>
            </div>
        </div>
    `;
}

// ===== MAIN RENDER FUNCTION =====

function renderSwiss() {
    if (!state || !state.isInitialized) {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="animate-spin w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full mx-auto mb-4"></div>
                    <p class="text-gray-500">Loading tournament...</p>
                </div>
            </div>
        `;
        return;
    }

    const currentTab = state.currentTab || 'rounds';

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen">
            <!-- Shared Header -->
            ${renderTournamentHeader({
                format: 'swiss',
                tournamentId: state.tournamentId,
                tournamentName: state.tournamentName || 'Swiss Tournament',
                isOrganiser: state.isOrganiser,
                subtitle: (state.teams?.length || 0) + ' teams \u2022 ' + (state.rounds?.length || 0) + '/' + (state.totalRounds || '?') + ' rounds'
            })}

            <!-- Tabs (amber themed) -->
            <div class="bg-white border-b border-gray-100">
                <div class="max-w-5xl mx-auto px-4">
                    <div class="flex gap-1 overflow-x-auto py-3" style="-webkit-overflow-scrolling: touch;">
                        <button onclick="setTab('rounds')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'rounds' ? 'tab-active' : 'tab-inactive'}">
                            &#9823; Rounds
                        </button>
                        <button onclick="setTab('standings')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'standings' ? 'tab-active' : 'tab-inactive'}">
                            &#128202; Standings
                        </button>
                        ${state.canEdit() ? `
                            <button onclick="setTab('settings')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'settings' ? 'tab-active' : 'tab-inactive'}">
                                &#9881; Settings
                            </button>
                        ` : `
                            <button onclick="showOrganiserLoginModal()" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all bg-amber-100 text-amber-700 hover:bg-amber-200">
                                &#128273; Organiser Login
                            </button>
                        `}
                    </div>
                </div>
            </div>

            <!-- Tab Content -->
            <div class="max-w-5xl mx-auto px-4 py-6">
                ${currentTab === 'rounds' ? renderRoundsTab() : ''}
                ${currentTab === 'standings' ? renderStandingsTab() : ''}
                ${currentTab === 'settings' ? renderSettingsTab() : ''}
            </div>
        </div>
    `;
}

// ===== COMPATIBILITY OBJECT =====
// Called by state.js renderSwiss() / render dispatch

const SwissApp = { render: renderSwiss };

console.log('Swiss System Components loaded');
