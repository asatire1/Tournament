// ===== LEAGUE UI COMPONENTS =====
// Rendering functions for the league system: divisions, standings,
// fixtures, teams, settings, and promotion/relegation zones.
// Uses Tailwind CSS (CDN). All HTML returned as strings into #app.

// ===== ACTIVE TAB STATE =====

let activeTab = 'overview';

function switchTab(tabName) {
    activeTab = tabName;
    render();
}

// ===== MAIN RENDER =====

/**
 * renderLeague() - Master render. Draws the header, tab bar, and the
 * currently active tab content into #app.
 */
function renderLeague() {
    if (!state || !state.isInitialized) {
        document.getElementById('app').innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="animate-spin w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
                    <p class="text-gray-500">Loading league...</p>
                </div>
            </div>
        `;
        return;
    }

    const isOrganiser = state.isOrganiser;
    const divisions = state.divisions || [];

    // Build tab list: Overview, each division, Fixtures, Teams, Settings (organiser)
    const tabs = [
        { key: 'overview', label: 'Overview' },
        ...divisions.map(d => ({ key: 'division_' + d.index, label: d.name })),
        { key: 'fixtures', label: 'Fixtures' },
        { key: 'teams', label: 'Teams' }
    ];

    if (isOrganiser) {
        tabs.push({ key: 'settings', label: 'Settings' });
    }

    // If the active tab no longer exists (e.g. divisions changed), fall back
    if (!tabs.find(t => t.key === activeTab)) {
        activeTab = 'overview';
    }

    // --- Render tab content ---
    let tabContent = '';
    if (activeTab === 'overview') {
        tabContent = renderOverview();
    } else if (activeTab.startsWith('division_')) {
        const divIdx = parseInt(activeTab.replace('division_', ''), 10);
        tabContent = renderDivision(divIdx);
    } else if (activeTab === 'fixtures') {
        tabContent = renderFixtures();
    } else if (activeTab === 'teams') {
        tabContent = renderTeams();
    } else if (activeTab === 'settings') {
        tabContent = renderSettings();
    }

    document.getElementById('app').innerHTML = `
        <div class="min-h-screen bg-gray-50">
            <!-- Header -->
            ${renderLeagueHeader()}

            <!-- Tab Bar -->
            <div class="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div class="max-w-6xl mx-auto px-4">
                    <div class="flex gap-1 overflow-x-auto py-3 scrollbar-hide" style="-webkit-overflow-scrolling: touch;">
                        ${tabs.map(t => `
                            <button onclick="switchTab('${t.key}')"
                                class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all
                                    ${activeTab === t.key
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'}">
                                ${t.label}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Tab Content -->
            <div class="max-w-6xl mx-auto px-4 py-6">
                ${tabContent}
            </div>
        </div>
    `;
}

// ===== LEAGUE HEADER =====

function renderLeagueHeader() {
    const leagueCode = (state.leagueId || '').toUpperCase();

    return `
        <div class="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white">
            <div class="max-w-6xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <!-- Left -->
                    <div class="flex items-center gap-3">
                        <a href="./" class="hover:opacity-80 transition-opacity" title="Back to Leagues">
                            <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                </svg>
                            </div>
                        </a>
                    </div>

                    <!-- Center -->
                    <div class="text-center flex-1 min-w-0 px-4">
                        <h1 class="font-bold text-lg leading-tight truncate">${state.leagueName || 'League'}</h1>
                        <p class="text-sm text-white/70">Season ${state.currentSeason} &middot; ${(state.divisions || []).length} division${(state.divisions || []).length !== 1 ? 's' : ''}</p>
                    </div>

                    <!-- Right -->
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${state.isOrganiser ? `
                            <span class="hidden sm:inline-flex items-center gap-1 bg-amber-500/30 text-amber-100 px-2.5 py-1 rounded-lg text-xs font-medium">
                                Organiser
                            </span>
                        ` : ''}
                        <button onclick="copyToClipboard('${leagueCode}'); showToast('Code copied!')"
                            class="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl px-3 py-2 transition-colors" title="Copy league code">
                            <span class="font-mono font-bold tracking-wider text-sm">${leagueCode}</span>
                            <svg class="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== OVERVIEW TAB =====

function renderOverview() {
    const seasonNum = state.getActiveSeason();
    const progress = state.getSeasonProgress(seasonNum);
    const divisions = state.divisions || [];
    const upcoming = state.getUpcomingFixtures(5);
    const recent = state.getRecentResults(5);

    // Status badge
    const statusMap = {
        setup: { label: 'Setup', cls: 'bg-yellow-100 text-yellow-700' },
        active: { label: 'Active', cls: 'bg-green-100 text-green-700' },
        completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-700' }
    };
    const badge = statusMap[state.status] || statusMap.setup;

    return `
        <!-- Season Header -->
        <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
                <h2 class="text-xl font-bold text-gray-800">Season ${seasonNum}</h2>
                <p class="text-sm text-gray-500">${state.leagueName || 'League'}</p>
            </div>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}">
                ${badge.label}
            </span>
        </div>

        <!-- Progress Bar -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">Season Progress</span>
                <span class="text-sm text-gray-500">${progress.completed} / ${progress.total} matches</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
                <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                     style="width: ${progress.percentage}%"></div>
            </div>
            <p class="text-xs text-gray-400 mt-1.5 text-right">${progress.percentage}% complete</p>
        </div>

        <!-- Division Standings (compact, side by side) -->
        ${divisions.length > 0 ? `
            <h3 class="text-lg font-bold text-gray-800 mb-4">Standings</h3>
            <div class="grid gap-4 ${divisions.length === 1 ? '' : 'md:grid-cols-2'} mb-8">
                ${divisions.map(d => `
                    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-4 py-2.5 flex items-center justify-between">
                            <span class="font-semibold text-sm">${d.name}</span>
                            <button onclick="switchTab('division_${d.index}')" class="text-xs text-indigo-200 hover:text-white transition-colors">
                                View all &rarr;
                            </button>
                        </div>
                        <div class="p-3">
                            ${renderStandingsTable(seasonNum, d.index, true)}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : `
            <div class="text-center py-8 text-gray-400 mb-8">
                <p>No divisions configured yet.</p>
            </div>
        `}

        <!-- Two-column: Upcoming + Recent -->
        <div class="grid gap-6 md:grid-cols-2">
            <!-- Upcoming Fixtures -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 class="font-semibold text-gray-800 text-sm">Upcoming Fixtures</h3>
                    <button onclick="switchTab('fixtures')" class="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
                        View all &rarr;
                    </button>
                </div>
                <div class="p-3">
                    ${upcoming.length === 0 ? `
                        <p class="text-sm text-gray-400 text-center py-6">No upcoming fixtures</p>
                    ` : `
                        <div class="space-y-2">
                            ${upcoming.map((m, i) => renderMatchCardCompact(m, m.weekNumber)).join('')}
                        </div>
                    `}
                </div>
            </div>

            <!-- Recent Results -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 class="font-semibold text-gray-800 text-sm">Recent Results</h3>
                    <button onclick="switchTab('fixtures')" class="text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
                        View all &rarr;
                    </button>
                </div>
                <div class="p-3">
                    ${recent.length === 0 ? `
                        <p class="text-sm text-gray-400 text-center py-6">No results yet</p>
                    ` : `
                        <div class="space-y-2">
                            ${recent.map((m, i) => renderMatchCardCompact(m, m.weekNumber)).join('')}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

// ===== DIVISION TAB =====

function renderDivision(divisionIndex) {
    const division = (state.divisions || []).find(d => d.index === divisionIndex);
    const divisionName = division ? division.name : ('Division ' + (divisionIndex + 1));
    const seasonNum = state.getActiveSeason();
    const weekNumbers = state.getWeekNumbers(seasonNum);
    const fixtures = state.getFixturesForDivision(seasonNum, divisionIndex);

    // Group fixtures by week
    const fixturesByWeek = {};
    fixtures.forEach(m => {
        const wk = m.weekNumber;
        if (!fixturesByWeek[wk]) fixturesByWeek[wk] = [];
        fixturesByWeek[wk].push(m);
    });

    return `
        <div class="mb-6">
            <h2 class="text-xl font-bold text-gray-800">${divisionName}</h2>
            <p class="text-sm text-gray-500">Season ${seasonNum}</p>
        </div>

        <!-- Full Standings -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-4 py-3">
                <span class="font-semibold">Standings</span>
            </div>
            <div class="p-4">
                ${renderStandingsTable(seasonNum, divisionIndex, false)}
            </div>
        </div>

        <!-- Division Fixtures grouped by week -->
        <h3 class="text-lg font-bold text-gray-800 mb-4">Fixtures</h3>
        ${Object.keys(fixturesByWeek).length === 0 ? `
            <div class="text-center py-8 text-gray-400">
                <p>No fixtures scheduled for this division.</p>
            </div>
        ` : `
            <div class="space-y-6">
                ${Object.keys(fixturesByWeek).sort((a, b) => Number(a) - Number(b)).map(wk => `
                    <div>
                        <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Week ${Number(wk) + 1}</h4>
                        <div class="grid gap-3 md:grid-cols-2">
                            ${fixturesByWeek[wk].map((m, idx) => renderMatchCard(m, Number(wk), m.matchIndex)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `}
    `;
}

// ===== FIXTURES TAB =====

function renderFixtures() {
    const seasonNum = state.getActiveSeason();
    const weekNumbers = state.getWeekNumbers(seasonNum);
    const divisions = state.divisions || [];
    const selectedWeek = state.selectedWeek || 'all';
    const selectedDiv = state.selectedDivision;

    // Gather fixtures
    let allFixtures = [];
    const weekRange = selectedWeek === 'all' ? weekNumbers : [Number(selectedWeek)];

    weekRange.forEach(wk => {
        const weekFixtures = state.getFixturesForWeek(seasonNum, wk);
        weekFixtures.forEach((m, idx) => {
            allFixtures.push({ ...m, weekNumber: wk, matchIndex: idx });
        });
    });

    // Filter by division if selected
    if (selectedDiv !== null && selectedDiv !== undefined && selectedDiv !== 'all') {
        allFixtures = allFixtures.filter(m => m.division === Number(selectedDiv));
    }

    // Group by week for display
    const grouped = {};
    allFixtures.forEach(m => {
        const wk = m.weekNumber;
        if (!grouped[wk]) grouped[wk] = [];
        grouped[wk].push(m);
    });

    return `
        <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 class="text-xl font-bold text-gray-800">Fixtures</h2>
            <span class="text-sm text-gray-500">Season ${seasonNum}</span>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-3 mb-6">
            <!-- Week selector -->
            <select onchange="setFixtureWeek(this.value)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:outline-none bg-white">
                <option value="all" ${selectedWeek === 'all' ? 'selected' : ''}>All Weeks</option>
                ${weekNumbers.map(wk => `
                    <option value="${wk}" ${String(selectedWeek) === String(wk) ? 'selected' : ''}>Week ${wk + 1}</option>
                `).join('')}
            </select>

            <!-- Division selector -->
            <select onchange="setFixtureDivision(this.value)" class="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 focus:outline-none bg-white">
                <option value="all" ${selectedDiv === null || selectedDiv === undefined || selectedDiv === 'all' ? 'selected' : ''}>All Divisions</option>
                ${divisions.map(d => `
                    <option value="${d.index}" ${String(selectedDiv) === String(d.index) ? 'selected' : ''}>${d.name}</option>
                `).join('')}
            </select>
        </div>

        <!-- Match Cards -->
        ${Object.keys(grouped).length === 0 ? `
            <div class="text-center py-12">
                <p class="text-gray-400 mb-2">No fixtures found</p>
                <p class="text-sm text-gray-300">Try adjusting the filters above.</p>
            </div>
        ` : `
            <div class="space-y-6">
                ${Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(wk => `
                    <div>
                        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Week ${Number(wk) + 1}</h3>
                        <div class="grid gap-3 md:grid-cols-2">
                            ${grouped[wk].map(m => renderMatchCard(m, Number(wk), m.matchIndex)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `}
    `;
}

// Fixture filter handlers (update state and re-render)
function setFixtureWeek(value) {
    state.selectedWeek = value;
    renderLeague();
}

function setFixtureDivision(value) {
    state.selectedDivision = value === 'all' ? null : Number(value);
    renderLeague();
}

// ===== TEAMS TAB =====

function renderTeams() {
    const divisions = state.divisions || [];
    const teams = state.teams || {};
    const isOrganiser = state.isOrganiser;

    // Group teams by division
    const teamsByDiv = {};
    divisions.forEach(d => { teamsByDiv[d.index] = []; });

    for (const teamId in teams) {
        const team = teams[teamId];
        const divIdx = team.division;
        if (!teamsByDiv[divIdx]) teamsByDiv[divIdx] = [];
        teamsByDiv[divIdx].push({ teamId, ...team });
    }

    // Count total
    const totalTeams = Object.keys(teams).length;

    return `
        <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 class="text-xl font-bold text-gray-800">Teams</h2>
            <span class="text-sm text-gray-500">${totalTeams} team${totalTeams !== 1 ? 's' : ''}</span>
        </div>

        ${divisions.length === 0 ? `
            <div class="text-center py-12 text-gray-400">
                <p>No divisions set up yet.</p>
            </div>
        ` : `
            <div class="space-y-6">
                ${divisions.map(d => {
                    const divTeams = teamsByDiv[d.index] || [];
                    return `
                        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-4 py-2.5">
                                <span class="font-semibold text-sm">${d.name}</span>
                                <span class="text-indigo-200 text-xs ml-2">(${divTeams.length} team${divTeams.length !== 1 ? 's' : ''})</span>
                            </div>
                            <div class="p-4">
                                ${divTeams.length === 0 ? `
                                    <p class="text-sm text-gray-400 text-center py-4">No teams in this division</p>
                                ` : `
                                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        ${divTeams.map(t => renderTeamCard(t, isOrganiser)).join('')}
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `}
    `;
}

function renderTeamCard(team, isOrganiser) {
    const combinedRating = (team.player1Rating && team.player2Rating)
        ? ((Number(team.player1Rating) + Number(team.player2Rating)).toFixed(1))
        : null;

    return `
        <div class="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
            <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-800">${team.name || ('Team ' + team.teamId)}</span>
                ${isOrganiser ? `
                    <button onclick="editTeam('${team.teamId}')" class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit team">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
            <div class="text-sm text-gray-600">
                <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span>
                    ${team.player1Name || 'Player 1'}
                    ${team.player1Rating ? `<span class="text-xs text-gray-400">(${team.player1Rating})</span>` : ''}
                </div>
                <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span>
                    ${team.player2Name || 'Player 2'}
                    ${team.player2Rating ? `<span class="text-xs text-gray-400">(${team.player2Rating})</span>` : ''}
                </div>
            </div>
            ${combinedRating ? `
                <div class="text-xs text-gray-400 mt-1">Combined rating: ${combinedRating}</div>
            ` : ''}
        </div>
    `;
}

// ===== SETTINGS TAB =====

function renderSettings() {
    if (!state.isOrganiser) {
        return `
            <div class="text-center py-12">
                <p class="text-gray-500 mb-4">Organiser access required to edit settings.</p>
                <button onclick="showOrganiserLoginModal()" class="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">
                    Login as Organiser
                </button>
            </div>
        `;
    }

    const settings = state.settings || {};
    const seasonNum = state.getActiveSeason();
    const seasonComplete = state.isSeasonComplete(seasonNum);
    const progress = state.getSeasonProgress(seasonNum);
    const divisions = state.divisions || [];

    return `
        <h2 class="text-xl font-bold text-gray-800 mb-6">League Settings</h2>

        <div class="space-y-6">

            <!-- League Info -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">League Info</h3>
                <div class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">League Name</label>
                        <input type="text" id="settings-league-name" value="${state.leagueName || ''}"
                            onchange="updateLeagueSetting('name', this.value)"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Venue</label>
                        <input type="text" id="settings-venue" value="${settings.venue || ''}"
                            onchange="updateLeagueSetting('venue', this.value)"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                            placeholder="e.g. Stretford Sports Centre" />
                    </div>
                </div>
            </div>

            <!-- Match Settings -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Match Settings</h3>
                <div class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-2">Sets Per Match</label>
                        <div class="flex gap-2">
                            ${[1, 3, 5].map(val => `
                                <button onclick="updateLeagueSetting('setsPerMatch', ${val})"
                                    class="px-4 py-2 rounded-lg font-medium text-sm border-2 transition-colors
                                        ${settings.setsPerMatch === val
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'}">
                                    Best of ${val}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-2">Games Per Set</label>
                        <div class="flex gap-2">
                            ${CONFIG.GAMES_PER_SET_OPTIONS.map(val => `
                                <button onclick="updateLeagueSetting('gamesPerSet', ${val})"
                                    class="px-4 py-2 rounded-lg font-medium text-sm border-2 transition-colors
                                        ${settings.gamesPerSet === val
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'}">
                                    ${val} games
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Schedule Settings -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Schedule</h3>
                <div class="grid gap-4 md:grid-cols-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Match Day</label>
                        <select id="settings-match-day" onchange="updateLeagueSetting('matchDay', this.value)"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none bg-white">
                            ${CONFIG.MATCH_DAY_OPTIONS.map(day => `
                                <option value="${day}" ${settings.matchDay === day ? 'selected' : ''}>${day}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Match Time</label>
                        <input type="time" id="settings-match-time" value="${settings.matchTime || '19:00'}"
                            onchange="updateLeagueSetting('matchTime', this.value)"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Courts</label>
                        <input type="number" id="settings-courts" value="${settings.courts || 2}" min="1" max="10"
                            onchange="updateLeagueSetting('courts', parseInt(this.value))"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none" />
                    </div>
                </div>
            </div>

            <!-- Promotion / Relegation Settings -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Promotion &amp; Relegation</h3>
                <div class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Promotion spots</label>
                        <input type="number" id="settings-promo-count" value="${settings.promotionCount || 2}" min="0" max="5"
                            onchange="updateLeagueSetting('promotionCount', parseInt(this.value))"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none" />
                        <p class="text-xs text-gray-400 mt-1">Teams promoted from each lower division</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Relegation spots</label>
                        <input type="number" id="settings-releg-count" value="${settings.relegationCount || 2}" min="0" max="5"
                            onchange="updateLeagueSetting('relegationCount', parseInt(this.value))"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none" />
                        <p class="text-xs text-gray-400 mt-1">Teams relegated from each upper division</p>
                    </div>
                </div>
            </div>

            <!-- Season Management -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Season Management</h3>

                <div class="flex items-center gap-3 mb-4">
                    <span class="text-sm text-gray-600">Current Season: <strong>${seasonNum}</strong></span>
                    <span class="text-sm text-gray-400">&middot;</span>
                    <span class="text-sm text-gray-600">${progress.completed} / ${progress.total} matches played</span>
                </div>

                ${seasonComplete && progress.total > 0 ? `
                    <!-- Promotion / Relegation Preview -->
                    <div class="bg-indigo-50 rounded-xl p-4 mb-4">
                        <h4 class="font-semibold text-indigo-800 mb-3">Promotion / Relegation Preview</h4>
                        ${divisions.map(d => {
                            const promoIds = state.getPromotionZone(seasonNum, d.index);
                            const relegIds = state.getRelegationZone(seasonNum, d.index);
                            if (promoIds.length === 0 && relegIds.length === 0) return '';
                            return `
                                <div class="mb-2">
                                    <span class="text-sm font-medium text-gray-700">${d.name}:</span>
                                    ${promoIds.length > 0 ? `
                                        <span class="ml-2 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                            Promoted: ${promoIds.map(id => { const t = state.getTeam(id); return t ? t.name : id; }).join(', ')}
                                        </span>
                                    ` : ''}
                                    ${relegIds.length > 0 ? `
                                        <span class="ml-2 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                            Relegated: ${relegIds.map(id => { const t = state.getTeam(id); return t ? t.name : id; }).join(', ')}
                                        </span>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div class="flex flex-wrap gap-3">
                        <button onclick="endSeason()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
                            End Season ${seasonNum}
                        </button>
                        <button onclick="startNewSeason()" class="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors">
                            Start Season ${seasonNum + 1}
                        </button>
                    </div>
                ` : `
                    <p class="text-sm text-gray-400">
                        ${progress.total === 0
                            ? 'Generate fixtures to start the season.'
                            : 'All matches must be completed before the season can be ended.'}
                    </p>
                `}
            </div>

            <!-- Share Links -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Share</h3>
                ${renderShareLinks()}
            </div>
        </div>
    `;
}

function renderShareLinks() {
    const playerLink = Router.getPlayerLink(state.leagueId);
    const organiserLink = state.organiserKey
        ? Router.getOrganiserLink(state.leagueId, state.organiserKey)
        : '';

    return `
        <div class="space-y-4">
            <!-- Player link -->
            <div class="bg-gray-50 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-gray-700">Player Link</span>
                    <button onclick="copyToClipboard('${playerLink}'); showToast('Link copied!')"
                        class="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-lg font-medium transition-colors">
                        Copy
                    </button>
                </div>
                <div class="text-xs text-gray-600 font-mono break-all bg-white p-2 rounded-lg">${playerLink}</div>
            </div>

            ${organiserLink ? `
                <div class="bg-amber-50 rounded-xl p-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-semibold text-amber-800">Organiser Link</span>
                        <button onclick="copyToClipboard('${organiserLink}'); showToast('Organiser link copied!')"
                            class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors">
                            Copy
                        </button>
                    </div>
                    <div class="text-xs text-amber-700 font-mono break-all bg-white p-2 rounded-lg">${organiserLink}</div>
                    <p class="text-xs text-amber-600 mt-2">Keep this private - it grants edit access.</p>
                </div>
            ` : ''}
        </div>
    `;
}

// ===== STANDINGS TABLE (REUSABLE) =====

/**
 * renderStandingsTable(seasonNumber, divisionIndex, compact)
 *
 * compact = true  -> top 5 rows, fewer columns (Pos, Team, P, W, D, L, Pts)
 * compact = false -> all rows, full columns (Pos, Team, P, W, D, L, Sets+/-, Games+/-, Pts)
 *
 * Promotion zone rows highlighted green, relegation zone rows red.
 */
function renderStandingsTable(seasonNumber, divisionIndex, compact) {
    const standings = state.getStandings(seasonNumber, divisionIndex);

    if (!standings || standings.length === 0) {
        return `<p class="text-sm text-gray-400 text-center py-4">No standings data yet</p>`;
    }

    const promoZone = state.getPromotionZone(seasonNumber, divisionIndex);
    const relegZone = state.getRelegationZone(seasonNumber, divisionIndex);

    const rows = compact ? standings.slice(0, 5) : standings;
    const hasMore = compact && standings.length > 5;

    return `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                        <th class="text-center py-2 px-1 w-8">#</th>
                        <th class="text-left py-2 px-2">Team</th>
                        <th class="text-center py-2 px-1">P</th>
                        <th class="text-center py-2 px-1">W</th>
                        <th class="text-center py-2 px-1">D</th>
                        <th class="text-center py-2 px-1">L</th>
                        ${!compact ? `
                            <th class="text-center py-2 px-1">S+</th>
                            <th class="text-center py-2 px-1">S-</th>
                            <th class="text-center py-2 px-1">SD</th>
                            <th class="text-center py-2 px-1">G+</th>
                            <th class="text-center py-2 px-1">G-</th>
                            <th class="text-center py-2 px-1">GD</th>
                        ` : ''}
                        <th class="text-center py-2 px-1 font-bold">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((row, idx) => {
                        const pos = idx + 1;
                        const isPromo = promoZone.includes(row.teamId);
                        const isReleg = relegZone.includes(row.teamId);

                        let rowBg = '';
                        let borderLeft = '';
                        if (isPromo) {
                            rowBg = 'bg-green-50';
                            borderLeft = 'border-l-3 border-l-green-500';
                        } else if (isReleg) {
                            rowBg = 'bg-red-50';
                            borderLeft = 'border-l-3 border-l-red-500';
                        }

                        const team = state.getTeam(row.teamId);
                        const teamName = team ? team.name : row.teamName;
                        const players = team ? (team.player1Name + ' & ' + team.player2Name) : '';

                        return `
                            <tr class="${rowBg} ${borderLeft} border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                <td class="text-center py-2 px-1 font-semibold text-gray-500">${pos}</td>
                                <td class="py-2 px-2">
                                    <div class="font-medium text-gray-800 leading-tight">${teamName}</div>
                                    ${!compact && players ? `<div class="text-xs text-gray-400">${players}</div>` : ''}
                                </td>
                                <td class="text-center py-2 px-1 text-gray-600">${row.played}</td>
                                <td class="text-center py-2 px-1 text-gray-600">${row.wins}</td>
                                <td class="text-center py-2 px-1 text-gray-600">${row.draws}</td>
                                <td class="text-center py-2 px-1 text-gray-600">${row.losses}</td>
                                ${!compact ? `
                                    <td class="text-center py-2 px-1 text-gray-600">${row.setsFor}</td>
                                    <td class="text-center py-2 px-1 text-gray-600">${row.setsAgainst}</td>
                                    <td class="text-center py-2 px-1 font-medium ${row.setDiff > 0 ? 'text-green-600' : row.setDiff < 0 ? 'text-red-600' : 'text-gray-500'}">
                                        ${row.setDiff > 0 ? '+' : ''}${row.setDiff}
                                    </td>
                                    <td class="text-center py-2 px-1 text-gray-600">${row.gamesFor}</td>
                                    <td class="text-center py-2 px-1 text-gray-600">${row.gamesAgainst}</td>
                                    <td class="text-center py-2 px-1 font-medium ${row.gameDiff > 0 ? 'text-green-600' : row.gameDiff < 0 ? 'text-red-600' : 'text-gray-500'}">
                                        ${row.gameDiff > 0 ? '+' : ''}${row.gameDiff}
                                    </td>
                                ` : ''}
                                <td class="text-center py-2 px-1 font-bold ${isPromo ? 'text-green-700' : isReleg ? 'text-red-700' : 'text-indigo-700'}">
                                    ${row.points}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        ${hasMore ? `
            <p class="text-xs text-center text-gray-400 mt-2">${standings.length - 5} more team${standings.length - 5 !== 1 ? 's' : ''}...</p>
        ` : ''}

        ${!compact && (promoZone.length > 0 || relegZone.length > 0) ? `
            <div class="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                ${promoZone.length > 0 ? `
                    <div class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded-sm bg-green-500 inline-block"></span>
                        Promotion zone
                    </div>
                ` : ''}
                ${relegZone.length > 0 ? `
                    <div class="flex items-center gap-1.5">
                        <span class="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>
                        Relegation zone
                    </div>
                ` : ''}
            </div>
        ` : ''}
    `;
}

// ===== MATCH CARD =====

/**
 * renderMatchCard(match, weekNumber, matchIndex)
 *
 * Full match card showing team names, date/time, court, score, status.
 * Organiser sees "Enter Score" button on unplayed matches.
 */
function renderMatchCard(match, weekNumber, matchIndex) {
    const team1 = state.getTeam(match.team1Id);
    const team2 = state.getTeam(match.team2Id);
    const team1Name = team1 ? team1.name : ('Team ' + match.team1Id);
    const team2Name = team2 ? team2.name : ('Team ' + match.team2Id);
    const isComplete = state.isMatchComplete(match);
    const winnerId = isComplete ? state.getMatchWinner(match) : null;
    const isOrganiser = state.isOrganiser;

    // Division label
    const divObj = (state.divisions || []).find(d => d.index === match.division);
    const divLabel = divObj ? divObj.name : '';

    // Status badge
    const status = match.status || CONFIG.MATCH_STATUS.SCHEDULED;
    const statusConfig = {
        scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' },
        completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
        postponed: { label: 'Postponed', cls: 'bg-yellow-100 text-yellow-700' },
        cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' }
    };
    const sBadge = statusConfig[status] || statusConfig.scheduled;

    // Score display
    const scoreStr = isComplete ? renderScoreDisplay(match.score) : '';
    const setScore = isComplete ? state.getSetScore(match) : null;

    return `
        <div class="bg-white rounded-xl border ${isComplete ? 'border-gray-200' : 'border-gray-100'} shadow-sm overflow-hidden">
            <!-- Card header -->
            <div class="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                <div class="flex items-center gap-2">
                    ${divLabel ? `<span class="text-xs font-medium text-indigo-600">${divLabel}</span>` : ''}
                    ${match.court ? `<span class="text-xs text-gray-400">${match.court}</span>` : ''}
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sBadge.cls}">
                    ${sBadge.label}
                </span>
            </div>

            <!-- Teams + Score -->
            <div class="px-3 py-3">
                <div class="flex items-center justify-between gap-2">
                    <!-- Team 1 -->
                    <div class="flex-1 min-w-0 ${winnerId === match.team1Id ? 'font-bold' : ''}">
                        <div class="text-sm ${winnerId === match.team1Id ? 'text-indigo-700' : 'text-gray-800'} truncate">${team1Name}</div>
                        ${team1 ? `<div class="text-xs text-gray-400 truncate">${team1.player1Name} & ${team1.player2Name}</div>` : ''}
                    </div>

                    <!-- Score / VS -->
                    <div class="flex-shrink-0 text-center px-2">
                        ${isComplete && setScore ? `
                            <div class="text-lg font-bold ${winnerId === match.team1Id ? 'text-indigo-700' : winnerId === match.team2Id ? 'text-indigo-700' : 'text-gray-800'}">
                                ${setScore.team1Sets} - ${setScore.team2Sets}
                            </div>
                            <div class="text-xs text-gray-400">${scoreStr}</div>
                        ` : `
                            <span class="text-xs font-semibold text-gray-400">VS</span>
                        `}
                    </div>

                    <!-- Team 2 -->
                    <div class="flex-1 min-w-0 text-right ${winnerId === match.team2Id ? 'font-bold' : ''}">
                        <div class="text-sm ${winnerId === match.team2Id ? 'text-indigo-700' : 'text-gray-800'} truncate">${team2Name}</div>
                        ${team2 ? `<div class="text-xs text-gray-400 truncate">${team2.player1Name} & ${team2.player2Name}</div>` : ''}
                    </div>
                </div>
            </div>

            <!-- Footer: date/time + enter score -->
            <div class="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-100">
                <div class="text-xs text-gray-400">
                    ${match.date ? formatMatchDate(match.date) : ''}
                    ${match.time ? (' at ' + match.time) : ''}
                </div>
                ${isOrganiser && !isComplete && status !== CONFIG.MATCH_STATUS.CANCELLED ? `
                    <button onclick="showScoreModal(${weekNumber}, ${matchIndex}, ${JSON.stringify(match).replace(/"/g, '&quot;')})"
                        class="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-lg font-medium transition-colors">
                        Enter Score
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * renderMatchCardCompact(match, weekNumber)
 *
 * Slim match row for the overview tab (upcoming/recent lists).
 */
function renderMatchCardCompact(match, weekNumber) {
    const team1 = state.getTeam(match.team1Id);
    const team2 = state.getTeam(match.team2Id);
    const team1Name = team1 ? team1.name : ('Team ' + match.team1Id);
    const team2Name = team2 ? team2.name : ('Team ' + match.team2Id);
    const isComplete = state.isMatchComplete(match);
    const winnerId = isComplete ? state.getMatchWinner(match) : null;
    const setScore = isComplete ? state.getSetScore(match) : null;

    // Division label
    const divObj = (state.divisions || []).find(d => d.index === match.division);
    const divLabel = divObj ? divObj.name : '';

    return `
        <div class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors ${isComplete ? 'border border-gray-100' : 'border border-gray-50'}">
            <!-- Division badge -->
            ${divLabel ? `<span class="hidden sm:inline-flex text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">${divLabel}</span>` : ''}

            <!-- Team 1 -->
            <span class="flex-1 text-sm text-right truncate ${winnerId === match.team1Id ? 'font-semibold text-indigo-700' : 'text-gray-700'}">${team1Name}</span>

            <!-- Score / VS -->
            <span class="flex-shrink-0 text-xs font-bold px-2 ${isComplete ? 'text-gray-800' : 'text-gray-400'}">
                ${isComplete && setScore
                    ? (setScore.team1Sets + ' - ' + setScore.team2Sets)
                    : 'vs'}
            </span>

            <!-- Team 2 -->
            <span class="flex-1 text-sm truncate ${winnerId === match.team2Id ? 'font-semibold text-indigo-700' : 'text-gray-700'}">${team2Name}</span>

            <!-- Date -->
            <span class="hidden sm:inline text-xs text-gray-400 flex-shrink-0">
                ${match.date ? formatMatchDate(match.date) : (match.time || '')}
            </span>
        </div>
    `;
}

// ===== SCORE DISPLAY =====

/**
 * renderScoreDisplay(score)
 *
 * Formats a score object { sets: [[6,4], [3,6], [6,2]], winner: 1 }
 * into a readable string like "6-4, 3-6, 6-2".
 */
function renderScoreDisplay(score) {
    if (!score || !score.sets || !Array.isArray(score.sets)) return '';

    return score.sets
        .filter(s => Array.isArray(s) && s.length >= 2)
        .map(s => s[0] + '-' + s[1])
        .join(', ');
}

// ===== HELPER FUNCTIONS =====

/**
 * Format a date string (YYYY-MM-DD) into a short readable format.
 */
function formatMatchDate(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return dayNames[d.getDay()] + ' ' + d.getDate() + ' ' + monthNames[d.getMonth()];
    } catch (e) {
        return dateStr;
    }
}

/**
 * Utility: copy text to clipboard.
 * Defined here as a fallback; may already exist globally.
 */
if (typeof copyToClipboard === 'undefined') {
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    }
}

/**
 * Utility: show a brief toast notification.
 * Defined here as a fallback; may already exist globally.
 */
if (typeof showToast === 'undefined') {
    function showToast(message) {
        const existing = document.getElementById('toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg z-50 transition-opacity duration-300';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// ===== COMPATIBILITY =====
// render() is the global entry point called by state.js / main.js after Firebase loads.

function render() {
    renderLeague();
}

console.log('League Components loaded');
