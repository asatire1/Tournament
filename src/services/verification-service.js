/**
 * verification-service.js — Prize Money Tournament Verification
 *
 * Handles the full lifecycle of prize-money tournament verification:
 *   - Photo evidence uploads (via Firebase Storage)
 *   - Organiser result confirmation
 *   - Player result confirmations
 *   - GPS location capture
 *   - Admin review queue
 *   - Payout status tracking
 *
 * Firebase paths used:
 *   verifications/{competitionId}      — verification record
 *   competitions/{competitionId}/meta  — reads prizeMoney fields
 */

export const VerificationService = {

    // ===== CONFIG =====

    FIREBASE_CONFIG: {
        apiKey: 'AIzaSyDYIlRS_me7sy7ptNmRrvPQCeXP2H-hHzU',
        authDomain: 'stretford-padel-tournament.firebaseapp.com',
        databaseURL: 'https://stretford-padel-tournament-default-rtdb.europe-west1.firebasedatabase.app',
        projectId: 'stretford-padel-tournament',
        storageBucket: 'stretford-padel-tournament.appspot.com',
        messagingSenderId: '596263602058',
        appId: '1:596263602058:web:f69f7f8d00c60abbd0aa73',
    },

    STATUS: {
        PENDING:    'pending',     // Verification record created, awaiting submission
        SUBMITTED:  'submitted',   // Organiser submitted; awaiting admin review
        APPROVED:   'approved',    // Admin approved — payout authorised
        REJECTED:   'rejected',    // Admin rejected — reason recorded
    },

    PAYMENT_STATUS: {
        AWAITING:    'awaiting_approval',
        PROCESSING:  'processing',
        PAID:        'paid',
        FAILED:      'failed',
    },

    PHOTOS_REQUIRED: 2,
    PLAYER_CONFIRM_THRESHOLD: 0.5, // 50 % of players must confirm

    _db: null,
    _storage: null,
    _initialized: false,

    // ===== INIT =====

    init() {
        if (this._initialized) return;
        if (typeof firebase === 'undefined') return;

        if (!firebase.apps.length) firebase.initializeApp(this.FIREBASE_CONFIG);
        this._db = firebase.database();
        if (firebase.storage) this._storage = firebase.storage();
        this._initialized = true;
    },

    _ref(path) {
        this.init();
        return this._db.ref(path);
    },

    // ===== CORE CRUD =====

    /**
     * Create a verification record when a prize-money competition is started.
     */
    async create(competitionId, { organizerId, prizePool, currency = 'GBP', split }) {
        const record = {
            competitionId,
            organizerId,
            status: this.STATUS.PENDING,
            paymentStatus: this.PAYMENT_STATUS.AWAITING,
            prizePool,
            currency,
            split: split || { first: 0.6, second: 0.3, third: 0.1 },
            photos: {},
            organiserConfirmed: false,
            organiserConfirmedAt: null,
            playerConfirmations: {},
            gpsLocation: null,
            adminNote: null,
            reviewedBy: null,
            reviewedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await this._ref(`verifications/${competitionId}`).set(record);
        return record;
    },

    /**
     * Get a verification record.
     */
    async get(competitionId) {
        const snap = await this._ref(`verifications/${competitionId}`).once('value');
        return snap.val();
    },

    /**
     * Subscribe to real-time updates on a verification record.
     */
    subscribe(competitionId, callback) {
        const ref = this._ref(`verifications/${competitionId}`);
        ref.on('value', snap => callback(snap.val()));
        return () => ref.off('value');
    },

    // ===== PHOTO UPLOADS =====

    /**
     * Upload a photo using Firebase Storage.
     * Falls back to storing a base64 data-url in RTDB if Storage unavailable.
     * Returns the download URL.
     */
    async uploadPhoto(competitionId, file) {
        let url;

        if (this._storage) {
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `verifications/${competitionId}/${Date.now()}.${ext}`;
            const ref = this._storage.ref(path);
            await ref.put(file);
            url = await ref.getDownloadURL();
        } else {
            // Fallback: embed as base64 (≤ 1 MB only)
            if (file.size > 1_000_000) throw new Error('File too large for fallback storage (max 1 MB without Storage SDK)');
            url = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onload = e => res(e.target.result);
                reader.onerror = rej;
                reader.readAsDataURL(file);
            });
        }

        const photoKey = `photo_${Date.now()}`;
        await this._ref(`verifications/${competitionId}/photos/${photoKey}`).set({
            url,
            uploadedAt: new Date().toISOString(),
            fileName: file.name,
            fileSize: file.size,
        });

        await this._touch(competitionId);
        return url;
    },

    /**
     * Delete a photo.
     */
    async deletePhoto(competitionId, photoKey) {
        await this._ref(`verifications/${competitionId}/photos/${photoKey}`).remove();
        await this._touch(competitionId);
    },

    // ===== CONFIRMATIONS =====

    /**
     * Organiser confirms all results are correct.
     */
    async organiserConfirm(competitionId, organizerId) {
        await this._ref(`verifications/${competitionId}`).update({
            organiserConfirmed: true,
            organiserConfirmedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    },

    /**
     * A player confirms their result.
     * @param {string} playerId - The player's UID or guest ID
     * @param {boolean} agrees  - true = confirms, false = disputes
     */
    async playerConfirm(competitionId, playerId, agrees = true) {
        await this._ref(`verifications/${competitionId}/playerConfirmations/${playerId}`).set({
            agrees,
            confirmedAt: new Date().toISOString(),
        });
        await this._touch(competitionId);
    },

    /**
     * Returns confirmation stats for a competition.
     */
    async getConfirmationStats(competitionId, totalPlayers) {
        const ver = await this.get(competitionId);
        if (!ver) return null;

        const confirmations = ver.playerConfirmations || {};
        const entries = Object.values(confirmations);
        const agreed = entries.filter(c => c.agrees).length;
        const disputed = entries.filter(c => !c.agrees).length;
        const threshold = Math.ceil(totalPlayers * this.PLAYER_CONFIRM_THRESHOLD);
        const met = agreed >= threshold;

        return { agreed, disputed, total: entries.length, threshold, met };
    },

    // ===== GPS =====

    /**
     * Capture organiser's GPS location as proof of venue.
     */
    captureGPS() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported by this browser'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: new Date().toISOString(),
                }),
                err => reject(err),
                { enableHighAccuracy: true, timeout: 10_000 }
            );
        });
    },

    async saveGPS(competitionId, location) {
        await this._ref(`verifications/${competitionId}/gpsLocation`).set(location);
        await this._touch(competitionId);
    },

    // ===== SUBMISSION =====

    /**
     * Check whether all requirements are met to submit for review.
     */
    async checkReadiness(competitionId, totalPlayers) {
        const ver = await this.get(competitionId);
        if (!ver) return { ready: false, reason: 'Verification record not found' };

        const photoCount = Object.keys(ver.photos || {}).length;
        const confirmStats = await this.getConfirmationStats(competitionId, totalPlayers);

        const issues = [];
        if (photoCount < this.PHOTOS_REQUIRED) issues.push(`Need ${this.PHOTOS_REQUIRED} photos (have ${photoCount})`);
        if (!ver.organiserConfirmed) issues.push('Organiser has not confirmed results');
        if (confirmStats && !confirmStats.met) issues.push(`Need ${confirmStats.threshold} player confirmations (have ${confirmStats.agreed})`);

        return { ready: issues.length === 0, issues, photoCount, confirmStats };
    },

    /**
     * Submit for admin review.
     */
    async submit(competitionId, totalPlayers) {
        const readiness = await this.checkReadiness(competitionId, totalPlayers);
        if (!readiness.ready) {
            throw new Error('Not ready to submit: ' + readiness.issues.join('; '));
        }

        await this._ref(`verifications/${competitionId}`).update({
            status: this.STATUS.SUBMITTED,
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    },

    // ===== ADMIN ACTIONS =====

    /**
     * Approve a verification (admin only).
     */
    async approve(competitionId, adminId, note = '') {
        await this._ref(`verifications/${competitionId}`).update({
            status: this.STATUS.APPROVED,
            paymentStatus: this.PAYMENT_STATUS.PROCESSING,
            reviewedBy: adminId,
            reviewedAt: new Date().toISOString(),
            adminNote: note,
            updatedAt: new Date().toISOString(),
        });
    },

    /**
     * Reject a verification (admin only).
     */
    async reject(competitionId, adminId, reason) {
        await this._ref(`verifications/${competitionId}`).update({
            status: this.STATUS.REJECTED,
            reviewedBy: adminId,
            reviewedAt: new Date().toISOString(),
            adminNote: reason,
            updatedAt: new Date().toISOString(),
        });
    },

    /**
     * Mark payment as sent (admin only).
     */
    async markPaid(competitionId, adminId, paymentRef) {
        await this._ref(`verifications/${competitionId}`).update({
            paymentStatus: this.PAYMENT_STATUS.PAID,
            paymentRef,
            paidBy: adminId,
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    },

    /**
     * List all verifications with a given status (for admin queue).
     */
    async listByStatus(status) {
        const snap = await this._ref('verifications')
            .orderByChild('status')
            .equalTo(status)
            .once('value');
        const val = snap.val() || {};
        return Object.values(val).sort((a, b) =>
            (b.submittedAt || b.createdAt).localeCompare(a.submittedAt || a.createdAt)
        );
    },

    /**
     * List all pending + submitted verifications for the admin queue.
     */
    async listQueue() {
        const [pending, submitted] = await Promise.all([
            this.listByStatus(this.STATUS.PENDING),
            this.listByStatus(this.STATUS.SUBMITTED),
        ]);
        return [...submitted, ...pending];
    },

    // ===== HELPERS =====

    async _touch(competitionId) {
        await this._ref(`verifications/${competitionId}/updatedAt`).set(new Date().toISOString());
    },

    /**
     * Calculate payout amounts from a prize pool and split config.
     */
    calculatePayouts(prizePool, split = { first: 0.6, second: 0.3, third: 0.1 }) {
        return {
            first:  Math.round(prizePool * split.first  * 100) / 100,
            second: Math.round(prizePool * split.second * 100) / 100,
            third:  Math.round(prizePool * split.third  * 100) / 100,
        };
    },

    /**
     * Format currency.
     */
    formatCurrency(amount, currency = 'GBP') {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
    },

    /**
     * Generate a unique player-confirmation link token.
     */
    generateConfirmToken(competitionId, playerId) {
        const payload = btoa(`${competitionId}:${playerId}:${Date.now()}`);
        return payload.replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' })[c]);
    },
};

export default VerificationService;
