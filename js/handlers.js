/**
 * handlers.js - Event Handlers for Americano Tournament
 * Modal management, form submissions, and user interactions
 */

/**
 * Show create tournament modal (wizard-style)
 */
function showCreateModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">✨ Create Americano Session</h2>
                </div>
                <div class="p-6" id="create-wizard-content">
                    ${renderCreateWizardStep1()}
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('create-name-input')?.focus(), 100);
}

/**
 * Wizard Step 1: Session Name
 */
function renderCreateWizardStep1() {
    return `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Session Name</label>
                <input type="text" id="create-name-input" 
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg" 
                    placeholder="e.g. Saturday Americano" 
                    maxlength="50"
                    onkeypress="if(event.key === 'Enter') goToWizardStep2()" />
            </div>
            <div class="flex gap-3">
                <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                <button onclick="goToWizardStep2()" class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">Next →</button>
            </div>
        </div>
    `;
}

/**
 * Go to Wizard Step 2: Player Count
 */
function goToWizardStep2() {
    const name = document.getElementById('create-name-input').value.trim();
    if (!name) {
        showToast('❌ Please enter a session name');
        return;
    }
    
    // Store name temporarily
    window._createWizardData = { name };
    
    document.getElementById('create-wizard-content').innerHTML = `
        <div class="space-y-4">
            <div class="text-center mb-2">
                <span class="text-sm text-gray-500">Session: ${name}</span>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Number of Players</label>
                <div class="relative">
                    <select id="create-player-count" 
                        onchange="onPlayerCountChange(this.value)"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg appearance-none">
                        ${Array.from({ length: CONFIG.MAX_PLAYERS - CONFIG.MIN_PLAYERS + 1 }, (_, i) => {
                            const count = CONFIG.MIN_PLAYERS + i;
                            const info = getTournamentInfo(count);
                            const fixtureText = info && info.fixtures ? `${info.fixtures} matches` : '~30 matches';
                            const groupsHint = count === 24 ? ' ⭐ Groups mode available!' : '';
                            return `<option value="${count}" ${count === 8 ? 'selected' : ''}>${count} players (${fixtureText})${groupsHint}</option>`;
                        }).join('')}
                    </select>
                    <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                </div>
                
                <!-- 24 players hint -->
                <div id="groups-mode-hint" class="hidden mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">🏆</span>
                        <div>
                            <div class="font-semibold text-purple-800 text-sm">Groups + Knockout Available!</div>
                            <div class="text-xs text-purple-600">With 24 players, you can run a quick tournament with 4 groups and knockout rounds (6-8 games per player).</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex gap-3">
                <button onclick="goBackToWizardStep1()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">← Back</button>
                <button onclick="goToWizardStep3()" class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">Next →</button>
            </div>
        </div>
    `;
}

/**
 * Handle player count change to show/hide groups hint
 */
function onPlayerCountChange(value) {
    const hint = document.getElementById('groups-mode-hint');
    if (hint) {
        if (parseInt(value) === 24) {
            hint.classList.remove('hidden');
        } else {
            hint.classList.add('hidden');
        }
    }
}

/**
 * Go back to Step 1
 */
function goBackToWizardStep1() {
    document.getElementById('create-wizard-content').innerHTML = renderCreateWizardStep1();
    document.getElementById('create-name-input').value = window._createWizardData?.name || '';
    setTimeout(() => document.getElementById('create-name-input')?.focus(), 100);
}

/**
 * Go to Wizard Step 2b: Format/Groupings Selection (for 24 players)
 */
