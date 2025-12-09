/**
 * Shared Tournament Header Component
 * 
 * Provides a consistent header across all tournament formats.
 * Include this script and call renderTournamentHeader() in your render function.
 */

const TOURNAMENT_HEADER_CONFIG = {
    americano: {
        emoji: '🔄',
        name: 'Americano',
        gradient: 'from-blue-600 via-blue-700 to-purple-800',
        accentColor: 'blue'
    },
    mexicano: {
        emoji: '🎯',
        name: 'Mexicano',
        gradient: 'from-teal-600 to-emerald-600',
        accentColor: 'teal'
    },
    mix: {
        emoji: '🏆',
        name: 'Mix Tournament',
        gradient: 'from-indigo-600 via-purple-600 to-pink-600',
        accentColor: 'purple'
    },
    'team-league': {
        emoji: '👥',
        name: 'Team League',
        gradient: 'from-purple-600 to-pink-600',
        accentColor: 'purple'
    }
};

/**
 * Render the tournament header
 * 
 * @param {object} options
 * @param {string} options.format - Format key (americano, mexicano, mix, team-league)
 * @param {string} options.tournamentId - Tournament code
 * @param {string} options.tournamentName - Tournament name/title
 * @param {boolean} options.isOrganiser - Whether current user is organiser
 * @param {function} options.onShare - Callback for share button click
 * @param {function} options.onOrganiserLogin - Callback for organiser login (only if not organiser)
 * @param {string} [options.subtitle] - Optional subtitle text
 * @returns {string} HTML string for the header
 */
function renderTournamentHeader(options) {
    const {
        format = 'americano',
        tournamentId = '',
        tournamentName = 'Tournament',
        isOrganiser = false,
        onShare = 'showShareModal',
        onOrganiserLogin = 'showOrganiserLoginModal',
        subtitle = ''
    } = options;
    
    const config = TOURNAMENT_HEADER_CONFIG[format] || TOURNAMENT_HEADER_CONFIG.americano;
    const homeUrl = './';
    const siteHomeUrl = getHeaderHomePath();
    
    return `
        <div class="tournament-header bg-gradient-to-r ${config.gradient} text-white sticky top-0 z-40">
            <div class="max-w-5xl mx-auto px-4 py-3">
                <div class="relative flex items-center justify-between">
                    
                    <!-- Left: Home + Format Logo -->
                    <div class="flex items-center gap-4 flex-shrink-0 z-10">
                        <!-- Site Home Link -->
                        <a href="${siteHomeUrl}" class="hover:opacity-80 transition-opacity" title="Back to Uber Padel">
                            <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                                </svg>
                            </div>
                        </a>
                        
                        <!-- Format Home Link -->
                        <a href="${homeUrl}" class="hover:opacity-80 transition-opacity" title="Back to ${config.name}">
                            <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-2xl">
                                ${config.emoji}
                            </div>
                        </a>
                    </div>
                    
                    <!-- Center: Title + Subtitle (absolute for true center) -->
                    <div class="absolute left-1/2 transform -translate-x-1/2 text-center pointer-events-none">
                        <h1 class="font-bold text-lg leading-tight">${tournamentName}</h1>
                        ${subtitle ? `<p class="text-sm text-white/70">${subtitle}</p>` : ''}
                    </div>
                    
                    <!-- Right: Status + Code + Share -->
                    <div class="flex items-center gap-2 flex-shrink-0 z-10">
                        ${isOrganiser ? `
                            <span class="hidden sm:inline-flex items-center gap-1 bg-amber-500/30 text-amber-100 px-2.5 py-1 rounded-lg text-xs font-medium">
                                <span>✏️</span>
                                <span>Organiser</span>
                            </span>
                        ` : `
                            <button onclick="${onOrganiserLogin}()" class="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                <span>🔑</span>
                                <span>Login</span>
                            </button>
                        `}
                        
                        <!-- Tournament Code + Share -->
                        <button onclick="${onShare}()" class="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl px-3 py-2 transition-colors" title="Share tournament">
                            <span class="font-mono font-bold tracking-wider text-sm">${tournamentId.toUpperCase()}</span>
                            <svg class="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                            </svg>
                        </button>
                    </div>
                    
                </div>
            </div>
        </div>
    `;
}

/**
 * Get path to site home based on current page depth
 */
function getHeaderHomePath() {
    const currentPath = window.location.pathname;
    const depth = (currentPath.match(/\//g) || []).length - 1;
    
    if (depth <= 1) return '../index.html';
    if (depth === 2) return '../../index.html';
    return '../../../index.html';
}

/**
 * Styles to add to pages using this header
 * These ensure the header looks consistent
 */
const TOURNAMENT_HEADER_STYLES = `
<style>
.tournament-header {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
`;
