/**
 * components.js - UI Components for Mexicano Tournament
 * Rendering functions for tournament views
 */

/**
 * Render the main tournament view
 */
function renderTournament() {
    if (!state) return;
    
    // Check for completed tournament
    if (state.status === 'completed') {
        renderCompletedScreen();
        return;
    }
    
    const canEdit = state.canEdit();
    
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen">
            <!-- Header -->
            <div class="bg-gradient-to-r from-teal-600 to-teal-500 text-white sticky top-0 z-30 shadow-lg">
                <div class="max-w-3xl mx-auto px-4 py-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <a href="#" class="text-2xl hover:scale-110 transition-transform">🎯</a>
                            <div>
                                <h1 class="font-bold text-lg leading-tight">${state.tournamentName}</h1>
                                <div class="flex items-center gap-2 text-sm text-teal-100">
                                    <span>${state.mode === 'individual' ? 'Individual' : 'Team'}</span>
                                    <span>•</span>
                                    <span>${state.pointsPerMatch} pts</span>
                                    ${!canEdit ? '<span>•</span><span class="text-amber-200">👁 View Only</span>' : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${!canEdit ? `
                                <button onclick="showOrganiserLoginModal()" class="bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                    🔑 Login
                                </button>
                            ` : ''}
                            <button onclick="showShareModal()" class="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 hover:bg-white/30 transition-colors cursor-pointer">
                                <span class="font-mono font-bold tracking-wider">${state.tournamentId.toUpperCase()}</span>
                                <span class="text-teal-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Tab Navigation -->
            <div class="max-w-3xl mx-auto px-4 py-4">
                <div class="bg-gray-100 rounded-2xl p-1.5 flex gap-1">
                    <button onclick="switchTab('matches')" class="flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${state.activeTab === 'matches' ? 'tab-active' : 'tab-inactive'}">
                        🎾 Matches
                    </button>
                    <button onclick="switchTab('standings')" class="flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${state.activeTab === 'standings' ? 'tab-active' : 'tab-inactive'}">
                        🏆 Standings
                    </button>
                    <button onclick="switchTab('settings')" class="flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${state.activeTab === 'settings' ? 'tab-active' : 'tab-inactive'}">
                        ⚙️ Settings
                    </button>
                </div>
            </div>
            
            <!-- Tab Content -->
            <div class="max-w-3xl mx-auto px-4 pb-8">
                ${state.activeTab === 'matches' ? renderMatchesTab() : ''}
                ${state.activeTab === 'standings' ? renderStandingsTab() : ''}
                ${state.activeTab === 'settings' ? renderSettingsTab() : ''}
            </div>
        </div>
    `;
}

/**
 * Render matches tab
 */
function renderMatchesTab() {
    if (!state) return '';
    
    const round = state.rounds[state.viewingRound - 1];
    if (!round) return '<p class="text-center text-gray-500 py-8">No matches yet</p>';
    
    const isCurrent = state.viewingRound === state.currentRound;
    const canEdit = state.canEdit();
    
    return `
        <!-- Round Selector -->
        <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
            ${state.rounds.map((r, i) => `
                <button onclick="viewRound(${i + 1})" 
                    class="round-btn px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${state.viewingRound === i + 1 ? 'active' : 'bg-white text-gray-600 hover:bg-gray-50'}">
                    Round ${i + 1}
                </button>
            `).join('')}
        </div>
        
        <!-- Matches -->
        <div class="space-y-4">
            ${round.matches.map((match, i) => renderMatchCard(match, i, isCurrent && canEdit)).join('')}
        </div>
        
        <!-- Sitting Out -->
        ${round.sittingOut?.length ? `
            <div class="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div class="flex items-center gap-3 flex-wrap">
                    <span class="resting-badge">⏳ Sitting Out</span>
                    ${round.sittingOut.map(p => `
                        <span class="player-badge-compact ${state.mode === 'individual' ? getPlayerColor(p.index) : getTeamColor(p.index)}" style="opacity: 0.7; max-width: none; width: auto;">
                            ${p.name}
                        </span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <!-- Complete Round Button -->
        ${isCurrent && canEdit && round.matches.every(m => m.completed) && !round.completed ? `
            <div class="mt-6">
                <button onclick="completeRound()" 
                    class="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                    Complete Round & Generate Next →
                </button>
            </div>
        ` : ''}
    `;
}

/**
 * Render individual match card
 */
function renderMatchCard(match, index, canEditScores) {
    if (!state) return '';
    
    const done = match.completed;
    const colorFn = state.mode === 'individual' ? getPlayerColor : getTeamColor;
    
    const t1Names = state.mode === 'individual' ? match.team1Names : match.team1Players;
    const t2Names = state.mode === 'individual' ? match.team2Names : match.team2Players;
    const t1Idx = state.mode === 'individual' ? match.team1Indices : [match.team1Index, match.team1Index];
    const t2Idx = state.mode === 'individual' ? match.team2Indices : [match.team2Index, match.team2Index];
    
    const canEdit = state.canEdit();
    
    return `
        <div class="match-card ${done ? 'complete' : ''} p-4 animate-slide-up" style="animation-delay: ${index * 0.05}s">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded-lg">Court ${match.court}</span>
                    ${done ? '<span class="text-green-600 text-xs font-semibold">✓ Complete</span>' : ''}
                </div>
                ${done && canEdit ? `
                    <button onclick="editMatch('${match.id}')" class="text-gray-400 hover:text-teal-600 transition-colors text-sm">Edit</button>
                ` : ''}
            </div>
            
            <div class="match-row">
                <!-- Team 1 -->
                <div class="team-stack ${done && match.score1 > match.score2 ? 'winner' : ''}">
                    <span class="player-badge-compact ${colorFn(t1Idx[0])}">${t1Names[0]}</span>
                    <span class="player-badge-compact ${colorFn(t1Idx[1])}">${t1Names[1]}</span>
                </div>
                
                <!-- Score Box -->
                <div class="score-box-horizontal ${done ? 'score-complete' : ''}">
                    <div class="flex items-center gap-2">
                        ${canEditScores && !done ? `
                            <input type="number" class="score-input-compact" 
                                value="${match.score1 !== null ? match.score1 : ''}" 
                                data-match="${match.id}" data-team="1"
                                onfocus="onScoreFocus('${match.id}')"
                                onblur="onScoreBlur('${match.id}', 1, this.value)"
                                oninput="onScoreInput('${match.id}', 1, this.value)"
                                min="0" max="${state.pointsPerMatch}" placeholder="-" />
                            <span class="text-gray-400 font-bold text-xl">:</span>
                            <input type="number" class="score-input-compact" 
                                value="${match.score2 !== null ? match.score2 : ''}"
                                data-match="${match.id}" data-team="2"
                                onfocus="onScoreFocus('${match.id}')"
                                onblur="onScoreBlur('${match.id}', 2, this.value)"
                                oninput="onScoreInput('${match.id}', 2, this.value)"
                                min="0" max="${state.pointsPerMatch}" placeholder="-" />
                        ` : `
                            <span class="score-input-compact">${match.score1 !== null ? match.score1 : '-'}</span>
                            <span class="text-gray-400 font-bold text-xl">:</span>
                            <span class="score-input-compact">${match.score2 !== null ? match.score2 : '-'}</span>
                        `}
                    </div>
                </div>
                
                <!-- Team 2 -->
                <div class="team-stack ${done && match.score2 > match.score1 ? 'winner' : ''}">
                    <span class="player-badge-compact ${colorFn(t2Idx[0])}">${t2Names[0]}</span>
                    <span class="player-badge-compact ${colorFn(t2Idx[1])}">${t2Names[1]}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render standings tab
 */
function renderStandingsTab() {
    if (!state) return '';
    
    const items = state.getStandings();
    const isIndividual = state.mode === 'individual';
    
    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table class="standings-table">
                <thead>
                    <tr>
                        <th class="text-center">#</th>
                        <th>${isIndividual ? 'Player' : 'Team'}</th>
                        <th class="text-center">Played</th>
                        <th class="text-center">Points</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, i) => {
                        const origIdx = isIndividual 
                            ? state.players.findIndex(p => p.id === item.id)
                            : state.teams.findIndex(t => t.id === item.id);
                        const colorClass = isIndividual ? getPlayerColor(origIdx) : getTeamColor(origIdx);
                        
                        return `
                            <tr class="${i < 3 ? 'top-3' : ''}">
                                <td class="text-center font-bold ${i < 3 ? 'text-teal-600' : 'text-gray-400'}">
                                    ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                </td>
                                <td>
                                    <div class="flex items-center gap-3">
                                        <div class="team-mini-badge ${colorClass}">
                                            ${isIndividual ? item.name.charAt(0).toUpperCase() : origIdx + 1}
                                        </div>
                                        <span class="font-semibold text-gray-800">
                                            ${isIndividual ? item.name : `${item.player1} & ${item.player2}`}
                                        </span>
                                    </div>
                                </td>
                                <td class="text-center text-gray-500">${item.matchesPlayed}</td>
                                <td class="text-center font-bold ${i < 3 ? 'text-teal-600' : 'text-gray-800'} text-lg">${item.totalPoints}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Render settings tab
 */
function renderSettingsTab() {
    if (!state) return '';
    
    const canEdit = state.canEdit();
    
    return `
        <div class="space-y-4">
            <!-- Share Section -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">🔗 Share Session</h3>
                <div class="bg-gray-50 rounded-xl p-4 mb-4 text-center">
                    <div class="text-xs text-gray-500 mb-1">Session Code</div>
                    <div class="text-3xl font-mono font-bold text-teal-600 tracking-widest">${state.tournamentId.toUpperCase()}</div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="copyCode()" class="flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                        📋 Copy Code
                    </button>
                    <button onclick="showShareModal()" class="flex items-center justify-center gap-2 py-3 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-xl font-medium transition-colors">
                        🔗 Share Links
                    </button>
                </div>
            </div>
            
            <!-- Session Info -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">📊 Session Info</h3>
                <div class="space-y-3 text-sm">
                    <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-gray-500">Mode</span>
                        <span class="font-medium">${state.mode === 'individual' ? 'Individual' : 'Team'}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-gray-500">Points per Match</span>
                        <span class="font-medium">${state.pointsPerMatch}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-gray-500">${state.mode === 'individual' ? 'Players' : 'Teams'}</span>
                        <span class="font-medium">${state.mode === 'individual' ? state.players.length : state.teams.length}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-gray-100">
                        <span class="text-gray-500">Current Round</span>
                        <span class="font-medium">${state.currentRound}</span>
                    </div>
                    <div class="flex justify-between py-2">
                        <span class="text-gray-500">Access Level</span>
                        <span class="font-medium ${canEdit ? 'text-green-600' : 'text-amber-600'}">${canEdit ? '✓ Organiser' : '👁 View Only'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Organiser Actions -->
            ${canEdit ? `
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">🏁 End Tournament</h3>
                    <p class="text-sm text-gray-500 mb-4">Declare the winner based on current standings.</p>
                    <button onclick="confirmEnd()" class="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold transition-colors">
                        End Tournament
                    </button>
                </div>
            ` : `
                <div class="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                    <h3 class="font-bold text-amber-800 mb-2 flex items-center gap-2">🔑 Need to Edit?</h3>
                    <p class="text-sm text-amber-700 mb-4">You're in view-only mode. Login with your passcode to edit scores.</p>
                    <button onclick="showOrganiserLoginModal()" class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                        Organiser Login
                    </button>
                </div>
            `}
        </div>
    `;
}

/**
 * Render completed tournament screen
 */
function renderCompletedScreen() {
    if (!state) return;
    
    const items = state.getStandings();
    const winner = items[0];
    const isIndividual = state.mode === 'individual';
    
    document.getElementById('app').innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50">
            <div class="max-w-2xl mx-auto px-4 py-12">
                <div class="text-center mb-8">
                    <div class="text-6xl mb-4">🏆</div>
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">Tournament Complete!</h1>
                    <p class="text-xl text-teal-600 font-semibold">
                        ${isIndividual ? winner.name : `${winner.player1} & ${winner.player2}`} wins with ${winner.totalPoints} points!
                    </p>
                </div>
                
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <table class="standings-table">
                        <thead>
                            <tr>
                                <th class="text-center">#</th>
                                <th>${isIndividual ? 'Player' : 'Team'}</th>
                                <th class="text-center">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, i) => `
                                <tr class="${i === 0 ? 'bg-yellow-50' : i < 3 ? 'bg-teal-50/50' : ''}">
                                    <td class="text-center font-bold">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                                    <td class="font-semibold">${isIndividual ? item.name : `${item.player1} & ${item.player2}`}</td>
                                    <td class="text-center font-bold text-lg">${item.totalPoints}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <button onclick="Router.navigate('home')" class="w-full py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl font-semibold text-lg">
                    Back to Home
                </button>
            </div>
        </div>
    `;
}

console.log('✅ Mexicano Components loaded');
