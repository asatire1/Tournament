/**
 * ScoreInput.esm.js - Score Input Component (ES Module)
 */

export const ScoreInput = {
    render(options = {}) {
        const { id = 'score', team1Score = null, team2Score = null, fixedPoints = false, totalPoints = 16, disabled = false } = options;
        const s1 = team1Score === null || team1Score === -1 ? '' : team1Score;
        const s2 = team2Score === null || team2Score === -1 ? '' : team2Score;
        const inputClass = 'w-16 h-14 text-2xl border-2 border-gray-200 rounded-xl text-center font-bold focus:border-blue-500 focus:outline-none';
        return `<div class="flex items-center justify-center gap-2">
            <input type="number" id="${id}-team1" class="${inputClass}" value="${s1}" min="0" max="${totalPoints}" ${disabled ? 'disabled' : ''} placeholder="-" />
            <span class="text-2xl font-bold text-gray-300">:</span>
            <input type="number" id="${id}-team2" class="${inputClass}" value="${s2}" min="0" max="${totalPoints}" ${disabled || fixedPoints ? 'disabled' : ''} placeholder="-" />
        </div>`;
    },
    display(t1, t2) {
        const s1 = t1 === null || t1 === -1 ? '-' : t1;
        const s2 = t2 === null || t2 === -1 ? '-' : t2;
        return `<span class="font-mono text-lg">${s1} - ${s2}</span>`;
    },
    getScores(id) {
        const e1 = document.getElementById(`${id}-team1`);
        const e2 = document.getElementById(`${id}-team2`);
        return { team1: e1?.value ? parseInt(e1.value) : null, team2: e2?.value ? parseInt(e2.value) : null };
    }
};

if (typeof window !== 'undefined') window.ScoreInput = ScoreInput;
export default ScoreInput;
