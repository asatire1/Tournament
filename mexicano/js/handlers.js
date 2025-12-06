/**
 * handlers.js - Event Handlers for Mexicano Tournament
 * Modal management, form submissions, and user interactions
 */

// Wizard data storage
let wizardData = {
    name: '',
    mode: 'individual',
    pointsPerMatch: 24,
    players: [],
    teams: [],
    passcode: ''
};

// ===== CREATE WIZARD =====

/**
 * Show create tournament modal - Step 1: Basic Info
 */
function showCreateModal() {
    wizardData = {
        name: '',
        mode: 'individual',
        pointsPerMatch: 24,
        players: [],
        teams: [],
        passcode: ''
    };
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target === this) closeModal()">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">🎯 Create Mexicano Session</h2>
                    <p class="text-teal-100 text-sm mt-1">Step 1 of 3: Basic Info</p>
                </div>
                <div class="p-6">
                    <div class="mb-5">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Session Name</label>
                        <input type="text" id="create-name" 
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none" 
                            placeholder="Friday Night Mexicano" maxlength="40" 
                            onkeypress="if(event.key === 'Enter') goToStep2()" />
                    </div>
                    
                    <div class="mb-5">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">Mode</label>
                        <div class="grid grid-cols-2 gap-3">
                            <button type="button" onclick="selectMode('individual')" id="mode-individual" 
                                class="p-4 rounded-xl border-2 border-teal-500 bg-teal-50 text-left transition-all">
                                <div class="text-xl mb-1">🔄</div>
                                <div class="font-semibold text-gray-800">Individual</div>
                                <div class="text-xs text-gray-500">Rotating partners</div>
                            </button>
                            <button type="button" onclick="selectMode('team')" id="mode-team" 
                                class="p-4 rounded-xl border-2 border-gray-200 text-left transition-all hover:border-gray-300">
                                <div class="text-xl mb-1">👯</div>
                                <div class="font-semibold text-gray-800">Team</div>
                                <div class="text-xs text-gray-500">Fixed partners</div>
                            </button>
                        </div>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">Points Per Match</label>
                        <div class="grid grid-cols-3 gap-3">
                            <button type="button" onclick="selectPoints(16)" id="points-16" 
                                class="p-3 rounded-xl border-2 border-gray-200 text-center transition-all hover:border-gray-300">
                                <div class="text-xl font-bold text-gray-800">16</div>
                                <div class="text-xs text-gray-500">~8 min</div>
                            </button>
                            <button type="button" onclick="selectPoints(24)" id="points-24" 
                                class="p-3 rounded-xl border-2 border-teal-500 bg-teal-50 text-center transition-all">
                                <div class="text-xl font-bold text-gray-800">24</div>
                                <div class="text-xs text-gray-500">~12 min</div>
                            </button>
                            <button type="button" onclick="selectPoints(32)" id="points-32" 
                                class="p-3 rounded-xl border-2 border-gray-200 text-center transition-all hover:border-gray-300">
                                <div class="text-xl font-bold text-gray-800">32</div>
                                <div class="text-xs text-gray-500">~16 min</div>
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onclick="goToStep2()" class="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold transition-colors">Next →</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => document.getElementById('create-name')?.focus(), 100);
}

function selectMode(mode) {
    wizardData.mode = mode;
    document.getElementById('mode-individual').className = `p-4 rounded-xl border-2 ${mode === 'individual' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'} text-left transition-all`;
    document.getElementById('mode-team').className = `p-4 rounded-xl border-2 ${mode === 'team' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'} text-left transition-all`;
}

function selectPoints(pts) {
    wizardData.pointsPerMatch = pts;
    [16, 24, 32].forEach(p => {
        document.getElementById(`points-${p}`).className = `p-3 rounded-xl border-2 ${p === pts ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'} text-center transition-all`;
    });
}

/**
 * Step 2: Add Players/Teams
 */
function goToStep2() {
    const name = document.getElementById('create-name').value.trim();
    if (!name) {
        showToast('⚠️ Please enter a session name');
        return;
    }
    wizardData.name = name;
    showAddPlayersModal();
}

