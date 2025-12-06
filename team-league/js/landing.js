// ===== TEAM LEAGUE LANDING PAGE =====

// ===== MY TOURNAMENTS STORAGE =====
const MyTournaments = {
    KEY: 'uber_padel_team_leagues',
    
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

// ===== WIZARD STATE =====
const WizardState = {
    currentStep: 1,
    totalSteps: 4,
    
    // Step 1: Basic Info
    tournamentName: '',
    passcode: '',
    
    // Step 2: Team Count
    teamCount: 8,
    
    // Step 3: Group Mode
    groupMode: 'two_groups',
    
    // Step 4: Options
    includeThirdPlace: true,
    knockoutFormat: 'quarter_final', // 'final_only', 'semi_final', 'quarter_final'
    
    // After creation - Team Entry
    tournamentId: null,
    organiserKey: null,
    teams: [],
    
    reset() {
        this.currentStep = 1;
        this.tournamentName = '';
        this.passcode = '';
        this.teamCount = 8;
        this.groupMode = 'two_groups';
        this.includeThirdPlace = true;
        this.knockoutFormat = 'quarter_final';
        this.tournamentId = null;
        this.organiserKey = null;
        this.teams = [];
    },
    
    initTeams() {
        this.teams = [];
        for (let i = 1; i <= this.teamCount; i++) {
            this.teams.push({
                id: i,
                name: '',
                player1Name: '',
                player1Rating: 2.5,
                player2Name: '',
                player2Rating: 2.5
            });
        }
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
                            <span class="text-white/90 font-medium">Uber Padel</span>
                        </div>
                        
                        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6" style="letter-spacing: -2px; line-height: 1.1;">
                            Team Tournament<br>Tournament
                        </h1>
                        
                        <p class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12" style="line-height: 1.6;">
                            Fixed pairs compete in group stages with round-robin format,<br class="hidden md:block">
                            followed by knockout rounds. Real-time sync across all devices.
                        </p>
                        
                        <!-- Main Actions -->
                        <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                            <button 
                                onclick="showCreateWizard()"
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
                                ← Back to Uber Padel Home
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
                        <h2 class="text-2xl font-bold text-gray-800" style="letter-spacing: -0.5px;">My Team Tournaments</h2>
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
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">Team Tournament Format</h2>
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
                    <p>Uber Padel Team Tournament • Built with ❤️ for the padel community</p>
                </div>
            </div>
        </div>
    `;
}

// ===== WIZARD MODAL =====

function showCreateWizard() {
    WizardState.reset();
    renderWizardStep();
}

function renderWizardStep() {
    const step = WizardState.currentStep;
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <!-- Header with Progress -->
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-xl font-bold text-white">✨ Create Team Tournament</h2>
                        <span class="text-white/80 text-sm">Step ${step} of ${WizardState.totalSteps}</span>
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
                </div>
            </div>
        </div>
    `;
    
    // Auto-focus first input
    setTimeout(() => {
        const firstInput = document.querySelector('#wizard-content input:not([type="radio"]):not([type="checkbox"])');
        if (firstInput) firstInput.focus();
    }, 100);
}

function renderWizardStep1() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Tournament Details</h3>
            <p class="text-gray-500 text-sm mb-6">Give your tournament a name and set a passcode</p>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Tournament Name</label>
                    <input 
                        type="text" 
                        id="wizard-name" 
                        value="${WizardState.tournamentName}"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-lg" 
                        placeholder="e.g. Winter Team Championship"
                    />
                </div>
                
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Organiser Passcode</label>
                    <input 
                        type="password" 
                        id="wizard-passcode" 
                        value="${WizardState.passcode}"
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-lg" 
                        placeholder="Create a passcode (min 4 chars)"
                    />
                    <p class="text-xs text-gray-500 mt-1">You'll need this to manage the tournament</p>
                </div>
                
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Confirm Passcode</label>
                    <input 
                        type="password" 
                        id="wizard-passcode-confirm" 
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-lg" 
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
            <button onclick="wizardNext()" class="flex-1 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
                Next →
            </button>
        </div>
    `;
}

function renderWizardStep2() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Number of Teams</h3>
            <p class="text-gray-500 text-sm mb-6">How many teams will participate?</p>
            
            <div class="mb-6">
                <div class="flex items-center justify-center gap-4">
                    <button onclick="adjustTeamCount(-2)" class="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl transition-colors">−</button>
                    <div class="text-center">
                        <input 
                            type="number" 
                            id="wizard-team-count" 
                            value="${WizardState.teamCount}"
                            min="4"
                            max="32"
                            class="w-24 text-center text-4xl font-bold text-purple-600 border-none focus:outline-none bg-transparent"
                            onchange="updateTeamCount(this.value)"
                        />
                        <p class="text-sm text-gray-500">teams</p>
                    </div>
                    <button onclick="adjustTeamCount(2)" class="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl transition-colors">+</button>
                </div>
            </div>
            
            <!-- Quick Select -->
            <div class="flex flex-wrap justify-center gap-2 mb-6">
                ${[6, 8, 10, 12, 16, 20, 24].map(n => `
                    <button 
                        onclick="setTeamCount(${n})" 
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${WizardState.teamCount === n ? 'bg-purple-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}"
                    >
                        ${n} teams
                    </button>
                `).join('')}
            </div>
            
            <div class="bg-purple-50 rounded-xl p-4">
                <p class="text-sm text-purple-800">
                    <span class="font-semibold">💡 Tip:</span> 
                    ${WizardState.teamCount % 2 === 0 
                        ? `${WizardState.teamCount} teams can be split evenly into 2 groups of ${WizardState.teamCount / 2}.`
                        : `Odd number - one group will have ${Math.ceil(WizardState.teamCount / 2)} teams, the other ${Math.floor(WizardState.teamCount / 2)}.`
                    }
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
            <button onclick="wizardNext()" class="flex-1 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
                Next →
            </button>
        </div>
    `;
}

function renderWizardStep3() {
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Group Format</h3>
            <p class="text-gray-500 text-sm mb-6">Choose how to organize the group stage</p>
            
            <div class="space-y-4">
                <!-- Two Groups Option -->
                <label class="block cursor-pointer">
                    <div class="flex items-start gap-4 p-4 rounded-xl border-2 transition-colors ${WizardState.groupMode === 'two_groups' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
                        <input 
                            type="radio" 
                            name="group-mode" 
                            value="two_groups" 
                            ${WizardState.groupMode === 'two_groups' ? 'checked' : ''}
                            onchange="setGroupMode('two_groups')"
                            class="mt-1 w-5 h-5 text-purple-500"
                        />
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800 mb-1">Two Groups (Recommended)</div>
                            <p class="text-sm text-gray-600">Teams split into Group A and Group B. Top 4 from each group advance to quarter finals.</p>
                            <div class="mt-2 flex gap-2">
                                <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Group A: ${Math.ceil(WizardState.teamCount / 2)} teams</span>
                                <span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Group B: ${Math.floor(WizardState.teamCount / 2)} teams</span>
                            </div>
                        </div>
                    </div>
                </label>
                
                <!-- Single Group Option -->
                <label class="block cursor-pointer">
                    <div class="flex items-start gap-4 p-4 rounded-xl border-2 transition-colors ${WizardState.groupMode === 'single_group' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
                        <input 
                            type="radio" 
                            name="group-mode" 
                            value="single_group" 
                            ${WizardState.groupMode === 'single_group' ? 'checked' : ''}
                            onchange="setGroupMode('single_group')"
                            class="mt-1 w-5 h-5 text-purple-500"
                        />
                        <div class="flex-1">
                            <div class="font-semibold text-gray-800 mb-1">Single Group</div>
                            <p class="text-sm text-gray-600">All teams in one group. Top 8 advance to quarter finals.</p>
                            <div class="mt-2">
                                <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">All ${WizardState.teamCount} teams together</span>
                            </div>
                        </div>
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
            <button onclick="wizardNext()" class="flex-1 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
                Next →
            </button>
        </div>
    `;
}

function renderWizardStep4() {
    const knockoutLabels = {
        'final_only': 'Final Only',
        'semi_final': 'Semi-Finals → Final',
        'quarter_final': 'Quarter-Finals → Semi-Finals → Final'
    };
    
    // Check user permissions for mode selection
    const currentUser = getCurrentUser();
    const isVerified = currentUser && currentUser.type === 'registered' && currentUser.status === 'verified';
    
    // Initialize access mode in wizard state if not set
    if (!WizardState.accessMode) {
        WizardState.accessMode = 'anyone';
    }
    
    return `
        <div id="wizard-content">
            <h3 class="text-lg font-bold text-gray-800 mb-1">Tournament Options</h3>
            <p class="text-gray-500 text-sm mb-6">Final settings before creating your tournament</p>
            
            <div class="space-y-4">
                <!-- Who Can Join -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Who Can Join?</label>
                    <div class="space-y-2">
                        <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${WizardState.accessMode === 'anyone' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'} tournament-mode-option" data-mode="anyone">
                            <input type="radio" name="access-mode" value="anyone" 
                                ${WizardState.accessMode === 'anyone' ? 'checked' : ''}
                                onchange="setAccessMode('anyone')"
                                class="w-4 h-4 text-purple-500" />
                            <div class="flex-1">
                                <span class="font-medium text-gray-800 text-sm">🌍 Anyone</span>
                                <p class="text-xs text-gray-500">Guests and registered players</p>
                            </div>
                        </label>
                        <label class="flex items-center gap-3 p-3 rounded-xl border-2 ${isVerified ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} transition-colors ${WizardState.accessMode === 'registered' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'} tournament-mode-option" data-mode="registered">
                            <input type="radio" name="access-mode" value="registered" 
                                ${WizardState.accessMode === 'registered' ? 'checked' : ''}
                                ${!isVerified ? 'disabled' : ''}
                                onchange="setAccessMode('registered')"
                                class="w-4 h-4 text-purple-500" />
                            <div class="flex-1">
                                <span class="font-medium text-gray-800 text-sm">👥 Registered Only</span>
                                <p class="text-xs text-gray-500">Only registered players</p>
                            </div>
                            ${!isVerified ? '<span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Verified only</span>' : ''}
                        </label>
                        <label class="flex items-center gap-3 p-3 rounded-xl border-2 ${isVerified ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} transition-colors ${WizardState.accessMode === 'level-based' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'} tournament-mode-option" data-mode="level-based">
                            <input type="radio" name="access-mode" value="level-based" 
                                ${WizardState.accessMode === 'level-based' ? 'checked' : ''}
                                ${!isVerified ? 'disabled' : ''}
                                onchange="setAccessMode('level-based')"
                                class="w-4 h-4 text-purple-500" />
                            <div class="flex-1">
                                <span class="font-medium text-gray-800 text-sm">🎯 Level-Based</span>
                                <p class="text-xs text-gray-500">Verified players in level range</p>
                            </div>
                            ${!isVerified ? '<span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Verified only</span>' : ''}
                        </label>
                    </div>
                </div>
                
                <!-- Level Range (shown only for level-based mode) -->
                <div id="level-range-container" class="${WizardState.accessMode === 'level-based' ? '' : 'hidden'} p-3 bg-pink-50 rounded-xl border border-pink-200">
                    <label class="block text-xs font-semibold text-pink-800 mb-2">Level Range</label>
                    <div class="flex items-center gap-2">
                        <input type="number" id="level-min" step="0.1" min="0" max="10" value="${WizardState.levelMin || 0}"
                            onchange="WizardState.levelMin = parseFloat(this.value)"
                            class="flex-1 px-2 py-1.5 border border-pink-200 rounded-lg text-center text-sm font-semibold">
                        <span class="text-pink-400 text-sm">to</span>
                        <input type="number" id="level-max" step="0.1" min="0" max="10" value="${WizardState.levelMax || 10}"
                            onchange="WizardState.levelMax = parseFloat(this.value)"
                            class="flex-1 px-2 py-1.5 border border-pink-200 rounded-lg text-center text-sm font-semibold">
                    </div>
                </div>
                
                <!-- Knockout Format -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Knockout Format</label>
                    <div class="space-y-2">
                        <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${WizardState.knockoutFormat === 'quarter_final' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
                            <input type="radio" name="knockout-format" value="quarter_final" 
                                ${WizardState.knockoutFormat === 'quarter_final' ? 'checked' : ''}
                                onchange="setKnockoutFormat('quarter_final')"
                                class="w-4 h-4 text-purple-500" />
                            <div class="flex-1">
                                <span class="font-medium text-gray-800">Quarter-Finals → Semi-Finals → Final</span>
                                <p class="text-xs text-gray-500">8 teams in knockout (recommended)</p>
                            </div>
                        </label>
                        <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${WizardState.knockoutFormat === 'semi_final' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
                            <input type="radio" name="knockout-format" value="semi_final" 
                                ${WizardState.knockoutFormat === 'semi_final' ? 'checked' : ''}
                                onchange="setKnockoutFormat('semi_final')"
                                class="w-4 h-4 text-purple-500" />
                            <div class="flex-1">
                                <span class="font-medium text-gray-800">Semi-Finals → Final</span>
                                <p class="text-xs text-gray-500">4 teams in knockout</p>
                            </div>
                        </label>
                        <label class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${WizardState.knockoutFormat === 'final_only' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
                            <input type="radio" name="knockout-format" value="final_only" 
                                ${WizardState.knockoutFormat === 'final_only' ? 'checked' : ''}
                                onchange="setKnockoutFormat('final_only')"
                                class="w-4 h-4 text-purple-500" />
                            <div class="flex-1">
                                <span class="font-medium text-gray-800">Final Only</span>
                                <p class="text-xs text-gray-500">Top 2 teams play final</p>
                            </div>
                        </label>
                    </div>
                </div>
                
                <!-- 3rd Place Playoff (only if semi_final or quarter_final) -->
                ${WizardState.knockoutFormat !== 'final_only' ? `
                <label class="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 cursor-pointer transition-colors">
                    <input 
                        type="checkbox" 
                        id="wizard-third-place"
                        ${WizardState.includeThirdPlace ? 'checked' : ''}
                        onchange="WizardState.includeThirdPlace = this.checked"
                        class="w-5 h-5 text-purple-500 rounded"
                    />
                    <div class="flex-1">
                        <div class="font-semibold text-gray-800">Include 3rd Place Playoff</div>
                        <p class="text-sm text-gray-600">Semi-final losers play for 3rd place</p>
                    </div>
                    <span class="text-2xl">🥉</span>
                </label>
                ` : ''}
            </div>
            
            <!-- Summary -->
            <div class="mt-6 bg-gray-50 rounded-xl p-4">
                <h4 class="font-semibold text-gray-800 mb-3">📋 Summary</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Tournament Name</span>
                        <span class="font-medium text-gray-800">${WizardState.tournamentName || 'Team Tournament'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Number of Teams</span>
                        <span class="font-medium text-gray-800">${WizardState.teamCount}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Group Format</span>
                        <span class="font-medium text-gray-800">${WizardState.groupMode === 'two_groups' ? 'Two Groups' : 'Single Group'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Access</span>
                        <span class="font-medium text-gray-800">${{'anyone': '🌍 Open', 'registered': '👥 Registered', 'level-based': '🎯 Level'}[WizardState.accessMode] || '🌍 Open'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Knockout Format</span>
                        <span class="font-medium text-gray-800">${knockoutLabels[WizardState.knockoutFormat]}</span>
                    </div>
                    ${WizardState.knockoutFormat !== 'final_only' ? `
                    <div class="flex justify-between">
                        <span class="text-gray-600">3rd Place Playoff</span>
                        <span class="font-medium text-gray-800">${WizardState.includeThirdPlace ? 'Yes' : 'No'}</span>
                    </div>
                    ` : ''}
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
            <button onclick="createTournamentFromWizard()" class="flex-1 px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-colors">
                Create Tournament ✨
            </button>
        </div>
    `;
}

function setAccessMode(mode) {
    WizardState.accessMode = mode;
    const levelContainer = document.getElementById('level-range-container');
    if (levelContainer) {
        if (mode === 'level-based') {
            levelContainer.classList.remove('hidden');
        } else {
            levelContainer.classList.add('hidden');
        }
    }
    
    // Update visual selection
    document.querySelectorAll('.tournament-mode-option').forEach(opt => {
        const optMode = opt.dataset.mode;
        if (optMode === mode) {
            opt.classList.remove('border-gray-200');
            opt.classList.add('border-purple-500', 'bg-purple-50');
        } else {
            opt.classList.remove('border-purple-500', 'bg-purple-50');
            opt.classList.add('border-gray-200');
        }
    });
}

function getCurrentUser() {
    try {
        const data = localStorage.getItem('uber_padel_user');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function setKnockoutFormat(format) {
    WizardState.knockoutFormat = format;
    // If final only, disable 3rd place
    if (format === 'final_only') {
        WizardState.includeThirdPlace = false;
    }
    renderWizardStep();
}

// ===== WIZARD NAVIGATION =====

function wizardNext() {
    const step = WizardState.currentStep;
    
    if (step === 1) {
        const name = document.getElementById('wizard-name')?.value?.trim();
        const passcode = document.getElementById('wizard-passcode')?.value;
        const passcodeConfirm = document.getElementById('wizard-passcode-confirm')?.value;
        
        if (!passcode || passcode.length < 4) {
            showWizardError('Passcode must be at least 4 characters');
            return;
        }
        
        if (passcode !== passcodeConfirm) {
            showWizardError('Passcodes do not match');
            return;
        }
        
        WizardState.tournamentName = name || 'Team Tournament';
        WizardState.passcode = passcode;
    }
    
    if (step === 2) {
        const teamCount = parseInt(document.getElementById('wizard-team-count')?.value);
        
        if (isNaN(teamCount) || teamCount < 4) {
            showWizardError('Minimum 4 teams required');
            return;
        }
        
        if (teamCount > 24) {
            showWizardError('Maximum 24 teams allowed');
            return;
        }
        
        WizardState.teamCount = teamCount;
    }
    
    if (step < WizardState.totalSteps) {
        WizardState.currentStep++;
        renderWizardStep();
    }
}

function wizardBack() {
    if (WizardState.currentStep > 1) {
        WizardState.currentStep--;
        renderWizardStep();
    }
}

function showWizardError(message) {
    const errorDiv = document.getElementById('wizard-error');
    const errorText = document.getElementById('wizard-error-text');
    if (errorDiv && errorText) {
        errorText.textContent = '❌ ' + message;
        errorDiv.classList.remove('hidden');
    }
}

// ===== TEAM COUNT HELPERS =====

function adjustTeamCount(delta) {
    const newCount = WizardState.teamCount + delta;
    if (newCount >= 4 && newCount <= 24) {
        WizardState.teamCount = newCount;
        renderWizardStep();
    }
}

function setTeamCount(count) {
    WizardState.teamCount = count;
    renderWizardStep();
}

function updateTeamCount(value) {
    const count = parseInt(value);
    if (!isNaN(count) && count >= 4 && count <= 24) {
        WizardState.teamCount = count;
    }
}

function setGroupMode(mode) {
    WizardState.groupMode = mode;
    renderWizardStep();
}

// ===== CREATE TOURNAMENT =====

async function createTournamentFromWizard() {
    const tournamentId = Router.generateTournamentId();
    
    // Validate level range if level-based
    if (WizardState.accessMode === 'level-based') {
        const levelMin = WizardState.levelMin || 0;
        const levelMax = WizardState.levelMax || 10;
        if (levelMin >= levelMax) {
            showWizardError('Max level must be greater than min level');
            return;
        }
    }
    
    // Prepare mode settings
    const accessMode = WizardState.accessMode || 'anyone';
    const modeSettings = {
        mode: accessMode,
        allowGuests: accessMode === 'anyone',
        requireRegistered: accessMode === 'registered' || accessMode === 'level-based',
        requireVerified: accessMode === 'level-based',
        levelCriteria: accessMode === 'level-based' ? { 
            min: WizardState.levelMin || 0, 
            max: WizardState.levelMax || 10 
        } : null
    };
    
    try {
        await createTournamentInFirebase(
            tournamentId, 
            WizardState.passcode, 
            WizardState.tournamentName,
            WizardState.teamCount,
            WizardState.groupMode,
            WizardState.includeThirdPlace,
            WizardState.knockoutFormat,
            modeSettings
        );
        
        WizardState.tournamentId = tournamentId;
        WizardState.organiserKey = WizardState.passcode;
        WizardState.initTeams();
        
        MyTournaments.add(tournamentId, WizardState.tournamentName);
        
        showTeamEntryWizard();
        
    } catch (error) {
        console.error('Error creating tournament:', error);
        showWizardError('Failed to create tournament. Please try again.');
    }
}

// ===== TEAM ENTRY WIZARD =====

function showTeamEntryWizard() {
    const teams = WizardState.teams;
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div class="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden animate-slide-up">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-xl font-bold text-white">👥 Enter Team Details</h2>
                            <p class="text-white/80 text-sm">Add player names and ratings for each team</p>
                        </div>
                        <span class="bg-white/20 px-3 py-1 rounded-full text-white text-sm font-medium">${teams.length} teams</span>
                    </div>
                </div>
                
                <div class="p-6 max-h-[60vh] overflow-y-auto">
                    <div class="grid md:grid-cols-2 gap-4">
                        ${teams.map((team, idx) => `
                            <div class="bg-gray-50 rounded-xl p-4">
                                <div class="flex items-center gap-2 mb-3">
                                    <span class="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center font-bold text-sm">${team.id}</span>
                                    <input 
                                        type="text" 
                                        id="team-name-${team.id}" 
                                        value="${team.name}"
                                        placeholder="Team Name (optional)"
                                        class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <input 
                                            type="text" 
                                            id="team-${team.id}-p1-name" 
                                            value="${team.player1Name}"
                                            placeholder="Player 1 Name"
                                            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none mb-2"
                                        />
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-gray-500">Rating:</span>
                                            <input 
                                                type="number" 
                                                id="team-${team.id}-p1-rating" 
                                                value="${team.player1Rating}"
                                                min="0" max="5" step="0.1"
                                                class="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:border-purple-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <input 
                                            type="text" 
                                            id="team-${team.id}-p2-name" 
                                            value="${team.player2Name}"
                                            placeholder="Player 2 Name"
                                            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none mb-2"
                                        />
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-gray-500">Rating:</span>
                                            <input 
                                                type="number" 
                                                id="team-${team.id}-p2-rating" 
                                                value="${team.player2Rating}"
                                                min="0" max="5" step="0.1"
                                                class="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:border-purple-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button onclick="skipTeamEntry()" class="flex-1 px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">
                        Skip (Use Defaults)
                    </button>
                    <button onclick="saveTeamsAndContinue()" class="flex-1 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
                        Continue →
                    </button>
                </div>
            </div>
        </div>
    `;
}

function collectTeamData() {
    WizardState.teams.forEach(team => {
        const nameInput = document.getElementById(`team-name-${team.id}`);
        const p1NameInput = document.getElementById(`team-${team.id}-p1-name`);
        const p1RatingInput = document.getElementById(`team-${team.id}-p1-rating`);
        const p2NameInput = document.getElementById(`team-${team.id}-p2-name`);
        const p2RatingInput = document.getElementById(`team-${team.id}-p2-rating`);
        
        team.name = nameInput?.value?.trim() || '';
        team.player1Name = p1NameInput?.value?.trim() || `Player ${team.id}A`;
        team.player1Rating = parseFloat(p1RatingInput?.value) || 2.5;
        team.player2Name = p2NameInput?.value?.trim() || `Player ${team.id}B`;
        team.player2Rating = parseFloat(p2RatingInput?.value) || 2.5;
        
        if (!team.name) {
            team.name = `${team.player1Name} & ${team.player2Name}`;
        }
    });
}

function skipTeamEntry() {
    WizardState.teams.forEach(team => {
        team.player1Name = `Player ${team.id}A`;
        team.player1Rating = 2.5;
        team.player2Name = `Player ${team.id}B`;
        team.player2Rating = 2.5;
        team.name = `Team ${team.id}`;
    });
    
    if (WizardState.groupMode === 'two_groups') {
        showGroupAssignmentWizard();
    } else {
        finishWizardAndOpen();
    }
}

function saveTeamsAndContinue() {
    collectTeamData();
    
    if (WizardState.groupMode === 'two_groups') {
        showGroupAssignmentWizard();
    } else {
        finishWizardAndOpen();
    }
}

// ===== GROUP ASSIGNMENT WIZARD =====

function showGroupAssignmentWizard() {
    WizardState.teams.forEach(team => {
        team.combinedRating = team.player1Rating + team.player2Rating;
    });
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">📊 Group Assignment</h2>
                    <p class="text-white/80 text-sm">How would you like to split teams into groups?</p>
                </div>
                
                <div class="p-6">
                    <div class="space-y-4">
                        <!-- Auto Balance Option -->
                        <button onclick="autoAssignGroups()" class="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">⚖️</div>
                                <div class="flex-1">
                                    <div class="font-semibold text-gray-800">Auto Balance (Recommended)</div>
                                    <p class="text-sm text-gray-600">Snake draft by rating for balanced groups</p>
                                </div>
                                <span class="text-purple-500">→</span>
                            </div>
                        </button>
                        
                        <!-- Manual Option -->
                        <button onclick="showManualGroupAssignment()" class="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">✋</div>
                                <div class="flex-1">
                                    <div class="font-semibold text-gray-800">Manual Assignment</div>
                                    <p class="text-sm text-gray-600">Choose which teams go to each group</p>
                                </div>
                                <span class="text-gray-400">→</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function autoAssignGroups() {
    const sorted = [...WizardState.teams].sort((a, b) => b.combinedRating - a.combinedRating);
    
    sorted.forEach((team, index) => {
        const round = Math.floor(index / 2);
        const isEvenRound = round % 2 === 0;
        const isFirstInPair = index % 2 === 0;
        
        if ((isEvenRound && isFirstInPair) || (!isEvenRound && !isFirstInPair)) {
            team.group = 'A';
        } else {
            team.group = 'B';
        }
    });
    
    WizardState.teams.forEach(team => {
        const sortedTeam = sorted.find(t => t.id === team.id);
        team.group = sortedTeam.group;
    });
    
    finishWizardAndOpen();
}

function showManualGroupAssignment() {
    WizardState.teams.forEach(team => {
        if (!team.group) team.group = 'A';
    });
    
    renderManualGroupAssignment();
}

function renderManualGroupAssignment() {
    const groupA = WizardState.teams.filter(t => t.group === 'A');
    const groupB = WizardState.teams.filter(t => t.group === 'B');
    const targetPerGroup = Math.ceil(WizardState.teams.length / 2);
    
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div class="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden animate-slide-up">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">✋ Manual Group Assignment</h2>
                    <p class="text-white/80 text-sm">Click teams to move them between groups</p>
                </div>
                
                <div class="p-6">
                    <div class="grid md:grid-cols-2 gap-6">
                        <!-- Group A -->
                        <div>
                            <div class="flex items-center gap-2 mb-3">
                                <span class="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold">A</span>
                                <span class="font-semibold text-gray-800">Group A</span>
                                <span class="text-sm text-gray-500">(${groupA.length}/${targetPerGroup})</span>
                            </div>
                            <div class="space-y-2 min-h-[200px] bg-blue-50 rounded-xl p-3">
                                ${groupA.map(team => `
                                    <button onclick="moveTeamToGroup(${team.id}, 'B')" class="w-full text-left p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div class="font-medium text-gray-800">${team.name}</div>
                                        <div class="text-xs text-gray-500">${team.player1Name} & ${team.player2Name} • ${team.combinedRating.toFixed(1)}</div>
                                    </button>
                                `).join('') || '<p class="text-center text-gray-400 py-8">No teams</p>'}
                            </div>
                        </div>
                        
                        <!-- Group B -->
                        <div>
                            <div class="flex items-center gap-2 mb-3">
                                <span class="w-8 h-8 rounded-lg bg-purple-500 text-white flex items-center justify-center font-bold">B</span>
                                <span class="font-semibold text-gray-800">Group B</span>
                                <span class="text-sm text-gray-500">(${groupB.length}/${Math.floor(WizardState.teams.length / 2)})</span>
                            </div>
                            <div class="space-y-2 min-h-[200px] bg-purple-50 rounded-xl p-3">
                                ${groupB.map(team => `
                                    <button onclick="moveTeamToGroup(${team.id}, 'A')" class="w-full text-left p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div class="font-medium text-gray-800">${team.name}</div>
                                        <div class="text-xs text-gray-500">${team.player1Name} & ${team.player2Name} • ${team.combinedRating.toFixed(1)}</div>
                                    </button>
                                `).join('') || '<p class="text-center text-gray-400 py-8">No teams</p>'}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Balance indicator -->
                    <div class="mt-4 p-3 rounded-xl ${Math.abs(groupA.length - groupB.length) <= 1 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}">
                        <p class="text-sm font-medium">
                            ${Math.abs(groupA.length - groupB.length) <= 1 
                                ? '✓ Groups are balanced' 
                                : '⚠️ Groups are unbalanced - try to even them out'}
                        </p>
                    </div>
                </div>
                
                <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button onclick="showGroupAssignmentWizard()" class="flex-1 px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors">
                        ← Back
                    </button>
                    <button onclick="finishWizardAndOpen()" class="flex-1 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors" ${groupB.length === 0 ? 'disabled' : ''}>
                        Continue →
                    </button>
                </div>
            </div>
        </div>
    `;
}

function moveTeamToGroup(teamId, newGroup) {
    const team = WizardState.teams.find(t => t.id === teamId);
    if (team) {
        team.group = newGroup;
        renderManualGroupAssignment();
    }
}

// ===== FINISH WIZARD =====

async function finishWizardAndOpen() {
    try {
        const teams = WizardState.teams.map(team => ({
            id: team.id,
            name: team.name,
            player1Name: team.player1Name,
            player1Rating: team.player1Rating,
            player2Name: team.player2Name,
            player2Rating: team.player2Rating,
            combinedRating: team.player1Rating + team.player2Rating,
            group: team.group || 'A'
        }));
        
        const groupA = teams.filter(t => t.group === 'A').map(t => t.id);
        const groupB = teams.filter(t => t.group === 'B').map(t => t.id);
        
        const groupATeams = teams.filter(t => t.group === 'A');
        const groupBTeams = teams.filter(t => t.group === 'B');
        
        const groupAFixtures = generateRoundRobinFixtures(groupATeams);
        const groupBFixtures = WizardState.groupMode === 'two_groups' ? generateRoundRobinFixtures(groupBTeams) : [];
        
        const basePath = `team-tournaments/${WizardState.tournamentId}`;
        await database.ref(basePath).update({
            teams: teams,
            groupA: groupA,
            groupB: groupB,
            groupAFixtures: groupAFixtures,
            groupBFixtures: groupBFixtures
        });
        
        closeModal();
        Router.navigate('tournament', WizardState.tournamentId, WizardState.organiserKey);
        
    } catch (error) {
        console.error('Error saving teams:', error);
        showToast('❌ Error saving teams. Please try again.');
    }
}

// ===== JOIN MODAL =====

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

// ===== HANDLERS =====

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

async function createTournamentInFirebase(tournamentId, organiserKey, name, teamCount, groupMode, includeThirdPlace, knockoutFormat = 'quarter_final', modeSettings = null) {
    // Get current user for creator info
    const currentUser = getCurrentUser();
    
    // Default mode settings
    const defaultModeSettings = {
        mode: 'anyone',
        allowGuests: true,
        requireRegistered: false,
        requireVerified: false,
        levelCriteria: null
    };
    
    const data = {
        meta: {
            name: name,
            organiserKey: organiserKey,
            formatType: 'team_league',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // Mode settings
            ...(modeSettings || defaultModeSettings),
            // Creator info
            createdBy: currentUser ? {
                id: currentUser.id,
                name: currentUser.name,
                type: currentUser.type
            } : null
        },
        teamCount: teamCount,
        groupMode: groupMode,
        includeThirdPlace: includeThirdPlace,
        knockoutFormat: knockoutFormat, // 'final_only', 'semi_final', 'quarter_final'
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
        savedVersions: [],
        // For registered modes
        registeredPlayers: {}
    };
    
    await database.ref(`team-tournaments/${tournamentId}`).set(data);
    console.log(`✅ Tournament ${tournamentId} created (mode: ${modeSettings?.mode || 'anyone'})`);
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

console.log('✅ Team Tournament Landing loaded');
