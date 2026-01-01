/**
 * MatchCard.js - Match Display Card Component
 * Displays a match with teams, scores, and court info
 * 
 * @module components/ui/MatchCard
 */

/**
 * MatchCard component
 */
const MatchCard = {
    /**
     * Render a match card
     * @param {object} match - Match object { team1, team2, court }
     * @param {object} options - Render options
     * @returns {string} HTML string
     */
    render(match, options = {}) {
        const {
            playerNames = [],
            team1Score = null,
            team2Score = null,
            courtName = null,
            roundNumber = null,
            matchIndex = null,
            canEdit = false,
            fixedPoints = false,
            totalPoints = 16,
            onScoreChange = null,
            onClick = null,
            compact = false,
            showCourt = true,
            className = ''
        } = options;

        const team1 = match.team1 || [];
        const team2 = match.team2 || [];
        const court = courtName || `Court ${(match.court || 0) + 1}`;

        // Get player names
        const getNames = (indices) => indices.map(i => playerNames[i] || `Player ${i + 1}`);
        const team1Names = getNames(team1);
        const team2Names = getNames(team2);

        // Score state
        const score1 = team1Score === null || team1Score === -1 ? '' : team1Score;
        const score2 = team2Score === null || team2Score === -1 ? '' : team2Score;
        const isComplete = score1 !== '' && score2 !== '';
        const team1Won = isComplete && parseInt(score1) > parseInt(score2);
        const team2Won = isComplete && parseInt(score2) > parseInt(score1);

        // IDs for score inputs
        const scoreId = `match-${roundNumber}-${matchIndex}`;

        if (compact) {
            return this._renderCompact(match, { ...options, team1Names, team2Names, score1, score2, isComplete, team1Won, team2Won });
        }

        // Team badge rendering
        const renderTeam = (indices, names, isWinner, position) => {
            const winClass = isWinner ? 'ring-2 ring-green-400' : '';
            const fadeClass = isComplete && !isWinner ? 'opacity-60' : '';
            
            return `
                <div class="flex items-center gap-2 ${fadeClass}">
                    ${indices.map((playerIndex, i) => {
                        const colors = typeof getPlayerColor !== 'undefined' 
                            ? getPlayerColor(playerIndex)
                            : { bg: 'bg-gray-100', text: 'text-gray-700', accent: 'bg-gray-500' };
                        return `
                            <div class="${colors.bg} ${colors.text} px-3 py-1.5 rounded-full border ${colors.border || 'border-gray-200'} ${winClass} flex items-center gap-1.5">
                                <span class="${colors.accent} text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
                                    ${playerIndex + 1}
                                </span>
                                <span class="font-medium text-sm truncate max-w-[100px]">${names[i]}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        };

        // Score section
        let scoreHTML = '';
        if (canEdit && onScoreChange) {
            // Editable scores
            const inputClass = 'w-14 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors';
            const team2Readonly = fixedPoints ? 'readonly tabindex="-1" bg-gray-50' : '';
            
            scoreHTML = `
                <div class="flex items-center justify-center gap-2">
                    <input type="number" 
                        id="${scoreId}-team1"
                        class="${inputClass}"
                        value="${score1}"
                        min="0" max="${totalPoints}"
                        placeholder="-"
                        onchange="${onScoreChange}"
                        ${fixedPoints ? `oninput="MatchCard._handleFixedPoints('${scoreId}', ${totalPoints})"` : ''} />
                    <span class="text-2xl font-bold text-gray-300">:</span>
                    <input type="number" 
                        id="${scoreId}-team2"
                        class="${inputClass} ${team2Readonly}"
                        value="${score2}"
                        min="0" max="${totalPoints}"
                        placeholder="-"
                        ${!fixedPoints ? `onchange="${onScoreChange}"` : team2Readonly} />
                </div>
            `;
        } else {
            // Read-only scores
            const score1Class = team1Won ? 'text-green-600' : isComplete ? 'text-gray-400' : 'text-gray-600';
            const score2Class = team2Won ? 'text-green-600' : isComplete ? 'text-gray-400' : 'text-gray-600';
            
            scoreHTML = `
                <div class="flex items-center justify-center gap-2 text-3xl font-bold font-mono">
                    <span class="${score1Class}">${score1 || '-'}</span>
                    <span class="text-gray-300">:</span>
                    <span class="${score2Class}">${score2 || '-'}</span>
                </div>
            `;
        }

        // Status badge
        let statusBadge = '';
        if (isComplete) {
            statusBadge = '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">✓ Complete</span>';
        } else if (score1 !== '' || score2 !== '') {
            statusBadge = '<span class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">In Progress</span>';
        }

        const clickAttr = onClick ? `onclick="${onClick}"` : '';
        const cursorClass = onClick ? 'cursor-pointer hover:shadow-lg' : '';

        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${cursorClass} transition-shadow ${className}"
                 ${clickAttr}>
                <!-- Header -->
                <div class="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    ${showCourt ? `<span class="text-sm font-medium text-gray-600">🏟️ ${court}</span>` : '<span></span>'}
                    ${statusBadge}
                </div>
                
                <!-- Match content -->
                <div class="p-4 space-y-4">
                    <!-- Team 1 -->
                    ${renderTeam(team1, team1Names, team1Won, 'top')}
                    
                    <!-- Score -->
                    <div class="py-2">
                        ${scoreHTML}
                    </div>
                    
                    <!-- Team 2 -->
                    ${renderTeam(team2, team2Names, team2Won, 'bottom')}
                </div>
            </div>
        `;
    },

    /**
     * Render compact match card
     * @private
     */
    _renderCompact(match, options) {
        const { team1Names, team2Names, score1, score2, isComplete, team1Won, team2Won, className = '' } = options;
        const team1 = match.team1 || [];
        const team2 = match.team2 || [];

        const score1Class = team1Won ? 'text-green-600 font-bold' : isComplete ? 'text-gray-400' : 'text-gray-600';
        const score2Class = team2Won ? 'text-green-600 font-bold' : isComplete ? 'text-gray-400' : 'text-gray-600';
        const team1Opacity = isComplete && !team1Won ? 'opacity-60' : '';
        const team2Opacity = isComplete && !team2Won ? 'opacity-60' : '';

        return `
            <div class="bg-white rounded-xl border border-gray-100 p-3 ${className}">
                <div class="flex items-center gap-3">
                    <!-- Team 1 -->
                    <div class="flex-1 ${team1Opacity}">
                        <div class="flex items-center gap-1">
                            ${team1.map((pi, i) => `
                                <span class="text-sm font-medium truncate">${team1Names[i]}</span>
                                ${i === 0 && team1.length > 1 ? '<span class="text-gray-300">&</span>' : ''}
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Score -->
                    <div class="flex items-center gap-1 font-mono text-lg">
                        <span class="${score1Class}">${score1 || '-'}</span>
                        <span class="text-gray-300">-</span>
                        <span class="${score2Class}">${score2 || '-'}</span>
                    </div>
                    
                    <!-- Team 2 -->
                    <div class="flex-1 text-right ${team2Opacity}">
                        <div class="flex items-center justify-end gap-1">
                            ${team2.map((pi, i) => `
                                ${i === 0 && team2.length > 1 ? '<span class="text-gray-300">&</span>' : ''}
                                <span class="text-sm font-medium truncate">${team2Names[i]}</span>
                            `).reverse().join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Handle fixed points mode
     * @private
     */
    _handleFixedPoints(scoreId, totalPoints) {
        const team1El = document.getElementById(`${scoreId}-team1`);
        const team2El = document.getElementById(`${scoreId}-team2`);
        
        if (!team1El || !team2El) return;
        
        const team1Score = parseInt(team1El.value);
        
        if (!isNaN(team1Score) && team1Score >= 0 && team1Score <= totalPoints) {
            team2El.value = totalPoints - team1Score;
        } else {
            team2El.value = '';
        }
    },

    /**
     * Render a grid of matches
     * @param {object[]} matches - Array of match objects
     * @param {object} options - Render options
     * @returns {string} HTML string
     */
    grid(matches, options = {}) {
        const { columns = 2, gap = 4, ...matchOptions } = options;

        if (!matches || matches.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">🎾</div>
                    <p>No matches to display</p>
                </div>
            `;
        }

        const gridClass = `grid grid-cols-1 md:grid-cols-${columns} gap-${gap}`;

        return `
            <div class="${gridClass}">
                ${matches.map((match, index) => 
                    this.render(match, { ...matchOptions, matchIndex: index })
                ).join('')}
            </div>
        `;
    },

    /**
     * Get scores from match card inputs
     * @param {number} roundNumber
     * @param {number} matchIndex
     * @returns {object} { team1: number|null, team2: number|null }
     */
    getScores(roundNumber, matchIndex) {
        const scoreId = `match-${roundNumber}-${matchIndex}`;
        const team1El = document.getElementById(`${scoreId}-team1`);
        const team2El = document.getElementById(`${scoreId}-team2`);
        
        const team1 = team1El?.value ? parseInt(team1El.value) : null;
        const team2 = team2El?.value ? parseInt(team2El.value) : null;
        
        return {
            team1: isNaN(team1) ? null : team1,
            team2: isNaN(team2) ? null : team2
        };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MatchCard };
}

if (typeof window !== 'undefined') {
    window.MatchCard = MatchCard;
}
