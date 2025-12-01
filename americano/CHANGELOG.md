# Americano Tournament System - Phases 1-4 Update

## Overview
This update implements the new fixture system, multi-court scheduling, optimized fixtures, and UI polish for the Americano tournament app.

---

## Phase 4: UI Polish (NEW!)

### Tournament Summary Card
A new visual summary card replaces the simple header stats:
- **4-column grid** showing Players, Courts, Rounds, Games/Player
- **Progress bar** with percentage complete
- **Status indicator**: Ready to start / In Progress / Complete

### Improved Fixtures Display

#### Match Numbers
Each match now displays a fixture number (`#1`, `#2`, etc.) for easy reference when discussing matches.

#### Winner Highlighting
- Winning team's score turns **green**
- Winner's player badges get a subtle **green ring highlight**
- Score box background turns green when complete

#### Current Round Indicator
- Current (incomplete) round has a **pulsing amber dot**
- **"Jump to Round X"** quick navigation button when viewing all rounds
- Current round card has an **amber ring highlight**

### Enhanced Resting Players
Instead of just text names, resting players now show:
- **Colored player badges** (matching their team colors)
- Player number + first name on larger screens
- Compact "X players resting" for 5+ resting

### Leaderboard Podium
When scores are entered, the top 3 players display in a **visual podium**:
- 🥇 Gold podium (tallest) for 1st place
- 🥈 Silver podium for 2nd place  
- 🥉 Bronze podium for 3rd place
- Player badges with ring highlight for winner

### Round Progress
Each round card now shows:
- **Mini progress bar** (filled based on completed matches)
- Fraction display: "2/3" or "✓ Complete"
- Visual distinction between complete/current/upcoming rounds

### Mobile Improvements
- Larger touch targets (44px minimum)
- Improved spacing on small screens
- Better text truncation
- Responsive summary card

### Accessibility
- Focus-visible states for keyboard navigation
- Print styles (hides buttons, removes shadows)
- Proper contrast ratios maintained

### New CSS Features
```css
/* Resting player badges */
.resting-player-badge { ... }

/* Score complete state */
.score-box-horizontal.score-complete { ... }

/* New animations */
@keyframes scaleIn { ... }
@keyframes slideIn { ... }

/* Focus states */
button:focus-visible { outline: 2px solid #3B82F6; }
```

---

## Phase 3: Multi-Court Optimized Fixtures

### Key Improvement: 8-Player Tournament
The **8-player fixtures have been completely redesigned** for optimal multi-court play:

| Metric | Before | After |
|--------|--------|-------|
| Fixtures | 14 | 14 |
| Rounds (2 courts) | 13 | **7** |
| Multi-court rounds | 1 | **7 (all!)** |
| Games per player | 7 | 7 |
| Resting players | 4 per round | **0 (never!)** |

**With 2 courts, everyone plays every single round!**

### How It Works
The new 8-player fixtures are structured so each pair of consecutive fixtures has no player overlap:
```javascript
// Round 1 (2 courts)
{ teams: [[1,2],[3,4]], rest: [] },  // Court 1
{ teams: [[5,6],[7,8]], rest: [] },  // Court 2

// Round 2 (2 courts)
{ teams: [[1,3],[2,4]], rest: [] },  // Court 1
{ teams: [[5,7],[6,8]], rest: [] },  // Court 2
// ... etc for 7 rounds total
```

### Updated Fixture Summary

| Players | Fixtures | Games/Player | Rounds (max courts) |
|---------|----------|--------------|---------------------|
| 5       | 5        | 4 each       | 5 (1 court)         |
| 6       | 8        | 5-6 each     | 8 (1 court)         |
| 7       | 11       | 6-7 each     | 11 (1 court)        |
| 8       | 14       | 7 each       | **7 (2 courts!)**   |
| 9       | 18       | 8 each       | 18 (1 court*)       |

*9-player fixtures can still benefit from multi-court scheduling when compatible

---

## Phase 1: Updated Fixtures (5-9 Players)

### Changes to `fixtures.js`
Replaced fixtures for players 5-9 with optimized data where every player partners with every other player at least once:

| Players | Fixtures | Games/Player |
|---------|----------|--------------|
| 5       | 5        | 4 each       |
| 6       | 8        | 5-6 each     |
| 7       | 11       | 6-7 each     |
| 8       | 14       | 7 each       |
| 9       | 18       | 8 each       |

