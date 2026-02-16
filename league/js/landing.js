/**
 * landing.js - League Landing Page & Creation Wizard
 * Landing page with create/join options, My Leagues list, and 6-step creation wizard.
 */

// ===== LOCAL STORAGE HELPERS =====

function getSavedLeagues() {
    try {
        const data = localStorage.getItem(CONFIG.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function saveLeagueToLocalStorage(id, name, organiserKey) {
    const leagues = getSavedLeagues();
    const existing = leagues.findIndex(l => l.id === id);
    const entry = {
        id,
        name,
        organiserKey: organiserKey || null,
        lastVisited: new Date().toISOString()
    };
    if (existing >= 0) {
        leagues[existing] = { ...leagues[existing], ...entry };
    } else {
        leagues.unshift(entry);
    }
    // Cap at max stored
    if (leagues.length > CONFIG.MAX_STORED_LEAGUES) {
        leagues.pop();
    }
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(leagues));
}

function removeLeagueFromLocalStorage(id) {
    const leagues = getSavedLeagues().filter(l => l.id !== id);
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(leagues));
}

// ===== UTILITY FUNCTIONS =====

function showToast(message) {
    // Remove any existing toast
    const existing = document.getElementById('league-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'league-toast';
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-3 rounded-xl shadow-lg z-[100] text-sm font-medium transition-opacity duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
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

function closeModal() {
    const container = document.getElementById('modal-container');
    if (container) container.innerHTML = '';
}

function formatTimeAgo(isoString) {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== WIZARD STATE =====

const WizardState = {
    currentStep: 1,
    totalSteps: 6,

    // Step 1: League Info
    leagueName: '',
    venue: '',
    description: '',

    // Step 2: Division Setup
    divisionCount: CONFIG.DEFAULT_DIVISIONS,
    divisionNames: [...CONFIG.DEFAULT_DIVISION_NAMES],
    promotionCount: CONFIG.DEFAULT_PROMOTION_COUNT,

    // Step 3: Teams (per division)
    // divisions[i] = { name, teams: [{ name, player1, player2, player1Rating, player2Rating }] }
    divisions: [],

    // Step 4: Match Settings
    setsPerMatch: CONFIG.DEFAULT_SETS_PER_MATCH,
    gamesPerSet: CONFIG.DEFAULT_GAMES_PER_SET,
    tiebreakAtDeuce: true,

    // Step 5: Schedule
    seasonStartDate: '',
    matchDay: CONFIG.DEFAULT_MATCH_DAY,
    matchTime: CONFIG.DEFAULT_MATCH_TIME,
    courts: CONFIG.DEFAULT_COURTS,
    excludedDates: [],
    schedulePreview: null,

    // Step 6: Review (no extra state needed)

    reset() {
        this.currentStep = 1;
        this.leagueName = '';
        this.venue = '';
        this.description = '';
        this.divisionCount = CONFIG.DEFAULT_DIVISIONS;
        this.divisionNames = [...CONFIG.DEFAULT_DIVISION_NAMES];
        this.promotionCount = CONFIG.DEFAULT_PROMOTION_COUNT;
        this.divisions = [];
        this.setsPerMatch = CONFIG.DEFAULT_SETS_PER_MATCH;
        this.gamesPerSet = CONFIG.DEFAULT_GAMES_PER_SET;
        this.tiebreakAtDeuce = true;
        this.seasonStartDate = '';
        this.matchDay = CONFIG.DEFAULT_MATCH_DAY;
        this.matchTime = CONFIG.DEFAULT_MATCH_TIME;
        this.courts = CONFIG.DEFAULT_COURTS;
        this.excludedDates = [];
        this.schedulePreview = null;
    },

    getDivisionNamesForCount(count) {
        const names = {
            2: ['Lower', 'Upper'],
            3: ['Beginner', 'Intermediate', 'Advanced'],
            4: ['Beginner', 'Intermediate', 'Advanced', 'Elite'],
            5: ['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Elite']
        };
        return names[count] || names[3];
    },

    initDivisions() {
        this.divisions = [];
        for (let i = 0; i < this.divisionCount; i++) {
            const existingDiv = this.divisions[i];
            this.divisions.push({
                name: this.divisionNames[i] || `Division ${i + 1}`,
                teams: existingDiv?.teams || [
                    { name: '', player1: '', player2: '', player3: '', player4: '', player1Rating: 5, player2Rating: 5, player3Rating: 5, player4Rating: 5 },
                    { name: '', player1: '', player2: '', player3: '', player4: '', player1Rating: 5, player2Rating: 5, player3Rating: 5, player4Rating: 5 },
                    { name: '', player1: '', player2: '', player3: '', player4: '', player1Rating: 5, player2Rating: 5, player3Rating: 5, player4Rating: 5 },
                    { name: '', player1: '', player2: '', player3: '', player4: '', player1Rating: 5, player2Rating: 5, player3Rating: 5, player4Rating: 5 }
                ]
            });
        }
    },

    getTotalTeams() {
        return this.divisions.reduce((sum, d) => sum + d.teams.length, 0);
    },

    getTotalMatches() {
        let total = 0;
        this.divisions.forEach(d => {
            const n = d.teams.length;
            // Round robin: each team plays every other team once
            total += (n * (n - 1)) / 2;
        });
        return total;
    }
};

// ===== RENDER LANDING PAGE =====

function renderLanding() {
    const savedLeagues = getSavedLeagues();
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen">
            <!-- Hero Section -->
            <div class="relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900"></div>
                <div class="absolute inset-0 opacity-30">
                    <div class="absolute top-20 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                    <div class="absolute bottom-20 right-10 w-80 h-80 bg-indigo-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                </div>

                <div class="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
                    <div class="text-center">
                        <!-- Badge -->
                        <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
                            <span class="text-3xl">🏆</span>
                            <span class="text-white/90 font-medium">Uber Padel</span>
                        </div>

                        <!-- Title -->
                        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6" style="letter-spacing: -2px; line-height: 1.1;">
                            Padel League
                        </h1>

                        <!-- Subtitle -->
                        <p class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12" style="line-height: 1.6;">
                            Divisions, round-robin fixtures, promotion &amp; relegation.<br class="hidden md:block">
                            Organise your league season from start to finish.
                        </p>

                        <!-- CTA Buttons -->
                        <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <button onclick="showCreateWizard()"
                                class="flex-1 px-8 py-4 bg-white text-indigo-700 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200">
                                <span class="mr-2">✨</span> Create New League
                            </button>
                            <button onclick="showJoinModal()"
                                class="flex-1 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all duration-200">
                                <span class="mr-2">🔗</span> Join with Code
                            </button>
                        </div>

                        <!-- Back Link -->
                        <div class="mt-8">
                            <a href="../" class="text-white/60 hover:text-white text-sm transition-colors">
                                ← Back to Uber Padel Home
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Join League Section (inline) -->
            <div class="max-w-5xl mx-auto px-6 py-12">
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <span class="text-xl">🔗</span>
                        </div>
                        <h2 class="text-xl font-bold text-gray-800" style="letter-spacing: -0.5px;">Join a League</h2>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-3 max-w-lg">
                        <input
                            type="text"
                            id="inline-join-code"
                            class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-center tracking-widest uppercase text-lg"
                            placeholder="Enter 6-char code"
                            maxlength="10"
                            onkeypress="if(event.key === 'Enter') handleInlineJoin()"
                        />
                        <button
                            onclick="handleInlineJoin()"
                            class="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">
                            Join League
                        </button>
                    </div>
                    <p id="inline-join-error" class="hidden text-sm text-red-600 font-medium mt-2">League not found. Please check the code and try again.</p>
                </div>
            </div>

            <!-- My Leagues Section -->
            ${savedLeagues.length > 0 ? `
                <div class="max-w-5xl mx-auto px-6 pb-12">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                <span class="text-xl">📋</span>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800" style="letter-spacing: -0.5px;">My Leagues</h2>
                            <span class="text-sm text-gray-400">(${savedLeagues.length})</span>
                        </div>
                        <button
                            onclick="clearAllLeagues()"
                            class="text-sm text-gray-400 hover:text-red-500 transition-colors">
                            Clear All
                        </button>
                    </div>

                    <div class="grid gap-4">
                        ${savedLeagues.map(l => `
                            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onclick="navigateToLeague('${l.id}', ${l.organiserKey ? `'${l.organiserKey}'` : 'null'})">
                                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            ${l.name ? l.name.charAt(0).toUpperCase() : '🏆'}
                                        </div>
                                        <div class="min-w-0">
                                            <h3 class="font-semibold text-gray-800 truncate">
                                                ${l.name || 'Unnamed League'}
                                            </h3>
                                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                                <span class="font-mono font-medium text-indigo-600">${l.id.toUpperCase()}</span>
                                                <span class="text-gray-300">•</span>
                                                <span>${formatTimeAgo(l.lastVisited)}</span>
                                                ${l.organiserKey ? '<span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Organiser</span>' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onclick="event.stopPropagation(); navigateToLeague('${l.id}', ${l.organiserKey ? `'${l.organiserKey}'` : 'null'})"
                                            class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium text-sm transition-colors">
                                            Open
                                        </button>
                                        <button
                                            onclick="event.stopPropagation(); copyToClipboard('${l.id.toUpperCase()}'); showToast('Code copied to clipboard')"
                                            class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                            title="Copy code">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onclick="event.stopPropagation(); removeLeague('${l.id}')"
                                            class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                            title="Remove">
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
                        <h2 class="text-3xl font-bold text-gray-800 mb-4" style="letter-spacing: -0.5px;">League Format</h2>
                        <p class="text-gray-600">Structured seasons with divisions, fixtures, and promotion</p>
                    </div>

                    <div class="grid md:grid-cols-3 gap-8">
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4 text-3xl">🏟️</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Multiple Divisions</h3>
                            <p class="text-gray-600 text-sm">Organise teams into 2-5 skill-based divisions. Everyone plays at their level.</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4 text-3xl">📅</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Auto-Scheduling</h3>
                            <p class="text-gray-600 text-sm">Generate round-robin fixtures with court assignments. Set match days, times, and excluded dates.</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4 text-3xl">🔄</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Promotion & Relegation</h3>
                            <p class="text-gray-600 text-sm">Top teams move up, bottom teams move down. Keep the competition fierce across seasons.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-gray-900 text-gray-400 py-8">
                <div class="max-w-5xl mx-auto px-6 text-center text-sm">
                    <p>Uber Padel League • Built for the padel community</p>
                </div>
            </div>
        </div>
    `;
}

// ===== NAVIGATION HELPERS =====

function navigateToLeague(id, organiserKey) {
    saveLeagueToLocalStorage(id, null, organiserKey);
    Router.navigate('league', id, organiserKey);
}

function removeLeague(id) {
    if (confirm('Remove this league from your list?')) {
        removeLeagueFromLocalStorage(id);
        renderLanding();
        showToast('League removed');
    }
}

function clearAllLeagues() {
    if (confirm('Remove all leagues from your list? This cannot be undone.')) {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        renderLanding();
        showToast('All leagues cleared');
    }
}

// ===== JOIN LEAGUE =====

function showJoinModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🔗 Join League</h2>
                    <p class="text-white/70 text-sm">Enter the league code shared by your organiser</p>
                </div>
                <div class="p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">League Code</label>
                        <input type="text" id="join-code"
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-lg text-center tracking-widest uppercase"
                            placeholder="ABC123" maxlength="10" autofocus
                            onkeypress="if(event.key === 'Enter') joinLeague()" />
                    </div>
                    <div id="join-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">League not found. Please check the code.</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="joinLeague()" id="join-btn" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">Join</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('join-code')?.focus(), 100);
}

async function joinLeague() {
    const codeInput = document.getElementById('join-code');
    const code = codeInput?.value?.trim().toLowerCase();
    const errorDiv = document.getElementById('join-error');
    const joinBtn = document.getElementById('join-btn');

    if (!code || code.length < 4) {
        if (errorDiv) {
            errorDiv.querySelector('p').textContent = 'Please enter a valid league code.';
            errorDiv.classList.remove('hidden');
        }
        return;
    }

    // Disable button while checking
    if (joinBtn) {
        joinBtn.disabled = true;
        joinBtn.textContent = 'Checking...';
    }

    try {
        const exists = await checkLeagueExists(code);
        if (exists) {
            // Fetch league name
            const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${code}/meta/name`).once('value');
            const name = snapshot.val() || 'League';
            saveLeagueToLocalStorage(code, name);
            closeModal();
            Router.navigate('league', code);
        } else {
            if (errorDiv) {
                errorDiv.querySelector('p').textContent = 'League not found. Please check the code.';
                errorDiv.classList.remove('hidden');
            }
            if (joinBtn) {
                joinBtn.disabled = false;
                joinBtn.textContent = 'Join';
            }
        }
    } catch (error) {
        console.error('Error joining league:', error);
        if (errorDiv) {
            errorDiv.querySelector('p').textContent = 'Something went wrong. Please try again.';
            errorDiv.classList.remove('hidden');
        }
        if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join';
        }
    }
}

async function handleInlineJoin() {
    const codeInput = document.getElementById('inline-join-code');
    const code = codeInput?.value?.trim().toLowerCase();
    const errorEl = document.getElementById('inline-join-error');

    if (errorEl) errorEl.classList.add('hidden');

    if (!code || code.length < 4) {
        if (errorEl) errorEl.classList.remove('hidden');
        return;
    }

    try {
        const exists = await checkLeagueExists(code);
        if (exists) {
            const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${code}/meta/name`).once('value');
            const name = snapshot.val() || 'League';
            saveLeagueToLocalStorage(code, name);
            Router.navigate('league', code);
        } else {
            if (errorEl) errorEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error joining league:', error);
        if (errorEl) errorEl.classList.remove('hidden');
    }
}

// ===== PASSCODE MODAL =====

function showPasscodeModal(leagueId) {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">🔐 Organiser Login</h2>
                    <p class="text-white/70 text-sm">Enter the organiser passcode</p>
                </div>
                <div class="p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Passcode</label>
                        <input type="password" id="passcode-input"
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-lg text-center tracking-widest"
                            placeholder="Enter passcode" maxlength="20" autofocus
                            onkeypress="if(event.key === 'Enter') verifyPasscode('${leagueId}')" />
                    </div>
                    <div id="passcode-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">Incorrect passcode. Please try again.</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="verifyPasscode('${leagueId}')" id="passcode-btn" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">Verify</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('passcode-input')?.focus(), 100);
}

async function verifyPasscode(leagueId) {
    const input = document.getElementById('passcode-input');
    const passcode = input?.value?.trim();
    const errorDiv = document.getElementById('passcode-error');
    const btn = document.getElementById('passcode-btn');

    if (!passcode) {
        if (errorDiv) errorDiv.classList.remove('hidden');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Verifying...';
    }

    try {
        const storedHash = await getPasscodeHash(leagueId);
        let isValid = false;

        if (typeof CryptoUtils !== 'undefined') {
            isValid = await CryptoUtils.verifyPasscode(passcode, storedHash);
        } else {
            // Fallback: direct comparison (for legacy data)
            isValid = passcode === storedHash;
        }

        if (isValid) {
            const organiserKey = await getOrganiserKey(leagueId);
            if (organiserKey) {
                saveLeagueToLocalStorage(leagueId, null, organiserKey);
                closeModal();
                Router.navigate('league', leagueId, organiserKey);
            } else {
                if (errorDiv) {
                    errorDiv.querySelector('p').textContent = 'Could not retrieve organiser key.';
                    errorDiv.classList.remove('hidden');
                }
            }
        } else {
            if (errorDiv) {
                errorDiv.querySelector('p').textContent = 'Incorrect passcode. Please try again.';
                errorDiv.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error verifying passcode:', error);
        if (errorDiv) {
            errorDiv.querySelector('p').textContent = 'Something went wrong. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }

    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Verify';
    }
}

// ===== CREATE LEAGUE WIZARD =====

function showCreateWizard() {
    WizardState.reset();
    // Set default start date to next week
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    WizardState.seasonStartDate = nextWeek.toISOString().split('T')[0];
    renderWizardStep();
}

function renderWizardStep() {
    const step = WizardState.currentStep;

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-slide-up">
                <!-- Header with Progress -->
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-5">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-xl font-bold text-white">✨ Create League</h2>
                        <span class="text-white/80 text-sm">Step ${step} of ${WizardState.totalSteps}</span>
                    </div>
                    <!-- Step Labels -->
                    <div class="flex gap-1 mb-2">
                        ${['Info', 'Divisions', 'Teams', 'Match', 'Schedule', 'Review'].map((label, i) => `
                            <div class="flex-1 text-center">
                                <div class="text-xs ${i + 1 <= step ? 'text-white' : 'text-white/40'} font-medium">${label}</div>
                            </div>
                        `).join('')}
                    </div>
                    <!-- Progress Bar -->
                    <div class="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div class="h-full bg-white rounded-full transition-all duration-300" style="width: ${(step / WizardState.totalSteps) * 100}%"></div>
                    </div>
                </div>

                <div class="p-6">
                    ${step === 1 ? renderWizardStep1() : ''}
                    ${step === 2 ? renderWizardStep2() : ''}
                    ${step === 3 ? renderWizardStep3() : ''}
                    ${step === 4 ? renderWizardStep4() : ''}
                    ${step === 5 ? renderWizardStep5() : ''}
                    ${step === 6 ? renderWizardStep6() : ''}
                </div>
            </div>
        </div>
    `;

    // Auto-focus first input
    setTimeout(() => {
        const firstInput = document.querySelector('#wizard-content input:not([type="radio"]):not([type="checkbox"]):not([type="date"]):not([type="time"])');
        if (firstInput) firstInput.focus();
    }, 100);
}

// ===== STEP 1: League Info =====

function renderWizardStep1() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">League Information</h3>
            <p class="text-gray-500 text-sm mb-6">Basic details about your league</p>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">League Name <span class="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="wizard-league-name"
                        value="${WizardState.leagueName}"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-lg"
                        placeholder="e.g. Manchester Padel League"
                    />
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Venue</label>
                    <input
                        type="text"
                        id="wizard-venue"
                        value="${WizardState.venue}"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                        placeholder="e.g. City Padel Centre (optional)"
                    />
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                        id="wizard-description"
                        rows="3"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors resize-none"
                        placeholder="Brief description of the league (optional)"
                    >${WizardState.description}</textarea>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Organiser Passcode <span class="text-red-500">*</span></label>
                    <input
                        type="password"
                        id="wizard-passcode"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                        placeholder="Create a passcode (min 4 chars)"
                    />
                    <p class="text-xs text-gray-500 mt-1">You will need this to manage the league</p>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Confirm Passcode <span class="text-red-500">*</span></label>
                    <input
                        type="password"
                        id="wizard-passcode-confirm"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                        placeholder="Confirm passcode"
                        onkeypress="if(event.key === 'Enter') wizardNext()"
                    />
                </div>
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                Cancel
            </button>
            <button onclick="wizardNext()" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">
                Next →
            </button>
        </div>
    `;
}

// ===== STEP 2: Division Setup =====

function renderWizardStep2() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Division Setup</h3>
            <p class="text-gray-500 text-sm mb-6">How many divisions and what are they called?</p>

            <div class="space-y-6">
                <!-- Number of Divisions -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Number of Divisions</label>
                    <div class="flex gap-2 flex-wrap">
                        ${[2, 3, 4, 5].map(n => `
                            <button
                                onclick="setDivisionCount(${n})"
                                class="px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${WizardState.divisionCount === n
                                    ? 'bg-indigo-500 text-white shadow-md'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}"
                            >
                                ${n} Divisions
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Division Names -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Division Names</label>
                    <div class="space-y-3">
                        ${WizardState.divisionNames.map((name, i) => `
                            <div class="flex items-center gap-3">
                                <span class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">${i + 1}</span>
                                <input
                                    type="text"
                                    id="division-name-${i}"
                                    value="${name}"
                                    class="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                                    placeholder="Division ${i + 1}"
                                    onchange="WizardState.divisionNames[${i}] = this.value"
                                />
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Promotion/Relegation Count -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Promotion / Relegation Spots</label>
                    <p class="text-xs text-gray-500 mb-3">How many teams move up or down each season</p>
                    <div class="flex gap-2">
                        ${[1, 2, 3].map(n => `
                            <button
                                onclick="WizardState.promotionCount = ${n}; renderWizardStep()"
                                class="px-5 py-3 rounded-xl text-sm font-semibold transition-colors ${WizardState.promotionCount === n
                                    ? 'bg-indigo-500 text-white shadow-md'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}"
                            >
                                ${n} ${n === 1 ? 'team' : 'teams'}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Info Box -->
            <div class="mt-6 bg-indigo-50 rounded-xl p-4">
                <p class="text-sm text-indigo-800">
                    <span class="font-semibold">How it works:</span>
                    The top ${WizardState.promotionCount} team${WizardState.promotionCount > 1 ? 's' : ''} in each division get promoted,
                    and the bottom ${WizardState.promotionCount} get relegated at the end of each season.
                </p>
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="wizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                ← Back
            </button>
            <button onclick="wizardNext()" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">
                Next →
            </button>
        </div>
    `;
}

function setDivisionCount(count) {
    WizardState.divisionCount = count;
    WizardState.divisionNames = WizardState.getDivisionNamesForCount(count);
    renderWizardStep();
}

// ===== STEP 3: Teams =====

function renderWizardStep3() {
    // Initialize divisions if empty
    if (WizardState.divisions.length !== WizardState.divisionCount) {
        WizardState.initDivisions();
    }

    // Active division tab
    if (typeof WizardState._activeDivTab === 'undefined') {
        WizardState._activeDivTab = 0;
    }
    const activeTab = WizardState._activeDivTab;
    const div = WizardState.divisions[activeTab];

    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Teams</h3>
            <p class="text-gray-500 text-sm mb-4">Add teams to each division (min ${CONFIG.MIN_TEAMS_PER_DIVISION} per division)</p>

            <!-- Division Tabs -->
            <div class="flex gap-1 mb-4 overflow-x-auto pb-1">
                ${WizardState.divisions.map((d, i) => `
                    <button
                        onclick="WizardState._activeDivTab = ${i}; collectTeamDataFromForm(); renderWizardStep()"
                        class="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === i
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}"
                    >
                        ${d.name} (${d.teams.length})
                    </button>
                `).join('')}
            </div>

            <!-- Teams for Active Division -->
            <div class="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                ${div.teams.map((team, tIdx) => `
                    <div class="bg-gray-50 rounded-xl p-4 relative">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-sm font-semibold text-gray-600">Team ${tIdx + 1}</span>
                            ${div.teams.length > CONFIG.MIN_TEAMS_PER_DIVISION ? `
                                <button
                                    onclick="removeTeamFromDivision(${activeTab}, ${tIdx})"
                                    class="text-red-400 hover:text-red-600 transition-colors p-1"
                                    title="Remove team">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                        <div class="space-y-2">
                            <input
                                type="text"
                                data-team="${activeTab}-${tIdx}-name"
                                value="${team.name}"
                                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                                placeholder="Team name"
                            />
                            <div class="grid grid-cols-2 gap-2">
                                ${[1,2,3,4].map(pNum => `
                                <div>
                                    <input
                                        type="text"
                                        data-team="${activeTab}-${tIdx}-p${pNum}"
                                        value="${team['player' + pNum] || ''}"
                                        class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:outline-none"
                                        placeholder="Player ${pNum}${pNum <= 2 ? '' : ' (optional)'}"
                                    />
                                    <div class="flex items-center gap-1 mt-1">
                                        <span class="text-xs text-gray-400">Rating:</span>
                                        <input
                                            type="number"
                                            data-team="${activeTab}-${tIdx}-p${pNum}r"
                                            value="${team['player' + pNum + 'Rating'] || 5}"
                                            min="1" max="10" step="0.5"
                                            class="w-14 px-1 py-0.5 border border-gray-200 rounded text-xs text-center focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Add Team Button -->
            <button
                onclick="addTeamToDivision(${activeTab})"
                class="w-full mt-3 py-3 border-2 border-dashed border-indigo-300 rounded-xl text-indigo-600 font-medium text-sm hover:bg-indigo-50 transition-colors">
                + Add Team to ${div.name}
            </button>

            <!-- Summary -->
            <div class="mt-4 flex flex-wrap gap-2">
                ${WizardState.divisions.map((d, i) => `
                    <span class="text-xs px-2 py-1 rounded-full ${d.teams.length >= CONFIG.MIN_TEAMS_PER_DIVISION ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${d.name}: ${d.teams.length} teams ${d.teams.length >= CONFIG.MIN_TEAMS_PER_DIVISION ? '✓' : '(need ' + CONFIG.MIN_TEAMS_PER_DIVISION + ')'}
                    </span>
                `).join('')}
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="wizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                ← Back
            </button>
            <button onclick="wizardNext()" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">
                Next →
            </button>
        </div>
    `;
}

function addTeamToDivision(divIndex) {
    collectTeamDataFromForm();
    WizardState.divisions[divIndex].teams.push({
        name: '', player1: '', player2: '', player3: '', player4: '', player1Rating: 5, player2Rating: 5, player3Rating: 5, player4Rating: 5
    });
    renderWizardStep();
}

function removeTeamFromDivision(divIndex, teamIndex) {
    collectTeamDataFromForm();
    WizardState.divisions[divIndex].teams.splice(teamIndex, 1);
    renderWizardStep();
}

function collectTeamDataFromForm() {
    WizardState.divisions.forEach((div, dIdx) => {
        div.teams.forEach((team, tIdx) => {
            const nameEl = document.querySelector(`[data-team="${dIdx}-${tIdx}-name"]`);
            if (nameEl) team.name = nameEl.value.trim();

            for (let p = 1; p <= 4; p++) {
                const pEl = document.querySelector(`[data-team="${dIdx}-${tIdx}-p${p}"]`);
                const prEl = document.querySelector(`[data-team="${dIdx}-${tIdx}-p${p}r"]`);
                if (pEl) team['player' + p] = pEl.value.trim();
                if (prEl) team['player' + p + 'Rating'] = parseFloat(prEl.value) || 5;
            }
        });
    });
}

// ===== STEP 4: Match Settings =====

function renderWizardStep4() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Match Settings</h3>
            <p class="text-gray-500 text-sm mb-6">Configure scoring format for matches</p>

            <div class="space-y-6">
                <!-- Sets per Match -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Sets per Match</label>
                    <div class="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                        <div class="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-700">3</div>
                        <div>
                            <p class="font-medium text-gray-800">Best of 3 Sets</p>
                            <p class="text-sm text-gray-500">First to win 2 sets wins the match</p>
                        </div>
                    </div>
                </div>

                <!-- Games per Set -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Games per Set</label>
                    <div class="space-y-2">
                        ${CONFIG.GAMES_PER_SET_OPTIONS.map(n => `
                            <label class="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${WizardState.gamesPerSet === n
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-300'}">
                                <input
                                    type="radio"
                                    name="games-per-set"
                                    value="${n}"
                                    ${WizardState.gamesPerSet === n ? 'checked' : ''}
                                    onchange="WizardState.gamesPerSet = ${n}; renderWizardStep()"
                                    class="w-5 h-5 text-indigo-500"
                                />
                                <div class="flex-1">
                                    <span class="font-medium text-gray-800">First to ${n} games</span>
                                    <p class="text-sm text-gray-500">${n === 4 ? 'Shorter sets, quicker matches' : 'Standard set length'}</p>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <!-- Tiebreak at Deuce -->
                <label class="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 cursor-pointer transition-colors">
                    <input
                        type="checkbox"
                        id="wizard-tiebreak"
                        ${WizardState.tiebreakAtDeuce ? 'checked' : ''}
                        onchange="WizardState.tiebreakAtDeuce = this.checked"
                        class="w-5 h-5 text-indigo-500 rounded"
                    />
                    <div class="flex-1">
                        <div class="font-semibold text-gray-800">Tiebreak at Deuce</div>
                        <p class="text-sm text-gray-500">Play a tiebreak game when the set reaches ${WizardState.gamesPerSet}-${WizardState.gamesPerSet}</p>
                    </div>
                </label>
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="wizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                ← Back
            </button>
            <button onclick="wizardNext()" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">
                Next →
            </button>
        </div>
    `;
}

// ===== STEP 5: Schedule =====

function renderWizardStep5() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Schedule</h3>
            <p class="text-gray-500 text-sm mb-6">Set the season dates and generate fixtures</p>

            <div class="space-y-5">
                <!-- Start Date -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Season Start Date</label>
                    <input
                        type="date"
                        id="wizard-start-date"
                        value="${WizardState.seasonStartDate}"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                </div>

                <!-- Match Day -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Default Match Day</label>
                    <select
                        id="wizard-match-day"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors bg-white">
                        ${CONFIG.MATCH_DAY_OPTIONS.map(day => `
                            <option value="${day}" ${WizardState.matchDay === day ? 'selected' : ''}>${day}</option>
                        `).join('')}
                    </select>
                </div>

                <!-- Match Time -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Default Match Time</label>
                    <input
                        type="time"
                        id="wizard-match-time"
                        value="${WizardState.matchTime}"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                </div>

                <!-- Number of Courts -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Number of Courts</label>
                    <div class="flex gap-2 flex-wrap">
                        ${[1, 2, 3, 4, 5, 6].map(n => `
                            <button
                                onclick="WizardState.courts = ${n}; renderWizardStep()"
                                class="w-12 h-12 rounded-xl text-sm font-semibold transition-colors ${WizardState.courts === n
                                    ? 'bg-indigo-500 text-white shadow-md'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}"
                            >
                                ${n}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Excluded Dates -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Excluded Dates</label>
                    <p class="text-xs text-gray-500 mb-2">Weeks with no matches (holidays, etc.)</p>
                    <div class="flex gap-2 mb-2">
                        <input
                            type="date"
                            id="wizard-exclude-date"
                            class="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                        <button
                            onclick="addExcludedDate()"
                            class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors">
                            Add
                        </button>
                    </div>
                    ${WizardState.excludedDates.length > 0 ? `
                        <div class="flex flex-wrap gap-2">
                            ${WizardState.excludedDates.map((d, i) => `
                                <span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-3 py-1.5 rounded-full border border-amber-200">
                                    ${new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    <button onclick="removeExcludedDate(${i})" class="hover:text-red-600 ml-1 font-bold">×</button>
                                </span>
                            `).join('')}
                        </div>
                    ` : '<p class="text-xs text-gray-400">No excluded dates</p>'}
                </div>

                <!-- Generate Schedule -->
                <div class="pt-2">
                    <button
                        onclick="generateSchedulePreview()"
                        class="w-full py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl font-semibold text-sm transition-colors">
                        📅 Generate Schedule Preview
                    </button>
                </div>

                <!-- Schedule Preview -->
                ${WizardState.schedulePreview ? `
                    <div class="bg-green-50 rounded-xl p-4 border border-green-200">
                        <h4 class="font-semibold text-green-800 mb-2">Schedule Preview</h4>
                        <div class="space-y-1 text-sm text-green-700">
                            <p><span class="font-medium">${WizardState.schedulePreview.weeks}</span> weeks</p>
                            <p><span class="font-medium">${WizardState.schedulePreview.totalMatches}</span> total matches across <span class="font-medium">${WizardState.schedulePreview.divisions}</span> divisions</p>
                            <p>Season ends approximately <span class="font-medium">${WizardState.schedulePreview.endDate}</span></p>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="wizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                ← Back
            </button>
            <button onclick="wizardNext()" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">
                Next →
            </button>
        </div>
    `;
}

function addExcludedDate() {
    const input = document.getElementById('wizard-exclude-date');
    const date = input?.value;
    if (date && !WizardState.excludedDates.includes(date)) {
        WizardState.excludedDates.push(date);
        WizardState.excludedDates.sort();
        collectStep5Data();
        renderWizardStep();
    }
}

function removeExcludedDate(index) {
    WizardState.excludedDates.splice(index, 1);
    collectStep5Data();
    renderWizardStep();
}

function collectStep5Data() {
    const startDate = document.getElementById('wizard-start-date')?.value;
    const matchDay = document.getElementById('wizard-match-day')?.value;
    const matchTime = document.getElementById('wizard-match-time')?.value;

    if (startDate) WizardState.seasonStartDate = startDate;
    if (matchDay) WizardState.matchDay = matchDay;
    if (matchTime) WizardState.matchTime = matchTime;
}

function generateSchedulePreview() {
    collectStep5Data();

    // Calculate total matches across all divisions
    let totalMatches = 0;
    let maxMatchesInDivision = 0;
    WizardState.divisions.forEach(div => {
        const n = div.teams.length;
        const roundRobinMatches = (n * (n - 1)) / 2;
        totalMatches += roundRobinMatches;
        // Rounds needed (each round = n/2 matches for even, (n-1)/2 for odd)
        const rounds = n % 2 === 0 ? n - 1 : n;
        if (rounds > maxMatchesInDivision) {
            maxMatchesInDivision = rounds;
        }
    });

    // If Scheduler is available, use it
    if (typeof Scheduler !== 'undefined' && typeof Scheduler.generateSchedule === 'function') {
        try {
            const result = Scheduler.generateSchedule({
                divisions: WizardState.divisions,
                startDate: WizardState.seasonStartDate,
                matchDay: WizardState.matchDay,
                matchTime: WizardState.matchTime,
                courts: WizardState.courts,
                excludedDates: WizardState.excludedDates
            });
            WizardState.schedulePreview = {
                weeks: result.weeks || maxMatchesInDivision,
                totalMatches: result.totalMatches || totalMatches,
                divisions: WizardState.divisionCount,
                endDate: result.endDate || calculateEndDate(WizardState.seasonStartDate, maxMatchesInDivision)
            };
            WizardState._generatedSchedule = result;
            renderWizardStep();
            return;
        } catch (e) {
            console.warn('Scheduler.generateSchedule failed, using fallback:', e);
        }
    }

    // Fallback: calculate preview manually
    const weeks = maxMatchesInDivision;
    const endDate = calculateEndDate(WizardState.seasonStartDate, weeks);

    WizardState.schedulePreview = {
        weeks,
        totalMatches,
        divisions: WizardState.divisionCount,
        endDate
    };
    WizardState._generatedSchedule = null;

    renderWizardStep();
}

function calculateEndDate(startDateStr, weeks) {
    if (!startDateStr) return 'Unknown';
    const start = new Date(startDateStr);
    start.setDate(start.getDate() + (weeks * 7));
    return start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ===== STEP 6: Review & Create =====

function renderWizardStep6() {
    const totalTeams = WizardState.getTotalTeams();
    const totalMatches = WizardState.getTotalMatches();

    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Review & Create</h3>
            <p class="text-gray-500 text-sm mb-6">Check everything looks good before creating your league</p>

            <div class="space-y-4">
                <!-- League Info -->
                <div class="bg-gray-50 rounded-xl p-4">
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span class="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span>
                        League Info
                    </h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Name</span>
                            <span class="font-medium text-gray-800">${WizardState.leagueName}</span>
                        </div>
                        ${WizardState.venue ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600">Venue</span>
                            <span class="font-medium text-gray-800">${WizardState.venue}</span>
                        </div>
                        ` : ''}
                        ${WizardState.description ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600">Description</span>
                            <span class="font-medium text-gray-800 text-right max-w-[200px] truncate">${WizardState.description}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Divisions -->
                <div class="bg-gray-50 rounded-xl p-4">
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span class="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
                        Divisions
                    </h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Divisions</span>
                            <span class="font-medium text-gray-800">${WizardState.divisionCount}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Names</span>
                            <span class="font-medium text-gray-800">${WizardState.divisionNames.join(', ')}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Promotion/Relegation</span>
                            <span class="font-medium text-gray-800">${WizardState.promotionCount} team${WizardState.promotionCount > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>

                <!-- Teams -->
                <div class="bg-gray-50 rounded-xl p-4">
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span class="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span>
                        Teams
                    </h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Total Teams</span>
                            <span class="font-medium text-gray-800">${totalTeams}</span>
                        </div>
                        ${WizardState.divisions.map(d => `
                            <div class="flex justify-between">
                                <span class="text-gray-600">${d.name}</span>
                                <span class="font-medium text-gray-800">${d.teams.length} teams</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Match Settings -->
                <div class="bg-gray-50 rounded-xl p-4">
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span class="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">4</span>
                        Match Format
                    </h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Format</span>
                            <span class="font-medium text-gray-800">Best of ${WizardState.setsPerMatch} sets</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Games per Set</span>
                            <span class="font-medium text-gray-800">First to ${WizardState.gamesPerSet}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Tiebreak at Deuce</span>
                            <span class="font-medium text-gray-800">${WizardState.tiebreakAtDeuce ? 'Yes' : 'No'}</span>
                        </div>
                    </div>
                </div>

                <!-- Schedule -->
                <div class="bg-gray-50 rounded-xl p-4">
                    <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span class="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">5</span>
                        Schedule
                    </h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Start Date</span>
                            <span class="font-medium text-gray-800">${WizardState.seasonStartDate ? new Date(WizardState.seasonStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Match Day</span>
                            <span class="font-medium text-gray-800">${WizardState.matchDay}s at ${WizardState.matchTime}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Courts</span>
                            <span class="font-medium text-gray-800">${WizardState.courts}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Total Matches</span>
                            <span class="font-medium text-gray-800">${totalMatches}</span>
                        </div>
                        ${WizardState.excludedDates.length > 0 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600">Excluded Dates</span>
                            <span class="font-medium text-gray-800">${WizardState.excludedDates.length}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div id="wizard-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mt-4">
                <p id="wizard-error-text" class="text-sm text-red-600 font-medium"></p>
            </div>
        </div>

        <div class="flex gap-3 mt-6">
            <button onclick="wizardBack()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                ← Back
            </button>
            <button onclick="createLeague()" id="create-league-btn" class="flex-1 px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white rounded-xl font-semibold transition-colors">
                Create League ✨
            </button>
        </div>
    `;
}

// ===== WIZARD NAVIGATION =====

function wizardNext() {
    const step = WizardState.currentStep;

    // Validate current step
    if (step === 1) {
        const name = document.getElementById('wizard-league-name')?.value?.trim();
        const venue = document.getElementById('wizard-venue')?.value?.trim();
        const description = document.getElementById('wizard-description')?.value?.trim();
        const passcode = document.getElementById('wizard-passcode')?.value;
        const passcodeConfirm = document.getElementById('wizard-passcode-confirm')?.value;

        if (!name) {
            showWizardError('Please enter a league name');
            return;
        }

        if (!passcode || passcode.length < 4) {
            showWizardError('Passcode must be at least 4 characters');
            return;
        }

        if (passcode !== passcodeConfirm) {
            showWizardError('Passcodes do not match');
            return;
        }

        WizardState.leagueName = name;
        WizardState.venue = venue || '';
        WizardState.description = description || '';
        WizardState._passcode = passcode;
    }

    if (step === 2) {
        // Collect division names from inputs
        for (let i = 0; i < WizardState.divisionCount; i++) {
            const el = document.getElementById(`division-name-${i}`);
            if (el) {
                WizardState.divisionNames[i] = el.value.trim() || `Division ${i + 1}`;
            }
        }

        // Validate promotion count is less than min teams per division
        if (WizardState.promotionCount >= CONFIG.MIN_TEAMS_PER_DIVISION) {
            showWizardError(`Promotion count must be less than ${CONFIG.MIN_TEAMS_PER_DIVISION} (min teams per division)`);
            return;
        }

        // Initialize divisions for step 3
        WizardState.initDivisions();
        WizardState._activeDivTab = 0;
    }

    if (step === 3) {
        collectTeamDataFromForm();

        // Validate each division has minimum teams
        for (let i = 0; i < WizardState.divisions.length; i++) {
            const div = WizardState.divisions[i];
            if (div.teams.length < CONFIG.MIN_TEAMS_PER_DIVISION) {
                showWizardError(`${div.name} needs at least ${CONFIG.MIN_TEAMS_PER_DIVISION} teams (currently ${div.teams.length})`);
                return;
            }
        }
    }

    if (step === 4) {
        // Match settings are already bound via onchange
    }

    if (step === 5) {
        collectStep5Data();

        if (!WizardState.seasonStartDate) {
            showWizardError('Please set a season start date');
            return;
        }
    }

    if (step < WizardState.totalSteps) {
        WizardState.currentStep++;
        renderWizardStep();
    }
}

function wizardBack() {
    // Save current step data before going back
    const step = WizardState.currentStep;

    if (step === 3) {
        collectTeamDataFromForm();
    }

    if (step === 5) {
        collectStep5Data();
    }

    if (step > 1) {
        WizardState.currentStep--;
        renderWizardStep();
    }
}

function showWizardError(message) {
    const errorDiv = document.getElementById('wizard-error');
    const errorText = document.getElementById('wizard-error-text');
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
        // Scroll error into view
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ===== CREATE LEAGUE =====

async function createLeague() {
    const createBtn = document.getElementById('create-league-btn');
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.textContent = 'Creating...';
    }

    try {
        const leagueId = Router.generateLeagueId();
        const organiserKey = Router.generateOrganiserKey();

        // Hash passcode
        let passcodeHash = '';
        if (typeof CryptoUtils !== 'undefined') {
            passcodeHash = await CryptoUtils.hashPasscode(WizardState._passcode);
        } else {
            passcodeHash = WizardState._passcode; // Fallback
        }

        // Build division data
        const divisionsData = {};
        WizardState.divisions.forEach((div, i) => {
            const teams = {};
            div.teams.forEach((team, tIdx) => {
                const teamId = `team_${i}_${tIdx}`;
                const p1 = team.player1 || `Player ${tIdx + 1}A`;
                const p2 = team.player2 || `Player ${tIdx + 1}B`;
                const teamEntry = {
                    id: teamId,
                    name: team.name || (p1 + ' & ' + p2),
                    player1Name: p1,
                    player2Name: p2,
                    player1Rating: team.player1Rating || 5,
                    player2Rating: team.player2Rating || 5,
                    division: i,
                    played: 0, won: 0, drawn: 0, lost: 0,
                    setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, points: 0
                };
                if (team.player3) {
                    teamEntry.player3Name = team.player3;
                    teamEntry.player3Rating = team.player3Rating || 5;
                }
                if (team.player4) {
                    teamEntry.player4Name = team.player4;
                    teamEntry.player4Rating = team.player4Rating || 5;
                }
                teamEntry.combinedRating = (teamEntry.player1Rating || 0) + (teamEntry.player2Rating || 0)
                    + (teamEntry.player3Rating || 0) + (teamEntry.player4Rating || 0);

                teams[teamId] = teamEntry;
            });

            divisionsData[`division_${i}`] = {
                name: div.name,
                order: i,
                teams: teams
            };
        });

        // Build Firebase data
        const leagueData = {
            meta: {
                name: WizardState.leagueName,
                venue: WizardState.venue,
                description: WizardState.description,
                organiserKey: organiserKey,
                passcodeHash: passcodeHash,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: CONFIG.LEAGUE_STATUS.SETUP,
                divisionCount: WizardState.divisionCount,
                divisionNames: WizardState.divisionNames,
                promotionCount: WizardState.promotionCount,
                matchFormat: {
                    setsPerMatch: WizardState.setsPerMatch,
                    gamesPerSet: WizardState.gamesPerSet,
                    tiebreakAtDeuce: WizardState.tiebreakAtDeuce
                },
                schedule: {
                    seasonStartDate: WizardState.seasonStartDate,
                    matchDay: WizardState.matchDay,
                    matchTime: WizardState.matchTime,
                    courts: WizardState.courts,
                    excludedDates: WizardState.excludedDates
                },
                points: {
                    win: CONFIG.POINTS_WIN,
                    draw: CONFIG.POINTS_DRAW,
                    loss: CONFIG.POINTS_LOSS
                }
            },
            divisions: divisionsData,
            seasons: {
                1: {
                    number: 1,
                    status: CONFIG.SEASON_STATUS.SETUP,
                    startDate: WizardState.seasonStartDate,
                    fixtures: WizardState._generatedSchedule?.fixtures || {}
                }
            }
        };

        const success = await createLeagueInFirebase(leagueId, leagueData);

        if (success) {
            // Save to local storage
            saveLeagueToLocalStorage(leagueId, WizardState.leagueName, organiserKey);

            // Close modal and navigate
            closeModal();
            showToast('League created successfully!');
            Router.navigate('league', leagueId, organiserKey);
        } else {
            showWizardError('Failed to create league. Please try again.');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = 'Create League ✨';
            }
        }

    } catch (error) {
        console.error('Error creating league:', error);
        showWizardError('Something went wrong. Please try again.');
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.textContent = 'Create League ✨';
        }
    }
}

console.log('League landing.js loaded');
