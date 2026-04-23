/**
 * functions/venues.js — Phase I UK padel venue catalog
 *
 * Self-populating database with admin approval queue. Sources tracked:
 *   - 'user'  : organiser typed the name; starts as 'pending' and must be
 *               approved (unless it's a close match to an approved venue,
 *               in which case we merge transparently).
 *   - 'osm'   : imported from OpenStreetMap Overpass (auto-approved).
 *   - 'admin' : created directly by an admin.
 *   - 'google': reserved for future Google Places one-off seed.
 *
 * Callables (europe-west1):
 *   - searchVenues({query?, postcode?, status?, limit?})  public read
 *   - suggestVenue({name, postcode, venue?})              auth; creates pending
 *                                                         or merges into existing
 *   - listPendingVenues({limit?})                         admin
 *   - approveVenue({venueId, canonicalName?, note?})      admin
 *   - rejectVenue({venueId, note?})                       admin
 *   - mergeVenue({fromId, intoId})                        admin
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

const db = admin.database();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAdmin(context) {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    if (!context.auth.token?.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin required');
    }
}

function slugify(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
}

function normalisePostcode(pc) {
    if (!pc) return '';
    const c = String(pc).replace(/\s+/g, '').toUpperCase();
    if (c.length < 5) return c;
    return c.slice(0, -3) + ' ' + c.slice(-3);
}

function haversineMiles(a, b) {
    if (!a || !b) return Infinity;
    const R = 3958.8;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Cheap approximate-similarity score in [0,1]: exact slug = 1; substring = 0.8;
 * common-prefix ≥ 4 chars = 0.6; Levenshtein-based otherwise.
 * Good enough for de-dup candidates without a real FTS index.
 */
function similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.85;

    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    return 1 - (dist / maxLen);
}

