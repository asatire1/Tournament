// ===== SWISS SYSTEM LANDING PAGE =====
// MyTournaments is defined in state.js (loaded before landing.js)

// ===== LANDING PAGE RENDER =====

async function renderLandingPage() {
    // Initialize organizer auth (for cross-device "My Sessions")
    if (typeof OrganizerAuth !== 'undefined') {
        OrganizerAuth.init().catch(e => console.warn('OrganizerAuth init:', e));
    }

    // Check for logged in user
    let currentUser = null;
    if (typeof AuthService !== 'undefined') {
        try {
            await AuthService.init();
            currentUser = AuthService.getCurrentUser();
            console.log('Swiss landing - current user:', currentUser);
        } catch (e) {
            console.warn('Auth init error:', e);
        }
    }

    // Get sessions from localStorage first (fast)
    const localTournaments = MyTournaments.getAll();

    // Try to get cloud sessions and merge
    let mySessions = localTournaments;
    const firebaseRoot = (typeof CONFIG !== 'undefined' && CONFIG.FIREBASE_ROOT) ? CONFIG.FIREBASE_ROOT : 'swiss-tournaments';
    if (typeof MyTournamentsCloud !== 'undefined' && typeof OrganizerAuth !== 'undefined') {
        try {
            const cloudTournaments = await MyTournamentsCloud.getAll(firebaseRoot);
            mySessions = MyTournamentsCloud.mergeWithLocal(cloudTournaments, localTournaments);
        } catch (e) {
            console.warn('Could not load cloud sessions:', e);
        }
    }

    // Function to build auth nav HTML
    function buildAuthNav(user) {
        if (user) {
            return `
                <div id="nav-signed-in" class="flex items-center gap-2">
                    <a href="../../account/profile.html" class="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">
                        <span class="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">${user.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
                        <span class="hidden md:inline">${user.name || 'Account'}</span>
                    </a>
                </div>
                <a id="nav-sign-in" href="../../account/login.html" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors" style="display: none;">
                    Sign In
                </a>
            `;
        } else {
            return `
                <div id="nav-signed-in" class="flex items-center gap-2" style="display: none;"></div>
                <a id="nav-sign-in" href="../../account/login.html" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors">
                    Sign In
                </a>
            `;
        }
    }

    // Build nav HTML
    const navHtml = `
        <nav class="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
            <div class="max-w-6xl mx-auto px-4 py-3">
                <div class="flex items-center justify-between">
                    <a href="../../index.html" class="flex items-center gap-2">
                        <img src="../../uberpadel-icon.svg" alt="Uber Padel" class="w-8 h-8">
                        <span class="font-bold text-lg text-gray-800">Uber Padel</span>
                    </a>
                    <div class="flex items-center gap-3 md:gap-6">
                        <a href="../../index.html#quick-play" class="text-amber-600 font-semibold text-sm md:text-base">Quick Play</a>
                        <a href="../../competitions/browse.html" class="text-gray-600 hover:text-amber-600 font-medium text-sm md:text-base transition-colors">Competitions</a>
                        <div id="nav-auth-container" class="flex items-center gap-3">
                            ${buildAuthNav(currentUser)}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    `;

    // Listen for auth changes and update nav
    if (typeof AuthService !== 'undefined') {
        AuthService.onAuthStateChanged((user) => {
            console.log('Swiss - auth state changed:', user);
            const container = document.getElementById('nav-auth-container');
            if (container) {
                container.innerHTML = buildAuthNav(user);
            }
        });
    }

    document.getElementById('app').innerHTML = `
        ${navHtml}
        <div class="min-h-screen">
            <!-- Hero Section -->
            <div class="relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-amber-600 via-amber-700 to-yellow-800"></div>
                <div class="absolute inset-0 opacity-30">
                    <div class="absolute top-20 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                    <div class="absolute bottom-20 right-10 w-80 h-80 bg-yellow-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                </div>

                <div class="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
                    <div class="text-center">
                        <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
                            <span class="text-3xl">\u265F\uFE0F</span>
                            <span class="text-white/90 font-medium">Swiss System Format</span>
                        </div>

                        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6" style="letter-spacing: -2px; line-height: 1.1;">
                            Fair Swiss<br>Pairing System
                        </h1>

                        <p class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12" style="line-height: 1.6;">
                            Dynamic opponent pairing based on standings.<br class="hidden md:block">
                            Fewer rounds than full round-robin.
                        </p>

                        <!-- Main Actions -->
                        <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <button
                                onclick="showCreateModal()"
                                class="flex-1 px-8 py-4 bg-white text-amber-700 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                            >
                                <span class="mr-2">\u2728</span> Create Session
                            </button>

                            <button
                                onclick="showJoinModal()"
                                class="flex-1 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all duration-200"
                            >
                                <span class="mr-2">\u{1F517}</span> Join with Code
                            </button>
                        </div>

                        <div class="mt-8">
                            <a href="../" class="text-white/60 hover:text-white text-sm transition-colors">
                                \u2190 Back to Uber Padel Home
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- My Sessions Section -->
            ${mySessions.length > 0 ? `
                <div class="max-w-5xl mx-auto px-6 py-12">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <span class="text-xl">\u{1F4CB}</span>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800" style="letter-spacing: -0.5px;">My Sessions</h2>
                        <span class="text-sm text-gray-400">(${mySessions.length})</span>
                    </div>

                    <div class="grid gap-4">
                        ${mySessions.map(t => `
                            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4 flex-1 min-w-0">
                                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            ${t.name ? t.name.charAt(0).toUpperCase() : '\u265F'}
                                        </div>
                                        <div class="min-w-0">
                                            <h3 class="font-semibold text-gray-800 truncate flex items-center gap-2">
                                                ${t.name || 'Unnamed Session'}
                                                ${t.source === 'cloud' ? '<span class="text-green-500 text-xs" title="Synced across devices">\u2601\uFE0F</span>' : ''}
                                            </h3>
                                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                                <span class="font-mono font-medium text-amber-600">${t.id.toUpperCase()}</span>
                                                <span class="text-gray-300">\u2022</span>
                                                <span>${formatTimeAgo(t.updatedAt || t.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onclick="event.stopPropagation(); Router.navigate('tournament', '${t.id}')"
                                            class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors"
                                        >
                                            Open
                                        </button>
                                        <button
                                            onclick="event.stopPropagation(); copyToClipboard('${Router.getPlayerLink(t.id)}'); showToast('\u2705 Link copied!')"
                                            class="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                                            title="Copy link"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                            </svg>
                                        </button>
                                        <button
                                            onclick="event.stopPropagation(); removeFromMySessions('${t.id}')"
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
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">How Swiss System Works</h2>
                        <p class="text-gray-600">Dynamic pairing, fewer rounds, fair competition</p>
                    </div>

                    <div class="grid md:grid-cols-3 gap-8">
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4 text-3xl">\u{1F3AF}</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Smart Pairing</h3>
                            <p class="text-gray-600 text-sm">Teams with similar records play each other. Fair and competitive.</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4 text-3xl">\u26A1</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Fewer Rounds</h3>
                            <p class="text-gray-600 text-sm">Only ceil(log2(N)) rounds needed instead of N-1. Efficient.</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4 text-3xl">\u{1F3C6}</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Buchholz Tiebreak</h3>
                            <p class="text-gray-600 text-sm">Strength of schedule breaks ties. The fairest system.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-gray-900 text-gray-400 py-8">
                <div class="max-w-5xl mx-auto px-6 text-center text-sm">
                    <p>Uber Padel Club \u2022 Swiss System Tournament Manager</p>
                </div>
            </div>
        </div>
    `;
}

// ===== JOIN MODAL =====

function showJoinModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-amber-600 to-yellow-700 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">\u{1F517} Join Session</h2>
                </div>
                <div class="p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Session Code</label>
                        <input type="text" id="join-code" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-lg text-center tracking-widest uppercase" placeholder="ABC123" maxlength="10" autofocus onkeypress="if(event.key === 'Enter') handleJoinSession()" />
                    </div>
                    <div id="join-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">\u274C Session not found</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleJoinSession()" class="flex-1 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">Join</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('join-code')?.focus(), 100);
}

// ===== HANDLERS =====

async function handleJoinSession() {
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

async function removeFromMySessions(tournamentId) {
    if (confirm('Remove from your list?')) {
        MyTournaments.remove(tournamentId);
        await renderLandingPage();
        showToast('\u2705 Removed');
    }
}

// formatTimeAgo() is defined in handlers.js (loaded before landing.js)

console.log('\u2705 Swiss Landing loaded');
