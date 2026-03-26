/**
 * notification-service.js — In-App Notification Service
 *
 * Reads and writes user notifications stored at:
 *   users/{uid}/notifications/{notificationId}
 *
 * Each notification document:
 * {
 *   id:           string  (Firebase push key)
 *   type:         'match_ready' | 'tournament_start' | 'result_posted' |
 *                 'tournament_complete' | 'registration_confirmed'
 *   title:        string
 *   body:         string
 *   tournamentId: string | null
 *   read:         boolean
 *   createdAt:    ISO string
 * }
 *
 * Firebase Security Rules path: users/$uid/notifications  (owner-only read/write)
 *
 * @module services/notification-service
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = {
    MATCH_READY:             'match_ready',
    TOURNAMENT_START:        'tournament_start',
    RESULT_POSTED:           'result_posted',
    TOURNAMENT_COMPLETE:     'tournament_complete',
    REGISTRATION_CONFIRMED:  'registration_confirmed',
};

/** Maximum notifications to keep per user (oldest pruned automatically) */
const MAX_NOTIFICATIONS = 50;

// ---------------------------------------------------------------------------
// Notification Service
// ---------------------------------------------------------------------------

const NotificationService = {

    /** Active Firebase listener unsubscribe functions keyed by uid */
    _listeners: {},

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /**
     * @private
     * Get a Firebase database reference for a user's notifications.
     * @param {string} uid
     * @param {string} [notificationId]
     * @returns {object} Firebase DB reference
     */
    _ref(uid, notificationId = null) {
        const db = window.Firebase?.getDatabase();
        if (!db) throw new Error('[NotificationService] Firebase not initialised');
        const base = `users/${uid}/notifications`;
        return notificationId ? db.ref(`${base}/${notificationId}`) : db.ref(base);
    },

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    /**
     * Fetch all notifications for a user, sorted newest-first.
     *
     * @param {string} uid
     * @returns {Promise<import('../types/index.d.ts').Notification[]>}
     */
    async getAll(uid) {
        try {
            const snapshot = await this._ref(uid)
                .orderByChild('createdAt')
                .limitToLast(MAX_NOTIFICATIONS)
                .once('value');

            if (!snapshot.exists()) return [];

            const notifications = [];
            snapshot.forEach(child => {
                notifications.push({ id: child.key, ...child.val() });
            });

            // Reverse so newest is first
            notifications.reverse();
            return notifications;
        } catch (error) {
            console.error('[NotificationService] getAll error:', error);
            return [];
        }
    },

    /**
     * Count unread notifications for a user.
     *
     * @param {string} uid
     * @returns {Promise<number>}
     */
    async countUnread(uid) {
        try {
            const snapshot = await this._ref(uid)
                .orderByChild('read')
                .equalTo(false)
                .once('value');
            return snapshot.numChildren();
        } catch (error) {
            console.error('[NotificationService] countUnread error:', error);
            return 0;
        }
    },

    // -----------------------------------------------------------------------
    // Write
    // -----------------------------------------------------------------------

    /**
     * Create a new notification for a user.
     * Called by Cloud Functions (server-side) or client after a local action.
     *
     * @param {string} uid
     * @param {{ type: string, title: string, body: string, tournamentId?: string }} data
     * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
     */
    async create(uid, { type, title, body, tournamentId = null }) {
        try {
            const ref = this._ref(uid).push();
            await ref.set({
                type,
                title,
                body,
                tournamentId,
                read: false,
                createdAt: new Date().toISOString(),
            });

            // Prune oldest if over limit
            await this._pruneOldest(uid);

            return { success: true, id: ref.key };
        } catch (error) {
            console.error('[NotificationService] create error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Mark a single notification as read.
     *
     * @param {string} uid
     * @param {string} notificationId
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    async markRead(uid, notificationId) {
        try {
            await this._ref(uid, notificationId).update({ read: true });
            return { success: true };
        } catch (error) {
            console.error('[NotificationService] markRead error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Mark ALL notifications as read for a user.
     *
     * @param {string} uid
     * @returns {Promise<{ success: boolean, count: number, error?: string }>}
     */
    async markAllRead(uid) {
        try {
            const notifications = await this.getAll(uid);
            const unread = notifications.filter(n => !n.read);

            const updates = {};
            unread.forEach(n => {
                updates[`${n.id}/read`] = true;
            });

            if (Object.keys(updates).length > 0) {
                await this._ref(uid).update(updates);
            }

            return { success: true, count: unread.length };
        } catch (error) {
            console.error('[NotificationService] markAllRead error:', error);
            return { success: false, count: 0, error: error.message };
        }
    },

    /**
     * Delete a single notification.
     *
     * @param {string} uid
     * @param {string} notificationId
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    async delete(uid, notificationId) {
        try {
            await this._ref(uid, notificationId).remove();
            return { success: true };
        } catch (error) {
            console.error('[NotificationService] delete error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete all notifications for a user.
     *
     * @param {string} uid
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    async deleteAll(uid) {
        try {
            await this._ref(uid).remove();
            return { success: true };
        } catch (error) {
            console.error('[NotificationService] deleteAll error:', error);
            return { success: false, error: error.message };
        }
    },

    // -----------------------------------------------------------------------
    // Real-time listener
    // -----------------------------------------------------------------------

    /**
     * Subscribe to real-time notification updates for a user.
     * Calls `callback(notifications, unreadCount)` on any change.
     *
     * Returns an unsubscribe function.
     *
     * @param {string} uid
     * @param {function(import('../types/index.d.ts').Notification[], number): void} callback
     * @returns {function} unsubscribe
     */
    subscribe(uid, callback) {
        // Unsubscribe any previous listener for this uid
        this.unsubscribe(uid);

        const ref = this._ref(uid)
            .orderByChild('createdAt')
            .limitToLast(MAX_NOTIFICATIONS);

        const handler = (snapshot) => {
            if (!snapshot.exists()) {
                callback([], 0);
                return;
            }

            const notifications = [];
            snapshot.forEach(child => {
                notifications.push({ id: child.key, ...child.val() });
            });
            notifications.reverse();

            const unreadCount = notifications.filter(n => !n.read).length;
            callback(notifications, unreadCount);
        };

        ref.on('value', handler);

        // Store unsubscribe fn
        this._listeners[uid] = () => ref.off('value', handler);
        return this._listeners[uid];
    },

    /**
     * Unsubscribe the real-time listener for a user.
     * @param {string} uid
     */
    unsubscribe(uid) {
        if (this._listeners[uid]) {
            this._listeners[uid]();
            delete this._listeners[uid];
        }
    },

    // -----------------------------------------------------------------------
    // Helpers for common notification types
    // -----------------------------------------------------------------------

    /**
     * Notify a player their match is ready.
     * @param {string} uid
     * @param {{ tournamentName: string, round: number, tournamentId: string }} params
     */
    async notifyMatchReady(uid, { tournamentName, round, tournamentId }) {
        return this.create(uid, {
            type: NOTIFICATION_TYPES.MATCH_READY,
            title: '🎾 Match Ready',
            body: `Round ${round} of "${tournamentName}" is ready to play!`,
            tournamentId,
        });
    },

    /**
     * Notify a player their tournament has started.
     * @param {string} uid
     * @param {{ tournamentName: string, tournamentId: string }} params
     */
    async notifyTournamentStart(uid, { tournamentName, tournamentId }) {
        return this.create(uid, {
            type: NOTIFICATION_TYPES.TOURNAMENT_START,
            title: '🏆 Tournament Started',
            body: `"${tournamentName}" has started. Good luck!`,
            tournamentId,
        });
    },

    /**
     * Notify a player of a result posted in their tournament.
     * @param {string} uid
     * @param {{ tournamentName: string, score: string, tournamentId: string }} params
     */
    async notifyResultPosted(uid, { tournamentName, score, tournamentId }) {
        return this.create(uid, {
            type: NOTIFICATION_TYPES.RESULT_POSTED,
            title: '📊 Result Posted',
            body: `Score ${score} recorded in "${tournamentName}".`,
            tournamentId,
        });
    },

    /**
     * Notify a player their tournament has finished.
     * @param {string} uid
     * @param {{ tournamentName: string, position: number|null, tournamentId: string }} params
     */
    async notifyTournamentComplete(uid, { tournamentName, position, tournamentId }) {
        const posText = position ? ` You finished #${position}.` : '';
        return this.create(uid, {
            type: NOTIFICATION_TYPES.TOURNAMENT_COMPLETE,
            title: '🎉 Tournament Complete',
            body: `"${tournamentName}" has finished.${posText}`,
            tournamentId,
        });
    },

    /**
     * Notify a player their registration is confirmed.
     * @param {string} uid
     * @param {{ tournamentName: string, tournamentId: string }} params
     */
    async notifyRegistrationConfirmed(uid, { tournamentName, tournamentId }) {
        return this.create(uid, {
            type: NOTIFICATION_TYPES.REGISTRATION_CONFIRMED,
            title: '✅ Registration Confirmed',
            body: `You're registered for "${tournamentName}".`,
            tournamentId,
        });
    },

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /**
     * @private
     * Keep only the newest MAX_NOTIFICATIONS; delete the rest.
     * @param {string} uid
     */
    async _pruneOldest(uid) {
        try {
            const snapshot = await this._ref(uid)
                .orderByChild('createdAt')
                .once('value');

            const total = snapshot.numChildren();
            if (total <= MAX_NOTIFICATIONS) return;

            const toDelete = total - MAX_NOTIFICATIONS;
            let deleted = 0;

            const deletions = [];
            snapshot.forEach(child => {
                if (deleted < toDelete) {
                    deletions.push(this._ref(uid, child.key).remove());
                    deleted++;
                }
            });

            await Promise.all(deletions);
        } catch (err) {
            // Non-critical — log and continue
            console.warn('[NotificationService] pruneOldest error:', err);
        }
    },
};

export { NotificationService };
export default NotificationService;

// Browser global
if (typeof window !== 'undefined') {
    window.NotificationService = NotificationService;
}
