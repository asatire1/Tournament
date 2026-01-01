# Phase 4 Complete: Account System Consolidation

## Summary

Phase 4 consolidates all authentication into `/account/` folder with a single `AuthService`.

## What Was Created

### New Files: `/account/`

| File | Purpose |
|------|---------|
| `auth-service.js` | Consolidated auth service - single source of truth |
| `login.html` | Sign in / Register / Guest (all in one page) |
| `profile.html` | User profile, permissions, edit profile |
| `README.md` | Documentation |

### Modified Files

| File | Change |
|------|--------|
| `login.html` | Now redirects to `/account/login.html` |
| `my-account.html` | Now redirects to `/account/profile.html` |
| `index.html` | Updated links to new paths |
| `index-new.html` | Updated links to new paths |
| `browse.html` | Updated links to new paths |
| `competitions.html` | Updated links to new paths |
| `register.html` | Updated links to new paths |
| `quick-play/index.html` | Updated links to new paths |

## URL Redirects

| Old URL | New URL |
|---------|---------|
| `/login.html` | `/account/login.html` |
| `/my-account.html` | `/account/profile.html` |

Redirects preserve query parameters (e.g., `?redirect=...`).

## AuthService API

### Initialization
```javascript
await AuthService.init();  // Call on every page that needs auth
```

### User State
```javascript
AuthService.isLoggedIn()    // Any user type
AuthService.isGuest()       // Guest only
AuthService.isRegistered()  // Has Firebase account
AuthService.isVerified()    // Admin verified
AuthService.isPending()     // Awaiting verification
```

### User Info
```javascript
AuthService.getCurrentUser()  // Full user object
AuthService.getName()         // Display name
AuthService.getUserId()       // User ID
AuthService.getLevel()        // Playtomic level (verified only)
AuthService.getStatusLabel()  // "Guest", "Pending", "Verified"
AuthService.getStatusBadge()  // HTML badge element
```

### Authentication
```javascript
await AuthService.signInWithGoogle()
await AuthService.signInWithEmail(email, password)
await AuthService.registerWithEmail(email, password, name)
AuthService.continueAsGuest(name)
await AuthService.signOut()
```

### Profile
```javascript
await AuthService.updateProfile({ name, playtomicUsername, phone })
await AuthService.completeProfile(profileData)  // For new users
```

### Listeners
```javascript
AuthService.onAuthStateChanged((user) => {
    // Called when auth state changes
});
```

### Utility
```javascript
AuthService.requireAuth()                        // Redirect if not logged in
AuthService.requireAuth({ requireVerified: true })
AuthService.getLoginUrl('/some/page.html')       // Build login URL with redirect
AuthService.getRedirectUrl()                     // Get redirect from current URL
```

## User Types

| Type | Description | Permissions |
|------|-------------|-------------|
| guest | Local-only, no Firebase | Quick Play only |
| registered (pending) | Firebase account, awaiting verification | Quick Play + open competitions |
| registered (verified) | Admin verified | All features + level-restricted |

## Usage Example

```html
<script src="/account/auth-service.js"></script>
<script>
    async function init() {
        await AuthService.init();
        
        // Require login
        if (!AuthService.requireAuth()) return;
        
        // Show user info
        const user = AuthService.getCurrentUser();
        document.getElementById('name').textContent = user.name;
        document.getElementById('status').innerHTML = AuthService.getStatusBadge();
        
        // Check permissions
        if (AuthService.isVerified()) {
            document.getElementById('level-features').classList.remove('hidden');
        }
    }
    init();
</script>
```

## Benefits

1. **Single source of truth** - All auth logic in one file
2. **Consistent API** - Same methods across all pages
3. **Clean URLs** - Account pages grouped in `/account/`
4. **Backward compatible** - Old URLs redirect
5. **Easy to maintain** - Fix auth bugs once

## What's Next

- **Phase 5-8**: Competitions System (Browse, Create, Register, Manage)
- **Phase 9**: Bridge Competitions to Shared Engines
- **Phase 10**: Polish, Stats, Testing, Launch

---

Phase 4 Complete! ✅
