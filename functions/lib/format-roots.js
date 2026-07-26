/**
 * Canonical format → RTDB root mapping.
 *
 * These roots are the ones the deployed database rules and the client actually
 * use. Three of them cannot be derived by appending "-tournaments" to the
 * format name, which is why this map exists rather than string concatenation.
 *
 * Keep in sync with og-worker/src/firebase.ts.
 */

const FORMAT_ROOTS = {
    americano:     'americano-tournaments',
    mexicano:      'mexicano-tournaments',
    mixicano:      'mixicano-tournaments',
    mix:           'tournaments',
    tournament:    'tournaments',
    knockout:      'knockout-tournaments',
    'team-league': 'team-tournaments',
    'round-robin': 'roundrobin-tournaments',
    swiss:         'swiss-tournaments',
};

/** Formats that get database triggers, one entry per distinct root. */
const TRIGGER_FORMATS = Object.keys(FORMAT_ROOTS).filter(f => f !== 'tournament');

function rootForFormat(format) {
    return Object.prototype.hasOwnProperty.call(FORMAT_ROOTS, format)
        ? FORMAT_ROOTS[format]
        : null;
}

module.exports = { FORMAT_ROOTS, TRIGGER_FORMATS, rootForFormat };
