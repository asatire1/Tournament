// ===== SWISS SYSTEM EVENT HANDLERS =====
// Forked from Round Robin handlers, adapted for Swiss System.
// Swiss = dynamic round generation, "Complete Round & Generate Next" pattern.
// Colour theme: AMBER (from-amber-600 to-yellow-600 gradients, bg-amber-500 buttons).

// ===== TAB NAVIGATION =====

function setTab(tab) {
    if (!state) return;
    state.currentTab = tab;
    renderSwiss();
}

function setSettingsSubTab(subTab) {
    if (!state) return;
    state.settingsSubTab = subTab;
    renderSwiss();
}

// ===== SCORE HANDLERS =====

/**
 * Auto-fill the other score based on max score.
 * When user enters a score, automatically calculate the opponent's score.
 * Also enforces max score limit.
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

function handleScore(team1Id, team2Id, team1Score, team2Score) {
    if (!state || !state.canEdit()) return;

    const score1 = team1Score !== '' && team1Score !== null ? parseInt(team1Score) : null;
    const score2 = team2Score !== '' && team2Score !== null ? parseInt(team2Score) : null;

    // Only save if both scores are entered
    if (score1 !== null && score2 !== null) {
        state.updateScore(team1Id, team2Id, score1, score2);
        showToast('Score saved');
        setTimeout(() => renderSwiss(), 100);
    }
}

function clearScore(team1Id, team2Id) {
    if (!state || !state.canEdit()) return;

    if (confirm('Clear this score?')) {
        state.clearScore(team1Id, team2Id);
        renderSwiss();
        showToast('Score cleared');
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
        showToast('Please enter both player names');
        return;
    }

    if (isNaN(player1Rating) || isNaN(player2Rating)) {
        showToast('Please enter valid ratings');
        return;
    }

    if (player1Rating < 0 || player1Rating > 5 || player2Rating < 0 || player2Rating > 5) {
        showToast('Ratings must be between 0 and 5');
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

        showToast(`Team "${team.name}" added`);
        renderSwiss();
    }
}

function removeTeam(teamId) {
    if (!state || !state.canEdit()) return;

    const team = state.getTeamById(teamId);
    if (!team) return;

    if (confirm(`Remove team "${team.name}"? This will clear all rounds.`)) {
        state.removeTeam(teamId);
        showToast('Team removed');
        renderSwiss();
    }
}

// ===== TEAM EDITING =====

function startTeamEdit(teamId) {
    if (!state || !state.canEdit()) return;
    state.editingTeamId = teamId;
    renderSwiss();
}

function cancelTeamEdit() {
    if (!state) return;
    state.editingTeamId = null;
    renderSwiss();
}

function saveTeamEdit(teamId) {
    if (!state || !state.canEdit()) return;

    const p1Name = document.getElementById(`edit-p1-name-${teamId}`)?.value?.trim();
    const p1Rating = parseFloat(document.getElementById(`edit-p1-rating-${teamId}`)?.value) || 2.5;
    const p2Name = document.getElementById(`edit-p2-name-${teamId}`)?.value?.trim();
    const p2Rating = parseFloat(document.getElementById(`edit-p2-rating-${teamId}`)?.value) || 2.5;
    const teamName = document.getElementById(`edit-team-name-${teamId}`)?.value?.trim();

    if (!p1Name || !p2Name) {
        showToast('Player names required');
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
    showToast('Team updated');
    renderSwiss();
}

// ===== SWISS-SPECIFIC: ROUND GENERATION =====

/**
 * Generate the next Swiss round.
 * Validates that the current round is complete and the tournament is not finished.
 */
function generateNextRound() {
    if (!state || !state.canEdit()) return;

    if (state.rounds.length > 0 && !state.isCurrentRoundComplete()) {
        showToast('Complete all matches in the current round first');
        return;
    }

    if (state.isTournamentComplete()) {
        showToast('Tournament is already complete');
        return;
    }

    const success = state.generateNextRound();
    if (success) {
        showToast(`Round ${state.rounds.length} generated`);
        renderSwiss();
    }
}

