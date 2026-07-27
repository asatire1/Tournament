/**
 * Shared Format Configuration
 * 
 * Single source of truth for all tournament format rules.
 * Used by both Quick Play and Competitions.
 * 
 * Change here → applies everywhere
 */

const FORMAT_CONFIG = {
    americano: {
        name: 'Americano',
        description: 'Round-robin with rotating partners',
        emoji: '🎾',
        
        // Player limits
        minPlayers: 5,
        maxPlayers: 24,
        
        // Validation rule: 'any', 'divisible4', 'fixed', 'teams'
        rule: 'any',
        
        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 32
        },
        
        // Help text
        hint: 'Supports 5-24 players (odd numbers allowed - players rest in rotation)'
    },
    
    mexicano: {
        name: 'Mexicano',
        description: 'Dynamic pairing based on standings',
        emoji: '🌮',
        
        // Player limits
        minPlayers: 8,
        maxPlayers: 80,
        
        // Validation rule
        rule: 'divisible4',
        
        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 32
        },
        
        // Help text
        hint: 'Requires player count divisible by 4 (8, 12, 16, 20, 24...)'
    },
    
    mix: {
        name: 'Mix Tournament',
        description: 'Balanced competition with skill-based tiers ensuring fair matches for all levels',
        emoji: '🏆',
        
        // Player limits (fixed options only)
        minPlayers: 20,
        maxPlayers: 28,
        validOptions: [20, 24, 28],
        
        // Validation rule
        rule: 'fixed',
        
        // Default settings
        defaults: {
            courts: 6,
            pointsPerMatch: 16
        },
        
        // Help text
        hint: 'Only supports 20, 24, or 28 players (creates balanced skill tiers)'
    },
    
    'team-league': {
        name: 'Team League',
        description: 'Fixed teams compete in league + knockout',
        emoji: '👥',
        
        // Team limits (not players)
        minTeams: 4,
        maxTeams: 36,
        playersPerTeam: 2,

        // Computed player limits
        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        // Validation rule
        rule: 'teams',

        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 16
        },

        // Help text
        hint: 'Uses fixed teams of 2 players each (4-36 teams)'
    },

    mixicano: {
        name: 'Mixicano',
        description: 'Mixed gender dynamic pairing based on standings',
        emoji: '🔀',

        // Player limits (must be divisible by 4, equal M/F)
        minPlayers: 4,
        maxPlayers: 80,

        // Validation rule
        rule: 'divisible4',

        // Default settings
        defaults: {
            courts: 1,
            pointsPerMatch: 32
        },

        // Help text
        hint: 'Requires equal male and female players, divisible by 4 (4, 8, 12...)'
    },

    'round-robin': {
        name: 'Round Robin',
        description: 'Every team plays every other team once',
        emoji: '🔁',

        // Team limits
        minTeams: 4,
        maxTeams: 24,
        playersPerTeam: 2,

        // Computed player limits
        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        // Validation rule
        rule: 'teams',

        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 16
        },

        // Help text
        hint: 'Fixed pairs of 2 players each (4-24 teams)'
    },

    swiss: {
        name: 'Swiss System',
        description: 'Opponents matched by standings each round',
        emoji: '♟️',

        // Team limits
        minTeams: 4,
        maxTeams: 40,
        playersPerTeam: 2,

        // Computed player limits
        get minPlayers() { return this.minTeams * this.playersPerTeam; },
        get maxPlayers() { return this.maxTeams * this.playersPerTeam; },

        // Validation rule
        rule: 'teams',

        // Default settings
        defaults: {
            courts: 2,
            pointsPerMatch: 16
        },

        // Help text
        hint: 'Fixed pairs, even number of teams required (4-40 teams)'
    }
};

/**
 * Validate player/team count for a format
 * @param {number} count - Number of players or teams
 * @param {string} format - Format key (americano, mexicano, mix, team-league)
 * @returns {object} { valid: boolean, error?: string }
 */
function validateFormatCount(count, format) {
    const config = FORMAT_CONFIG[format];
    
    if (!config) {
        return { valid: false, error: `Unknown format: ${format}` };
    }
    
    const isTeamFormat = config.rule === 'teams' || config.playersPerTeam > 0;
    const label = isTeamFormat ? 'teams' : 'players';
    const min = isTeamFormat ? config.minTeams : config.minPlayers;
    const max = isTeamFormat ? config.maxTeams : config.maxPlayers;
    
    // Check minimum
    if (count < min) {
        return { 
            valid: false, 
            error: `Minimum ${min} ${label} required for ${config.name}` 
        };
    }
    
    // Check maximum
    if (count > max) {
        return { 
            valid: false, 
            error: `Maximum ${max} ${label} allowed for ${config.name}` 
        };
    }
    
    // Format-specific rules
    if (config.rule === 'divisible4' && count % 4 !== 0) {
        const lower = Math.floor(count / 4) * 4;
        const upper = Math.ceil(count / 4) * 4;
        const suggestion = lower >= min ? `${lower} or ${upper}` : `${upper}`;
        return { 
            valid: false, 
            error: `${config.name} requires player count divisible by 4. Try ${suggestion}.`
        };
    }
    
    if (config.rule === 'fixed' && !config.validOptions.includes(count)) {
        return { 
            valid: false, 
            error: `${config.name} only supports ${config.validOptions.join(', ')} players`
        };
    }
    
    return { valid: true };
}

