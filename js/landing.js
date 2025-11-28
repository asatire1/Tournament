// ===== LANDING PAGE COMPONENTS =====

// Store for my tournaments (in localStorage)
const MyTournaments = {
    KEY: 'stretford_padel_my_tournaments',
    
    // Get all my tournaments
    getAll() {
        try {
            const data = localStorage.getItem(this.KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },
    
    // Add a tournament I created
    add(tournamentId, organiserKey, name) {
        const tournaments = this.getAll();
        // Check if already exists
        if (!tournaments.find(t => t.id === tournamentId)) {
            tournaments.unshift({
                id: tournamentId,
                key: organiserKey,
                name: name,
                createdAt: new Date().toISOString()
            });
            // Keep only last 20
            if (tournaments.length > 20) {
                tournaments.pop();
            }
            localStorage.setItem(this.KEY, JSON.stringify(tournaments));
        }
    },
    
    // Remove a tournament
    remove(tournamentId) {
        const tournaments = this.getAll().filter(t => t.id !== tournamentId);
        localStorage.setItem(this.KEY, JSON.stringify(tournaments));
    }
};

// Remove tournament from My Tournaments list (just removes from local storage, not Firebase)
function removeMyTournament(tournamentId) {
    if (confirm('Remove this tournament from your list?\n\nNote: This only removes it from your local list. The tournament will still exist and can be accessed with the code.')) {
        MyTournaments.remove(tournamentId);
        // Re-render landing page
        const app = document.getElementById('app');
        app.innerHTML = renderLandingPage();
        setTimeout(() => loadRecentTournaments(), 100);
        showToast('✅ Removed from your list');
    }
}

// Render the landing page
function renderLandingPage() {
    const myTournaments = MyTournaments.getAll();
    
    return `
        <div class="min-h-screen" style="font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;">
            <!-- Hero Section -->
            <div class="relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800"></div>
                <div class="absolute inset-0 opacity-30">
                    <div class="absolute top-20 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                    <div class="absolute bottom-20 right-10 w-80 h-80 bg-purple-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                </div>
                
                <div class="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
                    <div class="text-center">
                        <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
                            <span class="text-3xl">🏓</span>
                            <span class="text-white/90 font-medium">Stretford Padel</span>
                        </div>
                        
                        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6" style="letter-spacing: -2px; line-height: 1.1;">
                            Tournament<br>Manager
                        </h1>
                        
                        <p class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12" style="line-height: 1.6;">
                            Create tournaments, share with players, track scores in real-time.
                            No registration required.
                        </p>
                        
                        <!-- Main Actions -->
                        <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <button 
                                onclick="showCreateTournamentModal()"
                                class="flex-1 px-8 py-4 bg-white text-blue-700 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                            >
                                <span class="mr-2">✨</span> Create Tournament
                            </button>
                            
                            <button 
                                onclick="showJoinTournamentModal()"
                                class="flex-1 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all duration-200"
                            >
                                <span class="mr-2">🔗</span> Join with Code
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- My Tournaments Section -->
            ${myTournaments.length > 0 ? `
                <div class="max-w-5xl mx-auto px-6 py-12">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <span class="text-xl">📋</span>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800" style="letter-spacing: -0.5px;">My Tournaments</h2>
                        <span class="text-sm text-gray-400">(${myTournaments.length})</span>
                    </div>
                    
                    <div class="grid gap-4">
                        ${myTournaments.map(t => `
                            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4 flex-1 min-w-0">
                                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            ${t.name ? t.name.charAt(0).toUpperCase() : '🏓'}
                                        </div>
                                        <div class="min-w-0">
                                            <h3 class="font-semibold text-gray-800 truncate">${t.name || 'Unnamed Tournament'}</h3>
                                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                                <span class="font-mono font-medium text-blue-600">${t.id.toUpperCase()}</span>
                                                <span class="text-gray-300">•</span>
                                                <span>${formatDate(t.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 flex-shrink-0">
                                        <button 
                                            onclick="event.stopPropagation(); Router.navigate('tournament', '${t.id}', '${t.key}')"
                                            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm transition-colors"
                                        >
                                            Open
                                        </button>
                                        <button 
                                            onclick="event.stopPropagation(); copyToClipboard('${Router.getPlayerLink(t.id)}'); showToast('✅ Player link copied!')"
                                            class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                            title="Copy player link"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                            </svg>
                                        </button>
                                        <button 
                                            onclick="event.stopPropagation(); removeMyTournament('${t.id}')"
                                            class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Remove from list"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <!-- Recent Public Tournaments Section -->
            <div class="max-w-5xl mx-auto px-6 py-12" id="recent-tournaments-section">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <span class="text-xl">🌐</span>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800" style="letter-spacing: -0.5px;">Recent Tournaments</h2>
                </div>
                
                <div id="recent-tournaments-list" class="grid gap-4">
                    <div class="text-center py-8 text-gray-400">
                        <div class="animate-pulse">Loading recent tournaments...</div>
                    </div>
                </div>
            </div>
            
            <!-- Features Section -->
            <div class="bg-gray-50 border-t border-gray-100">
                <div class="max-w-5xl mx-auto px-6 py-16">
                    <div class="text-center mb-12">
                        <h2 class="text-3xl font-bold text-gray-800 mb-4" style="letter-spacing: -0.5px;">How It Works</h2>
                        <p class="text-gray-600">Simple, fast, no registration needed</p>
                    </div>
                    
                    <div class="grid md:grid-cols-3 gap-8">
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4 text-3xl">
                                1️⃣
                            </div>
                            <h3 class="font-semibold text-gray-800 mb-2">Create Tournament</h3>
                            <p class="text-gray-600 text-sm">Give it a name and you're ready to go. Default players and fixtures included.</p>
                        </div>
                        
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4 text-3xl">
                                2️⃣
                            </div>
                            <h3 class="font-semibold text-gray-800 mb-2">Share Link</h3>
                            <p class="text-gray-600 text-sm">Send the player link to everyone. They can view scores in real-time.</p>
                        </div>
                        
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4 text-3xl">
                                3️⃣
                            </div>
                            <h3 class="font-semibold text-gray-800 mb-2">Enter Scores</h3>
                            <p class="text-gray-600 text-sm">Use your organiser link to enter scores. Changes sync instantly.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="bg-gray-900 text-gray-400 py-8">
                <div class="max-w-5xl mx-auto px-6 text-center text-sm">
                    <p>Stretford Padel Tournament Manager • Built with ❤️ for the padel community</p>
                </div>
            </div>
        </div>
        
        <!-- Modals container -->
        <div id="modal-container"></div>
        
        <!-- Toast container -->
        <div id="toast-container" class="fixed bottom-4 right-4 z-50"></div>
    `;
}

// Create Tournament Modal
function showCreateTournamentModal() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" style="font-family: 'Space Grotesk', sans-serif;">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">✨ Create New Tournament</h2>
                </div>
                
                <div class="p-6">
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Admin Passcode</label>
                        <input 
                            type="password" 
                            id="admin-passcode-input" 
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg text-center tracking-widest"
                            placeholder="Enter passcode"
                            autofocus
                        />
                        <p class="text-xs text-gray-500 mt-1">Required to create tournaments</p>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tournament Name</label>
                        <input 
                            type="text" 
                            id="tournament-name-input" 
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
                            placeholder="e.g. Sunday Session Dec 1st"
                        />
                    </div>
                    
                    <div id="passcode-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">❌ Incorrect passcode</p>
                    </div>
                    
                    <div class="bg-blue-50 rounded-xl p-4 mb-6">
                        <div class="flex items-start gap-3">
                            <span class="text-xl">💡</span>
                            <div class="text-sm text-blue-800">
                                <p class="font-medium mb-1">What happens next:</p>
                                <ul class="space-y-1 text-blue-700">
                                    <li>• 24 default players will be set up</li>
                                    <li>• 13 rounds of fixtures ready to go</li>
                                    <li>• You get an organiser link to edit</li>
                                    <li>• Share the player link for viewing</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-3">
                        <button 
                            onclick="closeModal()"
                            class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onclick="createTournament()"
                            class="flex-1 px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                        >
                            Create Tournament
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Focus the passcode input
    setTimeout(() => {
        document.getElementById('admin-passcode-input')?.focus();
    }, 100);
}

// Join Tournament Modal
function showJoinTournamentModal() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" style="font-family: 'Space Grotesk', sans-serif;">
                <div class="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🔗 Join Tournament</h2>
                </div>
                
                <div class="p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tournament Code</label>
                        <input 
                            type="text" 
                            id="tournament-code-input" 
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-lg text-center tracking-widest uppercase"
                            placeholder="abc123"
                            maxlength="10"
                            autofocus
                            onkeypress="if(event.key === 'Enter') joinTournament()"
                        />
                        <p class="text-xs text-gray-500 mt-2 text-center">Enter the 6-character code from your organiser</p>
                    </div>
                    
                    <div class="flex gap-3">
                        <button 
                            onclick="closeModal()"
                            class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onclick="joinTournament()"
                            class="flex-1 px-5 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
                        >
                            Join
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        document.getElementById('tournament-code-input')?.focus();
    }, 100);
}

