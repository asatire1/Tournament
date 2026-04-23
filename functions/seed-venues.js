/**
 * functions/seed-venues.js — one-off UK padel venue seeds
 *
 * Admin-only callables:
 *
 *   seedUKPadelVenuesFromOSM()
 *     Queries Overpass for all UK nodes/ways tagged sport=padel with a
 *     name, upserts them into `venues/*` as `source: 'osm', status: 'approved'`.
 *     Safe to re-run — upserts by slug.
 *
 *   seedUKPadelVenuesFromGoogle({ queries?, dryRun? })
 *     Iterates a list of UK location queries ("padel courts in London",
 *     etc.), calls the Google Places API (New) Text Search endpoint for
 *     each, and upserts matches into `venues/*` as
 *     `source: 'google', status: 'approved'`. Deduplicates by place_id
 *     (persisted as `googlePlaceId`) first, then by slug. Safe to re-run.
 *     Expected one-off cost: £0.50–£2 for the default ~30 queries.
 *     Requires GOOGLE_PLACES_API_KEY secret.
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

const db = admin.database();

const { _internal } = require('./venues.js');
const slugify = _internal.slugify;

function requireAdmin(context) {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    if (!context.auth.token?.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin required');
    }
}

// ---------------------------------------------------------------------------
// OSM seeder (unchanged)
// ---------------------------------------------------------------------------

exports.seedUKPadelVenuesFromOSM = functions
    .region('europe-west1')
    .runWith({ timeoutSeconds: 120 })
    .https.onCall(async (_data, context) => {
        requireAdmin(context);

        const query = `
[out:json][timeout:60];
area["ISO3166-1"="GB"]->.gb;
(
  node(area.gb)[sport=padel][name];
  way(area.gb)[sport=padel][name];
);
out center tags;`.trim();

        let res;
        try {
            res = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(query)
            });
        } catch (err) {
            throw new functions.https.HttpsError('unavailable', 'Overpass request failed: ' + err.message);
        }
        if (!res.ok) {
            throw new functions.https.HttpsError('unavailable', `Overpass ${res.status}`);
        }
        const json = await res.json();

        const now = new Date().toISOString();
        let created = 0, updated = 0;

        for (const el of (json.elements || [])) {
            const tags = el.tags || {};
            const name = String(tags.name || '').trim();
            if (!name) continue;
            const lat = el.lat ?? el.center?.lat;
            const lng = el.lon ?? el.center?.lon;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

            const slug = slugify(name);
            if (!slug) continue;

            const postcode = tags['addr:postcode'] || null;

            const existing = await db.ref('venues').orderByChild('slug').equalTo(slug).limitToFirst(1).once('value');
            let existingId = null;
            existing.forEach(c => { existingId = c.key; });

            if (existingId) {
                await db.ref(`venues/${existingId}`).update({
                    lat, lng,
                    postcode: postcode || (await db.ref(`venues/${existingId}/postcode`).once('value')).val(),
                    lastUsedAt: now
                });
                updated++;
            } else {
                const venueId = uuidv4();
                await db.ref(`venues/${venueId}`).set({
                    canonicalName: name.slice(0, 100),
                    slug,
                    aliases: [],
                    postcode,
                    lat, lng,
                    tournamentCount: 0,
                    firstUsedAt: now,
                    lastUsedAt: now,
                    source: 'osm',
                    status: 'approved',
                    suggestedBy: 'osm',
                    approvedBy: context.auth.uid,
                    approvedAt: now,
                    reviewNote: `Imported from OSM element ${el.type}/${el.id}`,
                    mergedInto: null
                });
                created++;
            }
        }

        return {
            ok: true,
            totalOsm: (json.elements || []).length,
            created,
            updated,
            runAt: now
        };
    });

// ---------------------------------------------------------------------------
// Google Places (New) seeder
// ---------------------------------------------------------------------------

/**
 * Default list of UK-wide search queries. Generous coverage of major
 * metro areas where padel is popular; add more via the callable's
 * `queries` parameter if you find gaps.
 */
const DEFAULT_UK_QUERIES = [
    'padel courts in London',
    'padel courts in Manchester',
    'padel courts in Birmingham',
    'padel courts in Leeds',
    'padel courts in Liverpool',
    'padel courts in Sheffield',
    'padel courts in Bristol',
    'padel courts in Newcastle upon Tyne',
    'padel courts in Nottingham',
    'padel courts in Leicester',
    'padel courts in Coventry',
    'padel courts in Glasgow',
    'padel courts in Edinburgh',
    'padel courts in Cardiff',
    'padel courts in Belfast',
    'padel courts in Aberdeen',
    'padel courts in Dundee',
    'padel courts in Brighton',
    'padel courts in Southampton',
    'padel courts in Portsmouth',
    'padel courts in Reading',
    'padel courts in Oxford',
    'padel courts in Cambridge',
    'padel courts in Milton Keynes',
    'padel courts in Norwich',
    'padel courts in Exeter',
    'padel courts in Plymouth',
    'padel courts in York',
    'padel courts in Hull',
    'padel courts in Middlesbrough',
    'padel clubs UK',
    'padel venues UK'
];

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.addressComponents',
    'places.location',
    'places.types',
    'places.nationalPhoneNumber',
    'places.websiteUri',
    'nextPageToken'
].join(',');

/**
 * Pull UK postcode out of Google's addressComponents if present.
 */
function extractPostcode(addressComponents) {
    if (!Array.isArray(addressComponents)) return null;
    const pc = addressComponents.find(c => Array.isArray(c.types) && c.types.includes('postal_code'));
    return pc?.longText || null;
}

