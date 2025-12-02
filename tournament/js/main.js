// ===== APPLICATION INITIALIZATION =====

let state;

// Main initialization - starts the router
async function initializeApp() {
    console.log('🚀 Initializing Uber Padel Tournament...');
    
    // Set up route change handler
    Router.onRouteChange = handleRouteChange;
    
    // Initialize router (will trigger initial route)
    Router.init();
    
    // Set up connection monitoring
    setupConnectionMonitoring();
    
    console.log('✅ App initialized successfully');
}

// Monitor Firebase connection status
function setupConnectionMonitoring() {
    if (typeof database === 'undefined') return;
    
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        const isConnected = snap.val() === true;
        updateConnectionIndicator(isConnected);
    });
    
    // Also listen for browser online/offline events
    window.addEventListener('online', () => updateConnectionIndicator(true));
    window.addEventListener('offline', () => updateConnectionIndicator(false));
}

// Update the connection indicator in the UI
function updateConnectionIndicator(isConnected) {
    const indicator = document.getElementById('connection-indicator');
    if (!indicator) return;
    
    if (isConnected) {
        indicator.innerHTML = `
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span class="font-semibold text-green-700">Live</span>
        `;
        indicator.className = 'flex items-center gap-1.5 bg-green-50 backdrop-blur rounded-full px-3 py-1.5 border border-green-200';
    } else {
        indicator.innerHTML = `
            <span class="w-2 h-2 bg-red-500 rounded-full"></span>
            <span class="font-semibold text-red-700">Offline</span>
        `;
        indicator.className = 'flex items-center gap-1.5 bg-red-50 backdrop-blur rounded-full px-3 py-1.5 border border-red-200';
    }
}

// Handle route changes
async function handleRouteChange(route, tournamentId, organiserKey) {
    console.log(`📍 Route: ${route}, Tournament: ${tournamentId}, Key: ${organiserKey ? 'present' : 'none'}`);
    
    if (route === Router.routes.HOME) {
        // Show landing page
        renderLandingPageView();
    } else if (route === Router.routes.TOURNAMENT) {
        // Show tournament view
        await initializeTournament(tournamentId, organiserKey);
    }
}

// Render landing page
function renderLandingPageView() {
    // Clean up any existing state
    if (state) {
        state.stopListening();
        state = null;
    }
    
    const app = document.getElementById('app');
    app.innerHTML = renderLandingPage();
    
    // Load recent tournaments after render
    setTimeout(() => loadRecentTournaments(), 100);
}

// Initialize tournament view
async function initializeTournament(tournamentId, organiserKey) {
    // Clean up existing state
    if (state) {
        state.stopListening();
    }
    
    // Show loading state
    renderLoadingState(tournamentId);
    
    // Check if tournament exists first
    const exists = await checkTournamentExists(tournamentId);
    if (!exists) {
        renderTournamentNotFound(tournamentId);
        return;
    }
    
    // Create new state for this tournament
    state = new TournamentState(tournamentId);
    
    // Load default data (for backup/reset features)
    await state.loadDefaults();
    
    // Only verify organiser key/passcode if explicitly provided in URL
    if (organiserKey) {
        await state.verifyOrganiserKey(organiserKey);
    }
    
    // Start listening to Firebase
    state.loadFromFirebase();
    
    console.log(`✅ Tournament ${tournamentId} loaded (Organiser: ${state.isOrganiser})`);
}

// Check if tournament exists in Firebase
async function checkTournamentExists(tournamentId) {
    try {
        console.log(`🔍 Checking if tournament ${tournamentId} exists...`);
        const snapshot = await database.ref(`tournaments/${tournamentId}/meta`).once('value');
        const exists = snapshot.exists();
        console.log(`🔍 Tournament ${tournamentId} exists: ${exists}`);
        if (exists) {
            console.log('📋 Tournament meta:', snapshot.val());
        }
        return exists;
    } catch (error) {
        console.error('❌ Error checking tournament:', error);
        return false;
    }
}

