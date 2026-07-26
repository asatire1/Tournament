/* GENERATED FILE — do not edit.
 * Source: src/core/rating-engine.js
 * Regenerate: node scripts/vendor-rating-engine.js
 */

/**
 * rating-engine.js — ELO-based Rating System
 *
 * Implements a padel-specific ELO rating system with:
 *   - Confidence-scaled K-factor (new players change more, veterans less)
 *   - Margin-of-victory multiplier (winning 20-4 gains more than winning 13-11)
 *   - Inactivity decay (confidence drops ~25% per month without play)
 *   - Manipulation resistance: minimum account age, suspicious-change flagging
 *
 * Algorithm overview:
 *   Expected score:   E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 *   K-factor:         K = K_MAX * (1 - confidence) + K_MIN * confidence
 *   Rating change:    ΔR = K * (S - E) * margin_multiplier
 *   New rating:       R_A' = R_A + ΔR
 *
 * This module is pure JavaScript (no Firebase dependency) so it can be
 * unit-tested in Node and also run inside Firebase Cloud Functions.
 *
 * @module core/rating-engine
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Starting rating for new players */
const DEFAULT_RATING = 1000;

/** Minimum rating floor (prevents going below this) */
const MIN_RATING = 100;

/** Maximum rating ceiling */
const MAX_RATING = 3000;

/** K-factor for brand-new players (high volatility) */
const K_MAX = 40;

/** K-factor for fully confident veterans */
const K_MIN = 10;

/** Confidence increases by this amount each game (caps at 1.0 after ~30 games) */
const CONFIDENCE_PER_GAME = 0.033;

/** Monthly inactivity decay applied to confidence (not rating) */
const MONTHLY_CONFIDENCE_DECAY = 0.25;

/**
 * A match result with margin ≥ this many points counts as a dominant win
 * for the margin multiplier calculation.
 */
const DOMINANT_WIN_MARGIN = 10;

// ---------------------------------------------------------------------------
// Core ELO functions (pure, no side-effects)
// ---------------------------------------------------------------------------

/**
 * Calculate the expected score for player A against player B.
 * Returns a value between 0 and 1 (probability of player A winning).
 *
 * @param {number} ratingA - Player A's current rating
 * @param {number} ratingB - Player B's current rating
 * @returns {number} Expected score for A (0–1)
 */
function expectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate the dynamic K-factor based on player confidence.
 * New players (confidence ≈ 0) use K_MAX; experienced players (confidence = 1) use K_MIN.
 *
 * @param {number} confidence - Player confidence (0–1)
 * @returns {number} K-factor
 */
function kFactor(confidence) {
    const c = Math.max(0, Math.min(1, confidence));
    return K_MAX * (1 - c) + K_MIN * c;
}

/**
 * Calculate a margin-of-victory multiplier.
 * A close win (1-point margin) gives multiplier ≈ 1.0.
 * A dominant win (margin ≥ DOMINANT_WIN_MARGIN) gives multiplier ≈ 1.5.
 *
 * Uses a logarithmic curve to prevent extreme scores from inflating ratings
 * disproportionately.
 *
 * @param {number} winnerScore - Winning team's score
 * @param {number} loserScore  - Losing team's score
 * @returns {number} Multiplier (1.0–1.5)
 */
function marginMultiplier(winnerScore, loserScore) {
    const margin = Math.max(0, winnerScore - loserScore);
    // Log curve: 1 + 0.5 * ln(1 + margin/DOMINANT_WIN_MARGIN) / ln(2)
    return 1 + 0.5 * Math.log(1 + margin / DOMINANT_WIN_MARGIN) / Math.log(2);
}

/**
 * Calculate new confidence after playing a game.
 * Confidence increases up to a cap of 1.0.
 *
 * @param {number} currentConfidence - Current confidence (0–1)
 * @returns {number} New confidence (0–1)
 */
function updateConfidence(currentConfidence) {
    return Math.min(1.0, currentConfidence + CONFIDENCE_PER_GAME);
}

/**
 * Apply monthly inactivity decay to confidence.
 * Called for each month elapsed since last match.
 *
 * @param {number} confidence - Current confidence (0–1)
 * @param {number} monthsInactive - Number of months without a match
 * @returns {number} Decayed confidence (0–1)
 */
function applyInactivityDecay(confidence, monthsInactive) {
    if (monthsInactive <= 0) return confidence;
    // Compound decay: confidence *= (1 - decay)^months
    const decayed = confidence * Math.pow(1 - MONTHLY_CONFIDENCE_DECAY, monthsInactive);
    return Math.max(0, decayed);
}

/**
 * Calculate the full rating change for a single player in a single match.
 *
 * @param {object} params
 * @param {number} params.playerRating       - Player's current rating
 * @param {number} params.opponentRating     - Combined opponent rating (average of pair in doubles)
 * @param {number} params.playerConfidence   - Player's confidence (0–1)
 * @param {number} params.playerScore        - Player's team score in the match
 * @param {number} params.opponentScore      - Opponent team's score
 * @returns {{ delta: number, newRating: number, newConfidence: number }}
 */
