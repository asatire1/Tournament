/**
 * marketing-service.js — Social Media Marketing Content Generator
 *
 * Generates platform-appropriate social media post copy for UberPadel events:
 *   - Tournament result announcements (prize money, winner, venue)
 *   - Upcoming tournament promotions (registration, prize pool, format)
 *   - Weekly leaderboard highlights (ELO ratings, top players)
 *   - Weekly stats digests (aggregate numbers, top winner)
 *
 * Pure ES module — no external dependencies. All output is plain text strings
 * ready to be copied into a scheduling tool (Buffer, Hootsuite, etc.) or
 * posted directly via the respective platform API.
 *
 * Platform constraints applied:
 *   - Twitter/X : hard limit ≤ 280 characters (enforced via truncation guard)
 *   - Instagram  : 5 relevant hashtags appended, emoji-forward tone
 *   - Facebook   : longer-form, community-oriented, link-friendly
 *   - TikTok     : short 3-scene video script (hook / body / CTA)
 *
 * @module services/marketing-service
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Clamp a string to maxLen characters, appending '…' if truncated.
 * Used to enforce the Twitter 280-char hard limit.
 *
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function clamp(text, maxLen) {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + '…';
}

/**
 * Pick a random element from an array.
 * Kept deterministic-ish by seeding on string length so repeated calls with
 * the same data return the same variant (good for caching / previews).
 *
 * @param {Array} arr
 * @param {number} seed
 * @returns {*}
 */
function pick(arr, seed = 0) {
    return arr[Math.abs(seed) % arr.length];
}

// ---------------------------------------------------------------------------
// MarketingService
// ---------------------------------------------------------------------------

