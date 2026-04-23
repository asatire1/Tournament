/**
 * tournaments/js/state.js — Unified tournament state
 *
 * A single class that wraps `tournaments/{id}` and provides:
 *   - load()
 *   - subscribe(callback) / stopListening()
 *   - save() / updateMeta(patch)
 *   - writeScore(matchId, team1, team2)
 *
 * Mirrors the existing per-format state modules (americano/js/state.js etc.)
 * but reads/writes the unified root. Format-specific match generation lives
 * in the engines (src/core/engines/*) and is invoked by handlers.js at the
 * relevant lifecycle transitions.
 */

class UnifiedTournamentState {
    constructor(tournamentId) {
        this.id = tournamentId;
        this.meta = null;
        this.players = {};
        this.pairs = {};
        this.namesOnlyRoster = null;
        this.scores = {};
        this.rounds = [];
        this.groups = {};
        this.knockoutBracket = null;

        this.organiserKey = null;   // populated when organiser is authenticated for this tournament
        this.isOrganiser  = false;

        this._listener = null;
    }

    /**
     * Fetch the full tournament once.
     */
    async load() {
        const ref = getTournamentRef(this.id);
        const snap = await ref.once('value');
        if (!snap.exists()) return false;
        this._hydrate(snap.val());
        return true;
    }

    /**
     * Subscribe to live updates. Returns an unsubscribe function.
     */
    subscribe(callback) {
        const ref = getTournamentRef(this.id);
        this._listener = ref.on('value', snap => {
            if (!snap.exists()) {
                callback(null);
                return;
            }
            this._hydrate(snap.val());
            callback(this);
        });
        return () => this.stopListening();
    }

    stopListening() {
        if (this._listener && this.id) {
            getTournamentRef(this.id).off('value', this._listener);
            this._listener = null;
        }
    }

    /**
     * Verify and remember an organiser key for write operations.
     */
    async verifyOrganiserKey(key) {
        const ok = await verifyOrganiserKey(this.id, key);
        this.organiserKey = ok ? key : null;
        this.isOrganiser = ok;
        return ok;
    }

    /**
     * Update meta fields. Caller must be the organiser.
     */
    async updateMeta(patch) {
        if (!this.isOrganiser) {
            console.warn('updateMeta called without organiser auth');
            return false;
        }
        return updateTournamentMeta(this.id, patch);
    }

    /**
     * Write or clear a score. matchId is the engine-assigned key (e.g. "0_3").
     */
    async writeScore(matchId, team1, team2) {
        const db = (typeof getTournamentsDatabase === 'function')
            ? getTournamentsDatabase()
            : (typeof database !== 'undefined' ? database : firebase.database());
        const ref = db.ref(
            `${TOURNAMENTS_CONFIG.FIREBASE_ROOT}/${this.id}/scores/${matchId}`);
        if (team1 === null || team1 === undefined || team1 === -1) {
            await ref.remove();
        } else {
            await ref.set({ team1: Number(team1), team2: Number(team2) });
        }
        await updateTournamentMeta(this.id, {}); // bumps updatedAt
        return true;
    }

    // -----------------------------------------------------------------------
    // Internal
    // -----------------------------------------------------------------------

    _hydrate(val) {
        this.meta              = val.meta              || {};
        this.players           = val.players           || {};
        this.pairs             = val.pairs             || {};
        this.namesOnlyRoster   = val.namesOnlyRoster   || null;
        this.scores            = val.scores            || {};
        this.rounds            = val.rounds            || [];
        this.groups            = val.groups            || {};
        this.knockoutBracket   = val.knockoutBracket   || null;
    }
}

if (typeof window !== 'undefined') {
    window.UnifiedTournamentState = UnifiedTournamentState;
}
