/**
 * tournaments/js/venue-picker.js — self-populating venue autocomplete
 *
 * Mount via VenuePicker.mount(container, {
 *   postcode: () => currentPostcode,          // getter — re-read when postcode changes
 *   initialValue: { venueId, canonicalName }, // optional
 *   onChange(selection) { ... }               // selection = { venueId?, name, isPending }
 * })
 *
 * Shows an input with a type-to-search dropdown of approved venues near the
 * given postcode. If the user's typed value doesn't match an existing
 * approved venue, on blur / create it calls suggestVenue which either:
 *   - merges into an existing venue (slug / fuzzy), returning status:'approved', or
 *   - creates a pending venue awaiting admin approval.
 */

(function () {

const MIN_QUERY = 2;
const DEBOUNCE_MS = 220;

function callable(name) {
    const fns = firebase.app().functions
        ? firebase.app().functions('europe-west1')
        : firebase.functions('europe-west1');
    return fns.httpsCallable(name);
}

const VenuePicker = {
    mount(elOrId, opts = {}) {
        const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
        if (!el) throw new Error('VenuePicker: container not found');

        const state = {
            query: opts.initialValue?.canonicalName || '',
            selection: opts.initialValue || null,   // { venueId, canonicalName }
            suggestions: [],
            loading: false,
            opts
        };
        el._state = state;

        render();
        wire();

        // Debounced fetch
        let t = null;
        function schedule() {
            clearTimeout(t);
            t = setTimeout(() => fetchSuggestions().catch(() => {}), DEBOUNCE_MS);
        }

        async function fetchSuggestions() {
            const q = state.query.trim();
            const pc = typeof state.opts.postcode === 'function' ? state.opts.postcode() : state.opts.postcode;
            if (q.length < MIN_QUERY && !pc) {
                state.suggestions = [];
                state.loading = false;
                render();
                return;
            }
            state.loading = true;
            render();
            try {
                const res = await callable('searchVenues')({ query: q, postcode: pc, limit: 8 });
                state.suggestions = (res.data?.rows || res.rows || []);
            } catch (err) {
                console.warn('searchVenues failed', err);
                state.suggestions = [];
            }
            state.loading = false;
            render();
        }

        function render() {
            const exactMatch = state.selection && state.selection.canonicalName === state.query;
            const hint = exactMatch
                ? `<span class="text-xs text-green-700">✓ ${state.selection.isPending ? 'Pending admin approval' : 'Known venue'}</span>`
                : (state.query.length >= MIN_QUERY
                    ? `<span class="text-xs text-gray-500">We'll save this venue for future organisers.</span>`
                    : '');
            el.innerHTML = `
                <div class="relative">
                    <input data-input="venue" type="text" maxlength="100" autocomplete="off"
                        placeholder="e.g. Stretford Padel Club"
                        value="${esc(state.query)}"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    ${renderDropdown()}
                </div>
                <div class="mt-1 min-h-[18px]">${hint}</div>
            `;
        }

        function renderDropdown() {
            if (!state.loading && !state.suggestions.length) return '';
            return `
                <div class="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    ${state.loading ? '<div class="px-4 py-2 text-xs text-gray-500">Searching…</div>' : ''}
                    ${state.suggestions.map((s, i) => `
                        <button data-pick="${i}" type="button"
                            class="w-full text-left px-4 py-2 hover:bg-blue-50 transition flex items-center gap-3 border-t border-gray-100 first:border-t-0">
                            <span class="flex-1 min-w-0">
                                <span class="block text-sm font-semibold text-gray-900 truncate">${esc(s.canonicalName)}</span>
                                <span class="block text-xs text-gray-500 truncate">
                                    ${s.postcode ? esc(s.postcode) : ''}
                                    ${Number.isFinite(s.distanceMiles) ? ` · ${s.distanceMiles.toFixed(1)} mi` : ''}
                                    ${s.tournamentCount ? ` · used by ${s.tournamentCount} organiser${s.tournamentCount === 1 ? '' : 's'}` : ''}
                                </span>
                            </span>
                            ${s.source === 'osm' ? '<span class="text-xs text-gray-400">OSM</span>' : ''}
                        </button>
                    `).join('')}
                </div>`;
        }

        function wire() {
            el.addEventListener('input', e => {
                if (e.target.dataset.input !== 'venue') return;
                state.query = e.target.value;
                // If user edits away from the selected venue, clear selection
                if (state.selection && state.query !== state.selection.canonicalName) {
                    state.selection = null;
                    notifyChange();
                }
                schedule();
            });
            el.addEventListener('click', e => {
                const pickIdx = e.target.closest('[data-pick]')?.dataset.pick;
                if (pickIdx === undefined) return;
                const picked = state.suggestions[Number(pickIdx)];
                if (!picked) return;
                state.query = picked.canonicalName;
                state.selection = {
                    venueId: picked.venueId,
                    canonicalName: picked.canonicalName,
                    isPending: !picked.verified
                };
                state.suggestions = [];
                render();
                notifyChange();
            });
            el.addEventListener('focus', e => {
                if (e.target.dataset.input === 'venue') schedule();
            }, true);
        }

        function notifyChange() {
            if (typeof state.opts.onChange !== 'function') return;
            state.opts.onChange({
                venueId: state.selection?.venueId || null,
                canonicalName: state.selection?.canonicalName || state.query || '',
                isPending: state.selection?.isPending || false,
                isFreeText: !state.selection && !!state.query
            });
        }

        // Expose small API for the wizard to commit the free-text suggestion
        return {
            getSelection() { return state.selection; },
            getQuery() { return state.query; },
            setPostcode() { schedule(); },
            /**
             * Called by the wizard on submit. If the user typed free-text
             * without picking, suggestVenue is invoked and the resulting
             * venueId is returned — caller then stores it on the tournament.
             */
            async commit(postcode) {
                if (state.selection?.venueId) return state.selection;
                const name = state.query.trim();
                if (!name) return null;
                try {
                    const res = await callable('suggestVenue')({ name, postcode });
                    const out = res.data || res;
                    state.selection = {
                        venueId: out.venueId,
                        canonicalName: out.canonicalName || name,
                        isPending: out.status === 'pending'
                    };
                    return state.selection;
                } catch (err) {
                    // Fall back to free-text — non-fatal
                    console.warn('suggestVenue failed:', err);
                    return { venueId: null, canonicalName: name, isPending: false };
                }
            }
        };
    }
};

function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

if (typeof window !== 'undefined') {
    window.VenuePicker = VenuePicker;
}

})();
