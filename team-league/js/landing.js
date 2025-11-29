// ===== TEAM LEAGUE LANDING PAGE =====

// ===== MY TOURNAMENTS STORAGE =====
const MyTournaments = {
    KEY: 'stretford_padel_team_leagues',
    
    getAll() {
        try {
            const data = localStorage.getItem(this.KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },
    
    add(tournamentId, name) {
        const tournaments = this.getAll();
        if (!tournaments.find(t => t.id === tournamentId)) {
            tournaments.unshift({
                id: tournamentId,
                name: name,
                createdAt: new Date().toISOString()
            });
            if (tournaments.length > 20) {
                tournaments.pop();
            }
            localStorage.setItem(this.KEY, JSON.stringify(tournaments));
        }
    },
    
    remove(tournamentId) {
        const tournaments = this.getAll().filter(t => t.id !== tournamentId);
        localStorage.setItem(this.KEY, JSON.stringify(tournaments));
    }
};

// ===== LANDING PAGE RENDER =====

function renderLandingPage() {
    const myTournaments = MyTournaments.getAll();
    
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen">
            <!-- Hero Section -->
            <div class="relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-700"></div>
                <div class="absolute inset-0 opacity-30">
                    <div class="absolute top-20 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                    <div class="absolute bottom-20 right-10 w-80 h-80 bg-pink-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                </div>
                
                <div class="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
                    <div class="text-center">
                        <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
                            <span class="text-3xl">👥</span>
                            <span class="text-white/90 font-medium">Stretford Padel</span>
                        </div>
                        
                        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6" style="letter-spacing: -2px; line-height: 1.1;">
                            Team League<br>Tournament
                        </h1>
                        
                        <p class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12" style="line-height: 1.6;">
                            Fixed pairs compete in group stages with round-robin format,<br class="hidden md:block">
                            followed by knockout rounds. Real-time sync across all devices.
                        </p>
                        
                        <!-- Main Actions -->
                        <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <button 
                                onclick="showCreateModal()"
                                class="flex-1 px-8 py-4 bg-white text-purple-700 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                            >
                                <span class="mr-2">✨</span> Create Tournament
                            </button>
                            
                            <button 
                                onclick="showJoinModal()"
                                class="flex-1 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all duration-200"
                            >
                                <span class="mr-2">🔗</span> Join with Code
                            </button>
                        </div>
                        
                        <div class="mt-8">
                            <a href="../" class="text-white/60 hover:text-white text-sm transition-colors">
                                ← Back to Stretford Padel Home
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- My Tournaments Section -->
            ${myTournaments.length > 0 ? `
                <div class="max-w-5xl mx-auto px-6 py-12">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <span class="text-xl">📋</span>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800" style="letter-spacing: -0.5px;">My Team Leagues</h2>
                        <span class="text-sm text-gray-400">(${myTournaments.length})</span>
                    </div>
                    
                    <div class="grid gap-4">
                        ${myTournaments.map(t => `
                            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4 flex-1 min-w-0">
                                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            ${t.name ? t.name.charAt(0).toUpperCase() : '👥'}
                                        </div>
                                        <div class="min-w-0">
                                            <h3 class="font-semibold text-gray-800 truncate">${t.name || 'Unnamed Tournament'}</h3>
                                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                                <span class="font-mono font-medium text-purple-600">${t.id.toUpperCase()}</span>
                                                <span class="text-gray-300">•</span>
                                                <span>${formatTimeAgo(t.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 flex-shrink-0">
                                        <button 
                                            onclick="event.stopPropagation(); Router.navigate('tournament', '${t.id}')"
                                            class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium text-sm transition-colors"
                                        >
                                            Open
                                        </button>
                                        <button 
                                            onclick="event.stopPropagation(); copyToClipboard('${Router.getPlayerLink(t.id)}'); showToast('✅ Link copied!')"
                                            class="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                                            title="Copy link"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                            </svg>
                                        </button>
                                        <button 
                                            onclick="event.stopPropagation(); removeFromMyTournaments('${t.id}')"
                                            class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Remove"
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
            
            <!-- Features Section -->
            <div class="bg-gray-50 border-t border-gray-100">
                <div class="max-w-5xl mx-auto px-6 py-16">
                    <div class="text-center mb-12">
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">Team League Format</h2>
                        <p class="text-gray-600">Fixed pairs, group stages, knockout rounds</p>
                    </div>
                    
                    <div class="grid md:grid-cols-3 gap-8">
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4 text-3xl">👥</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Fixed Teams</h3>
                            <p class="text-gray-600 text-sm">Create teams as player pairs with ratings. Partners stay together throughout the tournament.</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center mx-auto mb-4 text-3xl">📊</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Group Stage</h3>
                            <p class="text-gray-600 text-sm">One or two balanced groups with round-robin fixtures. Top teams qualify for knockouts.</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4 text-3xl">🏆</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Knockout Stage</h3>
                            <p class="text-gray-600 text-sm">Quarter finals, semi finals, optional 3rd place playoff, and the grand final.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="bg-gray-900 text-gray-400 py-8">
                <div class="max-w-5xl mx-auto px-6 text-center text-sm">
                    <p>Stretford Padel Team League • Built with ❤️ for the padel community</p>
                </div>
            </div>
        </div>
    `;
}

// ===== MODALS =====

function showCreateModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">👥 Create Team League</h2>
                </div>
                <div class="p-6">
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tournament Name</label>
                        <input type="text" id="create-name" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-lg" placeholder="e.g. Winter Team Championship" autofocus />
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Organiser Passcode</label>
                        <input type="password" id="create-passcode" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-lg" placeholder="Create a passcode" />
                        <p class="text-xs text-gray-500 mt-1">You'll need this to edit the tournament</p>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Confirm Passcode</label>
                        <input type="password" id="create-passcode-confirm" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-lg" placeholder="Confirm passcode" onkeypress="if(event.key === 'Enter') handleCreateTournament()" />
                    </div>
                    <div id="create-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p id="create-error-text" class="text-sm text-red-600 font-medium"></p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleCreateTournament()" class="flex-1 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">Create</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('create-name')?.focus(), 100);
}

function showJoinModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🔗 Join Tournament</h2>
                </div>
                <div class="p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Tournament Code</label>
                        <input type="text" id="join-code" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-lg text-center tracking-widest uppercase" placeholder="ABC123" maxlength="10" autofocus onkeypress="if(event.key === 'Enter') handleJoinTournament()" />
                    </div>
                    <div id="join-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">❌ Tournament not found</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleJoinTournament()" class="flex-1 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">Join</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('join-code')?.focus(), 100);
}

function showCreatedModal(tournamentId, organiserKey, name) {
    const playerLink = Router.getPlayerLink(tournamentId);
    const organiserLink = Router.getOrganiserLink(tournamentId, organiserKey);
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🎉 Tournament Created!</h2>
                </div>
                <div class="p-6">
                    <div class="text-center mb-6">
                        <div class="text-6xl mb-4">✅</div>
                        <p class="text-gray-600">${name}</p>
                    </div>
                    
                    <div class="space-y-4 mb-6">
                        <div class="bg-purple-50 rounded-xl p-4">
                            <div class="text-sm font-semibold text-purple-800 mb-2">📋 Tournament Code</div>
                            <div class="font-mono text-2xl font-bold text-purple-600 tracking-wider">${tournamentId.toUpperCase()}</div>
                        </div>
                        
                        <div class="bg-gray-50 rounded-xl p-4">
                            <div class="text-sm font-semibold text-gray-700 mb-2">🔗 Player Link</div>
                            <div class="flex items-center gap-2">
                                <input type="text" value="${playerLink}" readonly class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono" />
                                <button onclick="copyToClipboard('${playerLink}'); showToast('✅ Copied!')" class="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600">Copy</button>
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
                    
                    <button onclick="closeModal(); Router.navigate('tournament', '${tournamentId}', '${organiserKey}')" class="w-full px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
                        Open Tournament →
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== HANDLERS =====

async function handleCreateTournament() {
    const name = document.getElementById('create-name')?.value?.trim() || 'Team League';
    const passcode = document.getElementById('create-passcode')?.value;
    const passcodeConfirm = document.getElementById('create-passcode-confirm')?.value;
    const errorDiv = document.getElementById('create-error');
    const errorText = document.getElementById('create-error-text');
    
    // Validation
    if (!passcode || passcode.length < 4) {
        errorText.textContent = '❌ Passcode must be at least 4 characters';
        errorDiv?.classList.remove('hidden');
        return;
    }
    
    if (passcode !== passcodeConfirm) {
        errorText.textContent = '❌ Passcodes do not match';
        errorDiv?.classList.remove('hidden');
        return;
    }
    
    const tournamentId = Router.generateTournamentId();
    
    try {
        // Create in Firebase
        await createTournamentInFirebase(tournamentId, passcode, name);
        
        // Add to local storage
        MyTournaments.add(tournamentId, name);
        
        // Show success
        showCreatedModal(tournamentId, passcode, name);
    } catch (error) {
        console.error('Error creating tournament:', error);
        errorText.textContent = '❌ Failed to create tournament. Please try again.';
        errorDiv?.classList.remove('hidden');
    }
}

async function handleJoinTournament() {
    const code = document.getElementById('join-code')?.value?.trim().toLowerCase();
    const errorDiv = document.getElementById('join-error');
    
    if (!code) {
        errorDiv?.classList.remove('hidden');
        return;
    }
    
    try {
        const exists = await checkTournamentExists(code);
        
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

function removeFromMyTournaments(tournamentId) {
    if (confirm('Remove from your list?')) {
        MyTournaments.remove(tournamentId);
        renderLandingPage();
        showToast('✅ Removed');
    }
}

// ===== FIREBASE OPERATIONS =====

async function createTournamentInFirebase(tournamentId, organiserKey, name) {
    const data = {
        meta: {
            name: name,
            organiserKey: organiserKey,
            formatType: 'team_league',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        teamCount: CONFIG.DEFAULT_TEAM_COUNT,
        groupMode: CONFIG.DEFAULT_GROUP_MODE,
        includeThirdPlace: CONFIG.INCLUDE_THIRD_PLACE,
        teams: [],
        groupA: [],
        groupB: [],
        groupAFixtures: [],
        groupBFixtures: [],
        groupMatchScores: { A: {}, B: {} },
        knockoutScores: {
            qf1: { team1Score: null, team2Score: null },
            qf2: { team1Score: null, team2Score: null },
            qf3: { team1Score: null, team2Score: null },
            qf4: { team1Score: null, team2Score: null },
            sf1: { team1Score: null, team2Score: null },
            sf2: { team1Score: null, team2Score: null },
            thirdPlace: { team1Score: null, team2Score: null },
            final: { team1Score: null, team2Score: null }
        },
        knockoutTeams: {
            qf1: { team1: null, team2: null },
            qf2: { team1: null, team2: null },
            qf3: { team1: null, team2: null },
            qf4: { team1: null, team2: null },
            sf1: { team1: null, team2: null },
            sf2: { team1: null, team2: null },
            thirdPlace: { team1: null, team2: null },
            final: { team1: null, team2: null }
        },
        groupMaxScore: CONFIG.DEFAULT_MAX_SCORE,
        knockoutMaxScore: CONFIG.KNOCKOUT_MAX_SCORE,
        semiMaxScore: CONFIG.SEMI_MAX_SCORE,
        thirdPlaceMaxScore: CONFIG.THIRD_PLACE_MAX_SCORE,
        finalMaxScore: CONFIG.FINAL_MAX_SCORE,
        knockoutNames: {
            qf1: 'QF1', qf2: 'QF2', qf3: 'QF3', qf4: 'QF4',
            sf1: 'SF1', sf2: 'SF2',
            thirdPlace: '3rd Place', final: 'Final'
        },
        savedVersions: []
    };
    
    await database.ref(`team-tournaments/${tournamentId}`).set(data);
    console.log(`✅ Tournament ${tournamentId} created`);
}

async function checkTournamentExists(tournamentId) {
    try {
        const snapshot = await database.ref(`team-tournaments/${tournamentId}/meta`).once('value');
        return snapshot.exists();
    } catch (error) {
        return false;
    }
}

// ===== UTILITIES =====

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

console.log('✅ Team League Landing loaded');