### New TOURNAMENT_INFO Structure
Updated to include min/max games per player for accurate display:
```javascript
TOURNAMENT_INFO = {
    5: { fixtures: 5, gamesPerPlayerMin: 4, gamesPerPlayerMax: 4 },
    6: { fixtures: 8, gamesPerPlayerMin: 5, gamesPerPlayerMax: 6 },
    7: { fixtures: 11, gamesPerPlayerMin: 6, gamesPerPlayerMax: 7 },
    8: { fixtures: 14, gamesPerPlayerMin: 7, gamesPerPlayerMax: 7 },
    9: { fixtures: 18, gamesPerPlayerMin: 8, gamesPerPlayerMax: 8 },
    // etc.
}
```

### New Helper Function
Added `validateFixtures(playerCount)` to verify all partnerships are covered.

---

## Phase 2: Multi-Court Scheduling System

### Core Algorithm (`state.js` - `getRounds()`)
The new scheduling algorithm intelligently groups fixtures into **timeslots** where:
- No player appears in multiple matches within the same timeslot
- Up to `courtCount` matches can run simultaneously
- Resting players are calculated dynamically per timeslot

#### How It Works:
1. Start with an empty timeslot
2. Find fixtures where no player conflicts with already-scheduled matches
3. Add up to `courtCount` compatible fixtures
4. Mark those players as "playing" and remove from "resting"
5. Repeat until all fixtures are scheduled

### Score Key Migration
- **Old format**: `roundIndex_matchIndex` (e.g., "0_0", "1_2")
- **New format**: `f_fixtureIndex` (e.g., "f_0", "f_5")

This change ensures scores persist correctly when court count changes.

### Backward Compatibility
The `_migrateScoreKey()` function automatically converts old format to new format on load.

### New Methods in AmericanoState
```javascript
// Primary methods (use these)
updateScoreByFixture(fixtureIndex, team, value)
clearScoreByFixture(fixtureIndex)
getScoreByFixture(fixtureIndex)

// Legacy methods (still work, convert internally)
updateScore(roundIndex, matchIndex, team, value)
clearScore(roundIndex, matchIndex)
getScore(roundIndex, matchIndex)

// New helpers
getTotalTimeslots()  // Number of rounds with current court config
getGamesPerPlayerRange()  // {min, max} games per player
```

### Standings Calculation
Now uses fixture-based scoring with average score support:
```javascript
{
    score: 85,          // Total points
    avgScore: 10.625,   // Average per game
    avgPointsDiff: 2.5, // Average point differential
    // ...other stats
}
```

Sorting order:
1. Average score (primary)
2. Average point differential (secondary)
3. Total score (tiebreaker)

---

## Phase 2: UI Updates (`components.js`)

### Fixtures Tab
- Shows court assignments per match
- Displays number of courts per round
- Truncates long resting player lists
- Uses `fixtureIndex` for all score operations

### Leaderboard
- Shows "AVG" column when players have different game counts
- Displays info banner about variable game counts
- Updated legend to include AVG explanation

### Settings > Courts
- Court count selector with max based on player count
- Shows active players vs resting per round
- Shows total rounds with current configuration

---

## File Changes Summary

| File | Changes |
|------|---------|
| `fixtures.js` | New 5-9 player fixtures, updated TOURNAMENT_INFO |
| `state.js` | Multi-court scheduling, fixture-based scoring, migration logic |
| `components.js` | Fixture-based rendering, court count settings, avg score display |

---

## Testing Checklist

- [ ] 5 players: 5 rounds, 4 games per player
- [ ] 6 players: varies by court count
- [ ] 7 players: no player conflicts in timeslots
- [ ] 8 players with 2 courts: 2 matches per round
- [ ] 9 players: handles variable games correctly
- [ ] Changing court count preserves scores
- [ ] Old tournaments migrate correctly
- [ ] Leaderboard shows avg when needed
- [ ] Resting players display properly

---

## Next Steps (Phase 3+)

1. **Score averaging display** - Show avg prominently in leaderboard
2. **Tournament summary** - Better pre-game info
3. **Fixture validation** - Verify coverage for all player counts
4. **Generate fixtures for 10-24** - Use same principles
5. **Multi-court optimized fixtures** - Redesign fixtures so more can run simultaneously

---

## Known Limitations

### Multi-Court Scheduling
The current fixtures were designed for single-court play (everyone partners everyone). When using multiple courts, the algorithm finds compatible matches when possible, but not all rounds will have the maximum number of simultaneous matches.

For example, with 8 players and 2 courts:
- Ideal: 7 rounds with 2 matches each (14 total fixtures)
- Current: 13 rounds with mostly 1 match each

Future optimization could reorder or redesign fixtures specifically for multi-court play.