function goToWizardStep2b() {
    const playerCount = parseInt(document.getElementById('create-player-count')?.value || window._createWizardData.playerCount);
    window._createWizardData.playerCount = playerCount;
    
    document.getElementById('create-wizard-content').innerHTML = `
        <div class="space-y-4">
            <div class="text-center mb-2">
                <span class="text-sm text-gray-500">${window._createWizardData.name} • ${playerCount} players</span>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">How do you want to play?</label>
                <div class="space-y-3">
                    <label class="flex items-start gap-3 p-4 border-2 border-blue-500 bg-blue-50 rounded-xl cursor-pointer format-option" data-format="classic">
                        <input type="radio" name="format-type" value="classic" checked class="mt-1 w-4 h-4 text-blue-600" onchange="selectFormatType('classic')">
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800">🔄 Classic Americano</div>
                            <div class="text-xs text-gray-500 mt-1">Everyone partners with everyone. 138 matches total, ~23 games per player. Best for longer sessions.</div>
                        </div>
                    </label>
                    
                    <label class="flex items-start gap-3 p-4 border-2 border-gray-200 hover:border-purple-300 rounded-xl cursor-pointer format-option" data-format="groups">
                        <input type="radio" name="format-type" value="groups" class="mt-1 w-4 h-4 text-purple-600" onchange="selectFormatType('groups')">
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800 flex items-center gap-2">
                                🏆 Groups + Knockout
                                <span class="text-xs px-2 py-0.5 bg-purple-200 text-purple-700 rounded-full">QUICK</span>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">4 groups of 6 players. Partner with everyone in your group (5 games), then knockout rounds. 6-8 games per player total.</div>
                        </div>
                    </label>
                </div>
                
                <!-- Groups explanation (shown when groups selected) -->
                <div id="groups-explanation" class="hidden mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <h4 class="font-semibold text-purple-800 text-sm mb-2">🏆 How Groups + Knockout Works</h4>
                    <ul class="text-xs text-purple-700 space-y-1">
                        <li>• 24 players split into 4 groups (A, B, C, D)</li>
                        <li>• Each player partners with everyone in their group once (5 matches)</li>
                        <li>• Matches first to 32 points (4 serves each, then switch)</li>
                        <li>• Your points scored determine your group ranking</li>
                        <li>• Top players pair up for knockout: QF → SF → Final</li>
                        <li>• Minimum 6 games, up to 8 if you reach the final</li>
                    </ul>
                </div>
            </div>
            <div class="flex gap-3 mt-4">
                <button onclick="goBackToWizardStep2()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">← Back</button>
                <button onclick="goToWizardStep3()" class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">Next →</button>
            </div>
        </div>
    `;
}

/**
 * Select format type (classic or groups)
 */
function selectFormatType(format) {
    window._createWizardData.formatType = format;
    
    // Update visual selection
    document.querySelectorAll('.format-option').forEach(opt => {
        const optFormat = opt.dataset.format;
        if (optFormat === format) {
            opt.classList.remove('border-gray-200');
            opt.classList.add(format === 'groups' ? 'border-purple-500' : 'border-blue-500', 
                             format === 'groups' ? 'bg-purple-50' : 'bg-blue-50');
        } else {
            opt.classList.remove('border-blue-500', 'border-purple-500', 'bg-blue-50', 'bg-purple-50');
            opt.classList.add('border-gray-200');
        }
    });
    
    // Show/hide groups explanation
    const explanation = document.getElementById('groups-explanation');
    if (explanation) {
        if (format === 'groups') {
            explanation.classList.remove('hidden');
        } else {
            explanation.classList.add('hidden');
        }
    }
}

/**
 * Go to Wizard Step 3: Court Count
 */
