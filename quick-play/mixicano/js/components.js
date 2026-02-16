/**
 * components.js - UI Components for Mixicano Tournament
 * Rendering functions for tournament views
 */

/**
 * Render the main tournament view
 */
function renderTournament() {
    if (!state) return;

    if (state.status === 'completed') {
        renderCompletedScreen();
        return;
    }

    const canEdit = state.canEdit();

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen">
            <!-- Shared Header -->
            ${renderTournamentHeader({
                format: 'mixicano',
                tournamentId: state.tournamentId,
                tournamentName: state.tournamentName,
                isOrganiser: canEdit,
                subtitle: 'Mixed Gender • ' + state.pointsPerMatch + ' pts'
            })}

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
                        <span class="player-badge-compact ${getPlayerColor(p.index)}" style="opacity: 0.7; max-width: none; width: auto;">
                            ${p.name || 'TBD'}
                        </span>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <!-- Complete Round Button -->
        ${isCurrent && canEdit && round.matches.every(m => m.completed) && !round.completed ? `
            <div class="mt-6">
                <button onclick="completeRound()"
                    class="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all">
                    Complete Round & Generate Next →
                </button>
            </div>
        ` : ''}
    `;
}

/**
 * Render individual match card with gender indicators
 */
function renderMatchCard(match, index, canEditScores) {
    if (!state || !match) return '';

    const done = match.completed;

    // Normalize arrays from Firebase
    const normalizeArr = (arr) => {
        if (!arr) return null;
        if (Array.isArray(arr)) return arr;
        return Object.values(arr);
    };

    const t1Names = normalizeArr(match.team1Names) || ['Player 1', 'Player 2'];
    const t2Names = normalizeArr(match.team2Names) || ['Player 3', 'Player 4'];
    const t1Idx = normalizeArr(match.team1Indices) || [0, 1];
    const t2Idx = normalizeArr(match.team2Indices) || [2, 3];
    const t1Genders = normalizeArr(match.team1Genders) || ['M', 'F'];
    const t2Genders = normalizeArr(match.team2Genders) || ['M', 'F'];

    const safeName = (name, fallback) => name || fallback;
    const genderIcon = (g) => g === 'F' ? '♀' : '♂';
    const genderClass = (g) => g === 'F' ? 'text-pink-400' : 'text-blue-400';

    const canEdit = state.canEdit();

    return `
        <div class="match-card ${done ? 'complete' : ''} p-4 animate-slide-up" style="animation-delay: ${index * 0.05}s">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-1 rounded-lg">Court ${match.court}</span>
                    ${done ? '<span class="text-green-600 text-xs font-semibold">✓ Complete</span>' : ''}
                </div>
                ${done && canEdit ? `
                    <button onclick="editMatch('${match.id}')" class="text-gray-400 hover:text-rose-600 transition-colors text-sm">Edit</button>
                ` : ''}
            </div>

            <div class="match-row">
                <!-- Team 1 -->
                <div class="team-stack ${done && match.score1 > match.score2 ? 'winner' : ''}">
                    <span class="player-badge-compact ${getPlayerColor(t1Idx[0])}"><span class="${genderClass(t1Genders[0])} mr-1">${genderIcon(t1Genders[0])}</span>${safeName(t1Names[0], 'TBD')}</span>
                    <span class="player-badge-compact ${getPlayerColor(t1Idx[1])}"><span class="${genderClass(t1Genders[1])} mr-1">${genderIcon(t1Genders[1])}</span>${safeName(t1Names[1], 'TBD')}</span>
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
                                min="0" max="${state.pointsPerMatch || 24}" placeholder="-" />
                            <span class="text-gray-400 font-bold text-xl">:</span>
                            <input type="number" class="score-input-compact"
                                value="${match.score2 !== null ? match.score2 : ''}"
                                data-match="${match.id}" data-team="2"
                                onfocus="onScoreFocus('${match.id}')"
                                onblur="onScoreBlur('${match.id}', 2, this.value)"
                                oninput="onScoreInput('${match.id}', 2, this.value)"
                                min="0" max="${state.pointsPerMatch || 24}" placeholder="-" />
                        ` : `
                            <span class="score-input-compact">${match.score1 !== null ? match.score1 : '-'}</span>
                            <span class="text-gray-400 font-bold text-xl">:</span>
                            <span class="score-input-compact">${match.score2 !== null ? match.score2 : '-'}</span>
                        `}
                    </div>
                </div>

                <!-- Team 2 -->
                <div class="team-stack ${done && match.score2 > match.score1 ? 'winner' : ''}">
                    <span class="player-badge-compact ${getPlayerColor(t2Idx[0])}"><span class="${genderClass(t2Genders[0])} mr-1">${genderIcon(t2Genders[0])}</span>${safeName(t2Names[0], 'TBD')}</span>
                    <span class="player-badge-compact ${getPlayerColor(t2Idx[1])}"><span class="${genderClass(t2Genders[1])} mr-1">${genderIcon(t2Genders[1])}</span>${safeName(t2Names[1], 'TBD')}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render standings tab with gender indicators
 */
function renderStandingsTab() {
    if (!state) return '';

    const items = state.getStandings();

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table class="standings-table">
                <thead>
                    <tr>
                        <th class="text-center">#</th>
                        <th>Player</th>
                        <th class="text-center">Played</th>
                        <th class="text-center">Points</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, i) => {
                        const origIdx = state.players.findIndex(p => p.id === item.id);
                        const colorClass = getPlayerColor(origIdx);
                        const gIcon = item.gender === 'F' ? '♀' : '♂';
                        const gColor = item.gender === 'F' ? 'text-pink-500' : 'text-blue-500';

                        return `
                            <tr class="${i < 3 ? 'top-3' : ''}">
                                <td class="text-center font-bold ${i < 3 ? 'text-rose-600' : 'text-gray-400'}">
                                    ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                </td>
                                <td>
                                    <div class="flex items-center gap-3">
                                        <div class="team-mini-badge ${colorClass}">
                                            ${item.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span class="font-semibold text-gray-800">
                                            <span class="${gColor} mr-1">${gIcon}</span>${item.name}
                                        </span>
                                    </div>
                                </td>
                                <td class="text-center text-gray-500">${item.matchesPlayed}</td>
                                <td class="text-center font-bold ${i < 3 ? 'text-rose-600' : 'text-gray-800'} text-lg">${item.totalPoints}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <!-- Share Result Card Buttons -->
        <div class="mt-4 flex flex-wrap gap-2 justify-center">
            <button onclick="ResultCard.share(getCardData(), 'landscape')" class="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Share Leaderboard
            </button>
            <button onclick="ResultCard.share(getCardData(), 'story')" class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                Share to Story
            </button>
        </div>
    `;
}

/**
 * Render settings tab with sub-tabs
 */
function renderSettingsTab() {
    if (!state) return '';

    const canEdit = state.canEdit();

    if (!canEdit) {
        return `
            <div class="space-y-4">
                <div class="bg-amber-50 rounded-2xl border border-amber-200 p-5">
                    <h3 class="font-bold text-amber-800 mb-2 flex items-center gap-2">🔑 Need to Edit?</h3>
                    <p class="text-sm text-amber-700 mb-4">You're in view-only mode. Login with your passcode to edit settings.</p>
                    <button onclick="showOrganiserLoginModal()" class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors">
                        Organiser Login
                    </button>
                </div>
                ${renderSessionInfo(canEdit)}
            </div>
        `;
    }

    return `
        <div class="space-y-4">
            <div class="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
                <button onclick="state.settingsSubTab = 'players'; render();"
                    class="settings-subtab ${state.settingsSubTab === 'players' ? 'active' : 'inactive'}">
                    👥 Players
                </button>
                <button onclick="state.settingsSubTab = 'courts'; render();"
                    class="settings-subtab ${state.settingsSubTab === 'courts' ? 'active' : 'inactive'}">
                    🏟️ Courts
                </button>
                <button onclick="state.settingsSubTab = 'scoring'; render();"
                    class="settings-subtab ${state.settingsSubTab === 'scoring' ? 'active' : 'inactive'}">
                    📊 Scoring
                </button>
                <button onclick="state.settingsSubTab = 'share'; render();"
                    class="settings-subtab ${state.settingsSubTab === 'share' ? 'active' : 'inactive'}">
                    🔗 Share
                </button>
                <button onclick="state.settingsSubTab = 'danger'; render();"
                    class="settings-subtab ${state.settingsSubTab === 'danger' ? 'active' : 'inactive'}">
                    ⚠️ Danger
                </button>
            </div>

            ${state.settingsSubTab === 'players' ? renderPlayersSettings(canEdit) : ''}
            ${state.settingsSubTab === 'courts' ? renderCourtsSettings(canEdit) : ''}
            ${state.settingsSubTab === 'scoring' ? renderScoringSettings(canEdit) : ''}
            ${state.settingsSubTab === 'share' ? renderShareSettings() : ''}
            ${state.settingsSubTab === 'danger' ? renderDangerSettings(canEdit) : ''}
        </div>
    `;
}

function renderSessionInfo(canEdit) {
    const maleCount = state.players.filter(p => p.gender === 'M').length;
    const femaleCount = state.players.filter(p => p.gender === 'F').length;

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">📊 Session Info</h3>
            <div class="space-y-3 text-sm">
                <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-500">Format</span>
                    <span class="font-medium">Mixicano (Mixed Gender)</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-500">Points per Match</span>
                    <span class="font-medium">${state.pointsPerMatch}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-500">Players</span>
                    <span class="font-medium">${state.players.length} (<span class="text-blue-600">♂ ${maleCount}</span> / <span class="text-pink-600">♀ ${femaleCount}</span>)</span>
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
    `;
}

function renderPlayersSettings(canEdit) {
    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100">
                <h3 class="font-semibold text-gray-800">Player Names</h3>
                <p class="text-sm text-gray-500 mt-1">Edit player names for the tournament</p>
            </div>
            <div class="p-4 space-y-3">
                ${state.players.map((item, index) => `
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">${index + 1}</div>
                        <span class="text-lg ${item.gender === 'F' ? 'text-pink-500' : 'text-blue-500'}">${item.gender === 'F' ? '♀' : '♂'}</span>
                        <input type="text"
                            value="${item.name || ''}"
                            placeholder="Player ${index + 1}"
                            class="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-rose-500 focus:outline-none transition-colors ${!canEdit ? 'bg-gray-50' : ''}"
                            ${!canEdit ? 'disabled' : ''}
                            onchange="state.updatePlayerName(${index}, this.value); render();" />
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderCourtsSettings(canEdit) {
    const numCourts = Math.floor(state.players.length / 4);

    if (!state.courtNames) state.courtNames = [];
    while (state.courtNames.length < numCourts) {
        state.courtNames.push(`Court ${state.courtNames.length + 1}`);
    }

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100">
                <h3 class="font-semibold text-gray-800">Court Names</h3>
                <p class="text-sm text-gray-500 mt-1">Customize court labels for display</p>
            </div>
            <div class="p-4 space-y-3">
                ${numCourts > 0 ? state.courtNames.slice(0, numCourts).map((name, index) => `
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">${index + 1}</div>
                        <input type="text"
                            value="${name}"
                            placeholder="Court ${index + 1}"
                            class="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-rose-500 focus:outline-none transition-colors ${!canEdit ? 'bg-gray-50' : ''}"
                            ${!canEdit ? 'disabled' : ''}
                            onchange="state.updateCourtName(${index}, this.value)" />
                    </div>
                `).join('') : `
                    <div class="text-center py-4 text-gray-500">
                        <p>Courts are automatically assigned based on player count.</p>
                        <p class="text-sm mt-1">With ${state.players.length} players, you have ${numCourts} court${numCourts !== 1 ? 's' : ''}.</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

function renderScoringSettings(canEdit) {
    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100">
                <h3 class="font-semibold text-gray-800">Scoring Settings</h3>
            </div>
            <div class="p-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Points per Match</label>
                    <select
                        class="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-rose-500 focus:outline-none transition-colors ${!canEdit ? 'bg-gray-50' : ''}"
                        ${!canEdit ? 'disabled' : ''}
                        onchange="state.updateSettings({ pointsPerMatch: parseInt(this.value) }); render();">
                        ${[16, 21, 24, 32].map(pts => `
                            <option value="${pts}" ${state.pointsPerMatch === pts ? 'selected' : ''}>${pts} points</option>
                        `).join('')}
                    </select>
                    <p class="text-xs text-gray-500 mt-2">Total points available per match. Each team earns their score (e.g., 16-14 means 16 and 14 points awarded).</p>
                </div>

                ${renderSessionInfo(canEdit)}
            </div>
        </div>
    `;
}

function renderShareSettings() {
    return `
        <div class="space-y-4">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">🔗 Share Session</h3>
                <div class="bg-gray-50 rounded-xl p-4 mb-4 text-center">
                    <div class="text-xs text-gray-500 mb-1">Session Code</div>
                    <div class="text-3xl font-mono font-bold text-rose-600 tracking-widest">${state.tournamentId.toUpperCase()}</div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="copyCode()" class="flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                        📋 Copy Code
                    </button>
                    <button onclick="showShareModal()" class="flex items-center justify-center gap-2 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-medium transition-colors">
                        🔗 Share Links
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderDangerSettings(canEdit) {
    return `
        <div class="space-y-4">
            <div class="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
                <div class="px-6 py-4 border-b border-red-100 bg-red-50">
                    <h3 class="font-semibold text-red-800">⚠️ Danger Zone</h3>
                    <p class="text-sm text-red-600 mt-1">These actions cannot be undone</p>
                </div>
                <div class="p-4 space-y-4">
                    <button
                        onclick="if(confirm('Reset ALL scores? This will clear all match results. This cannot be undone!')) { state.resetAllScores(); render(); showToast('✅ All scores reset'); }"
                        class="w-full px-4 py-3 border-2 border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${!canEdit ? 'disabled' : ''}>
                        🗑️ Reset All Scores
                    </button>

                    <button
                        onclick="confirmEnd()"
                        class="w-full px-4 py-3 border-2 border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}"
                        ${!canEdit ? 'disabled' : ''}>
                        🏁 End Tournament
                    </button>
                </div>
            </div>
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

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50">
            <div class="max-w-2xl mx-auto px-4 py-12">
                <div class="text-center mb-8">
                    <div class="text-6xl mb-4">🏆</div>
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">Tournament Complete!</h1>
                    <p class="text-xl text-rose-600 font-semibold">
                        ${winner.name} wins with ${winner.totalPoints} points!
                    </p>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <table class="standings-table">
                        <thead>
                            <tr>
                                <th class="text-center">#</th>
                                <th>Player</th>
                                <th class="text-center">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, i) => {
                                const gIcon = item.gender === 'F' ? '♀' : '♂';
                                const gColor = item.gender === 'F' ? 'text-pink-500' : 'text-blue-500';
                                return `
                                    <tr class="${i === 0 ? 'bg-yellow-50' : i < 3 ? 'bg-rose-50/50' : ''}">
                                        <td class="text-center font-bold">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                                        <td class="font-semibold"><span class="${gColor} mr-1">${gIcon}</span>${item.name}</td>
                                        <td class="text-center font-bold text-lg">${item.totalPoints}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <button onclick="Router.navigate('home')" class="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl font-semibold text-lg">
                    Back to Home
                </button>
            </div>
        </div>
    `;

    // Show completion share prompt
    setTimeout(function() {
        if (typeof ResultCard !== 'undefined' && typeof getCardData === 'function') {
            ResultCard.showCompletionModal(getCardData());
        }
    }, 500);
}

console.log('✅ Mixicano Components loaded');