/**
 * Get format configuration
 * @param {string} format - Format key
 * @returns {object|null} Format config or null if not found
 */
function getFormatConfig(format) {
    return FORMAT_CONFIG[format] || null;
}

/**
 * Get all format keys
 * @returns {string[]} Array of format keys
 */
function getAllFormats() {
    return Object.keys(FORMAT_CONFIG);
}

/**
 * Escape a value for interpolation into HTML.
 *
 * This file is loaded by every format page, so it is the one place a shared
 * helper can live without adding another script tag. Player names, team names,
 * tournament names and scores all come from other users via the database, and
 * are rendered with innerHTML throughout the app.
 *
 * Quotes are escaped too, so this is safe in attribute positions
 * (value="...", title="..."), not only in text nodes. Prefer setting
 * .textContent or .value as a property where you can — this is for the many
 * places that build markup as strings.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Coerce a score to a safe numeric string for rendering.
 * Scores arrive from the database as unvalidated JSON on several roots, so a
 * non-number must never reach innerHTML.
 * @param {unknown} value
 * @returns {string} The number as a string, or '' if it is not a finite number.
 */
function safeScore(value) {
    return Number.isFinite(Number(value)) && value !== '' && value !== null ? String(Number(value)) : '';
}

/**
 * Resolve the current Firebase auth uid, waiting briefly for the anonymous
 * sign-in kicked off at page load if it hasn't landed yet. Tournament loading
 * routinely races signInAnonymously(), so anything that needs currentUser has
 * to be prepared to wait for it.
 * @param {number} [timeoutMs]
 * @returns {Promise<string|null>} The uid, or null if none appears in time.
 */
function _awaitProofAuthUid(timeoutMs = 8000) {
    const auth = firebase.auth();
    if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
    return new Promise(resolve => {
        let done = false;
        let timer = null;
        const unsub = auth.onAuthStateChanged(user => {
            if (done || !user) return;
            done = true;
            clearTimeout(timer);
            unsub();
            resolve(user.uid);
        });
        timer = setTimeout(() => {
            if (done) return;
            done = true;
            unsub();
            resolve(auth.currentUser ? auth.currentUser.uid : null);
        }, timeoutMs);
    });
}

/**
 * Prove possession of a tournament's organiser secret WITHOUT reading it.
 *
 * The organiser key and passcode hash used to sit under the tournament's own
 * `meta` node, which is world-readable — so the "secret" that gated organiser
 * access could simply be fetched by any visitor and replayed. They now live in
 * `tournamentSecrets/<id>`, which is `".read": false`: no client can read it,
 * including this one.
 *
 * So instead of reading the secret and comparing locally, we prove we already
 * hold it by WRITING it back as `proof` (organiser key) or `passcodeProof`
 * (passcode hash). The security rule compares the incoming value against the
 * stored one — which the rule can see and we cannot — and rejects the write
 * with permission-denied when it doesn't match. A rejected write stores
 * nothing, so a wrong guess leaks nothing and changes nothing.
 *
 * The same write records `claimant: <uid>`, and the tournament write rule
 * accepts `claimant == auth.uid` as write ownership. One successful call
 * therefore both verifies the secret AND claims ownership for this session,
 * which is why callers no longer need to hold on to the key afterwards — a
 * stored "this session verified" marker is enough.
 *
 * @param {string} tournamentId
 * @param {{key?: string, passcodeHash?: string}} secret - The secret to prove:
 *        `key` is the organiser key, `passcodeHash` is the entered passcode
 *        hashed into the same shape it was stored in. Pass one of them.
 * @returns {Promise<boolean>} true when the proof was accepted. Returns false
 *          — never throws — on a wrong secret, permission-denied, missing
 *          auth, or any other error, so callers can treat it as a boolean.
 */
