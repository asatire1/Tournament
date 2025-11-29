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

// ===== SCORE HANDLERS =====

function handleGroupScore(group, team1Id, team2Id, team1Score, team2Score) {
    if (!state || !state.canEdit()) return;
    
    const score1 = team1Score !== '' && team1Score !== null ? parseInt(team1Score) : null;
    const score2 = team2Score !== '' && team2Score !== null ? parseInt(team2Score) : null;
    
    // Only save if both scores are entered
    if (score1 !== null && score2 !== null) {
        state.updateGroupScore(group, team1Id, team2Id, score1, score2);
        showToast('✅ Score saved');
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
    
    const currentScore = state.getKnockoutScore(matchId);
    
    const score1 = team1Score !== null && team1Score !== '' 
        ? parseInt(team1Score) 
        : currentScore.team1Score;
    const score2 = team2Score !== null && team2Score !== '' 
        ? parseInt(team2Score) 
        : currentScore.team2Score;
    
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

// ===== GROUP MANAGEMENT =====

function setGroupMode(mode) {
    if (!state || !state.canEdit()) return;
    
    if (state.groupA.length > 0 || state.groupB.length > 0) {
        if (!confirm('Changing group mode will clear existing groups and fixtures. Continue?')) {
            renderTeamLeague();
            return;
        }
    }
    
    state.setGroupMode(mode);
    showToast(`✅ Group mode set to ${mode === 'two_groups' ? 'Two Groups' : 'Single Group'}`);
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

function toggleThirdPlace(include) {
    if (!state || !state.canEdit()) return;
    state.setIncludeThirdPlace(include);
    showToast(include ? '✅ 3rd place playoff enabled' : '✅ 3rd place playoff disabled');
    renderTeamLeague();
}

// ===== KNOCKOUT =====

function setKnockoutFromStandings() {
    if (!state || !state.canEdit()) return;
    
    const groupAComplete = state.isGroupStageComplete('A');
    const groupBComplete = state.groupMode === CONFIG.GROUP_MODES.SINGLE || state.isGroupStageComplete('B');
    
    if (!groupAComplete || !groupBComplete) {
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
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🔗 Share Tournament</h2>
                </div>
                <div class="p-6 space-y-4">
                    <div class="text-center mb-4">
                        <div class="text-lg font-bold text-gray-800">${state.tournamentName || 'Team League'}</div>
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

console.log('✅ Team League Handlers loaded');
