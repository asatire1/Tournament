// ===== TEAM LEAGUE EVENT HANDLERS =====

// ===== TAB NAVIGATION =====

function setTab(tab) {
    if (!state) return;
    state.currentTab = tab;
    renderTeamLeague();
}

function setSettingsSubTab(subTab) {
    if (!state) return;
    state.settingsSubTab = subTab;
    renderTeamLeague();
}

function setFixturesViewMode(mode) {
    if (!state) return;
    state.fixturesViewMode = mode;
    // Save preference to localStorage
    localStorage.setItem('teamLeague_fixturesViewMode', mode);
    renderTeamLeague();
}

function setStandingsViewMode(mode) {
    if (!state) return;
    state.standingsViewMode = mode;
    // Save preference to localStorage
    localStorage.setItem('teamLeague_standingsViewMode', mode);
    renderTeamLeague();
}

// ===== SCORE HANDLERS =====

/**
 * Auto-fill the other score based on max score
 * When user enters a score, automatically calculate the opponent's score
 * Also enforces max score limit
 */
function autoFillScore(changedInputId, otherInputId, maxScore) {
    const changedInput = document.getElementById(changedInputId);
    const otherInput = document.getElementById(otherInputId);
    
    if (!changedInput || !otherInput) return;
    
    let enteredValue = changedInput.value;
    
    // If empty, clear both and return
    if (enteredValue === '') {
        return;
    }
    
    let score = parseInt(enteredValue);
    
    // Enforce max score limit
    if (!isNaN(score)) {
        if (score > maxScore) {
            score = maxScore;
            changedInput.value = maxScore;
        }
        if (score < 0) {
            score = 0;
            changedInput.value = 0;
        }
        
        // Always calculate and set the other score
        const otherScore = maxScore - score;
        otherInput.value = otherScore;
    }
}

function handleGroupScore(group, team1Id, team2Id, team1Score, team2Score) {
    if (!state || !state.canEdit()) return;
    
    const score1 = team1Score !== '' && team1Score !== null ? parseInt(team1Score) : null;
    const score2 = team2Score !== '' && team2Score !== null ? parseInt(team2Score) : null;
    
    // Only save if both scores are entered
    if (score1 !== null && score2 !== null) {
        state.updateGroupScore(group, team1Id, team2Id, score1, score2);
        showToast('✅ Score saved');
        // Re-render to update knockout bracket preview
        setTimeout(() => renderTeamLeague(), 100);
    }
}

function clearGroupScore(group, team1Id, team2Id) {
    if (!state || !state.canEdit()) return;
    
    if (confirm('Clear this score?')) {
        state.clearGroupScore(group, team1Id, team2Id);
        renderTeamLeague();
        showToast('✅ Score cleared');
    }
}

function handleKnockoutScore(matchId, team1Score, team2Score) {
    if (!state || !state.canEdit()) return;
    
    const score1 = team1Score !== null && team1Score !== '' 
        ? parseInt(team1Score) 
        : null;
    const score2 = team2Score !== null && team2Score !== '' 
        ? parseInt(team2Score) 
        : null;
    
    // Only save if both scores are entered
    if (score1 !== null && score2 !== null) {
        state.updateKnockoutScore(matchId, score1, score2);
        showToast('✅ Score saved');
        // Re-render to show progression
        setTimeout(() => renderTeamLeague(), 100);
    }
}

function clearKnockoutScore(matchId) {
    if (!state || !state.canEdit()) return;
    
    if (confirm('Clear this score? This will also clear any dependent matches.')) {
        state.clearKnockoutScore(matchId);
        renderTeamLeague();
        showToast('✅ Score cleared');
    }
}

// ===== TEAM MANAGEMENT =====

function addNewTeam() {
    if (!state || !state.canEdit()) return;
    
    const player1Name = document.getElementById('new-player1-name')?.value?.trim();
    const player1Rating = parseFloat(document.getElementById('new-player1-rating')?.value);
    const player2Name = document.getElementById('new-player2-name')?.value?.trim();
    const player2Rating = parseFloat(document.getElementById('new-player2-rating')?.value);
    const teamName = document.getElementById('new-team-name')?.value?.trim() || null;
    
    if (!player1Name || !player2Name) {
        showToast('❌ Please enter both player names');
        return;
    }
    
    if (isNaN(player1Rating) || isNaN(player2Rating)) {
        showToast('❌ Please enter valid ratings');
        return;
    }
    
    if (player1Rating < 0 || player1Rating > 5 || player2Rating < 0 || player2Rating > 5) {
        showToast('❌ Ratings must be between 0 and 5');
        return;
    }
    
    const team = state.addTeam(player1Name, player1Rating, player2Name, player2Rating, teamName);
    
    if (team) {
        // Clear form
        document.getElementById('new-player1-name').value = '';
        document.getElementById('new-player1-rating').value = '';
        document.getElementById('new-player2-name').value = '';
        document.getElementById('new-player2-rating').value = '';
        document.getElementById('new-team-name').value = '';
        
        showToast(`✅ Team "${team.name}" added`);
        renderTeamLeague();
    }
}

