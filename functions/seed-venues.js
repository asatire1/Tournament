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
 *   seedUKPadelVenuesFromGoogle({ apiKey?, postcodes? })   [FUTURE]
 *     Reserved for the paid one-off Google Places bulk-pull documented in
 *     the plan. Not wired up — call out when you want to fund it and I'll
 *     implement. Estimated one-time cost: £20–50 depending on list breadth.
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

            // Look up postcode from the tags if provided
            const postcode = tags['addr:postcode'] || null;

            const existing = await db.ref('venues').orderByChild('slug').equalTo(slug).limitToFirst(1).once('value');
            let existingId = null;
            existing.forEach(c => { existingId = c.key; });

            if (existingId) {
                // Upsert minimally — don't overwrite user-curated data
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
                    status: 'approved',          // OSM data auto-approved
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
