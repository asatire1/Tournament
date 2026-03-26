/**
 * data-export-service.test.js
 * Tests for DataExportService (GDPR data portability).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataExportService } from '../../src/services/data-export-service.js';

// ---------------------------------------------------------------------------
// Minimal Firebase mock
// ---------------------------------------------------------------------------

function buildMockDb(store = {}) {
    function deepGet(obj, parts) {
        return parts.reduce((o, k) => (o != null ? o[k] : undefined), obj);
    }
    function deepSet(obj, parts, value) {
        let cur = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]]) cur[parts[i]] = {};
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
    }

    function makeRef(path) {
        const parts = path.split('/').filter(Boolean);
        let orderField = null;
        let limitLastN = null;

        function getVal() {
            let cur = deepGet(store, parts);
            if (orderField && limitLastN && cur && typeof cur === 'object') {
                const entries = Object.entries(cur);
                cur = Object.fromEntries(entries.slice(-limitLastN));
            }
            return cur;
        }

        const ref = {
            key: parts[parts.length - 1],

            once: vi.fn(async () => {
                const value = getVal();
                return {
                    exists:  () => value != null,
                    val:     () => value,
                    forEach: (cb) => {
                        if (!value || typeof value !== 'object') return;
                        for (const [k, v] of Object.entries(value)) {
                            cb({ key: k, val: () => v });
                        }
                    },
                };
            }),

            set: vi.fn(async (value) => deepSet(store, parts, value)),

            remove: vi.fn(async () => {
                const parent = parts.slice(0, -1);
                const key    = parts[parts.length - 1];
                const obj    = deepGet(store, parent);
                if (obj) delete obj[key];
            }),

            orderByChild: vi.fn(() => ref),
            limitToLast:  vi.fn((n) => { limitLastN = n; return ref; }),
            equalTo:      vi.fn(() => ref),
        };

        return ref;
    }

    return { ref: (path) => makeRef(path), _store: store };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const UID = 'test-user-123';

let mockDb;

beforeEach(() => {
    mockDb = buildMockDb({
        users: {
            [UID]: {
                name:  'Test User',
                email: 'test@example.com',
                playtomicLevel: 5,
                createdAt: '2025-01-01',
                notifications: {
                    n1: { type: 'match_ready', title: 'Ready!', body: 'Go play', read: false, createdAt: '2025-03-01' },
                },
            },
        },
        userRatings: {
            [UID]: {
                uid:         UID,
                rating:      1150,
                confidence:  0.6,
                gamesPlayed: 18,
                lastPlayedAt:'2025-03-15',
                history: {
                    match1: { before: 1000, after: 1020, delta: 20, timestamp: '2025-01-10', suspicious: false },
                    match2: { before: 1020, after: 1150, delta: 130, timestamp: '2025-03-01', suspicious: true },
                },
            },
        },
    });

    global.window = global.window ?? {};
    global.window.Firebase = { getDatabase: () => mockDb };
});

// ---------------------------------------------------------------------------
// _fetchProfile
// ---------------------------------------------------------------------------
describe('_fetchProfile', () => {
    it('returns user profile without sensitive fields', async () => {
        // Add sensitive fields to the mock
        mockDb._store.users[UID].passcodeHash = 'abc123';
        mockDb._store.users[UID].organiserKey = 'secret';

        const profile = await DataExportService._fetchProfile(UID);

        expect(profile.name).toBe('Test User');
        expect(profile.email).toBe('test@example.com');
        expect(profile.passcodeHash).toBeUndefined();
        expect(profile.organiserKey).toBeUndefined();
    });

    it('returns null if user does not exist', async () => {
        const profile = await DataExportService._fetchProfile('nonexistent-uid');
        expect(profile).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// _fetchRating
// ---------------------------------------------------------------------------
describe('_fetchRating', () => {
    it('returns rating without history sub-object', async () => {
        const rating = await DataExportService._fetchRating(UID);

        expect(rating.rating).toBe(1150);
        expect(rating.gamesPlayed).toBe(18);
        expect(rating.history).toBeUndefined(); // history stripped from rating top-level
    });

    it('returns null for unknown uid', async () => {
        const rating = await DataExportService._fetchRating('nobody');
        expect(rating).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// _fetchRatingHistory
// ---------------------------------------------------------------------------
describe('_fetchRatingHistory', () => {
    it('returns history entries sorted newest first', async () => {
        const history = await DataExportService._fetchRatingHistory(UID);

        expect(history.length).toBe(2);
        // Sorted by timestamp descending
        expect(history[0].timestamp).toBe('2025-03-01');
        expect(history[1].timestamp).toBe('2025-01-10');
    });

    it('returns empty array for user with no history', async () => {
        const history = await DataExportService._fetchRatingHistory('no-one');
        expect(history).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// requestDeletion / getDeletionRequestStatus / cancelDeletionRequest
// ---------------------------------------------------------------------------
describe('deletion request lifecycle', () => {
    it('requestDeletion creates a pending record', async () => {
        const result = await DataExportService.requestDeletion(UID, 'privacy-concerns');

        expect(result.success).toBe(true);
        expect(result.requestId).toBe(UID);

        const record = mockDb._store.deletionRequests?.[UID];
        expect(record).toBeTruthy();
        expect(record.status).toBe('pending');
        expect(record.reason).toBe('privacy-concerns');
        expect(typeof record.deadline).toBe('string');
    });

    it('getDeletionRequestStatus returns correct status', async () => {
        await DataExportService.requestDeletion(UID, '');
        const status = await DataExportService.getDeletionRequestStatus(UID);

        expect(status.exists).toBe(true);
        expect(status.status).toBe('pending');
        expect(typeof status.requestedAt).toBe('string');
        expect(typeof status.deadline).toBe('string');
    });

    it('getDeletionRequestStatus returns exists: false for non-existent record', async () => {
        const status = await DataExportService.getDeletionRequestStatus('no-record');
        expect(status.exists).toBe(false);
    });

    it('cancelDeletionRequest removes the record', async () => {
        await DataExportService.requestDeletion(UID, '');
        const cancel = await DataExportService.cancelDeletionRequest(UID);

        expect(cancel.success).toBe(true);

        const status = await DataExportService.getDeletionRequestStatus(UID);
        expect(status.exists).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// collectAllData — shape validation
// ---------------------------------------------------------------------------
describe('collectAllData', () => {
    it('returns correctly shaped export object', async () => {
        const data = await DataExportService.collectAllData(UID);

        expect(data.exportVersion).toBe('1.0');
        expect(typeof data.exportedAt).toBe('string');
        expect(data.uid).toBe(UID);
        expect(data.gdprNote).toContain('GDPR');

        // Should have all top-level keys
        expect(data).toHaveProperty('profile');
        expect(data).toHaveProperty('rating');
        expect(data).toHaveProperty('notifications');
        expect(data).toHaveProperty('tournamentsCreated');
        expect(data).toHaveProperty('tournamentsPlayed');
        expect(data).toHaveProperty('competitions');
    });

    it('rating section has current and history fields', async () => {
        const data = await DataExportService.collectAllData(UID);

        expect(data.rating.current).toBeTruthy();
        expect(data.rating.current.rating).toBe(1150);
        expect(Array.isArray(data.rating.history)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// downloadJson / downloadRatingHistoryCsv — browser download mocking
// ---------------------------------------------------------------------------
describe('download methods', () => {
    beforeEach(() => {
        // Set up minimal DOM mock for file download (Node env has no document)
        const mockAnchor = { click: vi.fn(), href: '', download: '' };
        const mockDocument = {
            createElement: vi.fn(() => mockAnchor),
            body: {
                appendChild: vi.fn(),
                removeChild:  vi.fn(),
            },
        };
        global.document = mockDocument;
        global.URL      = global.URL ?? {};
        global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = vi.fn();
        global.Blob = class {
            constructor(parts, opts) { this.parts = parts; this.type = opts?.type; }
        };
    });

    it('downloadJson returns success: true', async () => {
        const result = await DataExportService.downloadJson(UID);
        expect(result.success).toBe(true);
    });

    it('downloadRatingHistoryCsv returns success: true and correct count', async () => {
        const result = await DataExportService.downloadRatingHistoryCsv(UID);
        expect(result.success).toBe(true);
        expect(result.count).toBe(2); // 2 history entries in mock
    });
});
