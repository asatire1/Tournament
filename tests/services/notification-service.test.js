/**
 * notification-service.test.js
 * Tests for NotificationService using a mock Firebase database.
 *
 * Uses Vitest's vi.fn() for a lightweight in-memory RTDB mock —
 * no real Firebase connection required.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService, NOTIFICATION_TYPES } from '../../src/services/notification-service.js';

// ---------------------------------------------------------------------------
// Firebase mock
// ---------------------------------------------------------------------------

/**
 * Build a minimal in-memory mock that mimics the Firebase RTDB
 * chained API: db.ref(path).push().set(data), ref.once('value'), ref.update()
 */
function buildDbMock() {
    const store = {};           // path → value
    const listeners = {};       // path → [handler]

    function getDeep(obj, parts) {
        return parts.reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
    }
    function setDeep(obj, parts, value) {
        let cur = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!cur[parts[i]]) cur[parts[i]] = {};
            cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
    }
    function makePath(p) { return p.split('/').filter(Boolean); }
    function uid() { return Math.random().toString(36).slice(2, 10); }

    function makeRef(path) {
        const parts = makePath(path);

        const snapshot = (value) => ({
            exists: () => value !== undefined && value !== null,
            val:    () => value,
            key:    parts[parts.length - 1],
            numChildren: () => value ? Object.keys(value).length : 0,
            forEach: (cb) => {
                if (!value || typeof value !== 'object') return;
                for (const [k, v] of Object.entries(value)) {
                    cb({ key: k, val: () => v });
                }
            },
        });

        const ref = {
            key: parts[parts.length - 1],
            _path: path,

            once: vi.fn(async () => {
                const value = getDeep(store, parts);
                return snapshot(value);
            }),

            set: vi.fn(async (value) => {
                setDeep(store, parts, value);
            }),

            update: vi.fn(async (updates) => {
                for (const [key, value] of Object.entries(updates)) {
                    const subParts = makePath(`${path}/${key}`);
                    setDeep(store, subParts, value);
                }
            }),

            remove: vi.fn(async () => {
                const parent = parts.slice(0, -1);
                const key    = parts[parts.length - 1];
                const obj    = getDeep(store, parent);
                if (obj) delete obj[key];
            }),

            push: vi.fn(() => {
                const id = uid();
                const childPath = `${path}/${id}`;
                return makeRef(childPath);
            }),

            orderByChild: vi.fn(() => ref),
            equalTo:      vi.fn(() => ref),
            limitToLast:  vi.fn(() => ref),

            on: vi.fn((event, handler) => {
                if (!listeners[path]) listeners[path] = [];
                listeners[path].push(handler);
            }),
            off: vi.fn((event, handler) => {
                if (listeners[path]) {
                    listeners[path] = listeners[path].filter(h => h !== handler);
                }
            }),
        };

        return ref;
    }

    return {
        ref: (path) => makeRef(path),
        _store: store,
        _trigger: (path, value) => {
            // Manually fire a listener (for subscribe tests)
            const snap = {
                exists: () => value !== undefined,
                val: () => value,
                forEach: (cb) => {
                    if (!value) return;
                    for (const [k, v] of Object.entries(value)) cb({ key: k, val: () => v });
                },
            };
            (listeners[path] ?? []).forEach(h => h(snap));
        },
    };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let dbMock;

beforeEach(() => {
    dbMock = buildDbMock();

    // Inject mock into NotificationService
    global.window = global.window ?? {};
    global.window.Firebase = {
        getDatabase: () => dbMock,
    };

    // Reset any cached listeners
    NotificationService._listeners = {};
});

