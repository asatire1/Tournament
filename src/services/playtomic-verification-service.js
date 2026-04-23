/**
 * src/services/playtomic-verification-service.js — Client wrapper
 *
 * Loaded as a classic <script> on pages that need verification (login,
 * reverify, profile). Requires Firebase Storage + Functions SDKs.
 *
 * Public API (attached to window.PlaytomicVerificationService):
 *   submitScreenshot(file): upload + trigger verification
 *   getCurrent(uid): read users/{uid}/currentPlaytomicVerification
 *   subscribeCurrent(uid, cb): live updates
 *   isExpired(record): bool
 *   daysUntilExpiry(record): number | null
 */

(function () {

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const PlaytomicVerificationService = {

    /**
     * Upload a screenshot and run verification.
     * @param {File} file
     * @param {object} [opts]
     * @param {(progress: number) => void} [opts.onProgress] 0..1
     * @returns {Promise<object>} {status, verificationId, extractedRating?, failureReason?, expiresAt?}
     */
    async submitScreenshot(file, opts = {}) {
        if (!file || !(file instanceof File || file instanceof Blob)) {
            throw new Error('A file is required');
        }
        if (file.size > MAX_FILE_BYTES) {
            throw new Error('Screenshot must be under 5 MB');
        }
        if (file.type && !ALLOWED_TYPES.some(t => file.type.toLowerCase().startsWith(t.split('/')[0]))) {
            throw new Error('Please upload an image');
        }

        // Must be authenticated
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('Sign in required');
        const uid = user.uid;

        // Upload to per-UID folder
        const storage = firebase.storage();
        const filename = `${Date.now()}-${_slug(file.name || 'screenshot.jpg')}`;
        const storagePath = `playtomic-screenshots/${uid}/${filename}`;
        const ref = storage.ref().child(storagePath);

        await new Promise((resolve, reject) => {
            const task = ref.put(file, { contentType: file.type || 'image/jpeg' });
            task.on('state_changed',
                snap => {
                    if (typeof opts.onProgress === 'function') {
                        const pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) : 0;
                        try { opts.onProgress(Math.min(0.9, pct * 0.9)); } catch (_) {}
                    }
                },
                err => reject(err),
                () => resolve()
            );
        });
        if (typeof opts.onProgress === 'function') opts.onProgress(0.9);

        // Call verification function
        const callable = firebase.functions
            ? firebase.app().functions('europe-west1').httpsCallable('verifyPlaytomicScreenshot')
            : firebase.functions('europe-west1').httpsCallable('verifyPlaytomicScreenshot');
        const res = await callable({ storagePath });
        if (typeof opts.onProgress === 'function') opts.onProgress(1);
        return res.data || res;
    },

    /**
     * Read the current (denormalised) verification pointer for a user.
     */
    async getCurrent(uid) {
        const target = uid || firebase.auth().currentUser?.uid;
        if (!target) return null;
        const snap = await firebase.database()
            .ref(`users/${target}/currentPlaytomicVerification`)
            .once('value');
        return snap.val();
    },

    subscribeCurrent(uid, cb) {
        const target = uid || firebase.auth().currentUser?.uid;
        if (!target) return () => {};
        const ref = firebase.database().ref(`users/${target}/currentPlaytomicVerification`);
        const handler = snap => cb(snap.val());
        ref.on('value', handler);
        return () => ref.off('value', handler);
    },

    isExpired(record) {
        if (!record) return true;
        if (record.status === 'expired') return true;
        if (!record.expiresAt) return false;
        return new Date(record.expiresAt).getTime() < Date.now();
    },

    /**
     * @returns {number|null} Days until expiry (negative if already expired).
     */
    daysUntilExpiry(record) {
        if (!record?.expiresAt) return null;
        const ms = new Date(record.expiresAt).getTime() - Date.now();
        return Math.floor(ms / (1000 * 60 * 60 * 24));
    },

    /**
     * Returns true if a user should see the re-verify prompt (within 7d of expiry).
     */
    needsReverify(record) {
        const days = this.daysUntilExpiry(record);
        if (days === null) return !record || record.status !== 'verified';
        return days < 7;
    },

    /**
     * Human-readable failure reason.
     */
    describeFailure(code) {
        switch (code) {
            case 'low_confidence':   return "We couldn't read that screenshot clearly. Please upload a full-resolution screenshot of your Playtomic profile.";
            case 'rating_missing':   return "We couldn't find a Playtomic level in the image. Make sure your level (0–10) is visible.";
            case 'stale_screenshot': return 'This screenshot is older than 30 days. Please take a fresh one from the Playtomic app.';
            case 'not_playtomic':    return "That doesn't look like a Playtomic profile screenshot. Please try again.";
            case 'image_unreadable': return "We couldn't read the image. Please upload a clear, full-resolution screenshot.";
            case 'ai_service_error': return 'Verification service is temporarily unavailable. Please try again in a minute.';
            default:                 return 'Verification failed. Please try another screenshot.';
        }
    }
};

function _slug(name) {
    return String(name).replace(/[^a-zA-Z0-9_.-]+/g, '-').slice(0, 80);
}

if (typeof window !== 'undefined') {
    window.PlaytomicVerificationService = PlaytomicVerificationService;
}

})();
