/**
 * firebase-config.js - Firebase Configuration and Initialization
 * Handles Firebase connection for the League system
 */

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
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    database = firebase.database();

    // Anonymous sign-in — the league rules require auth != null for every
    // write, so this must complete before any save. Exposed as a promise so
    // callers can await it rather than racing it.
    if (!window.firebaseAuthReady) {
        window.firebaseAuthReady = firebase.auth().signInAnonymously()
            .then((cred) => cred.user)
            .catch((err) => {
                console.error('Firebase anonymous auth failed:', err.code, err.message);
                return null;
            });
    }

    return database;
}

/**
 * Get reference to league data
 */
function getLeagueRef(leagueId) {
    return database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}`);
}

/**
 * Check if a league exists
 */
async function checkLeagueExists(leagueId) {
    try {
        const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}/meta`).once('value');
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking league existence:', error);
        return false;
    }
}

/**
 * Create a new league in Firebase
 */
async function createLeagueInFirebase(leagueId, data) {
    try {
        await database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}`).set(data);
        return true;
    } catch (error) {
        console.error('Error creating league:', error);
        return false;
    }
}

/**
 * Update league data in Firebase
 */
async function updateLeagueInFirebase(leagueId, path, data) {
    try {
        if (path) {
            await database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}/${path}`).update(data);
        } else {
            await database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}`).update(data);
        }
        return true;
    } catch (error) {
        console.error('Error updating league:', error);
        return false;
    }
}

/**
 * Set league data at a specific path
 */
async function setLeagueData(leagueId, path, data) {
    try {
        await database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}/${path}`).set(data);
        return true;
    } catch (error) {
        console.error('Error setting league data:', error);
        return false;
    }
}

/**
 * Save match score
 */
async function saveMatchScore(leagueId, seasonNumber, weekNumber, matchIndex, scoreData) {
    try {
        const path = `${CONFIG.FIREBASE_ROOT}/${leagueId}/seasons/${seasonNumber}/fixtures/${weekNumber}/${matchIndex}`;
        await database.ref(path).update({
            score: scoreData,
            status: CONFIG.MATCH_STATUS.COMPLETED
        });
        await database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}/meta/updatedAt`).set(new Date().toISOString());
        return true;
    } catch (error) {
        console.error('Error saving match score:', error);
        return false;
    }
}

/**
 * Update match status (postpone, cancel, etc.)
 */
async function updateMatchStatus(leagueId, seasonNumber, weekNumber, matchIndex, status) {
    try {
        const path = `${CONFIG.FIREBASE_ROOT}/${leagueId}/seasons/${seasonNumber}/fixtures/${weekNumber}/${matchIndex}/status`;
        await database.ref(path).set(status);
        return true;
    } catch (error) {
        console.error('Error updating match status:', error);
        return false;
    }
}

// ===== ORGANISER SECRETS =====
//
// The organiser key and passcode hash are NOT stored on the league node —
// that node is world-readable, so anything kept there is not a secret. They
// live under tournamentSecrets/<leagueId>, which has ".read": false.
//
// Because clients cannot read that node, verification is inverted: instead of
// fetching the stored secret and comparing locally, we *write* the candidate
// back as `proof`/`passcodeProof`. The security rule compares it against data
// only the server can see, so the write succeeds only for someone who already
// holds the secret — and the same write records `claimant`, which the league
// write rule accepts as proof of ownership.

/**
 * Seed the unreadable secrets node for a freshly created league.
 * Must run *after* the league node exists with meta/organizerUid set to the
 * caller's uid — that is the rule's precondition for creating the node.
 * @returns {Promise<boolean>}
 */
async function seedLeagueSecrets(leagueId, organiserKey, passcodeHash) {
    try {
        await database.ref(`tournamentSecrets/${leagueId}`).set({
            root: CONFIG.FIREBASE_ROOT,
            key: organiserKey,
            passcodeHash: passcodeHash
        });
        return true;
    } catch (error) {
        console.error('Error seeding league secrets:', error.code || error.message);
        return false;
    }
}

/**
 * Claim organiser ownership by proving possession of the organiser key.
 * @returns {Promise<boolean>} true if the rule accepted the proof
 */
async function claimLeagueWithKey(leagueId, organiserKey, uid) {
    return claimLeagueSecret(leagueId, { proof: organiserKey, claimant: uid });
}

/**
 * Claim organiser ownership by proving possession of the passcode.
 * Takes the *hash*, since that is what the secrets node stores.
 * @returns {Promise<boolean>} true if the rule accepted the proof
 */
async function claimLeagueWithPasscode(leagueId, passcodeHash, uid) {
    return claimLeagueSecret(leagueId, { passcodeProof: passcodeHash, claimant: uid });
}

async function claimLeagueSecret(leagueId, payload) {
    if (!leagueId || !payload.claimant) return false;
    try {
        await database.ref(`tournamentSecrets/${leagueId}`).update(payload);
        return true;
    } catch (error) {
        // A rejected write is the expected outcome for a wrong secret, so this
        // is a normal failure path rather than an error worth shouting about.
        console.log('League claim rejected:', error.code || error.message);
        return false;
    }
}