const MarketingService = {

    // -----------------------------------------------------------------------
    // Static data
    // -----------------------------------------------------------------------

    /**
     * Curated hashtag groups for UberPadel content.
     * Mix `core` tags on every post; add `prize` on result/promo posts;
     * add `engagement` on community/leaderboard posts.
     */
    HASHTAGS: {
        core:       ['#padel', '#padeluk', '#uberpadel'],
        prize:      ['#prizemoney', '#padellife', '#padelplayer'],
        engagement: ['#padellovers', '#padelnation', '#sportsmoney'],
    },

    // -----------------------------------------------------------------------
    // Utility methods
    // -----------------------------------------------------------------------

    /**
     * Format a numeric amount as British pounds (e.g. 1500 → "£1,500").
     *
     * @param {number} amount
     * @returns {string}
     */
    formatCurrency(amount) {
        return '£' + Number(amount).toLocaleString('en-GB', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    },

    /**
     * Returns recommended posting times for each platform, optimised for a
     * UK audience (GMT/BST assumed; times given in local UK time).
     *
     * @returns {{ instagram: Array, twitter: Array, facebook: Array, tiktok: Array }}
     */
    getBestPostingTimes() {
        return {
            instagram: [
                { day: 'Monday',    time: '07:30', note: 'Pre-work commute scroll' },
                { day: 'Wednesday', time: '12:00', note: 'Midweek lunchtime peak' },
                { day: 'Friday',    time: '17:30', note: 'End-of-week wind-down' },
                { day: 'Sunday',    time: '09:00', note: 'Weekend morning browse' },
            ],
            twitter: [
                { day: 'Monday',    time: '08:00', note: 'Start-of-week news check' },
                { day: 'Wednesday', time: '09:00', note: 'Mid-week engagement peak' },
                { day: 'Friday',    time: '16:00', note: 'End-of-week trending window' },
                { day: 'Saturday',  time: '10:00', note: 'Weekend sports audience' },
            ],
            facebook: [
                { day: 'Tuesday',   time: '13:00', note: 'Midday community check-in' },
                { day: 'Thursday',  time: '19:00', note: 'Evening family/social time' },
                { day: 'Saturday',  time: '11:00', note: 'Weekend leisure browsing' },
                { day: 'Sunday',    time: '20:00', note: 'Sunday evening peak reach' },
            ],
            tiktok: [
                { day: 'Tuesday',   time: '19:00', note: 'Post-work TikTok session' },
                { day: 'Thursday',  time: '20:00', note: 'Pre-weekend hype window' },
                { day: 'Friday',    time: '21:00', note: 'Friday night entertainment' },
                { day: 'Sunday',    time: '16:00', note: 'Sunday afternoon scroll' },
            ],
        };
    },

    // -----------------------------------------------------------------------
    // 1. Tournament Result
    // -----------------------------------------------------------------------

    /**
     * Generate post copy announcing a completed tournament result.
     *
     * @param {object} params
     * @param {string} params.winnerName     - Display name of winner / winning pair
     * @param {string} params.winnerTeam     - Team / partner name (if applicable)
     * @param {number|string} params.prize   - Prize amount (numeric or string)
     * @param {string} params.venue          - Venue name
     * @param {string} params.format         - Tournament format (e.g. "Americano")
     * @param {string} [params.runnerUp]     - Runner-up name (optional)
     * @param {string} [params.third]        - Third-place name (optional)
     * @returns {{ instagram: string, twitter: string, facebook: string, tiktok: string }}
     */
    tournamentResult({ winnerName, winnerTeam, prize, venue, format, runnerUp, third }) {
        const prizeStr = typeof prize === 'number' ? this.formatCurrency(prize) : prize;
        const teamLine = winnerTeam ? ` & ${winnerTeam}` : '';
        const runnerUpLine = runnerUp ? `\n🥈 Runner-up: ${runnerUp}` : '';
        const thirdLine    = third    ? `\n🥉 Third place: ${third}` : '';
        const podiumBlock  = runnerUpLine + thirdLine;

        const igHashtags = [
            ...this.HASHTAGS.core,
            ...this.HASHTAGS.prize,
        ].slice(0, 5).join(' ');

        const instagram = [
            `🏆 WE HAVE A CHAMPION! 🏆`,
            ``,
            `Congratulations to ${winnerName}${teamLine} — winners of today's ${format} tournament at ${venue}, taking home a massive ${prizeStr}! 💰`,
            podiumBlock,
            ``,
            `What a day of padel. See you at the next one 👊`,
            ``,
            igHashtags,
        ].join('\n');

        const twitterRaw = `🏆 ${winnerName}${teamLine} wins the ${format} at ${venue} and takes home ${prizeStr}! 💰${runnerUp ? ` Runner-up: ${runnerUp}.` : ''} Play for real prize money at UberPadel 👇 #uberpadel #padeluk`;
        const twitter = clamp(twitterRaw, 280);

        const facebook = [
            `🎉 Tournament Results — ${format} at ${venue}`,
            ``,
            `Massive congratulations to ${winnerName}${teamLine} for winning today's ${format} tournament and walking away with ${prizeStr} in prize money!`,
            podiumBlock,
            ``,
            `It was a fantastic day of competitive padel with some incredible performances on court. A huge thank you to everyone who played, and to ${venue} for hosting.`,
            ``,
            `Want to compete for real prize money? Register on UberPadel and find a tournament near you 👇`,
            `www.uberpadel.com`,
            ``,
            [...this.HASHTAGS.core, ...this.HASHTAGS.prize].join(' '),
        ].join('\n');

        const tiktok = [
            `[SCENE 1 — Hook (0-3s)]`,
            `Text overlay: "They just won ${prizeStr} playing padel 🏆"`,
            `Visuals: Close-up of trophy or prize cheque. High-energy music starts.`,
            ``,
            `[SCENE 2 — Body (3-12s)]`,
            `Text overlay: "${winnerName}${teamLine} — ${format} Champions at ${venue}"`,
            `Visuals: Match highlights / winner celebration / podium moment.`,
            `Voiceover: "Real prize money. Real competition. UberPadel."`,
            ``,
            `[SCENE 3 — CTA (12-15s)]`,
            `Text overlay: "Enter your next tournament at uberpadel.com"`,
            `Visuals: UberPadel logo. Link in bio prompt.`,
            `Caption: ${winnerName}${teamLine} takes ${prizeStr} at ${venue}! 🏆 Could you be next? #uberpadel #padeluk #prizemoney`,
        ].join('\n');

        return { instagram, twitter, facebook, tiktok };
    },

    // -----------------------------------------------------------------------
    // 2. Upcoming Tournament
    // -----------------------------------------------------------------------

    /**
     * Generate promo post copy for an upcoming tournament.
     *
     * @param {object} params
     * @param {string} params.name             - Tournament name
     * @param {string} params.date             - Human-readable date string (e.g. "Saturday 5 April")
     * @param {string} params.venue            - Venue name
     * @param {string} params.format           - Tournament format
     * @param {number|string} params.prizePool - Total prize pool
     * @param {number|string} params.entryFee  - Entry fee per player
     * @param {number} params.spotsLeft        - Remaining spots
     * @param {string} params.registrationUrl  - Registration link
     * @returns {{ instagram: string, twitter: string, facebook: string, tiktok: string }}
     */
    upcomingTournament({ name, date, venue, format, prizePool, entryFee, spotsLeft, registrationUrl }) {
        const prizeStr = typeof prizePool === 'number' ? this.formatCurrency(prizePool) : prizePool;
        const feeStr   = typeof entryFee  === 'number' ? this.formatCurrency(entryFee)  : entryFee;
        const urgency  = spotsLeft <= 5 ? `⚠️ Only ${spotsLeft} spots left!` : `🔥 ${spotsLeft} spots remaining`;

        const igHashtags = [
            ...this.HASHTAGS.core,
            ...this.HASHTAGS.prize,
            '#padelcompetition',
        ].slice(0, 5).join(' ');

        const instagram = [
            `📣 TOURNAMENT ALERT 📣`,
            ``,
            `${name} is coming to ${venue} on ${date}!`,
            ``,
            `🏆 Prize pool: ${prizeStr}`,
            `💷 Entry fee: ${feeStr} per player`,
            `📍 Venue: ${venue}`,
            `🎯 Format: ${format}`,
            ``,
            urgency,
            ``,
            `Secure your spot 👉 Link in bio`,
            ``,
            igHashtags,
        ].join('\n');

        const twitterRaw = `📣 ${name} — ${format} at ${venue}, ${date}. ${prizeStr} prize pool. ${feeStr} entry. ${urgency} Register: ${registrationUrl} #uberpadel #padeluk`;
        const twitter = clamp(twitterRaw, 280);

        const facebook = [
            `🎾 Upcoming Tournament: ${name}`,
            ``,
            `📅 Date: ${date}`,
            `📍 Venue: ${venue}`,
            `🎯 Format: ${format}`,
            `🏆 Prize pool: ${prizeStr}`,
            `💷 Entry fee: ${feeStr} per player`,
            ``,
            `${urgency} — don't miss out on your chance to compete for real prize money.`,
            ``,
            `Whether you're an experienced competitor or stepping up to your first cash-prize event, this is the perfect tournament to test yourself.`,
            ``,
            `👉 Register now: ${registrationUrl}`,
            ``,
            [...this.HASHTAGS.core, ...this.HASHTAGS.prize].join(' '),
        ].join('\n');

        const tiktok = [
            `[SCENE 1 — Hook (0-3s)]`,
            `Text overlay: "${prizeStr} prize pool. One padel tournament. 🏆"`,
            `Visuals: Fast-cut padel rally footage. Punchy beat drop.`,
            ``,
            `[SCENE 2 — Body (3-12s)]`,
            `Text overlay: "${name} | ${date} | ${venue}"`,
            `Text overlay 2: "Format: ${format} | Entry: ${feeStr}"`,
            `Visuals: Venue shots, players warming up, scoreboard.`,
            `Voiceover: "${urgency} — will you be there?"`,
            ``,
            `[SCENE 3 — CTA (12-15s)]`,
            `Text overlay: "Register now → ${registrationUrl}"`,
            `Visuals: UberPadel app / website on screen. Link in bio card.`,
            `Caption: ${prizeStr} up for grabs at ${venue} on ${date} 🎾 ${urgency} #uberpadel #padeluk #prizemoney`,
        ].join('\n');

        return { instagram, twitter, facebook, tiktok };
    },

    // -----------------------------------------------------------------------
    // 3. Leaderboard Highlight
    // -----------------------------------------------------------------------

    /**
     * Generate weekly leaderboard highlight posts.
     *
     * @param {object} params
     * @param {Array<{name: string, rating: number, gamesPlayed: number}>} params.topPlayers
     *   Array of top players (ideally top 3–5). First element is #1 ranked.
     * @param {string|number} params.week          - Week identifier (e.g. "12" or "w/e 30 Mar")
     * @param {number}        params.totalGames    - Total games played platform-wide that week
     * @returns {{ instagram: string, twitter: string, facebook: string, tiktok: string }}
     */
    leaderboardHighlight({ topPlayers, week, totalGames }) {
        const medals    = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        const podiumLines = topPlayers.slice(0, 5).map((p, i) =>
            `${medals[i]} ${p.name} — ${p.rating} ELO (${p.gamesPlayed} games)`
        );
        const leader = topPlayers[0];

        const igHashtags = [
            ...this.HASHTAGS.core,
            ...this.HASHTAGS.engagement,
        ].slice(0, 5).join(' ');

        const instagram = [
            `📊 WEEKLY LEADERBOARD — Week ${week}`,
            ``,
            `Here are this week's top-ranked players on UberPadel! 🎾`,
            ``,
            ...podiumLines,
            ``,
            `📈 Total games played this week: ${totalGames.toLocaleString('en-GB')}`,
            ``,
            `Where do you rank? Check the leaderboard on UberPadel 👇`,
            ``,
            igHashtags,
        ].join('\n');

        const podiumShort = topPlayers.slice(0, 3).map((p, i) =>
            `${medals[i]} ${p.name} (${p.rating})`
        ).join(' | ');
        const twitterRaw = `📊 Week ${week} Leaderboard: ${podiumShort}. ${totalGames} games played. Can you crack the top 3? Check your ranking on UberPadel 👇 #uberpadel #padeluk #padelnation`;
        const twitter = clamp(twitterRaw, 280);

        const facebook = [
            `📊 Weekly Leaderboard Update — Week ${week}`,
            ``,
            `A huge week of padel on the platform with ${totalGames.toLocaleString('en-GB')} games played! Here's how the top of the leaderboard looks right now:`,
            ``,
            ...podiumLines,
            ``,
            `${leader.name} is sitting at the top with an impressive ${leader.rating} ELO rating. The competition is fierce — every game counts towards your ranking.`,
            ``,
            `Log in to UberPadel to check your current position and find your next tournament 👇`,
            `www.uberpadel.com`,
            ``,
            [...this.HASHTAGS.core, ...this.HASHTAGS.engagement].join(' '),
        ].join('\n');

        const tiktok = [
            `[SCENE 1 — Hook (0-3s)]`,
            `Text overlay: "Who's the best padel player in the UK right now? 🤔"`,
            `Visuals: Leaderboard screen recording / animated reveal. Tense music build.`,
            ``,
            `[SCENE 2 — Body (3-12s)]`,
            `Text overlay: "Week ${week} Leaderboard"`,
            ...topPlayers.slice(0, 3).map((p, i) =>
                `Text overlay ${i + 2}: "${medals[i]} ${p.name} — ${p.rating} ELO"`
            ),
            `Visuals: Player name cards flipping in one by one.`,
            `Voiceover: "${leader.name} is top ranked this week with ${leader.rating} ELO!"`,
            ``,
            `[SCENE 3 — CTA (12-15s)]`,
            `Text overlay: "Check your ranking → uberpadel.com"`,
            `Visuals: App screen showing personal ELO rating.`,
            `Caption: Week ${week} leaderboard is LIVE 📊 ${leader.name} leads with ${leader.rating} ELO. Where do you sit? #uberpadel #padeluk #padelnation`,
        ].join('\n');

        return { instagram, twitter, facebook, tiktok };
    },

    // -----------------------------------------------------------------------
    // 4. Weekly Stats
    // -----------------------------------------------------------------------

    /**
     * Generate a weekly digest / stats round-up post.
     *
     * @param {object} params
     * @param {number} params.tournamentsPlayed - Tournaments completed in the week
     * @param {number|string} params.totalPrizeMoney - Total prize money paid out
     * @param {number} params.totalPlayers     - Unique players active that week
     * @param {string} params.topWinner        - Name of player who won the most that week
     * @returns {{ instagram: string, twitter: string, facebook: string, tiktok: string }}
     */
    weeklyStats({ tournamentsPlayed, totalPrizeMoney, totalPlayers, topWinner }) {
        const prizeStr  = typeof totalPrizeMoney === 'number'
            ? this.formatCurrency(totalPrizeMoney)
            : totalPrizeMoney;

        const igHashtags = [
            ...this.HASHTAGS.core,
            ...this.HASHTAGS.engagement,
            '#padelstats',
        ].slice(0, 5).join(' ');

        const instagram = [
            `📈 THIS WEEK ON UBERPADEL`,
            ``,
            `Another incredible week of competitive padel across the UK 🇬🇧`,
            ``,
            `🏆 Tournaments completed: ${tournamentsPlayed}`,
            `💰 Total prize money paid out: ${prizeStr}`,
            `👥 Active players: ${totalPlayers.toLocaleString('en-GB')}`,
            `🌟 Top winner this week: ${topWinner}`,
            ``,
            `The standard keeps rising — are you ready to compete? 🎾`,
            ``,
            igHashtags,
        ].join('\n');

        const twitterRaw = `📈 This week on UberPadel: ${tournamentsPlayed} tournaments, ${prizeStr} paid out, ${totalPlayers} players. Top winner: ${topWinner} 🏆 Join the UK's fastest-growing padel platform 👇 #uberpadel #padeluk`;
        const twitter = clamp(twitterRaw, 280);

        const facebook = [
            `📈 UberPadel Weekly Stats Round-Up`,
            ``,
            `What a week it's been for competitive padel in the UK! Here are the numbers:`,
            ``,
            `🏆 Tournaments completed: ${tournamentsPlayed}`,
            `💰 Total prize money paid out: ${prizeStr}`,
            `👥 Unique active players: ${totalPlayers.toLocaleString('en-GB')}`,
            `🌟 Star player of the week: ${topWinner}`,
            ``,
            `The UberPadel community continues to grow week on week. Whether you're a seasoned competitor or just starting your prize money journey, there's a tournament for every level.`,
            ``,
            `Browse upcoming events and register today 👇`,
            `www.uberpadel.com`,
            ``,
            [...this.HASHTAGS.core, ...this.HASHTAGS.engagement].join(' '),
        ].join('\n');

        const tiktok = [
            `[SCENE 1 — Hook (0-3s)]`,
            `Text overlay: "${prizeStr} paid out in ONE week 💰"`,
            `Visuals: Quick-fire montage of tournament action. Beat drop.`,
            ``,
            `[SCENE 2 — Body (3-12s)]`,
            `Text overlay: "This week on UberPadel 📈"`,
            `Text overlay 2: "${tournamentsPlayed} tournaments | ${totalPlayers} players | ${prizeStr} prize money"`,
            `Text overlay 3: "⭐ Top winner: ${topWinner}"`,
            `Visuals: Stat cards animating on screen one by one.`,
            `Voiceover: "Real prize money, real competition — every single week."`,
            ``,
            `[SCENE 3 — CTA (12-15s)]`,
            `Text overlay: "Your tournament is waiting → uberpadel.com"`,
            `Visuals: Registration screen / tournament list on app.`,
            `Caption: ${prizeStr} paid out this week alone 💰 The UK padel scene is growing FAST. Are you in? #uberpadel #padeluk #prizemoney`,
        ].join('\n');

        return { instagram, twitter, facebook, tiktok };
    },

    // -----------------------------------------------------------------------
    // 5. Generate All
    // -----------------------------------------------------------------------

    /**
     * Call all four content generators and return a combined object.
     * Pass `null` for any section you don't want to include — it will be
     * omitted from the returned object.
     *
     * @param {object} data
     * @param {object|null} [data.tournamentResult]    - Params for tournamentResult()
     * @param {object|null} [data.upcomingTournament]  - Params for upcomingTournament()
     * @param {object|null} [data.leaderboardHighlight] - Params for leaderboardHighlight()
     * @param {object|null} [data.weeklyStats]         - Params for weeklyStats()
     * @returns {object} Combined posts keyed by content type
     */
    generateAll(data) {
        const result = {};

        if (data.tournamentResult) {
            result.tournamentResult = this.tournamentResult(data.tournamentResult);
        }
        if (data.upcomingTournament) {
            result.upcomingTournament = this.upcomingTournament(data.upcomingTournament);
        }
        if (data.leaderboardHighlight) {
            result.leaderboardHighlight = this.leaderboardHighlight(data.leaderboardHighlight);
        }
        if (data.weeklyStats) {
            result.weeklyStats = this.weeklyStats(data.weeklyStats);
        }

        return result;
    },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default MarketingService;

export const {
    HASHTAGS,
    formatCurrency,
    getBestPostingTimes,
    tournamentResult,
    upcomingTournament,
    leaderboardHighlight,
    weeklyStats,
    generateAll,
} = MarketingService;
