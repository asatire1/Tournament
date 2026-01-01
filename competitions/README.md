# Competition System

Phase 5 of the UberPadel redesign: Competition Management System.

## Structure

```
competitions/
├── competition-service.js   # Core service for competition CRUD
├── browse.html              # Browse/filter competitions
├── create.html              # Create new competition wizard
├── view.html                # View competition details & register
├── manage.html              # Organizer management panel
└── README.md                # This file
```

## competition-service.js

Core service for all competition operations.

### Constants

```javascript
CompetitionService.STATUS = {
    DRAFT: 'draft',           // Just created, not open
    REGISTRATION: 'registration',  // Open for players
    ACTIVE: 'active',         // Competition in progress
    COMPLETED: 'completed',   // Finished
    CANCELLED: 'cancelled'    // Cancelled
};

CompetitionService.FORMAT = {
    AMERICANO: 'americano',
    MEXICANO: 'mexicano',
    MIX: 'mix',
    TEAM_LEAGUE: 'team-league'
};

CompetitionService.ACCESS = {
    ANYONE: 'anyone',         // Guests can join
    REGISTERED: 'registered', // Account required
    VERIFIED: 'verified'      // Verified level required
};
```

### API

```javascript
// Initialize
CompetitionService.init();

// Fetch
CompetitionService.getAll(options);           // All competitions
CompetitionService.getOpenForRegistration();  // Registration open
CompetitionService.getEligible(userLevel);    // Eligible for user's level
CompetitionService.getById(id);               // Single competition
CompetitionService.getByOrganizer(userId);    // By organizer

// Create & Update
CompetitionService.create(data);              // Returns { competition, organiserKey }
CompetitionService.update(id, updates);       // Update metadata
CompetitionService.updateStatus(id, status);  // Change status

// Status Transitions
CompetitionService.openRegistration(id);      // draft -> registration
CompetitionService.start(id);                 // registration -> active
CompetitionService.complete(id);              // active -> completed
CompetitionService.cancel(id);                // any -> cancelled

// Registration
CompetitionService.registerPlayer(compId, player);
CompetitionService.unregisterPlayer(compId, playerId);
CompetitionService.getRegisteredPlayers(compId);
CompetitionService.isPlayerRegistered(compId, playerId);

// Matches & Scoring
CompetitionService.updateScore(compId, matchId, score);
CompetitionService.getStandings(compId);

// Access Control
CompetitionService.verifyOrganiserKey(compId, key);
CompetitionService.isOrganizer(compId, userId);
CompetitionService.checkAccess(competition, user);
CompetitionService.checkEligibility(competition, userLevel);

// Real-time Listeners
CompetitionService.onCompetitionChange(compId, callback);
CompetitionService.onRegistrationChange(compId, callback);

// Display Helpers
CompetitionService.getFormatInfo(format);     // { label, emoji, color }
CompetitionService.getStatusInfo(status);     // { label, color, bgClass }
CompetitionService.formatLevel(level);        // "3.50"
```

## Pages

### browse.html

**URL:** `/competitions/browse.html`

Features:
- Filter by status (Open, In Progress, Completed)
- Filter by format (Americano, Mexicano, etc.)
- Filter by eligibility (shows only competitions user qualifies for)
- Real-time player count display
- Shows user's registration status

### create.html

**URL:** `/competitions/create.html`

3-step wizard:
1. **Format** - Choose tournament format
2. **Details** - Name, date, time, location
3. **Settings** - Player limits, level restrictions, access rules

Returns organizer key for management access.

### view.html

**URL:** `/competitions/view.html?id={id}`

Features:
- Full competition details
- Registration status and actions
- Player list
- Organizer quick actions (if owner)
- Real-time updates via Firebase listener

### manage.html

**URL:** `/competitions/manage.html?id={id}`

Requires organizer access (logged in as creator OR valid organizer key).

Features:
- **Overview tab**: Status actions, stats, share link
- **Players tab**: View/remove players, add manual players
- **Settings tab**: Edit details, danger zone (delete)

## Firebase Structure

```
competitions/
  {competitionId}/
    meta/
      id: string
      name: string
      description: string
      format: 'americano' | 'mexicano' | 'mix' | 'team-league'
      status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled'
      eventDate: string (ISO)
      eventTime: string
      location: string
      minPlayers: number
      maxPlayers: number
      minLevel: number
      maxLevel: number
      accessRestriction: 'anyone' | 'registered' | 'verified'
      courts: number
      organizerId: string
      organizerName: string
      organiserKey: string
      createdAt: string (ISO)
      updatedAt: string (ISO)
    registeredPlayers/
      {playerId}/
        id: string
        name: string
        level: number
        registeredAt: string (ISO)
    matches/
      {matchId}/
        ...
    standings/
      {playerId}/
        ...
```

## Integration with Engines

The service integrates with Phase 3 engines for fixture generation and standings calculation:

```javascript
// When starting a competition
async _generateInitialFixtures(competition) {
    switch (format) {
        case 'americano':
            // Uses AmericanoEngine for court calculation
            break;
        case 'mexicano':
            // Uses MexicanoEngine for random pairings, round count
            break;
        case 'mix':
            // Uses TournamentEngine for group/knockout setup
            break;
        case 'team-league':
            // Uses TeamLeagueEngine for round-robin fixtures
            break;
    }
}

// When updating scores
async _recalculateStandings(competitionId) {
    // Universal standings calculation
    // Sort order based on format:
    // - Americano: avg score (descending)
    // - Mexicano: total score (descending)
    // - Mix/Team League: points (3 win, 1 draw)
}
```

Pages that need engines include them directly:
- `manage.html` - Includes all engines for fixture generation
- `view.html` - Includes all engines for standings display

## URL Changes

| Old URL | New URL |
|---------|---------|
| `/competitions.html` | `/competitions/browse.html` |

The old `/competitions.html` page has been updated to redirect.
