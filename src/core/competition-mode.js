/**
 * competition-mode.js
 * Handles competition integration for Quick Play tournaments
 * 
 * Include this AFTER the main format JS files.
 * Detects ?comp= parameter and auto-loads competition players.
 */

(function() {
    'use strict';
    
    // Competition state
    let competitionData = null;
    let competitionId = null;
    let confirmedPlayers = [];
    let syncInterval = null;
    
    // Firebase config (shared)
    const firebaseConfig = {
        apiKey: "AIzaSyDHnMaQMwH9R3yEVQPV1M_RPWz9gF3IBJI",
        authDomain: "stretford-padel-tournament.firebaseapp.com",
        databaseURL: "https://stretford-padel-tournament-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "stretford-padel-tournament",
        storageBucket: "stretford-padel-tournament.appspot.com",
        messagingSenderId: "802492722498",
        appId: "1:802492722498:web:ea2c0cd65ea2c0f40df9ee"
    };
    
    /**
     * Check if running in competition mode
     */
    function isCompetitionMode() {
        const params = new URLSearchParams(window.location.search);
        return !!(params.get('comp') || params.get('competition'));
    }
    
    /**
     * Get competition ID from URL
     */
    function getCompetitionId() {
        const params = new URLSearchParams(window.location.search);
        return params.get('comp') || params.get('competition');
    }
    
    /**
     * Initialize Firebase if not already done
     */
    function ensureFirebase() {
        if (!window.firebase) {
            console.error('Firebase not loaded');
            return null;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        return firebase.database();
    }
    
    /**
     * Load competition data
     */
    async function loadCompetition() {
        competitionId = getCompetitionId();
        if (!competitionId) return null;
        
        const db = ensureFirebase();
        if (!db) return null;
        
        try {
            const snapshot = await db.ref(`competitions/${competitionId}`).once('value');
            competitionData = snapshot.val();
            
            if (competitionData && competitionData.registrations) {
                confirmedPlayers = [];
                Object.entries(competitionData.registrations).forEach(([id, reg]) => {
                    if (reg.status === 'confirmed') {
                        confirmedPlayers.push({
                            id,
                            name: reg.name,
                            level: reg.level
                        });
                    }
                });
            }
            
            return competitionData;
        } catch (e) {
            console.error('Error loading competition:', e);
            return null;
        }
    }
    
    /**
     * Get confirmed player names
     */
    function getPlayerNames() {
        return confirmedPlayers.map(p => p.name);
    }
    
    /**
     * Get player count
     */
    function getPlayerCount() {
        return confirmedPlayers.length;
    }
    
    /**
     * Get competition info
     */
    function getCompetitionInfo() {
        if (!competitionData) return null;
        return {
            id: competitionId,
            name: competitionData.name,
            format: competitionData.format,
            date: competitionData.schedule?.date,
            time: competitionData.schedule?.time,
            location: competitionData.location?.name,
            courts: competitionData.courts || 2,
            organizer: competitionData.organizer?.name
        };
    }
    
    /**
     * Create competition banner HTML
     */
    function createBanner() {
        const info = getCompetitionInfo();
        if (!info) return '';
        
        const dateStr = info.date ? new Date(info.date).toLocaleDateString('en-GB', { 
            weekday: 'short', day: 'numeric', month: 'short' 
        }) : '';
        
        return `
            <div id="competition-banner" style="
                background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                color: white;
                padding: 12px 16px;
                border-radius: 12px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
            ">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">🏆</span>
                    <div>
                        <div style="font-weight: 600; font-size: 14px;">${escapeHtml(info.name)}</div>
                        <div style="font-size: 12px; opacity: 0.9;">
                            ${info.location || ''}${dateStr ? ' • ' + dateStr : ''} • ${getPlayerCount()} players
                        </div>
                    </div>
                </div>
                <a href="/competitions/dashboard.html?id=${competitionId}" 
                   style="
                       background: rgba(255,255,255,0.2);
                       color: white;
                       padding: 8px 14px;
                       border-radius: 8px;
                       text-decoration: none;
                       font-size: 13px;
                       font-weight: 500;
                       transition: background 0.2s;
                   "
                   onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                   onmouseout="this.style.background='rgba(255,255,255,0.2)'"
                >
                    Dashboard →
                </a>
            </div>
        `;
    }
    
    /**
     * Insert banner into page
     */
    function insertBanner() {
        const banner = createBanner();
        if (!banner) return;
        
        // Try different insertion points
        const targets = [
            document.querySelector('.max-w-5xl.mx-auto'),
            document.querySelector('#app > div'),
            document.querySelector('#app'),
            document.body.firstElementChild
        ];
        
        for (const target of targets) {
            if (target) {
                target.insertAdjacentHTML('afterbegin', banner);
                break;
            }
        }
    }
    
    /**
     * Sync tournament data to competitions location for dashboard
     */
    async function syncToCompetition() {
        if (!competitionId || !window.state) return;
        
        const db = ensureFirebase();
        if (!db) return;
        
        try {
            // Get current standings
            let standings = [];
            if (typeof window.state.calculateStandings === 'function') {
                standings = window.state.calculateStandings();
            }
            
            // Calculate current round
            let currentRound = 1;
            let matchesPlayed = 0;
            let totalMatches = 0;
            
            if (window.state.scores) {
                const scores = window.state.scores;
                Object.values(scores).forEach(s => {
                    totalMatches++;
                    if (s && s.team1 !== null && s.team1 !== -1 && s.team2 !== null && s.team2 !== -1) {
                        matchesPlayed++;
                    }
                });
                
                // Estimate current round based on matches and courts
                const courtCount = window.state.courtCount || 1;
                currentRound = Math.floor(matchesPlayed / courtCount) + 1;
            }
            
            // Build matches data
            const matches = {};
            if (window.state.scores && typeof getFixtures === 'function') {
                const fixtures = getFixtures(window.state.playerCount, window.state.courtCount);
                fixtures.forEach((fixture, idx) => {
                    const score = window.state.getScoreByFixture ? 
                        window.state.getScoreByFixture(idx) : 
                        window.state.scores[`f_${idx}`] || { team1: null, team2: null };
                    
                    const roundIdx = Math.floor(idx / window.state.courtCount);
                    const matchIdx = idx % window.state.courtCount;
                    
                    matches[`r${roundIdx}_m${matchIdx}`] = {
                        round: roundIdx + 1,
                        court: matchIdx + 1,
                        team1: fixture.teams[0].map(n => window.state.playerNames[n-1] || `Player ${n}`),
                        team2: fixture.teams[1].map(n => window.state.playerNames[n-1] || `Player ${n}`),
                        score1: score.team1 !== null && score.team1 !== -1 ? score.team1 : null,
                        score2: score.team2 !== null && score.team2 !== -1 ? score.team2 : null,
                        completed: score.team1 !== null && score.team1 !== -1 && score.team2 !== null && score.team2 !== -1
                    };
                });
            }
            
            // Sync to tournaments location (used by dashboard)
            const tournamentKey = competitionData?.tournamentKey || competitionId;
            await db.ref(`tournaments/${tournamentKey}`).update({
                competitionId,
                standings: standings.map(s => ({
                    name: s.name,
                    points: s.score || 0,
                    played: s.gamesPlayed || 0,
                    won: s.wins || 0,
                    lost: s.losses || 0,
                    pointsFor: s.pointsFor || 0,
                    pointsAgainst: s.pointsAgainst || 0
                })),
                matches,
                currentRound,
                matchesPlayed,
                totalMatches,
                playerCount: window.state.playerCount,
                courtCount: window.state.courtCount,
                updatedAt: new Date().toISOString()
            });
            
        } catch (e) {
            console.error('Error syncing to competition:', e);
        }
    }
    
    /**
     * Start periodic sync
     */
    function startSync() {
        if (!isCompetitionMode()) return;
        
        // Initial sync after a short delay
        setTimeout(syncToCompetition, 2000);
        
        // Sync every 5 seconds
        syncInterval = setInterval(syncToCompetition, 5000);
        
        // Also sync on score changes by hooking saveToFirebase if available
        if (window.state && typeof window.state.saveToFirebase === 'function') {
            const originalSave = window.state.saveToFirebase.bind(window.state);
            window.state.saveToFirebase = function() {
                originalSave();
                setTimeout(syncToCompetition, 500);
            };
        }
    }
    
    /**
     * Stop sync
     */
    function stopSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }
    
    /**
     * Hook into tournament creation to pre-fill players
     */
    function hookTournamentCreation() {
        // Store original createTournament if it exists
        if (typeof window.createTournament === 'function') {
            const originalCreate = window.createTournament;
            
            window.createTournament = async function(name, passcode, playerCount, courtCount, modeSettings) {
                // If in competition mode, use competition players
                if (isCompetitionMode() && confirmedPlayers.length > 0) {
                    playerCount = Math.min(playerCount, confirmedPlayers.length);
                }
                
                const result = await originalCreate(name, passcode, playerCount, courtCount, modeSettings);
                
                // If successful and in competition mode, update player names
                if (result && result.tournamentId && isCompetitionMode()) {
                    await updatePlayerNamesFromCompetition(result.tournamentId);
                    await linkTournamentToCompetition(result.tournamentId);
                }
                
                return result;
            };
        }
    }
    
    /**
     * Update player names in tournament from competition
     */
    async function updatePlayerNamesFromCompetition(tournamentId) {
        if (confirmedPlayers.length === 0) return;
        
        const db = ensureFirebase();
        if (!db) return;
        
        try {
            const playerNames = {};
            confirmedPlayers.forEach((p, i) => {
                playerNames[i] = p.name;
            });
            
            // Get the Firebase root (e.g., 'americano-tournaments')
            const root = window.CONFIG?.FIREBASE_ROOT || 'tournaments';
            await db.ref(`${root}/${tournamentId}/playerNames`).set(playerNames);
            
        } catch (e) {
            console.error('Error updating player names:', e);
        }
    }
    
    /**
     * Link tournament to competition
     */
    async function linkTournamentToCompetition(tournamentId) {
        if (!competitionId) return;
        
        const db = ensureFirebase();
        if (!db) return;
        
        try {
            // Save link in competition
            await db.ref(`competitions/${competitionId}/tournamentKey`).set(tournamentId);
            
            // Save competition ID in tournament
            const root = window.CONFIG?.FIREBASE_ROOT || 'tournaments';
            await db.ref(`${root}/${tournamentId}/meta/competitionId`).set(competitionId);
            
        } catch (e) {
            console.error('Error linking tournament:', e);
        }
    }
    
    /**
     * Hook into wizard to auto-fill settings
     */
    function hookWizard() {
        // Hook showCreateModal if it exists
        if (typeof window.showCreateModal === 'function') {
            const originalShow = window.showCreateModal;
            
            window.showCreateModal = function() {
                originalShow();
                
                // If in competition mode, pre-fill name
                if (isCompetitionMode() && competitionData) {
                    setTimeout(() => {
                        const nameInput = document.getElementById('create-name-input');
                        if (nameInput) {
                            nameInput.value = competitionData.name || '';
                        }
                    }, 150);
                }
            };
        }
        
        // Hook goToWizardStep2 to auto-select player count
        if (typeof window.goToWizardStep2 === 'function') {
            const originalStep2 = window.goToWizardStep2;
            
            window.goToWizardStep2 = function() {
                originalStep2();
                
                if (isCompetitionMode() && confirmedPlayers.length > 0) {
                    setTimeout(() => {
                        const countSelect = document.getElementById('create-player-count');
                        if (countSelect) {
                            const count = confirmedPlayers.length;
                            // Find closest valid option
                            const options = Array.from(countSelect.options);
                            const closest = options.reduce((prev, curr) => {
                                return Math.abs(parseInt(curr.value) - count) < Math.abs(parseInt(prev.value) - count) ? curr : prev;
                            });
                            countSelect.value = closest.value;
                            
                            // Show notice
                            const notice = document.createElement('div');
                            notice.className = 'text-sm text-blue-600 mt-2 p-2 bg-blue-50 rounded-lg';
                            notice.innerHTML = `<strong>${count} players</strong> registered in competition`;
                            countSelect.parentElement.appendChild(notice);
                        }
                    }, 100);
                }
            };
        }
        
        // Hook goToWizardStep3 to auto-select court count from competition
        if (typeof window.goToWizardStep3 === 'function') {
            const originalStep3 = window.goToWizardStep3;
            
            window.goToWizardStep3 = function() {
                originalStep3();
                
                if (isCompetitionMode() && competitionData && competitionData.courts) {
                    setTimeout(() => {
                        const courtSelect = document.getElementById('create-court-count');
                        if (courtSelect) {
                            courtSelect.value = competitionData.courts;
                        }
                    }, 100);
                }
            };
        }
    }
    
    /**
     * Save tournament results back to competition
     */
    async function saveResults(standings) {
        if (!competitionId) return;
        
        const db = ensureFirebase();
        if (!db) return;
        
        try {
            await db.ref(`competitions/${competitionId}/results`).set({
                standings,
                completedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error('Error saving results:', e);
        }
    }
    
    /**
     * Escape HTML
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    /**
     * Initialize competition mode
     */
    async function init() {
        if (!isCompetitionMode()) return;
        
        console.log('🏆 Competition mode detected');
        
        // Load competition data
        await loadCompetition();
        
        if (!competitionData) {
            console.warn('Competition not found');
            return;
        }
        
        console.log(`Loaded competition: ${competitionData.name} with ${confirmedPlayers.length} players`);
        
        // Hook into existing functions
        hookTournamentCreation();
        hookWizard();
        
        // Insert banner after page renders
        setTimeout(insertBanner, 500);
        
        // Start syncing data to competition location
        setTimeout(startSync, 1000);
        
        // Re-insert banner on route changes (for SPA)
        const observer = new MutationObserver(() => {
            if (!document.getElementById('competition-banner')) {
                insertBanner();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Clean up on page unload
        window.addEventListener('beforeunload', stopSync);
    }
    
    // Expose to global scope
    window.CompetitionMode = {
        isActive: isCompetitionMode,
        getPlayerNames,
        getPlayerCount,
        getCompetitionInfo,
        saveResults,
        syncToCompetition,
        init
    };
    
    // Auto-initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