function showAddPlayersModal() {
    const isTeam = wizardData.mode === 'team';
    const min = isTeam ? CONFIG.MIN_TEAMS : CONFIG.MIN_PLAYERS_INDIVIDUAL;
    const items = isTeam ? wizardData.teams : wizardData.players;
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target === this) closeModal()">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">${isTeam ? '👯 Add Teams' : '👥 Add Players'}</h2>
                    <p class="text-teal-100 text-sm mt-1">Step 2 of 3: ${isTeam ? 'Teams' : 'Players'}</p>
                </div>
                <div class="p-6">
                    <p class="text-gray-500 text-sm mb-4">Minimum ${min} ${isTeam ? 'teams' : 'players'} required</p>
                    
                    ${isTeam ? `
                        <div class="flex gap-2 mb-4">
                            <input type="text" id="player1-input" class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none" placeholder="Player 1" maxlength="20" />
                            <input type="text" id="player2-input" class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none" placeholder="Player 2" maxlength="20" onkeypress="if(event.key==='Enter')addTeamToWizard()" />
                        </div>
                        <button onclick="addTeamToWizard()" class="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-colors mb-4">+ Add Team</button>
                    ` : `
                        <div class="flex gap-2 mb-4">
                            <input type="text" id="player-input" class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none" placeholder="Player name" maxlength="20" onkeypress="if(event.key==='Enter')addPlayerToWizard()" />
                            <button onclick="addPlayerToWizard()" class="px-5 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-colors">Add</button>
                        </div>
                    `}
                    
                    <div id="players-list" class="space-y-2 mb-6 max-h-48 overflow-y-auto">
                        ${renderWizardPlayersList()}
                    </div>
                    
                    <div class="flex gap-3">
                        <button onclick="showCreateModal()" class="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">← Back</button>
                        <button onclick="goToStep3()" id="btn-next" class="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed" ${items.length < min ? 'disabled' : ''}>
                            Next (${items.length}/${min}+) →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const input = document.getElementById(isTeam ? 'player1-input' : 'player-input');
        if (input) input.focus();
    }, 100);
}

function renderWizardPlayersList() {
    const isTeam = wizardData.mode === 'team';
    const items = isTeam ? wizardData.teams : wizardData.players;
    
    if (items.length === 0) {
        return `<div class="text-center py-6 text-gray-400">No ${isTeam ? 'teams' : 'players'} added yet</div>`;
    }
    
    return items.map((item, i) => `
        <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div class="w-8 h-8 rounded-lg ${isTeam ? getTeamColor(i) : getPlayerColor(i)} flex items-center justify-center text-white font-bold text-sm">${i + 1}</div>
            <span class="flex-1 font-medium text-gray-800">${isTeam ? `${item.player1} & ${item.player2}` : item.name}</span>
            <button onclick="removeWizardItem(${i})" class="text-gray-400 hover:text-red-500 transition-colors">✕</button>
        </div>
    `).join('');
}

function addPlayerToWizard() {
    const input = document.getElementById('player-input');
    const name = input.value.trim();
    
    if (!name) {
        showToast('⚠️ Enter a player name');
        return;
    }
    
    if (wizardData.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ Player already added');
        return;
    }
    
    wizardData.players.push({
        id: generateId(),
        name,
        totalPoints: 0,
        matchesPlayed: 0
    });
    
    input.value = '';
    input.focus();
    refreshWizardPlayersList();
}

function addTeamToWizard() {
    const i1 = document.getElementById('player1-input');
    const i2 = document.getElementById('player2-input');
    const p1 = i1.value.trim();
    const p2 = i2.value.trim();
    
    if (!p1 || !p2) {
        showToast('⚠️ Enter both player names');
        return;
    }
    
    wizardData.teams.push({
        id: generateId(),
        player1: p1,
        player2: p2,
        teamName: `${p1} & ${p2}`,
        totalPoints: 0,
        matchesPlayed: 0
    });
    
    i1.value = '';
    i2.value = '';
    i1.focus();
    refreshWizardPlayersList();
}