// Render loading state
function renderLoadingState(tournamentId) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center" style="font-family: 'Space Grotesk', -apple-system, sans-serif;">
            <div class="text-center">
                <div class="relative mb-6">
                    <div class="w-20 h-20 mx-auto rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
                    <div class="absolute inset-0 flex items-center justify-center text-3xl">🏓</div>
                </div>
                <h2 class="text-xl font-semibold text-gray-800 mb-2">Loading Tournament</h2>
                <p class="text-gray-500">Code: <span class="font-mono font-bold text-blue-600">${tournamentId?.toUpperCase() || ''}</span></p>
            </div>
        </div>
    `;
}

// Render tournament not found
function renderTournamentNotFound(tournamentId) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-4" style="font-family: 'Space Grotesk', -apple-system, sans-serif;">
            <div class="text-center max-w-md">
                <div class="text-6xl mb-6">🔍</div>
                <h2 class="text-2xl font-bold text-gray-800 mb-3">Tournament Not Found</h2>
                <p class="text-gray-500 mb-2">We couldn't find a tournament with the code:</p>
                <p class="font-mono text-xl font-bold text-red-500 mb-6">${tournamentId?.toUpperCase() || 'UNKNOWN'}</p>
                
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                    <p class="text-sm text-amber-800">
                        <strong>Possible reasons:</strong>
                    </p>
                    <ul class="text-sm text-amber-700 mt-2 space-y-1">
                        <li>• The code was typed incorrectly</li>
                        <li>• The tournament was deleted</li>
                        <li>• The link is outdated</li>
                    </ul>
                </div>
                
                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                        onclick="Router.navigate('home')"
                        class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                    >
                        ← Back to Home
                    </button>
                    <button 
                        onclick="showJoinTournamentModal()"
                        class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                    >
                        Try Another Code
                    </button>
                </div>
            </div>
        </div>
        <div id="modal-container"></div>
    `;
}

// ===== SETTINGS TAB =====

