/**
 * ScoreInput.js - Score Input Component
 * Reusable score entry with fixed-points mode support
 * 
 * @module components/ui/ScoreInput
 */

/**
 * ScoreInput component
 */
const ScoreInput = {
    /**
     * Render a score input pair
     * @param {object} options - Input options
     * @returns {string} HTML string
     */
    render(options = {}) {
        const {
            id = 'score',
            team1Score = null,
            team2Score = null,
            maxPoints = 99,
            fixedPoints = false,
            totalPoints = 16,
            disabled = false,
            onChange = null,
            size = 'md', // 'sm', 'md', 'lg'
            showLabels = true,
            team1Label = 'Team 1',
            team2Label = 'Team 2'
        } = options;

        const score1 = team1Score === null || team1Score === -1 ? '' : team1Score;
        const score2 = team2Score === null || team2Score === -1 ? '' : team2Score;
        
        // Size classes
        const sizeClasses = {
            sm: { input: 'w-12 h-10 text-lg', label: 'text-xs' },
            md: { input: 'w-16 h-14 text-2xl', label: 'text-sm' },
            lg: { input: 'w-20 h-16 text-3xl', label: 'text-base' }
        };
        const sizes = sizeClasses[size] || sizeClasses.md;
        
        const disabledClass = disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white';
        const inputClass = `${sizes.input} ${disabledClass} border-2 border-gray-200 rounded-xl text-center font-bold focus:border-blue-500 focus:outline-none transition-colors`;
        
        // Change handler
        const changeHandler = onChange ? `onchange="${onChange}"` : '';
        const inputHandler = fixedPoints 
            ? `oninput="ScoreInput._handleFixedPoints('${id}', ${totalPoints})"`
            : '';

        return `
            <div class="flex items-center justify-center gap-3" id="${id}-container">
                <div class="text-center">
                    ${showLabels ? `<div class="${sizes.label} text-gray-500 mb-1">${team1Label}</div>` : ''}
                    <input type="number" 
                        id="${id}-team1" 
                        class="${inputClass}"
                        value="${score1}"
                        min="0" 
                        max="${maxPoints}"
                        ${disabled ? 'disabled' : ''}
                        ${changeHandler}
                        ${inputHandler}
                        placeholder="-" />
                </div>
                
                <div class="text-2xl font-bold text-gray-300 mt-${showLabels ? '5' : '0'}">:</div>
                
                <div class="text-center">
                    ${showLabels ? `<div class="${sizes.label} text-gray-500 mb-1">${team2Label}</div>` : ''}
                    <input type="number" 
                        id="${id}-team2" 
                        class="${inputClass}"
                        value="${score2}"
                        min="0" 
                        max="${maxPoints}"
                        ${disabled ? 'disabled' : ''}
                        ${!fixedPoints ? changeHandler : ''}
                        ${fixedPoints ? 'readonly tabindex="-1"' : ''}
                        placeholder="-" />
                </div>
            </div>
        `;
    },

    /**
     * Render inline score display (read-only)
     * @param {number|null} team1Score
     * @param {number|null} team2Score
     * @param {object} options
     * @returns {string} HTML string
     */
    display(team1Score, team2Score, options = {}) {
        const { size = 'md', highlight = null } = options;
        
        const score1 = team1Score === null || team1Score === -1 ? '-' : team1Score;
        const score2 = team2Score === null || team2Score === -1 ? '-' : team2Score;
        
        const isComplete = team1Score !== null && team1Score !== -1 && 
                          team2Score !== null && team2Score !== -1;
        
        // Determine winner
        let team1Class = 'text-gray-700';
        let team2Class = 'text-gray-700';
        
        if (isComplete && team1Score !== team2Score) {
            if (team1Score > team2Score) {
                team1Class = 'text-green-600 font-bold';
                team2Class = 'text-gray-400';
            } else {
                team1Class = 'text-gray-400';
                team2Class = 'text-green-600 font-bold';
            }
        }

        const sizeClasses = {
            sm: 'text-sm',
            md: 'text-lg',
            lg: 'text-2xl'
        };
        const textSize = sizeClasses[size] || sizeClasses.md;

        return `
            <div class="inline-flex items-center gap-1 ${textSize} font-mono">
                <span class="${team1Class}">${score1}</span>
                <span class="text-gray-300">-</span>
                <span class="${team2Class}">${score2}</span>
            </div>
        `;
    },

    /**
     * Get scores from input elements
     * @param {string} id - Base ID for the inputs
     * @returns {object} { team1: number|null, team2: number|null }
     */
    getScores(id) {
        const team1El = document.getElementById(`${id}-team1`);
        const team2El = document.getElementById(`${id}-team2`);
        
        const team1 = team1El?.value ? parseInt(team1El.value) : null;
        const team2 = team2El?.value ? parseInt(team2El.value) : null;
        
        return {
            team1: isNaN(team1) ? null : team1,
            team2: isNaN(team2) ? null : team2
        };
    },

    /**
     * Set scores in input elements
     * @param {string} id - Base ID for the inputs
     * @param {number|null} team1Score
     * @param {number|null} team2Score
     */
    setScores(id, team1Score, team2Score) {
        const team1El = document.getElementById(`${id}-team1`);
        const team2El = document.getElementById(`${id}-team2`);
        
        if (team1El) {
            team1El.value = team1Score === null || team1Score === -1 ? '' : team1Score;
        }
        if (team2El) {
            team2El.value = team2Score === null || team2Score === -1 ? '' : team2Score;
        }
    },

    /**
     * Clear score inputs
     * @param {string} id - Base ID for the inputs
     */
    clear(id) {
        this.setScores(id, null, null);
    },

    /**
     * Handle fixed points mode - auto-calculate opponent score
     * @private
     * @param {string} id - Base ID for the inputs
     * @param {number} totalPoints - Total points per match
     */
    _handleFixedPoints(id, totalPoints) {
        const team1El = document.getElementById(`${id}-team1`);
        const team2El = document.getElementById(`${id}-team2`);
        
        if (!team1El || !team2El) return;
        
        const team1Score = parseInt(team1El.value);
        
        if (!isNaN(team1Score) && team1Score >= 0 && team1Score <= totalPoints) {
            team2El.value = totalPoints - team1Score;
        } else {
            team2El.value = '';
        }
    },

    /**
     * Validate scores
     * @param {number|null} team1Score
     * @param {number|null} team2Score
     * @param {object} options - Validation options
     * @returns {object} { valid: boolean, error: string|null }
     */
    validate(team1Score, team2Score, options = {}) {
        const { 
            required = false, 
            maxPoints = 99,
            fixedPoints = false,
            totalPoints = 16
        } = options;

        // Check if scores are provided
        if (team1Score === null && team2Score === null) {
            return required 
                ? { valid: false, error: 'Scores are required' }
                : { valid: true, error: null };
        }

        // Check if only one score is provided
        if ((team1Score === null) !== (team2Score === null)) {
            return { valid: false, error: 'Both scores must be provided' };
        }

        // Check range
        if (team1Score < 0 || team1Score > maxPoints) {
            return { valid: false, error: `Score must be between 0 and ${maxPoints}` };
        }
        if (team2Score < 0 || team2Score > maxPoints) {
            return { valid: false, error: `Score must be between 0 and ${maxPoints}` };
        }

        // Check fixed points constraint
        if (fixedPoints && (team1Score + team2Score !== totalPoints)) {
            return { valid: false, error: `Scores must add up to ${totalPoints}` };
        }

        return { valid: true, error: null };
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ScoreInput };
}

if (typeof window !== 'undefined') {
    window.ScoreInput = ScoreInput;
}