async function fetchGooglePage(query, apiKey, pageToken = null) {
    const body = {
        textQuery: query,
        languageCode: 'en',
        regionCode: 'gb',
        maxResultCount: 20,
        ...(pageToken ? { pageToken } : {})
    };
    const res = await fetch(GOOGLE_PLACES_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': GOOGLE_FIELD_MASK
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Google Places ${res.status}: ${errBody.slice(0, 200)}`);
    }
    return res.json();
}

function looksLikePadel(place) {
    // Google tags are broad — most padel places come back with `stadium`,
    // `health`, `establishment`. Skip obvious non-matches.
    const name = (place.displayName?.text || '').toLowerCase();
    if (!name) return false;
    if (name.includes('padel')) return true;
    // Fallback — court/sport club with sport-ish types
    const types = place.types || [];
    const sporty = types.some(t => /sport|stadium|gym|athletic|club/i.test(t));
    return sporty && /padel/i.test(name);
}

exports.seedUKPadelVenuesFromGoogle = functions
    .region('europe-west1')
    .runWith({
        timeoutSeconds: 540,
        memory: '512MB',
        secrets: ['GOOGLE_PLACES_API_KEY']
    })
    .https.onCall(async (data, context) => {
        requireAdmin(context);
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            throw new functions.https.HttpsError('failed-precondition',
                'GOOGLE_PLACES_API_KEY secret is not configured. Run: firebase functions:secrets:set GOOGLE_PLACES_API_KEY');
        }

        const queries = Array.isArray(data?.queries) && data.queries.length > 0
            ? data.queries.map(q => String(q).slice(0, 150))
            : DEFAULT_UK_QUERIES;
        const dryRun = data?.dryRun === true;
        const maxPagesPerQuery = Math.min(3, Math.max(1, Number(data?.maxPagesPerQuery) || 2));

        const now = new Date().toISOString();
        let totalFromGoogle = 0, created = 0, updated = 0, skipped = 0;
        const failures = [];

        // Cache known place_ids + slugs in one pass to save RTDB reads.
        const snap = await db.ref('venues').once('value');
        const byPlaceId = {};
        const bySlug = {};
        snap.forEach(c => {
            const v = c.val() || {};
            if (v.googlePlaceId) byPlaceId[v.googlePlaceId] = c.key;
            if (v.slug) bySlug[v.slug] = c.key;
        });

        for (const q of queries) {
            let pageToken = null;
            for (let page = 0; page < maxPagesPerQuery; page++) {
                let json;
                try {
                    json = await fetchGooglePage(q, apiKey, pageToken);
                } catch (err) {
                    failures.push({ query: q, page, error: err.message });
                    break;
                }
                const places = json.places || [];
                totalFromGoogle += places.length;

                for (const p of places) {
                    if (!looksLikePadel(p)) { skipped++; continue; }
                    const name = (p.displayName?.text || '').trim();
                    const lat  = p.location?.latitude;
                    const lng  = p.location?.longitude;
                    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) { skipped++; continue; }

                    const slug = slugify(name);
                    if (!slug) { skipped++; continue; }

                    const placeId = p.id;
                    const existingId = (placeId && byPlaceId[placeId]) || bySlug[slug];

                    if (dryRun) continue;

                    const postcode = extractPostcode(p.addressComponents);
                    const payload = {
                        canonicalName: name.slice(0, 100),
                        slug,
                        postcode,
                        lat, lng,
                        lastUsedAt: now,
                        googlePlaceId: placeId || null,
                        googleAddress: p.formattedAddress || null,
                        googleWebsite: p.websiteUri || null,
                        googlePhone:   p.nationalPhoneNumber || null
                    };

                    if (existingId) {
                        // Never overwrite canonicalName or status; fill metadata.
                        const existing = (await db.ref(`venues/${existingId}`).once('value')).val() || {};
                        const patch = {};
                        if (!existing.googlePlaceId) patch.googlePlaceId = payload.googlePlaceId;
                        if (!existing.googleAddress) patch.googleAddress = payload.googleAddress;
                        if (!existing.googleWebsite) patch.googleWebsite = payload.googleWebsite;
                        if (!existing.googlePhone)   patch.googlePhone   = payload.googlePhone;
                        if (!existing.lat || !existing.lng) { patch.lat = lat; patch.lng = lng; }
                        if (!existing.postcode && postcode) patch.postcode = postcode;
                        patch.lastUsedAt = now;
                        await db.ref(`venues/${existingId}`).update(patch);
                        updated++;
                    } else {
                        const venueId = uuidv4();
                        await db.ref(`venues/${venueId}`).set({
                            canonicalName: payload.canonicalName,
                            slug,
                            aliases: [],
                            postcode,
                            lat, lng,
                            tournamentCount: 0,
                            firstUsedAt: now,
                            lastUsedAt: now,
                            source: 'google',
                            status: 'approved', // Google data auto-approved
                            suggestedBy: 'google',
                            approvedBy: context.auth.uid,
                            approvedAt: now,
                            reviewNote: `Imported from Google Places ${placeId || '(no id)'} via "${q}"`,
                            mergedInto: null,
                            googlePlaceId: placeId || null,
                            googleAddress: p.formattedAddress || null,
                            googleWebsite: p.websiteUri || null,
                            googlePhone:   p.nationalPhoneNumber || null
                        });
                        if (placeId) byPlaceId[placeId] = venueId;
                        bySlug[slug] = venueId;
                        created++;
                    }
                }

                pageToken = json.nextPageToken || null;
                if (!pageToken) break;

                // Google requires a brief wait before nextPageToken becomes valid (~1–2s).
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        return {
            ok: true,
            queriesRun: queries.length,
            totalFromGoogle,
            created,
            updated,
            skipped,
            failures,
            dryRun,
            runAt: now
        };
    });
