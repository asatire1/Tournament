/**
 * functions/api/index.js — UberPadel REST API
 *
 * Exposes a versioned HTTP REST API via Firebase Cloud Functions.
 * Base URL: https://europe-west1-stretford-padel-tournament.cloudfunctions.net/api/v1
 *
 * Authentication:
 *   All endpoints require a Firebase ID token in the Authorization header:
 *   Authorization: Bearer <firebase_id_token>
 *
 *   Rate limited to 100 req/min per user (enforced via Firebase RTDB counter).
 *
 * Endpoints:
 *
 *   GET  /v1/tournaments                 List caller's tournaments (all formats)
 *   GET  /v1/tournaments/:id             Get a single tournament
 *   POST /v1/tournaments                 Create a tournament
 *   GET  /v1/tournaments/:id/standings   Get standings for a tournament
 *
 *   GET  /v1/competitions                List competitions
 *   GET  /v1/competitions/:id            Get a single competition
 *
 *   GET  /v1/players/:uid/rating         Get a player's ELO rating
 *   GET  /v1/players/leaderboard         Get global leaderboard (top 100)
 *
 *   GET  /v1/me                          Get current user's profile + rating
 *   GET  /v1/me/notifications            Get current user's notifications
 *   POST /v1/me/notifications/:id/read   Mark a notification as read
 *
 *   GET  /v1/openapi.json                OpenAPI 3.0 spec
 *
 * @module functions/api
 */

'use strict';

const functions  = require('firebase-functions');
const admin      = require('firebase-admin');
const express    = require('express');
const cors       = require('cors');

// Only initialise the admin SDK once across all functions
if (!admin.apps.length) admin.initializeApp();

// Resolved lazily: admin.database() opens a connection immediately, and doing
// that while this module loads keeps the event loop busy during deployment
// analysis, which fails with "Cannot determine backend specification".
let _db = null;
const db = {
    ref(path) {
        if (!_db) _db = admin.database();
        return _db.ref(path);
    },
};

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Middleware: auth
// ---------------------------------------------------------------------------

