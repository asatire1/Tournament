# Core Modules - Phase 1 Foundation

This directory contains the shared core utilities for UberPadel tournament management.

## Overview

The core modules eliminate code duplication across tournament formats by providing:

- **firebase.js** - Single Firebase configuration and database operations
- **permissions.js** - Centralized role-based permission system
- **storage.js** - LocalStorage abstraction with expiration support
- **router.js** - Shared hash-based routing logic
- **auth.js** - Enhanced authentication with permissions integration
- **compat.js** - Backwards compatibility layer for existing code

## Quick Start

### For New Pages

```html
<!-- Load Firebase SDK first -->
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js"></script>

<!-- Load core modules in order -->
<script src="../src/core/firebase.js"></script>
<script src="../src/core/permissions.js"></script>
<script src="../src/core/storage.js"></script>
<script src="../src/core/router.js"></script>
<script src="../src/core/auth.js"></script>

<script>
  // Initialize everything
  Firebase.init();
  Auth.init();
  Router.init();
</script>
```

### For Existing Tournament Formats (Backwards Compatible)

Add the compatibility layer to use new core modules without changing existing code:

```html
<!-- Load Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.x.x/firebase-auth-compat.js"></script>

<!-- Load core modules -->
<script src="../src/core/firebase.js"></script>
<script src="../src/core/permissions.js"></script>
<script src="../src/core/storage.js"></script>
<script src="../src/core/router.js"></script>
<script src="../src/core/auth.js"></script>
<script src="../src/core/compat.js"></script>

<script>
  // Setup compatibility for your format
  setupCompat('americano'); // or 'mexicano', 'team-league', 'tournament'
  
  // Now CONFIG, database, initializeFirebase(), etc. all work as before
</script>

<!-- Load existing format-specific code -->
<script src="js/state.js"></script>
<script src="js/handlers.js"></script>
<!-- etc. -->
```

## Module Reference

### Firebase (`firebase.js`)

```javascript
// Initialize (safe to call multiple times)
Firebase.init();

// Get database reference
const db = Firebase.getDatabase();

// Tournament operations
await Firebase.checkTournamentExists('AMERICANO', 'abc123');
await Firebase.createTournament('AMERICANO', 'abc123', data);
await Firebase.updateTournament('AMERICANO', 'abc123', { meta: { name: 'New Name' } });
await Firebase.saveScore('AMERICANO', 'abc123', 0, 0, 16, 14);

// Subscribe to changes
const unsubscribe = Firebase.subscribeTournament('AMERICANO', 'abc123', (snapshot) => {
  const data = snapshot.val();
  // Update UI
});

// Later: unsubscribe();
```

### Permissions (`permissions.js`)

```javascript
// Check user's role
const role = Permissions.getRole(user); // 'guest', 'registered', 'verified', 'admin'

// Check specific permission
if (Permissions.can(user, 'CREATE_LEVEL_BASED_TOURNAMENT')) {
  // Show level-based tournament option
}

// Check tournament access
const { allowed, reason } = Permissions.canJoinTournament(user, tournament);
if (!allowed) {
  showError(reason);
}

// Get creation permissions
const perms = Permissions.getCreationPermissions(user);
// { anyone: true, registered: true, levelBased: false }

// Require permission (throws PermissionError if not met)
try {
  Permissions.require(user, 'VIEW_ADMIN_PANEL');
} catch (e) {
  redirect('/login');
}
```

### Available Permissions

| Permission | Guest | Registered | Verified | Admin |
|-----------|-------|------------|----------|-------|
| VIEW_ALL_TOURNAMENTS | ✓ | ✓ | ✓ | ✓ |
| CREATE_TOURNAMENT | ✓ | ✓ | ✓ | ✓ |
| CREATE_ANYONE_TOURNAMENT | ✓ | ✓ | ✓ | ✓ |
| CREATE_REGISTERED_TOURNAMENT | - | ✓ | ✓ | ✓ |
| CREATE_LEVEL_BASED_TOURNAMENT | - | - | ✓ | ✓ |
| JOIN_ANYONE_TOURNAMENT | ✓ | ✓ | ✓ | ✓ |
| JOIN_REGISTERED_TOURNAMENT | - | ✓ | ✓ | ✓ |
| JOIN_LEVEL_BASED_TOURNAMENT | - | - | ✓ | ✓ |
| VERIFY_PLAYERS | - | - | - | ✓ |
| VIEW_ADMIN_PANEL | - | - | - | ✓ |

