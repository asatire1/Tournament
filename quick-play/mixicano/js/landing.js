/**
 * landing.js - Landing Page Rendering
 * Home page with create/join options and recent sessions
 */

/**
 * Render the landing page
 */
async function renderLandingPage() {
    if (state) {
        state.stopListening();
        state = null;
    }

    if (typeof OrganizerAuth !== 'undefined') {
        OrganizerAuth.init().catch(e => console.warn('OrganizerAuth init:', e));
    }

    const localTournaments = MyTournaments.getAll();

    let myTournaments = localTournaments;
    if (typeof MyTournamentsCloud !== 'undefined' && typeof OrganizerAuth !== 'undefined') {
        try {
            const cloudTournaments = await MyTournamentsCloud.getAll(CONFIG.FIREBASE_ROOT);
            myTournaments = MyTournamentsCloud.mergeWithLocal(cloudTournaments, localTournaments);
        } catch (e) {
            console.warn('Could not load cloud tournaments:', e);
        }
    }

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen">
            <!-- Hero Section -->
            <div class="relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-rose-600 via-rose-700 to-pink-800"></div>
                <div class="absolute inset-0 opacity-30">
                    <div class="absolute top-20 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                    <div class="absolute bottom-20 right-10 w-80 h-80 bg-pink-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                </div>

                <div class="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
                    <div class="text-center">
                        <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
                            <span class="text-3xl">🔀</span>
                            <span class="text-white/90 font-medium">Mixicano Format</span>
                        </div>

                        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6" style="letter-spacing: -2px; line-height: 1.1;">
                            Mixed Gender<br>Matchups
                        </h1>

                        <p class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12" style="line-height: 1.6;">
                            Every team has 1 male + 1 female player.<br class="hidden md:block">
                            Dynamic pairings based on standings.
                        </p>

                        <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <button onclick="showCreateModal()"
                                class="flex-1 px-8 py-4 bg-white text-rose-700 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200">
                                <span class="mr-2">✨</span> Create Session
                            </button>
                            <button onclick="showJoinModal()"
                                class="flex-1 px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all duration-200">
                                <span class="mr-2">🔗</span> Join with Code
                            </button>
                        </div>

                        <div class="mt-8">
                            <a href="../" class="text-white/60 hover:text-white text-sm transition-colors">
                                ← Back to Uber Padel Home
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- My Sessions Section -->
            ${myTournaments.length > 0 ? `
                <div class="max-w-5xl mx-auto px-6 py-12">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                            <span class="text-xl">📋</span>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800" style="letter-spacing: -0.5px;">My Sessions</h2>
                    </div>

                    <div class="grid gap-4">
                        ${myTournaments.map(t => `
                            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4 flex-1 min-w-0">
                                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            ${t.name ? t.name.charAt(0).toUpperCase() : '🔀'}
                                        </div>
                                        <div class="min-w-0">
                                            <h3 class="font-semibold text-gray-800 truncate flex items-center gap-2">
                                                ${t.name || 'Unnamed Session'}
                                                ${t.source === 'cloud' ? '<span class="text-green-500 text-xs" title="Synced across devices">☁️</span>' : ''}
                                            </h3>
                                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                                <span class="font-mono font-medium text-rose-600">${t.id.toUpperCase()}</span>
                                                <span class="text-gray-300">•</span>
                                                <span>${formatTimeAgo(t.updatedAt || t.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onclick="Router.navigate('tournament', '${t.id}')"
                                        class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium text-sm transition-colors">
                                        Open
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Features Section -->
            <div class="max-w-5xl mx-auto px-6 py-12">
                <h2 class="text-2xl font-bold text-gray-800 text-center mb-8" style="letter-spacing: -0.5px;">How Mixicano Works</h2>

                <div class="grid md:grid-cols-3 gap-6">
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                        <div class="w-16 h-16 mx-auto mb-4 bg-rose-100 rounded-2xl flex items-center justify-center">
                            <span class="text-3xl">👫</span>
                        </div>
                        <h3 class="font-semibold text-gray-800 mb-2">Mixed Teams</h3>
                        <p class="text-sm text-gray-500">Every team has 1 male + 1 female player. Balanced and inclusive.</p>
                    </div>

                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                        <div class="w-16 h-16 mx-auto mb-4 bg-pink-100 rounded-2xl flex items-center justify-center">
                            <span class="text-3xl">📊</span>
                        </div>
                        <h3 class="font-semibold text-gray-800 mb-2">Dynamic Pairings</h3>
                        <p class="text-sm text-gray-500">Cross-pair by standings: M#1+F#2 vs M#2+F#1 for competitive balance.</p>
                    </div>

                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                        <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                            <span class="text-3xl">🏆</span>
                        </div>
                        <h3 class="font-semibold text-gray-800 mb-2">Individual Points</h3>
                        <p class="text-sm text-gray-500">Both players get their team's score. Most points wins!</p>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="max-w-5xl mx-auto px-6 py-8 text-center text-sm text-gray-400">
                <p>Uber Padel Club • Mixicano Tournament Manager</p>
            </div>
        </div>
    `;
}

console.log('✅ Mixicano Landing loaded');