function removeTeam(teamId) {
    if (!state || !state.canEdit()) return;
    
    const team = state.getTeamById(teamId);
    if (!team) return;
    
    if (confirm(`Remove team "${team.name}"? This will clear all groups and fixtures.`)) {
        state.removeTeam(teamId);
        showToast('✅ Team removed');
        renderTeamLeague();
    }
}

// ===== TEAM EDITING =====

function startTeamEdit(teamId) {
    if (!state || !state.canEdit()) return;
    state.editingTeamId = teamId;
    renderTeamLeague();
}

function cancelTeamEdit() {
    if (!state) return;
    state.editingTeamId = null;
    renderTeamLeague();
}

function saveTeamEdit(teamId) {
    if (!state || !state.canEdit()) return;
    
    const p1Name = document.getElementById(`edit-p1-name-${teamId}`)?.value?.trim();
    const p1Rating = parseFloat(document.getElementById(`edit-p1-rating-${teamId}`)?.value) || 2.5;
    const p2Name = document.getElementById(`edit-p2-name-${teamId}`)?.value?.trim();
    const p2Rating = parseFloat(document.getElementById(`edit-p2-rating-${teamId}`)?.value) || 2.5;
    const teamName = document.getElementById(`edit-team-name-${teamId}`)?.value?.trim();
    
    if (!p1Name || !p2Name) {
        showToast('❌ Player names required');
        return;
    }
    
    const team = state.getTeamById(teamId);
    if (!team) return;
    
    // Update team
    team.player1Name = p1Name;
    team.player1Rating = Math.min(5, Math.max(0, p1Rating));
    team.player2Name = p2Name;
    team.player2Rating = Math.min(5, Math.max(0, p2Rating));
    team.combinedRating = team.player1Rating + team.player2Rating;
    team.name = teamName || `${p1Name} & ${p2Name}`;
    
    state.editingTeamId = null;
    state.saveTeamsToFirebase();
    showToast('✅ Team updated');
    renderTeamLeague();
}

function moveTeamGroup(teamId, targetGroup) {
    if (!state || !state.canEdit()) return;

    const team = state.getTeamById(teamId);
    if (!team) return;

    const currentGroup = team.group;

    // If no target specified, cycle to next group (legacy behavior)
    let newGroup = targetGroup;
    if (!newGroup) {
        const activeGroups = state.getActiveGroupLetters();
        const currentIdx = activeGroups.indexOf(currentGroup);
        newGroup = activeGroups[(currentIdx + 1) % activeGroups.length];
    }

    if (newGroup === currentGroup) return;

    // Remove from current group
    state[`group${currentGroup}`] = state[`group${currentGroup}`].filter(id => id !== teamId);

    // Add to new group
    state[`group${newGroup}`].push(teamId);

    team.group = newGroup;

    state.saveGroupsToFirebase();
    showToast(`Team moved to Group ${newGroup}`);
    renderTeamLeague();
}

// ===== FIXTURE MANAGEMENT =====

function _getGroupFixtures(group) {
    return state[`group${group}Fixtures`] || [];
}

function moveFixtureUp(group, roundIdx, matchIdx) {
    if (!state || !state.canEdit()) return;
    if (roundIdx === 0) return;

    const fixtures = _getGroupFixtures(group);
    const currentRound = fixtures[roundIdx];
    const prevRound = fixtures[roundIdx - 1];
    
    // Remove match from current round
    const match = currentRound.matches.splice(matchIdx, 1)[0];
    // Add to previous round
    prevRound.matches.push(match);
    
    state.saveFixturesToFirebase();
    showToast('✅ Match moved');
    renderTeamLeague();
}

