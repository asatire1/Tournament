/**
 * scheduler.js - Round-Robin League Scheduler
 * Generates a full season fixture list for all divisions using the circle method.
 *
 * Each division runs a single round-robin: every team plays every other team once.
 * For N teams (even), that produces N-1 rounds. For N teams (odd), a dummy "BYE"
 * entry is added to make N+1 (even), producing N rounds with one team resting
 * per round.
 *
 * Matches from all divisions are interleaved into the same weekly slots.
 * When a week has more matches than available courts, time slots are staggered
 * at one-hour intervals.
 */

const Scheduler = {

    /**
     * Generate a complete season schedule for all divisions.
     *
     * @param {Array<{index: number, name: string, teamIds: string[]}>} divisions
     *   Array of division objects. Each must contain an index, a display name,
     *   and an array of team IDs belonging to that division.
     *
     * @param {Object} options - Scheduling options.
     * @param {string}   [options.startDate]     - Season start date ('YYYY-MM-DD').
     *   Defaults to today.
     * @param {string}   [options.matchDay]      - Day of the week for matches
     *   ('Monday'-'Sunday'). Defaults to CONFIG.DEFAULT_MATCH_DAY.
     * @param {string}   [options.matchTime]     - Default kick-off time ('HH:MM').
     *   Defaults to CONFIG.DEFAULT_MATCH_TIME.
     * @param {number}   [options.courts]        - Number of courts available.
     *   Defaults to CONFIG.DEFAULT_COURTS.
     * @param {string[]} [options.excludedDates] - Dates to skip ('YYYY-MM-DD').
     *
     * @returns {{weekCount: number, fixtures: Object.<number, Array<{
     *   division: number,
     *   team1Id: string,
     *   team2Id: string,
     *   date: string,
     *   time: string,
     *   court: string,
     *   status: string,
     *   score: null
     * }>>}} An object with the total week count and a fixtures map keyed by
     *   week index (0-based).
     */
    generateSchedule(divisions, options = {}) {
        const startDate   = options.startDate     || _todayISO();
        const matchDay    = options.matchDay      || CONFIG.DEFAULT_MATCH_DAY;
        const matchTime   = options.matchTime     || CONFIG.DEFAULT_MATCH_TIME;
        const courts      = options.courts        || CONFIG.DEFAULT_COURTS;
        const excludedSet = new Set(options.excludedDates || []);

        // Build per-division round-robin rounds
        const divisionRounds = divisions.map(function (div) {
            return _generateRounds(div.teamIds);
        });

        // Total rounds = max across all divisions (smaller divisions will
        // simply have fewer matches once their rounds are exhausted).
        const totalRounds = divisionRounds.reduce(function (max, rounds) {
            return Math.max(max, rounds.length);
        }, 0);

        // Walk through weeks, assigning dates and court/time slots
        const fixtures = {};
        let currentDate = _firstMatchDate(startDate, matchDay);

        for (let round = 0; round < totalRounds; round++) {
            // Skip excluded dates
            while (excludedSet.has(_formatDate(currentDate))) {
                currentDate = _advanceOneWeek(currentDate);
            }

            const weekMatches = [];

            // Collect matches from every division for this round
            for (let d = 0; d < divisions.length; d++) {
                const rounds = divisionRounds[d];
                if (round >= rounds.length) {
                    continue; // this division has fewer rounds
                }

                const pairs = rounds[round];
                for (let p = 0; p < pairs.length; p++) {
                    weekMatches.push({
                        division: divisions[d].index,
                        team1Id: pairs[p][0],
                        team2Id: pairs[p][1]
                    });
                }
            }

            // Assign court and time to each match
            const dateStr = _formatDate(currentDate);
            const scheduled = _assignSlots(weekMatches, dateStr, matchTime, courts);
            fixtures[round] = scheduled;

            currentDate = _advanceOneWeek(currentDate);
        }

        return {
            weekCount: totalRounds,
            fixtures: fixtures
        };
    }
};

// ---------------------------------------------------------------------------
// Internal helpers (module-private by convention, prefixed with underscore)
// ---------------------------------------------------------------------------

/**
 * Generate round-robin rounds for a list of team IDs using the circle method.
 *
 * If the number of teams is odd a "BYE" sentinel is inserted so that the
 * algorithm works with an even count. Pairs that include "BYE" are silently
 * dropped, giving the opposing team a bye that week.
 *
 * @param {string[]} teamIds - Array of team IDs in this division.
 * @returns {Array<Array<[string, string]>>} Array of rounds, each round being
 *   an array of [team1Id, team2Id] pairs.
 * @private
 */
