# Competition Registration System - Implementation Summary

## 🎉 What Was Built

This implementation adds a complete **competition registration system** to your Uber Padel website, allowing players to register, get verified by admins, and join competitions based on their Playtomic level.

---

## 📁 New Files Created

| File | Purpose |
|------|---------|
| `register.html` | Player registration page |
| `my-account.html` | Player dashboard (view status, competitions) |
| `competitions.html` | Browse and join competitions |

## 📝 Modified Files

| File | Changes |
|------|---------|
| `admin.html` | Added Player Verification & Competition Management tabs |
| `firebase-rules.json` | Added rules for `players` and `competitions` paths |
| `index.html` | Added navigation bar with links to new pages |

---

## 🔄 User Flows

### Flow 1: Player Registration
```
Visit /register.html
    ↓
Enter: Name, Email, Playtomic Username, Phone (optional)
    ↓
Account created with status: "pending"
    ↓
Player ID stored in browser (localStorage)
    ↓
Redirect to /my-account.html
```

### Flow 2: Admin Verification
```
Admin logs into /admin.html (password: uberpadel2024)
    ↓
Click "Player Verification" tab
    ↓
See list of pending players
    ↓
Click Playtomic username link → Opens Playtomic profile
    ↓
Enter verified level (e.g., 4.25)
    ↓
Click "Verify" → Player status changes to "verified"
```

### Flow 3: Competition Registration (Players)
```
Verified player visits /competitions.html
    ↓
See competitions filtered by their level
    ↓
Click "Register Now" on eligible competition
    ↓
Confirm registration
    ↓
Added to competition (first-come-first-served)
```

### Flow 4: Competition Management (Admins)
```
Admin logs into /admin.html
    ↓
Click "Competitions" tab
    ↓
Click "+ Create Competition"
    ↓
Fill in: Name, Format, Level Range, Max Players, Dates
    ↓
Competition appears on /competitions.html
```

---

## 🗄️ Firebase Data Structure

### Players Collection (`/players/{playerId}`)
```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "playtomicUsername": "johnsmith123",
  "phone": "+44 7XXX XXXXXX",
  "playtomicLevel": 4.25,
  "status": "pending | verified | rejected",
  "registeredAt": "2024-12-04T12:00:00.000Z",
  "verifiedAt": "2024-12-04T14:00:00.000Z",
  "verifiedBy": "admin"
}
```

### Competitions Collection (`/competitions/{competitionId}`)
```json
{
  "meta": {
    "name": "Winter League 2024",
    "description": "Weekly competition",
    "format": "americano",
    "maxPlayers": 16,
    "minLevel": 3.00,
    "maxLevel": 5.50,
    "startDate": "2024-12-20",
    "registrationDeadline": "2024-12-15",
    "status": "registration | closed | active | completed",
    "createdAt": "2024-12-04T12:00:00.000Z"
  },
  "registeredPlayers": {
    "abc12345": {
      "name": "John Smith",
      "level": 4.25,
      "registeredAt": "2024-12-05T10:00:00.000Z"
    }
  }
}
```

---

## ⚙️ Configuration

### Level Format
- **Player Level**: Single number with 2 decimal places (e.g., `4.25`)
- **Competition Range**: Min and Max levels (e.g., `3.00 - 5.50`)
- **Eligibility**: Player level must be within competition's min-max range

### Admin Password
- **Default**: `uberpadel2024`
- **Location**: In `admin.html`, variable `ADMIN_HASH` (base64 encoded)
- **To change**: `btoa('yourNewPassword')` in browser console, then update `ADMIN_HASH`

---

## 🚀 Deployment Steps

### 1. Update Firebase Rules
Go to Firebase Console → Realtime Database → Rules and paste the contents of `firebase-rules.json`

### 2. Upload Files
Upload these files to your web server:
- `register.html`
- `my-account.html`
- `competitions.html`
- `admin.html` (replace existing)
- `index.html` (replace existing)
- `firebase-rules.json` (for reference)

### 3. Test the Flow
1. Register as a player at `/register.html`
2. Login to admin at `/admin.html`
3. Verify the player and assign a level
4. Create a competition with level range
5. Go to `/competitions.html` and register for competition

---

## 🎯 Features Summary

### For Players
- ✅ Self-registration with Playtomic username
- ✅ Personal dashboard showing verification status
- ✅ Browse competitions filtered by eligibility
- ✅ One-click registration for competitions
- ✅ Account recovery via email or Player ID
- ✅ View registration history

### For Admins
- ✅ View all pending registrations
- ✅ Direct link to Playtomic profiles for verification
- ✅ Set player level (0.00 - 10.00)
- ✅ Edit player levels after verification
- ✅ Reject or reinstate players
- ✅ Create competitions with level requirements
- ✅ Manage competition status (open/closed/active/completed)
- ✅ View and manage registered players per competition

### Competition System
- ✅ Level-based eligibility (min-max range)
- ✅ First-come-first-served registration
- ✅ Maximum capacity enforcement
- ✅ Registration deadline support
- ✅ Multiple formats (Americano, Mexicano, Mix, Team League)

---

## 🔮 Future Enhancements (Phase 2+)

These features could be added later:

1. **Email Notifications**
   - Registration confirmation
   - Verification status updates
   - Competition reminders

2. **Tournament Integration**
   - Auto-create tournament from competition registrations
   - Import players directly into tournament

3. **Waiting List**
   - Queue for full competitions
   - Auto-promote when spots open

4. **Player Stats**
   - Track competition history
   - Win/loss records
   - Level progression over time

5. **Organiser Roles**
   - Allow verified players to become organisers
   - Role-based permissions

---

## 📞 Support

### Common Issues

**Q: Player can't see any competitions**
A: Check that the player is verified and their level falls within competition ranges

**Q: Admin tab not showing new players**
A: Refresh the page or check Firebase connection

**Q: Registration button not working**
A: Ensure player is verified and competition is in "registration" status

### Testing Locally
Run a local server:
```bash
python -m http.server 8000
```
Then access `http://localhost:8000`

---

## ✅ Checklist Before Going Live

- [ ] Update Firebase Rules in Firebase Console
- [ ] Change admin password from default
- [ ] Test full registration → verification → competition flow
- [ ] Create first competition
- [ ] Announce to players

---

**Built for Uber Padel** 🎾
