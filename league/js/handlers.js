// ===== LEAGUE EVENT HANDLERS =====

// ===== TAB NAVIGATION =====

function setTab(tab) {
    if (!state) return;
    state.currentTab = tab;
    renderLeague();
}

function setSettingsSubTab(subTab) {
    if (!state) return;
    state.settingsSubTab = subTab;
    renderLeague();
}

// ===== SCORE MODAL =====

/**
 * Show modal to enter/edit a match score (best of 3 sets).
 *
 * @param {number} weekNumber  - Week index within the current season.
 * @param {number} matchIndex  - Match position within the week fixtures array.
 * @param {Object} match       - Match object { team1Id, team2Id, score, ... }.
 */
function showScoreModal(weekNumber, matchIndex, match) {
    if (!state) return;

    const team1 = state.getTeam(match.team1Id);
    const team2 = state.getTeam(match.team2Id);
    const team1Name = team1 ? team1.name : ('Team ' + match.team1Id);
    const team2Name = team2 ? team2.name : ('Team ' + match.team2Id);

    // Pre-fill from existing score
    const existing = match.score && match.score.sets ? match.score.sets : [];
    const s = [
        existing[0] || [null, null],
        existing[1] || [null, null],
        existing[2] || [null, null]
    ];

    const val = (v) => (v !== null && v !== undefined ? v : '');

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">Enter Match Score</h2>
                    <p class="text-indigo-200 text-sm mt-1">Week ${parseInt(weekNumber) + 1} &middot; Best of 3 sets</p>
                </div>
                <div class="p-6 space-y-5">
                    <!-- Team names header -->
                    <div class="flex items-center justify-between text-sm font-semibold">
                        <span class="text-gray-800 flex-1 text-center">${_escHtml(team1Name)}</span>
                        <span class="text-gray-400 w-8 text-center">vs</span>
                        <span class="text-gray-800 flex-1 text-center">${_escHtml(team2Name)}</span>
                    </div>

                    <!-- Set rows -->
                    ${[0, 1, 2].map(i => `
                        <div id="score-set-row-${i}" class="flex items-center gap-3 ${i === 2 ? 'hidden' : ''}">
                            <span class="text-xs font-semibold text-gray-500 w-10">Set ${i + 1}</span>
                            <input type="number" id="score-t1-set${i}" min="0" max="7"
                                value="${val(s[i][0])}"
                                oninput="_onSetScoreInput()"
                                class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-center text-lg font-bold focus:border-indigo-500 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <span class="text-gray-400 font-bold">-</span>
                            <input type="number" id="score-t2-set${i}" min="0" max="7"
                                value="${val(s[i][1])}"
                                oninput="_onSetScoreInput()"
                                class="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-center text-lg font-bold focus:border-indigo-500 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>
                    `).join('')}

                    <!-- Winner preview -->
                    <div id="score-winner-preview" class="text-center text-sm font-semibold text-gray-400"></div>

                    <!-- Validation error -->
                    <div id="score-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3">
                        <p class="text-sm text-red-600 font-medium" id="score-error-msg"></p>
                    </div>

                    <!-- Buttons -->
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="_submitScore(${weekNumber}, ${matchIndex})" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">Save Score</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Show set 3 row if existing score has 1-1
    _onSetScoreInput();
}

/**
 * Called on every set score input change.
 * Shows / hides Set 3 row based on whether sets are 1-1.
 * Updates the winner preview text.
 */