### Storage (`storage.js`)

```javascript
// Basic operations
Storage.set('key', value);
Storage.get('key', defaultValue);
Storage.remove('key');

// With expiration (1 hour)
Storage.set('temp_data', value, 3600000);

// User data
Storage.setUser(user);
const user = Storage.getUser();
Storage.clearUser();

// Tournament data
Storage.saveTournament('americano', 'abc123', tournamentData);
const tournament = Storage.getTournament('americano', 'abc123');
const allTournaments = Storage.getTournaments('americano');

// Recent activity
Storage.addRecentTournament('americano', 'abc123', 'My Tournament');
const recent = Storage.getRecentTournaments();

// Preferences
Storage.setPreferences({ soundEnabled: false });
const prefs = Storage.getPreferences();
```

### Router (`router.js`)

```javascript
// Initialize
Router.init();

// Listen for route changes
Router.onRouteChange = (route, tournamentId, organiserKey) => {
  if (route === 'home') {
    showHomePage();
  } else if (route === 'tournament') {
    loadTournament(tournamentId, organiserKey);
  }
};

// Navigate
Router.navigate('tournament', 'abc123', 'organiserKey123');
Router.goHome();
Router.goToTournament('abc123');
Router.goToTournamentAsOrganiser('abc123', 'key123');

// Generate links
const playerLink = Router.getPlayerLink('abc123');
const organiserLink = Router.getOrganiserLink('abc123', 'key123');

// Generate IDs
const newId = Router.generateTournamentId();
const newKey = Router.generateOrganiserKey();
```

### Auth (`auth.js`)

```javascript
// Initialize (async)
await Auth.init();

// User info
const user = Auth.getCurrentUser();
const isLoggedIn = Auth.isLoggedIn();
const isGuest = Auth.isGuest();
const isVerified = Auth.isVerified();
const isAdmin = Auth.isAdmin();
const name = Auth.getName();
const role = Auth.getRole();

// Permissions (integrates with permissions.js)
if (Auth.can('CREATE_LEVEL_BASED_TOURNAMENT')) {
  showOption();
}

const { allowed, reason } = Auth.canJoinTournament(tournament);
const perms = Auth.getCreationPermissions();

// UI helpers
const badge = Auth.getRoleBadge(); // HTML string
const nav = Auth.getNavHTML(); // HTML string
Auth.renderUserInfo('user-container');

// Actions
Auth.setUser(userData);
await Auth.signOut();

// Guards
Auth.requireLogin('/return-url');
Auth.requireVerified('/return-url');
Auth.requireAdmin();

// Listen for changes
const unsubscribe = Auth.onAuthStateChange((user) => {
  updateUI(user);
});
```

## Migration Path

### Step 1: Add Core Scripts (No Breaking Changes)

Add the core module scripts to your HTML files. The compatibility layer ensures existing code continues to work.

### Step 2: Gradually Replace Direct Calls

Replace format-specific Firebase calls with core module calls:

```javascript
// Before
await database.ref(`americano-tournaments/${id}`).set(data);

// After
await Firebase.createTournament('AMERICANO', id, data);
```

### Step 3: Use Permissions System

Replace manual permission checks:

```javascript
// Before
if (user && user.type === 'registered' && user.status === 'verified') {
  // allow
}

// After
if (Permissions.can(user, 'JOIN_LEVEL_BASED_TOURNAMENT')) {
  // allow
}
```

### Step 4: Remove Duplicated Files

Once a format is fully migrated, you can remove:
- `{format}/js/firebase-config.js` 
- `{format}/js/config.js` (keep format-specific constants)

## File Structure

```
src/
└── core/
    ├── firebase.js      # Firebase singleton & operations
    ├── permissions.js   # Role & permission definitions
    ├── storage.js       # LocalStorage abstraction
    ├── router.js        # Hash-based routing
    ├── auth.js          # Authentication with permissions
    ├── compat.js        # Backwards compatibility layer
    ├── index.js         # Bundle/verification helper
    └── README.md        # This file
```

## Next Steps (Future Phases)

- **Phase 2**: Services layer (TournamentAPI, UserService)
- **Phase 3**: Reusable UI components
- **Phase 4**: Build system with Vite