// ===== SWISS-SPECIFIC: ROUND NAVIGATION =====

/**
 * Navigate between rounds by direction (+1 or -1).
 * Clamps to valid range [0, rounds.length - 1].
 */
function navigateRound(direction) {
    if (!state || !state.rounds || state.rounds.length === 0) return;

    const newIndex = state.displayRound + direction;
    if (newIndex >= 0 && newIndex < state.rounds.length) {
        state.displayRound = newIndex;
        renderSwiss();
    }
}

/**
 * Jump directly to a specific round index.
 */
function goToRound(roundIndex) {
    if (!state || !state.rounds || state.rounds.length === 0) return;

    if (roundIndex >= 0 && roundIndex < state.rounds.length) {
        state.displayRound = roundIndex;
        renderSwiss();
    }
}

// ===== COURT NAMES =====

function updateCourtName(index, value) {
    if (!state || !state.canEdit()) return;

    // Initialize court names if not exist
    if (!state.courtNames) {
        state.courtNames = ['Court 1', 'Court 2', 'Court 3', 'Court 4'];
    }

    state.courtNames[index] = value;
    state.saveCourtNamesToFirebase();
}

// ===== SCORING SETTINGS =====

function updateMaxScore(value) {
    if (!state || !state.canEdit()) return;
    state.maxScore = value;
    state.saveSettingToFirebase('maxScore', value);
    showToast('Max score updated');
    renderSwiss();
}

// ===== TOTAL ROUNDS =====

function updateTotalRounds(value) {
    if (!state || !state.canEdit()) return;

    const clamped = Math.max(CONFIG.MIN_ROUNDS, Math.min(CONFIG.MAX_ROUNDS, value));
    if (isNaN(clamped)) return;

    state.totalRounds = clamped;
    state.saveSettingToFirebase('totalRounds', clamped);
    showToast('Total rounds updated to ' + clamped);
    renderSwiss();
}

// ===== DANGER ZONE =====

function confirmResetRounds() {
    if (!state || !state.canEdit()) return;

    if (confirm('Are you sure you want to reset ALL rounds and scores? This cannot be undone.')) {
        if (confirm('This will delete all rounds, match history, and scores. Really continue?')) {
            state.rounds = [];
            state.matchHistory = {};
            state.matchScores = {};
            state.displayRound = 0;
            state.saveToFirebase();
            showToast('All rounds reset');
            renderSwiss();
        }
    }
}

