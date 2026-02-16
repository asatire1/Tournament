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

/**
 * Verify organiser key
 */
async function verifyOrganiserKey(leagueId, key) {
    try {
        const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}/meta/organiserKey`).once('value');
        return snapshot.val() === key;
    } catch (error) {
        console.error('Error verifying organiser key:', error);
        return false;
    }
}

/**
 * Get passcode hash for login
 */
async function getPasscodeHash(leagueId) {
    try {
        const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}/meta/passcodeHash`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting passcode hash:', error);
        return null;
    }
}

/**
 * Get organiser key after passcode verification
 */
async function getOrganiserKey(leagueId) {
    try {
        const snapshot = await database.ref(`${CONFIG.FIREBASE_ROOT}/${leagueId}/meta/organiserKey`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting organiser key:', error);
        return null;
    }
}