function removeWizardItem(index) {
    if (wizardData.mode === 'team') {
        wizardData.teams.splice(index, 1);
    } else {
        wizardData.players.splice(index, 1);
    }
    refreshWizardPlayersList();
}

function refreshWizardPlayersList() {
    const isTeam = wizardData.mode === 'team';
    const items = isTeam ? wizardData.teams : wizardData.players;
    const min = isTeam ? CONFIG.MIN_TEAMS : CONFIG.MIN_PLAYERS_INDIVIDUAL;
    
    document.getElementById('players-list').innerHTML = renderWizardPlayersList();
    
    const btn = document.getElementById('btn-next');
    btn.disabled = items.length < min;
    btn.textContent = `Next (${items.length}/${min}+) →`;
}

/**
 * Step 3: Tournament Mode (who can join)
 */
function goToStep3() {
    const isTeam = wizardData.mode === 'team';
    const items = isTeam ? wizardData.teams : wizardData.players;
    const min = isTeam ? CONFIG.MIN_TEAMS : CONFIG.MIN_PLAYERS_INDIVIDUAL;
    
    if (items.length < min) {
        showToast(`⚠️ Add at least ${min} ${isTeam ? 'teams' : 'players'}`);
        return;
    }
    
    // Check user permissions for mode selection
    const currentUser = getCurrentUser();
    const isVerified = currentUser && currentUser.type === 'registered' && currentUser.status === 'verified';
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target === this) closeModal()">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">🌍 Who Can Join?</h2>
                    <p class="text-teal-100 text-sm mt-1">Step 3 of 4: Access</p>
                </div>
                <div class="p-6">
                    <div class="text-center mb-4">
                        <span class="text-sm text-gray-500">${wizardData.name} • ${wizardData.mode === 'individual' ? wizardData.players.length + ' players' : wizardData.teams.length + ' teams'}</span>
                    </div>
                    
                    <div class="space-y-2 mb-4">
                        <label class="flex items-center gap-3 p-3 border-2 border-teal-500 bg-teal-50 rounded-xl cursor-pointer tournament-mode-option" data-mode="anyone">
                            <input type="radio" name="tournament-mode" value="anyone" checked class="w-4 h-4 text-teal-600" onchange="selectTournamentModeOption('anyone')">
                            <div class="flex-1">
                                <div class="font-semibold text-gray-800 text-sm">🌍 Anyone</div>
                                <div class="text-xs text-gray-500">Guests and registered players</div>
                            </div>
                        </label>
                        
                        <label class="flex items-center gap-3 p-3 border-2 ${isVerified ? 'border-gray-200 hover:border-teal-300' : 'border-gray-100 opacity-50'} rounded-xl ${isVerified ? 'cursor-pointer' : 'cursor-not-allowed'} tournament-mode-option" data-mode="registered">
                            <input type="radio" name="tournament-mode" value="registered" ${!isVerified ? 'disabled' : ''} class="w-4 h-4 text-teal-600" onchange="selectTournamentModeOption('registered')">
                            <div class="flex-1">
                                <div class="font-semibold text-gray-800 text-sm">👥 Registered Only</div>
                                <div class="text-xs text-gray-500">Only registered players</div>
                            </div>
                            ${!isVerified ? '<span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Verified only</span>' : ''}
                        </label>
                        
                        <label class="flex items-center gap-3 p-3 border-2 ${isVerified ? 'border-gray-200 hover:border-teal-300' : 'border-gray-100 opacity-50'} rounded-xl ${isVerified ? 'cursor-pointer' : 'cursor-not-allowed'} tournament-mode-option" data-mode="level-based">
                            <input type="radio" name="tournament-mode" value="level-based" ${!isVerified ? 'disabled' : ''} class="w-4 h-4 text-teal-600" onchange="selectTournamentModeOption('level-based')">
                            <div class="flex-1">
                                <div class="font-semibold text-gray-800 text-sm">🎯 Level-Based</div>
                                <div class="text-xs text-gray-500">Verified players in level range</div>
                            </div>
                            ${!isVerified ? '<span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Verified only</span>' : ''}
                        </label>
                    </div>
                    <input type="hidden" id="selected-access-mode" value="anyone" />
                    
                    <!-- Level Range (shown only for level-based mode) -->
                    <div id="level-range-container" class="hidden mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
                        <label class="block text-xs font-semibold text-purple-800 mb-2">Level Range</label>
                        <div class="flex items-center gap-2">
                            <input type="number" id="level-min" step="0.1" min="0" max="10" value="0.0"
                                class="flex-1 px-2 py-1.5 border border-purple-200 rounded-lg text-center text-sm font-semibold">
                            <span class="text-purple-400 text-sm">to</span>
                            <input type="number" id="level-max" step="0.1" min="0" max="10" value="10.0"
                                class="flex-1 px-2 py-1.5 border border-purple-200 rounded-lg text-center text-sm font-semibold">
                        </div>
                    </div>
                    
                    <div class="flex gap-3">
                        <button onclick="showAddPlayersModal()" class="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">← Back</button>
                        <button onclick="goToStep4()" class="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold transition-colors">Next →</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Select tournament access mode
 */
