// ===== FIREBASE CONFIGURATION =====

const firebaseConfig = {
    apiKey: "AIzaSyCLHcMdXwrSvLRwcgOqO0Devk3F29qQhJM",
    authDomain: "stretford-padel.firebaseapp.com",
    databaseURL: "https://stretford-padel-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "stretford-padel",
    storageBucket: "stretford-padel.firebasestorage.app",
    messagingSenderId: "175838008731",
    appId: "1:175838008731:web:4499871a8d7fcbf5e26554"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

console.log('✅ Firebase initialized (Team League)');
