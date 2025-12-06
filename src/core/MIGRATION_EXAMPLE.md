# Migration Example: Americano to Core Modules

This document shows how to migrate the Americano tournament format to use the new core modules.

## Current Script Loading (Before)

```html
<!-- Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>

<!-- JavaScript Files (order matters!) -->
<script src="js/config.js"></script>
<script src="js/firebase-config.js"></script>
<script src="js/fixtures.js"></script>
<script src="js/router.js"></script>
<script src="js/state.js"></script>
<script src="js/components.js"></script>
<script src="js/handlers.js"></script>
<script src="js/landing.js"></script>
<script src="js/main.js"></script>
```

## New Script Loading (After - with Compat Layer)

```html
<!-- Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>

<!-- Core Modules (new!) -->
<script src="../src/core/firebase.js"></script>
<script src="../src/core/permissions.js"></script>
<script src="../src/core/storage.js"></script>
<script src="../src/core/router.js"></script>
<script src="../src/core/auth.js"></script>
<script src="../src/core/compat.js"></script>

<!-- Setup compatibility for this format -->
<script>setupCompat('americano');</script>

<!-- Format-specific files (keep these, but can remove config.js and firebase-config.js later) -->
<!-- <script src="js/config.js"></script> -->         <!-- NOW PROVIDED BY COMPAT -->
<!-- <script src="js/firebase-config.js"></script> --> <!-- NOW PROVIDED BY COMPAT -->
<script src="js/fixtures.js"></script>
<!-- <script src="js/router.js"></script> -->         <!-- CAN USE CORE ROUTER INSTEAD -->
<script src="js/state.js"></script>
<script src="js/components.js"></script>
<script src="js/handlers.js"></script>
<script src="js/landing.js"></script>
<script src="js/main.js"></script>
```

## What Changes

### 1. CONFIG is now provided by `setupCompat('americano')`

The compat layer creates the same CONFIG object your existing code expects:

```javascript
// This is what setupCompat('americano') creates:
window.CONFIG = {
    FIREBASE_ROOT: 'americano-tournaments',
    STORAGE_KEY: 'uber_padel_americano_tournaments',
    MIN_PLAYERS: 5,
    MAX_PLAYERS: 24,
    MIN_COURTS: 1,
    MAX_COURTS: 6,
    DEFAULT_PLAYERS: 6,
    DEFAULT_COURTS: 1,
    DEFAULT_TOTAL_POINTS: 16,
    DEFAULT_FIXED_POINTS: true,
    POINTS_OPTIONS: [16, 21, 24, 32],
    TOURNAMENT_ID_LENGTH: 6,
    ORGANISER_KEY_LENGTH: 16,
    MAX_STORED_TOURNAMENTS: 20,
    MAX_ROUNDS_DISPLAY: 26
};
```

### 2. Firebase functions are provided globally

The compat layer creates these functions that your existing code uses:

- `initializeFirebase()` → calls `Firebase.init()`
- `getTournamentRef(id)` → calls `Firebase.getTournamentRef('AMERICANO', id)`
- `checkTournamentExists(id)` → calls `Firebase.checkTournamentExists('AMERICANO', id)`
- `createTournamentInFirebase(id, data)` → calls `Firebase.createTournament('AMERICANO', id, data)`
- `updateTournamentInFirebase(id, data)` → calls `Firebase.updateTournament('AMERICANO', id, data)`
- `saveScoreToFirebase(...)` → calls `Firebase.saveScore('AMERICANO', ...)`
- `verifyOrganiserKey(id, key)` → calls `Firebase.verifyOrganiserKey('AMERICANO', id, key)`
- `getPasscodeHash(id)` → calls `Firebase.getPasscodeHash('AMERICANO', id)`
- `getOrganiserKey(id)` → calls `Firebase.getOrganiserKey('AMERICANO', id)`

### 3. UberAuth is now enhanced

The compat layer sets `window.UberAuth = Auth`, which has all the original methods plus:

- `Auth.can('PERMISSION_NAME')` - Check permissions
- `Auth.getRole()` - Get user's role
- `Auth.canJoinTournament(tournament)` - Check tournament access
- `Auth.getCreationPermissions()` - What tournaments can user create

### 4. Player colors and helpers are global

- `PLAYER_COLORS` array
- `getPlayerColorClass(num)` function
- `getDefaultPlayerNames(count)` function
- `getDefaultCourtNames(count)` function

## Gradual Migration Path

### Step 1: Just Add Core (No Code Changes)

Add the core scripts and compat layer. Your existing code continues to work unchanged.

### Step 2: Remove Duplicate Files

Once verified working, you can delete:
- `americano/js/config.js` 
- `americano/js/firebase-config.js`

### Step 3: Update Router Usage (Optional)

Your existing `Router` object works, but you can optionally switch to the core Router:

```javascript
// Before (format-specific router.js)
Router.init();
Router.navigate('tournament', tournamentId, key);

// After (core router) - same API!
Router.init();
Router.navigate('tournament', tournamentId, key);
```

### Step 4: Use Permissions (Optional Enhancement)

Add permission checks to enhance your tournament:

```javascript
// In your create tournament form
const perms = Auth.getCreationPermissions();

if (!perms.levelBased) {
    // Disable level-based option
    levelBasedOption.disabled = true;
    levelBasedOption.title = 'Requires verified account';
}

// When joining a tournament
const { allowed, reason } = Auth.canJoinTournament(tournament);
if (!allowed) {
    showError(reason);
    return;
}
```

## Full Example: Updated americano/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- ... existing meta tags ... -->
    
    <!-- Preconnect hints -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://www.gstatic.com" crossorigin>
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Firebase SDKs -->
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
    
    <!-- Core Modules -->
    <script src="../src/core/firebase.js"></script>
    <script src="../src/core/permissions.js"></script>
    <script src="../src/core/storage.js"></script>
    <script src="../src/core/router.js"></script>
    <script src="../src/core/auth.js"></script>
    <script src="../src/core/compat.js"></script>
    
    <!-- Custom Styles -->
    <link rel="stylesheet" href="css/styles.css">
</head>
<body class="bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
    <!-- App Container -->
    <div id="app"></div>
    
    <!-- Modal Container -->
    <div id="modal-container"></div>
    
    <!-- Toast Container -->
    <div id="toast-container" class="fixed bottom-4 right-4 z-50"></div>
    
    <!-- Setup compatibility layer -->
    <script>setupCompat('americano');</script>
    
    <!-- Format-specific files -->
    <script src="js/fixtures.js"></script>
    <script src="js/state.js"></script>
    <script src="js/components.js"></script>
    <script src="js/handlers.js"></script>
    <script src="js/landing.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
```

## Benefits After Migration

1. **Single Firebase config** - Change once, applies everywhere
2. **Consistent permissions** - Same rules across all formats  
3. **Better storage** - Automatic cleanup, expiration support
4. **Enhanced auth** - Role-based access control ready
5. **Easier maintenance** - Fix bugs in one place
6. **Ready for Phase 2** - Services layer will build on this foundation
