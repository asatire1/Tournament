/**
 * functions/postcode-proxy.js — Server-side UK postcode lookup
 *
 * Wraps postcodes.io (free, no auth) with a 24-h RTDB cache at
 * `postcode_cache/{normalisedPostcode}`. The unified /tournaments/ shell
 * falls through to this callable when the client cache misses or if
 * postcodes.io is briefly unreachable.
 *
 * Client calls: `firebase.functions().httpsCallable('lookupPostcode')({pc})`
 *
 * Returns: { postcode, lat, lng, admin_district?, region? } | null
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

// Firebase Admin is initialised once in index.js; we just use it.
const db = admin.database();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Normalise a UK postcode: uppercase, single space before the last 3 chars.
 */
function normalisePostcode(raw) {
    if (!raw) return '';
    const cleaned = String(raw).replace(/\s+/g, '').toUpperCase();
    if (cleaned.length < 5 || cleaned.length > 8) return '';
    return cleaned.slice(0, -3) + ' ' + cleaned.slice(-3);
}

/**
 * RTDB-safe key (no '.', '#', '$', '[', ']', '/').
 */
function cacheKey(pc) {
    return pc.replace(/[.#$[\]/]/g, '_');
}

async function readCache(pc) {
    const key = cacheKey(pc);
    try {
        const snap = await db.ref(`postcode_cache/${key}`).once('value');
        if (!snap.exists()) return null;
        const val = snap.val();
        if (!val?.cachedAt) return null;
        if (Date.now() - val.cachedAt > CACHE_TTL_MS) return null;
        return val.data || null;
    } catch (_) {
        return null;
    }
}

async function writeCache(pc, data) {
    const key = cacheKey(pc);
    try {
        await db.ref(`postcode_cache/${key}`).set({
            data,
            cachedAt: Date.now()
        });
    } catch (_) { /* ignore — cache failure shouldn't kill the lookup */ }
}

/**
 * Fetch from postcodes.io. Uses the global fetch in Node 18 (Cloud Functions
 * Node 18 runtime ships with fetch since v18.x).
 */
async function fetchFromPostcodesIo(pc) {
    const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 200 || !json.result) return null;
    return {
        postcode: json.result.postcode,
        lat: json.result.latitude,
        lng: json.result.longitude,
        admin_district: json.result.admin_district || null,
        region: json.result.region || null
    };
}

// ---------------------------------------------------------------------------
// Exposed callable
// ---------------------------------------------------------------------------

exports.lookupPostcode = functions
    .region('europe-west1')
    .https.onCall(async (data /* , context */) => {
        const raw = data?.postcode || data?.pc;
        const pc = normalisePostcode(raw);
        if (!pc) {
            throw new functions.https.HttpsError('invalid-argument', 'postcode required');
        }

        // Try cache first
        const cached = await readCache(pc);
        if (cached) {
            return { ...cached, cached: true };
        }

        // Miss → fetch
        let data2;
        try {
            data2 = await fetchFromPostcodesIo(pc);
        } catch (err) {
            console.error('postcodes.io fetch failed:', err);
            throw new functions.https.HttpsError('unavailable',
                'Postcode service temporarily unavailable');
        }

        if (!data2) {
            return null;
        }

        // Cache + return
        await writeCache(pc, data2);
        return { ...data2, cached: false };
    });

// Export helpers for tests (not a callable)
exports._internal = { normalisePostcode, cacheKey };
