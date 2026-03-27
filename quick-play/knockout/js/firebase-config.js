// ===== FIREBASE CONFIGURATION =====

const firebaseConfig = {
    apiKey: "AIzaSyDYIlRS_me7sy7ptNmRrvPQCeXP2H-hHzU",
    authDomain: "stretford-padel-tournament.firebaseapp.com",
    databaseURL: "https://stretford-padel-tournament-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "stretford-padel-tournament",
    storageBucket: "stretford-padel-tournament.firebasestorage.app",
    messagingSenderId: "596263602058",
    appId: "1:596263602058:web:f69f7f8d00c60abbd0aa73",
    measurementId: "G-TGJ6CZ4DZ0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Firebase path for knockout tournaments
const KNOCKOUT_PATH = 'knockout-tournaments';

/**
 * Save tournament to Firebase
 */
async function saveTournament(tournamentId, data) {
    try {
        if (typeof OrganizerAuth !== 'undefined') await OrganizerAuth.init();
        await database.ref(`${KNOCKOUT_PATH}/${tournamentId}`).set(data);
        console.log('Tournament saved:', tournamentId);
        return true;
    } catch (error) {
        console.error('Error saving tournament:', error);
        return false;
    }
}

/**
 * Update tournament data
 */
async function updateTournament(tournamentId, updates) {
    try {
        await database.ref(`${KNOCKOUT_PATH}/${tournamentId}`).update(updates);
        return true;
    } catch (error) {
        console.error('Error updating tournament:', error);
        return false;
    }
}

/**
 * Load tournament from Firebase
 */
async function loadTournament(tournamentId) {
    try {
        const snapshot = await database.ref(`${KNOCKOUT_PATH}/${tournamentId}`).once('value');
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        console.error('Error loading tournament:', error);
        return null;
    }
}

/**
 * Subscribe to tournament updates
 */
function subscribeTournament(tournamentId, callback) {
    const ref = database.ref(`${KNOCKOUT_PATH}/${tournamentId}`);
    ref.on('value', (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        }
    });
    return () => ref.off('value');
}

/**
 * Update match score
 */
async function updateMatchScore(tournamentId, scoreKey, score) {
    try {
        await database.ref(`${KNOCKOUT_PATH}/${tournamentId}/scores/${scoreKey}`).set(score);
        // meta/updatedAt write removed — score writes are open to all users but meta writes
        // require organizer auth per Firebase Security Rules. See firebase-rules-production.json
        return true;
    } catch (error) {
        console.error('Error updating score:', error);
        return false;
    }
}

/**
 * Update knockout bracket
 */
async function updateKnockoutBracket(tournamentId, bracket) {
    try {
        await database.ref(`${KNOCKOUT_PATH}/${tournamentId}/bracket`).set(bracket);
        // meta/updatedAt write removed — score writes are open to all users but meta writes
        // require organizer auth per Firebase Security Rules. See firebase-rules-production.json
        return true;
    } catch (error) {
        console.error('Error updating bracket:', error);
        return false;
    }
}

/**
 * Load recent tournaments
 */
async function loadRecentTournaments(limit = 10) {
    try {
        const snapshot = await database.ref(KNOCKOUT_PATH)
            .orderByChild('meta/updatedAt')
            .limitToLast(limit)
            .once('value');

        const tournaments = [];
        snapshot.forEach(child => {
            const data = child.val();
            if (data && data.meta) {
                tournaments.push({
                    id: child.key,
                    ...data.meta,
                    groupCount: data.groups?.length || 0,
                    teamCount: data.groups?.reduce((sum, g) => sum + (g.teams?.length || 0), 0) || 0
                });
            }
        });

        return tournaments.reverse();
    } catch (error) {
        console.error('Error loading recent tournaments:', error);
        return [];
    }
}

console.log('Firebase initialized (Knockout)');
