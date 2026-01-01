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

// Initialize Firebase (will be called from main.js)
let database = null;

function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    database = firebase.database();
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
 * Save a single score to Firebase
 */
async function saveScoreToFirebase(tournamentId, roundIndex, matchIndex, team1Score, team2Score) {
    try {
        await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/scores/${roundIndex}_${matchIndex}`).set({
            team1: team1Score === null ? -1 : team1Score,
            team2: team2Score === null ? -1 : team2Score
        });
        await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta/updatedAt`).set(new Date().toISOString());
        return true;
    } catch (error) {
        console.error('Error saving score:', error);
        return false;
    }
}

/**
 * Verify organiser key against stored key
 */
async function verifyOrganiserKey(tournamentId, key) {
    try {
        const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta/organiserKey`).once('value');
        return snapshot.val() === key;
    } catch (error) {
        console.error('Error verifying organiser key:', error);
        return false;
    }
}

/**
 * Get organiser key hash for login verification
 */
async function getPasscodeHash(tournamentId) {
    try {
        const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta/passcodeHash`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting passcode hash:', error);
        return null;
    }
}

/**
 * Get organiser key after passcode verification
 */
async function getOrganiserKey(tournamentId) {
    try {
        const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${tournamentId}/meta/organiserKey`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting organiser key:', error);
        return null;
    }
}