function _onSetScoreInput() {
    const read = (id) => {
        const el = document.getElementById(id);
        if (!el || el.value === '') return null;
        const v = parseInt(el.value);
        return isNaN(v) ? null : Math.max(0, Math.min(7, v));
    };

    let t1Wins = 0;
    let t2Wins = 0;

    for (let i = 0; i < 2; i++) {
        const a = read('score-t1-set' + i);
        const b = read('score-t2-set' + i);
        if (a !== null && b !== null) {
            if (a > b) t1Wins++;
            else if (b > a) t2Wins++;
        }
    }

    // Show / hide set 3 row
    const set3Row = document.getElementById('score-set-row-2');
    if (set3Row) {
        if (t1Wins === 1 && t2Wins === 1) {
            set3Row.classList.remove('hidden');
        } else {
            set3Row.classList.add('hidden');
            // Clear set 3 inputs when hidden
            const s3a = document.getElementById('score-t1-set2');
            const s3b = document.getElementById('score-t2-set2');
            if (s3a && t1Wins !== 1) s3a.value = '';
            if (s3b && t2Wins !== 1) s3b.value = '';
        }
    }

    // Include set 3 in winner calc if visible
    if (t1Wins === 1 && t2Wins === 1) {
        const a = read('score-t1-set2');
        const b = read('score-t2-set2');
        if (a !== null && b !== null) {
            if (a > b) t1Wins++;
            else if (b > a) t2Wins++;
        }
    }

    // Update winner preview
    const preview = document.getElementById('score-winner-preview');
    if (preview) {
        if (t1Wins >= 2) {
            preview.textContent = 'Winner: Team A (2-' + t2Wins + ')';
            preview.className = 'text-center text-sm font-semibold text-indigo-600';
        } else if (t2Wins >= 2) {
            preview.textContent = 'Winner: Team B (' + t1Wins + '-2)';
            preview.className = 'text-center text-sm font-semibold text-indigo-600';
        } else {
            preview.textContent = '';
            preview.className = 'text-center text-sm font-semibold text-gray-400';
        }
    }
}

/**
 * Validate and submit the score modal.
 */
async function _submitScore(weekNumber, matchIndex) {
    const read = (id) => {
        const el = document.getElementById(id);
        if (!el || el.value === '') return null;
        const v = parseInt(el.value);
        return isNaN(v) ? null : Math.max(0, Math.min(7, v));
    };

    const showError = (msg) => {
        const errDiv = document.getElementById('score-error');
        const errMsg = document.getElementById('score-error-msg');
        if (errDiv && errMsg) {
            errMsg.textContent = msg;
            errDiv.classList.remove('hidden');
        }
    };

    // Read set scores
    const sets = [];
    let t1Wins = 0;
    let t2Wins = 0;

    for (let i = 0; i < 3; i++) {
        // Set 3 only required if visible
        if (i === 2) {
            const row = document.getElementById('score-set-row-2');
            if (row && row.classList.contains('hidden')) continue;
        }

        const a = read('score-t1-set' + i);
        const b = read('score-t2-set' + i);

        if (a === null || b === null) {
            showError('Please enter scores for Set ' + (i + 1));
            return;
        }
        if (a === b) {
            showError('Set ' + (i + 1) + ' cannot be a tie');
            return;
        }

        sets.push([a, b]);
        if (a > b) t1Wins++;
        else t2Wins++;
    }

    // Validate best-of-3 result
    if (t1Wins < 2 && t2Wins < 2) {
        showError('A valid best-of-3 result requires one team to win 2 sets');
        return;
    }

    const winner = t1Wins >= 2 ? 1 : 2;

    const scoreData = {
        sets: sets,
        winner: winner
    };

    // Save to Firebase
    const seasonNumber = state.getActiveSeason();
    const success = await saveMatchScore(state.leagueId, seasonNumber, weekNumber, matchIndex, scoreData);

    if (success) {
        closeModal();
        showToast('Score saved');
        state.reloadData();
    } else {
        showError('Failed to save score. Please try again.');
    }
}

// ===== EDIT TEAM MODAL =====

/**
 * Show modal to edit an existing team's details.
 *
 * @param {string} teamId - ID of the team to edit.
 */
function showEditTeamModal(teamId) {
    if (!state) return;

    const team = state.getTeam(teamId);
    if (!team) {
        showToast('Team not found');
        return;
    }

    // Build division dropdown options
    const divisionOptions = state.divisions.map((div, i) => {
        const selected = team.division === div.index ? 'selected' : '';
        return `<option value="${div.index}" ${selected}>${_escHtml(div.name)}</option>`;
    }).join('');

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">Edit Team</h2>
                </div>
                <div class="p-6 space-y-4">
                    <!-- Team name -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Team Name</label>
                        <input type="text" id="edit-team-name" value="${_escAttr(team.name || '')}"
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                            placeholder="e.g. The Smashers" maxlength="40" />
                    </div>

                    <!-- Players -->
                    ${[1,2,3,4].map(p => `
                    <div class="grid grid-cols-3 gap-3">
                        <div class="col-span-2">
                            <label class="block text-sm font-semibold text-gray-700 mb-1">Player ${p}${p > 2 ? ' <span class="text-gray-400 font-normal">(optional)</span>' : ''}</label>
                            <input type="text" id="edit-p${p}-name" value="${_escAttr(team['player' + p + 'Name'] || '')}"
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                                placeholder="Name" maxlength="30" />
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-1">Rating</label>
                            <input type="number" id="edit-p${p}-rating" value="${team['player' + p + 'Rating'] ?? ''}"
                                min="1" max="10" step="0.5"
                                class="w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-center"
                                placeholder="1-10" />
                        </div>
                    </div>
                    `).join('')}

                    <!-- Division -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Division</label>
                        <div class="relative">
                            <select id="edit-team-division"
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors appearance-none">
                                ${divisionOptions}
                            </select>
                            <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">&#9660;</div>
                        </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="flex gap-3 pt-2">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="_saveEditTeam('${teamId}')" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">Save</button>
                    </div>

                    <!-- Delete -->
                    <button onclick="_deleteTeam('${teamId}')" class="w-full px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors text-sm border border-red-200">Delete Team</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => document.getElementById('edit-team-name')?.focus(), 100);
}