function selectTournamentModeOption(mode) {
    document.getElementById('selected-access-mode').value = mode;
    
    // Update visual selection
    document.querySelectorAll('.tournament-mode-option').forEach(opt => {
        const optMode = opt.dataset.mode;
        if (optMode === mode) {
            opt.classList.remove('border-gray-200', 'border-gray-100');
            opt.classList.add('border-teal-500', 'bg-teal-50');
        } else {
            opt.classList.remove('border-teal-500', 'bg-teal-50');
            if (!opt.querySelector('input').disabled) {
                opt.classList.add('border-gray-200');
            } else {
                opt.classList.add('border-gray-100');
            }
        }
    });
    
    // Show/hide level range
    const levelContainer = document.getElementById('level-range-container');
    if (mode === 'level-based') {
        levelContainer.classList.remove('hidden');
    } else {
        levelContainer.classList.add('hidden');
    }
}

/**
 * Get current user from localStorage
 */
function getCurrentUser() {
    try {
        const data = localStorage.getItem('uber_padel_user');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Step 4: Passcode
 */
function goToStep4() {
    const accessMode = document.getElementById('selected-access-mode')?.value || 'anyone';
    wizardData.accessMode = accessMode;
    
    if (accessMode === 'level-based') {
        wizardData.levelMin = parseFloat(document.getElementById('level-min')?.value || '0');
        wizardData.levelMax = parseFloat(document.getElementById('level-max')?.value || '10');
        
        if (wizardData.levelMin >= wizardData.levelMax) {
            showToast('❌ Max level must be greater than min level');
            return;
        }
    }
    
    const modeLabels = { 'anyone': '🌍 Open', 'registered': '👥 Registered', 'level-based': '🎯 Level' };
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target === this) closeModal()">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">🔐 Organiser Passcode</h2>
                    <p class="text-teal-100 text-sm mt-1">Step 4 of 4: Security</p>
                </div>
                <div class="p-6">
                    <div class="text-center mb-4">
                        <span class="text-sm text-gray-500">${wizardData.name} • ${wizardData.mode === 'individual' ? wizardData.players.length + 'p' : wizardData.teams.length + 't'} • ${modeLabels[accessMode]}</span>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Set a Passcode</label>
                        <input type="password" id="create-passcode" 
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none text-center text-lg tracking-widest" 
                            placeholder="••••" maxlength="20"
                            onkeypress="if(event.key === 'Enter') handleCreateTournament()" />
                        <p class="text-xs text-gray-500 mt-2">You'll need this passcode to edit scores. Keep it secret!</p>
                    </div>
                    
                    <div class="flex gap-3">
                        <button onclick="goToStep3()" class="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">← Back</button>
                        <button onclick="handleCreateTournament()" class="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors">Create ✓</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => document.getElementById('create-passcode')?.focus(), 100);
}

/**
 * Create tournament in Firebase
 */
