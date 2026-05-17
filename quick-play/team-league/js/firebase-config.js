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

// Anonymous sign-in — required for all writes (Firebase rules check auth != null)
firebase.auth().signInAnonymously().then(() => {
    console.log('✅ Firebase anonymous auth ready');
}).catch((err) => {
    console.error('❌ Firebase anonymous auth failed:', err.code, err.message);
});

console.log('✅ Firebase initialized (Team Tournament)');