/**
 * Save changes from the edit team modal to Firebase.
 */
async function _saveEditTeam(teamId) {
    const name = document.getElementById('edit-team-name')?.value?.trim();
    const division = parseInt(document.getElementById('edit-team-division')?.value);

    const playerNames = [];
    const teamData = { division: !isNaN(division) ? division : 0 };
    let combinedRating = 0;

    for (let p = 1; p <= 4; p++) {
        const pName = document.getElementById(`edit-p${p}-name`)?.value?.trim();
        const pRating = parseFloat(document.getElementById(`edit-p${p}-rating`)?.value);
        const validRating = (!isNaN(pRating) && pRating >= 1 && pRating <= 10) ? pRating : null;

        if (pName) {
            teamData['player' + p + 'Name'] = pName;
            teamData['player' + p + 'Rating'] = validRating;
            combinedRating += validRating || 0;
            playerNames.push(pName);
        } else {
            teamData['player' + p + 'Name'] = null;
            teamData['player' + p + 'Rating'] = null;
        }
    }

    if (playerNames.length < 2) {
        showToast('Please enter at least 2 player names');
        return;
    }

    teamData.name = name || playerNames.slice(0, 2).join(' & ');
    teamData.combinedRating = combinedRating;

    const success = await setLeagueData(state.leagueId, `teams/${teamId}`, teamData);

    if (success) {
        closeModal();
        showToast('Team updated');
        state.reloadData();
    } else {
        showToast('Failed to save team');
    }
}

/**
 * Delete a team after confirmation.
 */
async function _deleteTeam(teamId) {
    const team = state.getTeam(teamId);
    const teamName = team ? team.name : teamId;

    if (!confirm('Delete team "' + teamName + '"? This cannot be undone.')) return;

    const success = await setLeagueData(state.leagueId, `teams/${teamId}`, null);

    if (success) {
        closeModal();
        showToast('Team deleted');
        state.reloadData();
    } else {
        showToast('Failed to delete team');
    }
}

// ===== ADD TEAM MODAL =====

/**
 * Show modal to add a new team, optionally pre-selecting a division.
 *
 * @param {number} [divisionIndex=0] - Division to pre-select.
 */
function showAddTeamModal(divisionIndex) {
    if (!state) return;

    divisionIndex = divisionIndex ?? 0;

    const divisionOptions = state.divisions.map((div) => {
        const selected = div.index === divisionIndex ? 'selected' : '';
        return `<option value="${div.index}" ${selected}>${_escHtml(div.name)}</option>`;
    }).join('');

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">Add New Team</h2>
                </div>
                <div class="p-6 space-y-4">
                    <!-- Team name -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Team Name</label>
                        <input type="text" id="add-team-name"
                            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                            placeholder="e.g. The Smashers" maxlength="40" />
                    </div>

                    <!-- Players -->
                    ${[1,2,3,4].map(p => `
                    <div class="grid grid-cols-3 gap-3">
                        <div class="col-span-2">
                            <label class="block text-sm font-semibold text-gray-700 mb-1">Player ${p}${p > 2 ? ' <span class="text-gray-400 font-normal">(optional)</span>' : ''}</label>
                            <input type="text" id="add-p${p}-name"
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                                placeholder="Name" maxlength="30" />
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-1">Rating</label>
                            <input type="number" id="add-p${p}-rating"
                                min="1" max="10" step="0.5"
                                class="w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-center"
                                placeholder="1-10" />
                        </div>
                    </div>
                    `).join('')}

                    <!-- Division -->
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Division</label>
                        <div class="relative">
                            <select id="add-team-division"
                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors appearance-none">
                                ${divisionOptions}
                            </select>
                            <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">&#9660;</div>
                        </div>
                    </div>

                    <!-- Buttons -->
                    <div class="flex gap-3 pt-2">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="_submitAddTeam()" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">Add Team</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => document.getElementById('add-p1-name')?.focus(), 100);
}

