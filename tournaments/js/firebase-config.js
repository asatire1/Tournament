/**
 * tournaments/js/firebase-config.js — Firebase init + unified-root helpers
 *
 * All helpers operate on the unified root `tournaments/{id}` only.
 * For reading legacy roots (americano-tournaments/*, etc.) use the format-
 * specific pages, not this module.
 *
 * The whole module is IIFE-wrapped so `firebaseConfig` and `database`
 * don't collide with identically-named globals declared by the legacy
 * home page (index.html has an inline `const firebaseConfig = {...}`).
 * Exposed functions attach to `window.*` at the bottom.
 */

(function () {

const firebaseConfig = {
    apiKey: "AIzaSyDYIlRS_me7sy7ptNmRrvPQCeXP2H-hHzU",
    authDomain: "stretford-padel-tournament.firebaseapp.com",
    databaseURL: "https://stretford-padel-tournament-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "stretford-padel-tournament",
    storageBucket: "stretford-padel-tournament.firebasestorage.app",
    messagingSenderId: "596263602058",
    appId: "1:596263602058:web:f69f7f8d00c60abbd0aa73"
};

let database = null;

function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        return null;
    }
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    database = firebase.database();
    return database;
}

// ---------------------------------------------------------------------------
// Unified tournaments/{id} helpers
// ---------------------------------------------------------------------------

/**
 * Get a reference to an entire tournament by ID.
 */
function getTournamentRef(tournamentId) {
    return database.ref(`${TOURNAMENTS_CONFIG.FIREBASE_ROOT}/${tournamentId}`);
}

/**
 * Check if a tournament exists.
 */
async function checkTournamentExists(tournamentId) {
    try {
        const snap = await database
            .ref(`${TOURNAMENTS_CONFIG.FIREBASE_ROOT}/${tournamentId}/meta`)
            .once('value');
        return snap.exists();
    } catch (error) {
        console.error('Error checking tournament existence:', error);
        return false;
    }
}

/**
 * Create a new tournament under the unified root.
 * @param {string} tournamentId
 * @param {object} data - Full tournament payload (meta + roster + empty scores)
 */
async function createTournamentInFirebase(tournamentId, data) {
    try {
        await database
            .ref(`${TOURNAMENTS_CONFIG.FIREBASE_ROOT}/${tournamentId}`)
            .set(data);
        return true;
    } catch (error) {
        console.error('Error creating tournament:', error);
        return false;
    }
}

/**
 * Update meta fields for an existing tournament.
 */
async function updateTournamentMeta(tournamentId, metaPatch) {
    try {
        await database
            .ref(`${TOURNAMENTS_CONFIG.FIREBASE_ROOT}/${tournamentId}/meta`)
            .update({
                ...metaPatch,
                updatedAt: new Date().toISOString()
            });
        return true;
    } catch (error) {
        console.error('Error updating tournament meta:', error);
        return false;
    }
}

/**
 * Verify an organiser key against the stored meta key.
 */
async function verifyOrganiserKey(tournamentId, key) {
    try {
        const snap = await database
            .ref(`${TOURNAMENTS_CONFIG.FIREBASE_ROOT}/${tournamentId}/meta/organiserKey`)
            .once('value');
        return snap.val() === key;
    } catch (error) {
        console.error('Error verifying organiser key:', error);
        return false;
    }
}

// ---------------------------------------------------------------------------
// Browse helpers
// ---------------------------------------------------------------------------

/**
 * Query public open tournaments, ordered by startDate ascending.
 * Filtered client-side by format / radius / etc. — RTDB doesn't support
 * compound queries, so we pull a reasonable window and narrow.
 *
 * @param {object} opts
 * @param {number} [opts.limit=100]
 * @returns {Promise<Array>} List of tournament summaries
 */
async function queryPublicTournaments({ limit = 100 } = {}) {
    try {
        const snap = await database
            .ref(TOURNAMENTS_CONFIG.FIREBASE_ROOT)
            .orderByChild('meta/isPublic')
            .equalTo(true)
            .limitToFirst(limit)
            .once('value');

        const results = [];
        snap.forEach(child => {
            const val = child.val() || {};
            const meta = val.meta || {};
            results.push({
                id: child.key,
                name: meta.name || 'Unnamed tournament',
                format: meta.format || 'americano',
                registrationMode: meta.registrationMode || 'names_only',
                status: meta.status || 'draft',
                isPublic: meta.isPublic === true,
                startDate: meta.startDate || null,
                registrationDeadline: meta.registrationDeadline || null,
                entryFeeGBP: meta.entryFeeGBP ?? null,
                ratingLimit: meta.ratingLimit || null,
                location: meta.location || null,
                createdAt: meta.createdAt,
                updatedAt: meta.updatedAt,
                playerCount: (val.players && Object.keys(val.players).length)
                    || (val.pairs && Object.keys(val.pairs).length * 2)
                    || (val.namesOnlyRoster?.playerNames && Object.keys(val.namesOnlyRoster.playerNames).length)
                    || 0
            });
        });
        return results;
    } catch (error) {
        console.error('queryPublicTournaments failed:', error);
        return [];
    }
}

/**
 * Query "my tournaments" by the current organiser UID.
 */
async function queryMyTournaments(organizerUid) {
    try {
        const snap = await database
            .ref(TOURNAMENTS_CONFIG.FIREBASE_ROOT)
            .orderByChild('meta/organizerUid')
            .equalTo(organizerUid)
            .once('value');

        const results = [];
        snap.forEach(child => {
            const val = child.val() || {};
            const meta = val.meta || {};
            results.push({
                id: child.key,
                name: meta.name || 'Unnamed',
                format: meta.format,
                registrationMode: meta.registrationMode,
                status: meta.status,
                isPublic: meta.isPublic === true,
                startDate: meta.startDate,
                createdAt: meta.createdAt,
                updatedAt: meta.updatedAt,
                organiserKey: meta.organiserKey
            });
        });
        results.sort((a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0));
        return results;
    } catch (error) {
        console.error('queryMyTournaments failed:', error);
        return [];
    }
}

// Make available globally for the unified shell pages.
// Check existing globals first — some legacy pages already define
// `initializeFirebase` / `verifyOrganiserKey` scoped to their own root;
// we only want to overwrite on the unified shell pages.
if (typeof window !== 'undefined') {
    // The unified-root helpers get unique names so they never clash with
    // the legacy per-format helpers that share the same short names.
    window.tInitializeFirebase        = initializeFirebase;
    window.tGetTournamentRef          = getTournamentRef;
    window.tCheckTournamentExists     = checkTournamentExists;
    window.tCreateTournamentInFirebase = createTournamentInFirebase;
    window.tUpdateTournamentMeta      = updateTournamentMeta;
    window.tVerifyOrganiserKey        = verifyOrganiserKey;
    window.queryPublicTournaments    = queryPublicTournaments;
    window.queryMyTournaments        = queryMyTournaments;

    // On pages that don't already have these (new tournaments/ shell pages),
    // also expose the short names for ergonomic access from create-wizard etc.
    if (typeof window.initializeFirebase !== 'function') {
        window.initializeFirebase         = initializeFirebase;
        window.getTournamentRef           = getTournamentRef;
        window.checkTournamentExists      = checkTournamentExists;
        window.createTournamentInFirebase = createTournamentInFirebase;
        window.updateTournamentMeta       = updateTournamentMeta;
        window.verifyOrganiserKey         = verifyOrganiserKey;
    }

    // The `database` const inside the IIFE is private; expose an accessor
    // for modules that need it (e.g. state.js writes to a ref directly).
    window.getTournamentsDatabase = () => database;
}

})();

