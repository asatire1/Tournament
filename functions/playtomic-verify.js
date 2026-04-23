/**
 * functions/playtomic-verify.js — Playtomic screenshot verification
 *
 * Callable: `verifyPlaytomicScreenshot({ storagePath })`
 *   1. Loads the screenshot from Firebase Storage (must live at
 *      `playtomic-screenshots/{auth.uid}/*` — enforced by storage.rules and
 *      re-checked in this function).
 *   2. Sends it to Claude Vision with a strict JSON-shape prompt.
 *   3. Validates: rating ∈ [0, 10], screenshotDate within last 30 days,
 *      aiConfidence ≥ 0.75.
 *   4. On pass → writes `playtomic_verifications/{uid}/{verificationId}` with
 *      status='verified', denormalises pointer + extracted fields onto
 *      `users/{uid}/currentPlaytomicVerification`.
 *   5. On fail → writes status='rejected' with a specific `failureReason` so
 *      the Phase F admin queue can surface it.
 *
 * Scheduled: `expireStalePlaytomicVerifications` — runs daily 02:00
 *   Europe/London; flips any `playtomic_verifications/**` row with
 *   expiresAt < now to status='expired' and pushes a `reverification_required`
 *   notification to the user.
 *
 * Secrets: ANTHROPIC_API_KEY, ANTHROPIC_MODEL (default
 *   claude-sonnet-4-20250514). Bind via
 *   firebase functions:secrets:set ANTHROPIC_API_KEY / ANTHROPIC_MODEL.
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Admin SDK is initialised in functions/index.js. Don't call initializeApp
// here — it would throw on duplicate.

const db = admin.database();
const storage = admin.storage();

const VERIFICATION_TTL_DAYS = 30;
const SCREENSHOT_MAX_BYTES  = 5 * 1024 * 1024; // 5 MB
const MIN_CONFIDENCE        = 0.75;
const MAX_SCREENSHOT_AGE_DAYS = 30;

// Lazy Anthropic SDK import — keeps cold start fast if the function isn't hit.
let _anthropicClient = null;
function getAnthropic(apiKey) {
    if (_anthropicClient) return _anthropicClient;
    const Anthropic = require('@anthropic-ai/sdk');
    _anthropicClient = new Anthropic.default({ apiKey });
    return _anthropicClient;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strict JSON-shape extraction prompt for Claude Vision.
 * Mirrors the pattern used in /Users/abdul/StockIQ/api/src/services/invoiceExtraction.js
 * but tuned for Playtomic profile screenshots.
 */
const EXTRACTION_PROMPT = `You are verifying a screenshot of a Playtomic player profile page.

Return STRICT JSON with this exact shape, no commentary, no code fences:

{
  "fullName": string | null,            // Player's full name as shown on the profile
  "playtomicUsername": string | null,   // The @handle or username if visible; otherwise null
  "rating": number | null,              // Playtomic level (0.00–10.00, usually 1 decimal)
  "screenshotDate": string | null,      // ISO 8601 date the screenshot was taken, IF visible in the UI (e.g. a status-bar clock, a timestamp in the app). Otherwise null — do NOT guess.
  "confidence": number,                 // 0.00–1.00, your confidence that this is a real Playtomic profile screenshot with a readable rating
  "looksLikePlaytomic": boolean,        // true only if the UI chrome clearly matches Playtomic (logo, colours, layout)
  "failureReason": string | null        // If you can't extract, short reason: "rating_missing" | "not_playtomic" | "image_unreadable" | "stale_date" | null
}

Rules:
- Rating must be a number 0–10, not a percentile or ranking.
- If the image is not a Playtomic profile, set looksLikePlaytomic=false, confidence < 0.5, and failureReason="not_playtomic".
- If rating is not clearly visible, set rating=null and failureReason="rating_missing".
- Do NOT hallucinate. Prefer null + low confidence over a wrong value.`;

/**
 * Send an image to Claude Vision and return the parsed JSON response.
 */
async function extractWithClaude(apiKey, model, imageBase64, mediaType) {
    const client = getAnthropic(apiKey);
    const res = await client.messages.create({
        model,
        max_tokens: 512,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'image',
                    source: { type: 'base64', media_type: mediaType, data: imageBase64 }
                },
                { type: 'text', text: EXTRACTION_PROMPT }
            ]
        }]
    });

    const textBlock = res.content.find(b => b.type === 'text');
    if (!textBlock?.text) throw new Error('Claude returned no text block');

    // Strip optional code fences / chatter, then parse
    let raw = textBlock.text.trim();
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    try {
        return { parsed: JSON.parse(raw), rawText: textBlock.text };
    } catch (err) {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
            try { return { parsed: JSON.parse(m[0]), rawText: textBlock.text }; }
            catch { /* fall through */ }
        }
        throw new Error(`Claude returned non-JSON: ${raw.slice(0, 200)}`);
    }
}

/**
 * Validate extracted fields. Returns { ok, failureReason }.
 */