// Show tournament created success modal with links
function showTournamentCreatedModal(tournamentId, organiserKey, name) {
    const playerLink = Router.getPlayerLink(tournamentId);
    const organiserLink = Router.getOrganiserLink(tournamentId, organiserKey);
    
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden" style="font-family: 'Space Grotesk', sans-serif;">
                <div class="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 text-center">
                    <div class="text-4xl mb-2">🎉</div>
                    <h2 class="text-xl font-bold text-white">Tournament Created!</h2>
                </div>
                
                <div class="p-6 space-y-5">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-gray-800">${name}</div>
                        <div class="text-sm text-gray-500 mt-1">Code: <span class="font-mono font-bold text-blue-600">${tournamentId.toUpperCase()}</span></div>
                    </div>
                    
                    <!-- Player Link -->
                    <div class="bg-blue-50 rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-semibold text-blue-800">🔗 Share with Players</span>
                            <button 
                                onclick="copyToClipboard('${playerLink}'); this.innerHTML = '✓ Copied!'; setTimeout(() => this.innerHTML = 'Copy', 2000)"
                                class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-medium transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                        <input 
                            type="text" 
                            value="${playerLink}" 
                            readonly 
                            class="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-gray-600 font-mono"
                            onclick="this.select()"
                        />
                        <p class="text-xs text-blue-600 mt-2">Players can view scores but not edit</p>
                    </div>
                    
                    <!-- Organiser Link -->
                    <div class="bg-amber-50 rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-semibold text-amber-800">🔑 Your Organiser Link</span>
                            <button 
                                onclick="copyToClipboard('${organiserLink}'); this.innerHTML = '✓ Copied!'; setTimeout(() => this.innerHTML = 'Copy', 2000)"
                                class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                        <input 
                            type="text" 
                            value="${organiserLink}" 
                            readonly 
                            class="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-gray-600 font-mono"
                            onclick="this.select()"
                        />
                        <p class="text-xs text-amber-600 mt-2">⚠️ Keep this private! Use on any device to edit.</p>
                    </div>
                    
                    <button 
                        onclick="closeModal(); Router.navigate('tournament', '${tournamentId}', '${organiserKey}')"
                        class="w-full px-5 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors text-lg"
                    >
                        Go to Tournament →
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Close modal
function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

// Create tournament
async function createTournament() {
    const passcodeInput = document.getElementById('admin-passcode-input');
    const nameInput = document.getElementById('tournament-name-input');
    const passcodeError = document.getElementById('passcode-error');
    
    const passcode = passcodeInput?.value.trim();
    const name = nameInput?.value.trim() || `Tournament ${new Date().toLocaleDateString()}`;
    
    // Debug logging
    console.log('Entered passcode:', passcode, 'Length:', passcode?.length);
    console.log('Expected passcode:', CONFIG.ADMIN_PASSCODE, 'Length:', CONFIG.ADMIN_PASSCODE?.length);
    console.log('Match:', passcode === CONFIG.ADMIN_PASSCODE);
    
    // Verify admin passcode
    if (passcode !== CONFIG.ADMIN_PASSCODE) {
        // Show error
        if (passcodeError) {
            passcodeError.classList.remove('hidden');
        }
        if (passcodeInput) {
            passcodeInput.classList.add('border-red-500');
            passcodeInput.focus();
            passcodeInput.select();
        }
        return;
    }
    
    // Generate IDs
    const tournamentId = Router.generateTournamentId();
    const organiserKey = Router.generateOrganiserKey();
    
    try {
        // Show loading state
        const btn = document.querySelector('[onclick="createTournament()"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="animate-pulse">Creating...</span>';
        }
        
        // Create tournament in Firebase
        await createTournamentInFirebase(tournamentId, organiserKey, name);
        
        // Save to my tournaments
        MyTournaments.add(tournamentId, organiserKey, name);
        
        // Show success modal
        showTournamentCreatedModal(tournamentId, organiserKey, name);
        
    } catch (error) {
        console.error('Error creating tournament:', error);
        alert('Failed to create tournament. Please try again.');
        closeModal();
    }
}

// Join tournament by code
function joinTournament() {
    const codeInput = document.getElementById('tournament-code-input');
    const code = codeInput?.value.trim().toLowerCase();
    
    if (!code || code.length < 4) {
        alert('Please enter a valid tournament code');
        return;
    }
    
    closeModal();
    Router.navigate('tournament', code);
}

// Create tournament data in Firebase
async function createTournamentInFirebase(tournamentId, organiserKey, name) {
    // Load default data
    const [playersRes, fixturesRes, matchNamesRes] = await Promise.all([
        fetch(CONFIG.DATA_PATHS.PLAYERS),
        fetch(CONFIG.DATA_PATHS.FIXTURES),
        fetch(CONFIG.DATA_PATHS.MATCH_NAMES)
    ]);
    
    const playersData = await playersRes.json();
    const fixturesData = await fixturesRes.json();
    const matchNamesData = await matchNamesRes.json();
    
    // Prepare player names and ratings
    const playerNames = playersData.players.map(p => p.name);
    const skillRatings = {};
    playersData.players.forEach(p => {
        skillRatings[p.id] = p.rating;
    });
    
    // Create tournament object
    const tournamentData = {
        meta: {
            name: name,
            organiserKey: organiserKey,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        playerNames: playerNames,
        skillRatings: skillRatings,
        fixtures: fixturesData,
        matchNames: matchNamesData.fixtureMatches,
        knockoutNames: matchNamesData.knockoutMatches,
        matchScores: {},
        knockoutScores: {},
        fixtureMaxScore: CONFIG.FIXTURE_MAX_SCORE,
        knockoutMaxScore: CONFIG.KNOCKOUT_MAX_SCORE,
        semiMaxScore: CONFIG.SEMI_MAX_SCORE,
        finalMaxScore: CONFIG.FINAL_MAX_SCORE,
        showFairnessTabs: true,
        savedVersions: []
    };
    
    // Save to Firebase
    await database.ref(`tournaments/${tournamentId}`).set(tournamentData);
    
    console.log(`✅ Tournament ${tournamentId} created successfully`);
    return tournamentData;
}

// Load recent tournaments from Firebase
async function loadRecentTournaments() {
    try {
        const snapshot = await database.ref('tournaments')
            .orderByChild('meta/createdAt')
            .limitToLast(10)
            .once('value');
        
        const tournaments = [];
        snapshot.forEach(child => {
            const data = child.val();
            if (data && data.meta) {
                tournaments.push({
                    id: child.key,
                    name: data.meta.name,
                    createdAt: data.meta.createdAt,
                    updatedAt: data.meta.updatedAt
                });
            }
        });
        
        // Reverse to show newest first
        tournaments.reverse();
        
        renderRecentTournaments(tournaments);
    } catch (error) {
        console.error('Error loading recent tournaments:', error);
        renderRecentTournaments([]);
    }
}

// Render recent tournaments list
function renderRecentTournaments(tournaments) {
    const container = document.getElementById('recent-tournaments-list');
    if (!container) return;
    
    if (tournaments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <div class="text-5xl mb-4 opacity-50">🏓</div>
                <p class="text-gray-500 mb-2">No tournaments yet</p>
                <p class="text-sm text-gray-400">Be the first to create one!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tournaments.map(t => {
        // Calculate time ago
        const timeAgo = formatDate(t.updatedAt || t.createdAt);
        
        return `
            <div 
                class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group"
                onclick="Router.navigate('tournament', '${t.id}')"
            >
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            ${t.name ? t.name.charAt(0).toUpperCase() : '🏓'}
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">${t.name || 'Unnamed Tournament'}</h3>
                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                <span class="font-mono font-medium text-gray-600">${t.id.toUpperCase()}</span>
                                <span class="text-gray-300">•</span>
                                <span>${timeAgo}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Utility: Format date
function formatDate(isoString) {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Utility: Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
}

// Utility: Show toast notification
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg mb-2 animate-fade-in';
    toast.innerHTML = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

console.log('✅ Landing page components loaded');
