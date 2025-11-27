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

// ===== FIXTURE HANDLERS =====

function handleFixtureChange(round, matchIdx, position, oldValue, newValue) {
    if (!checkCanEdit()) return;
    newValue = parseInt(newValue);
    oldValue = parseInt(oldValue);
    
    if (isNaN(newValue) || newValue < 1 || newValue > CONFIG.TOTAL_PLAYERS) {
        alert(`Player number must be between 1 and ${CONFIG.TOTAL_PLAYERS}`);
        render();
        return;
    }
    
    const match = state.fixtures[round][matchIdx];
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
    const organiserLink = state.organiserKey ? Router.getOrganiserLink(state.tournamentId, state.organiserKey) : null;
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
                            <span class="font-semibold text-green-800">Player Link</span>
                            <span class="text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full">View Only</span>
                        </div>
                        <p class="text-sm text-green-700 mb-3">Share this with players to view scores in real-time</p>
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
                    
                    ${canEdit && organiserLink ? `
                    <!-- Organiser Link -->
                    <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-lg">✏️</span>
                            <span class="font-semibold text-blue-800">Organiser Link</span>
                            <span class="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">Full Access</span>
                        </div>
                        <p class="text-sm text-blue-700 mb-3">Keep this private! Use on any device to edit</p>
                        <div class="flex gap-2">
                            <input 
                                type="text" 
                                value="${organiserLink}" 
                                readonly 
                                class="flex-1 min-w-0 px-3 py-2.5 bg-white border border-blue-300 rounded-xl text-sm text-gray-600 font-mono truncate"
                                onclick="this.select()"
                            />
                            <button 
                                onclick="copyToClipboard('${organiserLink}'); this.innerHTML = '✓'; setTimeout(() => this.innerHTML = 'Copy', 2000)"
                                class="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl font-medium transition-colors whitespace-nowrap"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                    
                    <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                        <span class="text-amber-500 flex-shrink-0">⚠️</span>
                        <p class="text-xs text-amber-700">Never share the organiser link publicly. Anyone with this link can modify tournament data.</p>
                    </div>
                    ` : `
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
                        <span class="text-gray-400">ℹ️</span>
                        <p class="text-sm text-gray-600">You're viewing as a player. Only the organiser can see the edit link.</p>
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
