/**
 * tournaments/js/components.js — Reusable UI snippets for the unified shell
 *
 * Components are small functions that return HTML strings and attach
 * handlers via event delegation from handlers.js. No virtual-DOM, no
 * framework — matches the existing vanilla pattern used throughout
 * the codebase.
 */

const Components = {
    /**
     * Public tournament card for the browse list.
     */
    tournamentCard(t) {
        const fmt = (typeof FORMAT_CONFIG !== 'undefined' && FORMAT_CONFIG[t.format]) || {};
        const emoji = fmt.emoji || '🏆';
        const fmtName = fmt.name || t.format;
        const dist = (t.distanceMiles !== undefined && Number.isFinite(t.distanceMiles))
            ? `${t.distanceMiles.toFixed(1)} mi`
            : '';
        const venue = t.location?.venue || t.location?.postcode || '';
        const feeLabel = t.entryFeeGBP ? `£${t.entryFeeGBP}` : 'Free';
        const startLabel = t.startDate
            ? new Date(t.startDate).toLocaleDateString('en-GB',
                { weekday: 'short', day: 'numeric', month: 'short' })
            : '';
        const ratingBadge = Components._ratingBadge(t.ratingLimit);
        const modeBadge   = t.registrationMode === 'names_only'
            ? '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">Names-only</span>'
            : '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">Open registration</span>';

        const href = TournamentsRouter.getUrl('detail', t.id);

        return `
            <a href="${href}" class="block bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-2xl flex-shrink-0">
                            ${emoji}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 class="text-base font-bold text-gray-900 truncate">${Components._esc(t.name)}</h3>
                                ${modeBadge}
                            </div>
                            <div class="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                                <span>${fmtName}</span>
                                ${startLabel ? `<span>•</span><span>${startLabel}</span>` : ''}
                                ${venue ? `<span>•</span><span>${Components._esc(venue)}</span>` : ''}
                                ${dist ? `<span>•</span><span class="font-medium text-blue-700">${dist}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <div class="text-sm font-bold text-gray-900">${feeLabel}</div>
                        ${ratingBadge}
                    </div>
                </div>
            </a>
        `;
    },

    _ratingBadge(rl) {
        if (!rl || rl.type === 'none') return '';
        if (rl.type === 'individual') {
            const parts = [];
            if (rl.min !== undefined) parts.push(`≥${rl.min}`);
            if (rl.max !== undefined) parts.push(`≤${rl.max}`);
            return `<div class="text-xs text-gray-500 mt-0.5">Rating ${parts.join(' ')}</div>`;
        }
        if (rl.type === 'combined') {
            const parts = [];
            if (rl.min !== undefined) parts.push(`≥${rl.min}`);
            if (rl.max !== undefined) parts.push(`≤${rl.max}`);
            return `<div class="text-xs text-gray-500 mt-0.5">Combined ${parts.join(' ')}</div>`;
        }
        return '';
    },

    /**
     * Empty state for the browse list.
     */
    emptyBrowse(postcode, radius) {
        if (postcode) {
            return `
                <div class="text-center py-16">
                    <div class="text-6xl mb-4">🔍</div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">
                        No open tournaments within ${radius} miles of ${Components._esc(postcode)}
                    </h3>
                    <p class="text-sm text-gray-600 mb-4">
                        Try widening the search radius, or clear the postcode to browse nationally.
                    </p>
                    <button data-action="clear-postcode" class="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200">
                        Browse all open tournaments
                    </button>
                </div>
            `;
        }
        return `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">🎾</div>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">No open tournaments yet</h3>
                <p class="text-sm text-gray-600">Check back soon, or <a href="create.html" class="text-blue-600 underline">create one yourself</a>.</p>
            </div>
        `;
    },

    /**
     * Postcode search bar used on browse + home.
     */
    postcodeSearchBar(initialPostcode = '', initialRadius = null) {
        const radius = initialRadius || TOURNAMENTS_CONFIG.DEFAULT_RADIUS_MILES;
        const options = TOURNAMENTS_CONFIG.RADIUS_OPTIONS
            .map(r => `<option value="${r}" ${r === radius ? 'selected' : ''}>${r} miles</option>`)
            .join('');
        return `
            <div class="flex flex-col sm:flex-row gap-3 bg-white rounded-2xl border border-gray-200 p-3 shadow-sm">
                <input
                    type="text"
                    data-input="postcode"
                    value="${Components._esc(initialPostcode)}"
                    placeholder="UK postcode (e.g. M32 0AL)"
                    class="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    autocomplete="postal-code"
                    inputmode="text"
                    maxlength="10"
                />
                <select
                    data-input="radius"
                    class="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white"
                >${options}</select>
                <button
                    data-action="search"
                    class="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                >Search</button>
            </div>
        `;
    },

    _esc(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
};

if (typeof window !== 'undefined') {
    window.Components = Components;
}