function goToWizardStep3() {
    const playerCountEl = document.getElementById('create-player-count');
    
    // If coming from step 2b (format selection), player count is already stored
    if (!playerCountEl && window._createWizardData.playerCount) {
        // Continue with stored data
    } else if (playerCountEl) {
        const playerCount = parseInt(playerCountEl.value);
        if (isNaN(playerCount) || playerCount < CONFIG.MIN_PLAYERS || playerCount > CONFIG.MAX_PLAYERS) {
            showToast('❌ Invalid player count');
            return;
        }
        window._createWizardData.playerCount = playerCount;
        
        // If 24 players selected and no format chosen yet, go to format selection
        if (playerCount === 24 && !window._createWizardData.formatType) {
            goToWizardStep2b();
            return;
        }
    }
    
    const playerCount = window._createWizardData.playerCount;
    const formatType = window._createWizardData.formatType || 'classic';
    
    // For groups mode, skip court selection (always 4 courts)
    if (formatType === 'groups') {
        window._createWizardData.courtCount = 4;
        goToWizardStep4();
        return;
    }
    
    // Get max courts from fixtures data
    const maxCourts = getMaxCourts(playerCount);
    console.log(`Player count: ${playerCount}, Max courts: ${maxCourts}`);
    
    // If only 1 court allowed, skip to step 4
    if (maxCourts <= 1) {
        window._createWizardData.courtCount = 1;
        goToWizardStep4();
        return;
    }
    
    document.getElementById('create-wizard-content').innerHTML = `
        <div class="space-y-4">
            <div class="text-center mb-2">
                <span class="text-sm text-gray-500">${window._createWizardData.name} • ${playerCount} players</span>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Number of Courts</label>
                <div class="relative">
                    <select id="create-court-count" 
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg appearance-none">
                        ${(() => {
                            const minCourts = getMinCourts(playerCount);
                            const options = [];
                            for (let count = minCourts; count <= maxCourts; count++) {
                                const playersPerRound = count * 4;
                                const resting = playerCount - playersPerRound;
                                const info = getTournamentInfo(playerCount, count);
                                const fixtureInfo = info && info.fixtures ? ` - ${info.fixtures} matches` : '';
                                options.push(`<option value="${count}">${count} court${count > 1 ? 's' : ''} (${resting === 0 ? 'everyone plays' : resting + ' resting'}${fixtureInfo})</option>`);
                            }
                            return options.join('');
                        })()}
                    </select>
                    <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                </div>
                <p class="text-xs text-gray-500 mt-2">More courts = fewer rounds, more players active per round</p>
            </div>
            <div class="flex gap-3">
                <button onclick="goBackToWizardStep2()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">← Back</button>
                <button onclick="goToWizardStep4()" class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">Next →</button>
            </div>
        </div>
    `;
}

/**
 * Go back to Step 2
 */
function goBackToWizardStep2() {
    document.getElementById('create-wizard-content').innerHTML = `
        <div class="space-y-4">
            <div class="text-center mb-2">
                <span class="text-sm text-gray-500">Session: ${window._createWizardData.name}</span>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Number of Players</label>
                <div class="relative">
                    <select id="create-player-count" 
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg appearance-none">
                        ${Array.from({ length: CONFIG.MAX_PLAYERS - CONFIG.MIN_PLAYERS + 1 }, (_, i) => {
                            const count = CONFIG.MIN_PLAYERS + i;
                            const info = getTournamentInfo(count);
                            const fixtureText = info && info.fixtures ? `${info.fixtures} matches` : '~30 matches';
                            return `<option value="${count}" ${count === window._createWizardData.playerCount ? 'selected' : ''}>${count} players (${fixtureText})</option>`;
                        }).join('')}
                    </select>
                    <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                </div>
            </div>
            <div class="flex gap-3">
                <button onclick="goBackToWizardStep1()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">← Back</button>
                <button onclick="goToWizardStep3()" class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">Next →</button>
            </div>
        </div>
    `;
}

/**
 * Go to Wizard Step 4: Mode Selection
 */
