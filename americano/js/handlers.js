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
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg appearance-none">
                        ${Array.from({ length: CONFIG.MAX_PLAYERS - CONFIG.MIN_PLAYERS + 1 }, (_, i) => {
                            const count = CONFIG.MIN_PLAYERS + i;
                            const info = getTournamentInfo(count);
                            const fixtureText = info.fixtures ? `${info.fixtures} matches` : '33-38 matches';
                            return `<option value="${count}" ${count === 6 ? 'selected' : ''}>${count} players (${fixtureText})</option>`;
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
 * Go back to Step 1
 */
function goBackToWizardStep1() {
    document.getElementById('create-wizard-content').innerHTML = renderCreateWizardStep1();
    document.getElementById('create-name-input').value = window._createWizardData?.name || '';
    setTimeout(() => document.getElementById('create-name-input')?.focus(), 100);
}

/**
 * Go to Wizard Step 3: Court Count
 */
function goToWizardStep3() {
    const playerCount = parseInt(document.getElementById('create-player-count').value);
    window._createWizardData.playerCount = playerCount;
    
    // Get max courts from fixtures data
    const maxCourts = getMaxCourts(playerCount);
    
    // If only 1 court allowed, skip to step 4
    if (maxCourts === 1) {
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
                            const fixtureText = info.fixtures ? `${info.fixtures} matches` : '33-38 matches';
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
 * Go to Wizard Step 4: Passcode
 */
function goToWizardStep4() {
    const courtCount = parseInt(document.getElementById('create-court-count').value);
    window._createWizardData.courtCount = courtCount;
    
    document.getElementById('create-wizard-content').innerHTML = `
        <div class="space-y-4">
            <div class="text-center mb-2">
                <span class="text-sm text-gray-500">${window._createWizardData.name} • ${window._createWizardData.playerCount} players • ${courtCount} court${courtCount > 1 ? 's' : ''}</span>
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
                <button onclick="goBackToWizardStep3()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">← Back</button>
                <button onclick="handleCreateTournament()" class="flex-1 px-5 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors">Create ✓</button>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('create-passcode-input')?.focus(), 100);
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
    
    const { name, playerCount, courtCount } = window._createWizardData;
    
    try {
        const result = await createTournament(name, passcode, playerCount, courtCount);
        showSuccessModal(result.tournamentId, result.organiserKey);
    } catch (error) {
        console.error('Error creating tournament:', error);
        showToast('❌ Failed to create session');
    }
}

/**
 * Create tournament in Firebase
 */
async function createTournament(name, passcode, playerCount, courtCount) {
    const tournamentId = Router.generateTournamentId();
    const organiserKey = Router.generateOrganiserKey();
    const hashedPasscode = btoa(passcode);
    
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
    
    // Initialize empty scores
    const fixtures = getFixtures(playerCount, courtCount);
    const scores = {};
    fixtures.forEach((_, fixtureIdx) => {
        const roundIndex = Math.floor(fixtureIdx / courtCount);
        const matchIndex = fixtureIdx % courtCount;
        scores[`${roundIndex}_${matchIndex}`] = { team1: -1, team2: -1 };
    });
    
    const data = {
        meta: {
            name,
            organiserKey,
            passcodeHash: hashedPasscode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        playerCount,
        playerNames,
        courtCount,
        courtNames,
        fixedPoints: CONFIG.DEFAULT_FIXED_POINTS,
        totalPoints: CONFIG.DEFAULT_TOTAL_POINTS,
        scores,
        tournamentStarted: true
    };
    
    await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}`).set(data);
    MyTournaments.add(tournamentId, name);
    
    return { tournamentId, organiserKey };
}

/**
 * Show success modal after creation
 */
function showSuccessModal(tournamentId, organiserKey) {
    const playerLink = Router.getPlayerLink(tournamentId);
    const organiserLink = Router.getOrganiserLink(tournamentId, organiserKey);
    
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
