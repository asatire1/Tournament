/**
 * StandingsTable.js - Standings/Leaderboard Table Component
 * Displays tournament standings with customizable columns
 * 
 * @module components/ui/StandingsTable
 */

/**
 * Default columns for standings table
 */
const DEFAULT_COLUMNS = [
    { key: 'position', label: '#', width: 'w-12' },
    { key: 'name', label: 'Player', width: 'flex-1' },
    { key: 'played', label: 'P', width: 'w-10', tooltip: 'Played' },
    { key: 'won', label: 'W', width: 'w-10', tooltip: 'Won' },
    { key: 'lost', label: 'L', width: 'w-10', tooltip: 'Lost' },
    { key: 'pointsFor', label: 'PF', width: 'w-12', tooltip: 'Points For' },
    { key: 'pointsAgainst', label: 'PA', width: 'w-12', tooltip: 'Points Against' },
    { key: 'pointsDiff', label: '+/-', width: 'w-12', tooltip: 'Point Difference' },
    { key: 'totalPoints', label: 'PTS', width: 'w-14', tooltip: 'Total Points', highlight: true }
];

/**
 * Compact columns for mobile view
 */
const COMPACT_COLUMNS = [
    { key: 'position', label: '#', width: 'w-10' },
    { key: 'name', label: 'Player', width: 'flex-1' },
    { key: 'record', label: 'W-L', width: 'w-14' },
    { key: 'totalPoints', label: 'PTS', width: 'w-14', highlight: true }
];

/**
 * StandingsTable component
 */
