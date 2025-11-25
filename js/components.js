// ===== UI COMPONENTS =====

// ===== PLAYER BADGE =====
function PlayerBadge(playerId, showRating = false) {
    const tier = getTier(playerId);
    const name = state.playerNames[playerId - 1];
    const rating = state.skillRatings[playerId];
    
    return `
        <div class="player-badge-enhanced text-white tier-${tier}">
            <span class="font-bold">#${playerId}</span>
            <span>${name}</span>
            ${showRating ? `<span class="opacity-90 text-xs">(${rating})</span>` : ''}
        </div>
    `;
}

// ===== COMPACT PLAYER BADGE (for horizontal layout) =====
function CompactPlayerBadge(playerId) {
    const tier = getTier(playerId);
    const name = state.playerNames[playerId - 1];
    
    return `
        <div class="player-badge-compact text-white tier-${tier}">
            <span class="font-bold">#${playerId}</span>
            <span class="player-name-truncate">${name}</span>
        </div>
    `;
}

// ===== MATCH CARD (Horizontal Layout) =====
function MatchCard(round, matchIdx, match) {
    const within = isWithinGroup(match);
    const score = state.getMatchScore(round, matchIdx);
    const isComplete = state.isMatchComplete(round, matchIdx);
    const winner = state.getWinner(round, matchIdx);
    
    const team1Rating = (state.skillRatings[match.team1[0]] + state.skillRatings[match.team1[1]]).toFixed(2);
    const team2Rating = (state.skillRatings[match.team2[0]] + state.skillRatings[match.team2[1]]).toFixed(2);
    
    const matchName = state.matchNames[matchIdx + 1] || `Match ${matchIdx + 1}`;
    
    return `
        <div class="match-card ${within ? 'match-within' : 'match-cross'} ${isComplete ? 'complete' : ''}">
            <div class="px-4 py-2 flex justify-between items-center bg-gray-50">
                <div class="flex items-center gap-2">
                    <div class="font-semibold text-gray-800">R${round}</div>
                    <div class="w-1 h-1 rounded-full bg-gray-300"></div>
                    <div class="text-xs text-gray-500">${matchName}</div>
                </div>
                <div class="flex items-center gap-2">
                    ${winner === 'team1' ? `<span class="text-green-600">🏆</span>` : ''}
                    ${winner === 'draw' ? `<span class="text-gray-500">🤝</span>` : ''}
                    ${winner === 'team2' ? `<span class="text-green-600">🏆</span>` : ''}
                    <div class="text-xs font-semibold px-2 py-1 rounded-full ${within ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}">
                        ${within ? 'Within' : 'Cross'}
                    </div>
                </div>
            </div>
            <div class="px-3 py-3">
                <div class="match-row">
                    <div class="team-stack">
                        ${CompactPlayerBadge(match.team1[0])}
                        ${CompactPlayerBadge(match.team1[1])}
                    </div>
                    <div class="score-box-horizontal">
                        <span class="rating-text">${team1Rating}</span>
                        <div class="score-row">
                            <input type="number" min="0" max="16" value="${score.team1Score !== null ? score.team1Score : ''}" placeholder="—" class="score-input-compact" onchange="handleScoreChange(${round}, ${matchIdx}, this.value, 1)" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                            <span class="text-gray-400">:</span>
                            <input type="number" min="0" max="16" value="${score.team2Score !== null ? score.team2Score : ''}" placeholder="—" class="score-input-compact" onchange="handleScoreChange(${round}, ${matchIdx}, this.value, 2)" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                        </div>
                        <span class="rating-text">${team2Rating}</span>
                    </div>
                    <div class="team-stack">
                        ${CompactPlayerBadge(match.team2[0])}
                        ${CompactPlayerBadge(match.team2[1])}
                    </div>
                    ${isComplete ? `<button onclick="clearScore(${round}, ${matchIdx})" class="clear-score-btn-small" title="Clear score">×</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

// ===== KNOCKOUT MATCH CARD =====
function KnockoutMatchCard(matchId, team1Players, team2Players, maxScore) {
    const title = state.knockoutNames[matchId] || matchId.toUpperCase();
    const score = state.getKnockoutScore(matchId);
    const isComplete = score.team1Score !== null && score.team2Score !== null;
    const winner = isComplete ? (score.team1Score > score.team2Score ? 'team1' : 'team2') : null;
    
    return `
        <div class="match-card ${isComplete ? 'complete' : ''} ${isComplete ? '' : 'border border-gray-200'}">
            <div class="px-5 py-2.5 flex justify-between items-center" style="background: rgba(0, 0, 0, 0.02);">
                <div class="font-semibold text-sm text-gray-800" style="letter-spacing: -0.3px;">${title}</div>
            </div>
            ${team1Players && team2Players ? `
                <div class="p-4 space-y-3">
                    <div class="space-y-2">
                        <div class="flex justify-center gap-2">${PlayerBadge(team1Players[0])}${PlayerBadge(team1Players[1])}</div>
                        ${winner === 'team1' ? `<div class="flex items-center justify-center gap-1 text-green-600 font-semibold text-xs"><span style="font-size: 1rem;">🏆</span><span>Winners</span></div>` : ''}
                    </div>
                    <div class="flex items-center justify-center gap-3 py-1">
                        <input type="number" min="0" max="${maxScore}" value="${score.team1Score !== null ? score.team1Score : ''}" placeholder="—" class="score-input" onchange="handleKnockoutScore('${matchId}', this.value, 1, ${maxScore})" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                        <span class="score-divider">:</span>
                        <input type="number" min="0" max="${maxScore}" value="${score.team2Score !== null ? score.team2Score : ''}" placeholder="—" class="score-input" onchange="handleKnockoutScore('${matchId}', this.value, 2, ${maxScore})" ${!isUnlocked ? 'onclick="checkPasscode(); this.blur(); return false;"' : ''} />
                        ${isComplete ? `<button onclick="state.clearKnockoutScore('${matchId}'); render();" class="clear-score-btn" title="Clear score">×</button>` : ''}
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-center gap-2">${PlayerBadge(team2Players[0])}${PlayerBadge(team2Players[1])}</div>
                        ${winner === 'team2' ? `<div class="flex items-center justify-center gap-1 text-green-600 font-semibold text-xs"><span style="font-size: 1rem;">🏆</span><span>Winners</span></div>` : ''}
                    </div>
                </div>
            ` : `<div class="p-4 text-sm text-gray-400 text-center">Complete previous matches first</div>`}
        </div>
    `;
}

// ===== TOURNAMENT FIXTURES TAB =====
function TournamentFixturesTab() {
    const matches = [];
    for (let round = 1; round <= CONFIG.TOTAL_ROUNDS; round++) {
        if (state.filterRound !== 'all' && parseInt(state.filterRound) !== round) continue;
        state.fixtures[round].forEach((match, idx) => {
            if (state.filterPlayer !== 'all') {
                const playerId = parseInt(state.filterPlayer);
                const allPlayers = [...match.team1, ...match.team2];
                if (!allPlayers.includes(playerId)) return;
            }
            matches.push({ round, idx, match });
        });
    }
    
    return `
        <div class="space-y-6">
            <div class="filter-section rounded-3xl shadow-sm p-6 space-y-6">
                <div class="flex items-center gap-2.5">
                    <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <h3 class="font-semibold text-gray-800 text-base" style="letter-spacing: -0.3px;">Filters & Navigation</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wide">Round</label>
                        <select class="w-full border border-gray-200 rounded-2xl px-4 py-3.5 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium" onchange="state.filterRound = this.value; render();">
                            <option value="all" ${state.filterRound === 'all' ? 'selected' : ''}>All Rounds</option>
                            ${Array.from({length: CONFIG.TOTAL_ROUNDS}, (_, i) => `<option value="${i + 1}" ${state.filterRound == (i + 1) ? 'selected' : ''}>Round ${i + 1}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wide">Player</label>
                        <select class="w-full border border-gray-200 rounded-2xl px-4 py-3.5 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium" onchange="state.filterPlayer = this.value; render();">
                            <option value="all" ${state.filterPlayer === 'all' ? 'selected' : ''}>All Players</option>
                            ${Array.from({length: CONFIG.TOTAL_PLAYERS}, (_, i) => `<option value="${i + 1}" ${state.filterPlayer == (i + 1) ? 'selected' : ''}>#${i + 1} ${state.playerNames[i]}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <button onclick="state.filterRound = 'all'; state.filterPlayer = 'all'; render();" class="px-5 py-2.5 bg-gray-100 hover:bg-gray-150 active:bg-gray-200 rounded-xl text-sm font-semibold transition-all text-gray-700">Clear All</button>
                <div class="pt-2">
                    <div class="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Quick Access</div>
                    <div class="flex flex-wrap gap-2">
                        ${Array.from({length: CONFIG.TOTAL_ROUNDS}, (_, i) => `<button onclick="state.filterRound = '${i + 1}'; render();" class="round-btn px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${state.filterRound == (i + 1) ? 'bg-blue-500 text-white shadow-md' : 'bg-white hover:bg-gray-50 text-gray-600'}">R${i + 1}</button>`).join('')}
                    </div>
                </div>
            </div>
            ${matches.length > 0 ? `<div class="bg-blue-50 border border-blue-100 rounded-2xl p-4"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">${matches.length}</div><span class="font-medium text-gray-700">${matches.length === 1 ? 'match' : 'matches'} found</span></div></div>` : ''}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                ${matches.map(m => MatchCard(m.round, m.idx, m.match)).join('')}
            </div>
            ${matches.length === 0 ? `<div class="text-center py-20"><div class="text-7xl mb-5 opacity-20">🔍</div><div class="text-xl font-semibold text-gray-400 mb-2" style="letter-spacing: -0.3px;">No matches found</div><div class="text-sm text-gray-400">Try adjusting your filters</div></div>` : ''}
        </div>
    `;
}

// ===== RESULTS TAB =====
function ResultsTab() {
    const standings = state.calculateStandings();
    return `
        <div class="space-y-6">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 class="font-semibold text-blue-900 mb-2">Tournament Point System</h3>
                <div class="text-sm text-blue-800"><strong>Win:</strong> 3 points | <strong>Draw:</strong> 1 point | <strong>Loss:</strong> 0 points</div>
            </div>
            <div class="bg-white rounded-lg shadow overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100 border-b-2">
                        <tr>
                            <th class="px-4 py-3 text-left">Rank</th>
                            <th class="px-4 py-3 text-left">Player</th>
                            <th class="px-4 py-3 text-center">Pts</th>
                            <th class="px-4 py-3 text-center">M</th>
                            <th class="px-4 py-3 text-center">W</th>
                            <th class="px-4 py-3 text-center">D</th>
                            <th class="px-4 py-3 text-center">L</th>
                            <th class="px-4 py-3 text-center">Win%</th>
                            <th class="px-4 py-3 text-center">For</th>
                            <th class="px-4 py-3 text-center">Ag</th>
                            <th class="px-4 py-3 text-center">Diff</th>
                            <th class="px-4 py-3 text-center">Partners</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map((player, idx) => `
                            <tr class="border-b hover:bg-gray-50 ${idx < 3 ? 'bg-yellow-50' : ''}">
                                <td class="px-4 py-3 font-semibold">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
                                <td class="px-4 py-3">${PlayerBadge(player.playerId, true)}</td>
                                <td class="px-4 py-3 text-center font-bold">${player.tournamentPoints}</td>
                                <td class="px-4 py-3 text-center">${player.matches}</td>
                                <td class="px-4 py-3 text-center text-green-600 font-medium">${player.wins}</td>
                                <td class="px-4 py-3 text-center text-gray-600">${player.draws}</td>
                                <td class="px-4 py-3 text-center text-red-600 font-medium">${player.losses}</td>
                                <td class="px-4 py-3 text-center">${player.winRate}%</td>
                                <td class="px-4 py-3 text-center">${player.pointsFor}</td>
                                <td class="px-4 py-3 text-center">${player.pointsAgainst}</td>
                                <td class="px-4 py-3 text-center ${player.pointsDiff > 0 ? 'text-green-600 font-medium' : player.pointsDiff < 0 ? 'text-red-600 font-medium' : ''}">${player.pointsDiff > 0 ? '+' : ''}${player.pointsDiff}</td>
                                <td class="px-4 py-3 text-center">${player.uniquePartners}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ===== RESULTS MATRIX TAB =====
function ResultsMatrixTab() {
    const playerRoundPoints = {};
    
    for (let playerId = 1; playerId <= CONFIG.TOTAL_PLAYERS; playerId++) {
        playerRoundPoints[playerId] = Array(CONFIG.TOTAL_ROUNDS).fill(null);
    }
    
    for (let round = 1; round <= CONFIG.TOTAL_ROUNDS; round++) {
        for (let matchIdx = 0; matchIdx < CONFIG.MATCHES_PER_ROUND; matchIdx++) {
            const match = state.fixtures[round][matchIdx];
            const score = state.getMatchScore(round, matchIdx);
            
            const allPlayers = [...match.team1, ...match.team2];
            allPlayers.forEach(playerId => {
                if (score.team1Score === null || score.team2Score === null) {
                    if (playerRoundPoints[playerId][round - 1] === null) {
                        playerRoundPoints[playerId][round - 1] = '-';
                    }
                } else {
                    const isTeam1 = match.team1.includes(playerId);
                    const playerScore = isTeam1 ? score.team1Score : score.team2Score;
                    
                    if (playerRoundPoints[playerId][round - 1] === null || playerRoundPoints[playerId][round - 1] === '-') {
                        playerRoundPoints[playerId][round - 1] = playerScore;
                    } else {
                        playerRoundPoints[playerId][round - 1] += playerScore;
                    }
                }
            });
        }
    }
    
    return `
        <div class="space-y-6">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 class="font-semibold text-blue-900 mb-2">📊 Results Matrix</h3>
                <div class="text-sm text-blue-800">Shows total points scored by each player in each round. Each player plays once per round.</div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
                <div class="overflow-x-auto">
                    <table class="text-xs border-collapse min-w-full">
                        <thead>
                            <tr>
                                <th class="border p-2 bg-gray-100 sticky left-0 z-10 text-left font-semibold">Player</th>
                                ${Array.from({length: CONFIG.TOTAL_ROUNDS}, (_, i) => {
                                    const round = i + 1;
                                    return `<th class="border p-2 bg-gray-100 text-center text-sm font-semibold">R${round}</th>`;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${Array.from({length: CONFIG.TOTAL_PLAYERS}, (_, i) => {
                                const playerId = i + 1;
                                const playerName = state.playerNames[i];
                                return `
                                    <tr class="hover:bg-gray-50">
                                        <td class="border p-2 bg-gray-50 sticky left-0 z-10 font-medium text-left whitespace-nowrap">
                                            <span class="font-bold text-gray-600">#${playerId}</span> ${playerName}
                                        </td>
                                        ${playerRoundPoints[playerId].map(points => {
                                            if (points === null) {
                                                return `<td class="border p-2 bg-gray-100 text-center"></td>`;
                                            } else if (points === '-') {
                                                return `<td class="border p-2 text-center text-gray-400">-</td>`;
                                            } else {
                                                const bgColor = points >= 12 ? 'bg-green-100' : points >= 8 ? 'bg-blue-100' : points >= 4 ? 'bg-yellow-100' : 'bg-red-100';
                                                return `<td class="border p-2 text-center font-semibold ${bgColor}">${points}</td>`;
                                            }
                                        }).join('')}
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ===== FAIRNESS TAB =====
function FairnessTab() {
    const fairness = [];
    for (let playerId = 1; playerId <= CONFIG.TOTAL_PLAYERS; playerId++) {
        const roundScores = [];
        let totalFairness = 0;
        for (let round = 1; round <= CONFIG.TOTAL_ROUNDS; round++) {
            let roundFairness = null;
            state.fixtures[round].forEach((match) => {
                const allPlayers = [...match.team1, ...match.team2];
                if (!allPlayers.includes(playerId)) return;
                const isTeam1 = match.team1.includes(playerId);
                const partner = isTeam1 ? match.team1.find(p => p !== playerId) : match.team2.find(p => p !== playerId);
                const opponents = isTeam1 ? match.team2 : match.team1;
                const myTeamRating = state.skillRatings[playerId] + state.skillRatings[partner];
                const opponentRating = state.skillRatings[opponents[0]] + state.skillRatings[opponents[1]];
                roundFairness = myTeamRating - opponentRating;
            });
            if (roundFairness !== null) {
                roundScores.push(roundFairness);
                totalFairness += roundFairness;
            }
        }
        const avgFairness = roundScores.length > 0 ? totalFairness / roundScores.length : 0;
        const hardestRound = roundScores.length > 0 ? Math.min(...roundScores) : 0;
        const easiestRound = roundScores.length > 0 ? Math.max(...roundScores) : 0;
        fairness.push({ playerId, name: state.playerNames[playerId - 1], rating: state.skillRatings[playerId], totalFairness, avgFairness, hardestRound, easiestRound, roundScores });
    }

    let harder = 0, balanced = 0, easier = 0;
    fairness.forEach(f => {
        if (f.avgFairness < -0.1) harder++;
        else if (f.avgFairness > 0.1) easier++;
        else balanced++;
    });

    return `
        <div class="space-y-6">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 class="font-semibold text-blue-900 mb-2">How Fairness is Calculated</h3>
                <div class="text-sm text-blue-800 space-y-1">
                    <div><strong>Fairness = Your Team Rating - Opponent Team Rating</strong></div>
                    <div class="mt-2">
                        <span class="text-red-600 font-medium">Negative:</span> You had harder opponents (tougher schedule)<br>
                        <span class="text-green-600 font-medium">Positive:</span> You had easier opponents (easier schedule)<br>
                        <span class="text-gray-600 font-medium">Zero:</span> Perfectly balanced schedule
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
                <h3 class="font-semibold text-gray-800 mb-3">Schedule Distribution</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex items-center gap-2"><span class="w-32 font-medium text-red-600">${harder} Players</span><span class="text-gray-600">with Harder Schedule (avg < -0.1)</span></div>
                    <div class="flex items-center gap-2"><span class="w-32 font-medium text-gray-600">${balanced} Players</span><span class="text-gray-600">with Balanced Schedule (-0.1 to 0.1)</span></div>
                    <div class="flex items-center gap-2"><span class="w-32 font-medium text-green-600">${easier} Players</span><span class="text-gray-600">with Easier Schedule (avg > 0.1)</span></div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100 border-b-2">
                        <tr>
                            <th class="px-4 py-3 text-left">Player</th>
                            <th class="px-4 py-3 text-center">Rating</th>
                            <th class="px-4 py-3 text-center">Total</th>
                            <th class="px-4 py-3 text-center">Average</th>
                            <th class="px-4 py-3 text-center">Hardest</th>
                            <th class="px-4 py-3 text-center">Easiest</th>
                            <th class="px-4 py-3 text-left">All Rounds</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fairness.map(f => {
                            const avgColor = f.avgFairness < -0.1 ? 'text-red-600' : f.avgFairness > 0.1 ? 'text-green-600' : 'text-gray-600';
                            return `
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="px-4 py-3">${PlayerBadge(f.playerId)}</td>
                                    <td class="px-4 py-3 text-center">${f.rating.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-center ${avgColor} font-medium">${f.totalFairness > 0 ? '+' : ''}${f.totalFairness.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-center ${avgColor} font-bold">${f.avgFairness > 0 ? '+' : ''}${f.avgFairness.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-center text-red-600">${f.hardestRound.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-center text-green-600">${f.easiestRound > 0 ? '+' : ''}${f.easiestRound.toFixed(2)}</td>
                                    <td class="px-4 py-3">
                                        <div class="flex gap-1 overflow-x-auto pb-1" style="scrollbar-width: thin; max-width: 400px;">
                                            ${f.roundScores.map((score, idx) => {
                                                const color = score < -0.1 ? 'bg-red-100 text-red-700' : score > 0.1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
                                                return `<span class="px-2 py-1 rounded text-xs whitespace-nowrap ${color}" title="Round ${idx + 1}: ${score > 0 ? '+' : ''}${score.toFixed(2)}">${score > 0 ? '+' : ''}${score.toFixed(1)}</span>`;
                                            }).join('')}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ===== FAIRNESS 2 TAB =====
function Fairness2Tab() {
    const fairness2 = [];
    for (let playerId = 1; playerId <= CONFIG.TOTAL_PLAYERS; playerId++) {
        const roundScores = [];
        let totalFairness = 0;
        for (let round = 1; round <= CONFIG.TOTAL_ROUNDS; round++) {
            let roundFairness = null;
            state.fixtures[round].forEach((match) => {
                const allPlayers = [...match.team1, ...match.team2];
                if (!allPlayers.includes(playerId)) return;
                const isTeam1 = match.team1.includes(playerId);
                const partner = isTeam1 ? match.team1.find(p => p !== playerId) : match.team2.find(p => p !== playerId);
                const opponents = isTeam1 ? match.team2 : match.team1;
                const partnerRating = state.skillRatings[partner];
                const avgOpponentRating = (state.skillRatings[opponents[0]] + state.skillRatings[opponents[1]]) / 2;
                roundFairness = partnerRating - avgOpponentRating;
            });
            if (roundFairness !== null) {
                roundScores.push(roundFairness);
                totalFairness += roundFairness;
            }
        }
        const avgFairness = roundScores.length > 0 ? totalFairness / roundScores.length : 0;
        const hardestRound = roundScores.length > 0 ? Math.min(...roundScores) : 0;
        const easiestRound = roundScores.length > 0 ? Math.max(...roundScores) : 0;
        fairness2.push({ playerId, name: state.playerNames[playerId - 1], rating: state.skillRatings[playerId], totalFairness, avgFairness, hardestRound, easiestRound, roundScores });
    }

    let harder = 0, balanced = 0, easier = 0;
    fairness2.forEach(f => {
        if (f.avgFairness < -0.05) harder++;
        else if (f.avgFairness > 0.05) easier++;
        else balanced++;
    });

    return `
        <div class="space-y-6">
            <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 class="font-semibold text-purple-900 mb-2">Fairness 2: Partner Quality vs Opponents</h3>
                <div class="text-sm text-purple-800 space-y-1">
                    <div><strong>Fairness 2 = Partner Rating - Average Opponent Rating</strong></div>
                    <div class="mt-2">
                        <span class="text-red-600 font-medium">Negative:</span> Your partner was weaker than average opponent<br>
                        <span class="text-green-600 font-medium">Positive:</span> Your partner was stronger than average opponent<br>
                        <span class="text-gray-600 font-medium">Zero:</span> Partner matched opponent average
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
                <h3 class="font-semibold text-gray-800 mb-3">Partner Quality Distribution</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex items-center gap-2"><span class="w-32 font-medium text-red-600">${harder} Players</span><span class="text-gray-600">had Weaker Partners (avg < -0.05)</span></div>
                    <div class="flex items-center gap-2"><span class="w-32 font-medium text-gray-600">${balanced} Players</span><span class="text-gray-600">had Balanced Partners (-0.05 to 0.05)</span></div>
                    <div class="flex items-center gap-2"><span class="w-32 font-medium text-green-600">${easier} Players</span><span class="text-gray-600">had Stronger Partners (avg > 0.05)</span></div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100 border-b-2">
                        <tr>
                            <th class="px-4 py-3 text-left">Player</th>
                            <th class="px-4 py-3 text-center">Rating</th>
                            <th class="px-4 py-3 text-center">Total</th>
                            <th class="px-4 py-3 text-center">Average</th>
                            <th class="px-4 py-3 text-center">Worst</th>
                            <th class="px-4 py-3 text-center">Best</th>
                            <th class="px-4 py-3 text-left">All Rounds</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fairness2.map(f => {
                            const avgColor = f.avgFairness < -0.05 ? 'text-red-600' : f.avgFairness > 0.05 ? 'text-green-600' : 'text-gray-600';
                            return `
                                <tr class="border-b hover:bg-gray-50">
                                    <td class="px-4 py-3">${PlayerBadge(f.playerId)}</td>
                                    <td class="px-4 py-3 text-center">${f.rating.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-center ${avgColor} font-medium">${f.totalFairness > 0 ? '+' : ''}${f.totalFairness.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-center ${avgColor} font-bold">${f.avgFairness > 0 ? '+' : ''}${f.avgFairness.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-center text-red-600">${f.hardestRound.toFixed(2)}</td>
                                    <td class="px-4 py-3 text-center text-green-600">${f.easiestRound > 0 ? '+' : ''}${f.easiestRound.toFixed(2)}</td>
                                    <td class="px-4 py-3">
                                        <div class="flex gap-1 overflow-x-auto pb-1" style="scrollbar-width: thin; max-width: 400px;">
                                            ${f.roundScores.map((score, idx) => {
                                                const color = score < -0.05 ? 'bg-red-100 text-red-700' : score > 0.05 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
                                                return `<span class="px-2 py-1 rounded text-xs whitespace-nowrap ${color}" title="Round ${idx + 1}: ${score > 0 ? '+' : ''}${score.toFixed(2)}">${score > 0 ? '+' : ''}${score.toFixed(1)}</span>`;
                                            }).join('')}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ===== PARTNERSHIPS TAB (NEW) =====
function calculatePartnerships() {
    const partnerships = {};
    const opponents = {};
    for (let i = 1; i <= CONFIG.TOTAL_PLAYERS; i++) {
        partnerships[i] = {};
        opponents[i] = {};
        for (let j = 1; j <= CONFIG.TOTAL_PLAYERS; j++) {
            partnerships[i][j] = 0;
            opponents[i][j] = 0;
        }
    }
    for (let round = 1; round <= CONFIG.TOTAL_ROUNDS; round++) {
        state.fixtures[round].forEach((match) => {
            const [p1, p2] = match.team1;
            const [p3, p4] = match.team2;
            partnerships[p1][p2]++;
            partnerships[p2][p1]++;
            partnerships[p3][p4]++;
            partnerships[p4][p3]++;
            [p1, p2].forEach(p => { opponents[p][p3]++; opponents[p][p4]++; });
            [p3, p4].forEach(p => { opponents[p][p1]++; opponents[p][p2]++; });
        });
    }
    let totalPartnerships = 0, uniquePartnerships = 0;
    let totalOpponents = 0, uniqueOpponents = 0;
    for (let i = 1; i <= CONFIG.TOTAL_PLAYERS; i++) {
        for (let j = i + 1; j <= CONFIG.TOTAL_PLAYERS; j++) {
            if (partnerships[i][j] > 0) { totalPartnerships += partnerships[i][j]; uniquePartnerships++; }
            if (opponents[i][j] > 0) { totalOpponents += opponents[i][j]; uniqueOpponents++; }
        }
    }
    return {
        partnerships, opponents,
        stats: {
            totalPartnerships: totalPartnerships * 2,
            uniquePartnerships,
            totalOpponents: totalOpponents * 2,
            uniqueOpponents,
            partnershipCoverage: (uniquePartnerships / 276 * 100).toFixed(1),
            opponentCoverage: (uniqueOpponents / 276 * 100).toFixed(1)
        }
    };
}

function PartnershipsTab() {
    const data = calculatePartnerships();
    return `
        <div class="space-y-6">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 class="font-semibold text-blue-900 mb-3">Partnership & Opponent Statistics</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div class="font-medium text-blue-900">Partnerships</div>
                        <div class="text-blue-800">${data.stats.totalPartnerships} Total | ${data.stats.uniquePartnerships} Unique (${data.stats.partnershipCoverage}%)</div>
                    </div>
                    <div>
                        <div class="font-medium text-blue-900">Opponents</div>
                        <div class="text-blue-800">${data.stats.totalOpponents} Total | ${data.stats.uniqueOpponents} Unique (${data.stats.opponentCoverage}%)</div>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
                <h3 class="font-semibold text-gray-800 mb-3">Partnership Matrix</h3>
                <div class="text-xs text-gray-600 mb-3">
                    <span class="inline-block w-6 h-6 bg-blue-200 border mr-1"></span> 1 partnership
                    <span class="inline-block w-6 h-6 bg-green-300 border mr-1 ml-3"></span> 2 partnerships
                    <span class="inline-block w-6 h-6 bg-red-300 border mr-1 ml-3"></span> 3+ partnerships
                </div>
                <div class="overflow-x-auto">
                    <table class="text-xs border-collapse">
                        <thead><tr><th class="border p-1 bg-gray-100 sticky left-0"></th>${Array.from({length: CONFIG.TOTAL_PLAYERS}, (_, i) => `<th class="border p-1 bg-gray-100 text-center">${i + 1}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${Array.from({length: CONFIG.TOTAL_PLAYERS}, (_, i) => {
                                const playerId = i + 1;
                                return `<tr><th class="border p-1 bg-gray-100 sticky left-0 text-right">${playerId}</th>${Array.from({length: CONFIG.TOTAL_PLAYERS}, (_, j) => {
                                    const partnerId = j + 1;
                                    if (playerId === partnerId) return `<td class="border p-1 bg-gray-200 text-center">-</td>`;
                                    const count = data.partnerships[playerId][partnerId];
                                    const bgColor = count === 0 ? 'bg-white' : count === 1 ? 'bg-blue-200' : count === 2 ? 'bg-green-300' : 'bg-red-300';
                                    return `<td class="border p-1 text-center ${bgColor}" title="Player ${playerId} partnered with Player ${partnerId}: ${count} times">${count > 0 ? count : ''}</td>`;
                                }).join('')}</tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
                <h3 class="font-semibold text-gray-800 mb-3">Opponent Matrix</h3>
                <div class="text-xs text-gray-600 mb-3">
                    <span class="inline-block w-6 h-6 bg-red-100 border mr-1"></span> 1-2 times
                    <span class="inline-block w-6 h-6 bg-orange-200 border mr-1 ml-3"></span> 3-4 times
                    <span class="inline-block w-6 h-6 bg-yellow-200 border mr-1 ml-3"></span> 5-6 times
                    <span class="inline-block w-6 h-6 bg-purple-300 border mr-1 ml-3"></span> 7+ times
                </div>
                <div class="overflow-x-auto">
                    <table class="text-xs border-collapse">
                        <thead><tr><th class="border p-1 bg-gray-100 sticky left-0"></th>${Array.from({length: CONFIG.TOTAL_PLAYERS}, (_, i) => `<th class="border p-1 bg-gray-100 text-center">${i + 1}</th>`).join('')}</tr></thead>
                        <tbody>
                            ${Array.from({length: CONFIG.TOTAL_PLAYERS}, (_, i) => {
                                const playerId = i + 1;
                                return `<tr><th class="border p-1 bg-gray-100 sticky left-0 text-right">${playerId}</th>${Array.from({length: CONFIG.TOTAL_PLAYERS}, (_, j) => {
                                    const opponentId = j + 1;
                                    if (playerId === opponentId) return `<td class="border p-1 bg-gray-200 text-center">-</td>`;
                                    const count = data.opponents[playerId][opponentId];
                                    const bgColor = count === 0 ? 'bg-white' : count <= 2 ? 'bg-red-100' : count <= 4 ? 'bg-orange-200' : count <= 6 ? 'bg-yellow-200' : 'bg-purple-300';
                                    return `<td class="border p-1 text-center ${bgColor}" title="Player ${playerId} opposed Player ${opponentId}: ${count} times">${count > 0 ? count : ''}</td>`;
                                }).join('')}</tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ===== KNOCKOUT TAB =====
function KnockoutTab() {
    const standings = state.calculateStandings();
    const top16 = standings.slice(0, 16);
    
    const qf1 = state.getKnockoutScore('qf1');
    const qf2 = state.getKnockoutScore('qf2');
    const qf3 = state.getKnockoutScore('qf3');
    const qf4 = state.getKnockoutScore('qf4');
    const sf1 = state.getKnockoutScore('sf1');
    const sf2 = state.getKnockoutScore('sf2');
    const final = state.getKnockoutScore('final');
    
    const qf1Winner = qf1.team1Score !== null && qf1.team2Score !== null ? (qf1.team1Score > qf1.team2Score ? 'team1' : 'team2') : null;
    const qf2Winner = qf2.team1Score !== null && qf2.team2Score !== null ? (qf2.team1Score > qf2.team2Score ? 'team1' : 'team2') : null;
    const qf3Winner = qf3.team1Score !== null && qf3.team2Score !== null ? (qf3.team1Score > qf3.team2Score ? 'team1' : 'team2') : null;
    const qf4Winner = qf4.team1Score !== null && qf4.team2Score !== null ? (qf4.team1Score > qf4.team2Score ? 'team1' : 'team2') : null;
    const sf1Winner = sf1.team1Score !== null && sf1.team2Score !== null ? (sf1.team1Score > sf1.team2Score ? 'team1' : 'team2') : null;
    const sf2Winner = sf2.team1Score !== null && sf2.team2Score !== null ? (sf2.team1Score > sf2.team2Score ? 'team1' : 'team2') : null;
    const champion = final.team1Score !== null && final.team2Score !== null ? (final.team1Score > final.team2Score ? 'team1' : 'team2') : null;
    
    return `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="filter-section rounded-3xl shadow-sm p-5">
                    <h3 class="font-semibold text-gray-800 mb-3 text-sm" style="letter-spacing: -0.3px;">Quarter Finals</h3>
                    <label class="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Match Points</label>
                    <select class="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium" value="${state.knockoutMaxScore}" onchange="state.updateKnockoutMaxScore(parseInt(this.value)); render();" ${!isUnlocked ? 'onclick="checkPasscode(); return false;"' : ''}>
                        ${Array.from({length: 17}, (_, i) => i + 8).map(n => `<option value="${n}" ${state.knockoutMaxScore === n ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-section rounded-3xl shadow-sm p-5">
                    <h3 class="font-semibold text-gray-800 mb-3 text-sm" style="letter-spacing: -0.3px;">Semi Finals</h3>
                    <label class="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Match Points</label>
                    <select class="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all text-sm font-medium" value="${state.semiMaxScore}" onchange="state.updateSemiMaxScore(parseInt(this.value)); render();" ${!isUnlocked ? 'onclick="checkPasscode(); return false;"' : ''}>
                        ${Array.from({length: 17}, (_, i) => i + 8).map(n => `<option value="${n}" ${state.semiMaxScore === n ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-section rounded-3xl shadow-sm p-5 relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 opacity-60"></div>
                    <div class="relative">
                        <h3 class="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2" style="letter-spacing: -0.3px;"><span class="text-base">🏆</span>Final Match</h3>
                        <label class="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Match Points</label>
                        <select class="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-50 transition-all text-sm font-medium bg-white" value="${state.finalMaxScore}" onchange="state.updateFinalMaxScore(parseInt(this.value)); render();" ${!isUnlocked ? 'onclick="checkPasscode(); return false;"' : ''}>
                            ${Array.from({length: 17}, (_, i) => i + 8).map(n => `<option value="${n}" ${state.finalMaxScore === n ? 'selected' : ''}>${n}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
            <div class="filter-section rounded-3xl shadow-sm p-5">
                <h3 class="font-semibold text-gray-800 mb-4 text-sm" style="letter-spacing: -0.3px;">Top 16 Qualified Players</h3>
                <div class="flex flex-wrap gap-2">
                    ${top16.map((p, idx) => `<div class="flex items-center gap-2 bg-white rounded-full px-3 py-2 border border-gray-200"><span class="text-xs font-bold text-gray-500">#${idx + 1}</span>${PlayerBadge(p.playerId)}</div>`).join('')}
                </div>
            </div>
            <div>
                <h3 class="text-lg font-bold text-gray-800 mb-4" style="letter-spacing: -0.5px;">Quarter Finals</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${KnockoutMatchCard('qf1', top16[0] && top16[2] ? [top16[0].playerId, top16[2].playerId] : null, top16[13] && top16[15] ? [top16[13].playerId, top16[15].playerId] : null, state.knockoutMaxScore)}
                    ${KnockoutMatchCard('qf2', top16[1] && top16[3] ? [top16[1].playerId, top16[3].playerId] : null, top16[12] && top16[14] ? [top16[12].playerId, top16[14].playerId] : null, state.knockoutMaxScore)}
                    ${KnockoutMatchCard('qf3', top16[4] && top16[6] ? [top16[4].playerId, top16[6].playerId] : null, top16[9] && top16[11] ? [top16[9].playerId, top16[11].playerId] : null, state.knockoutMaxScore)}
                    ${KnockoutMatchCard('qf4', top16[5] && top16[7] ? [top16[5].playerId, top16[7].playerId] : null, top16[8] && top16[10] ? [top16[8].playerId, top16[10].playerId] : null, state.knockoutMaxScore)}
                </div>
            </div>
            <div>
                <h3 class="text-lg font-bold text-gray-800 mb-4" style="letter-spacing: -0.5px;">Semi Finals</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${qf1Winner && qf4Winner ? KnockoutMatchCard('sf1', qf1Winner === 'team1' ? [top16[0].playerId, top16[2].playerId] : [top16[13].playerId, top16[15].playerId], qf4Winner === 'team1' ? [top16[5].playerId, top16[7].playerId] : [top16[8].playerId, top16[10].playerId], state.semiMaxScore) : `<div class="match-card border border-gray-200"><div class="px-5 py-2.5" style="background: rgba(0, 0, 0, 0.02);"><div class="font-semibold text-sm text-gray-800" style="letter-spacing: -0.3px;">${state.knockoutNames.sf1}</div></div><div class="p-4 text-sm text-gray-400 text-center">Complete QF1 and QF4 first</div></div>`}
                    ${qf2Winner && qf3Winner ? KnockoutMatchCard('sf2', qf2Winner === 'team1' ? [top16[1].playerId, top16[3].playerId] : [top16[12].playerId, top16[14].playerId], qf3Winner === 'team1' ? [top16[4].playerId, top16[6].playerId] : [top16[9].playerId, top16[11].playerId], state.semiMaxScore) : `<div class="match-card border border-gray-200"><div class="px-5 py-2.5" style="background: rgba(0, 0, 0, 0.02);"><div class="font-semibold text-sm text-gray-800" style="letter-spacing: -0.3px;">${state.knockoutNames.sf2}</div></div><div class="p-4 text-sm text-gray-400 text-center">Complete QF2 and QF3 first</div></div>`}
                </div>
            </div>
            <div>
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2" style="letter-spacing: -0.5px;"><span class="text-xl">🏆</span>Championship Final</h3>
                <div class="max-w-2xl mx-auto">
                    ${sf1Winner && sf2Winner ? `${KnockoutMatchCard('final', [1, 2], [3, 4], state.finalMaxScore)}${champion ? `<div class="mt-6 text-center relative overflow-hidden rounded-3xl p-8 shadow-xl" style="background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);"><div class="absolute inset-0 opacity-10"><div class="absolute inset-0 bg-gradient-to-br from-white via-transparent to-transparent"></div></div><div class="relative"><div class="text-6xl mb-4">🏆</div><div class="text-3xl font-bold text-white mb-2" style="letter-spacing: -0.8px;">Champions!</div><div class="text-lg text-yellow-50">Congratulations</div></div></div>` : ''}` : `<div class="match-card border border-gray-200"><div class="px-5 py-2.5" style="background: rgba(0, 0, 0, 0.02);"><div class="font-semibold text-sm text-gray-800 flex items-center gap-2" style="letter-spacing: -0.3px;"><span class="text-base">🏆</span>${state.knockoutNames.final}</div></div><div class="p-4 text-sm text-gray-400 text-center">Complete both Semi Finals first</div></div>`}
                </div>
            </div>
        </div>
    `;
}
