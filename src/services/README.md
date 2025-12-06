# Services Layer - Phase 2

This directory contains the services layer that eliminates code duplication through inheritance and unified APIs.

## Architecture

```
services/
├── base-tournament.js      # Base class with shared logic (~70% of tournament code)
├── americano-tournament.js # Americano-specific implementation
├── mexicano-tournament.js  # Mexicano-specific implementation
├── tournament-service.js   # CRUD operations and factory methods
├── user-service.js         # User management operations
└── index.js               # Bundle verification
```

## Key Concepts

### 1. BaseTournament Class

The `BaseTournament` class contains all shared tournament functionality:

- Firebase operations (load, save, subscribe)
- Score management
- Standings calculation
- Access control (organiser keys, passcodes)
- Status management

Format-specific classes extend this and only implement:
- `generateRound(n)` - Format-specific pairing logic
- `validatePlayerCount(n)` - Format constraints
- `getFormatConfig()` - Format configuration

### 2. Tournament Service

Unified API for all tournament operations:

```javascript
// Create a tournament
const result = await TournamentService.create('AMERICANO', {
    name: 'Friday Night Padel',
    players: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank'],
    totalPoints: 21
});

// Load existing
const { tournament } = await TournamentService.load('AMERICANO', 'abc123');

// Subscribe to updates
const { unsubscribe } = await TournamentService.subscribe('MEXICANO', 'xyz789', (t) => {
    updateUI(t);
});

// Get recent tournaments
const recent = TournamentService.getAllRecent(10);
```

### 3. User Service

Unified user management:

```javascript
// Get or create from Google sign-in
const { user, isNew } = await UserService.getOrCreateFromGoogle(firebaseUser);

// Admin: verify a user
await UserService.verifyUser(userId, '3.5');

// Search users
const matches = await UserService.searchUsers('john');
```

## Usage

### Loading Scripts

```html
<!-- Core modules first -->
<script src="../src/core/firebase.js"></script>
<script src="../src/core/permissions.js"></script>
<script src="../src/core/storage.js"></script>
<script src="../src/core/router.js"></script>
<script src="../src/core/auth.js"></script>

<!-- Services layer -->
<script src="../src/services/base-tournament.js"></script>
<script src="../src/services/americano-tournament.js"></script>
<script src="../src/services/mexicano-tournament.js"></script>
<script src="../src/services/tournament-service.js"></script>
<script src="../src/services/user-service.js"></script>
```

### Creating an Americano Tournament

```javascript
// Initialize core
Firebase.init();

// Create tournament
const result = await TournamentService.create('AMERICANO', {
    name: 'Weekend Tournament',
    players: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'],
    courts: ['Court 1'],
    totalPoints: 16,
    fixedPoints: true,
    passcode: '1234'
});

if (result.success) {
    console.log('Tournament ID:', result.id);
    console.log('Organiser link:', TournamentService.getLinks('AMERICANO', result.id, result.organiserKey).organiserLink);
}
```

### Creating a Mexicano Tournament

```javascript
const result = await TournamentService.create('MEXICANO', {
    name: 'Mexicano Night',
    players: Array.from({ length: 12 }, (_, i) => `Player ${i + 1}`),
    pointsPerMatch: 32,
    roundCount: 6,
    mode: 'registered'
});

if (result.success) {
    const tournament = result.tournament;
    
    // Subscribe to changes
    tournament.subscribe((t) => {
        renderStandings(t.getStandings());
        renderCurrentRound(t.rounds[t.currentRound]);
    });
}
```

### Working with Scores

```javascript
// Save a score
await tournament.saveScore(roundIndex, matchIndex, 16, 14);

// Check if round is complete
if (tournament.isRoundComplete(roundIndex)) {
    // For Mexicano: advance to next round
    tournament.advanceRound();
}

// Get standings
const standings = tournament.getStandings();
standings.forEach((player, rank) => {
    console.log(`${rank + 1}. ${player.name}: ${player.totalPoints} pts`);
});
```

### Direct Class Usage

You can also use tournament classes directly:

```javascript
// Create Americano tournament directly
const tournament = new AmericanoTournament();
tournament.initialize({
    name: 'My Tournament',
    players: ['A', 'B', 'C', 'D', 'E', 'F']
});
tournament.generateAllRounds();
await tournament.save();

// Load existing
const loaded = new MexicanoTournament('existing-id');
await loaded.load();
```

## Format-Specific Features

### Americano

- Rotating partners (everyone plays with everyone)
- Pre-generated fixtures based on player count
- Partner statistics tracking
- Fixed or variable points

```javascript
const americano = result.tournament;
const partnerStats = americano.getPartnerStats();
// partnerStats[playerIndex][partnerIndex] = times played together
```

### Mexicano

- Ranking-based pairing (1&3 vs 2&4)
- Dynamic round generation based on standings
- Round advancement
- Opponent/partner history

```javascript
const mexicano = result.tournament;
const opponents = mexicano.getOpponentsHistory(playerIndex);
const partners = mexicano.getPartnersHistory(playerIndex);

// Advance to next round after completing current
if (mexicano.isRoundComplete(mexicano.currentRound)) {
    mexicano.advanceRound(); // Generates new pairings from standings
}
```

## Extending for New Formats

To add a new tournament format:

1. Create `src/services/newformat-tournament.js`
2. Extend `BaseTournament`
3. Implement required methods:

```javascript
class NewFormatTournament extends BaseTournament {
    constructor(id = null) {
        super('NEW_FORMAT', id);
    }
    
    getFormatConfig() {
        return {
            FIREBASE_ROOT: 'newformat-tournaments',
            MIN_PLAYERS: 4,
            MAX_PLAYERS: 32
        };
    }
    
    validatePlayerCount(count) {
        return count >= 4 && count <= 32;
    }
    
    generateRound(roundNumber) {
        // Your pairing logic here
        return { roundNumber, matches: [] };
    }
}
```

4. Register in `TournamentService.getFormatClass()`
5. Add to `FORMATS`, `FORMAT_NAMES`, `FORMAT_PATHS`

## Benefits

| Before | After |
|--------|-------|
| 4 separate firebase-config.js files | 1 shared Firebase module |
| 4 separate scoring implementations | 1 in BaseTournament |
| 4 separate standings calculations | 1 in BaseTournament |
| Manual Firebase calls everywhere | TournamentService API |
| No user management abstraction | UserService API |
| ~70% code duplication | ~90% code sharing |