function confirmResetScores() {
    if (!state || !state.canEdit()) return;

    if (confirm('Are you sure you want to reset ALL scores? This cannot be undone.')) {
        if (confirm('This will clear all match scores. Really continue?')) {
            state.resetAllScores();
            showToast('All scores reset');
            renderSwiss();
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
    a.download = `swiss-${state.tournamentId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Data exported');
}

// ===== MODALS =====

function showShareModal() {
    if (!state) return;

    const playerLink = Router.getPlayerLink(state.tournamentId);
    const organiserLink = state.organiserKey ? Router.getOrganiserLink(state.tournamentId, state.organiserKey) : null;
    const standings = (state.getStandings ? state.getStandings() : []).map(s => ({ name: s.name, points: s.points }));
    const shareButtonsHTML = typeof SocialShare !== 'undefined' ? SocialShare.getShareButtons(state.tournamentName || 'Swiss System Tournament', state.tournamentId, 'swiss', playerLink, standings) : '';

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">Share Tournament</h2>
                </div>
                <div class="p-6 space-y-4">
                    ${shareButtonsHTML}
                    <div class="text-center mb-4">
                        <div class="text-lg font-bold text-gray-800">${state.tournamentName || 'Swiss System Tournament'}</div>
                        <div class="text-sm text-gray-500">Code: <span class="font-mono font-bold text-amber-600">${state.tournamentId?.toUpperCase() || ''}</span></div>
                    </div>

                    <div class="bg-amber-50 rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-semibold text-amber-800">Player Link</span>
                            <button onclick="copyToClipboard('${playerLink}'); this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000)" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors">Copy</button>
                        </div>
                        <div class="text-xs text-amber-700 font-mono break-all bg-white p-2 rounded-lg">${playerLink}</div>
                    </div>

                    ${organiserLink ? `
                        <div class="bg-yellow-50 rounded-xl p-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-semibold text-yellow-800">Organiser Link</span>
                                <button onclick="copyToClipboard('${organiserLink}'); this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000)" class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-lg font-medium transition-colors">Copy</button>
                            </div>
                            <div class="text-xs text-yellow-700 font-mono break-all bg-white p-2 rounded-lg">${organiserLink}</div>
                            <p class="text-xs text-yellow-600 mt-2">Keep this private!</p>
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
                <div class="bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">Organiser Login</h2>
                </div>
                <div class="p-6">
                    <p class="text-gray-600 mb-4">Enter the organiser passcode to edit this tournament.</p>
                    <div class="mb-4">
                        <input type="password" id="login-passcode" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-lg text-center" placeholder="Enter passcode" autofocus onkeypress="if(event.key === 'Enter') handleOrganiserLogin()" />
                    </div>
                    <div id="login-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">Incorrect passcode</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleOrganiserLogin()" class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">Login</button>
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
        showToast('Logged in as organiser');
    } else {
        errorDiv?.classList.remove('hidden');
    }
}

// ===== JOIN MODAL =====

function showJoinModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">Join Tournament</h2>
                </div>
                <div class="p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tournament Code</label>
                        <input type="text" id="join-code" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-lg text-center tracking-widest uppercase" placeholder="ABC123" maxlength="10" autofocus onkeypress="if(event.key === 'Enter') handleJoinTournament()" />
                    </div>
                    <div id="join-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">Tournament not found</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleJoinTournament()" class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">Join</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('join-code')?.focus(), 100);
}

