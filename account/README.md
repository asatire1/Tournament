# Account System

Phase 4 of the UberPadel redesign: Consolidated Authentication.

## Structure

```
account/
├── auth-service.js   # Consolidated auth service
├── login.html        # Sign in / Register / Guest
├── profile.html      # User profile & permissions
└── README.md         # This file
```

## auth-service.js

Single source of truth for authentication. Features:

### User Types
- **guest**: Local-only, no Firebase account
- **registered**: Firebase account, pending verification
- **verified**: Firebase account, admin verified

### API

```javascript
// Initialize (call on every page)
await AuthService.init();

// Get current user
const user = AuthService.getCurrentUser();

// Check user status
AuthService.isLoggedIn();     // Any user
AuthService.isGuest();        // Guest only
AuthService.isRegistered();   // Has Firebase account
AuthService.isVerified();     // Admin verified
AuthService.isPending();      // Awaiting verification

// User info
AuthService.getName();        // Display name
AuthService.getUserId();      // User ID
AuthService.getLevel();       // Playtomic level (if verified)
AuthService.getStatusLabel(); // "Guest", "Pending", "Verified"
AuthService.getStatusBadge(); // HTML badge

// Sign in
await AuthService.signInWithGoogle();
await AuthService.signInWithEmail(email, password);
await AuthService.registerWithEmail(email, password, name);
AuthService.continueAsGuest(name);

// Sign out
await AuthService.signOut();

// Profile management
await AuthService.updateProfile({ name, playtomicUsername, phone });
await AuthService.completeProfile(profileData);

// Auth state listener
AuthService.onAuthStateChanged((user) => {
    // Called when auth changes
});

// Utility
AuthService.requireAuth();              // Redirect if not logged in
AuthService.requireAuth({ requireVerified: true });
AuthService.getLoginUrl(redirectUrl);   // Build login URL
AuthService.getRedirectUrl();           // Get redirect from URL
```

## Old URLs

Old URLs redirect to new locations:

| Old URL | New URL |
|---------|---------|
| `/login.html` | `/account/login.html` |
| `/my-account.html` | `/account/profile.html` |

## Usage in Pages

```html
<!-- Include auth service -->
<script src="/account/auth-service.js"></script>

<script>
    async function initPage() {
        await AuthService.init();
        
        if (!AuthService.isLoggedIn()) {
            window.location.href = AuthService.getLoginUrl(window.location.href);
            return;
        }
        
        const user = AuthService.getCurrentUser();
        document.getElementById('user-name').textContent = user.name;
        document.getElementById('status').innerHTML = AuthService.getStatusBadge();
    }
    
    initPage();
</script>
```

## Firebase Database Structure

```
users/
  {userId}/
    name: string
    email: string
    status: "pending" | "verified"
    playtomicUsername: string
    playtomicLevel: number
    phone: string
    profileCompleted: boolean
    createdAt: string (ISO)
    updatedAt: string (ISO)
```

## Verification Flow

1. User signs in with Google or Email
2. User completes profile (name, Playtomic username)
3. Status set to "pending"
4. Admin verifies Playtomic profile, sets level
5. Status changed to "verified"
6. User can now join level-restricted tournaments
