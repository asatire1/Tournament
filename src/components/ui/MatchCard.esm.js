/**
 * MatchCard.esm.js - Match Card Component (ES Module)
 */

export const MatchCard = {
    render(match, options = {}) {
        const { playerNames = [], team1Score = null, team2Score = null, courtName = null } = options;
        const team1 = match.team1 || [];
        const team2 = match.team2 || [];
        const getName = (i) => playerNames[i] || `Player ${i + 1}`;
        const s1 = team1Score === null || team1Score === -1 ? '-' : team1Score;
        const s2 = team2Score === null || team2Score === -1 ? '-' : team2Score;
        return `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            ${courtName ? `<div class="text-sm text-gray-500 mb-2">🏟️ ${courtName}</div>` : ''}
            <div class="flex items-center justify-between">
                <div>${team1.map(i => getName(i)).join(' & ')}</div>
                <div class="text-2xl font-bold font-mono">${s1} : ${s2}</div>
                <div>${team2.map(i => getName(i)).join(' & ')}</div>
            </div>
        </div>`;
    },
    grid(matches, options = {}) {
        if (!matches?.length) return '<div class="text-center py-8 text-gray-500">🎾 No matches</div>';
        return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${matches.map((m, i) => this.render(m, { ...options, matchIndex: i })).join('')}</div>`;
    },
    getScores(round, match) {
        const e1 = document.getElementById(`match-${round}-${match}-team1`);
        const e2 = document.getElementById(`match-${round}-${match}-team2`);
        return { team1: e1?.value ? parseInt(e1.value) : null, team2: e2?.value ? parseInt(e2.value) : null };
    }
};

if (typeof window !== 'undefined') window.MatchCard = MatchCard;
export default MatchCard;
