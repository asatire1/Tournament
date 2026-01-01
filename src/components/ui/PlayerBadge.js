/**
 * PlayerBadge.js - Player Badge Component
 * Displays player info with color-coded badges
 * 
 * @module components/ui/PlayerBadge
 */

/**
 * Player color palette - 24 distinct colors
 */
const PLAYER_COLORS = [
    // Reds/Pinks
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', accent: 'bg-red-500' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', accent: 'bg-rose-500' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', accent: 'bg-pink-500' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200', accent: 'bg-fuchsia-500' },
    // Purples/Blues
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', accent: 'bg-purple-500' },
    { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', accent: 'bg-violet-500' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-500' },
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-500' },
    // Cyans/Teals
    { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200', accent: 'bg-sky-500' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', accent: 'bg-cyan-500' },
    { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', accent: 'bg-teal-500' },
    // Greens
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500' },
    { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', accent: 'bg-green-500' },
    { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-200', accent: 'bg-lime-500' },
    // Yellows/Oranges
    { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', accent: 'bg-yellow-500' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', accent: 'bg-amber-500' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-500' },
    // Neutrals
    { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200', accent: 'bg-stone-500' },
    { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200', accent: 'bg-zinc-500' },
    { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', accent: 'bg-slate-500' },
    // Extra colors
    { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', accent: 'bg-red-400' },
    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', accent: 'bg-blue-400' },
    { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', accent: 'bg-green-400' },
    { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', accent: 'bg-purple-400' }
];

/**
 * Get color scheme for a player
 * @param {number} playerIndex - 0-based player index
 * @returns {object} Color scheme object
 */
function getPlayerColor(playerIndex) {
    return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
}

/**
 * Get legacy color class (for backwards compatibility)
 * @param {number} playerNum - 1-based player number
 * @returns {string} CSS class name
 */
function getPlayerColorClass(playerNum) {
    return `player-color-${((playerNum - 1) % 24) + 1}`;
}

/**
 * PlayerBadge component
 */
const PlayerBadge = {
    /**
     * Render a player badge
     * @param {object} options - Badge options
     * @returns {string} HTML string
     */
    render(options = {}) {
        const {
            playerIndex = 0,
            playerNumber = null, // 1-based, for display
            name = null,
            size = 'md', // 'xs', 'sm', 'md', 'lg'
            showNumber = true,
            showName = true,
            onClick = null,
            className = ''
        } = options;

        const num = playerNumber ?? (playerIndex + 1);
        const colors = getPlayerColor(playerIndex);
        
        // Size classes
        const sizeClasses = {
            xs: 'w-5 h-5 text-xs',
            sm: 'w-6 h-6 text-xs',
            md: 'w-8 h-8 text-sm',
            lg: 'w-10 h-10 text-base'
        };
        
        const badgeSize = sizeClasses[size] || sizeClasses.md;
        const clickAttr = onClick ? `onclick="${onClick}"` : '';
        const cursorClass = onClick ? 'cursor-pointer hover:scale-105' : '';

        // Number-only badge
        if (!showName || !name) {
            return `
                <div class="${colors.bg} ${colors.text} ${badgeSize} rounded-full flex items-center justify-center font-bold border ${colors.border} ${cursorClass} transition-transform ${className}" 
                     ${clickAttr}
                     title="${name || `Player ${num}`}">
                    ${showNumber ? num : ''}
                </div>
            `;
        }

        // Full badge with name
        return `
            <div class="${colors.bg} ${colors.text} inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors.border} ${cursorClass} transition-transform ${className}"
                 ${clickAttr}>
                ${showNumber ? `<span class="${colors.accent} text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">${num}</span>` : ''}
                <span class="font-medium text-sm">${name}</span>
            </div>
        `;
    },

    /**
     * Render a mini badge (just the number)
     * @param {number} playerIndex - 0-based player index
     * @param {object} options - Additional options
     * @returns {string} HTML string
     */
    mini(playerIndex, options = {}) {
        return this.render({
            playerIndex,
            size: 'sm',
            showName: false,
            ...options
        });
    },

    /**
     * Render a team pair (two players)
     * @param {number[]} playerIndices - Array of two player indices
     * @param {string[]} playerNames - Array of player names
     * @param {object} options - Additional options
     * @returns {string} HTML string
     */
    team(playerIndices, playerNames = [], options = {}) {
        const {
            size = 'sm',
            separator = '&',
            className = ''
        } = options;

        const badges = playerIndices.map((index, i) => {
            const name = playerNames[index] || `Player ${index + 1}`;
            return this.render({
                playerIndex: index,
                name,
                size,
                showNumber: true,
                showName: options.showNames !== false
            });
        });

        return `
            <div class="flex items-center gap-1 ${className}">
                ${badges[0]}
                <span class="text-gray-400 text-xs">${separator}</span>
                ${badges[1] || ''}
            </div>
        `;
    },

    /**
     * Render standings row with position badge
     * @param {object} standing - Standing object
     * @param {number} position - 1-based position
     * @param {object} options - Additional options
     * @returns {string} HTML string
     */
    standingRow(standing, position, options = {}) {
        const colors = getPlayerColor(standing.playerIndex);
        const { onClick = null } = options;
        
        // Position badge style
        let positionClass = 'bg-gray-100 text-gray-600';
        let positionIcon = '';
        if (position === 1) {
            positionClass = 'bg-yellow-100 text-yellow-700';
            positionIcon = '🥇';
        } else if (position === 2) {
            positionClass = 'bg-gray-200 text-gray-700';
            positionIcon = '🥈';
        } else if (position === 3) {
            positionClass = 'bg-amber-100 text-amber-700';
            positionIcon = '🥉';
        }

        return `
            <div class="flex items-center gap-3 p-3 ${colors.bg} rounded-xl border ${colors.border} ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow"
                 ${onClick ? `onclick="${onClick}"` : ''}>
                <div class="w-8 h-8 ${positionClass} rounded-full flex items-center justify-center font-bold text-sm">
                    ${positionIcon || position}
                </div>
                <div class="flex-1">
                    <div class="font-medium ${colors.text}">${standing.name}</div>
                    <div class="text-xs text-gray-500">${standing.played} played • ${standing.won}W ${standing.lost}L</div>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold ${colors.text}">${standing.totalPoints}</div>
                    <div class="text-xs text-gray-500">pts</div>
                </div>
            </div>
        `;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlayerBadge, PLAYER_COLORS, getPlayerColor, getPlayerColorClass };
}

if (typeof window !== 'undefined') {
    window.PlayerBadge = PlayerBadge;
    window.PLAYER_COLORS = PLAYER_COLORS;
    window.getPlayerColor = getPlayerColor;
    window.getPlayerColorClass = getPlayerColorClass;
}
