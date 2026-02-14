// ===== ROUND ROBIN UI COMPONENTS =====
// Simplified fork of Team League components.js
// Round Robin = single league table, no groups, no knockout bracket.

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

function renderFixturesTab() {
    const fixtures = state.fixtures || [];
    const teams = state.teams || [];
    const canEditMatch = state.canEdit();

    if (teams.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">👥</div>
                <p class="text-gray-500 mb-2">No teams added yet</p>
                <p class="text-sm text-gray-400">Add teams in Settings to get started</p>
            </div>
        `;
    }

    if (fixtures.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">📋</div>
                <p class="text-gray-500 mb-2">No fixtures generated</p>
                <p class="text-sm text-gray-400 mb-6">Generate fixtures to start playing</p>
                ${canEditMatch ? `
                    <button onclick="generateFixtures()" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors">
                        Generate Fixtures
                    </button>
                ` : ''}
            </div>
        `;
    }

    // Calculate completion stats
    let completedMatches = 0;
    let totalMatches = 0;
    fixtures.forEach(round => {
        round.matches.forEach(match => {
            totalMatches++;
            const score = state.getScore(match.team1Id, match.team2Id);
            if (score.team1Score !== null && score.team2Score !== null) completedMatches++;
        });
    });

    const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

    return `
        <div class="mb-4 flex items-center justify-between flex-wrap gap-3">
            <h2 class="text-xl font-bold text-gray-800">All Fixtures</h2>
            <span class="text-sm text-gray-500">${completedMatches}/${totalMatches} matches complete</span>
        </div>

        <!-- Progress Bar -->
        <div class="mb-6">
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-gradient-to-r from-emerald-600 to-green-600 h-2.5 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>
            <p class="text-xs text-gray-400 mt-1 text-right">${progressPercent}% complete</p>
        </div>

        <!-- Rounds -->
        <div class="space-y-6">
            ${fixtures.map((round, roundIdx) => `
                <div>
                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Round ${round.round}</h3>
                    <div class="grid gap-4 md:grid-cols-2">
                        ${round.matches.map((match, matchIdx) =>
                            renderMatchCard(match, roundIdx, matchIdx, canEditMatch)
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Bottom Controls (organiser only) -->
        ${canEditMatch ? `
            <div class="mt-8 flex flex-wrap gap-4 justify-center">
                <button onclick="generateFixtures()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors">
                    🔄 Regenerate
                </button>
                <button onclick="shuffleFixtureOrder()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors">
                    🎲 Shuffle
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
                <div class="text-5xl mb-4 opacity-50">📊</div>
                <p class="text-gray-500 mb-2">No standings yet</p>
                <p class="text-sm text-gray-400">Add teams and play matches to see standings</p>
            </div>
        `;
    }

    const medals = ['🥇', '🥈', '🥉'];

    return `
        <div class="group-card">
            <div class="group-header bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-2xl px-4 py-3 flex items-center gap-2">
                <span>📊</span>
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
                            </tr>
                        </thead>
                        <tbody>
                            ${standings.map((row, idx) => {
                                const isTopThree = idx < 3;
                                const colourClass = getTeamColourClass(row.team.id);
                                const medal = idx < 3 ? medals[idx] : '';
                                return `
                                    <tr class="${isTopThree ? 'bg-emerald-50' : ''}">
                                        <td class="position text-center font-semibold ${isTopThree ? 'text-emerald-700' : ''}">
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
                                        <td class="points font-bold ${isTopThree ? 'text-emerald-700' : ''}">${row.points}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderSettingsTab() {
    const canEditSettings = state.canEdit();

    if (!canEditSettings) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4">🔒</div>
                <p class="text-gray-500 mb-4">Organiser access required to edit settings</p>
                <button onclick="showOrganiserLoginModal()" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors">
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
                👥 Teams
            </button>
            <button onclick="setSettingsSubTab('courts')" class="settings-subtab ${subTab === 'courts' ? 'active' : 'inactive'}">
                🏟️ Courts
            </button>
            <button onclick="setSettingsSubTab('scoring')" class="settings-subtab ${subTab === 'scoring' ? 'active' : 'inactive'}">
                ⚙️ Scoring
            </button>
            <button onclick="setSettingsSubTab('share')" class="settings-subtab ${subTab === 'share' ? 'active' : 'inactive'}">
                🔗 Share
            </button>
            <button onclick="setSettingsSubTab('danger')" class="settings-subtab ${subTab === 'danger' ? 'active' : 'inactive'}">
                ⚠️ Danger Zone
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
                    <input type="text" id="new-player1-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="e.g. John" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 1 Rating (0-5)</label>
                    <input type="number" id="new-player1-rating" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="3.5" min="0" max="5" step="0.1" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 2 Name</label>
                    <input type="text" id="new-player2-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="e.g. Jane" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 2 Rating (0-5)</label>
                    <input type="number" id="new-player2-rating" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="3.0" min="0" max="5" step="0.1" />
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-600 mb-1">Team Name (optional)</label>
                <input type="text" id="new-team-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="Auto-generated if empty" />
            </div>
            <button onclick="addNewTeam()" class="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors">
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
                            <div class="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-300">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="team-mini-badge ${colourClass}">${team.id}</div>
                                    <span class="font-semibold text-emerald-700">Editing Team</span>
                                </div>
                                <div class="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Player 1</label>
                                        <input type="text" id="edit-p1-name-${team.id}" value="${team.player1Name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                                        <input type="number" id="edit-p1-rating-${team.id}" value="${team.player1Rating}" min="0" max="5" step="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Player 2</label>
                                        <input type="text" id="edit-p2-name-${team.id}" value="${team.player2Name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                                        <input type="number" id="edit-p2-rating-${team.id}" value="${team.player2Rating}" min="0" max="5" step="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:outline-none" />
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Team Name</label>
                                    <input type="text" id="edit-team-name-${team.id}" value="${team.name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:outline-none" />
                                </div>
                                <div class="mt-3 flex gap-2">
                                    <button onclick="saveTeamEdit(${team.id})" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-colors">
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
                                    ✏️
                                </button>
                                <button onclick="removeTeam(${team.id})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove team">
                                    🗑️
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
            Assign court names to matches. These will be displayed on the fixtures page.
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
                        class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
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
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300'}">
                        ${val} points
                    </button>
                `).join('')}
            </div>
            <p class="text-xs text-gray-400 mt-2">When one score is entered, the other auto-fills to make both scores total ${currentMaxScore}.</p>
        </div>
    `;
}

function renderShareSettings() {
    const tournamentId = state.tournamentId || '';
    const tournamentCode = tournamentId.toUpperCase();
    const currentUrl = window.location.href.split('?')[0];
    const playerLink = currentUrl + '?id=' + tournamentId;
    const organiserLink = state.organiserKey ? (currentUrl + '?id=' + tournamentId + '&key=' + state.organiserKey) : '';

    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Share Tournament</h3>

        <!-- Tournament Code -->
        <div class="bg-emerald-50 rounded-xl p-4 mb-6">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-emerald-800">Tournament Code</span>
                <button onclick="copyToClipboard('${tournamentCode}'); showToast('Code copied!')" class="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium transition-colors">
                    Copy Code
                </button>
            </div>
            <div class="text-2xl font-mono font-bold text-emerald-700 text-center py-2">${tournamentCode}</div>
        </div>

        <!-- Player Link -->
        <div class="bg-gray-50 rounded-xl p-4 mb-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-gray-700">👥 Player Link</span>
                <button onclick="copyToClipboard('${playerLink}'); showToast('Link copied!')" class="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium transition-colors">
                    Copy
                </button>
            </div>
            <div class="text-xs text-gray-600 font-mono break-all bg-white p-2 rounded-lg">${playerLink}</div>
        </div>

        ${organiserLink ? `
            <!-- Organiser Link -->
            <div class="bg-amber-50 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-amber-800">🔑 Organiser Link</span>
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
                <p class="text-sm text-red-600 mb-3">Clear all match scores. Teams and fixtures will be kept.</p>
                <button onclick="confirmResetScores()" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
                    Reset Scores
                </button>
            </div>

            <div class="bg-gray-50 rounded-xl p-4">
                <h4 class="font-semibold text-gray-800 mb-2">Export Tournament Data</h4>
                <p class="text-sm text-gray-600 mb-3">Download all tournament data as JSON.</p>
                <button onclick="exportTournamentData()" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    📥 Export Data
                </button>
            </div>
        </div>
    `;
}

// ===== MAIN RENDER FUNCTION =====

function renderRoundRobin() {
    if (!state || !state.isInitialized) {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="animate-spin w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
                    <p class="text-gray-500">Loading tournament...</p>
                </div>
            </div>
        `;
        return;
    }

    const currentTab = state.currentTab || 'fixtures';

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen">
            <!-- Shared Header -->
            ${renderTournamentHeader({
                format: 'round-robin',
                tournamentId: state.tournamentId,
                tournamentName: state.tournamentName || 'Round Robin',
                isOrganiser: state.isOrganiser,
                subtitle: (state.teams?.length || 0) + ' teams'
            })}

            <!-- Tabs -->
            <div class="bg-white border-b border-gray-100">
                <div class="max-w-5xl mx-auto px-4">
                    <div class="flex gap-1 overflow-x-auto py-3" style="-webkit-overflow-scrolling: touch;">
                        <button onclick="setTab('fixtures')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'fixtures' ? 'tab-active' : 'tab-inactive'}">
                            📋 Fixtures
                        </button>
                        <button onclick="setTab('standings')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'standings' ? 'tab-active' : 'tab-inactive'}">
                            📊 Standings
                        </button>
                        ${state.canEdit() ? `
                            <button onclick="setTab('settings')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'settings' ? 'tab-active' : 'tab-inactive'}">
                                ⚙️ Settings
                            </button>
                        ` : `
                            <button onclick="showOrganiserLoginModal()" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                                🔑 Organiser Login
                            </button>
                        `}
                    </div>
                </div>
            </div>

            <!-- Tab Content -->
            <div class="max-w-5xl mx-auto px-4 py-6">
                ${currentTab === 'fixtures' ? renderFixturesTab() : ''}
                ${currentTab === 'standings' ? renderStandingsTab() : ''}
                ${currentTab === 'settings' ? renderSettingsTab() : ''}
            </div>
        </div>
    `;
}

// ===== COMPATIBILITY OBJECT =====
// Called by state.js renderTeamLeague() / render dispatch

const RoundRobinApp = { render: renderRoundRobin };

console.log('✅ Round Robin Components loaded');
