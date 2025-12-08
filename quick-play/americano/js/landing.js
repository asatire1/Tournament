/**
 * landing.js - Landing Page Rendering
 * Home page with create/join options and recent sessions
 */

/**
 * Render the landing page
 */
async function renderLandingPage() {
    // Clean up any existing state
    if (state) {
        state.stopListening();
        state = null;
    }
    
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
            console.log('Americano landing - current user:', currentUser);
        } catch (e) {
            console.warn('Auth init error:', e);
        }
    }
    
    // Get tournaments from localStorage first (fast)
    const localTournaments = MyTournaments.getAll();
    
    // Try to get cloud tournaments and merge
    let myTournaments = localTournaments;
    if (typeof MyTournamentsCloud !== 'undefined' && typeof OrganizerAuth !== 'undefined') {
        try {
            const cloudTournaments = await MyTournamentsCloud.getAll(CONFIG.FIREBASE_ROOT);
            myTournaments = MyTournamentsCloud.mergeWithLocal(cloudTournaments, localTournaments);
        } catch (e) {
            console.warn('Could not load cloud tournaments:', e);
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
                        <a href="../../index.html#quick-play" class="text-blue-600 font-semibold text-sm md:text-base">Quick Play</a>
                        <a href="../../competitions/browse.html" class="text-gray-600 hover:text-purple-600 font-medium text-sm md:text-base transition-colors">Competitions</a>
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
            console.log('Americano - auth state changed:', user);
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
                <div class="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800"></div>
                <div class="absolute inset-0 opacity-30">
                    <div class="absolute top-20 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                    <div class="absolute bottom-20 right-10 w-80 h-80 bg-purple-300 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                </div>
                
                <div class="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
                    <div class="text-center">
                        <!-- Badge -->
                        <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2 mb-8">
                            <span class="text-3xl">🔄</span>
                            <span class="text-white/90 font-medium">Americano Format</span>
                        </div>
                        
                        <!-- Title -->
                        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6" style="letter-spacing: -2px; line-height: 1.1;">
                            Rotating<br>Partners
                        </h1>
                        
                        <!-- Subtitle -->
                        <p class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12" style="line-height: 1.6;">
                            Everyone plays with everyone. ${CONFIG.MIN_PLAYERS}-${CONFIG.MAX_PLAYERS} players, automatic pairings,<br class="hidden md:block">
                            real-time leaderboard.
                        </p>
                        
                        <!-- CTA Buttons -->
                        <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <button onclick="showCreateModal()" 
                                class="flex-1 px-8 py-4 bg-white text-blue-700 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200">
                                <span class="mr-2">✨</span> Create Session
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
            
            <!-- My Sessions Section -->
            ${myTournaments.length > 0 ? `
                <div class="max-w-5xl mx-auto px-6 py-12">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <span class="text-xl">📋</span>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800" style="letter-spacing: -0.5px;">My Sessions</h2>
                    </div>
                    
                    <div class="grid gap-4">
                        ${myTournaments.map(t => `
                            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-4 flex-1 min-w-0">
                                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                            ${t.name ? t.name.charAt(0).toUpperCase() : '🔄'}
                                        </div>
                                        <div class="min-w-0">
                                            <h3 class="font-semibold text-gray-800 truncate flex items-center gap-2">
                                                ${t.name || 'Unnamed Session'}
                                                ${t.source === 'cloud' ? '<span class="text-green-500 text-xs" title="Synced across devices">☁️</span>' : ''}
                                            </h3>
                                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                                <span class="font-mono font-medium text-blue-600">${t.id.toUpperCase()}</span>
                                                <span class="text-gray-300">•</span>
                                                <span>${formatTimeAgo(t.updatedAt || t.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onclick="Router.navigate('tournament', '${t.id}')" 
                                        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm transition-colors">
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
                <h2 class="text-2xl font-bold text-gray-800 text-center mb-8" style="letter-spacing: -0.5px;">How It Works</h2>
                
                <div class="grid md:grid-cols-3 gap-6">
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                        <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <span class="text-3xl">👥</span>
                        </div>
                        <h3 class="font-semibold text-gray-800 mb-2">Everyone Plays</h3>
                        <p class="text-sm text-gray-500">Partner with every other player at least once throughout the tournament.</p>
                    </div>
                    
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                        <div class="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-2xl flex items-center justify-center">
                            <span class="text-3xl">🏟️</span>
                        </div>
                        <h3 class="font-semibold text-gray-800 mb-2">Multi-Court</h3>
                        <p class="text-sm text-gray-500">Run multiple matches at once. More courts = faster tournament.</p>
                    </div>
                    
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                        <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                            <span class="text-3xl">📊</span>
                        </div>
                        <h3 class="font-semibold text-gray-800 mb-2">Live Leaderboard</h3>
                        <p class="text-sm text-gray-500">Real-time standings with wins, losses, and point differential.</p>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="max-w-5xl mx-auto px-6 py-8 text-center text-sm text-gray-400">
                <p>Uber Padel Club • Americano Tournament Manager</p>
            </div>
        </div>
    `;
}
