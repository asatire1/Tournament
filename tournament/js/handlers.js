// ===== EVENT HANDLERS =====

// Helper to check if editing is allowed
function checkCanEdit() {
    if (!state || !state.canEdit()) {
        showToast('👀 View-only mode. Organiser access required to edit.');
        return false;
    }
    return true;
}

// ===== SCORE HANDLERS =====

function handleScoreChange(round, matchIdx, value, team) {
    if (!checkCanEdit()) return;
    const score = parseInt(value);
    const maxScore = state.fixtureMaxScore;
    if (isNaN(score) || score < 0 || score > maxScore) return;
    if (team === 1) { 
        state.updateMatchScore(round, matchIdx, score, maxScore - score); 
    } else { 
        state.updateMatchScore(round, matchIdx, maxScore - score, score); 
    }
    render();
}

function clearScore(round, matchIdx) {
    if (!checkCanEdit()) return;
    state.clearMatchScore(round, matchIdx);
    render();
}

function handleKnockoutScore(matchId, value, team, maxScore) {
    if (!checkCanEdit()) return;
    const score = parseInt(value);
    if (isNaN(score) || score < 0 || score > maxScore) return;
    if (team === 1) { 
        state.updateKnockoutScore(matchId, score, maxScore - score); 
    } else { 
        state.updateKnockoutScore(matchId, maxScore - score, score); 
    }
    render();
}

function setKnockoutFormat(format) {
    if (!checkCanEdit()) return;
    if (!['final', 'semi', 'quarter'].includes(format)) return;
    
    // Warn if there are existing knockout scores
    const hasScores = Object.keys(state.knockoutScores || {}).length > 0;
    if (hasScores) {
        if (!confirm('Changing knockout format will clear existing knockout scores. Continue?')) {
            return;
        }
        // Clear knockout scores
        state.knockoutScores = {};
    }
    
    state.knockoutFormat = format;
    state.saveToFirebase();
    render();
    showToast(`✅ Knockout format changed to ${format === 'final' ? 'Final Only' : format === 'semi' ? 'Semi + Final' : 'Quarter + Semi + Final'}`);
}

// ===== FIXTURE HANDLERS =====

function handleFixtureChange(round, matchIdx, position, newValue) {
    if (!checkCanEdit()) return;
    newValue = parseInt(newValue);
    
    if (isNaN(newValue) || newValue < 1 || newValue > CONFIG.TOTAL_PLAYERS) {
        alert(`Player number must be between 1 and ${CONFIG.TOTAL_PLAYERS}`);
        render();
        return;
    }
    
    const match = state.fixtures[round][matchIdx];
    
    // Get the old value from the current state based on position
    let oldValue;
    if (position === 't1p1') oldValue = match.team1[0];
    else if (position === 't1p2') oldValue = match.team1[1];
    else if (position === 't2p1') oldValue = match.team2[0];
    else if (position === 't2p2') oldValue = match.team2[1];
    
    // If value hasn't changed, do nothing
    if (oldValue === newValue) return;
    
    const players = [...match.team1, ...match.team2];
    
    const posMap = { 't1p1': 0, 't1p2': 1, 't2p1': 2, 't2p2': 3 };
    const tempPlayers = [...players];
    tempPlayers[posMap[position]] = newValue;
    
    const uniqueInMatch = new Set(tempPlayers);
    if (uniqueInMatch.size !== 4) {
        alert('All 4 players in a match must be different!');
        render();
        return;
    }
    
    state.updateFixtureWithSwap(round, matchIdx, position, oldValue, newValue);
    render();
}