async function handleCreateTournament() {
    const passcode = document.getElementById('create-passcode').value;
    if (!passcode) {
        showToast('❌ Please enter a passcode');
        return;
    }
    
    wizardData.passcode = passcode;
    
    const tournamentId = Router.generateTournamentId();
    const organiserKey = Router.generateOrganiserKey();
    const hashedPasscode = btoa(passcode); // Simple hash for demo
    
    // Get current user for creator info
    const currentUser = getCurrentUser();
    
    // Prepare mode settings
    const accessMode = wizardData.accessMode || 'anyone';
    const modeSettings = {
        mode: accessMode,
        allowGuests: accessMode === 'anyone',
        requireRegistered: accessMode === 'registered' || accessMode === 'level-based',
        requireVerified: accessMode === 'level-based',
        levelCriteria: accessMode === 'level-based' ? { 
            min: wizardData.levelMin, 
            max: wizardData.levelMax 
        } : null
    };
    
    // Initialize state
    state = new MexicanoState(tournamentId);
    state.tournamentName = wizardData.name;
    state.mode = wizardData.mode;
    state.pointsPerMatch = wizardData.pointsPerMatch;
    state.players = wizardData.players;
    state.teams = wizardData.teams;
    state.organiserKey = organiserKey;
    state.isOrganiser = true;
    
    // Generate first round
    state.rounds = [state.generateRound(1)];
    state.currentRound = 1;
    state.viewingRound = 1;
    state.status = 'active';
    
    // Build Firebase data
    const data = {
        meta: {
            name: wizardData.name,
            mode: wizardData.mode,
            pointsPerMatch: wizardData.pointsPerMatch,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
            organiserKey: organiserKey,
            passcodeHash: hashedPasscode,
            // Mode settings
            ...modeSettings,
            // Creator info
            createdBy: currentUser ? {
                id: currentUser.id,
                name: currentUser.name,
                type: currentUser.type
            } : null
        },
        currentRound: 1,
        playerCount: wizardData.mode === 'individual' ? wizardData.players.length : wizardData.teams.length * 2,
        rounds: state.rounds,
        // For registered modes
        registeredPlayers: {}
    };
    
    if (wizardData.mode === 'individual') {
        data.players = wizardData.players;
    } else {
        data.teams = wizardData.teams;
    }
    
    try {
        const success = await createTournamentInFirebase(tournamentId, data);
        if (!success) {
            showToast('❌ Failed to create session');
            return;
        }
        
        // Save to local storage
        MyTournaments.save({
            id: tournamentId,
            name: wizardData.name,
            createdAt: data.meta.createdAt
        });
        
        // Show success modal with links
        showSuccessModal(tournamentId, organiserKey, accessMode);
    } catch (error) {
        console.error('Error creating tournament:', error);
        showToast('❌ Failed to create session');
    }
}

/**
 * Show success modal with shareable links
 */
function showSuccessModal(tournamentId, organiserKey, accessMode = 'anyone') {
    const playerLink = Router.getPlayerLink(tournamentId);
    const organiserLink = Router.getOrganiserLink(tournamentId, organiserKey);
    
    const modeLabels = {
        'anyone': '🌍 Open to Anyone',
        'registered': '👥 Registered Only',
        'level-based': '🎯 Level-Based'
    };
    const modeLabel = modeLabels[accessMode] || modeLabels['anyone'];
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">✅ Session Created!</h2>
                </div>
                <div class="p-6 space-y-4">
                    <div class="bg-teal-50 rounded-xl p-4 text-center">
                        <div class="text-sm font-semibold text-teal-800 mb-2">📋 Session Code</div>
                        <div class="font-mono text-3xl font-bold text-teal-600 tracking-wider">${tournamentId.toUpperCase()}</div>
                        <div class="text-sm text-teal-600 mt-1">${modeLabel}</div>
                    </div>
                    
                    <div class="bg-gray-50 rounded-xl p-4">
                        <div class="text-sm font-semibold text-gray-700 mb-2">🔗 Player Link (View Only)</div>
                        <p class="text-xs text-gray-500 mb-2">Share with players - they can view but not edit</p>
                        <div class="flex items-center gap-2">
                            <input type="text" value="${playerLink}" readonly class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono truncate" />
                            <button onclick="copyToClipboard('${playerLink}'); showToast('✅ Link copied!')" class="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 flex-shrink-0">Copy</button>
                        </div>
                    </div>
                    
                    <div class="bg-amber-50 rounded-xl p-4">
                        <div class="text-sm font-semibold text-amber-800 mb-2">🔑 Your Organiser Link</div>
                        <p class="text-xs text-amber-700 mb-2">Save this link! You'll need it to edit scores</p>
                        <div class="flex items-center gap-2">
                            <input type="text" value="${organiserLink}" readonly class="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono truncate" />
                            <button onclick="copyToClipboard('${organiserLink}'); showToast('✅ Link copied!')" class="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 flex-shrink-0">Copy</button>
                        </div>
                    </div>
                    
                    <button onclick="Router.navigate('tournament', '${tournamentId}', '${organiserKey}')" class="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-semibold text-lg hover:from-teal-600 hover:to-teal-700 transition-all">
                        Start Tournament →
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== JOIN MODAL =====

function showJoinModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target === this) closeModal()">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">🔗 Join Session</h2>
                </div>
                <div class="p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Session Code</label>
                        <input type="text" id="join-code" 
                            class="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none text-center text-2xl font-mono tracking-widest uppercase" 
                            placeholder="ABC123" maxlength="10" 
                            onkeypress="if(event.key==='Enter') joinSession()" />
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onclick="joinSession()" class="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold transition-colors">Join</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => document.getElementById('join-code')?.focus(), 100);
}