async function handleJoinTournament() {
    const code = document.getElementById('join-code')?.value?.trim().toLowerCase();
    const errorDiv = document.getElementById('join-error');

    if (!code) {
        errorDiv?.classList.remove('hidden');
        return;
    }

    try {
        const snapshot = await database.ref(`swiss-tournaments/${code}/meta`).once('value');
        const exists = snapshot.exists();

        if (exists) {
            closeModal();
            Router.navigate('tournament', code);
        } else {
            errorDiv?.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv?.classList.remove('hidden');
    }
}

// ===== CLOSE MODAL =====

function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

// ===== CREATE MODAL (WIZARD - 6 STEPS) =====

const CreateWizard = {
    currentStep: 1,
    totalSteps: 6,
    tournamentName: '',
    maxScore: 16,
    teams: [],
    totalRounds: 0,
    accessMode: 'anyone',
    passcode: '',

    reset() {
        this.currentStep = 1;
        this.tournamentName = '';
        this.maxScore = 16;
        this.teams = [];
        this.totalRounds = 0;
        this.accessMode = 'anyone';
        this.passcode = '';
    }
};

function showCreateModal() {
    CreateWizard.reset();
    renderCreateWizardStep();
}

function renderCreateWizardStep() {
    const step = CreateWizard.currentStep;

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <!-- Header with Progress -->
                <div class="bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-5">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-xl font-bold text-white">Create Swiss Tournament</h2>
                        <span class="text-white/80 text-sm">Step ${step} of ${CreateWizard.totalSteps}</span>
                    </div>
                    <!-- Progress Bar -->
                    <div class="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div class="h-full bg-white rounded-full transition-all duration-300" style="width: ${(step / CreateWizard.totalSteps) * 100}%"></div>
                    </div>
                </div>

                <div class="p-6">
                    ${step === 1 ? renderCreateStep1() : ''}
                    ${step === 2 ? renderCreateStep2() : ''}
                    ${step === 3 ? renderCreateStep3() : ''}
                    ${step === 4 ? renderCreateStep4() : ''}
                    ${step === 5 ? renderCreateStep5() : ''}
                    ${step === 6 ? renderCreateStep6() : ''}
                </div>
            </div>
        </div>
    `;

    // Auto-focus first input
    setTimeout(() => {
        const firstInput = document.querySelector('#wizard-content input:not([type="radio"]):not([type="checkbox"])');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Step 1: Tournament Name
function renderCreateStep1() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Tournament Name</h3>
            <p class="text-gray-500 text-sm mb-6">Give your Swiss system tournament a name</p>

            <div>
                <input
                    type="text"
                    id="wizard-name"
                    value="${CreateWizard.tournamentName}"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-lg"
                    placeholder="e.g. Saturday Swiss System"
                    maxlength="50"
                    onkeypress="if(event.key === 'Enter') createWizardNext()"
                />
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                Cancel
            </button>
            <button onclick="createWizardNext()" class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                Next
            </button>
        </div>
    `;
}

// Step 2: Points per match
function renderCreateStep2() {
    const options = [16, 21, 24, 32];

    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Points Per Match</h3>
            <p class="text-gray-500 text-sm mb-6">How many points per match?</p>

            <div class="grid grid-cols-2 gap-3">
                ${options.map(pts => `
                    <button
                        onclick="selectMaxScore(${pts})"
                        class="p-4 rounded-xl border-2 text-center font-semibold text-lg transition-colors ${CreateWizard.maxScore === pts ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-amber-300 text-gray-700'}"
                    >
                        ${pts}
                    </button>
                `).join('')}
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="createWizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                Back
            </button>
            <button onclick="createWizardNext()" class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                Next
            </button>
        </div>
    `;
}

function selectMaxScore(pts) {
    CreateWizard.maxScore = pts;
    renderCreateWizardStep();
}

// Step 3: Add Teams
function renderCreateStep3() {
    const teams = CreateWizard.teams;

    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Add Teams</h3>
            <p class="text-gray-500 text-sm mb-4">Add at least 4 teams. Each team has two players.</p>

            <!-- Add Team Form -->
            <div class="bg-gray-50 rounded-xl p-4 mb-4">
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Player 1 Name</label>
                        <input type="text" id="wiz-p1-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" placeholder="Player 1" />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Rating (0-5)</label>
                        <input type="number" id="wiz-p1-rating" min="0" max="5" step="0.1" value="2.5" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" />
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Player 2 Name</label>
                        <input type="text" id="wiz-p2-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" placeholder="Player 2" />
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Rating (0-5)</label>
                        <input type="number" id="wiz-p2-rating" min="0" max="5" step="0.1" value="2.5" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" />
                    </div>
                </div>
                <div class="mb-3">
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Team Name (optional)</label>
                    <input type="text" id="wiz-team-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none" placeholder="Auto-generated if blank" />
                </div>
                <button onclick="addWizardTeam()" class="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors">
                    + Add Team
                </button>
            </div>

            <!-- Team List -->
            ${teams.length > 0 ? `
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${teams.map((team, idx) => `
                        <div class="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-gray-800 text-sm truncate">${team.name}</div>
                                <div class="text-xs text-gray-500">${team.player1Name} (${team.player1Rating}) & ${team.player2Name} (${team.player2Rating})</div>
                            </div>
                            <button onclick="removeWizardTeam(${idx})" class="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="text-center mt-2">
                    <span class="text-sm ${teams.length >= 4 ? 'text-amber-600 font-semibold' : 'text-gray-500'}">${teams.length} team${teams.length !== 1 ? 's' : ''} added ${teams.length < 4 ? '(min 4 required)' : ''}</span>
                </div>
            ` : `
                <div class="text-center py-6 text-gray-400 text-sm">
                    No teams added yet. Add at least 4 teams.
                </div>
            `}

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="createWizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                Back
            </button>
            <button onclick="createWizardNext()" class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                Next
            </button>
        </div>
    `;
}

function addWizardTeam() {
    const p1Name = document.getElementById('wiz-p1-name')?.value?.trim();
    const p1Rating = parseFloat(document.getElementById('wiz-p1-rating')?.value);
    const p2Name = document.getElementById('wiz-p2-name')?.value?.trim();
    const p2Rating = parseFloat(document.getElementById('wiz-p2-rating')?.value);
    const teamName = document.getElementById('wiz-team-name')?.value?.trim();

    if (!p1Name || !p2Name) {
        showCreateWizardError('Please enter both player names');
        return;
    }

    if (isNaN(p1Rating) || isNaN(p2Rating)) {
        showCreateWizardError('Please enter valid ratings');
        return;
    }

    if (p1Rating < 0 || p1Rating > 5 || p2Rating < 0 || p2Rating > 5) {
        showCreateWizardError('Ratings must be between 0 and 5');
        return;
    }

    CreateWizard.teams.push({
        player1Name: p1Name,
        player1Rating: p1Rating,
        player2Name: p2Name,
        player2Rating: p2Rating,
        name: teamName || `${p1Name.split(' ')[0]} & ${p2Name.split(' ')[0]}`
    });

    renderCreateWizardStep();
}

function removeWizardTeam(index) {
    CreateWizard.teams.splice(index, 1);
    renderCreateWizardStep();
}

// Step 4: Number of Rounds (NEW - Swiss-specific)
function renderCreateStep4() {
    const suggested = CreateWizard.teams.length > 0
        ? calculateSuggestedRounds(CreateWizard.teams.length)
        : 4;
    if (!CreateWizard.totalRounds) CreateWizard.totalRounds = suggested;

    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Number of Rounds</h3>
            <p class="text-gray-500 text-sm mb-6">How many rounds? Suggested: ${suggested} for ${CreateWizard.teams.length} teams</p>

            <div class="flex items-center justify-center gap-4 mb-4">
                <button onclick="adjustRounds(-1)" class="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xl font-bold transition-colors">-</button>
                <div class="text-4xl font-bold text-amber-600 w-16 text-center">${CreateWizard.totalRounds}</div>
                <button onclick="adjustRounds(1)" class="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xl font-bold transition-colors">+</button>
            </div>

            <p class="text-xs text-gray-400 text-center">Min: ${CONFIG.MIN_ROUNDS}, Max: ${CONFIG.MAX_ROUNDS}</p>

            <div class="mt-4 bg-amber-50 rounded-xl p-3">
                <p class="text-xs text-amber-700 text-center">
                    Swiss formula: ceil(log2(teams)) = ${suggested} rounds for ${CreateWizard.teams.length} teams.
                    More rounds = more accurate final standings.
                </p>
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="createWizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                Back
            </button>
            <button onclick="createWizardNext()" class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                Next
            </button>
        </div>
    `;
}

function adjustRounds(delta) {
    CreateWizard.totalRounds = Math.max(CONFIG.MIN_ROUNDS, Math.min(CONFIG.MAX_ROUNDS, CreateWizard.totalRounds + delta));
    renderCreateWizardStep();
}

// Step 5: Access Mode (was Step 4 in Round Robin)
function renderCreateStep5() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Access Mode</h3>
            <p class="text-gray-500 text-sm mb-6">Who can view this tournament?</p>

            <div class="space-y-3">
                <label class="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${CreateWizard.accessMode === 'anyone' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}" onclick="selectAccessMode('anyone')">
                    <input type="radio" name="access-mode" value="anyone"
                        ${CreateWizard.accessMode === 'anyone' ? 'checked' : ''}
                        class="w-4 h-4 text-amber-500" />
                    <div class="flex-1">
                        <span class="font-medium text-gray-800">Public</span>
                        <p class="text-xs text-gray-500">Anyone with the code can view</p>
                    </div>
                </label>

                <label class="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${CreateWizard.accessMode === 'private' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}" onclick="selectAccessMode('private')">
                    <input type="radio" name="access-mode" value="private"
                        ${CreateWizard.accessMode === 'private' ? 'checked' : ''}
                        class="w-4 h-4 text-amber-500" />
                    <div class="flex-1">
                        <span class="font-medium text-gray-800">Private</span>
                        <p class="text-xs text-gray-500">Only accessible with organiser link</p>
                    </div>
                </label>
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="createWizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                Back
            </button>
            <button onclick="createWizardNext()" class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                Next
            </button>
        </div>
    `;
}

function selectAccessMode(mode) {
    CreateWizard.accessMode = mode;
    renderCreateWizardStep();
}

// Step 6: Passcode + Summary (was Step 5 in Round Robin)
function renderCreateStep6() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Organiser Passcode</h3>
            <p class="text-gray-500 text-sm mb-6">Create a passcode to manage this tournament</p>

            <div class="space-y-4">
                <div>
                    <input
                        type="password"
                        id="wizard-passcode"
                        value="${CreateWizard.passcode}"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-lg text-center tracking-widest"
                        placeholder="Min 6 characters"
                        maxlength="20"
                    />
                    <p class="text-xs text-gray-500 mt-1">You will need this to edit scores. Keep it secret!</p>
                </div>

                <div>
                    <input
                        type="password"
                        id="wizard-passcode-confirm"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-lg text-center tracking-widest"
                        placeholder="Confirm passcode"
                        maxlength="20"
                        onkeypress="if(event.key === 'Enter') createTournamentFromWizard()"
                    />
                </div>
            </div>

            <!-- Summary -->
            <div class="mt-6 bg-gray-50 rounded-xl p-4">
                <h4 class="font-semibold text-gray-800 mb-3">Summary</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Tournament</span>
                        <span class="font-medium text-gray-800">${CreateWizard.tournamentName || 'Swiss System'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Points per match</span>
                        <span class="font-medium text-gray-800">${CreateWizard.maxScore}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Teams</span>
                        <span class="font-medium text-gray-800">${CreateWizard.teams.length}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Rounds</span>
                        <span class="font-medium text-amber-700">${CreateWizard.totalRounds}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Access</span>
                        <span class="font-medium text-gray-800">${CreateWizard.accessMode === 'anyone' ? 'Public' : 'Private'}</span>
                    </div>
                </div>
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="createWizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                Back
            </button>
            <button onclick="createTournamentFromWizard()" class="flex-1 px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl font-semibold transition-colors">
                Create Tournament
            </button>
        </div>
    `;
}

// ===== CREATE WIZARD NAVIGATION =====

function createWizardNext() {
    const step = CreateWizard.currentStep;

    if (step === 1) {
        const name = document.getElementById('wizard-name')?.value?.trim();
        if (!name) {
            showCreateWizardError('Please enter a tournament name');
            return;
        }
        CreateWizard.tournamentName = name;
    }

    if (step === 2) {
        // maxScore already set via selectMaxScore
    }

    if (step === 3) {
        if (CreateWizard.teams.length < 4) {
            showCreateWizardError('Add at least 4 teams to continue');
            return;
        }
    }

    if (step === 4) {
        // totalRounds already set via adjustRounds; validate bounds
        if (CreateWizard.totalRounds < CONFIG.MIN_ROUNDS || CreateWizard.totalRounds > CONFIG.MAX_ROUNDS) {
            showCreateWizardError(`Rounds must be between ${CONFIG.MIN_ROUNDS} and ${CONFIG.MAX_ROUNDS}`);
            return;
        }
    }

    if (step === 5) {
        // accessMode already set via selectAccessMode
    }

    if (step < CreateWizard.totalSteps) {
        CreateWizard.currentStep++;
        renderCreateWizardStep();
    }
}

function createWizardBack() {
    if (CreateWizard.currentStep > 1) {
        CreateWizard.currentStep--;
        renderCreateWizardStep();
    }
}

function showCreateWizardError(message) {
    const errorDiv = document.getElementById('wizard-error');
    const errorText = document.getElementById('wizard-error-text');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

// ===== CREATE TOURNAMENT =====

async function createTournamentFromWizard() {
    const passcode = document.getElementById('wizard-passcode')?.value;
    const passcodeConfirm = document.getElementById('wizard-passcode-confirm')?.value;

    // Minimum 6: the passcode is this format's organiser key, and
    // tournamentSecrets rejects a key shorter than 6 characters — a shorter
    // one could not be seeded and the organiser could never re-claim the
    // tournament on another device.
    if (!passcode || passcode.length < 6) {
        showCreateWizardError('Passcode must be at least 6 characters');
        return;
    }

    if (passcode !== passcodeConfirm) {
        showCreateWizardError('Passcodes do not match');
        return;
    }

    CreateWizard.passcode = passcode;

    // Generate tournament ID (6 char random)
    const tournamentId = Router.generateTournamentId();

    // Build teams array
    const teams = CreateWizard.teams.map((team, index) => ({
        id: index + 1,
        name: team.name,
        player1Name: team.player1Name,
        player1Rating: team.player1Rating,
        player2Name: team.player2Name,
        player2Rating: team.player2Rating,
        combinedRating: parseFloat((team.player1Rating + team.player2Rating).toFixed(2))
    }));

    // Generate round 1 using Swiss pairing (seed by rating)
    const round1 = generateSwissRound(teams, {}, {}, 1);

    // Build matchHistory from round 1
    const matchHistory = {};
    round1.matches.forEach(match => {
        const key = _matchKey(match.team1Id, match.team2Id);
        matchHistory[key] = true;
    });

    // Get organizer UID for cross-device "My Tournaments"
    let organizerUid = null;
    if (typeof OrganizerAuth !== 'undefined') {
        try {
            organizerUid = await OrganizerAuth.ensureUid();
        } catch (e) {
            console.warn('Could not get organizer UID:', e);
        }
    }

    // Prepare data for Firebase
    const data = {
        meta: {
            name: CreateWizard.tournamentName,
            // No organiserKey here: for this format the passcode IS the
            // organiser key, and meta is world-readable — storing it here
            // published it. It goes to tournamentSecrets via
            // seedTournamentSecret() below, which no client can read.
            formatType: 'swiss',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            organizerUid: organizerUid,
            accessMode: CreateWizard.accessMode
        },
        teams: teams,
        rounds: [round1],
        matchHistory: matchHistory,
        totalRounds: CreateWizard.totalRounds,
        matchScores: {},
        maxScore: CreateWizard.maxScore,
        courtNames: ['Court 1', 'Court 2', 'Court 3', 'Court 4']
    };

    try {
        await database.ref(`swiss-tournaments/${tournamentId}`).set(data);
        console.log(`Tournament ${tournamentId} created`);

        // Seed the unreadable secrets node so this organiser can prove
        // ownership later. Must follow the write above — the rule checks
        // meta/organizerUid. The passcode is the organiser key here.
        await seedTournamentSecret(tournamentId, {
            root: 'swiss-tournaments',
            key: CreateWizard.passcode
        });

        // Save to My Tournaments
        if (typeof MyTournaments !== 'undefined') {
            MyTournaments.add(tournamentId, CreateWizard.tournamentName);
        }

        // Invalidate cloud cache so new tournament shows up
        if (typeof MyTournamentsCloud !== 'undefined') {
            MyTournamentsCloud.invalidateCache();
        }

        closeModal();
        Router.navigate('tournament', tournamentId, CreateWizard.passcode);

    } catch (error) {
        console.error('Error creating tournament:', error);
        showCreateWizardError('Failed to create tournament: ' + (error.message || error));
    }
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

function formatTimeAgo(isoString) {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

console.log('Swiss System Handlers loaded');