function exportFixtures() {
    const fixturesJson = state.exportFixtures();
    const blob = new Blob([fixturesJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padel-fixtures-${state.tournamentId || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Fixtures exported!');
}

function importFixtures(file) {
    if (!checkCanEdit()) return;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const success = state.importFixtures(e.target.result);
        if (success) { 
            render(); 
            showToast('✅ Fixtures imported!'); 
        } else { 
            alert('Error importing fixtures. Please make sure the file is valid.'); 
        }
    };
    reader.readAsText(file);
}

function resetFixtures() {
    if (!checkCanEdit()) return;
    if (confirm('Reset all fixtures to default arrangement?')) { 
        state.resetFixtures(); 
        render(); 
        showToast('✅ Fixtures reset to defaults!'); 
    }
}

// ===== DATA HANDLERS =====

function exportData() {
    const data = state.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padel-tournament-${state.tournamentId || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Tournament data exported!');
}

function importData(file) {
    if (!checkCanEdit()) return;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try { 
            const data = JSON.parse(e.target.result); 
            state.importData(data); 
            render(); 
            showToast('✅ Tournament data imported!'); 
        } catch (error) { 
            alert('Error importing data. Please make sure the file is valid.'); 
        }
    };
    reader.readAsText(file);
}

function resetScores() {
    if (!checkCanEdit()) return;
    if (confirm('This will clear all match scores. A backup will be created automatically. Continue?')) {
        state.resetAllScores(); 
        render(); 
        showToast('✅ Backup saved! All scores have been reset!');
    }
}

// ===== VERSION HANDLERS =====

function saveBackup() {
    if (!checkCanEdit()) return;
    const nameInput = document.getElementById('backup-name');
    const name = nameInput.value.trim() || `Backup ${new Date().toLocaleString()}`;
    state.createBackup(name);
    nameInput.value = '';
    render();
    showToast('✅ Version saved!');
}

function loadVersion(versionId) {
    if (!checkCanEdit()) return;
    if (confirm('Load this version? Current state will be backed up first.')) {
        state.loadVersion(versionId); 
        render(); 
        showToast('✅ Version loaded!');
    }
}

function deleteVersion(versionId) {
    if (!checkCanEdit()) return;
    if (confirm('Delete this saved version?')) { 
        state.deleteVersion(versionId); 
        render(); 
    }
}

// ===== RESET TO JSON DEFAULTS =====

async function resetToJsonDefaults() {
    if (!checkCanEdit()) return;
    
    if (!confirm('Reset everything to defaults from JSON files? This will:\n\n✓ Create an automatic backup\n✓ Load player names/ratings from data/players.json\n✓ Load fixtures from data/fixtures.json\n✓ Load match names from data/match-names.json\n✓ Clear all scores\n\nContinue?')) {
        return;
    }
    
    try {
        // Create backup first
        state.createBackup('Auto-backup before JSON reset');
        
        // Reload defaults from JSON
        await state.loadDefaults();
        
        // Apply defaults
        state.initializeDefaults();
        
        // Save to Firebase
        state.saveToFirebase();
        
        // Re-render
        render();
        
        showToast('✅ Reset to JSON defaults complete!');
    } catch (error) {
        console.error('Error resetting to JSON defaults:', error);
        alert('❌ Error loading JSON files. Make sure:\n\n1. You are running from a web server (not file://)\n2. JSON files exist in the data/ folder\n3. JSON files are valid');
    }
}

// ===== SHARE LINKS =====

function showShareLinksModal() {
    if (!state.tournamentId) return;
    
    const playerLink = Router.getPlayerLink(state.tournamentId);
    const canEdit = state.canEdit();
    
    const modal = document.getElementById('modal-container') || createModalContainer();
    modal.innerHTML = `
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onclick="if(event.target === this) closeModal()">
            <div class="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-auto">
                <div class="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between">
                    <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <span>🔗</span> Share Tournament
                    </h2>
                    <button onclick="closeModal()" class="text-white/80 hover:text-white p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div class="p-5 sm:p-6 space-y-5">
                    <div class="text-center pb-2">
                        <div class="text-xl sm:text-2xl font-bold text-gray-800">${state.tournamentName || 'Tournament'}</div>
                        <div class="text-sm text-gray-500 mt-1">Code: <span class="font-mono font-bold text-blue-600">${state.tournamentId.toUpperCase()}</span></div>
                    </div>
                    
                    <!-- Player Link -->
                    <div class="bg-green-50 border border-green-200 rounded-2xl p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-lg">👥</span>
                            <span class="font-semibold text-green-800">Share Link</span>
                        </div>
                        <p class="text-sm text-green-700 mb-3">Share this with everyone to view scores in real-time</p>
                        <div class="flex gap-2">
                            <input 
                                type="text" 
                                value="${playerLink}" 
                                readonly 
                                class="flex-1 min-w-0 px-3 py-2.5 bg-white border border-green-300 rounded-xl text-sm text-gray-600 font-mono truncate"
                                onclick="this.select()"
                            />
                            <button 
                                onclick="copyToClipboard('${playerLink}'); this.innerHTML = '✓'; setTimeout(() => this.innerHTML = 'Copy', 2000)"
                                class="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl font-medium transition-colors whitespace-nowrap"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                    
                    ${canEdit ? `
                    <!-- Organiser Info -->
                    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-lg">🔑</span>
                            <span class="font-semibold text-amber-800">Organiser Access</span>
                        </div>
                        <p class="text-sm text-amber-700">You're logged in as organiser. Others can use the "Enter as Organiser" button and your passcode to edit.</p>
                    </div>
                    ` : `
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
                        <span class="text-gray-400">ℹ️</span>
                        <p class="text-sm text-gray-600">You're viewing as a player. Use "Enter as Organiser" if you have the passcode.</p>
                    </div>
                    `}
                </div>
                
                <div class="sticky bottom-0 p-4 bg-gray-50 border-t border-gray-100">
                    <button 
                        onclick="closeModal()"
                        class="w-full px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createModalContainer() {
    const container = document.createElement('div');
    container.id = 'modal-container';
    document.body.appendChild(container);
    return container;
}

// Show organiser login modal
function showOrganiserLoginModal() {
    const modal = document.getElementById('modal-container') || createModalContainer();
    modal.innerHTML = `
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onclick="if(event.target === this) closeModal()">
            <div class="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden">
                <div class="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 flex items-center justify-between">
                    <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <span>🔑</span> Organiser Login
                    </h2>
                    <button onclick="closeModal()" class="text-white/80 hover:text-white p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div class="p-6">
                    <p class="text-gray-600 mb-4">Enter your organiser passcode to edit this tournament.</p>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Passcode</label>
                        <input 
                            type="password" 
                            id="organiser-login-passcode" 
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-lg text-center tracking-widest"
                            placeholder="Enter passcode"
                            autofocus
                            onkeypress="if(event.key === 'Enter') verifyOrganiserLogin()"
                        />
                    </div>
                    
                    <div id="login-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">❌ Incorrect passcode</p>
                    </div>
                    
                    <div class="flex gap-3">
                        <button 
                            onclick="closeModal()"
                            class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onclick="verifyOrganiserLogin()"
                            class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        document.getElementById('organiser-login-passcode')?.focus();
    }, 100);
}

// Verify organiser login
async function verifyOrganiserLogin() {
    const passcodeInput = document.getElementById('organiser-login-passcode');
    const loginError = document.getElementById('login-error');
    const passcode = passcodeInput?.value;
    
    if (!passcode) {
        loginError?.classList.remove('hidden');
        passcodeInput?.focus();
        return;
    }
    
    // Verify against Firebase
    const isValid = await state.verifyOrganiserKey(passcode);
    
    if (isValid) {
        closeModal();
        showToast('✅ Logged in as organiser!');
        render();
    } else {
        loginError?.classList.remove('hidden');
        passcodeInput?.classList.add('border-red-500');
        passcodeInput?.focus();
        passcodeInput?.select();
    }
}

// Utility: Show toast notification (may already be defined in landing.js, but defining here for tournament view)
if (typeof showToast === 'undefined') {
    function showToast(message) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed bottom-4 right-4 z-50';
            document.body.appendChild(container);
        }
        
        const toast = document.createElement('div');
        toast.className = 'bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg mb-2';
        toast.innerHTML = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

// Utility: Copy to clipboard
if (typeof copyToClipboard === 'undefined') {
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        });
    }
}

console.log('✅ Handlers loaded');