async function joinSession() {
    const code = document.getElementById('join-code').value.trim().toLowerCase();
    
    if (!code) {
        showToast('⚠️ Enter a session code');
        return;
    }
    
    try {
        const exists = await checkTournamentExists(code);
        if (exists) {
            closeModal();
            Router.navigate('tournament', code);
        } else {
            showToast('❌ Session not found');
        }
    } catch (error) {
        showToast('❌ Error joining session');
    }
}

// ===== SHARE MODAL =====

function showShareModal() {
    if (!state) return;
    
    const playerLink = Router.getPlayerLink(state.tournamentId);
    const organiserLink = state.organiserKey ? Router.getOrganiserLink(state.tournamentId, state.organiserKey) : null;
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target === this) closeModal()">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">📤 Share Session</h2>
                </div>
                <div class="p-6 space-y-4">
                    <div class="bg-teal-50 rounded-xl p-4 text-center">
                        <div class="text-sm font-semibold text-teal-800 mb-2">📋 Session Code</div>
                        <div class="font-mono text-2xl font-bold text-teal-600 tracking-wider">${state.tournamentId.toUpperCase()}</div>
                    </div>
                    
                    <div class="bg-gray-50 rounded-xl p-4">
                        <div class="text-sm font-semibold text-gray-700 mb-2">🔗 Player Link (View Only)</div>
                        <div class="flex items-center gap-2">
                            <input type="text" value="${playerLink}" readonly class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono truncate" />
                            <button onclick="copyToClipboard('${playerLink}'); showToast('✅ Copied!')" class="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">Copy</button>
                        </div>
                    </div>
                    
                    ${organiserLink ? `
                        <div class="bg-amber-50 rounded-xl p-4">
                            <div class="text-sm font-semibold text-amber-800 mb-2">🔑 Organiser Link</div>
                            <div class="flex items-center gap-2">
                                <input type="text" value="${organiserLink}" readonly class="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono truncate" />
                                <button onclick="copyToClipboard('${organiserLink}'); showToast('✅ Copied!')" class="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Copy</button>
                            </div>
                        </div>
                    ` : ''}
                    
                    <button onclick="closeModal()" class="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Done</button>
                </div>
            </div>
        </div>
    `;
}

// ===== ORGANISER LOGIN MODAL =====

function showOrganiserLoginModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target === this) closeModal()">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">🔑 Organiser Login</h2>
                </div>
                <div class="p-6">
                    <p class="text-sm text-gray-600 mb-4">Enter your passcode to edit this session.</p>
                    <div class="mb-4">
                        <input type="password" id="login-passcode" 
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none text-lg text-center tracking-widest" 
                            placeholder="••••" autofocus
                            onkeypress="if(event.key === 'Enter') handleOrganiserLogin()" />
                    </div>
                    <div id="login-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">❌ Invalid passcode</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onclick="handleOrganiserLogin()" class="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors">Login</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => document.getElementById('login-passcode')?.focus(), 100);
}

async function handleOrganiserLogin() {
    const passcode = document.getElementById('login-passcode').value;
    if (!passcode) {
        document.getElementById('login-error').classList.remove('hidden');
        return;
    }
    
    try {
        const storedHash = await getPasscodeHash(state.tournamentId);
        
        if (storedHash && btoa(passcode) === storedHash) {
            const organiserKey = await getOrganiserKey(state.tournamentId);
            state.isOrganiser = true;
            state.organiserKey = organiserKey;
            closeModal();
            showToast('✅ Logged in as organiser!');
            Router.navigate('tournament', state.tournamentId, organiserKey);
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('login-error').classList.remove('hidden');
    }
}

// ===== SCORE HANDLERS =====

function onScoreFocus(matchId) {
    if (!state) return;
    state.scoresBeingEdited.add(matchId);
}

function onScoreInput(matchId, team, value) {
    if (!state || !state.canEdit()) return;
    
    const round = state.rounds[state.currentRound - 1];
    const match = round?.matches.find(m => m.id === matchId);
    if (!match || match.completed) return;
    
    let score = value === '' ? null : parseInt(value);
    if (score !== null && score > state.pointsPerMatch) score = state.pointsPerMatch;
    if (score !== null && score < 0) score = 0;
    
    if (team === 1) {
        match.score1 = score;
    } else {
        match.score2 = score;
    }
    
    // Auto-fill other score
    if (score !== null) {
        const other = state.pointsPerMatch - score;
        const otherInput = document.querySelector(`input[data-match="${matchId}"][data-team="${team === 1 ? 2 : 1}"]`);
        if (otherInput) otherInput.value = other;
        
        if (team === 1) {
            match.score2 = other;
        } else {
            match.score1 = other;
        }
    }
}

async function onScoreBlur(matchId, team, value) {
    if (!state) return;
    state.scoresBeingEdited.delete(matchId);
    
    if (!state.canEdit()) return;
    
    const round = state.rounds[state.currentRound - 1];
    const match = round?.matches.find(m => m.id === matchId);
    if (!match || match.completed) return;
    
    let score = value === '' ? null : parseInt(value);
    if (score !== null && score > state.pointsPerMatch) score = state.pointsPerMatch;
    if (score !== null && score < 0) score = 0;
    
    if (team === 1) {
        match.score1 = score;
    } else {
        match.score2 = score;
    }
    
    if (score !== null) {
        const other = state.pointsPerMatch - score;
        if (team === 1) {
            match.score2 = other;
        } else {
            match.score1 = other;
        }
    }
    
    // Check if match is complete
    if (match.score1 !== null && match.score2 !== null && match.score1 + match.score2 === state.pointsPerMatch) {
        match.completed = true;
        state.updatePoints(match, match.score1, match.score2);
        showToast('✅ Match saved!');
    }
    
    await state.saveToFirebase();
    render();
}

// ===== EDIT MATCH MODAL =====

function editMatch(matchId) {
    if (!state || !state.canEdit()) return;
    
    const round = state.rounds.find(r => r.matches.some(m => m.id === matchId));
    const match = round?.matches.find(m => m.id === matchId);
    if (!match) return;
    
    const t1Label = state.mode === 'individual' ? match.team1Names.join(' & ') : match.team1Players.join(' & ');
    const t2Label = state.mode === 'individual' ? match.team2Names.join(' & ') : match.team2Players.join(' & ');
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target === this) closeModal()">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">Edit Match Score</h2>
                </div>
                <div class="p-6">
                    <p class="text-gray-500 text-sm mb-4 text-center">Round ${round.roundNumber}, Court ${match.court}</p>
                    <div class="flex items-center justify-center gap-4 mb-6">
                        <div class="text-center">
                            <div class="text-sm font-medium text-gray-700 mb-2">${t1Label}</div>
                            <input type="number" id="edit-score1" 
                                class="w-20 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none" 
                                value="${match.score1}" min="0" max="${state.pointsPerMatch}" 
                                oninput="onEditInput(1, this.value)" />
                        </div>
                        <span class="text-2xl text-gray-400 font-bold">:</span>
                        <div class="text-center">
                            <div class="text-sm font-medium text-gray-700 mb-2">${t2Label}</div>
                            <input type="number" id="edit-score2" 
                                class="w-20 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none" 
                                value="${match.score2}" min="0" max="${state.pointsPerMatch}" 
                                oninput="onEditInput(2, this.value)" />
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
                        <button onclick="saveEdit('${matchId}', ${round.roundNumber - 1})" class="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-semibold">Save</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function onEditInput(team, value) {
    if (!state) return;
    let score = value === '' ? 0 : parseInt(value);
    if (score > state.pointsPerMatch) score = state.pointsPerMatch;
    if (score < 0) score = 0;
    document.getElementById(`edit-score${team === 1 ? 2 : 1}`).value = state.pointsPerMatch - score;
}

async function saveEdit(matchId, roundIndex) {
    if (!state || !state.canEdit()) return;
    
    const match = state.rounds[roundIndex].matches.find(m => m.id === matchId);
    if (!match) return;
    
    const s1 = parseInt(document.getElementById('edit-score1').value);
    const s2 = parseInt(document.getElementById('edit-score2').value);
    
    if (s1 + s2 !== state.pointsPerMatch) {
        showToast(`⚠️ Scores must total ${state.pointsPerMatch}`);
        return;
    }
    
    // Revert old points, apply new
    state.revertPoints(match);
    match.score1 = s1;
    match.score2 = s2;
    state.updatePoints(match, s1, s2);
    
    await state.saveToFirebase();
    closeModal();
    showToast('✅ Score updated!');
    render();
}

// ===== ROUND NAVIGATION =====

function viewRound(roundNumber) {
    if (!state) return;
    state.viewingRound = roundNumber;
    render();
}

async function completeRound() {
    if (!state || !state.canEdit()) return;
    
    state.rounds[state.currentRound - 1].completed = true;
    state.rounds.push(state.generateRound(state.currentRound + 1));
    state.currentRound++;
    state.viewingRound = state.currentRound;
    
    await state.saveToFirebase();
    showToast(`🎯 Round ${state.currentRound} generated!`);
    render();
}

// ===== END TOURNAMENT =====

function confirmEnd() {
    if (!state || !state.canEdit()) return;
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick="if(event.target === this) closeModal()">
            <div class="modal-backdrop absolute inset-0"></div>
            <div class="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-scale-in" onclick="event.stopPropagation()">
                <div class="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 rounded-t-3xl">
                    <h2 class="text-xl font-bold text-white">End Tournament?</h2>
                </div>
                <div class="p-6">
                    <p class="text-gray-600 mb-6">Winner will be declared based on current standings.</p>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
                        <button onclick="endTournament()" class="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold">End</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function endTournament() {
    if (!state || !state.canEdit()) return;
    
    state.status = 'completed';
    await database.ref(`${CONFIG.FIREBASE_ROOT}/${state.tournamentId}/meta/status`).set('completed');
    closeModal();
    showToast('🏆 Tournament complete!');
    render();
}

// ===== TAB NAVIGATION =====

function switchTab(tab) {
    if (!state) return;
    state.activeTab = tab;
    render();
}

// ===== UTILITY FUNCTIONS =====

function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

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

function copyCode() {
    if (!state) return;
    navigator.clipboard.writeText(state.tournamentId?.toUpperCase() || '')
        .then(() => showToast('📋 Code copied!'));
}

function shareLink() {
    if (!state) return;
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: state.tournamentName, url });
    } else {
        navigator.clipboard.writeText(url).then(() => showToast('📋 Link copied!'));
    }
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg mb-2 animate-slide-up';
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatTimeAgo(isoString) {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return `${Math.floor(hours / 24)}d ago`;
}

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

console.log('✅ Mexicano Handlers loaded');