function SettingsTab() {
    // Only organisers can see/use Settings
    if (!state.canEdit()) {
        return `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">🔒</div>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">Organiser Access Required</h2>
                <p class="text-gray-500">Settings are only available to the tournament organiser.</p>
            </div>
        `;
    }
    
    const subtabs = [
        { id: 'players', label: '👥 Players', icon: '👥' },
        { id: 'courts', label: '🏟️ Courts', icon: '🏟️' },
        { id: 'fixtures', label: '⚙️ Fixtures', icon: '⚙️' },
        { id: 'tournament', label: '🎯 Tournament', icon: '🎯' },
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
                                        <input type="text" value="${state.playerNames[i]}" class="w-full border rounded px-3 py-2" onchange="state.updatePlayerName(${i}, this.value); render();" />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Skill Rating:</label>
                                        <input type="number" min="0" max="5" step="0.01" value="${state.skillRatings[playerId]}" class="w-full border rounded px-3 py-2" onchange="state.updateSkillRating(${playerId}, parseFloat(this.value)); render();" />
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
                                    <input type="text" value="${state.matchNames[matchNum]}" class="w-full border rounded px-3 py-2" onchange="state.updateMatchName(${matchNum}, this.value); render();" placeholder="e.g. Court ${matchNum + 2}" />
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
                                    <input type="text" value="${state.knockoutNames[matchId]}" class="w-full border rounded px-3 py-2" onchange="state.updateKnockoutName('${matchId}', this.value); render();" placeholder="${labels[matchId]}" />
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
                                                    <input type="number" min="1" max="24" value="${match.team1[0]}" class="fixture-input" id="r${round}m${matchIdx}t1p1" onchange="handleFixtureChange(${round}, ${matchIdx}, 't1p1', this.value)" />
                                                    <span class="text-gray-400">&</span>
                                                    <input type="number" min="1" max="24" value="${match.team1[1]}" class="fixture-input" id="r${round}m${matchIdx}t1p2" onchange="handleFixtureChange(${round}, ${matchIdx}, 't1p2', this.value)" />
                                                </div>
                                                <span class="text-gray-400 font-bold">vs</span>
                                                <div class="flex items-center gap-1">
                                                    <input type="number" min="1" max="24" value="${match.team2[0]}" class="fixture-input" id="r${round}m${matchIdx}t2p1" onchange="handleFixtureChange(${round}, ${matchIdx}, 't2p1', this.value)" />
                                                    <span class="text-gray-400">&</span>
                                                    <input type="number" min="1" max="24" value="${match.team2[1]}" class="fixture-input" id="r${round}m${matchIdx}t2p2" onchange="handleFixtureChange(${round}, ${matchIdx}, 't2p2', this.value)" />
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
    } else if (state.settingsSubTab === 'tournament') {
        content = `
            <div class="space-y-6">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 class="font-semibold text-blue-900 mb-2">🎯 Tournament Configuration</h3>
                    <div class="text-sm text-blue-800">Configure match points and tab visibility settings for your tournament.</div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">🎮 Match Points Configuration</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Fixture Rounds Max Points</label>
                            <p class="text-xs text-gray-500 mb-3">Maximum points for matches in rounds 1-${CONFIG.TOTAL_ROUNDS}</p>
                            <select class="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-50 transition-all" value="${state.fixtureMaxScore}" onchange="state.updateFixtureMaxScore(parseInt(this.value)); render();">
                                ${Array.from({length: 17}, (_, i) => i + 8).map(n => `<option value="${n}" ${state.fixtureMaxScore === n ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Quarter Finals Max Points</label>
                            <p class="text-xs text-gray-500 mb-3">Maximum points for quarter final matches</p>
                            <select class="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-50 transition-all" value="${state.knockoutMaxScore}" onchange="state.updateKnockoutMaxScore(parseInt(this.value)); render();">
                                ${Array.from({length: 17}, (_, i) => i + 8).map(n => `<option value="${n}" ${state.knockoutMaxScore === n ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Semi Finals Max Points</label>
                            <p class="text-xs text-gray-500 mb-3">Maximum points for semi final matches</p>
                            <select class="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-50 transition-all" value="${state.semiMaxScore}" onchange="state.updateSemiMaxScore(parseInt(this.value)); render();">
                                ${Array.from({length: 17}, (_, i) => i + 8).map(n => `<option value="${n}" ${state.semiMaxScore === n ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Final Match Max Points</label>
                            <p class="text-xs text-gray-500 mb-3">Maximum points for the championship final</p>
                            <select class="w-full border border-gray-200 rounded-lg px-4 py-3 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-50 transition-all" value="${state.finalMaxScore}" onchange="state.updateFinalMaxScore(parseInt(this.value)); render();">
                                ${Array.from({length: 17}, (_, i) => i + 8).map(n => `<option value="${n}" ${state.finalMaxScore === n ? 'selected' : ''}>${n}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">👁️ Tab Visibility Settings</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <div class="font-semibold text-gray-800">Show Fairness Tabs</div>
                                <div class="text-sm text-gray-500">Display Fairness, Fairness 2, and Partners tabs in main navigation</div>
                            </div>
                            <button 
                                onclick="state.toggleFairnessTabs(); render();" 
                                class="px-6 py-2 rounded-lg font-medium transition-all ${state.showFairnessTabs ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'}"
                            >
                                ${state.showFairnessTabs ? '✓ Shown' : '✗ Hidden'}
                            </button>
                        </div>
                    </div>
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
                    <p class="text-sm text-gray-600 mb-4">This function has moved to the Admin panel for security.</p>
                    <a href="../admin.html" class="inline-block px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium">Go to Admin Panel</a>
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
    // Don't render if no state (we're on landing page)
    if (!state) return;
    
    // Don't render if tournament not loaded yet
    if (!state.isInitialized) return;
    
    const app = document.getElementById('app');
    const canEdit = state.canEdit();
    
    // If user is on Settings tab but not organiser, redirect to fixtures
    if (state.currentTab === 'settings' && !canEdit) {
        state.currentTab = 'fixtures';
    }
    
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
    
    // Calculate completed matches for progress indicator
    const completedMatches = state.countCompletedMatches();
    const totalMatches = CONFIG.TOTAL_ROUNDS * CONFIG.MATCHES_PER_ROUND;
    const progressPercent = Math.round((completedMatches / totalMatches) * 100);
    
    app.innerHTML = `
        <div class="max-w-7xl mx-auto p-4 md:p-6 pb-12">
            <!-- Header -->
            <div class="relative bg-white text-gray-900 rounded-3xl shadow-sm p-6 md:p-8 mb-6 overflow-hidden border border-gray-100">
                <div class="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-60"></div>
                <div class="relative">
                    <!-- Top row: Back button and Share -->
                    <div class="flex items-center justify-between mb-4">
                        <button onclick="Router.navigate('home')" class="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors group" title="Back to home">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span class="text-sm font-medium">Home</span>
                        </button>
                        <button onclick="showShareLinksModal()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share
                        </button>
                    </div>
                    
                    <!-- Main header content -->
                    <div class="flex items-start gap-4 mb-4">
                        <div class="text-4xl md:text-5xl">🏓</div>
                        <div class="flex-1 min-w-0">
                            <h1 class="text-2xl md:text-3xl font-bold mb-1 truncate" style="letter-spacing: -0.5px;">${state.tournamentName || 'Padel Tournament'}</h1>
                            <div class="flex items-center gap-3 text-sm">
                                <span class="text-gray-500">Code: <span class="font-mono font-bold text-blue-600">${state.tournamentId?.toUpperCase() || ''}</span></span>
                                <span class="text-gray-300">•</span>
                                <span class="text-gray-500">${completedMatches}/${totalMatches} matches</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Progress bar -->
                    <div class="mb-4">
                        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                    
                    <!-- Status badges -->
                    <div class="flex flex-wrap gap-2 text-xs">
                        <div class="flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 border border-gray-200">
                            <span>👥</span>
                            <span class="font-semibold text-gray-700">${CONFIG.TOTAL_PLAYERS} Players</span>
                        </div>
                        <div class="flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 border border-gray-200">
                            <span>🎯</span>
                            <span class="font-semibold text-gray-700">${CONFIG.TOTAL_ROUNDS} Rounds</span>
                        </div>
                        <div id="connection-indicator" class="flex items-center gap-1.5 bg-green-50 backdrop-blur rounded-full px-3 py-1.5 border border-green-200">
                            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span class="font-semibold text-green-700">Live</span>
                        </div>
                        ${canEdit ? `
                            <div class="flex items-center gap-1.5 bg-blue-50 backdrop-blur rounded-full px-3 py-1.5 border border-blue-200">
                                <span>✏️</span>
                                <span class="font-semibold text-blue-700">Organiser</span>
                            </div>
                        ` : `
                            <div class="flex items-center gap-1.5 bg-gray-100 backdrop-blur rounded-full px-3 py-1.5 border border-gray-200">
                                <span>👀</span>
                                <span class="font-semibold text-gray-600">View Only</span>
                            </div>
                            <button onclick="showOrganiserLoginModal()" class="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 backdrop-blur rounded-full px-3 py-1.5 border border-amber-200 transition-colors cursor-pointer">
                                <span>🔑</span>
                                <span class="font-semibold text-amber-700">Enter as Organiser</span>
                            </button>
                        `}
                    </div>
                </div>
            </div>
            
            <!-- Navigation Tabs -->
            <div class="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden border border-gray-100">
                <div class="overflow-x-auto">
                    <div class="flex p-2 gap-1 min-w-max">
                        <button onclick="state.currentTab = 'fixtures'; render();" class="px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'fixtures' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}">Fixtures</button>
                        ${canEdit ? `<button onclick="state.currentTab = 'settings'; render();" class="px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'settings' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}">Settings</button>` : ''}
                        <button onclick="state.currentTab = 'results'; render();" class="px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'results' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}">Results</button>
                        <button onclick="state.currentTab = 'resultsmatrix'; render();" class="px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'resultsmatrix' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}">Matrix</button>
                        ${state.showFairnessTabs ? `
                        <button onclick="state.currentTab = 'fairness'; render();" class="px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'fairness' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}">Fairness</button>
                        <button onclick="state.currentTab = 'fairness2'; render();" class="px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'fairness2' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}">Fairness 2</button>
                        ` : ''}
                        <button onclick="state.currentTab = 'partnerships'; render();" class="px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'partnerships' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}">Partners</button>
                        <button onclick="state.currentTab = 'knockout'; render();" class="px-4 py-2.5 font-semibold text-sm rounded-xl transition-all ${state.currentTab === 'knockout' ? 'tab-active' : 'tab-inactive hover:bg-gray-100'}">Knockout</button>
                    </div>
                </div>
            </div>
            
            <!-- Tab Content -->
            <div>${tabContent[state.currentTab]}</div>
        </div>
        
        <!-- Modal container -->
        <div id="modal-container"></div>
        
        <!-- Toast container -->
        <div id="toast-container" class="fixed bottom-4 right-4 z-50"></div>
    `;
}

// ===== START THE APP =====
window.addEventListener('DOMContentLoaded', initializeApp);

console.log('✅ Main app loaded');
