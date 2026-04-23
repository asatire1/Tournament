/**
 * src/services/profile-service.js — Phase H client-side reader
 *
 * Reads the denormalised stats / trophies / tournamentHistory rows that
 * functions/profile-aggregator.js writes when a tournament is marked
 * completed.
 *
 * Exposes window.ProfileService with:
 *   getStats(uid?)
 *   getTrophies(uid?)
 *   getHistory(uid?, { limit, startAfter? })
 */

(function () {

const ProfileService = {
    async getStats(uid) {
        const id = uid || firebase.auth().currentUser?.uid;
        if (!id) return null;
        const snap = await firebase.database().ref(`users/${id}/stats`).once('value');
        return snap.val();
    },

    async getTrophies(uid) {
        const id = uid || firebase.auth().currentUser?.uid;
        if (!id) return [];
        const snap = await firebase.database().ref(`users/${id}/trophies`).once('value');
        const out = [];
        snap.forEach(c => out.push({ id: c.key, ...c.val() }));
        // Sort by earnedAt desc
        out.sort((a, b) => (b.earnedAt || '').localeCompare(a.earnedAt || ''));
        return out;
    },

    async getHistory(uid, { limit = 20, startAfter = null } = {}) {
        const id = uid || firebase.auth().currentUser?.uid;
        if (!id) return [];
        const ref = firebase.database().ref(`users/${id}/tournamentHistory`);
        const snap = await ref.once('value');
        const out = [];
        snap.forEach(c => out.push({ tournamentId: c.key, ...c.val() }));
        out.sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''));
        const startIdx = startAfter ? out.findIndex(r => r.tournamentId === startAfter) + 1 : 0;
        return out.slice(startIdx, startIdx + limit);
    },

    formatMoney(gbp) {
        const n = Number(gbp) || 0;
        return `£${n.toFixed(2)}`;
    }
};

if (typeof window !== 'undefined') {
    window.ProfileService = ProfileService;
}

})();
