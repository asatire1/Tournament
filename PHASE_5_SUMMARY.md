# Phase 5 Complete: Competition System

## Summary

Phase 5 creates the Competition Management System - a complete flow for creating, browsing, joining, and managing competitions.

## What Was Created

### New Files: `/competitions/`

| File | Lines | Purpose |
|------|-------|---------|
| `competition-service.js` | 860+ | Core service for all competition operations |
| `browse.html` | 425 | Browse and filter competitions |
| `create.html` | 555 | 3-step creation wizard |
| `view.html` | 626 | View details and register |
| `manage.html` | 650+ | Organizer management panel |
| `README.md` | 206 | Documentation |

### Modified Files

| File | Change |
|------|--------|
| `competitions.html` | Now redirects to `/competitions/browse.html` |
| `index.html` | Updated Create link to `/competitions/create.html` |

## Competition Service API

### Constants
```javascript
CompetitionService.STATUS = {
    DRAFT: 'draft',
    REGISTRATION: 'registration',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

CompetitionService.FORMAT = {
    AMERICANO: 'americano',
    MEXICANO: 'mexicano',
    MIX: 'mix',
    TEAM_LEAGUE: 'team-league'
};

CompetitionService.ACCESS = {
    ANYONE: 'anyone',
    REGISTERED: 'registered',
    VERIFIED: 'verified'
};
```

### Key Methods
```javascript
// Initialization
CompetitionService.init();

// Fetching
CompetitionService.getAll(options);
CompetitionService.getOpenForRegistration();
CompetitionService.getEligible(userLevel);
CompetitionService.getById(id);
CompetitionService.getByOrganizer(userId);

// Creating & Updating
CompetitionService.create(data);  // Returns { competition, organiserKey }
CompetitionService.update(id, updates);
CompetitionService.updateStatus(id, status);

// Status Transitions
CompetitionService.openRegistration(id);
CompetitionService.start(id);
CompetitionService.complete(id);
CompetitionService.cancel(id);

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

// Real-time
CompetitionService.onCompetitionChange(compId, callback);
CompetitionService.onRegistrationChange(compId, callback);

// Helpers
CompetitionService.getFormatInfo(format);
CompetitionService.getStatusInfo(status);
CompetitionService.formatLevel(level);
```

## Pages

### browse.html
**URL:** `/competitions/browse.html`

Features:
- Filter by status (Open, In Progress, Completed)
- Filter by format (Americano, Mexicano, Mix, Team League)
- Filter by eligibility (show only competitions user qualifies for)
- Real-time player count
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
- Player list with levels
- Organizer quick actions
- Real-time updates

### manage.html
**URL:** `/competitions/manage.html?id={id}`

Requires organizer access (logged in OR valid organizer key).

Features:
- **Overview tab**: Status actions, stats, share link
- **Players tab**: View/remove players, add manual players
- **Settings tab**: Edit details, delete competition

## Engine Integration

The service uses Phase 3 engines for:

### Fixture Generation (`_generateInitialFixtures`)
- **Americano**: Court calculation from player count
- **Mexicano**: Random first-round pairings, round count
- **Mix**: Group stage setup
- **Team League**: Round-robin fixture generation

### Standings Calculation (`_recalculateStandings`)
- Universal match processing
- Format-specific sorting:
  - Americano: Average score (descending)
  - Mexicano: Total score (descending)
  - Mix/Team League: Points (3 win, 1 draw)

## Firebase Structure

```
competitions/
  {competitionId}/
    meta/
      id, name, description
      format, status
      eventDate, eventTime, location
      minPlayers, maxPlayers
      minLevel, maxLevel, accessRestriction
      organizerId, organizerName, organiserKey
      createdAt, updatedAt
    registeredPlayers/
      {playerId}/
        id, name, level, registeredAt
    fixtures/
      (format-specific structure)
    matches/
      {matchId}/
        team1, team2, score, completedAt
    standings/
      {playerId}/
        rank, gamesPlayed, wins, losses
        pointsFor, pointsAgainst, avgScore
```

## User Flow

### Creating a Competition
1. User clicks "Create Competition"
2. Selects format (Americano, Mexicano, etc.)
3. Enters details (name, date, location)
4. Configures settings (player limits, levels)
5. Receives organizer key
6. Opens registration when ready

### Joining a Competition
1. User browses competitions
2. Filters by format/status/eligibility
3. Views competition details
4. Registers if eligible
5. Sees confirmation and player list

### Managing a Competition
1. Organizer accesses manage page
2. Opens registration
3. Monitors registrations
4. Starts competition when ready
5. Scores are entered (future: live scoring)
6. Completes competition

## URL Changes

| Old URL | New URL |
|---------|---------|
| `/competitions.html` | `/competitions/browse.html` |

## Dependencies

- `account/auth-service.js` - User authentication
- `src/engines/*.js` - Shared tournament engines (Phase 3)

## Benefits

1. **Structured flow** - Clear creation → registration → active → complete
2. **Access control** - Anyone / Registered / Verified restrictions
3. **Level matching** - Players join competitions at their skill level
4. **Real-time updates** - Firebase listeners for live data
5. **Engine integration** - Same calculation logic as Quick Play

---

Phase 5 Complete! ✅