function goToWizardStep4() {
    const courtCount = document.getElementById('create-court-count')?.value || window._createWizardData.courtCount;
    window._createWizardData.courtCount = parseInt(courtCount);
    
    // Check user permissions for mode selection
    const currentUser = getCurrentUser();
    const isVerified = currentUser && currentUser.type === 'registered' && currentUser.status === 'verified';
    
    document.getElementById('create-wizard-content').innerHTML = `
        <div class="space-y-4">
            <div class="text-center mb-2">
                <span class="text-sm text-gray-500">${window._createWizardData.name} • ${window._createWizardData.playerCount} players • ${window._createWizardData.courtCount} court${window._createWizardData.courtCount > 1 ? 's' : ''}</span>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Who Can Join?</label>
                <div class="space-y-2">
                    <label class="flex items-center gap-3 p-3 border-2 border-blue-500 bg-blue-50 rounded-xl cursor-pointer tournament-mode-option" data-mode="anyone">
                        <input type="radio" name="tournament-mode" value="anyone" checked class="w-4 h-4 text-blue-600" onchange="selectTournamentMode('anyone')">
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800 text-sm">🌍 Anyone</div>
                            <div class="text-xs text-gray-500">Guests and registered players</div>
                        </div>
                    </label>
                    
                    <label class="flex items-center gap-3 p-3 border-2 ${isVerified ? 'border-gray-200 hover:border-blue-300' : 'border-gray-100 opacity-50'} rounded-xl ${isVerified ? 'cursor-pointer' : 'cursor-not-allowed'} tournament-mode-option" data-mode="registered">
                        <input type="radio" name="tournament-mode" value="registered" ${!isVerified ? 'disabled' : ''} class="w-4 h-4 text-blue-600" onchange="selectTournamentMode('registered')">
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800 text-sm">👥 Registered Only</div>
                            <div class="text-xs text-gray-500">Only registered players</div>
                        </div>
                        ${!isVerified ? '<span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Verified only</span>' : ''}
                    </label>
                    
                    <label class="flex items-center gap-3 p-3 border-2 ${isVerified ? 'border-gray-200 hover:border-blue-300' : 'border-gray-100 opacity-50'} rounded-xl ${isVerified ? 'cursor-pointer' : 'cursor-not-allowed'} tournament-mode-option" data-mode="level-based">
                        <input type="radio" name="tournament-mode" value="level-based" ${!isVerified ? 'disabled' : ''} class="w-4 h-4 text-blue-600" onchange="selectTournamentMode('level-based')">
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800 text-sm">🎯 Level-Based</div>
                            <div class="text-xs text-gray-500">Verified players in level range</div>
                        </div>
                        ${!isVerified ? '<span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Verified only</span>' : ''}
                    </label>
                </div>
                <input type="hidden" id="selected-tournament-mode" value="anyone" />
            </div>
            
            <!-- Level Range (shown only for level-based mode) -->
            <div id="level-range-container" class="hidden p-3 bg-purple-50 rounded-xl border border-purple-200">
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
                <button onclick="goBackToWizardStep3()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">← Back</button>
                <button onclick="goToWizardStep5()" class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">Next →</button>
            </div>
        </div>
    `;
}

/**
 * Select tournament mode
 */
