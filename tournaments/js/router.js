/**
 * tournaments/js/router.js — Hash-based routing for the unified shell
 *
 * Pages:
 *   /tournaments/              — landing (same as browse)
 *   /tournaments/browse.html   — public listing
 *   /tournaments/create.html   — wizard
 *   /tournaments/detail.html#/t/:id        — public detail + register
 *   /tournaments/manage.html#/t/:id?key=K  — organiser dashboard
 *   /tournaments/invite.html?token=T       — Phase D
 *   /tournaments/claim-pair.html?claim=T   — Phase C
 */

const TournamentsRouter = {
    routes: {
        HOME:     'home',
        TOURNAMENT: 'tournament'
    },

    onRouteChange: null,

    init() {
        window.addEventListener('hashchange', () => this._handleRoute());
        this._handleRoute();
    },

    _handleRoute() {
        const hash = window.location.hash || '';
        const url  = new URL(window.location.href);
        const keyFromQuery = url.searchParams.get('key');
        const idFromQuery  = url.searchParams.get('id');

        // Pattern #/t/:id[?key=K]
        const m = hash.match(/^#\/t\/([a-zA-Z0-9]{4,24})/);
        if (m) {
            const id = m[1];
            // Support both hash-key (#/t/ABC?key=K — not valid URL, we parse it)
            // and query-key (/detail.html?id=ABC&key=K — more robust)
            const hashParams = new URLSearchParams(hash.split('?')[1] || '');
            const key = hashParams.get('key') || keyFromQuery;
            if (this.onRouteChange) {
                this.onRouteChange(this.routes.TOURNAMENT, id, key);
            }
            return;
        }

        // Query-based fallback (?id=... used by detail.html and manage.html)
        if (idFromQuery) {
            if (this.onRouteChange) {
                this.onRouteChange(this.routes.TOURNAMENT, idFromQuery, keyFromQuery);
            }
            return;
        }

        if (this.onRouteChange) this.onRouteChange(this.routes.HOME, null, null);
    },

    /**
     * Build a URL for a specific tournament page.
     */
    getUrl(page, tournamentId, organiserKey) {
        const base = `/tournaments/${page}.html`;
        const params = new URLSearchParams();
        if (tournamentId) params.set('id', tournamentId);
        if (organiserKey) params.set('key', organiserKey);
        const qs = params.toString();
        return qs ? `${base}?${qs}` : base;
    }
};

if (typeof window !== 'undefined') {
    window.TournamentsRouter = TournamentsRouter;
}