async function proveTournamentSecret(tournamentId, { key, passcodeHash } = {}) {
    if (!tournamentId || (!key && !passcodeHash)) return false;
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.database) {
        console.error('proveTournamentSecret: Firebase auth/database SDK not loaded');
        return false;
    }

    try {
        const uid = await _awaitProofAuthUid();
        if (!uid) {
            console.warn('proveTournamentSecret: no Firebase auth uid (sign-in timed out)');
            return false;
        }

        // `claimant` must equal auth.uid or the rule rejects the whole write.
        const payload = { claimant: uid };
        if (key) payload.proof = key;
        if (passcodeHash) payload.passcodeProof = passcodeHash;

        await firebase.database().ref('tournamentSecrets/' + tournamentId).update(payload);
        return true;
    } catch (error) {
        // permission-denied is the expected answer to a wrong secret, not a
        // fault — the caller only ever wants the boolean.
        console.log('Secret proof rejected:', error && (error.code || error.message));
        return false;
    }
}

/**
 * SHA-256 hex digest, matching the shape CryptoUtils.hashPasscode() produces.
 * Duplicated here deliberately: shared/crypto.js is only loaded by the
 * americano/mexicano/mixicano pages, but every format page loads this file.
 * @param {string} value
 * @returns {Promise<string|null>} Hex digest, or null if Web Crypto is absent.
 */
async function _sha256Hex(value) {
    if (typeof crypto === 'undefined' || !crypto.subtle) return null;
    try {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        console.warn('seedTournamentSecret: SHA-256 unavailable:', e && e.message);
        return null;
    }
}

/**
 * Create `tournamentSecrets/<id>` for a tournament that has just been written.
 *
 * proveTournamentSecret() can only verify an organiser against a secrets node
 * that already exists, and nothing else creates one — so without this call a
 * newly created tournament has no provable secret and its organiser silently
 * loses organiser status the moment they reload or switch device.
 *
 * Must run AFTER the tournament data is written: the rule permits the create
 * only while `<root>/<id>/meta/organizerUid` already equals `auth.uid`, which
 * is also why a create flow whose OrganizerAuth uid fell back to a local id
 * (rather than a real Firebase uid) simply can't seed — it never owned the
 * tournament as far as the rules are concerned.
 *
 * BOTH `key` and `passcodeHash` are always written, even for the formats that
 * only have one secret. The rule accepts a later write when EITHER
 * `proof == key` OR `passcodeProof == passcodeHash`; an absent field reads as
 * null, so a node missing one of them makes that comparison `null == null` —
 * true — and any signed-in visitor could claim the tournament by writing just
 * `claimant`. Where a format has no separate passcode hash we therefore store
 * SHA-256 of the key, which plugs that branch with a value nobody can produce
 * without the secret. Better to skip the node entirely than to create a
 * half-populated one.
 *
 * @param {string} tournamentId
 * @param {{root: string, key: string, passcodeHash?: string}} secret -
 *        `root` is the format's Firebase root (e.g. 'americano-tournaments'),
 *        `key` the organiser key (the passcode itself, for formats that use it
 *        as the key), `passcodeHash` the stored passcode hash where the format
 *        keeps one separately from the key.
 * @returns {Promise<boolean>} true when the node was created. Returns false —
 *          never throws — on any failure, so tournament creation is never
 *          broken by a seeding problem.
 */
async function seedTournamentSecret(tournamentId, { root, key, passcodeHash } = {}) {
    if (!tournamentId || !root || !key) {
        console.warn('seedTournamentSecret: missing tournamentId, root or key');
        return false;
    }
    // Rule: key must be 6-64 chars. Formats that use the passcode as the
    // organiser key accept passcodes as short as 4, and those cannot be
    // stored — the whole write would be rejected on validation.
    if (key.length < 6 || key.length > 64) {
        console.warn(`seedTournamentSecret: key length ${key.length} outside 6-64, skipping seed`);
        return false;
    }
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.database) {
        console.error('seedTournamentSecret: Firebase auth/database SDK not loaded');
        return false;
    }

    try {
        const claimant = await _awaitProofAuthUid();
        if (!claimant) {
            console.warn('seedTournamentSecret: no Firebase auth uid (sign-in timed out)');
            return false;
        }

        const hash = passcodeHash || await _sha256Hex(key);
        if (!hash || hash.length > 128) {
            console.warn('seedTournamentSecret: no usable passcode hash, skipping seed');
            return false;
        }

        await firebase.database().ref('tournamentSecrets/' + tournamentId)
            .set({ root, key, passcodeHash: hash, claimant });
        return true;
    } catch (error) {
        console.warn('seedTournamentSecret: could not seed secrets node:', error && (error.code || error.message));
        return false;
    }
}

// Make available globally — plain-script pages use these directly
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
    window.safeScore  = safeScore;
    window.proveTournamentSecret = proveTournamentSecret;
    window.seedTournamentSecret = seedTournamentSecret;
}

// Export for use in modules (if using ES modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FORMAT_CONFIG, validateFormatCount, getFormatConfig, getAllFormats, escapeHtml, safeScore, proveTournamentSecret, seedTournamentSecret };
}
