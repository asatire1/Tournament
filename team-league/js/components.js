// ===== TEAM LEAGUE UI COMPONENTS =====

// ===== BADGE COMPONENTS =====

function TeamBadge(team, size = 'full') {
    if (!team) return '<div class="text-gray-400 text-sm">TBD</div>';
    
    // Use team ID-based colour for visual variety
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

// ===== MATCH CARD COMPONENTS =====

function GroupMatchCard(match, group, roundNum, matchNum) {
    const team1 = state.getTeamById(match.team1Id);
    const team2 = state.getTeamById(match.team2Id);
    const score = state.getGroupScore(group, match.team1Id, match.team2Id);
    const isComplete = score.team1Score !== null && score.team2Score !== null;
    const canEdit = state.canEdit();
    const maxScore = state.groupMaxScore;
    
    let team1Winner = false;
    let team2Winner = false;
    if (isComplete) {
        team1Winner = score.team1Score > score.team2Score;
        team2Winner = score.team2Score > score.team1Score;
    }
    
    const inputId1 = `score-${group}-${match.team1Id}-${match.team2Id}-1`;
    const inputId2 = `score-${group}-${match.team1Id}-${match.team2Id}-2`;
    
    return `
        <div class="team-match-card ${isComplete ? 'complete' : ''}" data-group="${group}" data-team1="${match.team1Id}" data-team2="${match.team2Id}">
            <div class="match-header">
                <div class="match-info">
                    <span class="match-round">Round ${roundNum}</span>
                    <span class="match-number">Match ${matchNum}</span>
                </div>
                ${isComplete && canEdit ? `
                    <button class="clear-score-btn-small" onclick="clearGroupScore('${group}', ${match.team1Id}, ${match.team2Id})" title="Clear score">×</button>
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
                            ${canEdit ? `
                                <input type="number" 
                                    id="${inputId1}"
                                    class="score-input" 
                                    value="${score.team1Score !== null ? score.team1Score : ''}" 
                                    placeholder="-"
                                    min="0" 
                                    max="${maxScore}"
                                    oninput="autoFillScore('${inputId1}', '${inputId2}', ${maxScore})"
                                    onchange="handleGroupScore('${group}', ${match.team1Id}, ${match.team2Id}, this.value, document.getElementById('${inputId2}').value)"
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
                                    onchange="handleGroupScore('${group}', ${match.team1Id}, ${match.team2Id}, document.getElementById('${inputId1}').value, this.value)"
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

function KnockoutMatchCard(matchId, title, maxScore) {
    const teams = state.knockoutTeams[matchId];
    const score = state.getKnockoutScore(matchId);
    const team1 = teams?.team1 ? state.getTeamById(teams.team1) : null;
    const team2 = teams?.team2 ? state.getTeamById(teams.team2) : null;
    const isComplete = score.team1Score !== null && score.team2Score !== null;
    const canEdit = state.canEdit();
    
    let team1Winner = false;
    let team2Winner = false;
    if (isComplete) {
        team1Winner = score.team1Score > score.team2Score;
        team2Winner = score.team2Score > score.team1Score;
    }
    
    const matchName = state.knockoutNames[matchId] || title;
    const inputId1 = `ko-score-${matchId}-1`;
    const inputId2 = `ko-score-${matchId}-2`;
    
    return `
        <div class="team-knockout-match" data-match="${matchId}">
            <div class="ko-header">
                <span>🏆</span>
                <span>${matchName}</span>
                ${isComplete && canEdit ? `
                    <button class="clear-score-btn-small ml-auto" onclick="clearKnockoutScore('${matchId}')" title="Clear score">×</button>
                ` : ''}
            </div>
            <div class="ko-body">
                <div class="ko-teams">
                    <div class="ko-team-row ${team1Winner ? 'winner' : ''}">
                        <div class="ko-team-info">
                            ${team1 ? `
                                <div class="ko-team-name">${team1.name}</div>
                                <div class="ko-team-players">${team1.player1Name} & ${team1.player2Name}</div>
                            ` : `
                                <div class="ko-team-name text-gray-400">TBD</div>
                            `}
                        </div>
                        ${canEdit && team1 && team2 ? `
                            <input type="number" 
                                id="${inputId1}"
                                class="ko-score-input" 
                                value="${score.team1Score !== null ? score.team1Score : ''}" 
                                placeholder="-"
                                min="0" 
                                max="${maxScore}"
                                oninput="autoFillScore('${inputId1}', '${inputId2}', ${maxScore})"
                                onchange="handleKnockoutScore('${matchId}', this.value, document.getElementById('${inputId2}').value)"
                            />
                        ` : `
                            <div class="ko-score-display">${score.team1Score !== null ? score.team1Score : '-'}</div>
                        `}
                    </div>
                    
                    <div class="ko-team-row ${team2Winner ? 'winner' : ''}">
                        <div class="ko-team-info">
                            ${team2 ? `
                                <div class="ko-team-name">${team2.name}</div>
                                <div class="ko-team-players">${team2.player1Name} & ${team2.player2Name}</div>
                            ` : `
                                <div class="ko-team-name text-gray-400">TBD</div>
                            `}
                        </div>
                        ${canEdit && team1 && team2 ? `
                            <input type="number" 
                                id="${inputId2}"
                                class="ko-score-input" 
                                value="${score.team2Score !== null ? score.team2Score : ''}" 
                                placeholder="-"
                                min="0" 
                                max="${maxScore}"
                                oninput="autoFillScore('${inputId2}', '${inputId1}', ${maxScore})"
                                onchange="handleKnockoutScore('${matchId}', document.getElementById('${inputId1}').value, this.value)"
                            />
                        ` : `
                            <div class="ko-score-display">${score.team2Score !== null ? score.team2Score : '-'}</div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== TAB COMPONENTS =====

function GroupTab(group) {
    const fixtures = group === 'A' ? state.groupAFixtures : state.groupBFixtures;
    const teams = state.getTeamsInGroup(group);
    const totalMatches = state.getTotalGroupMatches(group);
    const completedMatches = state.getCompletedGroupMatches(group);
    
    if (teams.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">👥</div>
                <p class="text-gray-500 mb-2">No teams in Group ${group}</p>
                <p class="text-sm text-gray-400">Add teams and split into groups in Settings</p>
            </div>
        `;
    }
    
    if (fixtures.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">📋</div>
                <p class="text-gray-500 mb-2">No fixtures generated</p>
                <p class="text-sm text-gray-400">Generate fixtures in Settings</p>
            </div>
        `;
    }
    
    const headerClass = group === 'A' ? 'group-header-a' : 'group-header-b';
    
    return `
        <div class="group-card mb-6">
            <div class="group-header ${headerClass}">
                <span>⚽</span>
                <span>Group ${group} Matches</span>
                <span class="ml-auto text-sm opacity-80">${completedMatches}/${totalMatches} complete</span>
            </div>
        </div>
        
        <div class="space-y-4">
            ${fixtures.map((round, roundIdx) => `
                <div class="mb-6">
                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Round ${round.round}</h3>
                    <div class="grid gap-4 md:grid-cols-2">
                        ${round.matches.map((match, matchIdx) => 
                            GroupMatchCard(match, group, round.round, matchIdx + 1)
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ===== FIXTURES TAB (Side-by-Side View) =====

function FixturesTab() {
    const isTwoGroups = state.groupMode === CONFIG.GROUP_MODES.TWO_GROUPS;
    const fixturesA = state.groupAFixtures || [];
    const fixturesB = state.groupBFixtures || [];
    const teamsA = state.getTeamsInGroup('A');
    const teamsB = state.getTeamsInGroup('B');
    
    // View toggle state (stored in state object)
    const viewMode = state.fixturesViewMode || 'side-by-side';
    
    // Calculate completion stats
    const getCompletionStats = (fixtures, group) => {
        let completed = 0, total = 0;
        fixtures.forEach(round => {
            round.matches.forEach(match => {
                total++;
                const score = state.getGroupScore(group, match.team1Id, match.team2Id);
                if (score.team1Score !== null && score.team2Score !== null) completed++;
            });
        });
        return { completed, total };
    };
    
    const statsA = getCompletionStats(fixturesA, 'A');
    const statsB = isTwoGroups ? getCompletionStats(fixturesB, 'B') : { completed: 0, total: 0 };
    
    // Get max rounds
    const maxRounds = Math.max(fixturesA.length, fixturesB.length);
    
    if (teamsA.length === 0 && teamsB.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">📋</div>
                <p class="text-gray-500 mb-2">No teams added yet</p>
                <p class="text-sm text-gray-400">Add teams in Settings to generate fixtures</p>
            </div>
        `;
    }
    
    if (fixturesA.length === 0 && fixturesB.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">📋</div>
                <p class="text-gray-500 mb-2">No fixtures generated</p>
                <p class="text-sm text-gray-400">Generate fixtures in Settings</p>
            </div>
        `;
    }
    
    // Single group - just show Group A
    if (!isTwoGroups) {
        return `
            <div class="mb-4 flex items-center justify-between">
                <h2 class="text-xl font-bold text-gray-800">All Fixtures</h2>
                <span class="text-sm text-gray-500">${statsA.completed}/${statsA.total} matches complete</span>
            </div>
            ${renderFixturesForGroup('A', fixturesA)}
        `;
    }
    
    // Two groups - show view toggle and side-by-side or stacked view
    return `
        <!-- View Mode Toggle -->
        <div class="mb-4 flex items-center justify-between flex-wrap gap-3">
            <h2 class="text-xl font-bold text-gray-800">All Fixtures</h2>
            <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500 mr-2">
                    ${statsA.completed + statsB.completed}/${statsA.total + statsB.total} matches complete
                </span>
                <div class="flex bg-gray-100 rounded-lg p-1">
                    <button onclick="setFixturesViewMode('side-by-side')" class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'side-by-side' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:text-gray-800'}">
                        Side by Side
                    </button>
                    <button onclick="setFixturesViewMode('group-a')" class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'group-a' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:text-gray-800'}">
                        Group A
                    </button>
                    <button onclick="setFixturesViewMode('group-b')" class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'group-b' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:text-gray-800'}">
                        Group B
                    </button>
                </div>
            </div>
        </div>
        
        ${viewMode === 'side-by-side' ? renderSideBySideFixtures(fixturesA, fixturesB, maxRounds) : ''}
        ${viewMode === 'group-a' ? renderFixturesForGroup('A', fixturesA) : ''}
        ${viewMode === 'group-b' ? renderFixturesForGroup('B', fixturesB) : ''}
    `;
}

function renderSideBySideFixtures(fixturesA, fixturesB, maxRounds) {
    let html = '';
    
    for (let roundIdx = 0; roundIdx < maxRounds; roundIdx++) {
        const roundA = fixturesA[roundIdx];
        const roundB = fixturesB[roundIdx];
        const roundNum = roundIdx + 1;
        
        html += `
            <div class="mb-8">
                <h3 class="text-lg font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
                    Round ${roundNum}
                </h3>
                <div class="grid md:grid-cols-2 gap-6">
                    <!-- Group A -->
                    <div>
                        <div class="flex items-center gap-2 mb-3">
                            <span class="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center text-xs font-bold">A</span>
                            <span class="text-sm font-semibold text-gray-600">Group A</span>
                        </div>
                        <div class="space-y-3">
                            ${roundA ? roundA.matches.map((match, idx) => 
                                GroupMatchCard(match, 'A', roundNum, idx + 1)
                            ).join('') : '<p class="text-gray-400 text-sm">No matches</p>'}
                        </div>
                    </div>
                    
                    <!-- Group B -->
                    <div>
                        <div class="flex items-center gap-2 mb-3">
                            <span class="w-6 h-6 rounded bg-purple-500 text-white flex items-center justify-center text-xs font-bold">B</span>
                            <span class="text-sm font-semibold text-gray-600">Group B</span>
                        </div>
                        <div class="space-y-3">
                            ${roundB ? roundB.matches.map((match, idx) => 
                                GroupMatchCard(match, 'B', roundNum, idx + 1)
                            ).join('') : '<p class="text-gray-400 text-sm">No matches</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    return html;
}

function renderFixturesForGroup(group, fixtures) {
    if (fixtures.length === 0) {
        return `<p class="text-gray-400 text-center py-8">No fixtures for Group ${group}</p>`;
    }
    
    const headerClass = group === 'A' ? 'group-header-a' : 'group-header-b';
    
    return `
        <div class="group-card mb-4">
            <div class="group-header ${headerClass}">
                <span>⚽</span>
                <span>Group ${group} Matches</span>
            </div>
        </div>
        
        <div class="space-y-6">
            ${fixtures.map((round, roundIdx) => `
                <div>
                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Round ${round.round}</h3>
                    <div class="grid gap-4 md:grid-cols-2">
                        ${round.matches.map((match, matchIdx) => 
                            GroupMatchCard(match, group, round.round, matchIdx + 1)
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function StandingsTab() {
    const groupAStandings = state.getGroupStandings('A');
    const groupBStandings = state.getGroupStandings('B');
    const qualifyCount = state.groupMode === CONFIG.GROUP_MODES.SINGLE 
        ? CONFIG.KNOCKOUT_QUALIFIERS.SINGLE_GROUP 
        : CONFIG.KNOCKOUT_QUALIFIERS.TWO_GROUPS;
    
    const renderStandingsTable = (standings, group) => {
        if (standings.length === 0) {
            return `<p class="text-gray-400 text-center py-8">No teams in group</p>`;
        }
        
        return `
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
                            const isQualified = idx < qualifyCount;
                            const colourClass = getTeamColourClass(row.team.id);
                            return `
                                <tr>
                                    <td class="position ${isQualified ? 'qualified' : ''}">${idx + 1}</td>
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
                                    <td class="points">${row.points}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-4 flex items-center gap-2">
                <span class="qualification-badge qualified">✓ Top ${qualifyCount} qualify</span>
            </div>
        `;
    };
    
    if (state.groupMode === CONFIG.GROUP_MODES.SINGLE) {
        return `
            <div class="group-card">
                <div class="group-header group-header-single">
                    <span>📊</span>
                    <span>Standings</span>
                </div>
                <div class="p-4">
                    ${renderStandingsTable(groupAStandings, 'A')}
                </div>
            </div>
        `;
    }
    
    // Two groups - show view toggle
    const viewMode = state.standingsViewMode || 'both';
    
    return `
        <!-- View Mode Toggle -->
        <div class="mb-4 flex items-center justify-between flex-wrap gap-3">
            <h2 class="text-xl font-bold text-gray-800">Standings</h2>
            <div class="flex bg-gray-100 rounded-lg p-1">
                <button onclick="setStandingsViewMode('both')" class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'both' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:text-gray-800'}">
                    Both Groups
                </button>
                <button onclick="setStandingsViewMode('group-a')" class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'group-a' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:text-gray-800'}">
                    Group A
                </button>
                <button onclick="setStandingsViewMode('group-b')" class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'group-b' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:text-gray-800'}">
                    Group B
                </button>
            </div>
        </div>
        
        ${viewMode === 'both' ? `
            <div class="grid gap-6 lg:grid-cols-2">
                <div class="group-card">
                    <div class="group-header group-header-a">
                        <span>📊</span>
                        <span>Group A Standings</span>
                    </div>
                    <div class="p-4">
                        ${renderStandingsTable(groupAStandings, 'A')}
                    </div>
                </div>
                
                <div class="group-card">
                    <div class="group-header group-header-b">
                        <span>📊</span>
                        <span>Group B Standings</span>
                    </div>
                    <div class="p-4">
                        ${renderStandingsTable(groupBStandings, 'B')}
                    </div>
                </div>
            </div>
        ` : ''}
        
        ${viewMode === 'group-a' ? `
            <div class="group-card">
                <div class="group-header group-header-a">
                    <span>📊</span>
                    <span>Group A Standings</span>
                </div>
                <div class="p-4">
                    ${renderStandingsTable(groupAStandings, 'A')}
                </div>
            </div>
        ` : ''}
        
        ${viewMode === 'group-b' ? `
            <div class="group-card">
                <div class="group-header group-header-b">
                    <span>📊</span>
                    <span>Group B Standings</span>
                </div>
                <div class="p-4">
                    ${renderStandingsTable(groupBStandings, 'B')}
                </div>
            </div>
        ` : ''}
    `;
}

function KnockoutTab() {
    const canEdit = state.canEdit();
    const knockoutFormat = state.knockoutFormat || 'quarter_final';
    
    // Determine if knockout has started based on format
    let hasKnockoutTeams = false;
    if (knockoutFormat === 'final_only') {
        hasKnockoutTeams = state.knockoutTeams.final.team1 !== null;
    } else if (knockoutFormat === 'semi_final') {
        hasKnockoutTeams = state.knockoutTeams.sf1.team1 !== null;
    } else {
        hasKnockoutTeams = state.knockoutTeams.qf1.team1 !== null;
    }
    
    if (!hasKnockoutTeams) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">🏆</div>
                <p class="text-gray-500 mb-2">Knockout stage not started</p>
                <p class="text-sm text-gray-400 mb-6">Complete group stage and set knockout teams</p>
                ${canEdit ? `
                    <button onclick="setKnockoutFromStandings()" class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
                        Set Teams from Standings
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    // Final Only Format
    if (knockoutFormat === 'final_only') {
        return `
            <div class="space-y-8">
                <div class="max-w-md mx-auto">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 justify-center">
                        <span>🏆</span> Final
                    </h3>
                    ${KnockoutMatchCard('final', 'Final', state.finalMaxScore)}
                </div>
            </div>
        `;
    }
    
    // Semi Final + Final Format
    if (knockoutFormat === 'semi_final') {
        return `
            <div class="space-y-8">
                <!-- Semi Finals -->
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>⚡</span> Semi Finals
                    </h3>
                    <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                        ${KnockoutMatchCard('sf1', 'SF1', state.semiMaxScore)}
                        ${KnockoutMatchCard('sf2', 'SF2', state.semiMaxScore)}
                    </div>
                </div>
                
                <!-- 3rd Place & Final -->
                <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                    ${state.includeThirdPlace ? `
                        <div>
                            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span>🥉</span> 3rd Place Playoff
                            </h3>
                            ${KnockoutMatchCard('thirdPlace', '3rd Place', state.thirdPlaceMaxScore)}
                        </div>
                    ` : ''}
                    
                    <div>
                        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>🏆</span> Final
                        </h3>
                        ${KnockoutMatchCard('final', 'Final', state.finalMaxScore)}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Quarter Final + Semi Final + Final Format (default)
    return `
        <div class="space-y-8">
            <!-- Quarter Finals -->
            <div>
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🎯</span> Quarter Finals
                </h3>
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    ${KnockoutMatchCard('qf1', 'QF1', state.knockoutMaxScore)}
                    ${KnockoutMatchCard('qf2', 'QF2', state.knockoutMaxScore)}
                    ${KnockoutMatchCard('qf3', 'QF3', state.knockoutMaxScore)}
                    ${KnockoutMatchCard('qf4', 'QF4', state.knockoutMaxScore)}
                </div>
            </div>
            
            <!-- Semi Finals -->
            <div>
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>⚡</span> Semi Finals
                </h3>
                <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                    ${KnockoutMatchCard('sf1', 'SF1', state.semiMaxScore)}
                    ${KnockoutMatchCard('sf2', 'SF2', state.semiMaxScore)}
                </div>
            </div>
            
            <!-- 3rd Place & Final -->
            <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                ${state.includeThirdPlace ? `
                    <div>
                        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>🥉</span> 3rd Place Playoff
                        </h3>
                        ${KnockoutMatchCard('thirdPlace', '3rd Place', state.thirdPlaceMaxScore)}
                    </div>
                ` : ''}
                
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🏆</span> Final
                    </h3>
                    ${KnockoutMatchCard('final', 'Final', state.finalMaxScore)}
                </div>
            </div>
        </div>
    `;
}

function PartnersTab() {
    const teams = [...state.teams].sort((a, b) => b.combinedRating - a.combinedRating);
    
    if (teams.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">👥</div>
                <p class="text-gray-500 mb-2">No teams added yet</p>
                <p class="text-sm text-gray-400">Add teams in Settings</p>
            </div>
        `;
    }
    
    return `
        <div class="partners-grid">
            ${teams.map((team, idx) => {
                const colourClass = getTeamColourClass(team.id);
                const tierName = getTeamTierName(team.combinedRating);
                return `
                    <div class="partner-card">
                        <div class="partner-card-header ${colourClass}">
                            <span class="team-number-badge">${team.id}</span>
                            <span class="team-name-header">${team.name}</span>
                        </div>
                        <div class="partner-card-body">
                            <div class="players-list">
                                <div class="player-row">
                                    <span class="player-name">${team.player1Name}</span>
                                    <span class="player-rating">${team.player1Rating.toFixed(1)}</span>
                                </div>
                                <div class="player-row">
                                    <span class="player-name">${team.player2Name}</span>
                                    <span class="player-rating">${team.player2Rating.toFixed(1)}</span>
                                </div>
                            </div>
                            <div class="combined-rating">
                                <span class="combined-label">Combined Rating</span>
                                <span class="combined-value">${team.combinedRating.toFixed(1)}</span>
                            </div>
                            ${team.group ? `
                                <span class="group-badge group-${team.group.toLowerCase()}">Group ${team.group}</span>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function SettingsTab() {
    const canEdit = state.canEdit();
    
    if (!canEdit) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4">🔒</div>
                <p class="text-gray-500 mb-4">Organiser access required to edit settings</p>
                <button onclick="showOrganiserLoginModal()" class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
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
            <button onclick="setSettingsSubTab('groups')" class="settings-subtab ${subTab === 'groups' ? 'active' : 'inactive'}">
                📋 Groups
            </button>
            <button onclick="setSettingsSubTab('fixtures')" class="settings-subtab ${subTab === 'fixtures' ? 'active' : 'inactive'}">
                🔄 Fixtures
            </button>
            <button onclick="setSettingsSubTab('courts')" class="settings-subtab ${subTab === 'courts' ? 'active' : 'inactive'}">
                🏟️ Courts
            </button>
            <button onclick="setSettingsSubTab('scoring')" class="settings-subtab ${subTab === 'scoring' ? 'active' : 'inactive'}">
                ⚙️ Scoring
            </button>
            <button onclick="setSettingsSubTab('danger')" class="settings-subtab ${subTab === 'danger' ? 'active' : 'inactive'}">
                ⚠️ Danger Zone
            </button>
        </div>
        
        <!-- Settings Content -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            ${subTab === 'teams' ? TeamsSettingsSection() : ''}
            ${subTab === 'groups' ? GroupsSettingsSection() : ''}
            ${subTab === 'fixtures' ? FixturesSettingsSection() : ''}
            ${subTab === 'courts' ? CourtsSettingsSection() : ''}
            ${subTab === 'scoring' ? ScoringSettingsSection() : ''}
            ${subTab === 'danger' ? DangerZoneSection() : ''}
        </div>
    `;
}

function TeamsSettingsSection() {
    const editingTeamId = state.editingTeamId || null;
    
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Manage Teams</h3>
        
        <!-- Add Team Form -->
        <div class="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 class="font-semibold text-gray-700 mb-3">Add New Team</h4>
            <div class="grid gap-4 md:grid-cols-2">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 1 Name</label>
                    <input type="text" id="new-player1-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="e.g. John" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 1 Rating (0-5)</label>
                    <input type="number" id="new-player1-rating" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="3.5" min="0" max="5" step="0.1" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 2 Name</label>
                    <input type="text" id="new-player2-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="e.g. Jane" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 2 Rating (0-5)</label>
                    <input type="number" id="new-player2-rating" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="3.0" min="0" max="5" step="0.1" />
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-600 mb-1">Team Name (optional)</label>
                <input type="text" id="new-team-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="Auto-generated if empty" />
            </div>
            <button onclick="addNewTeam()" class="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors">
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
                            <div class="p-4 bg-purple-50 rounded-xl border-2 border-purple-300">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="team-mini-badge ${colourClass}">${team.id}</div>
                                    <span class="font-semibold text-purple-700">Editing Team</span>
                                </div>
                                <div class="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Player 1</label>
                                        <input type="text" id="edit-p1-name-${team.id}" value="${team.player1Name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                                        <input type="number" id="edit-p1-rating-${team.id}" value="${team.player1Rating}" min="0" max="5" step="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Player 2</label>
                                        <input type="text" id="edit-p2-name-${team.id}" value="${team.player2Name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                                        <input type="number" id="edit-p2-rating-${team.id}" value="${team.player2Rating}" min="0" max="5" step="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Team Name</label>
                                    <input type="text" id="edit-team-name-${team.id}" value="${team.name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                </div>
                                <div class="mt-3 flex gap-2">
                                    <button onclick="saveTeamEdit(${team.id})" class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-sm transition-colors">
                                        ✓ Save
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
                                <div class="text-xs text-gray-400">Combined: ${team.combinedRating.toFixed(1)} • Group ${team.group || 'Unassigned'}</div>
                            </div>
                            <div class="flex gap-1">
                                <button onclick="startTeamEdit(${team.id})" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit team">
                                    ✏️
                                </button>
                                <button onclick="moveTeamGroup(${team.id})" class="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="Move to other group">
                                    🔀
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

function GroupsSettingsSection() {
    const isTwoGroups = state.groupMode === CONFIG.GROUP_MODES.TWO_GROUPS;
    
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Group Settings</h3>
        
        <!-- Group Mode -->
        <div class="mb-6">
            <label class="block text-sm font-medium text-gray-600 mb-2">Group Mode</label>
            <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="group-mode" value="two_groups" ${isTwoGroups ? 'checked' : ''} onchange="setGroupMode('two_groups')" class="w-4 h-4 text-purple-500" />
                    <span>Two Groups (A & B)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="group-mode" value="single_group" ${!isTwoGroups ? 'checked' : ''} onchange="setGroupMode('single_group')" class="w-4 h-4 text-purple-500" />
                    <span>Single Group</span>
                </label>
            </div>
        </div>
        
        <!-- Split & Generate Buttons -->
        <div class="flex flex-wrap gap-4 mb-6">
            <button onclick="splitTeams()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors" ${state.teams.length < 2 ? 'disabled' : ''}>
                🔀 Split Teams into Groups
            </button>
            <button onclick="generateFixtures()" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors" ${state.groupA.length === 0 ? 'disabled' : ''}>
                📋 Generate Fixtures
            </button>
        </div>
        
        <!-- Current Groups -->
        <div class="grid gap-4 md:grid-cols-2">
            <div class="bg-blue-50 rounded-xl p-4">
                <h4 class="font-semibold text-blue-800 mb-2">Group A (${state.groupA.length} teams)</h4>
                ${state.groupA.length === 0 ? `
                    <p class="text-blue-400 text-sm">No teams assigned</p>
                ` : `
                    <ul class="text-sm text-blue-700 space-y-1">
                        ${state.groupA.map(id => {
                            const team = state.getTeamById(id);
                            return `<li>• ${team?.name || 'Unknown'}</li>`;
                        }).join('')}
                    </ul>
                `}
            </div>
            
            ${isTwoGroups ? `
                <div class="bg-purple-50 rounded-xl p-4">
                    <h4 class="font-semibold text-purple-800 mb-2">Group B (${state.groupB.length} teams)</h4>
                    ${state.groupB.length === 0 ? `
                        <p class="text-purple-400 text-sm">No teams assigned</p>
                    ` : `
                        <ul class="text-sm text-purple-700 space-y-1">
                            ${state.groupB.map(id => {
                                const team = state.getTeamById(id);
                                return `<li>• ${team?.name || 'Unknown'}</li>`;
                            }).join('')}
                        </ul>
                    `}
                </div>
            ` : ''}
        </div>
        
        <!-- 3rd Place Toggle -->
        <div class="mt-6">
            <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" ${state.includeThirdPlace ? 'checked' : ''} onchange="toggleThirdPlace(this.checked)" class="w-5 h-5 text-purple-500 rounded" />
                <span class="font-medium text-gray-700">Include 3rd Place Playoff</span>
            </label>
        </div>
    `;
}

function FixturesSettingsSection() {
    const fixturesA = state.groupAFixtures || [];
    const fixturesB = state.groupBFixtures || [];
    const isTwoGroups = state.groupMode === CONFIG.GROUP_MODES.TWO_GROUPS;
    
    const renderFixtureList = (fixtures, group) => {
        if (fixtures.length === 0) {
            return `<p class="text-gray-400 text-sm py-4">No fixtures generated for Group ${group}</p>`;
        }
        
        return fixtures.map((round, roundIdx) => `
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h5 class="text-sm font-semibold text-gray-600">Round ${round.round}</h5>
                </div>
                <div class="space-y-2">
                    ${round.matches.map((match, matchIdx) => {
                        const team1 = state.getTeamById(match.team1Id);
                        const team2 = state.getTeamById(match.team2Id);
                        const globalMatchIdx = roundIdx * 10 + matchIdx; // Unique index for swapping
                        return `
                            <div class="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200" data-group="${group}" data-round="${roundIdx}" data-match="${matchIdx}">
                                <span class="text-xs text-gray-400 w-6">${matchIdx + 1}</span>
                                <div class="flex-1 text-sm">
                                    <span class="font-medium">${team1?.name || 'TBD'}</span>
                                    <span class="text-gray-400 mx-2">vs</span>
                                    <span class="font-medium">${team2?.name || 'TBD'}</span>
                                </div>
                                <div class="flex gap-1">
                                    ${roundIdx > 0 ? `
                                        <button onclick="moveFixtureUp('${group}', ${roundIdx}, ${matchIdx})" class="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Move to previous round">
                                            ↑
                                        </button>
                                    ` : ''}
                                    ${roundIdx < fixtures.length - 1 ? `
                                        <button onclick="moveFixtureDown('${group}', ${roundIdx}, ${matchIdx})" class="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Move to next round">
                                            ↓
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `).join('');
    };
    
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Manage Fixtures</h3>
        
        <div class="bg-amber-50 rounded-xl p-4 mb-6">
            <p class="text-sm text-amber-800">
                <span class="font-semibold">💡 Tip:</span> You can move matches between rounds using the arrows. 
                This is useful for scheduling matches on specific days or courts.
            </p>
        </div>
        
        <div class="flex flex-wrap gap-4 mb-6">
            <button onclick="regenerateFixtures()" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">
                🔄 Regenerate All Fixtures
            </button>
            <button onclick="shuffleFixtureOrder()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
                🎲 Shuffle Match Order
            </button>
        </div>
        
        <div class="grid gap-6 ${isTwoGroups ? 'md:grid-cols-2' : ''}">
            <!-- Group A Fixtures -->
            <div class="bg-blue-50 rounded-xl p-4">
                <h4 class="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <span class="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center text-xs font-bold">A</span>
                    Group A Fixtures
                </h4>
                ${renderFixtureList(fixturesA, 'A')}
            </div>
            
            ${isTwoGroups ? `
                <!-- Group B Fixtures -->
                <div class="bg-purple-50 rounded-xl p-4">
                    <h4 class="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                        <span class="w-6 h-6 rounded bg-purple-500 text-white flex items-center justify-center text-xs font-bold">B</span>
                        Group B Fixtures
                    </h4>
                    ${renderFixtureList(fixturesB, 'B')}
                </div>
            ` : ''}
        </div>
    `;
}

function CourtsSettingsSection() {
    // Initialize court names if not set
    const courtNames = state.courtNames || {
        group: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
        knockout: {
            qf1: 'Court 1', qf2: 'Court 2', qf3: 'Court 3', qf4: 'Court 4',
            sf1: 'Centre Court', sf2: 'Court 1',
            thirdPlace: 'Court 1',
            final: 'Centre Court'
        }
    };
    
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Court Names</h3>
        
        <p class="text-sm text-gray-600 mb-6">
            Assign court names to matches. These will be displayed on the fixtures page.
        </p>
        
        <!-- Group Stage Courts -->
        <div class="mb-8">
            <h4 class="font-semibold text-gray-700 mb-3">Group Stage Courts</h4>
            <p class="text-xs text-gray-500 mb-3">Enter names for up to 4 courts used during group matches</p>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                ${[0, 1, 2, 3].map(i => `
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Court ${i + 1}</label>
                        <input 
                            type="text" 
                            id="court-group-${i}" 
                            value="${courtNames.group?.[i] || `Court ${i + 1}`}" 
                            onchange="updateCourtName('group', ${i}, this.value)"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" 
                            placeholder="Court ${i + 1}" 
                        />
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Knockout Stage Courts -->
        <div>
            <h4 class="font-semibold text-gray-700 mb-3">Knockout Stage Courts</h4>
            
            <!-- Quarter Finals -->
            <div class="mb-6">
                <h5 class="text-sm font-medium text-gray-600 mb-2">Quarter Finals</h5>
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    ${['qf1', 'qf2', 'qf3', 'qf4'].map((match, i) => `
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">${state.knockoutNames?.[match] || match.toUpperCase()}</label>
                            <input 
                                type="text" 
                                id="court-${match}" 
                                value="${courtNames.knockout?.[match] || `Court ${i + 1}`}" 
                                onchange="updateCourtName('knockout', '${match}', this.value)"
                                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" 
                            />
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Semi Finals -->
            <div class="mb-6">
                <h5 class="text-sm font-medium text-gray-600 mb-2">Semi Finals</h5>
                <div class="grid gap-4 md:grid-cols-2">
                    ${['sf1', 'sf2'].map((match, i) => `
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">${state.knockoutNames?.[match] || match.toUpperCase()}</label>
                            <input 
                                type="text" 
                                id="court-${match}" 
                                value="${courtNames.knockout?.[match] || (i === 0 ? 'Centre Court' : 'Court 1')}" 
                                onchange="updateCourtName('knockout', '${match}', this.value)"
                                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" 
                            />
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- 3rd Place & Final -->
            <div class="grid gap-4 md:grid-cols-2">
                ${state.includeThirdPlace ? `
                    <div>
                        <h5 class="text-sm font-medium text-gray-600 mb-2">3rd Place Playoff</h5>
                        <input 
                            type="text" 
                            id="court-thirdPlace" 
                            value="${courtNames.knockout?.thirdPlace || 'Court 1'}" 
                            onchange="updateCourtName('knockout', 'thirdPlace', this.value)"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" 
                        />
                    </div>
                ` : ''}
                <div>
                    <h5 class="text-sm font-medium text-gray-600 mb-2">Final</h5>
                    <input 
                        type="text" 
                        id="court-final" 
                        value="${courtNames.knockout?.final || 'Centre Court'}" 
                        onchange="updateCourtName('knockout', 'final', this.value)"
                        class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" 
                    />
                </div>
            </div>
        </div>
    `;
}

function ScoringSettingsSection() {
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Scoring Settings</h3>
        
        <div class="grid gap-6 md:grid-cols-2">
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Group Match Max Score</label>
                <input type="number" value="${state.groupMaxScore}" onchange="updateGroupMaxScore(this.value)" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" min="1" max="50" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Quarter Final Max Score</label>
                <input type="number" value="${state.knockoutMaxScore}" onchange="updateKnockoutMaxScore(this.value)" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" min="1" max="50" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Semi Final Max Score</label>
                <input type="number" value="${state.semiMaxScore}" onchange="updateSemiMaxScore(this.value)" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" min="1" max="50" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Final Max Score</label>
                <input type="number" value="${state.finalMaxScore}" onchange="updateFinalMaxScore(this.value)" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" min="1" max="50" />
            </div>
        </div>
    `;
}

function DangerZoneSection() {
    return `
        <h3 class="text-lg font-bold text-red-600 mb-4">⚠️ Danger Zone</h3>
        
        <div class="space-y-4">
            <div class="bg-red-50 rounded-xl p-4">
                <h4 class="font-semibold text-red-800 mb-2">Reset All Scores</h4>
                <p class="text-sm text-red-600 mb-3">Clear all group and knockout scores. Teams and fixtures will be kept.</p>
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

// ===== MAIN APP COMPONENT =====

const TeamLeagueApp = {
    render() {
        if (!state || !state.isInitialized) {
            document.getElementById('app').innerHTML = `
                <div class="min-h-screen flex items-center justify-center">
                    <div class="text-center">
                        <div class="animate-spin w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"></div>
                        <p class="text-gray-500">Loading tournament...</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const currentTab = state.currentTab || 'fixtures';
        const isTwoGroups = state.groupMode === CONFIG.GROUP_MODES.TWO_GROUPS;
        
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    <div class="max-w-6xl mx-auto px-4 py-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="flex items-center gap-2 text-purple-200 text-sm mb-1">
                                    <a href="../" class="hover:text-white transition-colors">← Back</a>
                                    <span>•</span>
                                    <span class="font-mono">${state.tournamentId?.toUpperCase() || ''}</span>
                                    ${state.isOrganiser ? '<span class="bg-white/20 px-2 py-0.5 rounded text-xs">Organiser</span>' : ''}
                                </div>
                                <h1 class="text-2xl font-bold">${state.tournamentName || 'Team Tournament'}</h1>
                            </div>
                            <button onclick="showShareModal()" class="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Share">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Tabs -->
                <div class="bg-white border-b border-gray-100 sticky top-0 z-40">
                    <div class="max-w-6xl mx-auto px-4">
                        <div class="flex gap-1 overflow-x-auto py-3" style="-webkit-overflow-scrolling: touch;">
                            <button onclick="setTab('fixtures')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'fixtures' ? 'tab-active' : 'tab-inactive'}">
                                📋 Fixtures
                            </button>
                            <button onclick="setTab('standings')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'standings' ? 'tab-active' : 'tab-inactive'}">
                                📊 Standings
                            </button>
                            <button onclick="setTab('knockout')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'knockout' ? 'tab-active' : 'tab-inactive'}">
                                🏆 Knockout
                            </button>
                            <button onclick="setTab('partners')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'partners' ? 'tab-active' : 'tab-inactive'}">
                                👥 Teams
                            </button>
                            ${state.canEdit() ? `
                                <button onclick="setTab('settings')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'settings' ? 'tab-active' : 'tab-inactive'}">
                                    ⚙️ Settings
                                </button>
                            ` : `
                                <button onclick="showOrganiserLoginModal()" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all bg-purple-100 text-purple-700 hover:bg-purple-200">
                                    🔑 Organiser Login
                                </button>
                            `}
                        </div>
                    </div>
                </div>
                
                <!-- Tab Content -->
                <div class="max-w-6xl mx-auto px-4 py-6">
                    ${currentTab === 'fixtures' ? FixturesTab() : ''}
                    ${currentTab === 'standings' ? StandingsTab() : ''}
                    ${currentTab === 'knockout' ? KnockoutTab() : ''}
                    ${currentTab === 'partners' ? PartnersTab() : ''}
                    ${currentTab === 'settings' ? SettingsTab() : ''}
                </div>
            </div>
        `;
    }
};

console.log('✅ Team Tournament Components loaded');
