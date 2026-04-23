/**
 * tournaments/js/handlers.js — Page handlers for the unified shell
 *
 * Each `handleXxxPage` function is the entry point for a page, invoked
 * from main.js after Firebase is initialised.
 */

const Handlers = {
    /**
     * Browse page — renders the postcode search bar + public tournament cards.
     */
    async handleBrowsePage() {
        const searchRoot = document.getElementById('search');
        const resultsRoot = document.getElementById('results');
        if (!searchRoot || !resultsRoot) return;

        // Restore last postcode from localStorage
        const lastPc = localStorage.getItem(TOURNAMENTS_CONFIG.LAST_POSTCODE_KEY) || '';
        this._browseState = {
            postcode: lastPc,
            radius: TOURNAMENTS_CONFIG.DEFAULT_RADIUS_MILES,
            origin: null,
            tournaments: []
        };

        searchRoot.innerHTML = Components.postcodeSearchBar(lastPc);

        // Wire events on the search bar
        searchRoot.addEventListener('click', e => {
            if (e.target.closest('[data-action="search"]')) this._runBrowseSearch(resultsRoot, searchRoot);
        });
        searchRoot.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.matches('[data-input="postcode"]')) {
                this._runBrowseSearch(resultsRoot, searchRoot);
            }
        });

        resultsRoot.addEventListener('click', e => {
            if (e.target.closest('[data-action="clear-postcode"]')) {
                this._browseState.postcode = '';
                this._browseState.origin = null;
                localStorage.removeItem(TOURNAMENTS_CONFIG.LAST_POSTCODE_KEY);
                searchRoot.querySelector('[data-input="postcode"]').value = '';
                this._runBrowseSearch(resultsRoot, searchRoot);
            }
        });

        // Initial load — pull everything public, filter if postcode is set
        await this._runBrowseSearch(resultsRoot, searchRoot);
    },

    async _runBrowseSearch(resultsRoot, searchRoot) {
        resultsRoot.innerHTML = '<div class="text-center py-8 text-gray-500">Loading tournaments…</div>';

        const postcodeInput = searchRoot.querySelector('[data-input="postcode"]');
        const radiusInput = searchRoot.querySelector('[data-input="radius"]');
        const postcode = postcodeInput?.value.trim() || '';
        const radius = Number(radiusInput?.value) || TOURNAMENTS_CONFIG.DEFAULT_RADIUS_MILES;
        this._browseState.postcode = postcode;
        this._browseState.radius = radius;

        if (postcode) {
            localStorage.setItem(TOURNAMENTS_CONFIG.LAST_POSTCODE_KEY, postcode);
        } else {
            localStorage.removeItem(TOURNAMENTS_CONFIG.LAST_POSTCODE_KEY);
        }

        const all = await queryPublicTournaments();

        let filtered = all;
        if (postcode) {
            const origin = await PostcodeService.lookup(postcode);
            if (origin) {
                this._browseState.origin = origin;
                filtered = PostcodeService.filterByRadius(all, origin, radius);
            } else {
                resultsRoot.innerHTML = `
                    <div class="text-center py-12">
                        <div class="text-4xl mb-3">❓</div>
                        <p class="text-gray-700 font-medium">We couldn't find the postcode "${Components._esc(postcode)}".</p>
                        <p class="text-sm text-gray-500 mt-1">Check the spelling or <button data-action="clear-postcode" class="text-blue-600 underline">browse all open tournaments</button>.</p>
                    </div>
                `;
                return;
            }
        } else {
            // National fallback — just sort by start date ascending
            filtered = all.sort((a, b) =>
                new Date(a.startDate || a.createdAt || 0) -
                new Date(b.startDate || b.createdAt || 0));
        }

        this._browseState.tournaments = filtered;

        if (filtered.length === 0) {
            resultsRoot.innerHTML = Components.emptyBrowse(postcode, radius);
            return;
        }

        resultsRoot.innerHTML = `
            <div class="mb-3 text-sm text-gray-600">
                Showing <strong>${filtered.length}</strong> open tournament${filtered.length === 1 ? '' : 's'}${postcode ? ` within ${radius} miles of ${Components._esc(postcode)}` : ''}
            </div>
            <div class="grid gap-3">
                ${filtered.map(t => Components.tournamentCard(t)).join('')}
            </div>
        `;
    },

    /**
     * Create page — mounts the wizard.
     */
    handleCreatePage() {
        CreateWizard.mount('wizard');
    },

    /**
     * Manage page — organiser dashboard for a single tournament.
     * Phase 0 version: shows meta, share link, roster stub, and legacy-play
     * handoff link so the organiser can run their tournament on the existing
     * per-format page until the unified play page is built (later phase).
     */
    async handleManagePage(tournamentId, organiserKey) {
        const root = document.getElementById('manage-root');
        if (!root) return;

        if (!tournamentId) {
            root.innerHTML = this._emptyManage();
            return;
        }

        root.innerHTML = '<div class="text-center py-8 text-gray-500">Loading…</div>';

        const state = new UnifiedTournamentState(tournamentId);
        const loaded = await state.load();
        if (!loaded) {
            root.innerHTML = `
                <div class="max-w-2xl mx-auto text-center py-12">
                    <div class="text-5xl mb-4">🤷</div>
                    <h2 class="text-xl font-bold text-gray-900 mb-2">Tournament not found</h2>
                    <p class="text-gray-600 mb-6">The tournament <code>${Components._esc(tournamentId)}</code> doesn't exist.</p>
                    <a href="/tournaments/browse.html" class="text-blue-600 underline">Browse open tournaments →</a>
                </div>
            `;
            return;
        }

        if (organiserKey) await state.verifyOrganiserKey(organiserKey);

        const { meta } = state;
        const fmt = FORMAT_CONFIG[meta.format] || {};
        const shareUrl = `${window.location.origin}${TournamentsRouter.getUrl('detail', tournamentId)}`;
        const organiserUrl = `${window.location.origin}${TournamentsRouter.getUrl('manage', tournamentId, meta.organiserKey)}`;

        const rosterList = meta.registrationMode === 'names_only' && state.namesOnlyRoster
            ? Object.entries(state.namesOnlyRoster.playerNames || {})
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([i, n]) => `<li class="px-3 py-2 bg-gray-50 rounded">${Number(i) + 1}. ${Components._esc(n)}</li>`)
                .join('')
            : '';

        root.innerHTML = `
            <div class="max-w-3xl mx-auto">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-2xl">
                        ${fmt.emoji || '🏆'}
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">${Components._esc(meta.name)}</h1>
                        <p class="text-sm text-gray-600">${fmt.name || meta.format} • ${meta.registrationMode === 'open' ? 'Open registration' : 'Names-only'}</p>
                    </div>
                </div>

                ${state.isOrganiser ? '' : `
                    <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 mb-4">
                        You're viewing this tournament as a spectator. Add your organiser key to the URL (<code>?key=…</code>) to manage it.
                    </div>
                `}

                <!-- Share -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
                    <div class="text-sm font-semibold text-gray-800 mb-2">Share this tournament</div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <input readonly value="${Components._esc(shareUrl)}" class="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" />
                        <button data-action="copy-share" class="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">Copy</button>
                    </div>
                    ${state.isOrganiser ? `
                        <details class="mt-3">
                            <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Organiser-only link (keep this private)</summary>
                            <div class="flex items-center gap-2 mt-2 flex-wrap">
                                <input readonly value="${Components._esc(organiserUrl)}" class="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" />
                                <button data-action="copy-organiser" class="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">Copy</button>
                            </div>
                        </details>
                    ` : ''}
                </div>

                <!-- Roster -->
                ${meta.registrationMode === 'names_only' ? `
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
                        <div class="text-sm font-semibold text-gray-800 mb-3">Roster</div>
                        <ul class="space-y-1 text-sm">${rosterList}</ul>
                        <p class="text-xs text-gray-500 mt-3">
                            The live-play page for ${fmt.name || 'this format'} is being ported to the new shell.
                            For now, you can run this tournament from the legacy page:
                            <a href="${Handlers._legacyPlayLink(meta.format, tournamentId, meta.organiserKey)}" class="text-blue-600 underline">Open legacy play page →</a>
                        </p>
                    </div>
                ` : ''}

                <!-- Meta -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4">
                    <div class="text-sm font-semibold text-gray-800 mb-3">Details</div>
                    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div><dt class="text-gray-500">Status</dt><dd class="font-medium">${meta.status}</dd></div>
                        <div><dt class="text-gray-500">Created</dt><dd>${meta.createdAt ? new Date(meta.createdAt).toLocaleString('en-GB') : '—'}</dd></div>
                        ${meta.location ? `<div><dt class="text-gray-500">Location</dt><dd>${Components._esc(meta.location.venue || '')} ${meta.location.postcode ? `<span class="text-gray-500">(${Components._esc(meta.location.postcode)})</span>` : ''}</dd></div>` : ''}
                        <div><dt class="text-gray-500">Publicly listed</dt><dd>${meta.isPublic ? 'Yes' : 'No'}</dd></div>
                    </dl>
                </div>
            </div>
        `;

        root.addEventListener('click', e => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'copy-share') this._copy(shareUrl);
            if (action === 'copy-organiser') this._copy(organiserUrl);
        });
    },

    /**
     * Detail page (public) — Phase 0 stub: shows read-only info.
     * Registration flow wires in Phase C.
     */
    async handleDetailPage(tournamentId) {
        const root = document.getElementById('detail-root');
        if (!root) return;
        if (!tournamentId) {
            root.innerHTML = '<div class="text-center py-12 text-gray-500">Missing tournament ID.</div>';
            return;
        }
        root.innerHTML = '<div class="text-center py-8 text-gray-500">Loading…</div>';

        const state = new UnifiedTournamentState(tournamentId);
        const ok = await state.load();
        if (!ok) {
            root.innerHTML = `
                <div class="max-w-2xl mx-auto text-center py-12">
                    <div class="text-5xl mb-4">🤷</div>
                    <h2 class="text-xl font-bold text-gray-900 mb-2">Tournament not found</h2>
                    <a href="/tournaments/browse.html" class="text-blue-600 underline">Browse open tournaments →</a>
                </div>
            `;
            return;
        }

        const { meta } = state;
        const fmt = FORMAT_CONFIG[meta.format] || {};
        root.innerHTML = `
            <div class="max-w-2xl mx-auto">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-3xl">
                        ${fmt.emoji || '🏆'}
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">${Components._esc(meta.name)}</h1>
                        <p class="text-sm text-gray-600">${fmt.name || meta.format}</p>
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3 text-sm">
                    ${meta.location?.postcode ? `<div><span class="text-gray-500">Location:</span> <strong>${Components._esc(meta.location.venue || meta.location.postcode)}</strong></div>` : ''}
                    ${meta.startDate ? `<div><span class="text-gray-500">Starts:</span> ${new Date(meta.startDate).toLocaleString('en-GB')}</div>` : ''}
                    <div><span class="text-gray-500">Registration:</span> ${meta.registrationMode === 'open' ? 'Open' : 'Names-only (organiser-managed)'}</div>
                    <div><span class="text-gray-500">Status:</span> ${meta.status}</div>
                </div>

                ${meta.registrationMode === 'open' ? `
                    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                        Open registration is being wired up in the next update. Check back soon.
                    </div>
                ` : `
                    <div class="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
                        This is a names-only tournament — the organiser manages the player list directly. Contact the organiser to join.
                    </div>
                `}
            </div>
        `;
    },

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    _emptyManage() {
        return `
            <div class="max-w-2xl mx-auto text-center py-12">
                <div class="text-5xl mb-4">📋</div>
                <h2 class="text-xl font-bold text-gray-900 mb-2">No tournament selected</h2>
                <p class="text-gray-600 mb-6">Pass <code>?id=…</code> in the URL, or create a new tournament.</p>
                <a href="/tournaments/create.html" class="inline-block px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold">Create a tournament</a>
            </div>
        `;
    },

    _legacyPlayLink(format, id, key) {
        // Map unified format keys → legacy path, so names-only organisers can
        // run their tournament on the existing per-format page while the
        // unified play page is being built. The legacy pages read from their
        // own RTDB roots, so we can't 100% hand-off yet — this link is a
        // best-effort pointer and will be wired properly in a later phase.
        const map = {
            americano: '/quick-play/americano/',
            mexicano:  '/quick-play/mexicano/',
            mix:       '/quick-play/tournament/',
            'team-league': '/team-league/'
        };
        const path = map[format] || '/';
        return key ? `${path}#/t/${id}?key=${key}` : `${path}#/t/${id}`;
    },

    _copy(text) {
        if (!navigator.clipboard) {
            alert(text);
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            // Lightweight toast
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm shadow-lg z-50';
            toast.textContent = 'Copied!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 1500);
        });
    }
};

if (typeof window !== 'undefined') {
    window.Handlers = Handlers;
}
