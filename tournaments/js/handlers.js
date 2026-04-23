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
     * Detail page (public). Open-registration tournaments show the PairInvite
     * widget (requires verified Playtomic profile); names-only tournaments
     * show an informational note.
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
        const pairs = state.pairs || {};
        const players = state.players || {};
        const regCount = Object.keys(pairs).length + Object.keys(players).length;
        const capacity = meta.maxPairs || meta.maxPlayers || null;
        const ratingLimitText = (() => {
            const rl = meta.ratingLimit;
            if (!rl || rl.type === 'none') return null;
            const parts = [];
            if (rl.min !== undefined) parts.push(`≥${rl.min}`);
            if (rl.max !== undefined) parts.push(`≤${rl.max}`);
            return `${rl.type === 'combined' ? 'Combined' : 'Individual'} rating ${parts.join(' ')}`;
        })();

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

                <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3 text-sm mb-4">
                    ${meta.location?.postcode ? `<div><span class="text-gray-500">Location:</span> <strong>${Components._esc(meta.location.venue || meta.location.postcode)}</strong></div>` : ''}
                    ${meta.startDate ? `<div><span class="text-gray-500">Starts:</span> ${new Date(meta.startDate).toLocaleString('en-GB')}</div>` : ''}
                    ${meta.registrationDeadline ? `<div><span class="text-gray-500">Registration deadline:</span> ${new Date(meta.registrationDeadline).toLocaleString('en-GB')}</div>` : ''}
                    <div><span class="text-gray-500">Registration:</span> ${meta.registrationMode === 'open' ? 'Open' : 'Names-only (organiser-managed)'}</div>
                    <div><span class="text-gray-500">Status:</span> ${meta.status}</div>
                    ${ratingLimitText ? `<div><span class="text-gray-500">Rating limit:</span> ${ratingLimitText}</div>` : ''}
                    ${capacity ? `<div><span class="text-gray-500">Capacity:</span> ${regCount}/${capacity}</div>` : `<div><span class="text-gray-500">Registered:</span> ${regCount}</div>`}
                    ${meta.entryFeeGBP ? `<div><span class="text-gray-500">Entry fee:</span> £${meta.entryFeeGBP}</div>` : `<div><span class="text-gray-500">Entry fee:</span> Free</div>`}
                </div>

                ${meta.registrationMode === 'open'
                    ? `<div id="register-wrap" class="mb-6"></div>`
                    : `<div class="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
                           This is a names-only tournament — the organiser manages the player list directly. Contact the organiser to join.
                       </div>`}
            </div>
        `;

        if (meta.registrationMode === 'open') {
            await Handlers._renderOpenRegistration(tournamentId, state, meta, fmt);
        }
    },

    async _renderOpenRegistration(tournamentId, state, meta, fmt) {
        const el = document.getElementById('register-wrap');
        if (!el) return;

        // Wait briefly for auth
        const user = await new Promise(res => {
            if (firebase.auth().currentUser) return res(firebase.auth().currentUser);
            const off = firebase.auth().onAuthStateChanged(u => { off(); res(u); });
        });
        if (!user) {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            el.innerHTML = `
                <div class="rounded-2xl bg-blue-50 border border-blue-200 p-5">
                    <div class="font-semibold text-blue-900 mb-1">Sign in to register</div>
                    <p class="text-sm text-blue-800 mb-3">You'll need a verified Uber Padel account (email + Playtomic screenshot).</p>
                    <a href="/account/login.html?next=${next}" class="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">Sign in / sign up</a>
                </div>`;
            return;
        }

        // Require verification
        const current = await PlaytomicVerificationService.getCurrent(user.uid);
        if (!current || current.status !== 'verified' || PlaytomicVerificationService.isExpired(current)) {
            el.innerHTML = `
                <div class="rounded-2xl bg-amber-50 border border-amber-200 p-5">
                    <div class="font-semibold text-amber-900 mb-1">Verify to register</div>
                    <p class="text-sm text-amber-800 mb-3">${current?.status === 'expired' || (current && PlaytomicVerificationService.isExpired(current)) ? 'Your Playtomic verification has expired.' : "We need to verify your Playtomic rating before you can register."}</p>
                    <a href="/account/reverify.html" class="inline-block px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold">Verify now →</a>
                </div>`;
            return;
        }

        // Already registered?
        const allPairs = Object.entries(state.pairs || {});
        const myPair = allPairs.find(([, p]) => p.player1Uid === user.uid || p.player2Uid === user.uid);
        const myIndividual = (state.players || {})[user.uid];
        if (myPair) {
            el.innerHTML = `
                <div class="rounded-2xl bg-green-50 border border-green-200 p-5">
                    <div class="font-semibold text-green-900 mb-1">You're registered</div>
                    <p class="text-sm text-green-800">Paired with ${Components._esc(myPair[1].player1Uid === user.uid ? myPair[1].player2Name : myPair[1].player1Name)}.</p>
                </div>`;
            return;
        }
        if (myIndividual) {
            el.innerHTML = `
                <div class="rounded-2xl bg-green-50 border border-green-200 p-5">
                    <div class="font-semibold text-green-900 mb-1">You're registered</div>
                    <p class="text-sm text-green-800">Partners are drawn when the tournament starts.</p>
                </div>`;
            return;
        }

        // Registration CTA — depends on registrationUnit
        if (meta.registrationUnit === 'pair') {
            el.innerHTML = `
                <div class="mb-2 text-sm font-semibold text-gray-800">Register a pair</div>
                <div id="pair-invite"></div>`;
            PairInvite.render('pair-invite', {
                tournamentId,
                onRegistered() {
                    window.location.reload();
                }
            });
        } else {
            el.innerHTML = `
                <div class="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
                    <div class="font-semibold text-gray-900 mb-2">Register</div>
                    <p class="text-sm text-gray-600 mb-3">You'll be added as an individual. Pairings are generated when the tournament starts.</p>
                    <button data-action="register-individual" class="px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
                        Register me
                    </button>
                </div>`;
            el.querySelector('[data-action="register-individual"]').addEventListener('click', () => {
                Handlers._registerIndividual(tournamentId).catch(err => alert(err.message || err));
            });
        }
    },

    async _registerIndividual(tournamentId) {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('Sign in first');
        const db = firebase.database();
        const userSnap = await db.ref(`users/${user.uid}`).once('value');
        const u = userSnap.val() || {};
        const ver = u.currentPlaytomicVerification;
        if (ver?.status !== 'verified') throw new Error('Verify your Playtomic profile first.');
        const rating = ver.extractedRating ?? u.playtomicLevel;
        await db.ref(`tournaments/${tournamentId}/players/${user.uid}`).set({
            name: u.name || ver.extractedName || 'Player',
            rating: rating,
            registeredAt: new Date().toISOString(),
            paymentStatus: 'free'
        });
        window.location.reload();
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