function validateExtraction(extracted) {
    if (!extracted) return { ok: false, failureReason: 'no_extraction' };
    if (extracted.looksLikePlaytomic === false) {
        return { ok: false, failureReason: extracted.failureReason || 'not_playtomic' };
    }
    if (typeof extracted.confidence !== 'number' || extracted.confidence < MIN_CONFIDENCE) {
        return { ok: false, failureReason: 'low_confidence' };
    }
    if (typeof extracted.rating !== 'number' || extracted.rating < 0 || extracted.rating > 10) {
        return { ok: false, failureReason: extracted.failureReason || 'rating_missing' };
    }
    if (extracted.screenshotDate) {
        const date = new Date(extracted.screenshotDate);
        if (Number.isFinite(date.getTime())) {
            const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays > MAX_SCREENSHOT_AGE_DAYS) {
                return { ok: false, failureReason: 'stale_screenshot' };
            }
        }
    }
    return { ok: true };
}

/**
 * Download a file from Storage. Returns { buffer, contentType }.
 */
async function downloadFromStorage(storagePath) {
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) throw new functions.https.HttpsError('not-found', `Screenshot not found at ${storagePath}`);

    const [metadata] = await file.getMetadata();
    if (Number(metadata.size) > SCREENSHOT_MAX_BYTES) {
        throw new functions.https.HttpsError('resource-exhausted', 'Screenshot exceeds 5 MB limit');
    }
    const contentType = metadata.contentType || 'image/jpeg';
    if (!/^image\//.test(contentType)) {
        throw new functions.https.HttpsError('invalid-argument', `Not an image: ${contentType}`);
    }

    const [buffer] = await file.download();
    return { buffer, contentType };
}

// ---------------------------------------------------------------------------
// Callable: verifyPlaytomicScreenshot
// ---------------------------------------------------------------------------

exports.verifyPlaytomicScreenshot = functions
    .region('europe-west1')
    .runWith({
        timeoutSeconds: 60,
        memory: '512MB',
        secrets: ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']
    })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
        }
        const uid = context.auth.uid;

        const { storagePath } = data || {};
        if (!storagePath || typeof storagePath !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'storagePath required');
        }
        // Path safety: must live under `playtomic-screenshots/{uid}/`
        if (!storagePath.startsWith(`playtomic-screenshots/${uid}/`)) {
            throw new functions.https.HttpsError('permission-denied',
                `storagePath must start with playtomic-screenshots/${uid}/`);
        }

        // Phase F — per-UID rate limit (5 / hour)
        const { checkPlaytomicVerifyRate } = require('./admin-verification.js');
        const rl = await checkPlaytomicVerifyRate(uid, 5);
        if (!rl.ok) {
            throw new functions.https.HttpsError('resource-exhausted',
                'Too many verification attempts — please try again in an hour.');
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        const model  = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
        if (!apiKey) {
            console.error('ANTHROPIC_API_KEY not configured');
            throw new functions.https.HttpsError('failed-precondition',
                'Verification service not configured');
        }

        // Load screenshot
        let buffer, contentType;
        try {
            ({ buffer, contentType } = await downloadFromStorage(storagePath));
        } catch (err) {
            if (err instanceof functions.https.HttpsError) throw err;
            console.error('downloadFromStorage failed:', err);
            throw new functions.https.HttpsError('internal', 'Could not read screenshot');
        }
        const mediaType = contentType.split(';')[0].trim();
        const imageBase64 = buffer.toString('base64');

        // Call Claude
        let extracted = null, rawText = null;
        try {
            ({ parsed: extracted, rawText } = await extractWithClaude(apiKey, model, imageBase64, mediaType));
        } catch (err) {
            console.error('Claude call failed:', err);
            // Write a pending-rejected record so admin queue can retry manually
            const verificationId = uuidv4();
            await writeVerificationRecord({
                uid, verificationId, storagePath, contentType, status: 'rejected',
                extracted: null, failureReason: 'ai_service_error', aiModel: model, aiRawResponse: null
            });
            throw new functions.https.HttpsError('unavailable', 'AI verification temporarily unavailable');
        }

        // Validate
        const v = validateExtraction(extracted);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + VERIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000);
        const verificationId = uuidv4();

        if (!v.ok) {
            await writeVerificationRecord({
                uid, verificationId, storagePath, contentType,
                status: 'rejected',
                extracted,
                failureReason: v.failureReason,
                aiModel: model,
                aiRawResponse: rawText,
                expiresAt: null
            });
            return {
                status: 'rejected',
                verificationId,
                failureReason: v.failureReason,
                extracted: pickSafe(extracted)
            };
        }

        // Success
        await writeVerificationRecord({
            uid, verificationId, storagePath, contentType,
            status: 'verified',
            extracted,
            failureReason: null,
            aiModel: model,
            aiRawResponse: rawText,
            expiresAt: expiresAt.toISOString(),
            verifiedAt: now.toISOString()
        });

        // Denormalise onto user profile
        await db.ref(`users/${uid}/currentPlaytomicVerification`).set({
            verificationId,
            status: 'verified',
            extractedRating: extracted.rating,
            extractedName: extracted.fullName || null,
            verifiedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString()
        });
        // Also mirror rating onto users/{uid}.playtomicLevel + username (per plan
        // — single source of truth for rating on the profile).
        const userPatch = {
            playtomicLevel: extracted.rating,
            updatedAt: now.toISOString()
        };
        if (extracted.playtomicUsername) userPatch.playtomicUsername = extracted.playtomicUsername;
        if (extracted.fullName)          userPatch.name              = extracted.fullName;
        // Only set status: 'verified' if the user row already exists (don't
        // create a partial user here — auth-service.js owns the row's creation).
        const userSnap = await db.ref(`users/${uid}`).once('value');
        if (userSnap.exists()) {
            userPatch.status = 'verified';
            await db.ref(`users/${uid}`).update(userPatch);
        }

        return {
            status: 'verified',
            verificationId,
            extractedRating: extracted.rating,
            extractedName: extracted.fullName || null,
            extractedUsername: extracted.playtomicUsername || null,
            expiresAt: expiresAt.toISOString()
        };
    });