function calculateRatingChange({
    playerRating,
    opponentRating,
    playerConfidence,
    playerScore,
    opponentScore
}) {
    const won  = playerScore > opponentScore;
    const drew = playerScore === opponentScore;

    // Actual match outcome: 1 = win, 0.5 = draw, 0 = loss
    const actualScore = won ? 1 : drew ? 0.5 : 0;

    // Expected outcome
    const expected = expectedScore(playerRating, opponentRating);

    // Dynamic K-factor
    const K = kFactor(playerConfidence);

    // Margin multiplier (only applies to decisive results)
    const movMultiplier = won
        ? marginMultiplier(playerScore, opponentScore)
        : drew
            ? 1.0
            : marginMultiplier(opponentScore, playerScore); // mirror for losses

    // Raw delta — constrained to prevent single-match jumps > 40 points
    const rawDelta = K * (actualScore - expected) * movMultiplier;
    const delta = Math.max(-40, Math.min(40, rawDelta));

    const newRating = Math.max(MIN_RATING, Math.min(MAX_RATING, Math.round(playerRating + delta)));
    const newConfidence = updateConfidence(playerConfidence);

    return { delta: Math.round(delta), newRating, newConfidence };
}

// ---------------------------------------------------------------------------
// Doubles match handler
// ---------------------------------------------------------------------------

/**
 * Process a completed doubles match (2v2) and return rating changes for all four players.
 *
 * In doubles padel, each player's rating changes are calculated against the
 * AVERAGE rating of the two opponents. This prevents sandbagging (pairing a
 * high-rated player with a low-rated one to exploit the system).
 *
 * @param {object} match
 * @param {object} match.team1 - { players: [{ uid, rating, confidence }], score: number }
 * @param {object} match.team2 - { players: [{ uid, rating, confidence }], score: number }
 * @returns {object[]} Array of { uid, before, after, delta, newConfidence }
 */
function processDoublesMatch({ team1, team2 }) {
    const avgRating1 = (team1.players[0].rating + team1.players[1].rating) / 2;
    const avgRating2 = (team2.players[0].rating + team2.players[1].rating) / 2;

    const results = [];

    // Process team 1 players (each vs. average of team 2)
    team1.players.forEach(player => {
        const { delta, newRating, newConfidence } = calculateRatingChange({
            playerRating:     player.rating,
            opponentRating:   avgRating2,
            playerConfidence: player.confidence,
            playerScore:      team1.score,
            opponentScore:    team2.score
        });
        results.push({
            uid:            player.uid,
            before:         player.rating,
            after:          newRating,
            delta,
            newConfidence
        });
    });

    // Process team 2 players (each vs. average of team 1)
    team2.players.forEach(player => {
        const { delta, newRating, newConfidence } = calculateRatingChange({
            playerRating:     player.rating,
            opponentRating:   avgRating1,
            playerConfidence: player.confidence,
            playerScore:      team2.score,
            opponentScore:    team1.score
        });
        results.push({
            uid:            player.uid,
            before:         player.rating,
            after:          newRating,
            delta,
            newConfidence
        });
    });

    return results;
}

// ---------------------------------------------------------------------------
// Manipulation resistance
// ---------------------------------------------------------------------------

/**
 * Flag a rating change as potentially suspicious.
 * Returns true if the change should be queued for admin review.
 *
 * Triggers:
 * - Rating changed by > 35 points in a single match
 * - Account has played fewer than 5 rated matches
 * - Rating would cross a round-number threshold (500, 1000, 1500, 2000)
 *   by more than 50 points in one match
 *
 * @param {object} params
 * @param {number} params.before       - Rating before the match
 * @param {number} params.after        - Rating after the match
 * @param {number} params.gamesPlayed  - Number of rated matches player has played
 * @returns {boolean}
 */
function isSuspiciousChange({ before, after, gamesPlayed }) {
    const delta = Math.abs(after - before);

    // New players are expected to be volatile — don't flag them
    if (gamesPlayed < 5) return false;

    // Large single-match swing for established players
    if (delta > 35) return true;

    // Suspicious if jumping over a milestone by a large margin
    const milestones = [500, 1000, 1500, 2000];
    for (const m of milestones) {
        const crossedDown = before > m && after < m - 50;
        const crossedUp   = before < m && after > m + 50;
        if (crossedDown || crossedUp) return true;
    }

    return false;
}

/**
 * Get the number of months elapsed since a given ISO timestamp.
 *
 * @param {string} lastPlayedAt - ISO 8601 timestamp
 * @returns {number} Months elapsed (fractional)
 */
function monthsSince(lastPlayedAt) {
    const then = new Date(lastPlayedAt).getTime();
    const now  = Date.now();
    return (now - then) / (1000 * 60 * 60 * 24 * 30.44);
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

const RatingEngine = {
    DEFAULT_RATING,
    MIN_RATING,
    MAX_RATING,
    expectedScore,
    kFactor,
    marginMultiplier,
    updateConfidence,
    applyInactivityDecay,
    calculateRatingChange,
    processDoublesMatch,
    isSuspiciousChange,
    monthsSince
};



// CommonJS compatibility (for Firebase Cloud Functions)
// Note: When bundling for Cloud Functions, use rollup/esbuild to produce a CJS build.
// Do NOT use module.exports here — it breaks ES module loaders (Vite, Vitest).


module.exports = { DEFAULT_RATING, MIN_RATING, MAX_RATING, expectedScore, kFactor, marginMultiplier, updateConfidence, applyInactivityDecay, calculateRatingChange, processDoublesMatch, isSuspiciousChange, monthsSince };