/**
 * Validate and save the new team from the add-team modal.
 */
async function _submitAddTeam() {
    const name = document.getElementById('add-team-name')?.value?.trim();
    const division = parseInt(document.getElementById('add-team-division')?.value);

    const playerNames = [];
    const teamData = {
        division: !isNaN(division) ? division : 0,
        createdAt: new Date().toISOString()
    };
    let combinedRating = 0;

    for (let p = 1; p <= 4; p++) {
        const pName = document.getElementById(`add-p${p}-name`)?.value?.trim();
        const pRating = parseFloat(document.getElementById(`add-p${p}-rating`)?.value);
        const validRating = (!isNaN(pRating) && pRating >= 1 && pRating <= 10) ? pRating : null;

        if (pName) {
            teamData['player' + p + 'Name'] = pName;
            teamData['player' + p + 'Rating'] = validRating;
            combinedRating += validRating || 0;
            playerNames.push(pName);
        }
    }

    if (playerNames.length < 2) {
        showToast('Please enter at least 2 player names');
        return;
    }

    const teamId = _generateTeamId();
    teamData.name = name || playerNames.slice(0, 2).join(' & ');
    teamData.combinedRating = combinedRating;

    const success = await setLeagueData(state.leagueId, `teams/${teamId}`, teamData);

    if (success) {
        closeModal();
        showToast('Team "' + teamData.name + '" added');
        state.reloadData();
    } else {
        showToast('Failed to add team');
    }
}

/**
 * Generate a unique team ID (8-char alphanumeric).
 */
function _generateTeamId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = 't_';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// ===== SHARE MODAL =====

/**
 * Show modal with shareable links for the league.
 */
