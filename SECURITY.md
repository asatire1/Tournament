# UberPadel Security Guide

## Security Model Overview

UberPadel uses a **passcode-based security model** rather than Firebase Authentication. This is a deliberate design choice:

### Why Passcodes Instead of Auth?

1. **Lower friction** - Players can join tournaments instantly without creating accounts
2. **Simpler UX** - No login/signup flow for casual users
3. **Share-friendly** - Tournament links work for anyone
4. **Club-friendly** - Perfect for impromptu sessions at padel clubs

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOURNAMENT SECURITY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ORGANIZER creates tournament:                                   │
│  ┌─────────────────┐                                            │
│  │ Passcode: 1234  │ → Hashed with SHA-256 → Stored in Firebase │
│  │ Organiser Key   │ → Random UUID → Given to organizer only    │
│  └─────────────────┘                                            │
│                                                                  │
│  VIEWERS can:                                                    │
│  ✅ See fixtures, scores, standings                              │
│  ✅ Join via shared link                                         │
│  ❌ Edit scores                                                  │
│  ❌ Change settings                                              │
│                                                                  │
│  ORGANIZER can (with passcode or organiser key):                 │
│  ✅ Everything viewers can do                                    │
│  ✅ Edit scores                                                  │
│  ✅ Change settings                                              │
│  ✅ Delete tournament                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Firebase Security Rules

### Current Protections

| Protection | Status | Notes |
|------------|--------|-------|
| Validation rules | ✅ | Prevents malformed data |
| Size limits | ✅ | Prevents oversized payloads |
| Type checking | ✅ | Ensures correct data types |
| Path restrictions | ✅ | Only defined paths accessible |
| URL blocking (chat) | ✅ | Prevents spam links |

### What's Protected by Passcodes (Client-Side)

| Action | Protection |
|--------|-----------|
| Edit scores | Requires organiser key in URL |
| Change settings | Requires organiser key |
| Delete tournament | Requires passcode verification |
| Access organiser panel | Requires passcode |

### Deploying Security Rules

**Important:** Firebase rules files use Firebase's own format (not strict JSON). They support `//` and `/* */` comments.

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `stretford-padel-tournament`
3. Navigate to: **Realtime Database → Rules**
4. Copy contents of `firebase-rules-v2.json` 
5. Paste directly into the Rules editor (comments are supported)
6. Click **Publish**

**Alternative: Deploy via CLI**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy rules
firebase deploy --only database
```

### Recommended: Enable Firebase App Check

For production, enable **Firebase App Check** to prevent API abuse:

1. Go to Firebase Console → App Check
2. Register your app domains:
   - `uberpadel.com`
   - `www.uberpadel.com`
3. Choose a provider:
   - **reCAPTCHA Enterprise** (recommended for web)
4. Enable enforcement for Realtime Database

```javascript
// Add to firebase-config.js after initialization
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('YOUR_RECAPTCHA_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

## Security Checklist

### Before Going Live

- [ ] Deploy `firebase-rules-v2.json` to Firebase
- [ ] Enable Firebase App Check
- [ ] Verify HTTPS is enabled on your domain
- [ ] Test that viewers cannot edit scores
- [ ] Test that passcode verification works
- [ ] Remove any debug/test tournaments

### Ongoing Monitoring

- [ ] Check Firebase Usage tab for unusual activity
- [ ] Monitor community chat for abuse
- [ ] Review any reported messages
- [ ] Check for failed validation attempts in logs

## Data Privacy

### What We Store

| Data Type | Where | Retention |
|-----------|-------|-----------|
| Tournament data | Firebase Realtime DB | Until deleted |
| Player names | Tournament data | Until tournament deleted |
| Scores | Tournament data | Until tournament deleted |
| User accounts | `users/` collection | Indefinitely |
| Chat messages | `community/messages` | Indefinitely |

### What We DON'T Store

- Passwords (only hashes)
- Payment information
- Location data
- Device identifiers

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do not** disclose it publicly
2. Email details to the development team
3. Include steps to reproduce
4. Allow reasonable time for a fix

## API Key Exposure

Firebase API keys are **designed to be public**. They identify your project but don't grant access. Security is enforced by:

1. **Security Rules** - Control who can read/write
2. **App Check** - Verify requests come from your app
3. **Domain Restrictions** - Limit which domains can use the key

To restrict API key usage:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Click on your API key
4. Under "Application restrictions", select "HTTP referrers"
5. Add your allowed domains:
   ```
   uberpadel.com/*
   www.uberpadel.com/*
   localhost:*
   ```

## Changelog

### v2.0 (Current)
- Added SHA-256 passcode hashing
- Added comprehensive validation rules
- Added size limits to prevent abuse
- Added tournament ID format validation
- Documented security model

### v1.0 (Initial)
- Basic read/write rules
- Simple validation