function moveFixtureDown(group, roundIdx, matchIdx) {
    if (!state || !state.canEdit()) return;

    const fixtures = _getGroupFixtures(group);
    if (roundIdx >= fixtures.length - 1) return;
    
    const currentRound = fixtures[roundIdx];
    const nextRound = fixtures[roundIdx + 1];
    
    // Remove match from current round
    const match = currentRound.matches.splice(matchIdx, 1)[0];
    // Add to next round
    nextRound.matches.push(match);
    
    state.saveFixturesToFirebase();
    showToast('✅ Match moved');
    renderTeamLeague();
}

function regenerateFixtures() {
    if (!state || !state.canEdit()) return;
    
    if (!confirm('This will regenerate all fixtures and clear all scores. Continue?')) {
        return;
    }
    
    const success = state.generateFixtures();
    if (success) {
        showToast('✅ Fixtures regenerated');
        renderTeamLeague();
    }
}

function shuffleFixtureOrder() {
    if (!state || !state.canEdit()) return;

    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    CONFIG.ALL_GROUP_LETTERS.forEach(letter => {
        const fixtures = state[`group${letter}Fixtures`];
        if (fixtures) {
            fixtures.forEach(round => {
                round.matches = shuffle(round.matches);
            });
        }
    });

    state.saveFixturesToFirebase();
    showToast('Match order shuffled');
    renderTeamLeague();
}

// ===== COURT NAMES =====

function updateCourtName(type, key, value) {
    if (!state || !state.canEdit()) return;
    
    // Initialize court names if not exist
    if (!state.courtNames) {
        state.courtNames = {
            group: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
            knockout: {
                qf1: 'Court 1', qf2: 'Court 2', qf3: 'Court 3', qf4: 'Court 4',
                sf1: 'Centre Court', sf2: 'Court 1',
                thirdPlace: 'Court 1',
                final: 'Centre Court'
            }
        };
    }
    
    if (type === 'group') {
        state.courtNames.group[key] = value;
    } else if (type === 'knockout') {
        state.courtNames.knockout[key] = value;
    }
    
    state.saveCourtNamesToFirebase();
}

// ===== GROUP MANAGEMENT =====

function setGroupMode(mode) {
    if (!state || !state.canEdit()) return;

    const hasTeamsInGroups = CONFIG.ALL_GROUP_LETTERS.some(letter => state[`group${letter}`].length > 0);
    if (hasTeamsInGroups) {
        if (!confirm('Changing group mode will clear existing groups and fixtures. Continue?')) {
            renderTeamLeague();
            return;
        }
    }

    const modeLabels = { 'single_group': 'Single Group', 'two_groups': 'Two Groups', 'four_groups': 'Four Groups', 'six_groups': 'Six Groups', 'nine_groups': 'Nine Groups' };
    state.setGroupMode(mode);
    showToast(`✅ Group mode set to ${modeLabels[mode] || mode}`);
    renderTeamLeague();
}

function splitTeams() {
    if (!state || !state.canEdit()) return;
    
    if (state.teams.length < 2) {
        showToast('❌ Need at least 2 teams');
        return;
    }
    
    if (state.groupA.length > 0) {
        if (!confirm('This will re-split teams and clear fixtures. Continue?')) {
            return;
        }
    }
    
    const success = state.splitIntoGroups();
    if (success) {
        showToast('✅ Teams split into groups');
        renderTeamLeague();
    }
}

function generateFixtures() {
    if (!state || !state.canEdit()) return;
    
    if (state.groupA.length === 0) {
        showToast('❌ Split teams into groups first');
        return;
    }
    
    if (state.groupAFixtures.length > 0) {
        if (!confirm('This will regenerate fixtures and clear all scores. Continue?')) {
            return;
        }
    }
    
    const success = state.generateFixtures();
    if (success) {
        showToast('✅ Fixtures generated');
        renderTeamLeague();
    }
}

// ===== SWAP TEAMS BETWEEN GROUPS =====