// ---------------------------------------------------------------------------
// NOTIFICATION_TYPES constant
// ---------------------------------------------------------------------------
describe('NOTIFICATION_TYPES', () => {
    it('exports the expected type strings', () => {
        expect(NOTIFICATION_TYPES.MATCH_READY).toBe('match_ready');
        expect(NOTIFICATION_TYPES.TOURNAMENT_START).toBe('tournament_start');
        expect(NOTIFICATION_TYPES.RESULT_POSTED).toBe('result_posted');
        expect(NOTIFICATION_TYPES.TOURNAMENT_COMPLETE).toBe('tournament_complete');
        expect(NOTIFICATION_TYPES.REGISTRATION_CONFIRMED).toBe('registration_confirmed');
    });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe('create', () => {
    it('writes a notification and returns { success: true, id }', async () => {
        const result = await NotificationService.create('user1', {
            type: 'match_ready',
            title: 'Match Ready',
            body: 'Your round is ready!',
        });

        expect(result.success).toBe(true);
        expect(typeof result.id).toBe('string');
        expect(result.id.length).toBeGreaterThan(0);
    });

    it('stores the correct fields (read: false, type, title, body, createdAt)', async () => {
        await NotificationService.create('user1', {
            type: 'tournament_start',
            title: 'Started!',
            body: 'Go play',
            tournamentId: 'tourney-abc',
        });

        // Navigate the in-memory store
        const userNotifs = dbMock._store?.users?.user1?.notifications ?? {};
        const values = Object.values(userNotifs);
        expect(values.length).toBeGreaterThan(0);

        const n = values[0];
        expect(n.type).toBe('tournament_start');
        expect(n.title).toBe('Started!');
        expect(n.body).toBe('Go play');
        expect(n.tournamentId).toBe('tourney-abc');
        expect(n.read).toBe(false);
        expect(typeof n.createdAt).toBe('string');
    });

    it('returns success: false if Firebase throws', async () => {
        // Make _ref throw
        vi.spyOn(NotificationService, '_ref').mockImplementationOnce(() => {
            throw new Error('Firebase error');
        });

        const result = await NotificationService.create('user1', {
            type: 'match_ready',
            title: 'X',
            body: 'Y',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();

        vi.restoreAllMocks();
    });
});

// ---------------------------------------------------------------------------
// markRead
// ---------------------------------------------------------------------------
describe('markRead', () => {
    it('sets read: true on the specified notification', async () => {
        const { id } = await NotificationService.create('user2', {
            type: 'result_posted',
            title: 'Result',
            body: '3-1',
        });

        await NotificationService.markRead('user2', id);

        const n = dbMock._store?.users?.user2?.notifications?.[id];
        expect(n?.read).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// delete / deleteAll
// ---------------------------------------------------------------------------
describe('delete', () => {
    it('removes the notification from the store', async () => {
        const { id } = await NotificationService.create('user3', {
            type: 'match_ready',
            title: 'T',
            body: 'B',
        });

        await NotificationService.delete('user3', id);

        const n = dbMock._store?.users?.user3?.notifications?.[id];
        expect(n).toBeUndefined();
    });
});

describe('deleteAll', () => {
    it('removes the whole notifications node', async () => {
        await NotificationService.create('user4', { type: 'match_ready', title: 'A', body: 'B' });
        await NotificationService.create('user4', { type: 'result_posted', title: 'C', body: 'D' });

        await NotificationService.deleteAll('user4');

        const notifs = dbMock._store?.users?.user4?.notifications;
        expect(notifs).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Helper notify methods
// ---------------------------------------------------------------------------
describe('helper notify methods', () => {
    it('notifyMatchReady creates a match_ready notification', async () => {
        const result = await NotificationService.notifyMatchReady('u5', {
            tournamentName: 'Club Open',
            round: 2,
            tournamentId: 't1',
        });
        expect(result.success).toBe(true);

        const values = Object.values(dbMock._store?.users?.u5?.notifications ?? {});
        expect(values[0].type).toBe('match_ready');
        expect(values[0].body).toContain('Round 2');
        expect(values[0].body).toContain('Club Open');
    });

    it('notifyTournamentStart creates a tournament_start notification', async () => {
        const result = await NotificationService.notifyTournamentStart('u6', {
            tournamentName: 'Spring Cup',
            tournamentId: 't2',
        });
        expect(result.success).toBe(true);

        const values = Object.values(dbMock._store?.users?.u6?.notifications ?? {});
        expect(values[0].type).toBe('tournament_start');
    });

    it('notifyTournamentComplete includes position when provided', async () => {
        await NotificationService.notifyTournamentComplete('u7', {
            tournamentName: 'Winter League',
            position: 2,
            tournamentId: 't3',
        });

        const values = Object.values(dbMock._store?.users?.u7?.notifications ?? {});
        expect(values[0].body).toContain('#2');
    });

    it('notifyRegistrationConfirmed creates correct type', async () => {
        await NotificationService.notifyRegistrationConfirmed('u8', {
            tournamentName: 'Padel Slam',
            tournamentId: 't4',
        });

        const values = Object.values(dbMock._store?.users?.u8?.notifications ?? {});
        expect(values[0].type).toBe('registration_confirmed');
    });
});

// ---------------------------------------------------------------------------
// subscribe / unsubscribe
// ---------------------------------------------------------------------------
describe('subscribe', () => {
    it('stores an unsubscribe function keyed by uid', () => {
        const unsub = NotificationService.subscribe('u9', () => {});
        expect(typeof unsub).toBe('function');
        expect(NotificationService._listeners['u9']).toBeTruthy();
    });

    it('unsubscribe removes the listener', () => {
        NotificationService.subscribe('u10', () => {});
        NotificationService.unsubscribe('u10');
        expect(NotificationService._listeners['u10']).toBeUndefined();
    });

    it('replaces old listener when subscribing twice for same uid', () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();
        NotificationService.subscribe('u11', cb1);
        NotificationService.subscribe('u11', cb2);

        // Only one listener stored
        expect(NotificationService._listeners['u11']).toBeTruthy();
    });
});
