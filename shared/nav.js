/**
 * Shared Navigation Component
 * 
 * Adds consistent navigation bar to all pages.
 * Include this script and call initNav() on page load.
 */

const NAV_CONFIG = {
    // Paths relative to site root
    home: '/',
    quickPlay: '/#quick-play',
    competitions: '/competitions/browse.html',
    login: '/account/login.html',
    profile: '/account/profile.html',
    logo: '/uberpadel-icon.svg'
};

/**
 * Calculate the correct path based on current page depth
 */
function getNavPath(path) {
    // Get current path depth
    const currentPath = window.location.pathname;
    const depth = (currentPath.match(/\//g) || []).length - 1;
    
    // For root-relative paths starting with /
    if (path.startsWith('/')) {
        if (depth === 0) {
            return '.' + path;
        } else if (depth === 1) {
            return '..' + path;
        } else if (depth === 2) {
            return '../..' + path;
        } else if (depth === 3) {
            return '../../..' + path;
        }
    }
    return path;
}

/**
 * Create the navigation HTML
 */
function createNavHTML(user) {
    const homePath = getNavPath(NAV_CONFIG.home);
    const quickPlayPath = getNavPath(NAV_CONFIG.quickPlay);
    const competitionsPath = getNavPath(NAV_CONFIG.competitions);
    const loginPath = getNavPath(NAV_CONFIG.login);
    const profilePath = getNavPath(NAV_CONFIG.profile);
    const logoPath = getNavPath(NAV_CONFIG.logo);
    
    const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';
    const userName = user?.name || 'Account';
    
    const signedInDisplay = user ? 'flex' : 'none';
    const signedOutDisplay = user ? 'none' : 'block';
    
    return `
    <nav id="shared-nav" class="bg-white/95 backdrop-blur-md border-b border-gray-100 fixed top-0 left-0 right-0 z-[9999]" style="box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div class="max-w-6xl mx-auto px-4 py-3">
            <div class="flex items-center justify-between">
                <a href="${homePath}" class="flex items-center gap-2">
                    <img src="${logoPath}" alt="Uber Padel" class="w-8 h-8">
                    <span class="font-bold text-lg text-gray-800">Uber Padel</span>
                </a>
                <div class="flex items-center gap-3 md:gap-6">
                    <a href="${quickPlayPath}" class="text-blue-600 hover:text-blue-700 font-medium text-sm md:text-base transition-colors">Quick Play</a>
                    <a href="${competitionsPath}" class="text-purple-600 hover:text-purple-700 font-medium text-sm md:text-base transition-colors">Competitions</a>
                    
                    <!-- Signed In State -->
                    <div id="shared-nav-signed-in" class="items-center gap-3" style="display: ${signedInDisplay};">
                        <a href="${profilePath}" class="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">
                            <span id="shared-nav-user-initial" class="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">${userInitial}</span>
                            <span id="shared-nav-user-name" class="hidden md:inline">${userName}</span>
                        </a>
                        <button onclick="sharedNavSignOut()" class="text-gray-400 hover:text-red-500 transition-colors" title="Sign out">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <!-- Signed Out State -->
                    <a href="${loginPath}" id="shared-nav-sign-in" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors" style="display: ${signedOutDisplay};">
                        Sign In
                    </a>
                </div>
            </div>
        </div>
    </nav>
    <div id="shared-nav-spacer" style="height: 60px;"></div>
    `;
}

/**
 * Update nav display when auth state changes
 */
function updateSharedNav(user) {
    const signedIn = document.getElementById('shared-nav-signed-in');
    const signedOut = document.getElementById('shared-nav-sign-in');
    const userInitial = document.getElementById('shared-nav-user-initial');
    const userName = document.getElementById('shared-nav-user-name');
    
    if (!signedIn || !signedOut) return;
    
    if (user) {
        signedIn.style.display = 'flex';
        signedOut.style.display = 'none';
        if (userInitial) userInitial.textContent = user.name ? user.name.charAt(0).toUpperCase() : '?';
        if (userName) userName.textContent = user.name || 'Account';
    } else {
        signedIn.style.display = 'none';
        signedOut.style.display = 'block';
    }
}

/**
 * Handle sign out from nav
 */
async function sharedNavSignOut() {
    if (typeof AuthService !== 'undefined') {
        await AuthService.signOut();
        window.location.href = getNavPath(NAV_CONFIG.home);
    }
}

/**
 * Initialize the navigation bar
 * Only adds nav on landing pages that don't have their own nav
 * Tournament views have their own header via tournament-header.js
 */
function initSharedNav() {
    // Don't add if nav already exists
    if (document.getElementById('shared-nav')) return;
    
    // Don't add if another nav already exists (landing pages have their own)
    if (document.querySelector('nav')) return;
    
    // Don't add on tournament views - they have their own header
    const hash = window.location.hash;
    if (hash && hash.includes('/t/')) {
        return; // Tournament view - don't add shared nav
    }
    
    // Get current user
    let currentUser = null;
    if (typeof AuthService !== 'undefined') {
        currentUser = AuthService.getCurrentUser();
    }
    
    // Insert nav at the start of body
    const navHTML = createNavHTML(currentUser);
    document.body.insertAdjacentHTML('afterbegin', navHTML);
    
    // Listen for auth changes
    if (typeof AuthService !== 'undefined') {
        AuthService.onAuthStateChanged((user) => {
            updateSharedNav(user);
        });
    }
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSharedNav);
} else {
    // DOM already loaded, init now but with a small delay to ensure AuthService is ready
    setTimeout(initSharedNav, 100);
}