function levenshtein(a, b) {
    if (a === b) return 0;
    const al = a.length, bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    let prev = new Array(bl + 1);
    let curr = new Array(bl + 1);
    for (let j = 0; j <= bl; j++) prev[j] = j;
    for (let i = 1; i <= al; i++) {
        curr[0] = i;
        for (let j = 1; j <= bl; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }
    return prev[bl];
}

async function lookupPostcode(pc) {
    const norm = normalisePostcode(pc);
    if (!norm) return null;
    const cached = (await db.ref(`postcode_cache/${norm.replace(/[.#$[\]/]/g, '_')}`).once('value')).val();
    if (cached?.data) return cached.data;
    // Fall back to live fetch (same as functions/postcode-proxy.js)
    try {
        const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(norm)}`);
        if (!res.ok) return null;
        const j = await res.json();
        if (j.status !== 200 || !j.result) return null;
        return {
            postcode: j.result.postcode,
            lat: j.result.latitude,
            lng: j.result.longitude,
            admin_district: j.result.admin_district || null
        };
    } catch (err) {
        console.warn('postcode lookup failed:', err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Callable: searchVenues — public autocomplete
// ---------------------------------------------------------------------------

exports.searchVenues = functions
    .region('europe-west1')
    .https.onCall(async (data /*, context */) => {
        const { query, postcode, limit, includePending } = data || {};
        const limitN = Math.min(50, Math.max(1, Number(limit) || 10));

        // Read all approved venues (small dataset early on; could paginate later)
        const snap = await db.ref('venues').orderByChild('status').equalTo('approved').once('value');
        let rows = [];
        snap.forEach(c => {
            const v = c.val();
            rows.push({
                venueId: c.key,
                canonicalName: v.canonicalName,
                slug: v.slug,
                aliases: v.aliases || [],
                postcode: v.postcode,
                lat: v.lat,
                lng: v.lng,
                tournamentCount: v.tournamentCount || 0,
                source: v.source,
                verified: v.status === 'approved'
            });
        });

        if (includePending && data?.includePending === true) {
            const pend = await db.ref('venues').orderByChild('status').equalTo('pending').once('value');
            pend.forEach(c => {
                const v = c.val();
                rows.push({
                    venueId: c.key,
                    canonicalName: v.canonicalName,
                    slug: v.slug,
                    aliases: v.aliases || [],
                    postcode: v.postcode,
                    lat: v.lat, lng: v.lng,
                    tournamentCount: v.tournamentCount || 0,
                    source: v.source,
                    verified: false
                });
            });
        }

        // Distance filter if postcode given
        let origin = null;
        if (postcode) {
            const p = await lookupPostcode(postcode);
            origin = p ? { lat: p.lat, lng: p.lng } : null;
        }
        if (origin) {
            rows = rows.map(r => ({ ...r, distanceMiles: r.lat && r.lng ? haversineMiles(origin, r) : Infinity }));
        }

        // Text filter
        const q = String(query || '').trim().toLowerCase();
        if (q.length >= 2) {
            const qSlug = slugify(q);
            rows = rows
                .map(r => {
                    const nameScore = similarity(r.canonicalName.toLowerCase(), q);
                    const slugScore = similarity(r.slug, qSlug);
                    const aliasScore = (r.aliases || [])
                        .map(a => similarity(a.toLowerCase(), q))
                        .reduce((m, s) => Math.max(m, s), 0);
                    return { ...r, matchScore: Math.max(nameScore, slugScore, aliasScore) };
                })
                .filter(r => r.matchScore >= 0.35);
        }

        // Rank: distance (if known) → matchScore → popularity
        rows.sort((a, b) => {
            if (origin && Number.isFinite(a.distanceMiles) && Number.isFinite(b.distanceMiles)) {
                const dDiff = a.distanceMiles - b.distanceMiles;
                if (Math.abs(dDiff) > 2) return dDiff; // within 2mi noise, prefer score
            }
            if (q.length >= 2 && Math.abs((b.matchScore || 0) - (a.matchScore || 0)) > 0.05) {
                return (b.matchScore || 0) - (a.matchScore || 0);
            }
            return (b.tournamentCount || 0) - (a.tournamentCount || 0);
        });

        return { rows: rows.slice(0, limitN), origin };
    });

// ---------------------------------------------------------------------------
// Callable: suggestVenue — creates a pending venue OR merges into existing
// ---------------------------------------------------------------------------

exports.suggestVenue = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        const uid = context.auth.uid;
        const { name, postcode } = data || {};
        if (!name || String(name).trim().length < 3) {
            throw new functions.https.HttpsError('invalid-argument', 'Venue name required (min 3 chars)');
        }

        const displayName = String(name).trim().slice(0, 100);
        const slug = slugify(displayName);
        const normPc = normalisePostcode(postcode);

        // 1. Exact-slug collision — merge transparently
        const exact = await db.ref('venues').orderByChild('slug').equalTo(slug).once('value');
        let existingId = null;
        exact.forEach(c => { existingId = c.key; });
        if (existingId) {
            const row = (await db.ref(`venues/${existingId}`).once('value')).val();
            // Add the typed variant as an alias if it isn't the canonical
            if (displayName !== row.canonicalName && !(row.aliases || []).includes(displayName)) {
                await db.ref(`venues/${existingId}/aliases`).set([...(row.aliases || []), displayName]);
            }
            await db.ref(`venues/${existingId}/lastUsedAt`).set(new Date().toISOString());
            return { venueId: existingId, status: row.status, merged: true };
        }

        // 2. Fuzzy-match candidates within 5 miles (if postcode supplied) and score ≥ 0.85
        const pc = normPc ? await lookupPostcode(normPc) : null;
        const all = await db.ref('venues').orderByChild('status').equalTo('approved').once('value');
        let fuzzy = null;
        let fuzzyScore = 0;
        all.forEach(c => {
            const v = c.val();
            const s = Math.max(
                similarity(v.slug, slug),
                similarity(v.canonicalName.toLowerCase(), displayName.toLowerCase())
            );
            const okDist = !pc || !v.lat || haversineMiles({ lat: pc.lat, lng: pc.lng }, v) < 5;
            if (s > fuzzyScore && s >= 0.85 && okDist) {
                fuzzyScore = s;
                fuzzy = { venueId: c.key, ...v };
            }
        });
        if (fuzzy) {
            return {
                venueId: fuzzy.venueId,
                canonicalName: fuzzy.canonicalName,
                status: fuzzy.status,
                merged: false,
                suggestedMatch: { venueId: fuzzy.venueId, canonicalName: fuzzy.canonicalName, score: fuzzyScore }
            };
        }

        // 3. Create a new pending venue
        const venueId = uuidv4();
        const now = new Date().toISOString();
        const payload = {
            canonicalName: displayName,
            slug,
            aliases: [],
            postcode: normPc || null,
            lat: pc?.lat || null,
            lng: pc?.lng || null,
            tournamentCount: 0,
            firstUsedAt: now,
            lastUsedAt: now,
            source: 'user',
            status: 'pending',
            suggestedBy: uid,
            approvedBy: null,
            approvedAt: null,
            reviewNote: null,
            mergedInto: null
        };
        await db.ref(`venues/${venueId}`).set(payload);
        return { venueId, status: 'pending', merged: false };
    });

// ---------------------------------------------------------------------------
// Admin callables
// ---------------------------------------------------------------------------

exports.listPendingVenues = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        requireAdmin(context);
        const limit = Math.min(200, Math.max(1, Number(data?.limit) || 50));
        const snap = await db.ref('venues').orderByChild('status').equalTo('pending').once('value');
        const rows = [];
        snap.forEach(c => rows.push({ venueId: c.key, ...c.val() }));
        rows.sort((a, b) => (b.firstUsedAt || '').localeCompare(a.firstUsedAt || ''));
        return { rows: rows.slice(0, limit) };
    });

exports.approveVenue = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        requireAdmin(context);
        const { venueId, canonicalName, note } = data || {};
        if (!venueId) throw new functions.https.HttpsError('invalid-argument', 'venueId required');
        const ref = db.ref(`venues/${venueId}`);
        const v = (await ref.once('value')).val();
        if (!v) throw new functions.https.HttpsError('not-found', 'Venue not found');
        const patch = {
            status: 'approved',
            approvedBy: context.auth.uid,
            approvedAt: new Date().toISOString()
        };
        if (canonicalName) {
            patch.canonicalName = String(canonicalName).trim().slice(0, 100);
            patch.slug = slugify(patch.canonicalName);
        }
        if (note) patch.reviewNote = String(note).slice(0, 500);
        await ref.update(patch);
        return { ok: true };
    });

exports.rejectVenue = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        requireAdmin(context);
        const { venueId, note } = data || {};
        if (!venueId) throw new functions.https.HttpsError('invalid-argument', 'venueId required');
        const ref = db.ref(`venues/${venueId}`);
        const v = (await ref.once('value')).val();
        if (!v) throw new functions.https.HttpsError('not-found', 'Venue not found');
        await ref.update({
            status: 'rejected',
            approvedBy: context.auth.uid,
            approvedAt: new Date().toISOString(),
            reviewNote: note ? String(note).slice(0, 500) : null
        });
        return { ok: true };
    });

exports.mergeVenue = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        requireAdmin(context);
        const { fromId, intoId } = data || {};
        if (!fromId || !intoId) throw new functions.https.HttpsError('invalid-argument', 'fromId + intoId required');
        if (fromId === intoId) throw new functions.https.HttpsError('invalid-argument', 'Cannot merge a venue into itself');
        const fromRef = db.ref(`venues/${fromId}`);
        const intoRef = db.ref(`venues/${intoId}`);
        const [fromSnap, intoSnap] = await Promise.all([fromRef.once('value'), intoRef.once('value')]);
        const from = fromSnap.val(), into = intoSnap.val();
        if (!from || !into) throw new functions.https.HttpsError('not-found', 'One or both venues not found');

        const mergedAliases = Array.from(new Set([
            ...(into.aliases || []),
            from.canonicalName,
            ...(from.aliases || [])
        ])).filter(a => a !== into.canonicalName);

        const now = new Date().toISOString();
        const updates = {};
        updates[`venues/${intoId}/aliases`] = mergedAliases;
        updates[`venues/${intoId}/tournamentCount`] = (into.tournamentCount || 0) + (from.tournamentCount || 0);
        updates[`venues/${fromId}/status`] = 'merged';
        updates[`venues/${fromId}/mergedInto`] = intoId;
        updates[`venues/${fromId}/approvedBy`] = context.auth.uid;
        updates[`venues/${fromId}/approvedAt`] = now;
        await db.ref().update(updates);
        return { ok: true };
    });

exports._internal = { slugify, similarity, levenshtein, normalisePostcode };
