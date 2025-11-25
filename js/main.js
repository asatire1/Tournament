// ===== APPLICATION INITIALIZATION =====

let state;

async function initializeApp() {
    console.log('🚀 Initializing Stretford Padel Tournament...');
    
    // Create state instance
    state = new TournamentState();
    
    // Load default data from JSON files
    await state.loadDefaults();
    
    // Initialize defaults if needed
    state.initializeDefaults();
    
    // Start listening to Firebase
    state.loadFromFirebase();
    
    // Render lock button
    renderLockButton();
    
    console.log('✅ App initialized successfully');
}

// ===== SETTINGS TAB =====

function SettingsTab() {
    const subtabs = [
        { id: 'players', label: '👥 Players', icon: '👥' },
        { id: 'courts', label: '🏟️ Courts', icon: '🏟️' },
        { id: 'fixtures', label: '⚙️ Fixtures', icon: '⚙️' },
        { id: 'data', label: '💾 Data', icon: '💾' }
    ];

    let content = '';

    if (state.settingsSubTab === 'players') {
        content = `
            <div class="space-y-6">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 class="font-semibold text-blue-900 mb-2">💡 Player Tiers</h3>
                    <div class="text-sm text-blue-800 space-y-1">
                        <div><strong>Elite (#1-4):</strong> Highest skilled players</div>
                        <div><strong>Advanced (#5-8):</strong> Very skilled players</div>
                        <div><strong>Intermediate+ (#9-12):</strong> Above average players</div>
                        <div><strong>Intermediate (#13-16):</strong> Average players</div>
                        <div><strong>Beginner+ (#17-20):</strong> Developing players</div>
                        <div><strong>Beginner (#21-24):</strong> Newest players</div>
                    </div>
                </div>
                <div class="flex justify-end">
                    <button onclick="if(confirm('Reset all player names and ratings to defaults?')) { state.resetPlayerNames(); render(); }" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded">Reset All Names</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${Array.from({length: CONFIG.TOTAL_PLAYERS}, (_, i) => {
                        const playerId = i + 1;
                        const tier = getTier(playerId);
                        const tierName = getTierName(playerId);
                        return `
                            <div class="bg-white rounded-lg shadow-md overflow-hidden">
                                <div class="tier-${tier} px-4 py-2 text-white font-semibold">#${playerId} - ${tierName}</div>
                                <div class="p-4 space-y-3">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Player Name:</label>
                                        <input type="text" value="${state.playerNames[i]}" class="w-full border rounded px-3 py-2" onchange="state.updatePlayerName(${i}, this.value); render();" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Skill Rating:</label>
                                        <input type="number" min="0" max="5" step="0.01" value="${state.skillRatings[playerId]}" class="w-full border rounded px-3 py-2" onchange="state.updateSkillRating(${playerId}, parseFloat(this.value)); render();" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                                        <div class="text-xs text-gray-500 mt-1">(0-5, step 0.01)</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else if (state.settingsSubTab === 'courts') {
        content = `
            <div class="space-y-6">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 class="font-semibold text-blue-900 mb-2">🏟️ Court & Match Names</h3>
                    <div class="text-sm text-blue-800">Customise the names/labels for each match position and knockout matches. These will appear on match cards throughout the tournament.</div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">Fixture Match Names</h3>
                        <button onclick="if(confirm('Reset all match names to defaults (Court 3-8)?')) { state.resetMatchNames(); render(); }" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm">Reset to Defaults</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${Array.from({length: CONFIG.MATCHES_PER_ROUND}, (_, i) => {
                            const matchNum = i + 1;
                            return `
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Match ${matchNum}:</label>
                                    <input type="text" value="${state.matchNames[matchNum]}" class="w-full border rounded px-3 py-2" onchange="state.updateMatchName(${matchNum}, this.value); render();" placeholder="e.g. Court ${matchNum + 2}" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">Knockout Match Names</h3>
                        <button onclick="if(confirm('Reset all knockout names to defaults?')) { state.resetKnockoutNames(); render(); }" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm">Reset to Defaults</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${['qf1', 'qf2', 'qf3', 'qf4', 'sf1', 'sf2', 'final'].map(matchId => {
                            const labels = {
                                qf1: 'Quarter Final 1',
                                qf2: 'Quarter Final 2',
                                qf3: 'Quarter Final 3',
                                qf4: 'Quarter Final 4',
                                sf1: 'Semi Final 1',
                                sf2: 'Semi Final 2',
                                final: 'Final'
                            };
                            return `
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">${labels[matchId]}:</label>
                                    <input type="text" value="${state.knockoutNames[matchId]}" class="w-full border rounded px-3 py-2" onchange="state.updateKnockoutName('${matchId}', this.value); render();" placeholder="${labels[matchId]}" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    } else if (state.settingsSubTab === 'fixtures') {
        content = `
            <div class="space-y-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">⚙️ Edit Fixtures</h3>
                    <p class="text-sm text-gray-600 mb-2">Customise match pairings for each round. Enter player numbers (1-24).</p>
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p class="text-sm text-yellow-800"><strong>✨ Smart Swap:</strong> If you change a player to someone already in the round, they will automatically swap positions!</p>
                    </div>
                    <div class="space-y-6">
                        ${Array.from({length: CONFIG.TOTAL_ROUNDS}, (_, roundIdx) => {
                            const round = roundIdx + 1;
                            return `
                                <div class="border border-gray-200 rounded-lg p-4">
                                    <h4 class="font-semibold text-gray-700 mb-3">Round ${round}</h4>
                                    <div class="space-y-3">
                                        ${state.fixtures[round].map((match, matchIdx) => `
                                            <div class="flex items-center gap-2 bg-gray-50 p-3 rounded flex-wrap">
                                                <span class="text-xs font-medium text-gray-500 w-20">${state.matchNames[matchIdx + 1]}:</span>
                                                <div class="flex items-center gap-1">
                                                    <input type="number" min="1" max="24" value="${match.team1[0]}" class="fixture-input" id="r${round}m${matchIdx}t1p1" onchange="handleFixtureChange(${round}, ${matchIdx}, 't1p1', ${match.team1[0]}, this.value)" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                                                    <span class="text-gray-400">&</span>
                                                    <input type="number" min="1" max="24" value="${match.team1[1]}" class="fixture-input" id="r${round}m${matchIdx}t1p2" onchange="handleFixtureChange(${round}, ${matchIdx}, 't1p2', ${match.team1[1]}, this.value)" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                                                </div>
                                                <span class="text-gray-400 font-bold">vs</span>
                                                <div class="flex items-center gap-1">
                                                    <input type="number" min="1" max="24" value="${match.team2[0]}" class="fixture-input" id="r${round}m${matchIdx}t2p1" onchange="handleFixtureChange(${round}, ${matchIdx}, 't2p1', ${match.team2[0]}, this.value)" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                                                    <span class="text-gray-400">&</span>
                                                    <input type="number" min="1" max="24" value="${match.team2[1]}" class="fixture-input" id="r${round}m${matchIdx}t2p2" onchange="handleFixtureChange(${round}, ${matchIdx}, 't2p2', ${match.team2[1]}, this.value)" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white rounded-lg shadow p-6">
                        <h3 class="text-lg font-semibold text-gray-800 mb-3">📤 Export Fixtures</h3>
                        <p class="text-sm text-gray-600 mb-4">Download fixtures as JSON</p>
                        <button onclick="exportFixtures()" class="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium w-full">Download Fixtures</button>
                    </div>
                    <div class="bg-white rounded-lg shadow p-6">
                        <h3 class="text-lg font-semibold text-gray-800 mb-3">📥 Import Fixtures</h3>
                        <p class="text-sm text-gray-600 mb-4">Upload fixtures JSON file</p>
                        <input type="file" accept=".json" onchange="importFixtures(this.files[0])" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">⚠️ Reset Fixtures</h3>
                    <p class="text-sm text-gray-600 mb-4">Restore default fixture arrangement</p>
                    <button onclick="resetFixtures()" class="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium">Reset to Defaults</button>
                </div>
            </div>
        `;
    } else if (state.settingsSubTab === 'data') {
        content = `
            <div class="space-y-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">💾 Export Tournament Data</h3>
                    <p class="text-sm text-gray-600 mb-4">Download all data as JSON file (includes fixtures and court names)</p>
                    <button onclick="exportData()" class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">Download Data File</button>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">📂 Import Tournament Data</h3>
                    <p class="text-sm text-gray-600 mb-4">Upload previously exported JSON (includes fixtures and court names)</p>
                    <input type="file" accept=".json" onchange="importData(this.files[0])" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">🔄 Reset from JSON Files</h3>
                    <p class="text-sm text-gray-600 mb-4">Reload all data from JSON files (players, fixtures, match names). Creates automatic backup first. Use this after editing JSON files.</p>
                    <button onclick="resetToJsonDefaults()" class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium">Reset from JSON Files</button>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">⚠️ Reset Match Scores</h3>
                    <p class="text-sm text-gray-600 mb-4">Clear all scores, auto-save backup first</p>
                    <button onclick="resetScores()" class="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium">Reset All Scores</button>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">💾 Save Current Version</h3>
                    <p class="text-sm text-gray-600 mb-4">Create named backup (includes fixtures and court names)</p>
                    <div class="flex gap-2">
                        <input type="text" id="backup-name" placeholder="Enter backup name..." class="flex-1 border rounded px-3 py-2" />
                        <button onclick="saveBackup()" class="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium">Save Backup</button>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-3">Saved Versions (${state.savedVersions.length}/${CONFIG.MAX_SAVED_VERSIONS})</h3>
                    ${state.savedVersions.length === 0 ? `<p class="text-sm text-gray-500">No saved versions yet.</p>` : `
                        <div class="space-y-3">
                            ${state.savedVersions.map(version => `
                                <div class="border rounded-lg p-4">
                                    <div class="font-medium text-gray-800">${version.name}</div>
                                    <div class="text-sm text-gray-500">${version.timestamp}</div>
                                    <div class="text-sm text-gray-600 mt-1">${version.matchScores ? Object.values(version.matchScores).reduce((sum, round) => sum + Object.keys(round).length, 0) : 0} matches recorded</div>
                                    <div class="flex gap-2 mt-3">
                                        <button onclick="loadVersion(${version.id})" class="px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm">Load</button>
                                        <button onclick="deleteVersion(${version.id})" class="px-4 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm">Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    return `
        <div class="space-y-6">
            <div class="bg-white rounded-2xl shadow-sm p-3 border border-gray-100">
                <div class="flex gap-2 flex-wrap">
                    ${subtabs.map(tab => `
                        <button 
                            onclick="state.settingsSubTab = '${tab.id}'; render();"
                            class="settings-subtab ${state.settingsSubTab === tab.id ? 'active' : 'inactive'}"
                        >
                            ${tab.label}
                        </button>
                    `).join('')}
                </div>
            </div>
            ${content}
        </div>
    `;
}

// ===== MAIN RENDER FUNCTION =====

function render() {
    renderLockButton();
    const app = document.getElementById('app');
    const tabContent = {
        'fixtures': TournamentFixturesTab(),
        'settings': SettingsTab(),
        'results': ResultsTab(),
        'resultsmatrix': ResultsMatrixTab(),
        'fairness': FairnessTab(),
        'fairness2': Fairness2Tab(),
        'partnerships': PartnershipsTab(),
        'knockout': KnockoutTab()
    };
    
    app.innerHTML = `
        <div class="max-w-7xl mx-auto p-4 md:p-6 pb-12">
            <div class="relative bg-white text-gray-900 rounded-3xl shadow-sm p-8 md:p-10 mb-8 overflow-hidden border border-gray-100">
                <div class="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-60"></div>
                <div class="relative">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="text-5xl md:text-6xl">🏓</div>
                        <div>
                            <h1 class="text-3xl md:text-4xl font-bold mb-1" style="letter-spacing: -1px;">Stretford Padel Tournament</h1>
                            <div class="text-sm text-gray-500 font-medium">Professional Match Manager</div>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 text-xs md:text-sm">
                        <div class="flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 border border-gray-200"><span class="text-base">👥</span><span class="font-semibold text-gray-700">${CONFIG.TOTAL_PLAYERS} Players</span></div>
                        <div class="flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 border border-gray-200"><span class="text-base">🎯</span><span class="font-semibold text-gray-700">${CONFIG.TOTAL_ROUNDS} Rounds</span></div>
                        <div class="flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 border border-gray-200"><span class="text-base">⚙️</span><span class="font-semibold text-gray-700">Smart Swap</span></div>
                        <div class="flex items-center gap-2 bg-green-50 backdrop-blur rounded-full px-4 py-2 border border-green-200"><span class="text-base">☁️</span><span class="font-semibold text-green-700">Live Sync</span></div>
                        <div class="flex items-center gap-2 backdrop-blur rounded-full px-4 py-2 border ${isUnlocked ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}"><span class="text-base">${isUnlocked ? '🔓' : '🔒'}</span><span class="font-semibold ${isUnlocked ? 'text-green-700' : 'text-red-700'}">${isUnlocked ? 'Unlocked' : 'Locked'}</span></div>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden border border-gray-100">
                <div class="overflow-x-auto">
                    <div class="flex p-2 gap-1 min-w-max">
                        <button onclick="state.currentTab = 'fixtures'; render();" class="px-5 py-3 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'fixtures' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}" style="letter-spacing: -0.2px;">Fixtures</button>
                        <button onclick="state.currentTab = 'settings'; render();" class="px-5 py-3 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'settings' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}" style="letter-spacing: -0.2px;">Settings</button>
                        <button onclick="state.currentTab = 'results'; render();" class="px-5 py-3 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'results' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}" style="letter-spacing: -0.2px;">Results</button>
                        <button onclick="state.currentTab = 'resultsmatrix'; render();" class="px-5 py-3 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'resultsmatrix' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}" style="letter-spacing: -0.2px;">Results Matrix</button>
                        <button onclick="state.currentTab = 'fairness'; render();" class="px-5 py-3 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'fairness' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}" style="letter-spacing: -0.2px;">Fairness</button>
                        <button onclick="state.currentTab = 'fairness2'; render();" class="px-5 py-3 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'fairness2' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}" style="letter-spacing: -0.2px;">Fairness 2</button>
                        <button onclick="state.currentTab = 'partnerships'; render();" class="px-5 py-3 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'partnerships' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}" style="letter-spacing: -0.2px;">Partners</button>
                        <button onclick="state.currentTab = 'knockout'; render();" class="px-5 py-3 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'knockout' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}" style="letter-spacing: -0.2px;">Knockout</button>
                    </div>
                </div>
            </div>
            <div>${tabContent[state.currentTab]}</div>
        </div>
    `;
}

// ===== START THE APP =====
// This will run when the page loads
window.addEventListener('DOMContentLoaded', initializeApp);