function handleTeamClickForSwap(teamId) {
    if (!state || !state.canEdit()) return;

    // First click: select source team
    if (!state.swapSourceTeamId) {
        state.swapSourceTeamId = teamId;
        renderTeamLeague();
        return;
    }

    // Click on the same team again: deselect
    if (state.swapSourceTeamId === teamId) {
        state.swapSourceTeamId = null;
        renderTeamLeague();
        return;
    }

    // Second click: swap with target
    const sourceId = state.swapSourceTeamId;
    const targetId = teamId;
    const source = state.getTeamById(sourceId);
    const target = state.getTeamById(targetId);
    if (!source || !target) {
        state.swapSourceTeamId = null;
        renderTeamLeague();
        return;
    }

    const sourceGroup = source.group;
    const targetGroup = target.group;

    if (sourceGroup === targetGroup) {
        // Same group — nothing to swap, but reorder array (place source where target was and vice versa)
        const arr = state[`group${sourceGroup}`];
        const i = arr.indexOf(sourceId);
        const j = arr.indexOf(targetId);
        if (i !== -1 && j !== -1) {
            arr[i] = targetId;
            arr[j] = sourceId;
        }
    } else {
        // Different groups — swap group membership
        const sourceArr = state[`group${sourceGroup}`];
        const targetArr = state[`group${targetGroup}`];
        const i = sourceArr.indexOf(sourceId);
        const j = targetArr.indexOf(targetId);
        if (i !== -1) sourceArr[i] = targetId;
        if (j !== -1) targetArr[j] = sourceId;
        source.group = targetGroup;
        target.group = sourceGroup;
    }

    state.swapSourceTeamId = null;
    state.saveGroupsToFirebase();
    showToast(`✅ Swapped ${source.name} ↔ ${target.name}`);
    renderTeamLeague();
}

function cancelSwap() {
    if (!state) return;
    state.swapSourceTeamId = null;
    renderTeamLeague();
}