function selectTournamentMode(mode) {
    document.getElementById('selected-tournament-mode').value = mode;
    
    // Update visual selection
    document.querySelectorAll('.tournament-mode-option').forEach(opt => {
        const optMode = opt.dataset.mode;
        if (optMode === mode) {
            opt.classList.remove('border-gray-200', 'border-gray-100');
            opt.classList.add('border-blue-500', 'bg-blue-50');
        } else {
            opt.classList.remove('border-blue-500', 'bg-blue-50');
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
 * Go to Wizard Step 5: Passcode
 */
function goToWizardStep5() {
    const mode = document.getElementById('selected-tournament-mode')?.value || 'anyone';
    window._createWizardData.mode = mode;
    
    if (mode === 'level-based') {
        window._createWizardData.levelMin = parseFloat(document.getElementById('level-min')?.value || '0');
        window._createWizardData.levelMax = parseFloat(document.getElementById('level-max')?.value || '10');
        
        if (window._createWizardData.levelMin >= window._createWizardData.levelMax) {
            showToast('❌ Max level must be greater than min level');
            return;
        }
    }
    
    const modeLabels = { 'anyone': '🌍 Open', 'registered': '👥 Registered', 'level-based': '🎯 Level' };
    
    document.getElementById('create-wizard-content').innerHTML = `
        <div class="space-y-4">
            <div class="text-center mb-2">
                <span class="text-sm text-gray-500">${window._createWizardData.name} • ${window._createWizardData.playerCount}p • ${window._createWizardData.courtCount}c • ${modeLabels[mode]}</span>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Organiser Passcode</label>
                <input type="password" id="create-passcode-input" 
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg text-center tracking-widest" 
                    placeholder="••••" 
                    maxlength="20"
                    onkeypress="if(event.key === 'Enter') handleCreateTournament()" />
                <p class="text-xs text-gray-500 mt-2">You'll need this to edit scores. Keep it secret!</p>
            </div>
            <div class="flex gap-3">
                <button onclick="goBackToWizardStep4()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">← Back</button>
                <button onclick="handleCreateTournament()" class="flex-1 px-5 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors">Create ✓</button>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('create-passcode-input')?.focus(), 100);
}

/**
 * Go back to Step 4
 */
function goBackToWizardStep4() {
    goToWizardStep4();
}

/**
 * Go back to Step 3
 */
function goBackToWizardStep3() {
    const playerCount = window._createWizardData.playerCount;
    const maxCourts = getMaxCourts(playerCount);
    
    // If only 1 court allowed, go back to step 2 instead
    if (maxCourts === 1) {
        goBackToWizardStep2();
        return;
    }
    
    document.getElementById('create-wizard-content').innerHTML = `
        <div class="space-y-4">
            <div class="text-center mb-2">
                <span class="text-sm text-gray-500">${window._createWizardData.name} • ${playerCount} players</span>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Number of Courts</label>
                <div class="relative">
                    <select id="create-court-count" 
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg appearance-none">
                        ${Array.from({ length: maxCourts }, (_, i) => {
                            const count = i + 1;
                            const playersPerRound = count * 4;
                            const resting = playerCount - playersPerRound;
                            return `<option value="${count}" ${count === window._createWizardData.courtCount ? 'selected' : ''}>${count} court${count > 1 ? 's' : ''} (${resting === 0 ? 'everyone plays' : resting + ' resting'})</option>`;
                        }).join('')}
                    </select>
                    <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                </div>
                <p class="text-xs text-gray-500 mt-2">More courts = fewer rounds, more players active per round</p>
            </div>
            <div class="flex gap-3">
                <button onclick="goBackToWizardStep2()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">← Back</button>
                <button onclick="goToWizardStep4()" class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">Next →</button>
            </div>
        </div>
    `;
}

/**
 * Handle tournament creation
 */
async function handleCreateTournament() {
    const passcode = document.getElementById('create-passcode-input').value;
    if (!passcode) {
        showToast('❌ Please enter a passcode');
        return;
    }
    
    const { name, playerCount, courtCount, mode, levelMin, levelMax, formatType } = window._createWizardData;
    
    // Prepare mode settings
    const modeSettings = {
        mode: mode || 'anyone',
        allowGuests: mode === 'anyone',
        requireRegistered: mode === 'registered' || mode === 'level-based',
        requireVerified: mode === 'level-based',
        levelCriteria: mode === 'level-based' ? { min: levelMin, max: levelMax } : null
    };
    
    try {
        const result = await createTournament(name, passcode, playerCount, courtCount, modeSettings, formatType);
        showSuccessModal(result.tournamentId, result.organiserKey, mode, formatType);
    } catch (error) {
        console.error('Error creating tournament:', error);
        showToast('❌ Failed to create session');
    }
}

/**
 * Create tournament in Firebase
 */
async function createTournament(name, passcode, playerCount, courtCount, modeSettings = null, formatType = 'classic') {
    const tournamentId = Router.generateTournamentId();
    const organiserKey = Router.generateOrganiserKey();
    const hashedPasscode = await CryptoUtils.hashPasscode(passcode);
    
    // Get current user for creator info
    const currentUser = getCurrentUser();
    
    // Get organizer UID for cross-device "My Tournaments"
    let organizerUid = null;
    if (typeof OrganizerAuth !== 'undefined') {
        try {
            organizerUid = await OrganizerAuth.ensureUid();
        } catch (e) {
            console.warn('Could not get organizer UID:', e);
        }
    }
    
    // Generate default player names
    const playerNames = {};
    for (let i = 0; i < playerCount; i++) {
        playerNames[i] = `Player ${i + 1}`;
    }
    
    // Generate default court names
    const courtNames = {};
    for (let i = 0; i < courtCount; i++) {
        courtNames[i] = `Court ${i + 1}`;
    }
    
    // Default mode settings
    const defaultModeSettings = {
        mode: 'anyone',
        allowGuests: true,
        requireRegistered: false,
        requireVerified: false,
        levelCriteria: null
    };
    
    // Base data structure
    const data = {
        meta: {
            name,
            organiserKey,
            passcodeHash: hashedPasscode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            organizerUid: organizerUid,
            ...(modeSettings || defaultModeSettings),
            createdBy: currentUser ? {
                id: currentUser.id,
                name: currentUser.name,
                type: currentUser.type
            } : null
        },
        formatType: formatType || 'classic',
        playerCount,
        playerNames,
        courtCount,
        courtNames,
        fixedPoints: CONFIG.DEFAULT_FIXED_POINTS,
        totalPoints: formatType === 'groups' ? CONFIG.GROUPS_MODE.DEFAULT_POINTS : CONFIG.DEFAULT_TOTAL_POINTS,
        tournamentStarted: true,
        registeredPlayers: {}
    };
    
    // Add format-specific data
    if (formatType === 'groups') {
        // Groups mode: 24 players split into 4 groups of 6
        const shuffledPlayers = shuffleArray([...Array(24)].map((_, i) => i + 1));
        data.groups = {
            A: shuffledPlayers.slice(0, 6),
            B: shuffledPlayers.slice(6, 12),
            C: shuffledPlayers.slice(12, 18),
            D: shuffledPlayers.slice(18, 24)
        };
        data.groupScores = {};
        data.knockoutScores = {};
        data.knockoutBracket = null;
        
        // Court names for groups mode
        data.courtNames = {
            0: 'Court A',
            1: 'Court B',
            2: 'Court C',
            3: 'Court D'
        };
    } else {
        // Classic mode: Start with empty scores (populated when matches are played)
        data.scores = {};
    }
    
    await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}`).set(data);
    MyTournaments.add(tournamentId, name);
    
    // Invalidate cloud cache so new tournament shows up
    if (typeof MyTournamentsCloud !== 'undefined') {
        MyTournamentsCloud.invalidateCache();
    }
    
    return { tournamentId, organiserKey };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Show success modal after creation
 */
function showSuccessModal(tournamentId, organiserKey, mode = 'anyone', formatType = 'classic') {
    const playerLink = Router.getPlayerLink(tournamentId);
    const organiserLink = Router.getOrganiserLink(tournamentId, organiserKey);
    
    const modeLabels = {
        'anyone': '🌍 Open to Anyone',
        'registered': '👥 Registered Only',
        'level-based': '🎯 Level-Based'
    };
    const modeLabel = modeLabels[mode] || modeLabels['anyone'];
    const formatLabel = formatType === 'groups' ? '🏆 Groups + Knockout' : '🔄 Classic Americano';
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🎉 Session Created!</h2>
                </div>
                <div class="p-6">
                    <div class="text-center mb-6">
                        <div class="text-6xl mb-4">✅</div>
                        <p class="text-gray-600">Your Americano session is ready!</p>
                        <p class="text-sm text-gray-500 mt-1">${formatLabel} • ${modeLabel}</p>
                    </div>
                    <div class="space-y-4 mb-6">
                        <div class="bg-blue-50 rounded-xl p-4">
                            <div class="text-sm font-semibold text-blue-800 mb-2">📋 Session Code</div>
                            <div class="font-mono text-2xl font-bold text-blue-600 tracking-wider">${tournamentId.toUpperCase()}</div>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-4">
                            <div class="text-sm font-semibold text-gray-700 mb-2">🔗 Player Link</div>
                            <div class="flex items-center gap-2">
                                <input type="text" value="${playerLink}" readonly class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono" />
                                <button onclick="copyToClipboard('${playerLink}'); showToast('✅ Copied!')" class="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">Copy</button>
                            </div>
                        </div>
                        <div class="bg-amber-50 rounded-xl p-4">
                            <div class="text-sm font-semibold text-amber-800 mb-2">🔑 Organiser Link (keep secret!)</div>
                            <div class="flex items-center gap-2">
                                <input type="text" value="${organiserLink}" readonly class="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono" />
                                <button onclick="copyToClipboard('${organiserLink}'); showToast('✅ Copied!')" class="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Copy</button>
                            </div>
                        </div>
                    </div>
                    <button onclick="closeModal(); Router.navigate('tournament', '${tournamentId}', '${organiserKey}')" class="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">Open Session →</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show join session modal
 */
function showJoinModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🔗 Join Session</h2>
                </div>
                <div class="p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Session Code</label>
                        <input type="text" id="join-code-input" 
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg text-center tracking-widest uppercase" 
                            placeholder="ABC123" 
                            maxlength="10" 
                            autofocus 
                            onkeypress="if(event.key === 'Enter') handleJoinSession()" />
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleJoinSession()" class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">Join</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('join-code-input')?.focus(), 100);
}

/**
 * Handle join session
 */
async function handleJoinSession() {
    const code = document.getElementById('join-code-input').value.trim().toLowerCase();
    if (!code) {
        showToast('❌ Please enter a session code');
        return;
    }
    
    const exists = await checkTournamentExists(code);
    if (exists) {
        closeModal();
        Router.navigate('tournament', code);
    } else {
        showToast('❌ Session not found');
    }
}

/**
 * Show share modal
 */
function showShareModal() {
    if (!state) return;
    
    const playerLink = Router.getPlayerLink(state.tournamentId);
    const organiserLink = state.organiserKey ? Router.getOrganiserLink(state.tournamentId, state.organiserKey) : null;
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">📤 Share Session</h2>
                </div>
                <div class="p-6 space-y-4">
                    <div class="bg-blue-50 rounded-xl p-4">
                        <div class="text-sm font-semibold text-blue-800 mb-2">📋 Session Code</div>
                        <div class="font-mono text-2xl font-bold text-blue-600 tracking-wider">${state.tournamentId.toUpperCase()}</div>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-4">
                        <div class="text-sm font-semibold text-gray-700 mb-2">🔗 Player Link</div>
                        <div class="flex items-center gap-2">
                            <input type="text" value="${playerLink}" readonly class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono" />
                            <button onclick="copyToClipboard('${playerLink}'); showToast('✅ Copied!')" class="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600">Copy</button>
                        </div>
                    </div>
                    ${organiserLink ? `
                        <div class="bg-amber-50 rounded-xl p-4">
                            <div class="text-sm font-semibold text-amber-800 mb-2">🔑 Your Organiser Link</div>
                            <div class="flex items-center gap-2">
                                <input type="text" value="${organiserLink}" readonly class="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono" />
                                <button onclick="copyToClipboard('${organiserLink}'); showToast('✅ Copied!')" class="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Copy</button>
                            </div>
                        </div>
                    ` : ''}
                    <button onclick="closeModal()" class="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Done</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show organiser login modal
 */
function showOrganiserLoginModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🔑 Organiser Login</h2>
                </div>
                <div class="p-6">
                    <p class="text-sm text-gray-600 mb-4">Enter your organiser passcode to edit this session.</p>
                    <div class="mb-4">
                        <input type="password" id="login-passcode-input" 
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-lg text-center tracking-widest" 
                            placeholder="••••" 
                            autofocus 
                            onkeypress="if(event.key === 'Enter') handleOrganiserLogin()" />
                    </div>
                    <div id="login-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">❌ Invalid passcode</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleOrganiserLogin()" class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">Login</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('login-passcode-input')?.focus(), 100);
}

/**
 * Handle organiser login
 */
async function handleOrganiserLogin() {
    const passcode = document.getElementById('login-passcode-input').value;
    if (!passcode) {
        document.getElementById('login-error').classList.remove('hidden');
        return;
    }
    
    try {
        const storedHash = await getPasscodeHash(state.tournamentId);
        
        if (storedHash && await CryptoUtils.verifyPasscode(passcode, storedHash)) {
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

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
    window._createWizardData = null;
}

/**
 * Copy to clipboard
 */
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

/**
 * Show toast notification
 */
function showToast(message) {
    const container = document.getElementById('toast-container');
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

/**
 * Format time ago for display
 */
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

// ===== REGISTERED PLAYERS MANAGEMENT =====

/**
 * Show registered players modal (for organisers)
 */
function showRegisteredPlayersModal() {
    if (!state || !state.canEdit()) return;
    
    const registeredPlayers = state.registeredPlayers || {};
    const playersList = Object.entries(registeredPlayers);
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">📋 Registered Players</h2>
                    <p class="text-white/80 text-sm">Players who have signed up to join</p>
                </div>
                
                <div class="p-6 overflow-y-auto max-h-[60vh]">
                    ${playersList.length === 0 ? `
                        <div class="text-center py-8">
                            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <span class="text-3xl">👥</span>
                            </div>
                            <p class="text-gray-500">No players have registered yet</p>
                            <p class="text-sm text-gray-400 mt-2">Share your session link to get players!</p>
                        </div>
                    ` : `
                        <div class="space-y-3">
                            ${playersList.map(([id, player]) => `
                                <div class="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        ${(player.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div class="flex-1">
                                        <div class="font-semibold text-gray-800">${escapeHtmlAm(player.name || 'Unknown')}</div>
                                        <div class="text-sm text-gray-500">
                                            Rating: ${player.rating || '?'} • 
                                            ${player.userType === 'registered' ? '<span class="text-green-600">Registered</span>' : '<span class="text-gray-400">Guest</span>'}
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="showAssignPlayerModal('${id}')" 
                                            class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                                            Assign
                                        </button>
                                        <button onclick="removeRegisteredPlayer('${id}')"
                                            class="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium transition-colors">
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
                
                <div class="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button onclick="closeModal()" class="w-full px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show modal to assign a registered player to a slot
 */
function showAssignPlayerModal(registeredPlayerId) {
    if (!state || !state.canEdit()) return;
    
    const player = state.registeredPlayers?.[registeredPlayerId];
    if (!player) return;
    
    const playerCount = state.playerCount || 6;
    const playerNames = state.playerNames || {};
    
    // Create slot options
    let slotOptions = '';
    for (let i = 0; i < playerCount; i++) {
        const currentName = playerNames[i] || `Player ${i + 1}`;
        const isDefault = currentName === `Player ${i + 1}` || currentName.startsWith('Player ');
        slotOptions += `<option value="${i}" ${isDefault ? 'class="text-gray-400"' : ''}>${i + 1}. ${currentName}</option>`;
    }
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">📍 Assign Player to Slot</h2>
                </div>
                
                <div class="p-6">
                    <div class="bg-gray-50 rounded-xl p-4 mb-6">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                ${(player.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="font-semibold text-gray-800">${escapeHtmlAm(player.name || 'Unknown')}</div>
                                <div class="text-sm text-gray-500">Rating: ${player.rating || '?'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Assign to Slot</label>
                        <select id="assign-slot-select" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none">
                            ${slotOptions}
                        </select>
                        <p class="text-xs text-gray-500 mt-2">This will replace the current player in that slot</p>
                    </div>
                    
                    <div class="flex gap-3">
                        <button onclick="showRegisteredPlayersModal()" 
                            class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                            ← Back
                        </button>
                        <button onclick="confirmAssignPlayer('${registeredPlayerId}')"
                            class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">
                            Assign
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Confirm assigning player to slot
 */
async function confirmAssignPlayer(registeredPlayerId) {
    if (!state || !state.canEdit()) return;
    
    const player = state.registeredPlayers?.[registeredPlayerId];
    if (!player) return;
    
    const slotSelect = document.getElementById('assign-slot-select');
    const slotIndex = parseInt(slotSelect.value);
    
    if (isNaN(slotIndex)) return;
    
    // Update player name
    if (!state.playerNames) state.playerNames = {};
    state.playerNames[slotIndex] = player.name;
    
    // Remove from registered players
    delete state.registeredPlayers[registeredPlayerId];
    
    // Save to Firebase
    await state.saveToFirebase();
    
    closeModal();
    showToast(`✅ ${player.name} assigned to slot ${slotIndex + 1}`);
    renderTournament();
}

/**
 * Remove a registered player
 */
async function removeRegisteredPlayer(registeredPlayerId) {
    if (!state || !state.canEdit()) return;
    
    if (!confirm('Remove this player from the registration list?')) return;
    
    if (state.registeredPlayers && state.registeredPlayers[registeredPlayerId]) {
        delete state.registeredPlayers[registeredPlayerId];
        await state.saveToFirebase();
        showRegisteredPlayersModal();
        showToast('✅ Player removed');
    }
}

/**
 * Escape HTML for safe display
 */
function escapeHtmlAm(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}