function _generateRounds(teamIds) {
    const BYE = '__BYE__';
    const ids = teamIds.slice(); // shallow copy so we don't mutate input

    // If odd number of teams, add a dummy entry
    if (ids.length % 2 !== 0) {
        ids.push(BYE);
    }

    const n = ids.length;
    const totalRounds = n - 1;
    const rounds = [];

    // Circle method: fix the first element, rotate the rest.
    // Positions array: indices into `ids`. Position 0 is fixed.
    const positions = [];
    for (let i = 0; i < n; i++) {
        positions.push(i);
    }

    for (let r = 0; r < totalRounds; r++) {
        const pairs = [];

        for (let i = 0; i < n / 2; i++) {
            const home = ids[positions[i]];
            const away = ids[positions[n - 1 - i]];

            // Skip bye pairs
            if (home === BYE || away === BYE) {
                continue;
            }

            pairs.push([home, away]);
        }

        rounds.push(pairs);

        // Rotate: keep positions[0] fixed, rotate positions[1..n-1] by one
        // position to the right.
        const last = positions[n - 1];
        for (let i = n - 1; i > 1; i--) {
            positions[i] = positions[i - 1];
        }
        positions[1] = last;
    }

    return rounds;
}

/**
 * Assign court numbers and staggered time slots to a list of matches for a
 * single week.
 *
 * Courts are named "Court 1", "Court 2", etc. When there are more matches
 * than courts, additional matches are stacked at +1 hour intervals on the
 * same courts.
 *
 * @param {Array<{division: number, team1Id: string, team2Id: string}>} matches
 * @param {string} dateStr  - Date string 'YYYY-MM-DD'.
 * @param {string} baseTime - Starting time 'HH:MM'.
 * @param {number} courts   - Number of available courts.
 * @returns {Array<{division: number, team1Id: string, team2Id: string,
 *   date: string, time: string, court: string, status: string, score: null}>}
 * @private
 */
function _assignSlots(matches, dateStr, baseTime, courts) {
    const result = [];
    const baseHour   = parseInt(baseTime.split(':')[0], 10);
    const baseMinute = baseTime.split(':')[1];

    for (let i = 0; i < matches.length; i++) {
        const courtIndex = i % courts;          // cycles 0,1,...,courts-1
        const timeSlot   = Math.floor(i / courts); // 0 for first batch, 1 for second, etc.

        const hour = baseHour + timeSlot;
        const time = _padTwo(hour) + ':' + baseMinute;

        result.push({
            division: matches[i].division,
            team1Id:  matches[i].team1Id,
            team2Id:  matches[i].team2Id,
            date:     dateStr,
            time:     time,
            court:    'Court ' + (courtIndex + 1),
            status:   CONFIG.MATCH_STATUS.SCHEDULED,
            score:    null
        });
    }

    return result;
}

/**
 * Return today's date as an ISO 'YYYY-MM-DD' string.
 *
 * @returns {string}
 * @private
 */
function _todayISO() {
    const d = new Date();
    return _formatDate(d);
}

/**
 * Format a Date object as 'YYYY-MM-DD'.
 *
 * @param {Date} d
 * @returns {string}
 * @private
 */
function _formatDate(d) {
    const year  = d.getFullYear();
    const month = _padTwo(d.getMonth() + 1);
    const day   = _padTwo(d.getDate());
    return year + '-' + month + '-' + day;
}

/**
 * Pad a number to two digits with a leading zero if needed.
 *
 * @param {number} n
 * @returns {string}
 * @private
 */
function _padTwo(n) {
    return n < 10 ? '0' + n : '' + n;
}

/**
 * Map day-of-week name to JS Date getDay() value (0 = Sunday).
 *
 * @type {Object.<string, number>}
 * @private
 */
const _DAY_MAP = {
    'Sunday':    0,
    'Monday':    1,
    'Tuesday':   2,
    'Wednesday': 3,
    'Thursday':  4,
    'Friday':    5,
    'Saturday':  6
};

/**
 * Find the first occurrence of `matchDay` on or after `startDateStr`.
 *
 * @param {string} startDateStr - 'YYYY-MM-DD'
 * @param {string} matchDay     - Day name ('Monday'-'Sunday')
 * @returns {Date}
 * @private
 */
function _firstMatchDate(startDateStr, matchDay) {
    const parts = startDateStr.split('-');
    const d = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
    );
    const target = _DAY_MAP[matchDay];

    if (typeof target === 'undefined') {
        // Fallback: use the start date as-is
        return d;
    }

    const current = d.getDay();
    let diff = target - current;
    if (diff < 0) {
        diff += 7;
    }
    d.setDate(d.getDate() + diff);
    return d;
}

/**
 * Advance a Date by exactly 7 days and return a new Date.
 *
 * @param {Date} d
 * @returns {Date}
 * @private
 */
function _advanceOneWeek(d) {
    const next = new Date(d.getTime());
    next.setDate(next.getDate() + 7);
    return next;
}