function showShareModal() {
    if (!state) return;

    const playerLink = Router.getPlayerLink(state.leagueId);
    const organiserLink = state.organiserKey ? Router.getOrganiserLink(state.leagueId, state.organiserKey) : null;

    // Build social share buttons if SocialShare is available
    const shareButtonsHTML = typeof SocialShare !== 'undefined'
        ? SocialShare.getShareButtons(
            state.leagueName || 'Padel League',
            state.leagueId,
            'league',
            playerLink,
            []
        )
        : '';

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">Share League</h2>
                </div>
                <div class="p-6 space-y-4">
                    ${shareButtonsHTML}

                    <div class="text-center mb-4">
                        <div class="text-lg font-bold text-gray-800">${_escHtml(state.leagueName || 'Padel League')}</div>
                        <div class="text-sm text-gray-500">Code: <span class="font-mono font-bold text-indigo-600">${(state.leagueId || '').toUpperCase()}</span></div>
                    </div>

                    <!-- Player link -->
                    <div class="bg-indigo-50 rounded-xl p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-sm font-semibold text-indigo-800">Player Link</span>
                            <button onclick="copyToClipboard('${playerLink}'); this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000)" class="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-lg font-medium transition-colors">Copy</button>
                        </div>
                        <div class="text-xs text-indigo-600 font-mono break-all bg-white p-2 rounded-lg">${playerLink}</div>
                    </div>

                    ${organiserLink ? `
                        <!-- Organiser link -->
                        <div class="bg-amber-50 rounded-xl p-4">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-semibold text-amber-800">Organiser Link</span>
                                <button onclick="copyToClipboard('${organiserLink}'); this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000)" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors">Copy</button>
                            </div>
                            <div class="text-xs text-amber-700 font-mono break-all bg-white p-2 rounded-lg">${organiserLink}</div>
                            <p class="text-xs text-amber-600 mt-2">Keep this private -- only for organisers.</p>
                        </div>
                    ` : ''}

                    <!-- QR code placeholder -->
                    <div class="bg-gray-50 rounded-xl p-4 text-center">
                        <div class="text-sm font-semibold text-gray-600 mb-2">QR Code</div>
                        <div id="share-qr-code" class="inline-block bg-white p-4 rounded-lg border border-gray-200">
                            <div class="w-32 h-32 flex items-center justify-center text-gray-300 text-xs">QR code</div>
                        </div>
                    </div>

                    <button onclick="closeModal()" class="w-full px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Done</button>
                </div>
            </div>
        </div>
    `;
}

// ===== MATCH ACTIONS MODAL (ORGANISER) =====

/**
 * Show organiser action menu for a specific match.
 *
 * @param {number} weekNumber  - Week index.
 * @param {number} matchIndex  - Match index within the week.
 * @param {Object} match       - Match object.
 */
function showMatchActionsModal(weekNumber, matchIndex, match) {
    if (!state || !state.canEdit()) return;

    const team1 = state.getTeam(match.team1Id);
    const team2 = state.getTeam(match.team2Id);
    const team1Name = team1 ? team1.name : ('Team ' + match.team1Id);
    const team2Name = team2 ? team2.name : ('Team ' + match.team2Id);
    const isCompleted = state.isMatchComplete(match);
    const isPostponed = match.status === CONFIG.MATCH_STATUS.POSTPONED;
    const isCancelled = match.status === CONFIG.MATCH_STATUS.CANCELLED;

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
                    <h2 class="text-lg font-bold text-white">Match Actions</h2>
                    <p class="text-indigo-200 text-sm mt-1">${_escHtml(team1Name)} vs ${_escHtml(team2Name)}</p>
                </div>
                <div class="p-4 space-y-2">
                    ${isCompleted ? `
                        <button onclick="closeModal(); showScoreModal(${weekNumber}, ${matchIndex}, ${_escAttr(JSON.stringify(match))})"
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 transition-colors text-left">
                            <span class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-sm">&#9998;</span>
                            <span class="font-medium text-gray-800">Edit Score</span>
                        </button>
                    ` : `
                        <button onclick="closeModal(); showScoreModal(${weekNumber}, ${matchIndex}, ${_escAttr(JSON.stringify(match))})"
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 transition-colors text-left">
                            <span class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-sm">&#9998;</span>
                            <span class="font-medium text-gray-800">Enter Score</span>
                        </button>
                    `}

                    ${!isPostponed ? `
                        <button onclick="closeModal(); handlePostponeMatch(${weekNumber}, ${matchIndex})"
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-50 transition-colors text-left">
                            <span class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 text-sm">&#9200;</span>
                            <span class="font-medium text-gray-800">Postpone Match</span>
                        </button>
                    ` : ''}

                    ${!isCancelled ? `
                        <button onclick="closeModal(); handleCancelMatch(${weekNumber}, ${matchIndex})"
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-left">
                            <span class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm">&#10005;</span>
                            <span class="font-medium text-gray-800">Cancel Match</span>
                        </button>
                    ` : ''}

                    <!-- Reschedule -->
                    <button onclick="_showRescheduleForm(${weekNumber}, ${matchIndex})"
                        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors text-left">
                        <span class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm">&#128197;</span>
                        <span class="font-medium text-gray-800">Reschedule</span>
                    </button>

                    <!-- Reschedule inline form (hidden by default) -->
                    <div id="reschedule-form" class="hidden bg-blue-50 rounded-xl p-4 space-y-3">
                        <div>
                            <label class="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                            <input type="date" id="reschedule-date" value="${match.date || ''}"
                                class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm" />
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-600 mb-1">Time</label>
                            <input type="time" id="reschedule-time" value="${match.time || ''}"
                                class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-sm" />
                        </div>
                        <button onclick="_submitReschedule(${weekNumber}, ${matchIndex})"
                            class="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm transition-colors">Save New Date</button>
                    </div>

                    ${(isCompleted || isPostponed || isCancelled) ? `
                        <button onclick="closeModal(); _resetMatchToScheduled(${weekNumber}, ${matchIndex})"
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors text-left">
                            <span class="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 text-sm">&#8634;</span>
                            <span class="font-medium text-gray-800">Reset to Scheduled</span>
                        </button>
                    ` : ''}

                    <div class="pt-2">
                        <button onclick="closeModal()" class="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-colors text-sm">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Toggle visibility of the reschedule date/time form inside the match actions modal.
 */
function _showRescheduleForm(weekNumber, matchIndex) {
    const form = document.getElementById('reschedule-form');
    if (form) {
        form.classList.toggle('hidden');
    }
}

/**
 * Submit reschedule date/time for a match.
 */
async function _submitReschedule(weekNumber, matchIndex) {
    const date = document.getElementById('reschedule-date')?.value;
    const time = document.getElementById('reschedule-time')?.value;

    if (!date) {
        showToast('Please select a date');
        return;
    }

    const seasonNumber = state.getActiveSeason();
    const path = `seasons/${seasonNumber}/fixtures/${weekNumber}/${matchIndex}`;

    const updates = { date: date };
    if (time) updates.time = time;
    updates.status = CONFIG.MATCH_STATUS.SCHEDULED;

    const success = await updateLeagueInFirebase(state.leagueId, path, updates);

    if (success) {
        closeModal();
        showToast('Match rescheduled');
        state.reloadData();
    } else {
        showToast('Failed to reschedule match');
    }
}

/**
 * Reset a match back to scheduled status, clearing any score.
 */
async function _resetMatchToScheduled(weekNumber, matchIndex) {
    if (!confirm('Reset this match to scheduled? Any existing score will be cleared.')) return;

    const seasonNumber = state.getActiveSeason();
    const path = `seasons/${seasonNumber}/fixtures/${weekNumber}/${matchIndex}`;

    const success = await updateLeagueInFirebase(state.leagueId, path, {
        status: CONFIG.MATCH_STATUS.SCHEDULED,
        score: null
    });

    if (success) {
        showToast('Match reset to scheduled');
        state.reloadData();
    } else {
        showToast('Failed to reset match');
    }
}

// ===== MATCH STATUS HANDLERS =====

/**
 * Postpone a match.
 *
 * @param {number} weekNumber  - Week index.
 * @param {number} matchIndex  - Match index.
 */
async function handlePostponeMatch(weekNumber, matchIndex) {
    if (!state || !state.canEdit()) return;

    if (!confirm('Postpone this match?')) return;

    const seasonNumber = state.getActiveSeason();
    const success = await updateMatchStatus(state.leagueId, seasonNumber, weekNumber, matchIndex, CONFIG.MATCH_STATUS.POSTPONED);

    if (success) {
        showToast('Match postponed');
        state.reloadData();
    } else {
        showToast('Failed to postpone match');
    }
}

/**
 * Cancel a match.
 *
 * @param {number} weekNumber  - Week index.
 * @param {number} matchIndex  - Match index.
 */
async function handleCancelMatch(weekNumber, matchIndex) {
    if (!state || !state.canEdit()) return;

    if (!confirm('Cancel this match? This can be reversed later.')) return;

    const seasonNumber = state.getActiveSeason();
    const success = await updateMatchStatus(state.leagueId, seasonNumber, weekNumber, matchIndex, CONFIG.MATCH_STATUS.CANCELLED);

    if (success) {
        showToast('Match cancelled');
        state.reloadData();
    } else {
        showToast('Failed to cancel match');
    }
}

// ===== END SEASON / NEW SEASON =====

/**
 * End the current season:
 * - Confirm with the organiser
 * - Calculate final standings per division
 * - Determine promoted / relegated teams
 * - Store promotions data in Firebase
 * - Show the promotion/relegation summary modal
 */
async function handleEndSeason() {
    if (!state || !state.canEdit()) return;

    const seasonNumber = state.getActiveSeason();
    const progress = state.getSeasonProgress(seasonNumber);

    let confirmMsg = 'End Season ' + seasonNumber + '?';
    if (progress.percentage < 100) {
        confirmMsg += '\n\nWarning: only ' + progress.percentage + '% of matches have been completed.';
    }
    if (!confirm(confirmMsg)) return;

    // Calculate promotions/relegations for each division
    const promotions = [];

    for (const division of state.divisions) {
        const divIndex = division.index;
        const standings = state.getStandings(seasonNumber, divIndex);
        const promoted = state.getPromotionZone(seasonNumber, divIndex);
        const relegated = state.getRelegationZone(seasonNumber, divIndex);

        promotions.push({
            divisionIndex: divIndex,
            divisionName: division.name,
            standings: standings,
            promoted: promoted,
            relegated: relegated
        });
    }

    // Save promotions data and mark season as completed
    const updates = {};
    updates[`seasons/${seasonNumber}/status`] = CONFIG.SEASON_STATUS.COMPLETED;
    updates[`seasons/${seasonNumber}/promotions`] = promotions.map(p => ({
        divisionIndex: p.divisionIndex,
        promoted: p.promoted,
        relegated: p.relegated
    }));

    const success = await updateLeagueInFirebase(state.leagueId, null, updates);

    if (success) {
        showToast('Season ' + seasonNumber + ' completed');
        state.reloadData();
        showPromotionSummaryModal(promotions);
    } else {
        showToast('Failed to end season');
    }
}

/**
 * Start a new season:
 * - Apply promotions / relegations (move teams between divisions)
 * - Increment the season number
 * - Generate a new schedule via Scheduler
 * - Save everything to Firebase
 * - Navigate to the new season overview
 */
async function handleStartNewSeason() {
    if (!state || !state.canEdit()) return;

    const oldSeason = state.getActiveSeason();
    const oldSeasonData = state.seasons[oldSeason];

    if (!confirm('Start a new season? Promoted and relegated teams will be moved between divisions.')) return;

    // 1. Read promotions from the completed season
    const promotionsData = oldSeasonData && oldSeasonData.promotions ? oldSeasonData.promotions : [];

    // Apply promotions/relegations to team division assignments
    const teamUpdates = {};

    for (const promo of promotionsData) {
        // Promoted teams move up (lower division index = higher tier)
        if (promo.promoted && promo.promoted.length > 0) {
            const targetDiv = promo.divisionIndex - 1;
            if (targetDiv >= 0) {
                promo.promoted.forEach(teamId => {
                    if (state.teams[teamId]) {
                        teamUpdates[teamId] = { division: targetDiv };
                    }
                });
            }
        }

        // Relegated teams move down
        if (promo.relegated && promo.relegated.length > 0) {
            const targetDiv = promo.divisionIndex + 1;
            if (targetDiv < state.divisions.length) {
                promo.relegated.forEach(teamId => {
                    if (state.teams[teamId]) {
                        teamUpdates[teamId] = { division: targetDiv };
                    }
                });
            }
        }
    }

    // 2. Apply team division changes
    for (const teamId in teamUpdates) {
        state.teams[teamId].division = teamUpdates[teamId].division;
    }

    // 3. Increment season
    const newSeasonNumber = oldSeason + 1;

    // 4. Build division data for the scheduler
    const divisionInputs = state.divisions.map(div => ({
        index: div.index,
        name: div.name,
        teamIds: state.getTeamsByDivision(div.index).map(t => t.teamId)
    }));

    // 5. Generate new schedule
    const schedule = Scheduler.generateSchedule(divisionInputs, {
        matchDay: state.settings.matchDay,
        matchTime: state.settings.matchTime,
        courts: state.settings.courts
    });

    // 6. Save to Firebase
    const fbUpdates = {};
    fbUpdates['currentSeason'] = newSeasonNumber;
    fbUpdates[`seasons/${newSeasonNumber}`] = {
        status: CONFIG.SEASON_STATUS.ACTIVE,
        fixtures: schedule.fixtures,
        weekCount: schedule.weekCount,
        startedAt: new Date().toISOString()
    };

    // Save updated team divisions
    for (const teamId in teamUpdates) {
        fbUpdates[`teams/${teamId}/division`] = teamUpdates[teamId].division;
    }

    fbUpdates['meta/updatedAt'] = new Date().toISOString();

    const success = await updateLeagueInFirebase(state.leagueId, null, fbUpdates);

    if (success) {
        closeModal();
        showToast('Season ' + newSeasonNumber + ' started');
        state.reloadData();
    } else {
        showToast('Failed to start new season');
    }
}

// ===== PROMOTION SUMMARY MODAL =====

/**
 * Show a modal summarising promotion and relegation across all divisions.
 *
 * @param {Array<{divisionIndex: number, divisionName: string, standings: Array, promoted: string[], relegated: string[]}>} promotions
 */
function showPromotionSummaryModal(promotions) {
    if (!state) return;

    const divisionsHTML = promotions.map(div => {
        const rows = div.standings.map(s => {
            const isPromoted = div.promoted.includes(s.teamId);
            const isRelegated = div.relegated.includes(s.teamId);

            let badge = '';
            let rowClass = '';
            if (isPromoted) {
                badge = '<span class="inline-flex items-center gap-1 text-xs font-bold text-green-600"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"/></svg>Promoted</span>';
                rowClass = 'bg-green-50';
            } else if (isRelegated) {
                badge = '<span class="inline-flex items-center gap-1 text-xs font-bold text-red-600"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>Relegated</span>';
                rowClass = 'bg-red-50';
            }

            return `
                <tr class="${rowClass}">
                    <td class="px-3 py-2 text-sm font-medium text-gray-800">${_escHtml(s.teamName)}</td>
                    <td class="px-3 py-2 text-sm text-center text-gray-600">${s.played}</td>
                    <td class="px-3 py-2 text-sm text-center font-bold text-gray-800">${s.points}</td>
                    <td class="px-3 py-2 text-right">${badge}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="mb-5">
                <h3 class="text-sm font-bold text-indigo-700 mb-2">${_escHtml(div.divisionName)}</h3>
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="px-3 py-1 text-xs font-semibold text-gray-500">Team</th>
                            <th class="px-3 py-1 text-xs font-semibold text-gray-500 text-center">P</th>
                            <th class="px-3 py-1 text-xs font-semibold text-gray-500 text-center">Pts</th>
                            <th class="px-3 py-1 text-xs font-semibold text-gray-500 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }).join('');

    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5 shrink-0">
                    <h2 class="text-xl font-bold text-white">Season Complete</h2>
                    <p class="text-indigo-200 text-sm mt-1">Promotion &amp; Relegation Summary</p>
                </div>
                <div class="p-6 overflow-y-auto">
                    <!-- Legend -->
                    <div class="flex items-center gap-4 mb-4 text-xs">
                        <span class="flex items-center gap-1 text-green-600 font-semibold">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7"/></svg>
                            Promoted
                        </span>
                        <span class="flex items-center gap-1 text-red-600 font-semibold">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>
                            Relegated
                        </span>
                    </div>

                    ${divisionsHTML}

                    <div class="flex gap-3 pt-4">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Close</button>
                        <button onclick="closeModal(); handleStartNewSeason()" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">Start New Season</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== ORGANISER LOGIN MODAL =====

function showOrganiserLoginModal() {
    document.getElementById('modal-container').innerHTML = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="if(event.target === this) closeModal()">
            <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5">
                    <h2 class="text-xl font-bold text-white">Organiser Login</h2>
                </div>
                <div class="p-6">
                    <p class="text-gray-600 mb-4">Enter the organiser passcode to manage this league.</p>
                    <div class="mb-4">
                        <input type="password" id="login-passcode" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-lg text-center" placeholder="Enter passcode" autofocus onkeypress="if(event.key === 'Enter') handleOrganiserLogin()" />
                    </div>
                    <div id="login-error" class="hidden bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                        <p class="text-sm text-red-600 font-medium">Incorrect passcode</p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="closeModal()" class="flex-1 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onclick="handleOrganiserLogin()" class="flex-1 px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors">Login</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => document.getElementById('login-passcode')?.focus(), 100);
}

