/**
 * tournaments/js/main.js — Unified shell page dispatcher
 *
 * A single script loaded by every page in /tournaments/. It reads the
 * `data-page` attribute on <body> and invokes the right handler.
 *
 * Each page sets e.g. `<body data-page="browse">`.
 */

async function initializeTournamentsShell() {
    initializeFirebase();

    // Organiser identity is useful on every page (so "My tournaments" works
    // without needing a login). Firebase Anonymous auth is non-blocking.
    if (typeof OrganizerAuth !== 'undefined') {
        OrganizerAuth.init().catch(e => console.warn('OrganizerAuth init:', e));
    }

    const page = document.body.dataset.page || '';
    switch (page) {
        case 'browse': {
            await Handlers.handleBrowsePage();
            break;
        }
        case 'create': {
            Handlers.handleCreatePage();
            break;
        }
        case 'manage': {
            TournamentsRouter.onRouteChange = async (route, id, key) => {
                if (route === TournamentsRouter.routes.TOURNAMENT) {
                    await Handlers.handleManagePage(id, key);
                } else {
                    await Handlers.handleManagePage(null, null);
                }
            };
            TournamentsRouter.init();
            break;
        }
        case 'detail': {
            TournamentsRouter.onRouteChange = async (route, id /* , key */) => {
                if (route === TournamentsRouter.routes.TOURNAMENT) {
                    await Handlers.handleDetailPage(id);
                } else {
                    await Handlers.handleDetailPage(null);
                }
            };
            TournamentsRouter.init();
            break;
        }
        case 'index':
        default: {
            // Landing page defers to browse for the main listing
            await Handlers.handleBrowsePage();
        }
    }
}

// Auto-boot when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTournamentsShell);
} else {
    initializeTournamentsShell();
}
