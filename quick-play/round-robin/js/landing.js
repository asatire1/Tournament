// ===== ROUND ROBIN LANDING PAGE =====
// MyTournaments is defined in state.js (loaded before landing.js)

// ===== LANDING PAGE RENDER =====

async function renderLandingPage() {
    // Initialize organizer auth (for cross-device "My Sessions")
    if (typeof OrganizerAuth !== 'undefined') {
        OrganizerAuth.init().catch(e => console.warn('OrganizerAuth init:', e));
    }

    // Get sessions from localStorage first (fast)
    const localTournaments = MyTournaments.getAll();

    // Try to get cloud sessions and merge
    let mySessions = localTournaments;
    const firebaseRoot = (typeof CONFIG !== 'undefined' && CONFIG.FIREBASE_ROOT) ? CONFIG.FIREBASE_ROOT : 'roundrobin-tournaments';
    if (typeof MyTournamentsCloud !== 'undefined' && typeof OrganizerAuth !== 'undefined') {
        try {
            const cloudTournaments = await MyTournamentsCloud.getAll(firebaseRoot);
            mySessions = MyTournamentsCloud.mergeWithLocal(cloudTournaments, localTournaments);
        } catch (e) {
            console.warn('Could not load cloud sessions:', e);
        }
    }

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen">
            <!-- Hero Section -->
            <div class="relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800"></div>
                <div class="absolute inset-0 opacity-30">
                    <div class="absolute top-20 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                    <div class="absolute bottom-20 right-10 w-80 h-80 bg-green-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                </div>

                <div class="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
                    <div class="text-center">
                        <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
                            <span class="text-3xl">\u{1F501}</span>
                            <span class="text-white/90 font-medium">Round Robin Format</span>
                        </div>

                        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6" style="letter-spacing: -2px; line-height: 1.1;">
                            Every Team<br>Plays Everyone
                        </h1>

                        <p class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12" style="line-height: 1.6;">
                            Fixed pairs compete in a single league.<br class="hidden md:block">
                            Pure round-robin, no knockout.
                        </p>

                        <!-- Main Actions -->
                        <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <button
                                onclick="showCreateModal()"
                                class="flex-1 px-8 py-4 bg-white text-emerald-700 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
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
                        <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
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
                                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            ${t.name ? t.name.charAt(0).toUpperCase() : '\u{1F501}'}
                                        </div>
                                        <div class="min-w-0">
                                            <h3 class="font-semibold text-gray-800 truncate flex items-center gap-2">
                                                ${t.name || 'Unnamed Session'}
                                                ${t.source === 'cloud' ? '<span class="text-green-500 text-xs" title="Synced across devices">\u2601\uFE0F</span>' : ''}
                                            </h3>
                                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                                <span class="font-mono font-medium text-emerald-600">${t.id.toUpperCase()}</span>
                                                <span class="text-gray-300">\u2022</span>
                                                <span>${formatTimeAgo(t.updatedAt || t.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onclick="event.stopPropagation(); Router.navigate('tournament', '${t.id}')"
                                            class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm transition-colors"
                                        >
                                            Open
                                        </button>
                                        <button
                                            onclick="event.stopPropagation(); copyToClipboard('${Router.getPlayerLink(t.id)}'); showToast('\u2705 Link copied!')"
                                            class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
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
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">How Round Robin Works</h2>
                        <p class="text-gray-600">Fixed pairs, full league, every team plays everyone</p>
                    </div>

                    <div class="grid md:grid-cols-3 gap-8">
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 text-3xl">\u{1F465}</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Fixed Teams</h3>
                            <p class="text-gray-600 text-sm">Pairs stay together for every match. Pure team chemistry.</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 text-3xl">\u{1F4CA}</div>
                            <h3 class="font-semibold text-gray-800 mb-2">Full League</h3>
                            <p class="text-gray-600 text-sm">Every team plays every other team once. Complete schedule.</p>
                        </div>
                        <div class="text-center">
                            <div class="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 text-3xl">\u{1F3C6}</div>
                            <h3 class="font-semibold text-gray-800 mb-2">League Table</h3>
                            <p class="text-gray-600 text-sm">Win=3pts, Draw=1pt. Most points wins!</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-gray-900 text-gray-400 py-8">
                <div class="max-w-5xl mx-auto px-6 text-center text-sm">
                    <p>Uber Padel Club \u2022 Round Robin Tournament Manager</p>
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
                <div class="bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">\u{1F517} Join Session</h2>
                </div>
                <div class="p-6">
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Session Code</label>
                        <input type="text" id="join-code" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors text-lg text-center tracking-widest uppercase" placeholder="ABC123" maxlength="10" autofocus onkeypress="if(event.key === 'Enter') handleJoinSession()" />
                    </div>
                    <div id="join-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">\u274C Session not found</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleJoinSession()" class="flex-1 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors">Join</button>
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

console.log('\u2705 Round Robin Landing loaded');
