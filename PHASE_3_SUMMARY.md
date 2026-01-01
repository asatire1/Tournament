# Phase 3 Complete: Shared Engines Extraction

## Summary

Phase 3 extracts shared tournament calculation logic into reusable engines. **Fix a bug once → fixed everywhere.**

## What Was Created

### New Files: `/src/engines/`

| File | Purpose |
|------|---------|
| `BaseEngine.js` | Shared utilities: standings, scoring, validation, ID generation |
| `AmericanoEngine.js` | Rotating partners: timeslot grouping, avg-score standings |
| `MexicanoEngine.js` | Ranking-based: 1&3 vs 2&4 pairings, round generation |
| `TournamentEngine.js` | Group + knockout: bracket progression, group standings |
| `TeamLeagueEngine.js` | Fixed teams: round-robin generation, league table |
| `index.js` | Combined exports |
| `README.md` | Documentation |

### Modified Files

| File | Change |
|------|--------|
| `quick-play/americano/index.html` | Added engine script tags |
| `quick-play/americano/js/state.js` | Uses `AmericanoEngine.calculateStandings()` |
| `quick-play/mexicano/index.html` | Added engine script tags |
| `quick-play/tournament/index.html` | Added engine script tags |
| `quick-play/team-league/index.html` | Added engine script tags |

### Test File

| File | Purpose |
|------|---------|
| `test-engines.html` | Browser-based test suite for all engines |

## Architecture

```
Quick Play Format
       │
       ▼
   state.js  ─────────────►  Engine (pure logic)
       │                          │
       ▼                          ▼
   Firebase                  Calculations
   (sync)                    (stateless)
```

The engines are **stateless** and **pure** - they have no dependencies on Firebase, DOM, or external libraries. This makes them:
- Easy to test
- Easy to reuse
- Bug fixes apply everywhere

## Key Engine Methods

### BaseEngine
```javascript
BaseEngine.calculateStandings({ playerNames, matches, scores, getMatchKey })
BaseEngine.sortStandings(standings, 'avgScore' | 'totalScore' | 'wins')
BaseEngine.validateScore(value, { min, max })
BaseEngine.calculateComplementScore(score, totalPoints)
BaseEngine.getMatchResult(team1Score, team2Score)
BaseEngine.countCompletedMatches(matches, scores, getMatchKey)
BaseEngine.generatePlayerNames(count, prefix)
BaseEngine.shuffle(array)
BaseEngine.generateTournamentId(length)
BaseEngine.generateOrganiserKey(length)
BaseEngine.hashPasscode(passcode)
BaseEngine.calculatePartnerStats(matches, playerCount)
BaseEngine.calculateOpponentStats(matches, playerCount)
```

### AmericanoEngine
```javascript
AmericanoEngine.validatePlayerCount(count)
AmericanoEngine.getOptimalCourtCount(playerCount)
AmericanoEngine.groupFixturesIntoTimeslots(fixtures, courtCount)
AmericanoEngine.calculateStandings({ playerNames, fixtures, scores })
AmericanoEngine.getTournamentInfo(playerCount, fixtures)
```

### MexicanoEngine
```javascript
MexicanoEngine.validatePlayerCount(count)
MexicanoEngine.getCourtCount(playerCount)
MexicanoEngine.getDefaultRoundCount(playerCount)
MexicanoEngine.generateRandomPairings(playerCount)
MexicanoEngine.generateRankingBasedPairings(standings)
MexicanoEngine.generateRound(roundNumber, playerCount, standings)
MexicanoEngine.calculateStandings({ playerNames, rounds, scores })
MexicanoEngine.getOpponentsHistory(playerIndex, rounds)
MexicanoEngine.getPartnersHistory(playerIndex, rounds)
```

### TournamentEngine
```javascript
TournamentEngine.validatePlayerCount(count)
TournamentEngine.calculateGroupStandings({ groupPlayers, playerNames, fixtures, scores })
TournamentEngine.getKnockoutBracket(format)
TournamentEngine.progressKnockout(bracket, scores)
TournamentEngine.calculateFairnessMetrics(fixtures, playerCount)
```

### TeamLeagueEngine
```javascript
TeamLeagueEngine.validateTeamCount(count)
TeamLeagueEngine.generateRoundRobinFixtures(teamCount)
TeamLeagueEngine.calculateTeamStandings({ teamNames, rounds, scores })
TeamLeagueEngine.calculatePlayerStandings({ teams, rounds, scores })
TeamLeagueEngine.getHeadToHead(team1Index, team2Index, rounds, scores)
```

## Testing

Open `test-engines.html` in a browser to run all engine tests.

## Migration Guide

To use engines in a format's state.js:

1. **Add script tags** in index.html:
```html
<script src="../../src/engines/BaseEngine.js"></script>
<script src="../../src/engines/AmericanoEngine.js"></script>
```

2. **Replace calculation methods** in state.js:
```javascript
// Before (inline calculation)
calculateStandings() {
    const playerStats = Array(this.playerCount).fill(null).map(() => ({ ... }));
    // ... 50 lines of calculation
    return standings.sort(...);
}

// After (using engine)
calculateStandings() {
    const fixtures = getFixtures(this.playerCount, this.courtCount);
    return AmericanoEngine.calculateStandings({
        playerNames: this.playerNames,
        fixtures: fixtures,
        scores: this.scores
    });
}
```

3. **Keep state management** in state.js (Firebase sync, UI state, etc.)

## What's Next

- **Phase 4**: Account System Consolidation
- **Phase 5-8**: Competitions System (Browse, Create, Register, Manage)
- **Phase 9**: Bridge Competitions to Shared Engines
- **Phase 10**: Polish, Stats, Testing, Launch

---

Phase 3 Complete! ✅