async function handleOrganiserLogin() {
    if (!state) return;

    const passcode = document.getElementById('login-passcode')?.value;
    const errorDiv = document.getElementById('login-error');

    if (!passcode) {
        errorDiv?.classList.remove('hidden');
        return;
    }

    // This dialog takes the passcode, not the organiser key — they are
    // different secrets in a league. Keep the passcode out of the URL: access
    // comes from the claimant record the proof writes.
    const isValid = await state.verifyOrganiserPasscode(passcode);

    if (isValid) {
        closeModal();
        Router.navigate('league', state.leagueId, null);
        showToast('Logged in as organiser');
    } else {
        errorDiv?.classList.remove('hidden');
    }
}

// ===== MODAL / TOAST / CLIPBOARD UTILITIES =====

/**
 * Close any open modal by clearing #modal-container.
 */
function closeModal() {
    const container = document.getElementById('modal-container');
    if (container) {
        container.innerHTML = '';
    }
}

/**
 * Show a temporary toast notification.
 *
 * @param {string} message  - Text to display.
 * @param {number} [duration=2500] - Duration in ms before the toast fades.
 */
function showToast(message, duration) {
    duration = duration || 2500;

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg mb-2 animate-fade-in';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Copy text to clipboard with toast feedback.
 *
 * @param {string} text - The text to copy.
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard');
        } catch (e) {
            showToast('Failed to copy');
        }
        document.body.removeChild(textarea);
    });
}

// ===== EXPORT =====

/**
 * Export league data as a JSON download.
 */
function exportLeagueData() {
    if (!state) return;

    const data = {
        leagueId: state.leagueId,
        leagueName: state.leagueName,
        divisions: state.divisions,
        teams: state.teams,
        seasons: state.seasons,
        settings: state.settings,
        exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'league-' + (state.leagueId || 'export') + '-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Data exported');
}

// ===== INTERNAL HELPERS =====

/**
 * Escape HTML special characters to prevent XSS in template strings.
 */
function _escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escape a string for use inside an HTML attribute (doubles as JSON-safe for onclick).
 */
function _escAttr(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

console.log('League Handlers loaded');
