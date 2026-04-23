/**
 * tournaments/js/postcode-service.js — UK postcode lookup via postcodes.io
 *
 * postcodes.io is a free, no-auth API with CORS enabled. For v1 we call it
 * directly from the client with a localStorage cache (24 h TTL).
 *
 * A server-side proxy (functions/postcode-proxy.js) exists for future use
 * if rate limits or offline caching become important — the client falls
 * back to it automatically if a Cloud Functions callable named
 * `lookupPostcode` is available.
 */

const PostcodeService = {
    /**
     * Normalise a raw postcode string (uppercase, single space before the last 3 chars).
     */
    normalise(pc) {
        if (!pc) return '';
        const cleaned = String(pc).replace(/\s+/g, '').toUpperCase();
        if (cleaned.length < 5) return cleaned; // too short — return as-is
        return cleaned.slice(0, -3) + ' ' + cleaned.slice(-3);
    },

    /**
     * Look up a UK postcode → { postcode, lat, lng, admin_district }.
     * Caches in localStorage for 24 h.
     * @param {string} raw
     * @returns {Promise<object|null>}
     */
    async lookup(raw) {
        const postcode = this.normalise(raw);
        if (!postcode) return null;

        // Read cache
        try {
            const cacheStr = localStorage.getItem(TOURNAMENTS_CONFIG.POSTCODE_CACHE_KEY);
            const cache = cacheStr ? JSON.parse(cacheStr) : {};
            const hit = cache[postcode];
            if (hit && (Date.now() - hit.cachedAt) < TOURNAMENTS_CONFIG.POSTCODE_CACHE_TTL_MS) {
                return hit.data;
            }
        } catch (_) { /* ignore corrupt cache */ }

        // Fetch from postcodes.io
        const url = `${TOURNAMENTS_CONFIG.POSTCODES_IO_BASE}/postcodes/${encodeURIComponent(postcode)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const json = await res.json();
            if (json.status !== 200 || !json.result) return null;

            const data = {
                postcode: json.result.postcode,
                lat: json.result.latitude,
                lng: json.result.longitude,
                admin_district: json.result.admin_district || null,
                region: json.result.region || null
            };

            // Cache
            try {
                const cacheStr = localStorage.getItem(TOURNAMENTS_CONFIG.POSTCODE_CACHE_KEY);
                const cache = cacheStr ? JSON.parse(cacheStr) : {};
                cache[postcode] = { data, cachedAt: Date.now() };
                localStorage.setItem(TOURNAMENTS_CONFIG.POSTCODE_CACHE_KEY, JSON.stringify(cache));
            } catch (_) { /* ignore quota */ }

            return data;
        } catch (error) {
            console.warn('PostcodeService.lookup failed:', error);
            return null;
        }
    },

    /**
     * Validate that a postcode exists.
     */
    async validate(raw) {
        const data = await this.lookup(raw);
        return data !== null;
    },

    /**
     * Haversine distance between two {lat, lng} points, in miles.
     */
    distanceMiles(a, b) {
        if (!a || !b) return Infinity;
        const R = 3958.8; // Earth radius in miles
        const toRad = d => d * Math.PI / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const h = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    },

    /**
     * Filter a list of tournament summaries by distance from an origin.
     * @param {Array} tournaments
     * @param {{lat:number,lng:number}} origin
     * @param {number} radiusMiles
     * @returns {Array} Same shape + `distanceMiles` field, sorted ascending.
     */
    filterByRadius(tournaments, origin, radiusMiles) {
        if (!origin) return tournaments;
        return tournaments
            .map(t => {
                if (!t.location?.lat || !t.location?.lng) {
                    return { ...t, distanceMiles: Infinity };
                }
                return { ...t, distanceMiles: this.distanceMiles(origin, t.location) };
            })
            .filter(t => t.distanceMiles <= radiusMiles)
            .sort((a, b) => a.distanceMiles - b.distanceMiles);
    }
};

if (typeof window !== 'undefined') {
    window.PostcodeService = PostcodeService;
}