function exportFixturesCsv() {
    if (!state) return;
    const courtCount = Math.max(1, state.courtCount || 4);
    const courtNamesArr = (state.courtNames && state.courtNames.group) || [];
    const activeGroups = state.getActiveGroupLetters();

    // Collect all matches grouped by round, then assign slot/court (mirrors FixturesTab logic)
    const matchesByRound = {};
    activeGroups.forEach(g => {
        const fixtures = state[`group${g}Fixtures`] || [];
        fixtures.forEach((round, roundIdx) => {
            const roundNum = round.round || (roundIdx + 1);
            if (!matchesByRound[roundNum]) matchesByRound[roundNum] = [];
            round.matches.forEach((match, matchIdx) => {
                matchesByRound[roundNum].push({ group: g, roundNum, matchIdx, match });
            });
        });
    });

    const rows = [];
    rows.push(['Round', 'Court Round', 'Court', 'Group', 'Match #', 'Team 1', 'Team 2', 'Score 1', 'Score 2', 'Status']);

    Object.keys(matchesByRound).map(Number).sort((a, b) => a - b).forEach(roundNum => {
        const list = matchesByRound[roundNum];
        list.forEach((m, idx) => {
            const slot = Math.floor(idx / courtCount) + 1;
            const courtIdx = idx % courtCount;
            const courtName = courtNamesArr[courtIdx] || `Court ${courtIdx + 1}`;
            const t1 = state.getTeamById(m.match.team1Id);
            const t2 = state.getTeamById(m.match.team2Id);
            const score = state.getGroupScore(m.group, m.match.team1Id, m.match.team2Id);
            const s1 = score.team1Score !== null ? score.team1Score : '';
            const s2 = score.team2Score !== null ? score.team2Score : '';
            const status = (s1 !== '' && s2 !== '') ? 'Complete' : 'Pending';
            rows.push([
                roundNum,
                slot,
                courtName,
                m.group,
                m.matchIdx + 1,
                t1?.name || `Team ${m.match.team1Id}`,
                t2?.name || `Team ${m.match.team2Id}`,
                s1,
                s2,
                status
            ]);
        });
    });

    // Build CSV (RFC 4180: quote any field containing comma, quote, or newline; escape quotes by doubling)
    const escape = v => {
        const s = String(v ?? '');
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = rows.map(r => r.map(escape).join(',')).join('\r\n');

    // Trigger download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const tname = (state.tournamentName || 'tournament').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    a.href = url;
    a.download = `${tname}-fixtures-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`✅ Exported ${rows.length - 1} fixtures to CSV`);
}

function updateCourtCount(value) {
    if (!state || !state.canEdit()) return;
    const n = Math.max(1, Math.min(16, parseInt(value) || 1));
    state.courtCount = n;
    // Ensure we have enough court name slots; pad with defaults if needed
    if (!state.courtNames) state.courtNames = { group: [], knockout: {} };
    if (!Array.isArray(state.courtNames.group)) state.courtNames.group = [];
    while (state.courtNames.group.length < n) {
        state.courtNames.group.push(`Court ${state.courtNames.group.length + 1}`);
    }
    state.saveSettingToFirebase('courtCount', n);
    state.saveCourtNamesToFirebase();
    showToast(`✅ Court count set to ${n}`);
    renderTeamLeague();
}

function setQualifiersPerGroup(count) {
    // If we're inside a tournament (state exists), update tournament state
    if (typeof state !== 'undefined' && state && state.canEdit && state.canEdit()) {
        state.qualifiersPerGroup = parseInt(count);
        // Auto-set knockout format to match
        if (count == 4) state.knockoutFormat = 'round_of_16';
        else if (count == 2) state.knockoutFormat = 'quarter_final';
        else if (count == 1) state.knockoutFormat = 'semi_final';
        state.saveSettingToFirebase('qualifiersPerGroup', state.qualifiersPerGroup);
        state.saveSettingToFirebase('knockoutFormat', state.knockoutFormat);
        // Recompute knockout bracket if group stage data exists
        if (state.autoUpdateKnockoutBracket) state.autoUpdateKnockoutBracket();
        showToast(`✅ Qualifiers set to ${count} per group`);
        renderTeamLeague();
        return;
    }
    // Otherwise we're in the wizard - delegate to WizardState
    if (typeof WizardState !== 'undefined') {
        WizardState.qualifiersPerGroup = parseInt(count);
        if (count == 4) WizardState.knockoutFormat = 'round_of_16';
        else if (count == 2) WizardState.knockoutFormat = 'quarter_final';
        else if (count == 1) WizardState.knockoutFormat = 'semi_final';
        if (typeof renderWizardStep === 'function') renderWizardStep();
    }
}

function toggleThirdPlace(include) {
    if (!state || !state.canEdit()) return;
    state.setIncludeThirdPlace(include);
    showToast(include ? '✅ 3rd place playoff enabled' : '✅ 3rd place playoff disabled');
    renderTeamLeague();
}

// ===== KNOCKOUT =====

function setKnockoutFromStandings() {
    if (!state || !state.canEdit()) return;

    // 6/9 groups: no auto seeding
    const groupCount = CONFIG.GROUP_COUNT[state.groupMode] || 1;
    if (groupCount > 4) {
        showToast('⚠️ Auto knockout seeding not available for 6+ groups. Set knockout teams manually.');
        return;
    }

    const activeGroups = state.getActiveGroupLetters();
    const allComplete = activeGroups.every(g => state.isGroupStageComplete(g));

    if (!allComplete) {
        if (!confirm('Group stage is not complete. Set knockout teams from current standings anyway?')) {
            return;
        }
    }

    state.setKnockoutTeamsFromStandings();
    showToast('✅ Knockout teams set from standings');
    renderTeamLeague();
}

// ===== SCORING SETTINGS =====

function updateGroupMaxScore(value) {
    if (!state || !state.canEdit()) return;
    state.updateGroupMaxScore(value);
    showToast('✅ Group max score updated');
}

function updateKnockoutMaxScore(value) {
    if (!state || !state.canEdit()) return;
    state.updateKnockoutMaxScore(value);
    showToast('✅ Knockout max score updated');
}

function updateSemiMaxScore(value) {
    if (!state || !state.canEdit()) return;
    state.semiMaxScore = parseInt(value);
    state.saveSettingToFirebase('semiMaxScore', state.semiMaxScore);
    showToast('✅ Semi-final max score updated');
}

function updateFinalMaxScore(value) {
    if (!state || !state.canEdit()) return;
    state.finalMaxScore = parseInt(value);
    state.saveSettingToFirebase('finalMaxScore', state.finalMaxScore);
    showToast('✅ Final max score updated');
}

function updateKnockoutFormat(format) {
    if (!state || !state.canEdit()) return;
    state.knockoutFormat = format;
    state.saveSettingToFirebase('knockoutFormat', format);
    showToast('✅ Knockout format updated');
    renderTeamLeague();
}

function updateIncludeThirdPlace(include) {
    if (!state || !state.canEdit()) return;
    state.includeThirdPlace = include;
    state.saveSettingToFirebase('includeThirdPlace', include);
    showToast(`✅ 3rd place playoff ${include ? 'enabled' : 'disabled'}`);
    renderTeamLeague();
}

// ===== DANGER ZONE =====

function confirmResetScores() {
    if (!state || !state.canEdit()) return;
    
    if (confirm('Are you sure you want to reset ALL scores? This cannot be undone.')) {
        if (confirm('This will clear all group match scores and knockout scores. Really continue?')) {
            state.resetAllScores();
            showToast('✅ All scores reset');
            renderTeamLeague();
        }
    }
}

function exportTournamentData() {
    if (!state) return;
    
    const data = state.exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-league-${state.tournamentId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ Data exported');
}

// ===== MODALS =====

function showShareModal() {
    if (!state) return;

    const playerLink = Router.getPlayerLink(state.tournamentId);
    const organiserLink = state.organiserKey ? Router.getOrganiserLink(state.tournamentId, state.organiserKey) : null;
    const allGroupStandings = [...(state.getGroupStandings ? state.getGroupStandings('A') : []), ...(state.getGroupStandings ? state.getGroupStandings('B') : [])].sort((a, b) => b.points - a.points).map(s => ({ name: s.team?.name || '', points: s.points }));
    const shareButtonsHTML = typeof SocialShare !== 'undefined' ? SocialShare.getShareButtons(state.tournamentName || 'Team Tournament', state.tournamentId, 'team-league', playerLink, allGroupStandings) : '';

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🔗 Share Tournament</h2>
                </div>
                <div class="p-6 space-y-4">
                    ${shareButtonsHTML}
                    <div class="text-center mb-4">
                        <div class="text-lg font-bold text-gray-800">${state.tournamentName || 'Team Tournament'}</div>
                        <div class="text-sm text-gray-500">Code: <span class="font-mono font-bold text-purple-600">${state.tournamentId?.toUpperCase() || ''}</span></div>
                    </div>
                    
                    <div class="bg-purple-50 rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-semibold text-purple-800">👥 Player Link</span>
                            <button onclick="copyToClipboard('${playerLink}'); this.textContent = '✓ Copied!'; setTimeout(() => this.textContent = 'Copy', 2000)" class="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-lg font-medium transition-colors">Copy</button>
                        </div>
                        <div class="text-xs text-purple-600 font-mono break-all bg-white p-2 rounded-lg">${playerLink}</div>
                    </div>
                    
                    ${organiserLink ? `
                        <div class="bg-amber-50 rounded-xl p-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-semibold text-amber-800">🔑 Organiser Link</span>
                                <button onclick="copyToClipboard('${organiserLink}'); this.textContent = '✓ Copied!'; setTimeout(() => this.textContent = 'Copy', 2000)" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors">Copy</button>
                            </div>
                            <div class="text-xs text-amber-700 font-mono break-all bg-white p-2 rounded-lg">${organiserLink}</div>
                            <p class="text-xs text-amber-600 mt-2">⚠️ Keep this private!</p>
                        </div>
                    ` : ''}
                    
                    <div class="bg-purple-50 rounded-xl p-4">
                        <div class="text-sm font-semibold text-purple-800 mb-2">📺 TV Mode</div>
                        <p class="text-xs text-gray-500 mb-2">Full-screen leaderboard for wall-mounted screens</p>
                        <div class="flex items-center gap-2">
                            <input type="text" value="${Router.getTVLink(state.tournamentId)}" readonly class="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm font-mono" />
                            <button onclick="copyToClipboard('${Router.getTVLink(state.tournamentId)}'); showToast('✅ Copied!')" class="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600">Copy</button>
                        </div>
                    </div>

                    <button onclick="closeModal()" class="w-full px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Done</button>
                </div>
            </div>
        </div>
    `;
}

function showOrganiserLoginModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🔑 Organiser Login</h2>
                </div>
                <div class="p-6">
                    <p class="text-gray-600 mb-4">Enter the organiser passcode to edit this tournament.</p>
                    <div class="mb-4">
                        <input type="password" id="login-passcode" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-lg text-center" placeholder="Enter passcode" autofocus onkeypress="if(event.key === 'Enter') handleOrganiserLogin()" />
                    </div>
                    <div id="login-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">❌ Incorrect passcode</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleOrganiserLogin()" class="flex-1 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">Login</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('login-passcode')?.focus(), 100);
}

async function handleOrganiserLogin() {
    if (!state) return;
    
    const passcode = document.getElementById('login-passcode')?.value;
    const errorDiv = document.getElementById('login-error');
    
    if (!passcode) {
        errorDiv?.classList.remove('hidden');
        return;
    }
    
    const isValid = await state.verifyOrganiserKey(passcode);
    
    if (isValid) {
        closeModal();
        Router.navigate('tournament', state.tournamentId, passcode);
        showToast('✅ Logged in as organiser');
    } else {
        errorDiv?.classList.remove('hidden');
    }
}

function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

// ===== UTILITIES =====

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
}

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
    }, 2500);
}

console.log('✅ Team Tournament Handlers loaded');
