/**
 * analytics-service.js — Organiser Analytics Service
 *
 * Aggregates data from Firebase RTDB to produce per-organiser metrics:
 *   - Tournaments created, by format
 *   - Player counts (avg, total, distribution)
 *   - Completion rates
 *   - Registration funnel (for Competition events with registration)
 *   - Revenue summary (registration fees collected)
 *   - Activity timeline (tournaments per month, last 12 months)
 *
 * All computation is client-side — no Cloud Functions needed for basic analytics.
 * For large organisers (>500 tournaments) a server-side aggregation job would be
 * added in Phase 5.
 *
 * @module services/analytics-service
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOURNAMENT_FORMATS = [
    'americano-tournaments',
    'mexicano-tournaments',
    'mix-tournaments',
    'mixicano-tournaments',
    'team-league-tournaments',
    'knockout-tournaments',
    'round-robin-tournaments',
    'swiss-tournaments',
];

const COMPETITION_ROOT = 'competitions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoToMonthKey(isoString) {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function last12MonthKeys() {
    const keys = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys;
}

function average(arr) {
    if (!arr.length) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ---------------------------------------------------------------------------
// AnalyticsService
// ---------------------------------------------------------------------------

const AnalyticsService = {

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Fetch full analytics for an organiser.
     *
     * @param {string} organizerUid
     * @returns {Promise<OrganizerAnalytics>}
     */
    async getOrganizerAnalytics(organizerUid) {
        const [tournaments, competitions] = await Promise.all([
            this._fetchOrganizerTournaments(organizerUid),
            this._fetchOrganizerCompetitions(organizerUid),
        ]);

        return {
            summary:      this._buildSummary(tournaments, competitions),
            byFormat:     this._groupByFormat(tournaments),
            timeline:     this._buildTimeline(tournaments, competitions),
            playerStats:  this._buildPlayerStats(tournaments),
            funnel:       this._buildRegistrationFunnel(competitions),
            revenue:      this._buildRevenueSummary(competitions),
        };
    },

    /**
     * Export tournament data as CSV.
     *
     * @param {string} organizerUid
     * @returns {Promise<string>} CSV string
     */
    async exportCsv(organizerUid) {
        const tournaments = await this._fetchOrganizerTournaments(organizerUid);

        const headers = [
            'id', 'format', 'name', 'status',
            'players', 'rounds', 'createdAt',
        ];

        const rows = tournaments.map(t => [
            t.id,
            t.format,
            `"${(t.meta?.name ?? '').replace(/"/g, '""')}"`,
            t.meta?.status ?? '',
            t.playerCount,
            t.roundCount,
            t.meta?.createdAt ?? '',
        ]);

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    },

    // -----------------------------------------------------------------------
    // Data fetchers
    // -----------------------------------------------------------------------

    /**
     * @private
     * Fetch all tournaments belonging to an organiser across all formats.
     */
    async _fetchOrganizerTournaments(organizerUid) {
        const db = this._db();
        const results = [];

        await Promise.all(
            TOURNAMENT_FORMATS.map(async (root) => {
                try {
                    const snapshot = await db.ref(root)
                        .orderByChild('meta/organizerUid')
                        .equalTo(organizerUid)
                        .once('value');

                    if (!snapshot.exists()) return;

                    snapshot.forEach(child => {
                        const data = child.val();
                        results.push({
                            id:          child.key,
                            format:      root.replace('-tournaments', ''),
                            meta:        data.meta ?? {},
                            playerCount: Array.isArray(data.players)
                                ? data.players.length
                                : Object.keys(data.players ?? {}).length,
                            roundCount:  Array.isArray(data.rounds)
                                ? data.rounds.length
                                : Object.keys(data.rounds ?? {}).length,
                            scoreCount:  Object.keys(data.scores ?? {}).length,
                        });
                    });
                } catch (_) {
                    // Permission denied on formats this user hasn't used — ignore
                }
            })
        );

        return results;
    },

    /**
     * @private
     * Fetch all Competition events organised by this user.
     */
    async _fetchOrganizerCompetitions(organizerUid) {
        const db = this._db();
        try {
            const snapshot = await db.ref(COMPETITION_ROOT)
                .orderByChild('meta/organizerId')
                .equalTo(organizerUid)
                .once('value');

            if (!snapshot.exists()) return [];

            const competitions = [];
            snapshot.forEach(child => {
                competitions.push({ id: child.key, ...child.val() });
            });
            return competitions;
        } catch (_) {
            return [];
        }
    },

    // -----------------------------------------------------------------------
    // Aggregators
    // -----------------------------------------------------------------------

    /**
     * @private
     * Top-level summary card data.
     */
    _buildSummary(tournaments, competitions) {
        const total         = tournaments.length;
        const completed     = tournaments.filter(t => t.meta?.status === 'completed').length;
        const active        = tournaments.filter(t => t.meta?.status === 'active').length;
        const completionRate = total > 0 ? completed / total : 0;
        const totalPlayers  = tournaments.reduce((s, t) => s + t.playerCount, 0);
        const avgPlayers    = total > 0 ? totalPlayers / total : 0;

        const registrations = competitions.reduce((s, c) => {
            return s + Object.keys(c.registeredPlayers ?? {}).length;
        }, 0);

        return {
            totalTournaments: total,
            completedTournaments: completed,
            activeTournaments: active,
            setupTournaments: total - completed - active,
            completionRate: Math.round(completionRate * 100),
            totalPlayers,
            avgPlayersPerTournament: Math.round(avgPlayers * 10) / 10,
            totalCompetitions: competitions.length,
            totalRegistrations: registrations,
        };
    },

    /**
     * @private
     * Per-format breakdown.
     */
    _groupByFormat(tournaments) {
        const byFormat = {};

        tournaments.forEach(t => {
            if (!byFormat[t.format]) {
                byFormat[t.format] = {
                    format: t.format,
                    count: 0,
                    completed: 0,
                    totalPlayers: 0,
                    playerCounts: [],
                };
            }
            const entry = byFormat[t.format];
            entry.count++;
            if (t.meta?.status === 'completed') entry.completed++;
            entry.totalPlayers += t.playerCount;
            entry.playerCounts.push(t.playerCount);
        });

        // Compute averages
        Object.values(byFormat).forEach(entry => {
            entry.avgPlayers     = Math.round(average(entry.playerCounts) * 10) / 10;
            entry.completionRate = entry.count > 0
                ? Math.round((entry.completed / entry.count) * 100)
                : 0;
            delete entry.playerCounts;
        });

        // Sort by count descending
        return Object.values(byFormat).sort((a, b) => b.count - a.count);
    },

    /**
     * @private
     * Activity timeline: tournaments created per month, last 12 months.
     */
    _buildTimeline(tournaments, competitions) {
        const monthKeys = last12MonthKeys();
        const tournamentsByMonth = Object.fromEntries(monthKeys.map(k => [k, 0]));
        const competitionsByMonth = Object.fromEntries(monthKeys.map(k => [k, 0]));

        tournaments.forEach(t => {
            const key = t.meta?.createdAt ? isoToMonthKey(t.meta.createdAt) : null;
            if (key && tournamentsByMonth[key] !== undefined) {
                tournamentsByMonth[key]++;
            }
        });

        competitions.forEach(c => {
            const key = c.meta?.createdAt ? isoToMonthKey(c.meta.createdAt) : null;
            if (key && competitionsByMonth[key] !== undefined) {
                competitionsByMonth[key]++;
            }
        });

        return monthKeys.map(month => ({
            month,
            tournaments: tournamentsByMonth[month],
            competitions: competitionsByMonth[month],
            total: tournamentsByMonth[month] + competitionsByMonth[month],
        }));
    },

    /**
     * @private
     * Player statistics.
     */
    _buildPlayerStats(tournaments) {
        const counts = tournaments.map(t => t.playerCount).filter(n => n > 0);
        if (!counts.length) {
            return { min: 0, max: 0, avg: 0, distribution: [] };
        }

        const buckets = { '4-8': 0, '9-12': 0, '13-16': 0, '17-20': 0, '21+': 0 };
        counts.forEach(n => {
            if (n <= 8)       buckets['4-8']++;
            else if (n <= 12) buckets['9-12']++;
            else if (n <= 16) buckets['13-16']++;
            else if (n <= 20) buckets['17-20']++;
            else              buckets['21+']++;
        });

        return {
            min: Math.min(...counts),
            max: Math.max(...counts),
            avg: Math.round(average(counts) * 10) / 10,
            distribution: Object.entries(buckets).map(([range, count]) => ({ range, count })),
        };
    },

    /**
     * @private
     * Registration funnel for Competition events.
     */
    _buildRegistrationFunnel(competitions) {
        const funnelByCompetition = competitions.map(c => {
            const maxPlayers     = c.meta?.maxPlayers ?? 0;
            const registered     = Object.keys(c.registeredPlayers ?? {}).length;
            const paid           = Object.values(c.registeredPlayers ?? {})
                .filter(p => p.paymentStatus === 'paid').length;
            const fillRate       = maxPlayers > 0
                ? Math.round((registered / maxPlayers) * 100)
                : null;

            return {
                id:          c.id,
                name:        c.meta?.name ?? c.id,
                status:      c.meta?.status ?? 'unknown',
                maxPlayers,
                registered,
                paid,
                fillRate,
            };
        });

        const totals = funnelByCompetition.reduce((acc, f) => ({
            maxPlayers:  acc.maxPlayers  + f.maxPlayers,
            registered:  acc.registered  + f.registered,
            paid:        acc.paid        + f.paid,
        }), { maxPlayers: 0, registered: 0, paid: 0 });

        return {
            competitions: funnelByCompetition,
            totals,
            overallFillRate: totals.maxPlayers > 0
                ? Math.round((totals.registered / totals.maxPlayers) * 100)
                : null,
        };
    },

    /**
     * @private
     * Revenue summary from competition registration fees.
     * Fees are stored in pence/cents.
     */
    _buildRevenueSummary(competitions) {
        let totalRevenuePence = 0;
        let pendingPence      = 0;

        const byCompetition = competitions.map(c => {
            const feePerPlayer = c.meta?.fee ?? 0;
            const players      = Object.values(c.registeredPlayers ?? {});
            const paid         = players.filter(p => p.paymentStatus === 'paid').length;
            const pending      = players.filter(p => p.paymentStatus === 'pending').length;
            const revenue      = paid    * feePerPlayer;
            const pendingRev   = pending * feePerPlayer;

            totalRevenuePence += revenue;
            pendingPence      += pendingRev;

            return {
                id:             c.id,
                name:           c.meta?.name ?? c.id,
                feePerPlayer,
                paidPlayers:    paid,
                pendingPlayers: pending,
                revenuePence:   revenue,
                pendingPence:   pendingRev,
            };
        }).filter(c => c.feePerPlayer > 0);

        return {
            totalRevenuePence,
            pendingPence,
            totalRevenuePounds: (totalRevenuePence / 100).toFixed(2),
            pendingPounds:      (pendingPence / 100).toFixed(2),
            byCompetition,
        };
    },

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /** @private */
    _db() {
        const db = window.Firebase?.getDatabase();
        if (!db) throw new Error('[AnalyticsService] Firebase not initialised');
        return db;
    },
};

export { AnalyticsService };
export default AnalyticsService;

if (typeof window !== 'undefined') {
    window.AnalyticsService = AnalyticsService;
}

// ---------------------------------------------------------------------------
// JSDoc type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {object} OrganizerAnalytics
 * @property {object}   summary      - Top-level summary stats
 * @property {object[]} byFormat     - Per-format breakdown
 * @property {object[]} timeline     - Monthly activity for last 12 months
 * @property {object}   playerStats  - Player count distribution
 * @property {object}   funnel       - Competition registration funnel
 * @property {object}   revenue      - Revenue summary
 */
