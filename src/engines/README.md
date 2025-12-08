# Shared Tournament Engines

Phase 3 of the UberPadel redesign: Extract shared logic into engines.

## Purpose

**Fix a bug once → Fixed everywhere**

These engines contain pure calculation logic with NO dependencies on:
- Firebase / Backend
- UI / DOM
- External libraries

Each Quick Play format's `state.js` uses these engines for calculations.

## Architecture

```
src/engines/
├── BaseEngine.js       # Shared utilities (standings, scoring, validation)
├── AmericanoEngine.js  # Rotating partners format
├── MexicanoEngine.js   # Ranking-based pairings (1&3 vs 2&4)
├── TournamentEngine.js # Group stage + knockout
├── TeamLeagueEngine.js # Fixed teams league
└── index.js            # Combined exports
```

## Usage in Quick Play

Each format loads the engine scripts before their state.js:

```html
<!-- In americano/index.html -->
<script src="../../src/engines/BaseEngine.js"></script>
<script src="../../src/engines/AmericanoEngine.js"></script>
<script src="js/state.js"></script>
```

Then in state.js:
```javascript
// Use shared engine for calculations
calculateStandings() {
    const fixtures = getFixtures(this.playerCount, this.courtCount);
    
    return AmericanoEngine.calculateStandings({
        playerNames: this.playerNames,
        fixtures: fixtures,
        scores: this.scores
    });
}
```

## Key Methods

### BaseEngine (shared by all)

| Method | Description |
|--------|-------------|
| `calculateStandings()` | Calculate player/team standings from matches |
| `sortStandings()` | Sort by various criteria (avgScore, totalScore, wins) |
| `validateScore()` | Validate and constrain score input |
| `calculateComplementScore()` | For fixed-points mode |
| `getMatchResult()` | Determine winner/draw |
| `countCompletedMatches()` | Count finished matches |
| `generatePlayerNames()` | Default player names |
| `shuffle()` | Fisher-Yates array shuffle |
| `generateTournamentId()` | Create unique IDs |
| `calculatePartnerStats()` | Partner pairing matrix |
| `calculateOpponentStats()` | Opponent matchup matrix |

### AmericanoEngine

| Method | Description |
|--------|-------------|
| `groupFixturesIntoTimeslots()` | Multi-court scheduling |
| `calculateStandings()` | Avg score primary |
| `getTournamentInfo()` | Games per player stats |

### MexicanoEngine

| Method | Description |
|--------|-------------|
| `generateRandomPairings()` | First round random |
| `generateRankingBasedPairings()` | 1&3 vs 2&4 |
| `generateRound()` | Create next round |
| `getOpponentsHistory()` | Who player has faced |
| `getPartnersHistory()` | Who player has partnered |

### TournamentEngine

| Method | Description |
|--------|-------------|
| `calculateGroupStandings()` | Group stage standings |
| `getKnockoutBracket()` | Bracket structure |
| `progressKnockout()` | Advance bracket |
| `calculateFairnessMetrics()` | Partner/opponent balance |

### TeamLeagueEngine

| Method | Description |
|--------|-------------|
| `generateRoundRobinFixtures()` | Create league schedule |
| `calculateTeamStandings()` | League table |
| `calculatePlayerStandings()` | Individual from team |
| `getHeadToHead()` | Head-to-head record |

## Testing

Run all engine tests:
```bash
node src/engines/tests/run-tests.js
```

Or test individually:
```javascript
// In browser console
console.log(AmericanoEngine.validatePlayerCount(8)); // true
console.log(AmericanoEngine.validatePlayerCount(3)); // false
```

## Migration Notes

When updating existing state.js files:

1. Add engine script tags before state.js
2. Replace inline calculation methods with engine calls
3. Keep state management (Firebase sync, UI state) in state.js
4. Engines are stateless - they don't store anything

## Changelog

- **Phase 3** - Initial extraction from Quick Play formats
