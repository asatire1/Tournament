/**
 * analytics-service.test.js
 * Tests for AnalyticsService using mock Firebase data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from '../../src/services/analytics-service.js';

// ---------------------------------------------------------------------------
// Mock Firebase DB
// ---------------------------------------------------------------------------

function buildMockDb(data = {}) {
    function makeRef(path) {
        let filtered = null;
        let filterField = null;
        let filterValue = null;

        const snapshot = () => {
            // Navigate to path
            const parts = path.split('/').filter(Boolean);
            let cur = data;
            for (const p of parts) {
                if (cur == null) break;
                cur = cur[p];
            }

            // Apply filter if set
            if (filterField && filterValue !== null && cur && typeof cur === 'object') {
                const filtered_obj = {};
                for (const [k, v] of Object.entries(cur)) {
                    // Deep-get filterField (supports nested paths like 'meta/organizerUid')
                    const fieldParts = filterField.split('/');
                    let val = v;
                    for (const fp of fieldParts) {
                        val = val?.[fp];
                    }
                    if (val === filterValue) {
                        filtered_obj[k] = v;
                    }
                }
                cur = filtered_obj;
            }

            const value = cur;
            return {
                exists:      () => value != null && Object.keys(value ?? {}).length > 0,
                val:         () => value,
                numChildren: () => value ? Object.keys(value).length : 0,
                forEach:     (cb) => {
                    if (!value || typeof value !== 'object') return;
                    for (const [k, v] of Object.entries(value)) {
                        cb({ key: k, val: () => v });
                    }
                },
            };
        };

        return {
            orderByChild: (field) => { filterField = field; return makeRef(path); },
            equalTo:      (val)   => { filterValue = val;   return makeRef(path); },
            once:         vi.fn(async () => snapshot()),
        };
    }

    return { ref: (path) => makeRef(path) };
}

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeTournament({ id, format, organizerUid, status, players, rounds }) {
    const playerArr = Array.from({ length: players }, (_, i) => ({
        id: `p${i}`, name: `Player ${i}`, registeredUid: null,
    }));
    const roundArr = Array.from({ length: rounds }, (_, i) => ({ matches: [] }));
    return {
        meta: {
            name: `Tournament ${id}`,
            status,
            organizerUid,
            createdAt: new Date().toISOString(),
        },
        players: playerArr,
        rounds:  roundArr,
        scores:  {},
    };
}

function makeCompetition({ id, organizerId, name, fee, maxPlayers, players }) {
    const registeredPlayers = {};
    players.forEach((p, idx) => {
        registeredPlayers[`uid_${idx}`] = {
            id: `uid_${idx}`,
            name: p.name,
            registeredAt: new Date().toISOString(),
            paymentStatus: p.status,
        };
    });
    return {
        meta: {
            name,
            organizerId,
            status: 'active',
            maxPlayers,
            fee,
            createdAt: new Date().toISOString(),
        },
        registeredPlayers,
    };
}

// ---------------------------------------------------------------------------
// beforeEach — build test DB
// ---------------------------------------------------------------------------

const ORG_UID = 'organiser-abc';

let mockDb;

beforeEach(() => {
    const tournaments = {
        't1': makeTournament({ id: 't1', format: 'americano', organizerUid: ORG_UID, status: 'completed', players: 8,  rounds: 7 }),
        't2': makeTournament({ id: 't2', format: 'americano', organizerUid: ORG_UID, status: 'completed', players: 12, rounds: 5 }),
        't3': makeTournament({ id: 't3', format: 'mexicano',  organizerUid: ORG_UID, status: 'active',    players: 10, rounds: 3 }),
        't4': makeTournament({ id: 't4', format: 'mexicano',  organizerUid: 'other', status: 'completed', players: 8,  rounds: 4 }),
    };

    const competitions = {
        'c1': makeCompetition({
            id: 'c1', organizerId: ORG_UID, name: 'Spring Open', fee: 1000, maxPlayers: 16,
            players: [
                { name: 'Alice', status: 'paid' },
                { name: 'Bob',   status: 'paid' },
                { name: 'Carol', status: 'pending' },
                { name: 'Dan',   status: 'paid' },
            ],
        }),
        'c2': makeCompetition({
            id: 'c2', organizerId: 'other', name: 'Other Comp', fee: 500, maxPlayers: 8,
            players: [{ name: 'X', status: 'paid' }],
        }),
    };

    mockDb = buildMockDb({
        'americano-tournaments': tournaments,
        'mexicano-tournaments':  tournaments,
        competitions,
    });

    global.window = global.window ?? {};
    global.window.Firebase = { getDatabase: () => mockDb };
});

// ---------------------------------------------------------------------------
// _buildSummary
// ---------------------------------------------------------------------------
describe('_buildSummary', () => {
    it('counts tournaments and completion rate correctly', () => {
        // 2 completed americano + 1 active mexicano belonging to ORG_UID
        // (t4 belongs to 'other')
        const tournaments = [
            { meta: { status: 'completed' }, playerCount: 8,  roundCount: 7 },
            { meta: { status: 'completed' }, playerCount: 12, roundCount: 5 },
            { meta: { status: 'active'    }, playerCount: 10, roundCount: 3 },
        ];
        const summary = AnalyticsService._buildSummary(tournaments, []);

        expect(summary.totalTournaments).toBe(3);
        expect(summary.completedTournaments).toBe(2);
        expect(summary.activeTournaments).toBe(1);
        expect(summary.completionRate).toBe(67);
        expect(summary.totalPlayers).toBe(30);
        expect(summary.avgPlayersPerTournament).toBe(10);
    });

    it('handles empty data gracefully', () => {
        const summary = AnalyticsService._buildSummary([], []);
        expect(summary.totalTournaments).toBe(0);
        expect(summary.completionRate).toBe(0);
        expect(summary.avgPlayersPerTournament).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// _groupByFormat
// ---------------------------------------------------------------------------
describe('_groupByFormat', () => {
    it('groups tournaments by format and computes per-format stats', () => {
        const tournaments = [
            { format: 'americano', meta: { status: 'completed' }, playerCount: 8  },
            { format: 'americano', meta: { status: 'active'    }, playerCount: 12 },
            { format: 'mexicano',  meta: { status: 'completed' }, playerCount: 10 },
        ];
        const groups = AnalyticsService._groupByFormat(tournaments);

        const americano = groups.find(g => g.format === 'americano');
        const mexicano  = groups.find(g => g.format === 'mexicano');

        expect(americano.count).toBe(2);
        expect(americano.completed).toBe(1);
        expect(americano.completionRate).toBe(50);
        expect(americano.avgPlayers).toBe(10);

        expect(mexicano.count).toBe(1);
        expect(mexicano.completionRate).toBe(100);
    });

    it('sorts by count descending', () => {
        const tournaments = [
            { format: 'mexicano',  meta: { status: 'active' }, playerCount: 8 },
            { format: 'americano', meta: { status: 'active' }, playerCount: 8 },
            { format: 'americano', meta: { status: 'active' }, playerCount: 8 },
        ];
        const groups = AnalyticsService._groupByFormat(tournaments);
        expect(groups[0].format).toBe('americano');
    });
});

// ---------------------------------------------------------------------------
// _buildTimeline
// ---------------------------------------------------------------------------
describe('_buildTimeline', () => {
    it('returns 12 months of data', () => {
        const timeline = AnalyticsService._buildTimeline([], []);
        expect(timeline.length).toBe(12);
    });

    it('counts tournaments in correct month', () => {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const tournaments = [
            { format: 'americano', meta: { status: 'active', createdAt: new Date().toISOString() }, playerCount: 8, roundCount: 0 },
        ];
        const timeline = AnalyticsService._buildTimeline(tournaments, []);
        const thisMonthEntry = timeline.find(t => t.month === thisMonth);

        expect(thisMonthEntry).toBeTruthy();
        expect(thisMonthEntry.tournaments).toBe(1);
    });

    it('months have tournaments, competitions, and total fields', () => {
        const timeline = AnalyticsService._buildTimeline([], []);
        expect(timeline[0]).toHaveProperty('month');
        expect(timeline[0]).toHaveProperty('tournaments');
        expect(timeline[0]).toHaveProperty('competitions');
        expect(timeline[0]).toHaveProperty('total');
    });
});

// ---------------------------------------------------------------------------
// _buildPlayerStats
// ---------------------------------------------------------------------------
describe('_buildPlayerStats', () => {
    it('calculates min, max, avg correctly', () => {
        const tournaments = [
            { playerCount: 4  },
            { playerCount: 8  },
            { playerCount: 12 },
        ];
        const stats = AnalyticsService._buildPlayerStats(tournaments);
        expect(stats.min).toBe(4);
        expect(stats.max).toBe(12);
        expect(stats.avg).toBe(8);
    });

    it('puts players into the correct bucket', () => {
        const tournaments = [
            { playerCount: 6  },  // 4-8
            { playerCount: 10 },  // 9-12
            { playerCount: 22 },  // 21+
        ];
        const stats = AnalyticsService._buildPlayerStats(tournaments);
        const dist = Object.fromEntries(stats.distribution.map(d => [d.range, d.count]));
        expect(dist['4-8']).toBe(1);
        expect(dist['9-12']).toBe(1);
        expect(dist['21+']).toBe(1);
    });

    it('handles empty array', () => {
        const stats = AnalyticsService._buildPlayerStats([]);
        expect(stats.min).toBe(0);
        expect(stats.max).toBe(0);
        expect(stats.avg).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// _buildRegistrationFunnel
// ---------------------------------------------------------------------------
describe('_buildRegistrationFunnel', () => {
    it('calculates fill rate correctly', () => {
        const comp = {
            id: 'c1',
            meta: { name: 'Test', maxPlayers: 10, status: 'active' },
            registeredPlayers: {
                u1: { paymentStatus: 'paid' },
                u2: { paymentStatus: 'paid' },
                u3: { paymentStatus: 'pending' },
                u4: { paymentStatus: 'paid' },
                u5: { paymentStatus: 'paid' },
            },
        };
        const funnel = AnalyticsService._buildRegistrationFunnel([comp]);

        expect(funnel.competitions[0].registered).toBe(5);
        expect(funnel.competitions[0].paid).toBe(4);
        expect(funnel.competitions[0].fillRate).toBe(50);
        expect(funnel.totals.registered).toBe(5);
        expect(funnel.totals.paid).toBe(4);
        expect(funnel.overallFillRate).toBe(50);
    });

    it('handles empty competitions array', () => {
        const funnel = AnalyticsService._buildRegistrationFunnel([]);
        expect(funnel.competitions).toHaveLength(0);
        expect(funnel.totals.registered).toBe(0);
        expect(funnel.overallFillRate).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// _buildRevenueSummary
// ---------------------------------------------------------------------------
describe('_buildRevenueSummary', () => {
    it('sums paid revenue correctly (in pence)', () => {
        const comp = {
            id: 'c1',
            meta: { name: 'Summer Open', fee: 1000 }, // £10 per player
            registeredPlayers: {
                u1: { paymentStatus: 'paid'    },
                u2: { paymentStatus: 'paid'    },
                u3: { paymentStatus: 'pending' },
            },
        };
        const rev = AnalyticsService._buildRevenueSummary([comp]);

        expect(rev.totalRevenuePence).toBe(2000);   // 2 × £10
        expect(rev.pendingPence).toBe(1000);          // 1 × £10
        expect(rev.totalRevenuePounds).toBe('20.00');
        expect(rev.pendingPounds).toBe('10.00');
    });

    it('excludes free competitions from byCompetition list', () => {
        const freeComp = {
            id: 'c2',
            meta: { name: 'Free Event', fee: 0 },
            registeredPlayers: { u1: { paymentStatus: 'paid' } },
        };
        const rev = AnalyticsService._buildRevenueSummary([freeComp]);
        expect(rev.byCompetition).toHaveLength(0);
        expect(rev.totalRevenuePence).toBe(0);
    });

    it('sums across multiple competitions', () => {
        const comps = [
            {
                id: 'c1', meta: { fee: 500 },
                registeredPlayers: { u1: { paymentStatus: 'paid' }, u2: { paymentStatus: 'paid' } },
            },
            {
                id: 'c2', meta: { fee: 1000 },
                registeredPlayers: { u3: { paymentStatus: 'paid' } },
            },
        ];
        const rev = AnalyticsService._buildRevenueSummary(comps);
        expect(rev.totalRevenuePence).toBe(2000); // 2×500 + 1×1000
    });
});

// ---------------------------------------------------------------------------
// exportCsv
// ---------------------------------------------------------------------------
describe('exportCsv', () => {
    it('returns a CSV string with header and data rows', async () => {
        // Override _fetchOrganizerTournaments to return predictable data
        vi.spyOn(AnalyticsService, '_fetchOrganizerTournaments').mockResolvedValue([
            { id: 't1', format: 'americano', meta: { name: 'Test Cup', status: 'completed', createdAt: '2025-01-01' }, playerCount: 8, roundCount: 5 },
        ]);

        const csv = await AnalyticsService.exportCsv(ORG_UID);
        const lines = csv.split('\n');

        expect(lines[0]).toBe('id,format,name,status,players,rounds,createdAt');
        expect(lines[1]).toContain('t1');
        expect(lines[1]).toContain('americano');
        expect(lines[1]).toContain('Test Cup');

        vi.restoreAllMocks();
    });
});
