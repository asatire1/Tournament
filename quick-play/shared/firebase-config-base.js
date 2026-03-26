/**
 * firebase-config-base.js — Shared Firebase Configuration
 * Single source of truth for all quick-play tournament formats.
 *
 * Include this script BEFORE any format-specific firebase-config.js:
 *   <script src="../../quick-play/shared/firebase-config-base.js"></script>
 *
 * Each format's firebase-config.js can then omit the firebaseConfig object
 * and call initializeFirebaseShared() to get the database instance.
 *
 * SECURITY NOTE:
 * These values are safe to expose client-side — the Firebase client API key
 * is not a secret. Real security is enforced by Firebase Security Rules
 * (see firebase-rules-production.json). Never put server-side secrets here.
 */

/* global firebase */

const UBER_FIREBASE_CONFIG = {
    apiKey:            "AIzaSyDYIlRS_me7sy7ptNmRrvPQCeXP2H-hHzU",
    authDomain:        "stretford-padel-tournament.firebaseapp.com",
    databaseURL:       "https://stretford-padel-tournament-default-rtdb.europe-west1.firebasedatabase.app",
    projectId:         "stretford-padel-tournament",
    storageBucket:     "stretford-padel-tournament.firebasestorage.app",
    messagingSenderId: "596263602058",
    appId:             "1:596263602058:web:f69f7f8d00c60abbd0aa73",
    measurementId:     "G-TGJ6CZ4DZ0"
};

/**
 * Initialise Firebase using the shared config (idempotent — safe to call multiple times).
 * @returns {firebase.database.Database} The Firebase Realtime Database instance.
 */
function initializeFirebaseShared() {
    if (typeof firebase === 'undefined') {
        throw new Error(
            '[UberPadel] Firebase SDK not loaded. Add the Firebase CDN scripts before this file.'
        );
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(UBER_FIREBASE_CONFIG);
    }

    return firebase.database();
}

// Make available globally — plain-script pages use these directly
window.UBER_FIREBASE_CONFIG      = UBER_FIREBASE_CONFIG;
window.initializeFirebaseShared  = initializeFirebaseShared;