async function requireAuth(req, res, next) {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing Authorization: Bearer <token>' });
    }

    const token = header.split(' ')[1];
    try {
        req.user = await admin.auth().verifyIdToken(token);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ---------------------------------------------------------------------------
// Middleware: rate limiting (100 req/min per user, via RTDB counter)
// ---------------------------------------------------------------------------

const RATE_LIMIT = 100;
const WINDOW_MS  = 60 * 1000;

async function rateLimit(req, res, next) {
    if (!req.user) return next();

    const uid     = req.user.uid;
    const bucket  = Math.floor(Date.now() / WINDOW_MS);
    const path    = `rateLimits/${uid}/${bucket}`;

    const ref     = db.ref(path);
    const snap    = await ref.once('value');
    const count   = (snap.val() ?? 0) + 1;

    if (count > RATE_LIMIT) {
        return res.status(429).json({ error: 'Rate limit exceeded (100 req/min)' });
    }

    await ref.set(count);

    // Auto-expire old buckets (TTL via a background cleanup — not needed in demo)
    next();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { FORMAT_ROOTS: TOURNAMENT_FORMAT_ROOTS } = require('../lib/format-roots.js');

function notFound(res, resource = 'Resource') {
    return res.status(404).json({ error: `${resource} not found` });
}

function serverError(res, err) {
    console.error('[API]', err);
    return res.status(500).json({ error: 'Internal server error' });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// --- Health check (no auth) ---
app.get('/v1/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// --- OpenAPI spec (no auth) ---
app.get('/v1/openapi.json', (req, res) => {
    // Served directly — in production this would be a static file
    res.json(require('./openapi.json'));
});

// -------------------------------------------------------------------------
// Tournaments
// -------------------------------------------------------------------------

/**
 * GET /v1/tournaments
 * List all tournaments belonging to the authenticated user.
 * Optional query: ?format=americano&status=completed&limit=50
 */
app.get('/v1/tournaments', requireAuth, rateLimit, async (req, res) => {
    const { format, status, limit = 50 } = req.query;
    const uid = req.user.uid;
    const results = [];

    const roots = format && TOURNAMENT_FORMAT_ROOTS[format]
        ? { [format]: TOURNAMENT_FORMAT_ROOTS[format] }
        : TOURNAMENT_FORMAT_ROOTS;

    try {
        await Promise.all(
            Object.entries(roots).map(async ([fmt, root]) => {
                const snap = await db.ref(root)
                    .orderByChild('meta/organizerUid')
                    .equalTo(uid)
                    .once('value');

                if (!snap.exists()) return;

                snap.forEach(child => {
                    const data = child.val();
                    if (status && data.meta?.status !== status) return;
                    results.push({
                        id:          child.key,
                        format:      fmt,
                        name:        data.meta?.name,
                        status:      data.meta?.status,
                        players:     Array.isArray(data.players) ? data.players.length : Object.keys(data.players ?? {}).length,
                        createdAt:   data.meta?.createdAt,
                        updatedAt:   data.meta?.updatedAt,
                    });
                });
            })
        );

        // Sort by createdAt descending, then limit
        results.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
        res.json({ tournaments: results.slice(0, Number(limit)), total: results.length });
    } catch (err) {
        serverError(res, err);
    }
});

/**
 * GET /v1/tournaments/:format/:id
 * Get a single tournament by format + id.
 */
app.get('/v1/tournaments/:format/:id', requireAuth, rateLimit, async (req, res) => {
    const { format, id } = req.params;
    const root = TOURNAMENT_FORMAT_ROOTS[format];
    if (!root) return res.status(400).json({ error: `Unknown format: ${format}` });

    try {
        const snap = await db.ref(`${root}/${id}`).once('value');
        if (!snap.exists()) return notFound(res, 'Tournament');

        const data = snap.val();

        // Only the owner or admin can read full data
        if (data.meta?.organizerUid !== req.user.uid && !req.user.admin) {
            // For non-owners, return only public fields
            return res.json({
                id,
                format,
                name:      data.meta?.name,
                status:    data.meta?.status,
                players:   Array.isArray(data.players)
                    ? data.players.map(p => ({ name: p.name, id: p.id }))
                    : [],
                createdAt: data.meta?.createdAt,
            });
        }

        res.json({ id, format, ...data });
    } catch (err) {
        serverError(res, err);
    }
});

/**
 * GET /v1/tournaments/:format/:id/standings
 * Return standings array for a completed or active tournament.
 */
app.get('/v1/tournaments/:format/:id/standings', requireAuth, rateLimit, async (req, res) => {
    const { format, id } = req.params;
    const root = TOURNAMENT_FORMAT_ROOTS[format];
    if (!root) return res.status(400).json({ error: `Unknown format: ${format}` });

    try {
        const snap = await db.ref(`${root}/${id}`).once('value');
        if (!snap.exists()) return notFound(res, 'Tournament');

        const data = snap.val();

        // Calculate standings using the appropriate engine
        // (Engines are not imported here to keep function cold start fast —
        //  in production this would use a pre-built bundle.)
        // For now, return the raw players + scores and let the client calculate.
        res.json({
            id,
            format,
            status:  data.meta?.status,
            players: data.players ?? [],
            scores:  data.scores  ?? {},
            rounds:  data.rounds  ?? [],
        });
    } catch (err) {
        serverError(res, err);
    }
});

// -------------------------------------------------------------------------
// Competitions
// -------------------------------------------------------------------------

/**
 * GET /v1/competitions
 * List competitions. Public endpoint — returns active/registration comps.
 * Optional: ?status=registration&limit=20
 */
app.get('/v1/competitions', requireAuth, rateLimit, async (req, res) => {
    const { status, limit = 20 } = req.query;

    try {
        let ref = db.ref('competitions');

        if (status) {
            ref = ref.orderByChild('meta/status').equalTo(status);
        }

        const snap = await ref.limitToLast(Number(limit)).once('value');
        if (!snap.exists()) return res.json({ competitions: [] });

        const competitions = [];
        snap.forEach(child => {
            const data = child.val();
            competitions.push({
                id:          child.key,
                name:        data.meta?.name,
                format:      data.meta?.format,
                status:      data.meta?.status,
                eventDate:   data.meta?.eventDate,
                venue:       data.meta?.venue,
                maxPlayers:  data.meta?.maxPlayers,
                registered:  Object.keys(data.registeredPlayers ?? {}).length,
                fee:         data.meta?.fee ?? 0,
            });
        });

        competitions.sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));
        res.json({ competitions });
    } catch (err) {
        serverError(res, err);
    }
});

/**
 * GET /v1/competitions/:id
 */
app.get('/v1/competitions/:id', requireAuth, rateLimit, async (req, res) => {
    try {
        const snap = await db.ref(`competitions/${req.params.id}`).once('value');
        if (!snap.exists()) return notFound(res, 'Competition');
        res.json({ id: req.params.id, ...snap.val() });
    } catch (err) {
        serverError(res, err);
    }
});

// -------------------------------------------------------------------------
// Players / Ratings
// -------------------------------------------------------------------------

/**
 * GET /v1/players/:uid/rating
 * Get a player's ELO rating. Public.
 */
app.get('/v1/players/:uid/rating', requireAuth, rateLimit, async (req, res) => {
    try {
        const snap = await db.ref(`userRatings/${req.params.uid}`).once('value');
        if (!snap.exists()) {
            return res.json({
                uid: req.params.uid,
                rating: 1000,
                gamesPlayed: 0,
                confidence: 0,
            });
        }
        res.json(snap.val());
    } catch (err) {
        serverError(res, err);
    }
});

/**
 * GET /v1/players/leaderboard?limit=100
 * Global leaderboard, sorted by rating desc.
 */
app.get('/v1/players/leaderboard', requireAuth, rateLimit, async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 200);

    try {
        const snap = await db.ref('userRatings')
            .orderByChild('rating')
            .limitToLast(limit)
            .once('value');

        const players = [];
        snap.forEach(child => players.push(child.val()));
        players.sort((a, b) => b.rating - a.rating);

        // Enrich with display name from user profile
        const enriched = await Promise.all(players.map(async (p, i) => {
            const profileSnap = await db.ref(`users/${p.uid}`).once('value');
            const profile = profileSnap.val();
            return {
                rank: i + 1,
                uid: p.uid,
                name: profile?.name ?? 'Unknown',
                rating: p.rating,
                gamesPlayed: p.gamesPlayed,
                confidence: p.confidence,
            };
        }));

        res.json({ leaderboard: enriched });
    } catch (err) {
        serverError(res, err);
    }
});

