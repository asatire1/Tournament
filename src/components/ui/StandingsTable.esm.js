/**
 * StandingsTable.esm.js - Standings Table Component (ES Module)
 */

export const DEFAULT_COLUMNS = [
    { key: 'position', label: '#', width: 'w-12' },
    { key: 'name', label: 'Player', width: 'flex-1' },
    { key: 'played', label: 'P', width: 'w-10' },
    { key: 'won', label: 'W', width: 'w-10' },
    { key: 'totalPoints', label: 'PTS', width: 'w-14', highlight: true }
];

export const COMPACT_COLUMNS = [
    { key: 'position', label: '#', width: 'w-10' },
    { key: 'name', label: 'Player', width: 'flex-1' },
    { key: 'totalPoints', label: 'PTS', width: 'w-14', highlight: true }
];

export const StandingsTable = {
    render(standings, options = {}) {
        if (!standings?.length) return '<div class="text-center py-8 text-gray-500">📊 No standings yet</div>';
        const { maxRows = null } = options;
        const display = maxRows ? standings.slice(0, maxRows) : standings;
        const medals = ['🥇', '🥈', '🥉'];
        return `<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            ${display.map((s, i) => `<div class="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div class="w-8 text-center">${i < 3 ? medals[i] : i + 1}</div>
                <div class="flex-1 font-medium">${s.name}</div>
                <div class="font-bold">${s.totalPoints} pts</div>
            </div>`).join('')}
        </div>`;
    },
    card(standings, options = {}) { return this.render(standings, { ...options, maxRows: options.maxRows || 5 }); },
    mini(standings) {
        const top3 = standings.slice(0, 3);
        const medals = ['🥇', '🥈', '🥉'];
        return `<div class="flex items-center gap-4">${top3.map((s, i) => `<span>${medals[i]} ${s.name} (${s.totalPoints})</span>`).join('')}</div>`;
    }
};

if (typeof window !== 'undefined') window.StandingsTable = StandingsTable;
export default StandingsTable;
