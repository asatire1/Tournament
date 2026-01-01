/**
 * PlayerBadge.esm.js - Player Badge Component (ES Module)
 */

export const PLAYER_COLORS = [
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', accent: 'bg-red-500' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', accent: 'bg-rose-500' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', accent: 'bg-pink-500' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200', accent: 'bg-fuchsia-500' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', accent: 'bg-purple-500' },
    { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', accent: 'bg-violet-500' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-500' },
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-500' },
    { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', accent: 'bg-sky-500' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', accent: 'bg-cyan-500' },
    { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', accent: 'bg-teal-500' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500' },
];

export function getPlayerColor(index) { return PLAYER_COLORS[index % PLAYER_COLORS.length]; }
export function getPlayerColorClass(num) { return `player-color-${((num - 1) % 24) + 1}`; }

export const PlayerBadge = {
    render(options = {}) {
        const { playerIndex = 0, name = null, size = 'md' } = options;
        const colors = getPlayerColor(playerIndex);
        const num = playerIndex + 1;
        if (!name) return `<div class="${colors.bg} ${colors.text} w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">${num}</div>`;
        return `<div class="${colors.bg} ${colors.text} inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors.border}">
            <span class="${colors.accent} text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">${num}</span>
            <span class="font-medium text-sm">${name}</span>
        </div>`;
    },
    mini(index) { return this.render({ playerIndex: index }); },
    team(indices, names = []) {
        return `<div class="flex items-center gap-1">
            ${indices.map(i => this.render({ playerIndex: i, name: names[i] })).join('<span class="text-gray-400 text-xs">&</span>')}
        </div>`;
    }
};

if (typeof window !== 'undefined') {
    window.PlayerBadge = PlayerBadge;
    window.PLAYER_COLORS = PLAYER_COLORS;
    window.getPlayerColor = getPlayerColor;
    window.getPlayerColorClass = getPlayerColorClass;
}

export default PlayerBadge;
