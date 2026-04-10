/**
 * TV / Spectator Mode
 *
 * Full-screen leaderboard + live matches view for wall-mounted screens.
 * Include this script on any format page and call TVMode.init(adapterFn).
 */

const TVMode = {
    isActive: false,
    getDataFn: null,

    // localStorage key for the "tables only" preference. Shared across all
    // formats — toggling it on Team League also affects Americano, Mexicano, etc.
    _TABLES_ONLY_KEY: 'tvMode_tablesOnly',

    init(getDataFn) {
        this.isActive = true;
        this.getDataFn = getDataFn;
        this.render();
    },

    _isTablesOnly() {
        try { return localStorage.getItem(this._TABLES_ONLY_KEY) === 'true'; }
        catch (e) { return false; }
    },

    toggleTablesOnly() {
        const next = !this._isTablesOnly();
        try { localStorage.setItem(this._TABLES_ONLY_KEY, next ? 'true' : 'false'); }
        catch (e) { /* ignore — Safari private mode, etc. */ }
        this.render();
    },

    render() {
        if (!this.isActive || !this.getDataFn) return;

        // Hide shared nav
        const nav = document.getElementById('shared-nav');
        const spacer = document.getElementById('shared-nav-spacer');
        if (nav) nav.style.display = 'none';
        if (spacer) spacer.style.display = 'none';

        const data = this.getDataFn();
        if (!data) {
            document.getElementById('app').innerHTML = this._renderLoading();
            return;
        }

        const accentMap = {
            blue: { bg: 'from-blue-600 to-blue-800', text: 'text-blue-400', ring: 'ring-blue-500/30', row: 'bg-blue-500/10', badge: 'bg-blue-500' },
            teal: { bg: 'from-teal-600 to-emerald-800', text: 'text-teal-400', ring: 'ring-teal-500/30', row: 'bg-teal-500/10', badge: 'bg-teal-500' },
            purple: { bg: 'from-purple-600 to-pink-800', text: 'text-purple-400', ring: 'ring-purple-500/30', row: 'bg-purple-500/10', badge: 'bg-purple-500' },
            rose: { bg: 'from-rose-600 to-pink-800', text: 'text-rose-400', ring: 'ring-rose-500/30', row: 'bg-rose-500/10', badge: 'bg-rose-500' },
            emerald: { bg: 'from-emerald-600 to-green-800', text: 'text-emerald-400', ring: 'ring-emerald-500/30', row: 'bg-emerald-500/10', badge: 'bg-emerald-500' },
            amber: { bg: 'from-amber-600 to-yellow-800', text: 'text-amber-400', ring: 'ring-amber-500/30', row: 'bg-amber-500/10', badge: 'bg-amber-500' },
            orange: { bg: 'from-orange-600 to-red-800', text: 'text-orange-400', ring: 'ring-orange-500/30', row: 'bg-orange-500/10', badge: 'bg-orange-500' },
            indigo: { bg: 'from-indigo-600 to-purple-800', text: 'text-indigo-400', ring: 'ring-indigo-500/30', row: 'bg-indigo-500/10', badge: 'bg-indigo-500' }
        };
        const accent = accentMap[data.accentColor] || accentMap.blue;

        const hasMatches = data.currentMatches && data.currentMatches.length > 0;
        const liveCount = hasMatches ? data.currentMatches.filter(m => m.isLive).length : 0;
        const tablesOnly = this._isTablesOnly();
        // When tables-only is on, the fixtures panel is removed and standings
        // take the full width. showMatches is the effective "render the right
        // side?" flag — it still respects tablesOnly even if there are matches.
        const showMatches = hasMatches && !tablesOnly;

        document.getElementById('app').innerHTML = `
            <style>
                @keyframes tv-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                .tv-live-dot { animation: tv-pulse 1.5s ease-in-out infinite; }
                .tv-body { font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif; }
                .tv-row:nth-child(even) { background: rgba(255,255,255,0.03); }
                .tv-row:nth-child(odd) { background: transparent; }
            </style>
            <div class="tv-body fixed inset-0 bg-gray-950 text-white flex flex-col overflow-hidden">
                <!-- Header -->
                <div class="bg-gradient-to-r ${accent.bg} px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div class="flex items-center gap-4 min-w-0">
                        <span class="text-3xl flex-shrink-0">${data.formatEmoji || ''}</span>
                        <div class="min-w-0">
                            <h1 class="text-2xl md:text-3xl font-bold truncate">${data.tournamentName || 'Tournament'}</h1>
                            <span class="text-white/60 text-sm">${data.formatName || ''}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 flex-shrink-0">
                        <span class="font-mono text-xl font-bold tracking-widest bg-white/20 px-4 py-2 rounded-xl">${(data.tournamentId || '').toUpperCase()}</span>
                        ${liveCount > 0 ? `
                            <div class="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                                <span class="tv-live-dot w-3 h-3 bg-green-400 rounded-full inline-block"></span>
                                <span class="font-semibold text-sm">LIVE</span>
                            </div>
                        ` : `
                            <div class="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                                <span class="w-3 h-3 bg-gray-500 rounded-full inline-block"></span>
                                <span class="font-semibold text-sm text-gray-400">IDLE</span>
                            </div>
                        `}
                        <button onclick="TVMode.toggleTablesOnly()" class="${tablesOnly ? 'bg-white text-gray-900 hover:bg-white/90' : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'} h-10 px-3 rounded-xl flex items-center gap-2 transition-colors text-sm font-semibold" title="${tablesOnly ? 'Show fixtures panel again' : 'Show standings tables only (hide fixtures)'}">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18M3 18h18M3 6h18"/>
                            </svg>
                            <span class="hidden md:inline">${tablesOnly ? 'Show All' : 'Tables Only'}</span>
                        </button>
                        <button onclick="TVMode.exit()" class="bg-white/10 hover:bg-white/20 text-white/60 hover:text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors" title="Exit TV Mode">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div class="flex-1 flex ${showMatches ? 'flex-col lg:flex-row' : ''} overflow-hidden">
                    <!-- Standings -->
                    <div class="${showMatches ? 'lg:w-[45%] w-full' : 'w-full'} overflow-y-auto p-4 md:p-6">
                        ${this._renderStandings(data, accent, { grid: tablesOnly })}
                    </div>
                    ${showMatches ? `
                        <!-- Matches -->
                        <div class="lg:w-[55%] w-full overflow-y-auto p-4 md:p-6 lg:border-l border-t lg:border-t-0 border-white/10">
                            ${this._renderMatches(data, accent)}
                        </div>
                    ` : ''}
                </div>

                <!-- Footer -->
                <div class="flex-shrink-0 px-6 py-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-600">
                    <span>Uber Padel</span>
                    <span>uberpadel.com</span>
                </div>
            </div>
        `;
    },

    _renderLoading() {
        return `
            <div class="fixed inset-0 bg-gray-950 flex items-center justify-center">
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto rounded-full border-4 border-gray-800 border-t-blue-500 animate-spin mb-4"></div>
                    <p class="text-gray-400 text-lg">Loading TV Mode...</p>
                </div>
            </div>
        `;
    },

    _renderStandings(data, accent, options) {
        const opts = options || {};
        const gridMode = !!opts.grid;
        const groups = data.standingsGroups || [{ groupName: null, standings: data.standings || [] }];
        if (groups.length === 0 || (groups.length === 1 && (!groups[0].standings || groups[0].standings.length === 0))) {
            return `<div class="flex items-center justify-center h-full text-gray-500 text-2xl">No standings yet</div>`;
        }

        // In grid mode, drop per-table margin-bottom (grid `gap-*` handles spacing).
        const tableBottomMargin = gridMode ? '' : 'mb-6';

        const groupHtmls = groups.map(group => {
            const standings = group.standings || [];
            if (standings.length === 0) return '';

            // Determine which columns to show
            const hasWins = standings.some(s => s.wins != null);
            const hasLosses = standings.some(s => s.losses != null);
            const hasPD = standings.some(s => s.pointsDiff != null);
            const hasExtra = standings.some(s => s.extraColumns && s.extraColumns.length > 0);

            const tableHtml = `
                ${group.groupName ? `<h2 class="text-lg font-bold ${accent.text} mb-3 uppercase tracking-wider">Group ${group.groupName}</h2>` : ''}
                <table class="w-full text-left ${tableBottomMargin}">
                    <thead>
                        <tr class="text-gray-500 text-sm uppercase tracking-wider border-b border-white/10">
                            <th class="py-3 px-2 w-10">#</th>
                            <th class="py-3 px-2">Name</th>
                            <th class="py-3 px-2 text-center w-14">P</th>
                            ${hasWins ? '<th class="py-3 px-2 text-center w-14">W</th>' : ''}
                            ${hasLosses ? '<th class="py-3 px-2 text-center w-14">L</th>' : ''}
                            ${hasPD ? '<th class="py-3 px-2 text-center w-16">PD</th>' : ''}
                            ${hasExtra ? standings[0].extraColumns.map(c => `<th class="py-3 px-2 text-center w-16">${c.label}</th>`).join('') : ''}
                            <th class="py-3 px-2 text-right w-20">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map((s, i) => {
                            const isTop3 = i < 3;
                            const medals = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
                            const rankClass = isTop3 ? medals[i] : 'text-gray-500';
                            const rowHighlight = isTop3 ? accent.row : '';
                            const pdStr = s.pointsDiff != null ? (s.pointsDiff > 0 ? `+${s.pointsDiff}` : `${s.pointsDiff}`) : '';
                            const pdColor = s.pointsDiff > 0 ? 'text-green-400' : s.pointsDiff < 0 ? 'text-red-400' : 'text-gray-500';
                            return `
                                <tr class="tv-row ${rowHighlight} border-b border-white/5">
                                    <td class="py-3 px-2 font-bold text-lg ${rankClass}">${s.rank}</td>
                                    <td class="py-3 px-2">
                                        <span class="font-semibold text-lg">${s.name}</span>
                                        ${s.subtitle ? `<span class="text-gray-500 text-sm ml-2">${s.subtitle}</span>` : ''}
                                    </td>
                                    <td class="py-3 px-2 text-center text-gray-400">${s.played}</td>
                                    ${hasWins ? `<td class="py-3 px-2 text-center text-green-400">${s.wins ?? ''}</td>` : ''}
                                    ${hasLosses ? `<td class="py-3 px-2 text-center text-red-400">${s.losses ?? ''}</td>` : ''}
                                    ${hasPD ? `<td class="py-3 px-2 text-center ${pdColor}">${pdStr}</td>` : ''}
                                    ${hasExtra ? (s.extraColumns || []).map(c => `<td class="py-3 px-2 text-center text-gray-400">${c.value}</td>`).join('') : ''}
                                    <td class="py-3 px-2 text-right font-bold text-xl ${accent.text}">${s.points}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;

            // Wrap each group in its own block so it becomes a grid cell.
            return gridMode ? `<div>${tableHtml}</div>` : tableHtml;
        }).filter(Boolean);

        // Responsive grid when tables-only mode is on AND there's more than
        // one non-empty group. 2 groups → 2 cols, 3–4 → 2 cols, 5–9 → up to 3.
        if (gridMode && groupHtmls.length > 1) {
            const n = groupHtmls.length;
            let cols = 'grid-cols-1';
            if (n === 2)       cols = 'grid-cols-1 md:grid-cols-2';
            else if (n <= 4)   cols = 'grid-cols-1 md:grid-cols-2';
            else if (n <= 6)   cols = 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
            else               cols = 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
            return `<div class="grid ${cols} gap-4 md:gap-6">${groupHtmls.join('')}</div>`;
        }

        return groupHtmls.join('');
    },

    _renderMatches(data, accent) {
        const matches = data.currentMatches || [];
        if (matches.length === 0) {
            return `<div class="flex items-center justify-center h-full text-gray-500 text-xl">No active matches</div>`;
        }

        // Group by round label
        const byRound = {};
        matches.forEach(m => {
            const key = m.roundLabel || 'Matches';
            if (!byRound[key]) byRound[key] = [];
            byRound[key].push(m);
        });

        const roundEntries = Object.entries(byRound);
        const colClass = roundEntries.length > 1 ? 'grid grid-cols-2 gap-4 items-start' : '';

        return `<div class="${colClass} h-full">
            ${roundEntries.map(([roundLabel, roundMatches], idx) => {
                const isNext = idx > 0;
                return `
                <div class="${isNext ? 'border-l border-white/10 pl-4' : ''}">
                    <h3 class="text-sm uppercase tracking-wider font-bold mb-3 ${isNext ? 'text-gray-600' : 'text-gray-500'}">${roundLabel}${isNext ? ' <span class="text-xs font-normal text-gray-600">(Up Next)</span>' : ''}</h3>
                    <div class="space-y-2">
                        ${roundMatches.map(m => {
                            const isLive = m.isLive && !m.isComplete;
                            const isDone = m.isComplete;
                            const borderColor = isLive ? 'border-green-500/50' : isDone ? 'border-white/10' : 'border-white/5';
                            const bgColor = isLive ? 'bg-green-500/5' : isNext ? 'bg-white/3' : 'bg-white/5';

                            return `
                                <div class="${bgColor} border ${borderColor} rounded-lg p-3" style="height: 77px; display: flex; flex-direction: column; justify-content: center;">
                                    <div class="flex items-center justify-between gap-3">
                                        <div class="flex-1 text-right min-w-0">
                                            <span class="font-semibold text-base ${isDone && m.score1 > m.score2 ? 'text-white' : isDone ? 'text-gray-400' : isNext ? 'text-gray-400' : 'text-white'}">${m.team1}</span>
                                        </div>
                                        <div class="flex items-center gap-2 flex-shrink-0" style="min-width: 84px; justify-content: center;">
                                            ${m.score1 != null ? `
                                                <span class="text-xl font-bold">${m.score1}</span>
                                                <span class="text-gray-600">-</span>
                                                <span class="text-xl font-bold">${m.score2}</span>
                                            ` : isLive ? `
                                                <span class="tv-live-dot w-2 h-2 bg-green-400 rounded-full inline-block"></span>
                                                <span class="text-green-400 text-sm font-bold uppercase">Live</span>
                                            ` : `
                                                <span class="text-gray-600 text-base">vs</span>
                                            `}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <span class="font-semibold text-base ${isDone && m.score2 > m.score1 ? 'text-white' : isDone ? 'text-gray-400' : isNext ? 'text-gray-400' : 'text-white'}">${m.team2}</span>
                                        </div>
                                    </div>
                                    ${m.courtName ? `<div class="text-xs text-gray-600 text-center mt-1">${m.courtName}</div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `}).join('')}
        </div>`;
    },

    exit() {
        this.isActive = false;
        this.getDataFn = null;
        // Show nav again
        const nav = document.getElementById('shared-nav');
        const spacer = document.getElementById('shared-nav-spacer');
        if (nav) nav.style.display = '';
        if (spacer) spacer.style.display = '';

        // Prefer history.back() when the user navigated INTO TV mode from
        // another in-app page: stepping back restores the previous URL
        // exactly as it was, including any ?key= query string an organiser
        // had. Falling back to the manual hash-strip only if we're at the
        // start of the history stack (e.g. someone opened the TV link
        // directly in a new tab) — in that case the app page's own
        // sessionStorage fallback picks the key back up.
        const canGoBack = (window.history && window.history.length > 1);
        if (canGoBack) {
            window.history.back();
        } else {
            const hash = window.location.hash.replace(/\/tv$/, '');
            window.location.hash = hash;
        }
    },

    getTVLink(tournamentId) {
        const base = window.location.origin + window.location.pathname.replace(/\/$/, '');
        return `${base}#/t/${tournamentId}/tv`;
    }
};
