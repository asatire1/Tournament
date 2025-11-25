// ===== EVENT HANDLERS =====

// ===== PASSCODE SYSTEM =====
let isUnlocked = false;

function checkPasscode() {
    if (isUnlocked) return true;
    showPasscodeModal();
    return false;
}

function showPasscodeModal() {
    const modal = document.getElementById('passcode-modal');
    modal.innerHTML = `
        <div class="passcode-modal">
            <div class="passcode-content">
                <h2 class="text-2xl font-bold text-center mb-2">🔒 Enter Passcode</h2>
                <p class="text-sm text-gray-600 text-center mb-4">Editing is locked. Enter passcode to unlock.</p>
                <input type="password" id="passcode-input" class="passcode-input" placeholder="••••" maxlength="10" autofocus />
                <div id="passcode-error" class="text-red-500 text-sm text-center mb-4 hidden">Incorrect passcode</div>
                <div class="flex gap-3">
                    <button onclick="closePasscodeModal()" class="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition">Cancel</button>
                    <button onclick="verifyPasscode()" class="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition">Unlock</button>
                </div>
            </div>
        </div>
    `;
    
    const input = document.getElementById('passcode-input');
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPasscode();
    });
}

function verifyPasscode() {
    const input = document.getElementById('passcode-input');
    const error = document.getElementById('passcode-error');
    
    if (input.value === CONFIG.PASSCODE) {
        isUnlocked = true;
        closePasscodeModal();
        renderLockButton();
        alert('✅ Unlocked! You can now edit.');
    } else {
        error.classList.remove('hidden');
        input.value = '';
        input.focus();
    }
}

function closePasscodeModal() {
    document.getElementById('passcode-modal').innerHTML = '';
}

function toggleLock() {
    if (isUnlocked) {
        isUnlocked = false;
        renderLockButton();
        alert('🔒 Locked! Editing is now disabled.');
    } else {
        showPasscodeModal();
    }
}

function renderLockButton() {
    const lockBtn = document.getElementById('lock-button');
    lockBtn.innerHTML = `
        <button onclick="toggleLock()" class="lock-btn ${isUnlocked ? 'unlocked' : 'locked'}" title="${isUnlocked ? 'Click to lock' : 'Click to unlock'}">
            <span style="font-size: 24px;">${isUnlocked ? '🔓' : '🔒'}</span>
        </button>
    `;
}

// ===== SCORE HANDLERS =====

function handleScoreChange(round, matchIdx, value, team) {
    if (!checkPasscode()) return;
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
    state.clearMatchScore(round, matchIdx);
    render();
}

function handleKnockoutScore(matchId, value, team, maxScore) {
    if (!checkPasscode()) return;
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
    if (!checkPasscode()) return;
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
    a.download = `padel-fixtures-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Fixtures exported successfully!');
}

function importFixtures(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const success = state.importFixtures(e.target.result);
        if (success) { 
            render(); 
            alert('Fixtures imported successfully!'); 
        } else { 
            alert('Error importing fixtures. Please make sure the file is valid.'); 
        }
    };
    reader.readAsText(file);
}

function resetFixtures() {
    if (confirm('Reset all fixtures to default arrangement?')) { 
        state.resetFixtures(); 
        render(); 
        alert('Fixtures reset to defaults!'); 
    }
}

// ===== DATA HANDLERS =====

function exportData() {
    const data = state.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padel-tournament-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Tournament data exported successfully!');
}

function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try { 
            const data = JSON.parse(e.target.result); 
            state.importData(data); 
            render(); 
            alert('Tournament data imported successfully!'); 
        } catch (error) { 
            alert('Error importing data. Please make sure the file is valid.'); 
        }
    };
    reader.readAsText(file);
}

function resetScores() {
    if (confirm('This will clear all match scores. A backup will be created automatically. Continue?')) {
        state.resetAllScores(); 
        render(); 
        alert('Backup saved! All scores have been reset!');
    }
}

// ===== VERSION HANDLERS =====

function saveBackup() {
    const nameInput = document.getElementById('backup-name');
    const name = nameInput.value.trim() || `Backup ${new Date().toLocaleString()}`;
    state.createBackup(name);
    nameInput.value = '';
    render();
    alert('Version saved successfully!');
}

function loadVersion(versionId) {
    if (confirm('Load this version? Current state will be backed up first.')) {
        state.loadVersion(versionId); 
        render(); 
        alert('Current state backed up! Version loaded successfully!');
    }
}

function deleteVersion(versionId) {
    if (confirm('Delete this saved version?')) { 
        state.deleteVersion(versionId); 
        render(); 
    }
}

// ===== RESET TO JSON DEFAULTS =====

async function resetToJsonDefaults() {
    if (!checkPasscode()) return;
    
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
        
        alert('✅ Successfully reset to JSON defaults!\n\nBackup saved automatically.');
    } catch (error) {
        console.error('Error resetting to JSON defaults:', error);
        alert('❌ Error loading JSON files. Make sure:\n\n1. You are running from a web server (not file://)\n2. JSON files exist in the data/ folder\n3. JSON files are valid');
    }
}