const StandingsTable = {
    /**
     * Render standings table
     * @param {object[]} standings - Array of standing objects
     * @param {object} options - Render options
     * @returns {string} HTML string
     */
    render(standings, options = {}) {
        const {
            columns = DEFAULT_COLUMNS,
            compact = false,
            showHeader = true,
            maxRows = null,
            highlightTop = 3,
            playerColors = true,
            onRowClick = null,
            emptyMessage = 'No standings yet',
            className = ''
        } = options;

        if (!standings || standings.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">📊</div>
                    <p>${emptyMessage}</p>
                </div>
            `;
        }

        const cols = compact ? COMPACT_COLUMNS : columns;
        const displayStandings = maxRows ? standings.slice(0, maxRows) : standings;

        // Header
        const headerHTML = showHeader ? `
            <div class="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                ${cols.map(col => `
                    <div class="${col.width} ${col.key === 'name' ? 'text-left' : 'text-center'}" 
                         ${col.tooltip ? `title="${col.tooltip}"` : ''}>
                        ${col.label}
                    </div>
                `).join('')}
            </div>
        ` : '';

        // Rows
        const rowsHTML = displayStandings.map((standing, index) => {
            const position = index + 1;
            const colors = playerColors && typeof getPlayerColor !== 'undefined' 
                ? getPlayerColor(standing.playerIndex)
                : { bg: 'bg-white', text: 'text-gray-800', border: 'border-gray-100' };
            
            // Position styling
            let positionHTML = `<span>${position}</span>`;
            if (position === 1) {
                positionHTML = '<span class="text-yellow-500">🥇</span>';
            } else if (position === 2) {
                positionHTML = '<span class="text-gray-400">🥈</span>';
            } else if (position === 3) {
                positionHTML = '<span class="text-amber-600">🥉</span>';
            }

            // Row background
            let rowBg = playerColors ? colors.bg : 'bg-white';
            if (position <= highlightTop && !playerColors) {
                rowBg = position === 1 ? 'bg-yellow-50' : position === 2 ? 'bg-gray-50' : 'bg-amber-50';
            }

            const clickAttr = onRowClick ? `onclick="${onRowClick}(${standing.playerIndex})"` : '';
            const cursorClass = onRowClick ? 'cursor-pointer hover:bg-gray-50' : '';

            return `
                <div class="flex items-center gap-2 px-4 py-3 ${rowBg} border-b ${colors.border} ${cursorClass} transition-colors"
                     ${clickAttr}>
                    ${cols.map(col => {
                        const value = this._getCellValue(standing, col.key, position);
                        const cellClass = col.highlight ? `font-bold ${colors.text}` : 'text-gray-600';
                        const alignClass = col.key === 'name' ? 'text-left' : 'text-center';
                        
                        if (col.key === 'position') {
                            return `<div class="${col.width} text-center font-medium">${positionHTML}</div>`;
                        }
                        
                        if (col.key === 'name') {
                            return `
                                <div class="${col.width} font-medium ${colors.text} truncate">
                                    ${standing.name || `Player ${standing.playerIndex + 1}`}
                                </div>
                            `;
                        }
                        
                        return `<div class="${col.width} ${alignClass} ${cellClass}">${value}</div>`;
                    }).join('')}
                </div>
            `;
        }).join('');

        // Show more indicator
        const showMoreHTML = maxRows && standings.length > maxRows ? `
            <div class="text-center py-2 text-sm text-gray-500">
                +${standings.length - maxRows} more players
            </div>
        ` : '';

        return `
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden ${className}">
                ${headerHTML}
                ${rowsHTML}
                ${showMoreHTML}
            </div>
        `;
    },

    /**
     * Get cell value for a column
     * @private
     */
    _getCellValue(standing, key, position) {
        switch (key) {
            case 'position':
                return position;
            case 'name':
                return standing.name;
            case 'record':
                return `${standing.won}-${standing.lost}`;
            case 'pointsDiff':
                const diff = standing.pointsDiff || 0;
                if (diff > 0) return `<span class="text-green-600">+${diff}</span>`;
                if (diff < 0) return `<span class="text-red-600">${diff}</span>`;
                return '0';
            default:
                return standing[key] ?? '-';
        }
    },

    /**
     * Render compact standings card
     * @param {object[]} standings - Array of standing objects
     * @param {object} options - Render options
     * @returns {string} HTML string
     */
    card(standings, options = {}) {
        const {
            title = 'Leaderboard',
            maxRows = 5,
            showViewAll = true,
            onViewAll = null,
            className = ''
        } = options;

        const topStandings = standings.slice(0, maxRows);

        const rowsHTML = topStandings.map((standing, index) => {
            const position = index + 1;
            const colors = typeof getPlayerColor !== 'undefined' 
                ? getPlayerColor(standing.playerIndex)
                : { bg: 'bg-gray-50', text: 'text-gray-800' };

            let positionBadge = `<span class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">${position}</span>`;
            if (position === 1) positionBadge = '<span class="text-xl">🥇</span>';
            if (position === 2) positionBadge = '<span class="text-xl">🥈</span>';
            if (position === 3) positionBadge = '<span class="text-xl">🥉</span>';

            return `
                <div class="flex items-center gap-3 py-2">
                    <div class="w-8 flex justify-center">${positionBadge}</div>
                    <div class="flex-1 truncate font-medium ${colors.text}">${standing.name}</div>
                    <div class="text-right">
                        <div class="font-bold text-lg ${colors.text}">${standing.totalPoints}</div>
                        <div class="text-xs text-gray-500">${standing.won}W ${standing.lost}L</div>
                    </div>
                </div>
            `;
        }).join('');

        const viewAllHTML = showViewAll && standings.length > maxRows ? `
            <button onclick="${onViewAll || ''}" 
                    class="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all ${standings.length} players →
            </button>
        ` : '';

        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}">
                <div class="px-4 py-3 border-b border-gray-100">
                    <h3 class="font-semibold text-gray-800">${title}</h3>
                </div>
                <div class="px-4 py-2 divide-y divide-gray-100">
                    ${rowsHTML}
                </div>
                ${viewAllHTML}
            </div>
        `;
    },

    /**
     * Render mini standings (top 3 only)
     * @param {object[]} standings
     * @returns {string} HTML string
     */
    mini(standings) {
        const top3 = standings.slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];

        return `
            <div class="flex items-center gap-4">
                ${top3.map((s, i) => `
                    <div class="flex items-center gap-1">
                        <span>${medals[i]}</span>
                        <span class="text-sm font-medium text-gray-700 truncate max-w-[80px]">${s.name}</span>
                        <span class="text-sm text-gray-500">(${s.totalPoints})</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StandingsTable, DEFAULT_COLUMNS, COMPACT_COLUMNS };
}

if (typeof window !== 'undefined') {
    window.StandingsTable = StandingsTable;
}
