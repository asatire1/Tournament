// ===== TEAM LEAGUE UI COMPONENTS =====

// ===== BADGE COMPONENTS =====

function TeamBadge(team, size = 'full') {
    if (!team) return '<div class="text-gray-400 text-sm">TBD</div>';
    
    // Use team ID-based colour for visual variety
    const colourClass = getTeamColourClass(team.id);
    
    if (size === 'mini') {
        return `
            <div class="team-mini-badge ${colourClass}" title="${team.name}">
                ${team.name.substring(0, 2).toUpperCase()}
            </div>
        `;
    }
    
    if (size === 'compact') {
        return `
            <div class="team-badge-compact ${colourClass}">
                <span class="team-name">${team.name}</span>
                <span class="team-players">${team.player1Name} & ${team.player2Name}</span>
            </div>
        `;
    }
    
    // Full size
    return `
        <div class="team-badge ${colourClass}">
            <span class="team-badge-name">${team.name}</span>
            <span class="team-badge-players">${team.player1Name} & ${team.player2Name}</span>
            <span class="team-badge-rating">${team.combinedRating.toFixed(1)} combined</span>
        </div>
    `;
}

// ===== MATCH CARD COMPONENTS =====

function GroupMatchCard(match, group, roundNum, matchNum, slot, courtName, crIdx, posInCR) {
    const team1 = state.getTeamById(match.team1Id);
    const team2 = state.getTeamById(match.team2Id);
    const score = state.getGroupScore(group, match.team1Id, match.team2Id);
    const isComplete = score.team1Score !== null && score.team2Score !== null;
    const canEdit = state.canEdit();
    const maxScore = state.groupMaxScore;
    
    let team1Winner = false;
    let team2Winner = false;
    if (isComplete) {
        team1Winner = score.team1Score > score.team2Score;
        team2Winner = score.team2Score > score.team1Score;
    }
    
    const inputId1 = `score-${group}-${match.team1Id}-${match.team2Id}-1`;
    const inputId2 = `score-${group}-${match.team1Id}-${match.team2Id}-2`;
    
    const groupColor = (CONFIG.GROUP_COLORS && CONFIG.GROUP_COLORS[group]) || 'blue';
    const hasCrInfo = typeof crIdx === 'number' && typeof posInCR === 'number';
    const popoverKey = hasCrInfo ? `${crIdx}:${posInCR}` : null;
    const isPopoverOpen = popoverKey && state.movePopoverKey === popoverKey;

    // Build move popover body if open
    let movePopoverHtml = '';
    if (isPopoverOpen && Array.isArray(state.courtSchedule)) {
        const courtCount = Math.max(1, state.courtCount || 4);
        const options = state.courtSchedule.map((cr, i) => {
            if (i === crIdx) return null; // skip current CR
            const dst = cr || [];
            const full = dst.length >= courtCount;
            const conflict = dst.find(r => r.group === group && r.genRound !== roundNum);
            const disabled = full || !!conflict;
            const reason = conflict ? `(Group ${group} R${conflict.genRound} already here)` : full ? `(full ${dst.length}/${courtCount})` : `(${dst.length}/${courtCount})`;
            return `<button onclick="moveMatchToCourtRound(${crIdx}, ${posInCR}, ${i})" ${disabled ? 'disabled' : ''} class="w-full text-left px-3 py-2 text-xs rounded-lg ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'} flex items-center justify-between gap-2"><span class="font-semibold">Court Round ${i + 1}</span><span class="text-[10px] opacity-80">${reason}</span></button>`;
        }).filter(Boolean).join('');
        const newCRIdx = state.courtSchedule.length;
        movePopoverHtml = `
            <div class="absolute right-0 top-full mt-1 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3 max-h-96 overflow-y-auto" onclick="event.stopPropagation()">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-xs font-bold text-gray-700 uppercase tracking-wide">Move to Court Round</div>
                    <button onclick="closeMovePopover()" class="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
                </div>
                <div class="space-y-1">
                    ${options || '<div class="text-xs text-gray-400 p-2">No other court rounds available.</div>'}
                    <button onclick="moveMatchToCourtRound(${crIdx}, ${posInCR}, ${newCRIdx})" class="w-full text-left px-3 py-2 text-xs rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold">+ New Court Round ${newCRIdx + 1}</button>
                </div>
            </div>
        `;
    }

    const isDraggable = hasCrInfo && canEdit;

    return `
        <div class="team-match-card ${isComplete ? 'complete' : ''} relative ${isDraggable ? 'draggable-card' : ''}"
             data-group="${group}" data-team1="${match.team1Id}" data-team2="${match.team2Id}"
             ${isDraggable ? `data-cr-idx="${crIdx}" data-pos-in-cr="${posInCR}"` : ''}
             ${isDraggable ? `draggable="true" ondragstart="handleMatchDragStart(event, ${crIdx}, ${posInCR})" ondragend="handleMatchDragEnd(event)"` : ''}>
            <div class="match-header">
                <div class="match-info flex items-center gap-2 flex-wrap">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-${groupColor}-500 text-white text-xs font-bold">${group}</span>
                    <span class="match-round">R${roundNum}</span>
                    <span class="text-gray-300">•</span>
                    <span class="match-number">Match ${matchNum}</span>
                    ${courtName ? `<span class="text-gray-300">•</span><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">${courtName}</span>` : ''}
                </div>
                <div class="flex items-center gap-1 relative">
                    ${hasCrInfo && canEdit ? `
                        <button onclick="event.stopPropagation(); openMovePopover(${crIdx}, ${posInCR})" class="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors" title="Move to another court round">↔ Move</button>
                        ${movePopoverHtml}
                    ` : ''}
                    ${isComplete && canEdit ? `
                        <button class="clear-score-btn-small" onclick="clearGroupScore('${group}', ${match.team1Id}, ${match.team2Id})" title="Clear score">×</button>
                    ` : ''}
                </div>
            </div>
            <div class="match-body">
                <div class="teams-row">
                    <div class="team-side ${team1Winner ? 'winner' : ''}">
                        ${TeamBadge(team1, 'compact')}
                        <span class="rating-label">${team1?.combinedRating?.toFixed(1) || '-'}</span>
                    </div>
                    
                    <div class="score-section">
                        <div class="score-inputs">
                            ${canEdit ? `
                                <input type="number" 
                                    id="${inputId1}"
                                    class="score-input" 
                                    value="${score.team1Score !== null ? score.team1Score : ''}" 
                                    placeholder="-"
                                    min="0" 
                                    max="${maxScore}"
                                    oninput="autoFillScore('${inputId1}', '${inputId2}', ${maxScore})"
                                    onchange="handleGroupScore('${group}', ${match.team1Id}, ${match.team2Id}, this.value, document.getElementById('${inputId2}').value)"
                                />
                                <span class="score-divider">:</span>
                                <input type="number" 
                                    id="${inputId2}"
                                    class="score-input" 
                                    value="${score.team2Score !== null ? score.team2Score : ''}" 
                                    placeholder="-"
                                    min="0" 
                                    max="${maxScore}"
                                    oninput="autoFillScore('${inputId2}', '${inputId1}', ${maxScore})"
                                    onchange="handleGroupScore('${group}', ${match.team1Id}, ${match.team2Id}, document.getElementById('${inputId1}').value, this.value)"
                                />
                            ` : `
                                <span class="score-display">${score.team1Score !== null ? score.team1Score : '-'}</span>
                                <span class="score-divider">:</span>
                                <span class="score-display">${score.team2Score !== null ? score.team2Score : '-'}</span>
                            `}
                        </div>
                    </div>
                    
                    <div class="team-side ${team2Winner ? 'winner' : ''}">
                        ${TeamBadge(team2, 'compact')}
                        <span class="rating-label">${team2?.combinedRating?.toFixed(1) || '-'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function KnockoutMatchCard(matchId, title, maxScore) {
    const teams = state.knockoutTeams[matchId];
    const score = state.getKnockoutScore(matchId);
    const team1 = teams?.team1 ? state.getTeamById(teams.team1) : null;
    const team2 = teams?.team2 ? state.getTeamById(teams.team2) : null;
    const isComplete = score.team1Score !== null && score.team2Score !== null;
    const canEdit = state.canEdit();
    
    let team1Winner = false;
    let team2Winner = false;
    if (isComplete) {
        team1Winner = score.team1Score > score.team2Score;
        team2Winner = score.team2Score > score.team1Score;
    }
    
    const matchName = state.knockoutNames[matchId] || title;
    const inputId1 = `ko-score-${matchId}-1`;
    const inputId2 = `ko-score-${matchId}-2`;
    
    return `
        <div class="team-knockout-match" data-match="${matchId}">
            <div class="ko-header">
                <span>🏆</span>
                <span>${matchName}</span>
                ${isComplete && canEdit ? `
                    <button class="clear-score-btn-small ml-auto" onclick="clearKnockoutScore('${matchId}')" title="Clear score">×</button>
                ` : ''}
            </div>
            <div class="ko-body">
                <div class="ko-teams">
                    <div class="ko-team-row ${team1Winner ? 'winner' : ''}">
                        <div class="ko-team-info">
                            ${team1 ? TeamBadge(team1, 'compact') : `
                                <div class="ko-team-name text-gray-400">TBD</div>
                            `}
                        </div>
                        ${canEdit && team1 && team2 ? `
                            <input type="number" 
                                id="${inputId1}"
                                class="ko-score-input" 
                                value="${score.team1Score !== null ? score.team1Score : ''}" 
                                placeholder="-"
                                min="0" 
                                max="${maxScore}"
                                oninput="autoFillScore('${inputId1}', '${inputId2}', ${maxScore})"
                                onchange="handleKnockoutScore('${matchId}', this.value, document.getElementById('${inputId2}').value)"
                            />
                        ` : `
                            <div class="ko-score-display">${score.team1Score !== null ? score.team1Score : '-'}</div>
                        `}
                    </div>
                    
                    <div class="ko-team-row ${team2Winner ? 'winner' : ''}">
                        <div class="ko-team-info">
                            ${team2 ? TeamBadge(team2, 'compact') : `
                                <div class="ko-team-name text-gray-400">TBD</div>
                            `}
                        </div>
                        ${canEdit && team1 && team2 ? `
                            <input type="number" 
                                id="${inputId2}"
                                class="ko-score-input" 
                                value="${score.team2Score !== null ? score.team2Score : ''}" 
                                placeholder="-"
                                min="0" 
                                max="${maxScore}"
                                oninput="autoFillScore('${inputId2}', '${inputId1}', ${maxScore})"
                                onchange="handleKnockoutScore('${matchId}', document.getElementById('${inputId1}').value, this.value)"
                            />
                        ` : `
                            <div class="ko-score-display">${score.team2Score !== null ? score.team2Score : '-'}</div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== TAB COMPONENTS =====

function GroupTab(group) {
    const fixtures = state[`group${group}Fixtures`] || [];
    const teams = state.getTeamsInGroup(group);
    const totalMatches = state.getTotalGroupMatches(group);
    const completedMatches = state.getCompletedGroupMatches(group);
    
    if (teams.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">👥</div>
                <p class="text-gray-500 mb-2">No teams in Group ${group}</p>
                <p class="text-sm text-gray-400">Add teams and split into groups in Settings</p>
            </div>
        `;
    }
    
    if (fixtures.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">📋</div>
                <p class="text-gray-500 mb-2">No fixtures generated</p>
                <p class="text-sm text-gray-400">Generate fixtures in Settings</p>
            </div>
        `;
    }
    
    return `
        <div class="group-card mb-6">
            <div class="group-header group-header-${group.toLowerCase()}">
                <span>⚽</span>
                <span>Group ${group} Matches</span>
                <span class="ml-auto text-sm opacity-80">${completedMatches}/${totalMatches} complete</span>
            </div>
        </div>
        
        <div class="space-y-4">
            ${fixtures.map((round, roundIdx) => `
                <div class="mb-6">
                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Round ${round.round}</h3>
                    <div class="grid gap-4 md:grid-cols-2">
                        ${round.matches.map((match, matchIdx) => 
                            GroupMatchCard(match, group, round.round, matchIdx + 1)
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ===== FIXTURES TAB (Side-by-Side View) =====

function FixturesTab() {
    const activeGroups = state.getActiveGroupLetters();
    const hasMultipleGroups = activeGroups.length > 1;

    const allFixtures = {};
    activeGroups.forEach(g => { allFixtures[g] = state[`group${g}Fixtures`] || []; });

    const hasAnyTeams = activeGroups.some(g => state.getTeamsInGroup(g).length > 0);

    const viewMode = state.fixturesViewMode || 'side-by-side';

    const getCompletionStats = (fixtures, group) => {
        let completed = 0, total = 0;
        fixtures.forEach(round => {
            round.matches.forEach(match => {
                total++;
                const score = state.getGroupScore(group, match.team1Id, match.team2Id);
                if (score.team1Score !== null && score.team2Score !== null) completed++;
            });
        });
        return { completed, total };
    };

    const allStats = {};
    let totalCompleted = 0, totalMatches = 0;
    activeGroups.forEach(g => {
        allStats[g] = getCompletionStats(allFixtures[g], g);
        totalCompleted += allStats[g].completed;
        totalMatches += allStats[g].total;
    });

    if (!hasAnyTeams) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">📋</div>
                <p class="text-gray-500 mb-2">No teams added yet</p>
                <p class="text-sm text-gray-400">Add teams in Settings to generate fixtures</p>
            </div>
        `;
    }

    if (activeGroups.every(g => allFixtures[g].length === 0)) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">📋</div>
                <p class="text-gray-500 mb-2">No fixtures generated</p>
                <p class="text-sm text-gray-400">Generate fixtures in Settings</p>
            </div>
        `;
    }

    // ===== COURT-SCHEDULE LAYOUT: filters + move-aware flat grid =====
    const filterCourtRound = state.fixturesFilterRound || 'all'; // reusing existing field as "Court Round"
    const filterGroup = state.fixturesFilterGroup || 'all';
    const groupColors = CONFIG.GROUP_COLORS;
    const courtCount = Math.max(1, state.courtCount || 4);
    const courtNamesArr = (state.courtNames && state.courtNames.group) || [];
    const canEdit = state.canEdit();

    // Lazy-rebuild the schedule if it's empty but fixtures exist (e.g. an older
    // tournament that predates courtSchedule). This keeps the view usable on
    // first load without forcing the organiser to regenerate fixtures.
    if ((!state.courtSchedule || state.courtSchedule.length === 0) && activeGroups.some(g => (allFixtures[g] || []).length > 0)) {
        state.rebuildCourtSchedule();
    }
    const schedule = Array.isArray(state.courtSchedule) ? state.courtSchedule : [];
    const totalCRs = schedule.length;

    const hasFilters = filterCourtRound !== 'all' || filterGroup !== 'all';

    return `
        <div class="space-y-6">
            <!-- Filter section -->
            <div class="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                <div class="flex flex-wrap items-end gap-3 mb-4">
                    <div class="w-44">
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Court Round</label>
                        <select onchange="state.fixturesFilterRound = this.value; renderTeamLeague();" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-50 transition-all text-sm font-medium">
                            <option value="all" ${filterCourtRound === 'all' ? 'selected' : ''}>All Court Rounds</option>
                            ${Array.from({length: totalCRs}, (_, i) => `<option value="${i + 1}" ${filterCourtRound == (i + 1) ? 'selected' : ''}>Court Round ${i + 1}</option>`).join('')}
                        </select>
                    </div>
                    ${hasMultipleGroups ? `
                    <div class="w-44">
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Group</label>
                        <select onchange="state.fixturesFilterGroup = this.value; renderTeamLeague();" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-50 transition-all text-sm font-medium">
                            <option value="all" ${filterGroup === 'all' ? 'selected' : ''}>All Groups</option>
                            ${activeGroups.map(g => `<option value="${g}" ${filterGroup === g ? 'selected' : ''}>Group ${g}</option>`).join('')}
                        </select>
                    </div>
                    ` : ''}
                    ${hasFilters ? `<button onclick="state.fixturesFilterRound = 'all'; state.fixturesFilterGroup = 'all'; renderTeamLeague();" class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors text-gray-600">Clear</button>` : ''}
                    <button onclick="exportFixturesCsv()" class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5" title="Download all fixtures as CSV">
                        ⬇ CSV
                    </button>
                    <div class="text-sm text-gray-500 py-2.5">${totalMatches} ${totalMatches === 1 ? 'match' : 'matches'} • ${totalCompleted}/${totalMatches} complete • ${totalCRs} court ${totalCRs === 1 ? 'round' : 'rounds'} • ${courtCount} ${courtCount === 1 ? 'court' : 'courts'}</div>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button onclick="state.fixturesFilterRound = 'all'; renderTeamLeague();" class="px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterCourtRound === 'all' ? 'bg-purple-500 text-white shadow-md' : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'}">All</button>
                    ${Array.from({length: totalCRs}, (_, i) => `<button onclick="state.fixturesFilterRound = '${i + 1}'; renderTeamLeague();" class="px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterCourtRound == (i + 1) ? 'bg-purple-500 text-white shadow-md' : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'}">CR${i + 1}</button>`).join('')}
                </div>
                ${hasMultipleGroups ? `
                <div class="flex flex-wrap gap-2 mt-2">
                    <button onclick="state.fixturesFilterGroup = 'all'; renderTeamLeague();" class="px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterGroup === 'all' ? 'bg-gray-700 text-white shadow-md' : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'}">All Groups</button>
                    ${activeGroups.map(g => {
                        const c = groupColors[g];
                        const isActive = filterGroup === g;
                        return `<button onclick="state.fixturesFilterGroup = '${g}'; renderTeamLeague();" class="px-3 py-2 rounded-xl text-xs font-semibold transition-all ${isActive ? `bg-${c}-500 text-white shadow-md` : `bg-${c}-50 hover:bg-${c}-100 text-${c}-700 border border-${c}-200`}">Group ${g}</button>`;
                    }).join('')}
                </div>
                ` : ''}
            </div>

            ${canEdit && totalCRs > 1 ? `
                <div class="text-xs text-gray-500 flex items-center gap-2 -mt-2 mb-0">
                    <span>💡 Drag a match card onto another court round to move it, or use the <strong>↔ Move</strong> button. Invalid drops show a red outline.</span>
                </div>
            ` : ''}

            <!-- Match grid grouped by Court Round -->
            ${(() => {
                if (totalCRs === 0) return '';
                const visibleCRs = schedule
                    .map((cr, crIdx) => ({ crIdx, cr }))
                    .filter(({ crIdx }) => filterCourtRound === 'all' || parseInt(filterCourtRound) === (crIdx + 1));

                let renderedAnyMatch = false;
                const html = visibleCRs.map(({ crIdx, cr }) => {
                    // Apply group filter to the visible match list in this CR
                    const visibleMatches = cr
                        .map((ref, posInCR) => ({ ref, posInCR }))
                        .filter(({ ref }) => filterGroup === 'all' || filterGroup === ref.group);
                    if (visibleMatches.length === 0) return '';
                    renderedAnyMatch = true;

                    const crSize = cr.length;
                    const cardsHtml = visibleMatches.map(({ ref, posInCR }) => {
                        // Resolve the live match data from the fixtures.
                        const groupFixtures = state[`group${ref.group}Fixtures`] || [];
                        const genRoundEntry = groupFixtures[ref.genRound - 1];
                        const match = genRoundEntry && genRoundEntry.matches ? genRoundEntry.matches[ref.matchIdx] : null;
                        if (!match) return '';
                        const courtName = courtNamesArr[posInCR] || `Court ${posInCR + 1}`;
                        return GroupMatchCard(match, ref.group, ref.genRound, ref.matchIdx + 1, crIdx + 1, courtName, crIdx, posInCR);
                    }).join('');

                    return `
                        <div class="mb-6 cr-block rounded-xl" data-cr-idx="${crIdx}" ${canEdit ? `ondragover="handleMatchDragOver(event, ${crIdx})" ondragleave="handleMatchDragLeave(event)" ondrop="handleMatchDrop(event, ${crIdx})"` : ''}>
                            <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2 flex-wrap">
                                <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-base">Court Round ${crIdx + 1}</span>
                                <span class="text-gray-400 text-xs font-normal normal-case">${crSize} ${crSize === 1 ? 'match' : 'matches'} on ${Math.min(crSize, courtCount)} ${Math.min(crSize, courtCount) === 1 ? 'court' : 'courts'}</span>
                            </h3>
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                ${cardsHtml}
                            </div>
                        </div>
                    `;
                }).join('');

                if (!renderedAnyMatch) return '';
                return html;
            })()}

            ${totalCRs === 0 ? `<div class="text-center py-20"><div class="text-7xl mb-5 opacity-20">📋</div><div class="text-xl font-semibold text-gray-400 mb-2">No fixtures generated</div><div class="text-sm text-gray-400">Generate fixtures in Settings → Groups</div></div>` : ''}
        </div>
    `;
}

function renderSideBySideFixtures(allFixtures, activeGroups) {
    const maxRounds = Math.max(...activeGroups.map(g => allFixtures[g].length));
    const groupColors = CONFIG.GROUP_COLORS;
    const gridCols = activeGroups.length <= 2 ? 'md:grid-cols-2' : activeGroups.length <= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-3';
    let html = '';

    for (let roundIdx = 0; roundIdx < maxRounds; roundIdx++) {
        const roundNum = roundIdx + 1;

        html += `
            <div class="mb-8">
                <h3 class="text-lg font-bold text-gray-700 mb-4 pb-2 border-b border-gray-200">
                    Round ${roundNum}
                </h3>
                <div class="grid ${gridCols} gap-6">
                    ${activeGroups.map(g => {
                        const round = allFixtures[g][roundIdx];
                        const color = groupColors[g];
                        return `
                            <div>
                                <div class="flex items-center gap-2 mb-3">
                                    <span class="w-6 h-6 rounded bg-${color}-500 text-white flex items-center justify-center text-xs font-bold">${g}</span>
                                    <span class="text-sm font-semibold text-gray-600">Group ${g}</span>
                                </div>
                                <div class="space-y-3">
                                    ${round ? round.matches.map((match, idx) =>
                                        GroupMatchCard(match, g, roundNum, idx + 1)
                                    ).join('') : '<p class="text-gray-400 text-sm">No matches</p>'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    return html;
}

function renderFixturesForGroup(group, fixtures) {
    if (fixtures.length === 0) {
        return `<p class="text-gray-400 text-center py-8">No fixtures for Group ${group}</p>`;
    }
    
    const headerClass = `group-header-${group.toLowerCase()}`;
    
    return `
        <div class="group-card mb-4">
            <div class="group-header ${headerClass}">
                <span>⚽</span>
                <span>Group ${group} Matches</span>
            </div>
        </div>
        
        <div class="space-y-6">
            ${fixtures.map((round, roundIdx) => `
                <div>
                    <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Round ${round.round}</h3>
                    <div class="grid gap-4 md:grid-cols-2">
                        ${round.matches.map((match, matchIdx) => 
                            GroupMatchCard(match, group, round.round, matchIdx + 1)
                        ).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function StandingsTab() {
    const activeGroups = state.getActiveGroupLetters();
    const groupCount = activeGroups.length;

    // Determine qualify count
    let qualifyCount;
    if (state.groupMode === CONFIG.GROUP_MODES.SINGLE) {
        qualifyCount = CONFIG.KNOCKOUT_QUALIFIERS.SINGLE_GROUP;
    } else if (state.groupMode === CONFIG.GROUP_MODES.FOUR_GROUPS) {
        qualifyCount = state.qualifiersPerGroup || CONFIG.KNOCKOUT_QUALIFIERS.FOUR_GROUPS;
    } else if (groupCount > 4) {
        qualifyCount = 1; // For 6/9 groups, default 1 qualifier per group
    } else {
        qualifyCount = CONFIG.KNOCKOUT_QUALIFIERS.TWO_GROUPS;
    }

    const allStandings = {};
    activeGroups.forEach(g => { allStandings[g] = state.getGroupStandings(g); });

    const renderStandingsTable = (standings, group) => {
        if (standings.length === 0) {
            return `<p class="text-gray-400 text-center py-8">No teams in group</p>`;
        }

        return `
            <div class="overflow-x-auto">
                <table class="standings-table">
                    <thead>
                        <tr>
                            <th class="text-center">#</th>
                            <th>Team</th>
                            <th class="text-center">P</th>
                            <th class="text-center">W</th>
                            <th class="text-center">D</th>
                            <th class="text-center">L</th>
                            <th class="text-center">GF</th>
                            <th class="text-center">GA</th>
                            <th class="text-center">GD</th>
                            <th class="text-center">Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings.map((row, idx) => {
                            const isQualified = idx < qualifyCount;
                            const colourClass = getTeamColourClass(row.team.id);
                            return `
                                <tr>
                                    <td class="position ${isQualified ? 'qualified' : ''}">${idx + 1}</td>
                                    <td>
                                        <div class="team-cell">
                                            <div class="team-mini-badge ${colourClass}">${row.team.name.substring(0, 2).toUpperCase()}</div>
                                            <div class="team-info">
                                                <div class="team-name">${row.team.name}</div>
                                                <div class="team-players-small">${row.team.player1Name} & ${row.team.player2Name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="stat">${row.played}</td>
                                    <td class="stat">${row.won}</td>
                                    <td class="stat">${row.drawn}</td>
                                    <td class="stat">${row.lost}</td>
                                    <td class="stat">${row.gamesFor}</td>
                                    <td class="stat">${row.gamesAgainst}</td>
                                    <td class="stat">${row.gamesDiff > 0 ? '+' : ''}${row.gamesDiff}</td>
                                    <td class="points">${row.points}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-4 flex items-center gap-2">
                <span class="qualification-badge qualified">Top ${qualifyCount} qualify</span>
            </div>
        `;
    };

    if (state.groupMode === CONFIG.GROUP_MODES.SINGLE) {
        return `
            <div class="group-card">
                <div class="group-header group-header-single">
                    <span>Standings</span>
                </div>
                <div class="p-4">
                    ${renderStandingsTable(allStandings.A, 'A')}
                </div>
            </div>
        `;
    }

    // Multiple groups - view toggle
    const viewMode = state.standingsViewMode || 'both';
    const groupTabButtons = activeGroups.map(g =>
        `<button onclick="setStandingsViewMode('group-${g.toLowerCase()}')" class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'group-' + g.toLowerCase() ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:text-gray-800'}">
            Group ${g}
        </button>`
    ).join('');

    const renderGroupCard = (g) => `
        <div class="group-card">
            <div class="group-header group-header-${g.toLowerCase()}">
                <span>Group ${g} Standings</span>
            </div>
            <div class="p-4">
                ${renderStandingsTable(allStandings[g], g)}
            </div>
        </div>
    `;

    return `
        <div class="mb-4 flex items-center justify-between flex-wrap gap-3">
            <h2 class="text-xl font-bold text-gray-800">Standings</h2>
            <div class="flex bg-gray-100 rounded-lg p-1 flex-wrap">
                <button onclick="setStandingsViewMode('both')" class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'both' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:text-gray-800'}">
                    All Groups
                </button>
                ${groupTabButtons}
            </div>
        </div>

        ${viewMode === 'both' ? `
            <div class="grid gap-6 ${groupCount <= 2 ? 'lg:grid-cols-2' : groupCount <= 4 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}">
                ${activeGroups.map(g => renderGroupCard(g)).join('')}
            </div>
        ` : ''}

        ${activeGroups.map(g => viewMode === 'group-' + g.toLowerCase() ? renderGroupCard(g) : '').join('')}

        <!-- Share Result Card Buttons -->
        <div class="mt-4 flex flex-wrap gap-2 justify-center">
            <button onclick="ResultCard.share(getCardData(), 'landscape')" class="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Share Leaderboard
            </button>
            <button onclick="ResultCard.share(getCardData(), 'story')" class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                Share to Story
            </button>
        </div>
    `;
}

function KnockoutTab() {
    const canEdit = state.canEdit();
    const knockoutFormat = state.knockoutFormat || 'quarter_final';
    
    // Determine if knockout has started based on format
    let hasKnockoutTeams = false;
    if (knockoutFormat === 'final_only') {
        hasKnockoutTeams = state.knockoutTeams.final.team1 !== null;
    } else if (knockoutFormat === 'semi_final') {
        hasKnockoutTeams = state.knockoutTeams.sf1.team1 !== null;
    } else if (knockoutFormat === 'round_of_16') {
        hasKnockoutTeams = state.knockoutTeams.r16_1?.team1 !== null;
    } else {
        hasKnockoutTeams = state.knockoutTeams.qf1.team1 !== null;
    }
    
    if (!hasKnockoutTeams) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">🏆</div>
                <p class="text-gray-500 mb-2">Knockout stage not started</p>
                <p class="text-sm text-gray-400 mb-6">Complete group stage and set knockout teams</p>
                ${canEdit ? `
                    <button onclick="setKnockoutFromStandings()" class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
                        Set Teams from Standings
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    // Final Only Format
    if (knockoutFormat === 'final_only') {
        return `
            <div class="space-y-8">
                <div class="max-w-md mx-auto">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 justify-center">
                        <span>🏆</span> Final
                    </h3>
                    ${KnockoutMatchCard('final', 'Final', state.finalMaxScore)}
                </div>
            </div>
        `;
    }
    
    // Semi Final + Final Format
    if (knockoutFormat === 'semi_final') {
        return `
            <div class="space-y-8">
                <!-- Semi Finals -->
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>⚡</span> Semi Finals
                    </h3>
                    <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                        ${KnockoutMatchCard('sf1', 'SF1', state.semiMaxScore)}
                        ${KnockoutMatchCard('sf2', 'SF2', state.semiMaxScore)}
                    </div>
                </div>
                
                <!-- 3rd Place & Final -->
                <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                    ${state.includeThirdPlace ? `
                        <div>
                            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span>🥉</span> 3rd Place Playoff
                            </h3>
                            ${KnockoutMatchCard('thirdPlace', '3rd Place', state.thirdPlaceMaxScore)}
                        </div>
                    ` : ''}
                    
                    <div>
                        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>🏆</span> Final
                        </h3>
                        ${KnockoutMatchCard('final', 'Final', state.finalMaxScore)}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Round of 16 Format
    if (knockoutFormat === 'round_of_16') {
        return `
            <div class="space-y-8">
                <!-- Round of 16 -->
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🔥</span> Round of 16
                    </h3>
                    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        ${KnockoutMatchCard('r16_1', 'R16-1', state.knockoutMaxScore)}
                        ${KnockoutMatchCard('r16_2', 'R16-2', state.knockoutMaxScore)}
                        ${KnockoutMatchCard('r16_3', 'R16-3', state.knockoutMaxScore)}
                        ${KnockoutMatchCard('r16_4', 'R16-4', state.knockoutMaxScore)}
                    </div>
                    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                        ${KnockoutMatchCard('r16_5', 'R16-5', state.knockoutMaxScore)}
                        ${KnockoutMatchCard('r16_6', 'R16-6', state.knockoutMaxScore)}
                        ${KnockoutMatchCard('r16_7', 'R16-7', state.knockoutMaxScore)}
                        ${KnockoutMatchCard('r16_8', 'R16-8', state.knockoutMaxScore)}
                    </div>
                </div>

                <!-- Quarter Finals -->
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🎯</span> Quarter Finals
                    </h3>
                    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        ${KnockoutMatchCard('qf1', 'QF1', state.knockoutMaxScore)}
                        ${KnockoutMatchCard('qf2', 'QF2', state.knockoutMaxScore)}
                        ${KnockoutMatchCard('qf3', 'QF3', state.knockoutMaxScore)}
                        ${KnockoutMatchCard('qf4', 'QF4', state.knockoutMaxScore)}
                    </div>
                </div>

                <!-- Semi Finals -->
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>⚡</span> Semi Finals
                    </h3>
                    <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                        ${KnockoutMatchCard('sf1', 'SF1', state.semiMaxScore)}
                        ${KnockoutMatchCard('sf2', 'SF2', state.semiMaxScore)}
                    </div>
                </div>

                <!-- 3rd Place & Final -->
                <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                    ${state.includeThirdPlace ? `
                        <div>
                            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span>🥉</span> 3rd Place Playoff
                            </h3>
                            ${KnockoutMatchCard('thirdPlace', '3rd Place', state.thirdPlaceMaxScore)}
                        </div>
                    ` : ''}

                    <div>
                        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>🏆</span> Final
                        </h3>
                        ${KnockoutMatchCard('final', 'Final', state.finalMaxScore)}
                    </div>
                </div>
            </div>
        `;
    }

    // Quarter Final + Semi Final + Final Format (default)
    return `
        <div class="space-y-8">
            <!-- Quarter Finals -->
            <div>
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🎯</span> Quarter Finals
                </h3>
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    ${KnockoutMatchCard('qf1', 'QF1', state.knockoutMaxScore)}
                    ${KnockoutMatchCard('qf2', 'QF2', state.knockoutMaxScore)}
                    ${KnockoutMatchCard('qf3', 'QF3', state.knockoutMaxScore)}
                    ${KnockoutMatchCard('qf4', 'QF4', state.knockoutMaxScore)}
                </div>
            </div>

            <!-- Semi Finals -->
            <div>
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>⚡</span> Semi Finals
                </h3>
                <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                    ${KnockoutMatchCard('sf1', 'SF1', state.semiMaxScore)}
                    ${KnockoutMatchCard('sf2', 'SF2', state.semiMaxScore)}
                </div>
            </div>
            
            <!-- 3rd Place & Final -->
            <div class="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
                ${state.includeThirdPlace ? `
                    <div>
                        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span>🥉</span> 3rd Place Playoff
                        </h3>
                        ${KnockoutMatchCard('thirdPlace', '3rd Place', state.thirdPlaceMaxScore)}
                    </div>
                ` : ''}
                
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🏆</span> Final
                    </h3>
                    ${KnockoutMatchCard('final', 'Final', state.finalMaxScore)}
                </div>
            </div>
        </div>
    `;
}

function PartnersTab() {
    const teams = [...state.teams].sort((a, b) => b.combinedRating - a.combinedRating);
    
    if (teams.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4 opacity-50">👥</div>
                <p class="text-gray-500 mb-2">No teams added yet</p>
                <p class="text-sm text-gray-400">Add teams in Settings</p>
            </div>
        `;
    }
    
    return `
        <div class="partners-grid">
            ${teams.map((team, idx) => {
                const colourClass = getTeamColourClass(team.id);
                const tierName = getTeamTierName(team.combinedRating);
                return `
                    <div class="partner-card">
                        <div class="partner-card-header ${colourClass}">
                            <span class="team-number-badge">${team.id}</span>
                            <span class="team-name-header">${team.name}</span>
                        </div>
                        <div class="partner-card-body">
                            <div class="players-list">
                                <div class="player-row">
                                    <span class="player-name">${team.player1Name}</span>
                                    <span class="player-rating">${team.player1Rating.toFixed(1)}</span>
                                </div>
                                <div class="player-row">
                                    <span class="player-name">${team.player2Name}</span>
                                    <span class="player-rating">${team.player2Rating.toFixed(1)}</span>
                                </div>
                            </div>
                            <div class="combined-rating">
                                <span class="combined-label">Combined Rating</span>
                                <span class="combined-value">${team.combinedRating.toFixed(1)}</span>
                            </div>
                            ${team.group ? `
                                <span class="group-badge group-${team.group.toLowerCase()}">Group ${team.group}</span>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function SettingsTab() {
    const canEdit = state.canEdit();
    
    if (!canEdit) {
        return `
            <div class="text-center py-12">
                <div class="text-5xl mb-4">🔒</div>
                <p class="text-gray-500 mb-4">Organiser access required to edit settings</p>
                <button onclick="showOrganiserLoginModal()" class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors">
                    Login as Organiser
                </button>
            </div>
        `;
    }
    
    const subTab = state.settingsSubTab || 'teams';
    
    return `
        <!-- Settings Subtabs -->
        <div class="flex flex-wrap gap-2 mb-6">
            <button onclick="setSettingsSubTab('teams')" class="settings-subtab ${subTab === 'teams' ? 'active' : 'inactive'}">
                👥 Teams
            </button>
            <button onclick="setSettingsSubTab('groups')" class="settings-subtab ${subTab === 'groups' ? 'active' : 'inactive'}">
                📋 Groups
            </button>
            <button onclick="setSettingsSubTab('fixtures')" class="settings-subtab ${subTab === 'fixtures' ? 'active' : 'inactive'}">
                🔄 Fixtures
            </button>
            <button onclick="setSettingsSubTab('knockout')" class="settings-subtab ${subTab === 'knockout' ? 'active' : 'inactive'}">
                🏆 Knockout
            </button>
            <button onclick="setSettingsSubTab('courts')" class="settings-subtab ${subTab === 'courts' ? 'active' : 'inactive'}">
                🏟️ Courts
            </button>
            <button onclick="setSettingsSubTab('scoring')" class="settings-subtab ${subTab === 'scoring' ? 'active' : 'inactive'}">
                ⚙️ Scoring
            </button>
            <button onclick="setSettingsSubTab('danger')" class="settings-subtab ${subTab === 'danger' ? 'active' : 'inactive'}">
                ⚠️ Danger Zone
            </button>
        </div>
        
        <!-- Settings Content -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            ${subTab === 'teams' ? TeamsSettingsSection() : ''}
            ${subTab === 'groups' ? GroupsSettingsSection() : ''}
            ${subTab === 'fixtures' ? FixturesSettingsSection() : ''}
            ${subTab === 'knockout' ? KnockoutSettingsSection() : ''}
            ${subTab === 'courts' ? CourtsSettingsSection() : ''}
            ${subTab === 'scoring' ? ScoringSettingsSection() : ''}
            ${subTab === 'danger' ? DangerZoneSection() : ''}
        </div>
    `;
}

function TeamsSettingsSection() {
    const editingTeamId = state.editingTeamId || null;
    
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Manage Teams</h3>
        
        <!-- Add Team Form -->
        <div class="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 class="font-semibold text-gray-700 mb-3">Add New Team</h4>
            <div class="grid gap-4 md:grid-cols-2">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 1 Name</label>
                    <input type="text" id="new-player1-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="e.g. John" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 1 Rating (0-5)</label>
                    <input type="number" id="new-player1-rating" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="3.5" min="0" max="5" step="0.1" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 2 Name</label>
                    <input type="text" id="new-player2-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="e.g. Jane" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Player 2 Rating (0-5)</label>
                    <input type="number" id="new-player2-rating" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="3.0" min="0" max="5" step="0.1" />
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-600 mb-1">Team Name (optional)</label>
                <input type="text" id="new-team-name" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" placeholder="Auto-generated if empty" />
            </div>
            <button onclick="addNewTeam()" class="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors">
                + Add Team
            </button>
        </div>
        
        <!-- Team List -->
        <h4 class="font-semibold text-gray-700 mb-3">Current Teams (${state.teams.length})</h4>
        ${state.teams.length === 0 ? `
            <p class="text-gray-400 text-center py-8">No teams added yet</p>
        ` : `
            <div class="space-y-3">
                ${state.teams.map(team => {
                    const colourClass = getTeamColourClass(team.id);
                    const isEditing = editingTeamId === team.id;
                    
                    if (isEditing) {
                        return `
                            <div class="p-4 bg-purple-50 rounded-xl border-2 border-purple-300">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="team-mini-badge ${colourClass}">${team.id}</div>
                                    <span class="font-semibold text-purple-700">Editing Team</span>
                                </div>
                                <div class="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Player 1</label>
                                        <input type="text" id="edit-p1-name-${team.id}" value="${team.player1Name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                                        <input type="number" id="edit-p1-rating-${team.id}" value="${team.player1Rating}" min="0" max="5" step="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Player 2</label>
                                        <input type="text" id="edit-p2-name-${team.id}" value="${team.player2Name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-600 mb-1">Rating</label>
                                        <input type="number" id="edit-p2-rating-${team.id}" value="${team.player2Rating}" min="0" max="5" step="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Team Name</label>
                                    <input type="text" id="edit-team-name-${team.id}" value="${team.name}" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" />
                                </div>
                                <div class="mt-3 flex gap-2">
                                    <button onclick="saveTeamEdit(${team.id})" class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-sm transition-colors">
                                        ✓ Save
                                    </button>
                                    <button onclick="cancelTeamEdit()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-sm transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        `;
                    }
                    
                    return `
                        <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                            <div class="team-mini-badge ${colourClass}">${team.id}</div>
                            <div class="flex-1 min-w-0">
                                <div class="font-semibold text-gray-800">${team.name}</div>
                                <div class="text-sm text-gray-500">${team.player1Name} (${team.player1Rating}) & ${team.player2Name} (${team.player2Rating})</div>
                                <div class="text-xs text-gray-400">Combined: ${team.combinedRating.toFixed(1)} • Group ${team.group || 'Unassigned'}</div>
                            </div>
                            <div class="flex gap-1 items-center">
                                <button onclick="startTeamEdit(${team.id})" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit team">
                                    ✏️
                                </button>
                                <button onclick="removeTeam(${team.id})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove team">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `}
    `;
}

function GroupsSettingsSection() {
    const activeGroups = state.getActiveGroupLetters();
    const groupCount = activeGroups.length;
    const groupColors = CONFIG.GROUP_COLORS;

    const modeOptions = [
        { value: 'nine_groups', label: 'Nine Groups (A-I)' },
        { value: 'six_groups', label: 'Six Groups (A-F)' },
        { value: 'four_groups', label: 'Four Groups (A-D)' },
        { value: 'two_groups', label: 'Two Groups (A & B)' },
        { value: 'single_group', label: 'Single Group' }
    ];

    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Group Settings</h3>

        <!-- Group Mode -->
        <div class="mb-6">
            <label class="block text-sm font-medium text-gray-600 mb-2">Group Mode</label>
            <div class="flex flex-wrap gap-4">
                ${modeOptions.map(opt => `
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="group-mode" value="${opt.value}" ${state.groupMode === opt.value ? 'checked' : ''} onchange="setGroupMode('${opt.value}')" class="w-4 h-4 text-purple-500" />
                        <span>${opt.label}</span>
                    </label>
                `).join('')}
            </div>
        </div>

        <!-- Split & Generate Buttons -->
        <div class="flex flex-wrap gap-4 mb-6">
            <button onclick="splitTeams()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors" ${state.teams.length < 2 ? 'disabled' : ''}>
                Split Teams into Groups
            </button>
            <button onclick="generateFixtures()" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors" ${state.groupA.length === 0 ? 'disabled' : ''}>
                Generate Fixtures
            </button>
        </div>

        <!-- Swap mode banner -->
        ${state.swapSourceTeamId ? (() => {
            const t = state.getTeamById(state.swapSourceTeamId);
            return `
                <div class="mb-4 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between">
                    <div class="text-sm text-amber-800">
                        🔄 <strong>${t?.name || '?'}</strong> selected — click another team to swap, or
                    </div>
                    <button onclick="cancelSwap()" class="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-semibold rounded-lg">Cancel</button>
                </div>
            `;
        })() : `
            <p class="mb-3 text-sm text-gray-500">💡 Click any team to swap it with another team in any group.</p>
        `}

        <!-- Current Groups -->
        <div class="grid gap-4 ${groupCount <= 2 ? 'md:grid-cols-2' : groupCount <= 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-3'}">
            ${activeGroups.map(g => {
                const data = state[`group${g}`];
                const color = groupColors[g];
                return `
                    <div class="bg-${color}-50 rounded-xl p-4">
                        <h4 class="font-semibold text-${color}-800 mb-2">Group ${g} (${data.length} teams)</h4>
                        ${data.length === 0 ? `
                            <p class="text-${color}-400 text-sm">No teams assigned</p>
                        ` : `
                            <ul class="text-sm space-y-1">
                                ${data.map(id => {
                                    const team = state.getTeamById(id);
                                    const isSelected = state.swapSourceTeamId === id;
                                    const cls = isSelected
                                        ? `bg-amber-300 text-amber-900 ring-2 ring-amber-500`
                                        : `text-${color}-700 hover:bg-${color}-100`;
                                    return `<li><button onclick="handleTeamClickForSwap(${id})" class="w-full text-left px-2 py-1 rounded transition-colors ${cls}">${team?.name || 'Unknown'}</button></li>`;
                                }).join('')}
                            </ul>
                        `}
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Qualifiers per Group (only relevant for four_groups) -->
        ${state.groupMode === CONFIG.GROUP_MODES.FOUR_GROUPS ? `
        <div class="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <label class="block text-sm font-semibold text-purple-800 mb-3">Teams qualifying per group</label>
            <div class="space-y-2">
                ${[
                    { v: 4, label: '4 per group', hint: '16 teams: R16 → QF → SF → Final' },
                    { v: 2, label: '2 per group', hint: '8 teams: QF → SF → Final' },
                    { v: 1, label: '1 per group', hint: '4 teams: SF → Final' }
                ].map(opt => `
                    <label class="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                        <input type="radio" name="qualifiers-per-group" value="${opt.v}"
                            ${state.qualifiersPerGroup === opt.v ? 'checked' : ''}
                            onchange="setQualifiersPerGroup(${opt.v})"
                            class="w-4 h-4 text-purple-500" />
                        <div>
                            <span class="font-medium text-sm text-gray-800">${opt.label}</span>
                            <span class="text-xs text-gray-500 ml-1">- ${opt.hint}</span>
                        </div>
                    </label>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- 3rd Place Toggle -->
        <div class="mt-6">
            <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" ${state.includeThirdPlace ? 'checked' : ''} onchange="toggleThirdPlace(this.checked)" class="w-5 h-5 text-purple-500 rounded" />
                <span class="font-medium text-gray-700">Include 3rd Place Playoff</span>
            </label>
        </div>
    `;
}

function FixturesSettingsSection() {
    const activeGroups = state.getActiveGroupLetters();
    const allFixtures = {};
    activeGroups.forEach(g => { allFixtures[g] = state[`group${g}Fixtures`] || []; });
    const groupColors = CONFIG.GROUP_COLORS;

    const renderFixtureList = (fixtures, group) => {
        if (fixtures.length === 0) {
            return `<p class="text-gray-400 text-sm py-4">No fixtures generated for Group ${group}</p>`;
        }
        
        return fixtures.map((round, roundIdx) => `
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h5 class="text-sm font-semibold text-gray-600">Round ${round.round}</h5>
                </div>
                <div class="space-y-2">
                    ${round.matches.map((match, matchIdx) => {
                        const team1 = state.getTeamById(match.team1Id);
                        const team2 = state.getTeamById(match.team2Id);
                        const globalMatchIdx = roundIdx * 10 + matchIdx; // Unique index for swapping
                        return `
                            <div class="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200" data-group="${group}" data-round="${roundIdx}" data-match="${matchIdx}">
                                <span class="text-xs text-gray-400 w-6">${matchIdx + 1}</span>
                                <div class="flex-1 text-sm">
                                    <span class="font-medium">${team1?.name || 'TBD'}</span>
                                    <span class="text-gray-400 mx-2">vs</span>
                                    <span class="font-medium">${team2?.name || 'TBD'}</span>
                                </div>
                                <div class="flex gap-1">
                                    ${roundIdx > 0 ? `
                                        <button onclick="moveFixtureUp('${group}', ${roundIdx}, ${matchIdx})" class="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Move to previous round">
                                            ↑
                                        </button>
                                    ` : ''}
                                    ${roundIdx < fixtures.length - 1 ? `
                                        <button onclick="moveFixtureDown('${group}', ${roundIdx}, ${matchIdx})" class="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded" title="Move to next round">
                                            ↓
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `).join('');
    };
    
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Manage Fixtures</h3>
        
        <div class="bg-amber-50 rounded-xl p-4 mb-6">
            <p class="text-sm text-amber-800">
                <span class="font-semibold">💡 Tip:</span> You can move matches between rounds using the arrows. 
                This is useful for scheduling matches on specific days or courts.
            </p>
        </div>
        
        <div class="flex flex-wrap gap-4 mb-6">
            <button onclick="regenerateFixtures()" class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">
                🔄 Regenerate All Fixtures
            </button>
            <button onclick="shuffleFixtureOrder()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
                🎲 Shuffle Match Order
            </button>
        </div>
        
        <div class="grid gap-6 ${activeGroups.length >= 2 ? 'md:grid-cols-2' : ''}">
            ${activeGroups.map(g => `
                <div class="bg-${groupColors[g]}-50 rounded-xl p-4">
                    <h4 class="font-semibold text-${groupColors[g]}-800 mb-3 flex items-center gap-2">
                        <span class="w-6 h-6 rounded bg-${groupColors[g]}-500 text-white flex items-center justify-center text-xs font-bold">${g}</span>
                        Group ${g} Fixtures
                    </h4>
                    ${renderFixtureList(allFixtures[g], g)}
                </div>
            `).join('')}
        </div>
    `;
}

function CourtsSettingsSection() {
    // Initialize court names if not set
    const courtNames = state.courtNames || {
        group: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
        knockout: {
            qf1: 'Court 1', qf2: 'Court 2', qf3: 'Court 3', qf4: 'Court 4',
            sf1: 'Centre Court', sf2: 'Court 1',
            thirdPlace: 'Court 1',
            final: 'Centre Court'
        }
    };
    
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Court Names</h3>
        
        <p class="text-sm text-gray-600 mb-6">
            Assign court names to matches. These will be displayed on the fixtures page.
        </p>
        
        <!-- Number of Courts -->
        <div class="mb-8 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <label class="block text-sm font-semibold text-purple-800 mb-2">Number of courts available</label>
            <p class="text-xs text-purple-700 mb-3">How many group-stage matches can be played at the same time. Fixtures will be split into "court rounds" of this many concurrent matches.</p>
            <input
                type="number"
                min="1"
                max="16"
                value="${state.courtCount || 4}"
                onchange="updateCourtCount(this.value)"
                class="w-24 px-3 py-2 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none text-lg font-semibold text-center"
            />
        </div>

        <!-- Group Stage Courts -->
        <div class="mb-8">
            <h4 class="font-semibold text-gray-700 mb-3">Group Stage Court Names</h4>
            <p class="text-xs text-gray-500 mb-3">Optional friendly names for each court (used in fixtures display)</p>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                ${Array.from({length: Math.min(state.courtCount || 4, 16)}, (_, i) => i).map(i => `
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Court ${i + 1}</label>
                        <input 
                            type="text" 
                            id="court-group-${i}" 
                            value="${courtNames.group?.[i] || `Court ${i + 1}`}" 
                            onchange="updateCourtName('group', ${i}, this.value)"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" 
                            placeholder="Court ${i + 1}" 
                        />
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Knockout Stage Courts -->
        <div>
            <h4 class="font-semibold text-gray-700 mb-3">Knockout Stage Courts</h4>
            
            <!-- Quarter Finals -->
            <div class="mb-6">
                <h5 class="text-sm font-medium text-gray-600 mb-2">Quarter Finals</h5>
                <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    ${['qf1', 'qf2', 'qf3', 'qf4'].map((match, i) => `
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">${state.knockoutNames?.[match] || match.toUpperCase()}</label>
                            <input 
                                type="text" 
                                id="court-${match}" 
                                value="${courtNames.knockout?.[match] || `Court ${i + 1}`}" 
                                onchange="updateCourtName('knockout', '${match}', this.value)"
                                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" 
                            />
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Semi Finals -->
            <div class="mb-6">
                <h5 class="text-sm font-medium text-gray-600 mb-2">Semi Finals</h5>
                <div class="grid gap-4 md:grid-cols-2">
                    ${['sf1', 'sf2'].map((match, i) => `
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">${state.knockoutNames?.[match] || match.toUpperCase()}</label>
                            <input 
                                type="text" 
                                id="court-${match}" 
                                value="${courtNames.knockout?.[match] || (i === 0 ? 'Centre Court' : 'Court 1')}" 
                                onchange="updateCourtName('knockout', '${match}', this.value)"
                                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" 
                            />
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- 3rd Place & Final -->
            <div class="grid gap-4 md:grid-cols-2">
                ${state.includeThirdPlace ? `
                    <div>
                        <h5 class="text-sm font-medium text-gray-600 mb-2">3rd Place Playoff</h5>
                        <input 
                            type="text" 
                            id="court-thirdPlace" 
                            value="${courtNames.knockout?.thirdPlace || 'Court 1'}" 
                            onchange="updateCourtName('knockout', 'thirdPlace', this.value)"
                            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" 
                        />
                    </div>
                ` : ''}
                <div>
                    <h5 class="text-sm font-medium text-gray-600 mb-2">Final</h5>
                    <input 
                        type="text" 
                        id="court-final" 
                        value="${courtNames.knockout?.final || 'Centre Court'}" 
                        onchange="updateCourtName('knockout', 'final', this.value)"
                        class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none" 
                    />
                </div>
            </div>
        </div>
    `;
}

function KnockoutSettingsSection() {
    const currentFormat = state.knockoutFormat || 'quarter_final';
    const hasKnockoutStarted = checkKnockoutHasStarted();
    
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Knockout Format</h3>
        
        ${hasKnockoutStarted ? `
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p class="text-amber-800 text-sm">
                    ⚠️ <strong>Knockout matches have started.</strong> Changing the format now may affect existing scores.
                </p>
            </div>
        ` : ''}
        
        <p class="text-gray-600 mb-4">Choose how many knockout rounds to play after the group stage.</p>
        
        <div class="space-y-3">
            <label class="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${currentFormat === 'quarter_final' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
                <input type="radio" name="knockout-format-setting" value="quarter_final" 
                    ${currentFormat === 'quarter_final' ? 'checked' : ''}
                    onchange="updateKnockoutFormat('quarter_final')"
                    class="w-5 h-5 text-purple-600" />
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">🏆 Full Knockout (Quarter Finals)</div>
                    <div class="text-sm text-gray-500">Quarter Finals → Semi Finals → Final (+ optional 3rd place)</div>
                    <div class="text-xs text-purple-600 mt-1">Best for 8+ teams advancing from groups</div>
                </div>
            </label>
            
            <label class="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${currentFormat === 'semi_final' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
                <input type="radio" name="knockout-format-setting" value="semi_final" 
                    ${currentFormat === 'semi_final' ? 'checked' : ''}
                    onchange="updateKnockoutFormat('semi_final')"
                    class="w-5 h-5 text-purple-600" />
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">🥈 Semi Finals Only</div>
                    <div class="text-sm text-gray-500">Semi Finals → Final (+ optional 3rd place)</div>
                    <div class="text-xs text-purple-600 mt-1">Best for 4 teams advancing from groups</div>
                </div>
            </label>
            
            <label class="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${currentFormat === 'final_only' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
                <input type="radio" name="knockout-format-setting" value="final_only" 
                    ${currentFormat === 'final_only' ? 'checked' : ''}
                    onchange="updateKnockoutFormat('final_only')"
                    class="w-5 h-5 text-purple-600" />
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">🥇 Final Only</div>
                    <div class="text-sm text-gray-500">Straight to the Final (+ optional 3rd place)</div>
                    <div class="text-xs text-purple-600 mt-1">Best for 2 teams advancing from groups</div>
                </div>
            </label>
        </div>
        
        <!-- Third Place Option -->
        <div class="mt-6 pt-6 border-t border-gray-200">
            <h4 class="font-semibold text-gray-800 mb-3">Third Place Playoff</h4>
            <label class="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${state.includeThirdPlace ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}">
                <input type="checkbox" 
                    ${state.includeThirdPlace ? 'checked' : ''}
                    onchange="updateIncludeThirdPlace(this.checked)"
                    class="w-5 h-5 text-purple-600 rounded" />
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">Include 3rd Place Match</div>
                    <div class="text-sm text-gray-500">Semi-final losers play for 3rd place</div>
                </div>
            </label>
        </div>
    `;
}

function checkKnockoutHasStarted() {
    // Check if any knockout scores have been entered
    const scores = state.knockoutScores || {};
    for (const key in scores) {
        if (scores[key] && (scores[key].team1Score !== null || scores[key].team2Score !== null)) {
            return true;
        }
    }
    return false;
}

function ScoringSettingsSection() {
    return `
        <h3 class="text-lg font-bold text-gray-800 mb-4">Scoring Settings</h3>
        
        <div class="grid gap-6 md:grid-cols-2">
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Group Match Max Score</label>
                <input type="number" value="${state.groupMaxScore}" onchange="updateGroupMaxScore(this.value)" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" min="1" max="50" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Quarter Final Max Score</label>
                <input type="number" value="${state.knockoutMaxScore}" onchange="updateKnockoutMaxScore(this.value)" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" min="1" max="50" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Semi Final Max Score</label>
                <input type="number" value="${state.semiMaxScore}" onchange="updateSemiMaxScore(this.value)" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" min="1" max="50" />
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Final Max Score</label>
                <input type="number" value="${state.finalMaxScore}" onchange="updateFinalMaxScore(this.value)" class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none" min="1" max="50" />
            </div>
        </div>
    `;
}

function DangerZoneSection() {
    return `
        <h3 class="text-lg font-bold text-red-600 mb-4">⚠️ Danger Zone</h3>
        
        <div class="space-y-4">
            <div class="bg-red-50 rounded-xl p-4">
                <h4 class="font-semibold text-red-800 mb-2">Reset All Scores</h4>
                <p class="text-sm text-red-600 mb-3">Clear all group and knockout scores. Teams and fixtures will be kept.</p>
                <button onclick="confirmResetScores()" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
                    Reset Scores
                </button>
            </div>
            
            <div class="bg-gray-50 rounded-xl p-4">
                <h4 class="font-semibold text-gray-800 mb-2">Export Tournament Data</h4>
                <p class="text-sm text-gray-600 mb-3">Download all tournament data as JSON.</p>
                <button onclick="exportTournamentData()" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    📥 Export Data
                </button>
            </div>
        </div>
    `;
}

// ===== MAIN APP COMPONENT =====

const TeamLeagueApp = {
    render() {
        if (!state || !state.isInitialized) {
            document.getElementById('app').innerHTML = `
                <div class="min-h-screen flex items-center justify-center">
                    <div class="text-center">
                        <div class="animate-spin w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"></div>
                        <p class="text-gray-500">Loading tournament...</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const currentTab = state.currentTab || 'fixtures';
        const activeGroupCount = state.getActiveGroupLetters().length;

        document.getElementById('app').innerHTML = `
            <div class="min-h-screen">
                <!-- Shared Header -->
                ${renderTournamentHeader({
                    format: 'team-league',
                    tournamentId: state.tournamentId,
                    tournamentName: state.tournamentName || 'Team Tournament',
                    isOrganiser: state.isOrganiser,
                    subtitle: (state.teams?.length || 0) + ' teams • ' + activeGroupCount + ' group' + (activeGroupCount !== 1 ? 's' : '')
                })}
                
                <!-- Tabs -->
                <div class="bg-white border-b border-gray-100">
                    <div class="max-w-5xl mx-auto px-4">
                        <div class="flex gap-1 overflow-x-auto py-3" style="-webkit-overflow-scrolling: touch;">
                            <button onclick="setTab('fixtures')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'fixtures' ? 'tab-active' : 'tab-inactive'}">
                                📋 Fixtures
                            </button>
                            <button onclick="setTab('standings')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'standings' ? 'tab-active' : 'tab-inactive'}">
                                📊 Standings
                            </button>
                            <button onclick="setTab('knockout')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'knockout' ? 'tab-active' : 'tab-inactive'}">
                                🏆 Knockout
                            </button>
                            <button onclick="setTab('partners')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'partners' ? 'tab-active' : 'tab-inactive'}">
                                👥 Teams
                            </button>
                            ${state.canEdit() ? `
                                <button onclick="setTab('settings')" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${currentTab === 'settings' ? 'tab-active' : 'tab-inactive'}">
                                    ⚙️ Settings
                                </button>
                            ` : `
                                <button onclick="showOrganiserLoginModal()" class="px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all bg-purple-100 text-purple-700 hover:bg-purple-200">
                                    🔑 Organiser Login
                                </button>
                            `}
                        </div>
                    </div>
                </div>
                
                <!-- Tab Content -->
                <div class="max-w-5xl mx-auto px-4 py-6">
                    ${currentTab === 'fixtures' ? FixturesTab() : ''}
                    ${currentTab === 'standings' ? StandingsTab() : ''}
                    ${currentTab === 'knockout' ? KnockoutTab() : ''}
                    ${currentTab === 'partners' ? PartnersTab() : ''}
                    ${currentTab === 'settings' ? SettingsTab() : ''}
                </div>
            </div>
        `;

        // Check for tournament completion and show share prompt
        setTimeout(function() {
            if (typeof ResultCard !== 'undefined' && typeof getCardData === 'function') {
                var completedA = state.getCompletedGroupMatches ? state.getCompletedGroupMatches('A') : 0;
                var totalA = state.getTotalGroupMatches ? state.getTotalGroupMatches('A') : 0;
                var completedB = state.getCompletedGroupMatches ? state.getCompletedGroupMatches('B') : 0;
                var totalB = state.getTotalGroupMatches ? state.getTotalGroupMatches('B') : 0;
                var total = totalA + totalB;
                var completed = completedA + completedB;
                if (completed === total && total > 0) {
                    ResultCard.showCompletionModal(getCardData());
                }
            }
        }, 500);
    }
};

console.log('✅ Team Tournament Components loaded');