// -------------------------------------------------------------------------
// Me
// -------------------------------------------------------------------------

/**
 * GET /v1/me
 * Current authenticated user's profile + rating.
 */
app.get('/v1/me', requireAuth, rateLimit, async (req, res) => {
    const uid = req.user.uid;

    try {
        const [profileSnap, ratingSnap] = await Promise.all([
            db.ref(`users/${uid}`).once('value'),
            db.ref(`userRatings/${uid}`).once('value'),
        ]);

        const profile = profileSnap.val() ?? {};
        const rating  = ratingSnap.val() ?? { rating: 1000, gamesPlayed: 0, confidence: 0 };

        res.json({
            uid,
            profile: { uid, ...profile },
            rating,
        });
    } catch (err) {
        serverError(res, err);
    }
});

/**
 * GET /v1/me/notifications?limit=20
 */
app.get('/v1/me/notifications', requireAuth, rateLimit, async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const uid = req.user.uid;

    try {
        const snap = await db.ref(`users/${uid}/notifications`)
            .orderByChild('createdAt')
            .limitToLast(limit)
            .once('value');

        const notifications = [];
        if (snap.exists()) {
            snap.forEach(child => notifications.push({ id: child.key, ...child.val() }));
            notifications.reverse();
        }

        const unreadCount = notifications.filter(n => !n.read).length;
        res.json({ notifications, unreadCount });
    } catch (err) {
        serverError(res, err);
    }
});

/**
 * POST /v1/me/notifications/:id/read
 * Mark a notification as read.
 */
app.post('/v1/me/notifications/:id/read', requireAuth, rateLimit, async (req, res) => {
    const { id } = req.params;
    const uid = req.user.uid;

    try {
        await db.ref(`users/${uid}/notifications/${id}`).update({ read: true });
        res.json({ success: true });
    } catch (err) {
        serverError(res, err);
    }
});

// -------------------------------------------------------------------------
// 404 fallback
// -------------------------------------------------------------------------

app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        hint:  'See /v1/openapi.json for available endpoints',
    });
});

// ---------------------------------------------------------------------------
// Export as Cloud Function
// ---------------------------------------------------------------------------

exports.api = functions
    .region('europe-west1')
    .https.onRequest(app);
