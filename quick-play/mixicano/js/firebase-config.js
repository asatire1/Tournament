/**
 * firebase-config.js - Firebase Configuration and Initialization
 * Handles Firebase connection for real-time database
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

// Initialize Firebase
let database = null;

function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    database = firebase.database();

    // Anonymous sign-in — the database rules require auth != null for every
    // write, including scores, so this must complete before any save. Exposed
    // as a promise so callers can await it rather than racing it.
    window.firebaseAuthReady = firebase.auth().signInAnonymously()
        .then((cred) => cred.user)
        .catch((err) => {
            console.error('Firebase anonymous auth failed:', err.code, err.message);
            return null;
        });

    return database;
}

/**
 * Get reference to tournament data
 */
function getTournamentRef(tournamentId) {
    return database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}`);
}

/**
 * Check if a tournament exists
 */
async function checkTournamentExists(tournamentId) {
    try {
        const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta`).once('value');
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking tournament existence:', error);
        return false;
    }
}

/**
 * Create a new tournament in Firebase
 */
async function createTournamentInFirebase(tournamentId, data) {
    try {
        await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}`).set(data);
        return true;
    } catch (error) {
        console.error('Error creating tournament:', error);
        return false;
    }
}

/**
 * Update tournament data in Firebase
 */
async function updateTournamentInFirebase(tournamentId, data) {
    try {
        await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}`).update(data);
        return true;
    } catch (error) {
        console.error('Error updating tournament:', error);
        return false;
    }
}

/**
 * Verify an organiser key by proving it to the database rules.
 * See proveTournamentSecret() in shared/format-config.js — the key is never
 * read back to the client, it is written as proof and compared server-side.
 * @param {string} tournamentId
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function verifyOrganiserKey(tournamentId, key) {
    return await proveTournamentSecret(tournamentId, { key });
}

/**
 * Verify an organiser passcode by proving its hash to the database rules.
 * Replaces the old getPasscodeHash(): the stored hash is unreadable now, so
 * the caller hashes the entered passcode and we prove that value instead of
 * fetching the stored one and comparing locally.
 * @param {string} tournamentId
 * @param {string} passcodeHash - Hash of the entered passcode.
 * @returns {Promise<boolean>}
 */
async function verifyPasscode(tournamentId, passcodeHash) {
    return await proveTournamentSecret(tournamentId, { passcodeHash });
}

console.log('✅ Mixicano Firebase Config loaded');