async function writeVerificationRecord({
    uid, verificationId, storagePath, contentType,
    status, extracted, failureReason, aiModel, aiRawResponse,
    expiresAt, verifiedAt
}) {
    const now = new Date().toISOString();
    const record = {
        uid,
        storagePath,
        screenshotUrl: null, // signed URLs generated on demand; path is the source of truth
        extractedName:     extracted?.fullName || null,
        extractedUsername: extracted?.playtomicUsername || null,
        extractedRating:   (typeof extracted?.rating === 'number') ? extracted.rating : null,
        screenshotDate:    extracted?.screenshotDate || null,
        aiConfidence:      (typeof extracted?.confidence === 'number') ? extracted.confidence : null,
        aiModel,
        aiRawResponse:     aiRawResponse ? String(aiRawResponse).slice(0, 4000) : null,
        status,
        failureReason:     failureReason || null,
        createdAt:         now,
        verifiedAt:        verifiedAt || null,
        expiresAt:         expiresAt || null,
        reviewedBy:        null
    };
    await db.ref(`playtomic_verifications/${uid}/${verificationId}`).set(record);
}

function pickSafe(e) {
    if (!e) return null;
    return {
        fullName: e.fullName || null,
        playtomicUsername: e.playtomicUsername || null,
        rating: (typeof e.rating === 'number') ? e.rating : null,
        confidence: e.confidence || null
    };
}

// ---------------------------------------------------------------------------
// Scheduled: expireStalePlaytomicVerifications
// ---------------------------------------------------------------------------

exports.expireStalePlaytomicVerifications = functions
    .region('europe-west1')
    .pubsub.schedule('0 2 * * *')            // daily 02:00
    .timeZone('Europe/London')
    .onRun(async () => {
        const nowIso = new Date().toISOString();
        const expiredUids = new Set();
        let total = 0;

        // Walk all users' current verification pointers — cheap because the
        // denormalisation keeps only one pointer per user.
        const snap = await db.ref('users')
            .orderByChild('currentPlaytomicVerification/expiresAt')
            .endAt(nowIso)
            .once('value');

        const updates = {};
        snap.forEach(child => {
            const uid = child.key;
            const cur = child.val()?.currentPlaytomicVerification;
            if (!cur || cur.status === 'expired') return;
            if (!cur.expiresAt || cur.expiresAt > nowIso) return;
            total++;
            expiredUids.add(uid);
            updates[`users/${uid}/currentPlaytomicVerification/status`] = 'expired';
            if (cur.verificationId) {
                updates[`playtomic_verifications/${uid}/${cur.verificationId}/status`] = 'expired';
            }
        });

        if (total > 0) {
            await db.ref().update(updates);
            console.log(`[expireStalePlaytomicVerifications] expired ${total} verification(s)`);
            // Push re-verify notifications (best-effort, non-atomic)
            await Promise.all([...expiredUids].map(uid =>
                pushNotification(uid, {
                    type: 'reverification_required',
                    title: 'Playtomic verification expired',
                    body: 'Upload a fresh Playtomic screenshot to keep registering for tournaments.',
                    tournamentId: null
                }).catch(err => console.warn('notif failed for', uid, err))
            ));
        }

        return null;
    });

// Duplicate notification helper (kept local so this module can be tested
// standalone). Matches the pushNotification in functions/index.js shape.
async function pushNotification(uid, { type, title, body, tournamentId = null }) {
    const ref = db.ref(`users/${uid}/notifications`).push();
    await ref.set({
        type,
        title,
        body,
        tournamentId,
        read: false,
        createdAt: new Date().toISOString()
    });
}

// Export internals for tests (not Cloud Functions)
exports._internal = {
    EXTRACTION_PROMPT,
    VERIFICATION_TTL_DAYS,
    MIN_CONFIDENCE,
    MAX_SCREENSHOT_AGE_DAYS,
    validateExtraction
};
